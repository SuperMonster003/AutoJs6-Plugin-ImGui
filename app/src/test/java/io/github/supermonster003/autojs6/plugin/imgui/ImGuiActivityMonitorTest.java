package io.github.supermonster003.autojs6.plugin.imgui;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.Test;

/** Idle time, the one-shot input wake and screen state of the power-saving frame loop, with a fake clock. */
public class ImGuiActivityMonitorTest {

    private final AtomicLong now = new AtomicLong(1000L);
    private final AtomicInteger wakes = new AtomicInteger();
    private final ImGuiActivityMonitor monitor = new ImGuiActivityMonitor(now::get);

    @Test
    public void inputResetsTheIdleTime() {
        monitor.start(null, wakes::incrementAndGet);
        now.addAndGet(3500L);
        assertEquals(3500L, monitor.idleMillis());
        monitor.noteActivity();
        assertEquals(0L, monitor.idleMillis());
        assertEquals("an input without an armed wake does not run the listener", 0, wakes.get());
    }

    @Test
    public void armedWakeRunsOnce() {
        monitor.start(null, wakes::incrementAndGet);
        monitor.armWake(true);
        monitor.noteActivity();
        monitor.noteActivity();
        assertEquals(1, wakes.get());
        monitor.armWake(true);
        monitor.armWake(false);
        monitor.noteActivity();
        assertEquals(1, wakes.get());
    }

    @Test
    public void screenChangesRunTheListenerAndScreenOnCountsAsActivity() {
        monitor.start(null, wakes::incrementAndGet);
        now.addAndGet(5000L);
        monitor.updateScreenState(false);
        assertFalse(monitor.isScreenActive());
        monitor.updateScreenState(false);
        assertEquals("an unchanged state does not run the listener", 1, wakes.get());
        monitor.updateScreenState(true);
        assertTrue(monitor.isScreenActive());
        assertEquals(2, wakes.get());
        assertEquals(0L, monitor.idleMillis());
    }

    @Test
    public void staleTokenCannotStopTheNextSession() {
        long first = monitor.start(null, wakes::incrementAndGet);
        long second = monitor.start(null, wakes::incrementAndGet);
        assertFalse(monitor.stop(first));
        monitor.armWake(true);
        monitor.noteActivity();
        assertEquals(1, wakes.get());
        assertTrue(monitor.stop(second));
        monitor.armWake(true);
        monitor.noteActivity();
        assertEquals("a stopped monitor has no listener", 1, wakes.get());
    }
}
