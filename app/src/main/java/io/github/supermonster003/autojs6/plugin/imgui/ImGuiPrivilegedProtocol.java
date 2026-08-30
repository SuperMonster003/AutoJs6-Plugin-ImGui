package io.github.supermonster003.autojs6.plugin.imgui;

import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

final class ImGuiPrivilegedProtocol {

    static final int MAGIC = 0x4136494D; // "A6IM"
    static final int VERSION = 1;
    static final int HEADER_BYTES = 16;
    static final int MAX_PAYLOAD_BYTES = 1024 * 1024;
    static final int MAX_FRAME_TEXT_BYTES = 4096;

    static final int TYPE_HELLO = 1;
    static final int TYPE_HELLO_ACK = 2;
    static final int TYPE_PING = 3;
    static final int TYPE_PONG = 4;
    static final int TYPE_RENDER_FRAME = 5;
    static final int TYPE_RENDER_ACK = 6;
    static final int TYPE_SHUTDOWN = 7;
    static final int TYPE_SHUTDOWN_ACK = 8;
    static final int TYPE_ERROR = 255;

    private ImGuiPrivilegedProtocol() {
        throw new AssertionError("No instances");
    }

    static void write(OutputStream output, int type, int requestId, byte[] payload)
        throws IOException {
        if (output == null) {
            throw new IllegalArgumentException("Output stream must not be null");
        }
        byte[] body = payload == null ? new byte[0] : payload;
        validateType(type);
        validatePayloadLength(body.length);
        ByteBuffer header = ByteBuffer.allocate(HEADER_BYTES).order(ByteOrder.BIG_ENDIAN);
        header.putInt(MAGIC);
        header.putShort((short) VERSION);
        header.putShort((short) type);
        header.putInt(requestId);
        header.putInt(body.length);
        output.write(header.array());
        output.write(body);
        output.flush();
    }

    static Frame read(InputStream input) throws IOException {
        if (input == null) {
            throw new IllegalArgumentException("Input stream must not be null");
        }
        int first = input.read();
        if (first < 0) {
            return null;
        }
        byte[] headerBytes = new byte[HEADER_BYTES];
        headerBytes[0] = (byte) first;
        readFully(input, headerBytes, 1, HEADER_BYTES - 1);
        ByteBuffer header = ByteBuffer.wrap(headerBytes).order(ByteOrder.BIG_ENDIAN);
        int magic = header.getInt();
        int version = Short.toUnsignedInt(header.getShort());
        int type = Short.toUnsignedInt(header.getShort());
        int requestId = header.getInt();
        int payloadLength = header.getInt();
        if (magic != MAGIC) {
            throw new ProtocolException(
                "Unexpected protocol magic 0x" + Integer.toHexString(magic)
            );
        }
        if (version != VERSION) {
            throw new ProtocolException(
                "Unsupported protocol version " + version + ", expected " + VERSION
            );
        }
        validateType(type);
        validatePayloadLength(payloadLength);
        byte[] payload = new byte[payloadLength];
        readFully(input, payload, 0, payloadLength);
        return new Frame(type, requestId, payload);
    }

    static byte[] utf8(String value) {
        return String.valueOf(value == null ? "" : value).getBytes(StandardCharsets.UTF_8);
    }

    static String utf8(byte[] value) {
        return new String(value == null ? new byte[0] : value, StandardCharsets.UTF_8);
    }

    static byte[] encodeRenderFrame(float progress, String text) {
        byte[] encodedText = utf8(text);
        if (encodedText.length > MAX_FRAME_TEXT_BYTES) {
            throw new IllegalArgumentException(
                "Frame text exceeds " + MAX_FRAME_TEXT_BYTES + " UTF-8 bytes"
            );
        }
        ByteBuffer payload = ByteBuffer.allocate(8 + encodedText.length).order(ByteOrder.BIG_ENDIAN);
        payload.putFloat(progress);
        payload.putInt(encodedText.length);
        payload.put(encodedText);
        return payload.array();
    }

    static RenderFrame decodeRenderFrame(byte[] payload) throws ProtocolException {
        byte[] body = payload == null ? new byte[0] : payload;
        if (body.length < 8) {
            throw new ProtocolException("Render frame payload is shorter than 8 bytes");
        }
        ByteBuffer buffer = ByteBuffer.wrap(body).order(ByteOrder.BIG_ENDIAN);
        float progress = buffer.getFloat();
        int textLength = buffer.getInt();
        if (textLength < 0 || textLength > MAX_FRAME_TEXT_BYTES || textLength != buffer.remaining()) {
            throw new ProtocolException("Invalid render frame text length " + textLength);
        }
        byte[] text = new byte[textLength];
        buffer.get(text);
        return new RenderFrame(progress, utf8(text));
    }

    private static void validateType(int type) {
        if (type <= 0 || type > 0xFFFF) {
            throw new IllegalArgumentException("Protocol type must be between 1 and 65535");
        }
    }

    private static void validatePayloadLength(int length) throws ProtocolException {
        if (length < 0 || length > MAX_PAYLOAD_BYTES) {
            throw new ProtocolException(
                "Protocol payload length must be between 0 and " + MAX_PAYLOAD_BYTES +
                    ", got " + length
            );
        }
    }

    private static void readFully(InputStream input, byte[] target, int offset, int length)
        throws IOException {
        int cursor = offset;
        int end = offset + length;
        while (cursor < end) {
            int count = input.read(target, cursor, end - cursor);
            if (count < 0) {
                throw new EOFException(
                    "Protocol frame ended after " + (cursor - offset) + " of " + length + " bytes"
                );
            }
            if (count == 0) {
                continue;
            }
            cursor += count;
        }
    }

    static final class Frame {

        final int type;
        final int requestId;
        final byte[] payload;

        Frame(int type, int requestId, byte[] payload) {
            this.type = type;
            this.requestId = requestId;
            this.payload = payload == null ? new byte[0] : Arrays.copyOf(payload, payload.length);
        }
    }

    static final class RenderFrame {

        final float progress;
        final String text;

        RenderFrame(float progress, String text) {
            this.progress = progress;
            this.text = text;
        }
    }

    static final class ProtocolException extends IOException {

        ProtocolException(String message) {
            super(message);
        }
    }
}
