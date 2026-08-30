package io.github.supermonster003.autojs6.plugin.imgui;

import org.junit.Test;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public class ImGuiLinuxInputTest {

    @Test
    public void decodes32And64BitKernelRecords() {
        ByteBuffer record64 = ByteBuffer.allocate(ImGuiLinuxInput.EVENT_BYTES_64)
            .order(ByteOrder.nativeOrder())
            .putLong(123L)
            .putLong(456L)
            .putShort((short) ImGuiLinuxInput.EV_ABS)
            .putShort((short) ImGuiLinuxInput.ABS_MT_POSITION_X)
            .putInt(719);
        ImGuiLinuxInput.InputEvent event64 = ImGuiLinuxInput.decode(record64.array(), true);
        assertEquals(123L, event64.seconds);
        assertEquals(456L, event64.micros);
        assertEquals(ImGuiLinuxInput.EV_ABS, event64.type);
        assertEquals(ImGuiLinuxInput.ABS_MT_POSITION_X, event64.code);
        assertEquals(719, event64.value);

        ByteBuffer record32 = ByteBuffer.allocate(ImGuiLinuxInput.EVENT_BYTES_32)
            .order(ByteOrder.nativeOrder())
            .putInt(7)
            .putInt(8)
            .putShort((short) ImGuiLinuxInput.EV_ABS)
            .putShort((short) ImGuiLinuxInput.ABS_MT_TRACKING_ID)
            .putInt(-1);
        ImGuiLinuxInput.InputEvent event32 = ImGuiLinuxInput.decode(record32.array(), false);
        assertEquals(7L, event32.seconds);
        assertEquals(8L, event32.micros);
        assertEquals(-1, event32.value);
    }

    @Test
    public void parsesAndRanksTouchDeviceCapabilities() {
        String getevent =
            "add device 1: /dev/input/event2\n" +
            "  name:     \"sensor\"\n" +
            "    ABS (0003): ABS_MT_POSITION_X : value 0, min 0, max 100\n" +
            "                ABS_MT_POSITION_Y : value 0, min 0, max 100\n" +
            "                ABS_MT_TRACKING_ID : value 0, min 0, max 10\n" +
            "add device 2: /dev/input/event6\n" +
            "  name:     \"clearpad touch\"\n" +
            "    ABS (0003): ABS_MT_SLOT : value 0, min 0, max 9\n" +
            "                ABS_MT_POSITION_X : value 0, min 0, max 719\n" +
            "                ABS_MT_POSITION_Y : value 0, min 0, max 1279\n" +
            "                ABS_MT_TRACKING_ID : value 0, min 0, max 65535\n";

        List<ImGuiLinuxInput.DeviceSpec> devices =
            ImGuiLinuxInput.parseGetevent(getevent, 720, 1280, 0);
        assertEquals(2, devices.size());
        ImGuiLinuxInput.DeviceSpec touch = devices.get(1);
        assertEquals("/dev/input/event6", touch.path);
        assertEquals("clearpad touch", touch.name);
        assertTrue(touch.hasSlots);
        assertEquals(719, touch.maxX);
        assertEquals(1279, touch.maxY);
    }

    @Test
    public void tracksTypeBDownMoveAndUp() {
        ImGuiLinuxInput.DeviceSpec spec = new ImGuiLinuxInput.DeviceSpec(
            "/dev/input/event6", "touch", 0, 719, 0, 1279, true, 720, 1280, 0
        );
        ImGuiLinuxInput.TouchTracker tracker = new ImGuiLinuxInput.TouchTracker(spec);
        acceptAbs(tracker, ImGuiLinuxInput.ABS_MT_SLOT, 0);
        acceptAbs(tracker, ImGuiLinuxInput.ABS_MT_TRACKING_ID, 10);
        acceptAbs(tracker, ImGuiLinuxInput.ABS_MT_POSITION_X, 120);
        acceptAbs(tracker, ImGuiLinuxInput.ABS_MT_POSITION_Y, 340);
        ImGuiLinuxInput.TouchSample down = sync(tracker, ImGuiLinuxInput.SYN_REPORT);
        assertNotNull(down);
        assertEquals(ImGuiLinuxInput.ACTION_DOWN, down.action);
        assertEquals(120.0F, down.x, 0.01F);
        assertEquals(340.0F, down.y, 0.01F);

        acceptAbs(tracker, ImGuiLinuxInput.ABS_MT_POSITION_X, 200);
        ImGuiLinuxInput.TouchSample move = sync(tracker, ImGuiLinuxInput.SYN_REPORT);
        assertEquals(ImGuiLinuxInput.ACTION_MOVE, move.action);
        assertEquals(200.0F, move.x, 0.01F);

        acceptAbs(tracker, ImGuiLinuxInput.ABS_MT_TRACKING_ID, -1);
        ImGuiLinuxInput.TouchSample up = sync(tracker, ImGuiLinuxInput.SYN_REPORT);
        assertEquals(ImGuiLinuxInput.ACTION_UP, up.action);
        assertEquals(200.0F, up.x, 0.01F);
        assertNull(sync(tracker, ImGuiLinuxInput.SYN_REPORT));
    }

    @Test
    public void tracksTypeAFramesAndRotation() {
        ImGuiLinuxInput.DeviceSpec spec = new ImGuiLinuxInput.DeviceSpec(
            "/dev/input/event6", "clearpad", 0, 719, 0, 1279, false, 1280, 720, 1
        );
        ImGuiLinuxInput.TouchTracker tracker = new ImGuiLinuxInput.TouchTracker(spec);
        acceptAbs(tracker, ImGuiLinuxInput.ABS_MT_TRACKING_ID, 3);
        acceptAbs(tracker, ImGuiLinuxInput.ABS_MT_POSITION_X, 0);
        acceptAbs(tracker, ImGuiLinuxInput.ABS_MT_POSITION_Y, 0);
        assertNull(sync(tracker, ImGuiLinuxInput.SYN_MT_REPORT));
        ImGuiLinuxInput.TouchSample down = sync(tracker, ImGuiLinuxInput.SYN_REPORT);
        assertEquals(ImGuiLinuxInput.ACTION_DOWN, down.action);
        assertEquals(1279.0F, down.x, 0.01F);
        assertEquals(0.0F, down.y, 0.01F);

        ImGuiLinuxInput.TouchSample up = sync(tracker, ImGuiLinuxInput.SYN_REPORT);
        assertNotNull(up);
        assertEquals(ImGuiLinuxInput.ACTION_UP, up.action);
    }

    @Test
    public void deviceMappingClampsOutOfRangeValues() {
        ImGuiLinuxInput.DeviceSpec spec = new ImGuiLinuxInput.DeviceSpec(
            "/dev/input/event0", "touch", 10, 110, 20, 220, false, 100, 200, 0
        );
        float[] low = spec.map(-100, -100);
        float[] high = spec.map(999, 999);
        assertEquals(0.0F, low[0], 0.0F);
        assertEquals(0.0F, low[1], 0.0F);
        assertEquals(99.0F, high[0], 0.0F);
        assertEquals(199.0F, high[1], 0.0F);
        assertFalse(spec.hasSlots);
    }

    private static void acceptAbs(ImGuiLinuxInput.TouchTracker tracker, int code, int value) {
        assertNull(tracker.accept(new ImGuiLinuxInput.InputEvent(
            0, 0, ImGuiLinuxInput.EV_ABS, code, value
        )));
    }

    private static ImGuiLinuxInput.TouchSample sync(
        ImGuiLinuxInput.TouchTracker tracker,
        int code
    ) {
        return tracker.accept(new ImGuiLinuxInput.InputEvent(
            0, 0, ImGuiLinuxInput.EV_SYN, code, 0
        ));
    }
}
