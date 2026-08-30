package io.github.supermonster003.autojs6.plugin.imgui;

import org.junit.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;

public class ImGuiPrivilegedProtocolTest {

    @Test
    public void frameRoundTrips() throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImGuiPrivilegedProtocol.write(
            output,
            ImGuiPrivilegedProtocol.TYPE_RENDER_FRAME,
            42,
            ImGuiPrivilegedProtocol.encodeRenderFrame(0.75F, "privileged frame")
        );

        ByteArrayInputStream input = new ByteArrayInputStream(output.toByteArray());
        ImGuiPrivilegedProtocol.Frame frame = ImGuiPrivilegedProtocol.read(input);
        assertEquals(ImGuiPrivilegedProtocol.TYPE_RENDER_FRAME, frame.type);
        assertEquals(42, frame.requestId);
        ImGuiPrivilegedProtocol.RenderFrame decoded =
            ImGuiPrivilegedProtocol.decodeRenderFrame(frame.payload);
        assertEquals(0.75F, decoded.progress, 0.0001F);
        assertEquals("privileged frame", decoded.text);
        assertNull(ImGuiPrivilegedProtocol.read(input));
    }

    @Test
    public void rejectsWrongMagicAndOversizedPayload() {
        ByteBuffer wrongMagic = ByteBuffer.allocate(ImGuiPrivilegedProtocol.HEADER_BYTES)
            .order(ByteOrder.BIG_ENDIAN)
            .putInt(0xBAD0CAFE)
            .putShort((short) ImGuiPrivilegedProtocol.VERSION)
            .putShort((short) ImGuiPrivilegedProtocol.TYPE_PING)
            .putInt(1)
            .putInt(0);
        assertThrows(
            ImGuiPrivilegedProtocol.ProtocolException.class,
            () -> ImGuiPrivilegedProtocol.read(
                new ByteArrayInputStream(wrongMagic.array())
            )
        );

        ByteBuffer oversized = ByteBuffer.allocate(ImGuiPrivilegedProtocol.HEADER_BYTES)
            .order(ByteOrder.BIG_ENDIAN)
            .putInt(ImGuiPrivilegedProtocol.MAGIC)
            .putShort((short) ImGuiPrivilegedProtocol.VERSION)
            .putShort((short) ImGuiPrivilegedProtocol.TYPE_PING)
            .putInt(1)
            .putInt(ImGuiPrivilegedProtocol.MAX_PAYLOAD_BYTES + 1);
        assertThrows(
            ImGuiPrivilegedProtocol.ProtocolException.class,
            () -> ImGuiPrivilegedProtocol.read(
                new ByteArrayInputStream(oversized.array())
            )
        );
    }

    @Test
    public void rejectsTruncatedFrameAndMalformedRenderPayload() {
        byte[] truncatedHeader = new byte[] {0x41, 0x36, 0x49};
        assertThrows(
            EOFException.class,
            () -> ImGuiPrivilegedProtocol.read(new ByteArrayInputStream(truncatedHeader))
        );

        assertThrows(
            ImGuiPrivilegedProtocol.ProtocolException.class,
            () -> ImGuiPrivilegedProtocol.decodeRenderFrame(
                ByteBuffer.allocate(8)
                    .order(ByteOrder.BIG_ENDIAN)
                    .putFloat(1.0F)
                    .putInt(2)
                    .array()
            )
        );
    }

    @Test
    public void enforcesFrameTextLimit() {
        String tooLong = "x".repeat(ImGuiPrivilegedProtocol.MAX_FRAME_TEXT_BYTES + 1);
        assertThrows(
            IllegalArgumentException.class,
            () -> ImGuiPrivilegedProtocol.encodeRenderFrame(0.0F, tooLong)
        );
    }
}
