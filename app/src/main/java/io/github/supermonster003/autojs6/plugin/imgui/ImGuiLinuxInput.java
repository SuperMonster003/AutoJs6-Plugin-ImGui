package io.github.supermonster003.autojs6.plugin.imgui;

import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class ImGuiLinuxInput {

    static final int EVENT_BYTES_32 = 16;
    static final int EVENT_BYTES_64 = 24;

    static final int EV_SYN = 0x00;
    static final int EV_ABS = 0x03;
    static final int SYN_REPORT = 0x00;
    static final int SYN_MT_REPORT = 0x02;
    static final int ABS_MT_SLOT = 0x2F;
    static final int ABS_MT_POSITION_X = 0x35;
    static final int ABS_MT_POSITION_Y = 0x36;
    static final int ABS_MT_TRACKING_ID = 0x39;

    static final int ACTION_DOWN = 0;
    static final int ACTION_UP = 1;
    static final int ACTION_MOVE = 2;

    private static final int MAX_GETEVENT_OUTPUT_BYTES = 1024 * 1024;
    private static final Pattern DEVICE_PATTERN = Pattern.compile(
        "^add device\\s+\\d+:\\s+(/dev/input/event\\d+)\\s*$"
    );
    private static final Pattern NAME_PATTERN = Pattern.compile("^\\s*name:\\s+\"(.*)\"\\s*$");
    private static final Pattern ABS_PATTERN = Pattern.compile(
        "\\b(ABS_MT_SLOT|ABS_MT_POSITION_X|ABS_MT_POSITION_Y|ABS_MT_TRACKING_ID)\\b" +
            "\\s*: value -?\\d+, min (-?\\d+), max (-?\\d+)"
    );

    private ImGuiLinuxInput() {
        throw new AssertionError("No instances");
    }

    static DeviceSpec discover(int displayWidth, int displayHeight, int rotation) throws IOException {
        Process process = new ProcessBuilder("/system/bin/getevent", "-pl")
            .redirectErrorStream(true)
            .start();
        String output;
        try {
            output = readUtf8(process.getInputStream(), MAX_GETEVENT_OUTPUT_BYTES);
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new IOException("getevent -pl exited with code " + exitCode + ": " + output);
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while discovering Linux input devices", error);
        } finally {
            process.destroy();
        }
        List<DeviceSpec> candidates = parseGetevent(output, displayWidth, displayHeight, rotation);
        if (candidates.isEmpty()) {
            throw new IOException("No multitouch input device was reported by getevent -pl");
        }
        candidates.sort(
            Comparator.comparingInt(ImGuiLinuxInput::deviceScore).reversed()
                .thenComparing(candidate -> candidate.path)
        );
        return candidates.get(0);
    }

    static List<DeviceSpec> parseGetevent(
        String output,
        int displayWidth,
        int displayHeight,
        int rotation
    ) {
        List<DeviceSpec> result = new ArrayList<>();
        MutableDevice current = null;
        String[] lines = String.valueOf(output == null ? "" : output).split("\\r?\\n");
        for (String line : lines) {
            Matcher deviceMatch = DEVICE_PATTERN.matcher(line);
            if (deviceMatch.matches()) {
                addCandidate(result, current, displayWidth, displayHeight, rotation);
                current = new MutableDevice(deviceMatch.group(1));
                continue;
            }
            if (current == null) {
                continue;
            }
            Matcher nameMatch = NAME_PATTERN.matcher(line);
            if (nameMatch.matches()) {
                current.name = nameMatch.group(1);
                continue;
            }
            Matcher absMatch = ABS_PATTERN.matcher(line);
            if (!absMatch.find()) {
                continue;
            }
            int minimum;
            int maximum;
            try {
                minimum = Integer.parseInt(absMatch.group(2));
                maximum = Integer.parseInt(absMatch.group(3));
            } catch (NumberFormatException ignored) {
                continue;
            }
            switch (absMatch.group(1)) {
                case "ABS_MT_SLOT":
                    current.hasSlots = true;
                    break;
                case "ABS_MT_POSITION_X":
                    current.minX = minimum;
                    current.maxX = maximum;
                    break;
                case "ABS_MT_POSITION_Y":
                    current.minY = minimum;
                    current.maxY = maximum;
                    break;
                case "ABS_MT_TRACKING_ID":
                    current.hasTrackingId = true;
                    break;
                default:
                    break;
            }
        }
        addCandidate(result, current, displayWidth, displayHeight, rotation);
        return result;
    }

    static InputEvent decode(byte[] record, boolean process64Bit) {
        int expectedLength = process64Bit ? EVENT_BYTES_64 : EVENT_BYTES_32;
        if (record == null || record.length != expectedLength) {
            throw new IllegalArgumentException(
                "Linux input event record must contain exactly " + expectedLength + " bytes"
            );
        }
        ByteBuffer buffer = ByteBuffer.wrap(record).order(ByteOrder.nativeOrder());
        long seconds;
        long micros;
        if (process64Bit) {
            seconds = buffer.getLong();
            micros = buffer.getLong();
        } else {
            seconds = Integer.toUnsignedLong(buffer.getInt());
            micros = Integer.toUnsignedLong(buffer.getInt());
        }
        int type = Short.toUnsignedInt(buffer.getShort());
        int code = Short.toUnsignedInt(buffer.getShort());
        int value = buffer.getInt();
        return new InputEvent(seconds, micros, type, code, value);
    }

    static boolean isProcess64Bit() {
        String architecture = System.getProperty("os.arch", "").toLowerCase(Locale.ROOT);
        return architecture.contains("64");
    }

    static DirectReader open(DeviceSpec spec, Listener listener) throws IOException {
        return new DirectReader(spec, listener, isProcess64Bit());
    }

    static void verifyReadable(DeviceSpec spec) throws IOException {
        if (spec == null) {
            throw new IllegalArgumentException("Input device spec must not be null");
        }
        try (FileInputStream ignored = new FileInputStream(spec.path)) {
            // Opening the evdev node is the non-blocking permission check. Reading would block until
            // the next physical event and belongs to DirectReader.
        }
    }

    private static void addCandidate(
        List<DeviceSpec> result,
        MutableDevice candidate,
        int displayWidth,
        int displayHeight,
        int rotation
    ) {
        if (candidate == null || !candidate.hasTrackingId || candidate.minX == null ||
            candidate.maxX == null || candidate.minY == null || candidate.maxY == null ||
            candidate.maxX <= candidate.minX || candidate.maxY <= candidate.minY
        ) {
            return;
        }
        result.add(new DeviceSpec(
            candidate.path,
            candidate.name,
            candidate.minX,
            candidate.maxX,
            candidate.minY,
            candidate.maxY,
            candidate.hasSlots,
            displayWidth,
            displayHeight,
            rotation
        ));
    }

    private static int deviceScore(DeviceSpec candidate) {
        String name = candidate.name.toLowerCase(Locale.ROOT);
        int score = candidate.hasSlots ? 10 : 0;
        String[] touchHints = {
            "touch", "clearpad", "synaptics", "goodix", "focal", "fts", "sec_ts", "atmel"
        };
        for (String hint : touchHints) {
            if (name.contains(hint)) {
                score += 100;
                break;
            }
        }
        return score;
    }

    private static String readUtf8(InputStream input, int limit) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int total = 0;
        int count;
        while ((count = input.read(buffer)) >= 0) {
            if (count == 0) {
                continue;
            }
            total += count;
            if (total > limit) {
                throw new IOException("getevent output exceeds " + limit + " bytes");
            }
            output.write(buffer, 0, count);
        }
        return output.toString(StandardCharsets.UTF_8.name());
    }

    interface Listener {

        void onTouch(TouchSample sample);

        void onError(IOException error);
    }

    static final class DirectReader implements Closeable {

        private final FileInputStream input;
        private final Thread thread;
        private volatile boolean running = true;

        DirectReader(DeviceSpec spec, Listener listener, boolean process64Bit) throws IOException {
            if (spec == null || listener == null) {
                throw new IllegalArgumentException("Input device and listener must not be null");
            }
            input = new FileInputStream(spec.path);
            thread = new Thread(
                () -> readLoop(input, spec, listener, process64Bit),
                "ImGui-Privileged-Input"
            );
            thread.setDaemon(true);
            thread.start();
        }

        private void readLoop(
            InputStream source,
            DeviceSpec spec,
            Listener listener,
            boolean process64Bit
        ) {
            int recordSize = process64Bit ? EVENT_BYTES_64 : EVENT_BYTES_32;
            byte[] record = new byte[recordSize];
            TouchTracker tracker = new TouchTracker(spec);
            try {
                while (running) {
                    readRecord(source, record);
                    TouchSample sample = tracker.accept(decode(record, process64Bit));
                    if (sample != null) {
                        listener.onTouch(sample);
                    }
                }
            } catch (IOException error) {
                if (running) {
                    listener.onError(error);
                }
            } catch (RuntimeException error) {
                if (running) {
                    listener.onError(new IOException("Invalid Linux input event stream", error));
                }
            }
        }

        @Override
        public void close() throws IOException {
            if (!running) {
                return;
            }
            running = false;
            input.close();
            thread.interrupt();
            try {
                thread.join(TimeUnit.SECONDS.toMillis(1));
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
            }
        }

        private static void readRecord(InputStream input, byte[] record) throws IOException {
            int offset = 0;
            while (offset < record.length) {
                int count = input.read(record, offset, record.length - offset);
                if (count < 0) {
                    throw new IOException("Linux input device reached end of stream");
                }
                if (count == 0) {
                    continue;
                }
                offset += count;
            }
        }
    }

    static final class TouchTracker {

        private final DeviceSpec spec;
        private final Map<Integer, Contact> slots = new HashMap<>();
        private final Map<Integer, Contact> typeAFrame = new HashMap<>();
        private int currentSlot;
        private Contact typeAContact = new Contact();
        private int primaryTrackingId = -1;
        private float lastX;
        private float lastY;
        private boolean primaryDown;

        TouchTracker(DeviceSpec spec) {
            if (spec == null) {
                throw new IllegalArgumentException("Input device spec must not be null");
            }
            this.spec = spec;
        }

        TouchSample accept(InputEvent event) {
            if (event.type == EV_ABS) {
                consumeAbsolute(event.code, event.value);
                return null;
            }
            if (event.type != EV_SYN) {
                return null;
            }
            if (!spec.hasSlots && event.code == SYN_MT_REPORT) {
                commitTypeAContact();
                return null;
            }
            if (event.code != SYN_REPORT) {
                return null;
            }
            if (!spec.hasSlots) {
                commitTypeAContact();
            }
            TouchSample sample = finishFrame(spec.hasSlots ? slots : typeAFrame);
            if (!spec.hasSlots) {
                typeAFrame.clear();
                typeAContact = new Contact();
            }
            return sample;
        }

        private void consumeAbsolute(int code, int value) {
            Contact contact;
            if (spec.hasSlots) {
                if (code == ABS_MT_SLOT) {
                    currentSlot = Math.max(0, value);
                    return;
                }
                contact = slots.computeIfAbsent(currentSlot, ignored -> new Contact());
            } else {
                contact = typeAContact;
            }
            switch (code) {
                case ABS_MT_TRACKING_ID:
                    contact.trackingId = value;
                    contact.active = value >= 0;
                    if (value < 0 && spec.hasSlots) {
                        contact.hasX = false;
                        contact.hasY = false;
                    }
                    break;
                case ABS_MT_POSITION_X:
                    contact.rawX = value;
                    contact.hasX = true;
                    break;
                case ABS_MT_POSITION_Y:
                    contact.rawY = value;
                    contact.hasY = true;
                    break;
                default:
                    break;
            }
        }

        private void commitTypeAContact() {
            if (typeAContact.active && typeAContact.trackingId >= 0 &&
                typeAContact.hasX && typeAContact.hasY
            ) {
                typeAFrame.put(typeAContact.trackingId, typeAContact.copy());
            }
            typeAContact = new Contact();
        }

        private TouchSample finishFrame(Map<Integer, Contact> contacts) {
            Contact primary = contacts.values().stream()
                .filter(contact -> contact.active && contact.trackingId >= 0 &&
                    contact.hasX && contact.hasY)
                .filter(contact -> contact.trackingId == primaryTrackingId)
                .findFirst()
                .orElse(null);
            if (primary == null) {
                primary = contacts.values().stream()
                    .filter(contact -> contact.active && contact.trackingId >= 0 &&
                        contact.hasX && contact.hasY)
                    .min(Comparator.comparingInt(contact -> contact.trackingId))
                    .orElse(null);
            }
            if (primary == null) {
                if (!primaryDown) {
                    primaryTrackingId = -1;
                    return null;
                }
                primaryDown = false;
                primaryTrackingId = -1;
                return new TouchSample(ACTION_UP, lastX, lastY, -1);
            }

            float[] mapped = spec.map(primary.rawX, primary.rawY);
            int action = primaryDown ? ACTION_MOVE : ACTION_DOWN;
            boolean changed = !primaryDown || mapped[0] != lastX || mapped[1] != lastY ||
                primary.trackingId != primaryTrackingId;
            primaryDown = true;
            primaryTrackingId = primary.trackingId;
            lastX = mapped[0];
            lastY = mapped[1];
            return changed
                ? new TouchSample(action, lastX, lastY, primaryTrackingId)
                : null;
        }
    }

    static final class DeviceSpec {

        final String path;
        final String name;
        final int minX;
        final int maxX;
        final int minY;
        final int maxY;
        final boolean hasSlots;
        final int displayWidth;
        final int displayHeight;
        final int rotation;

        DeviceSpec(
            String path,
            String name,
            int minX,
            int maxX,
            int minY,
            int maxY,
            boolean hasSlots,
            int displayWidth,
            int displayHeight,
            int rotation
        ) {
            if (path == null || !path.startsWith("/dev/input/event") || maxX <= minX ||
                maxY <= minY || displayWidth <= 0 || displayHeight <= 0 ||
                rotation < 0 || rotation > 3
            ) {
                throw new IllegalArgumentException("Invalid Linux input device specification");
            }
            this.path = path;
            this.name = name == null ? "" : name;
            this.minX = minX;
            this.maxX = maxX;
            this.minY = minY;
            this.maxY = maxY;
            this.hasSlots = hasSlots;
            this.displayWidth = displayWidth;
            this.displayHeight = displayHeight;
            this.rotation = rotation;
        }

        float[] map(int rawX, int rawY) {
            float normalizedX = clamp01((rawX - minX) / (float) (maxX - minX));
            float normalizedY = clamp01((rawY - minY) / (float) (maxY - minY));
            float x;
            float y;
            switch (rotation) {
                case 1:
                    x = (1.0F - normalizedY) * (displayWidth - 1);
                    y = normalizedX * (displayHeight - 1);
                    break;
                case 2:
                    x = (1.0F - normalizedX) * (displayWidth - 1);
                    y = (1.0F - normalizedY) * (displayHeight - 1);
                    break;
                case 3:
                    x = normalizedY * (displayWidth - 1);
                    y = (1.0F - normalizedX) * (displayHeight - 1);
                    break;
                default:
                    x = normalizedX * (displayWidth - 1);
                    y = normalizedY * (displayHeight - 1);
                    break;
            }
            return new float[] {x, y};
        }

        private static float clamp01(float value) {
            return Math.max(0.0F, Math.min(1.0F, value));
        }
    }

    static final class InputEvent {

        final long seconds;
        final long micros;
        final int type;
        final int code;
        final int value;

        InputEvent(long seconds, long micros, int type, int code, int value) {
            this.seconds = seconds;
            this.micros = micros;
            this.type = type;
            this.code = code;
            this.value = value;
        }
    }

    static final class TouchSample {

        final int action;
        final float x;
        final float y;
        final int trackingId;

        TouchSample(int action, float x, float y, int trackingId) {
            this.action = action;
            this.x = x;
            this.y = y;
            this.trackingId = trackingId;
        }
    }

    private static final class Contact {

        int trackingId = -1;
        int rawX;
        int rawY;
        boolean active;
        boolean hasX;
        boolean hasY;

        Contact copy() {
            Contact copy = new Contact();
            copy.trackingId = trackingId;
            copy.rawX = rawX;
            copy.rawY = rawY;
            copy.active = active;
            copy.hasX = hasX;
            copy.hasY = hasY;
            return copy;
        }
    }

    private static final class MutableDevice {

        final String path;
        String name = "";
        Integer minX;
        Integer maxX;
        Integer minY;
        Integer maxY;
        boolean hasSlots;
        boolean hasTrackingId;

        MutableDevice(String path) {
            this.path = path;
        }
    }
}
