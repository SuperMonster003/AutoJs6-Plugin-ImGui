package io.github.supermonster003.autojs6.plugin.imgui;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

public class ImGuiHostPrivilegesTest {

    @Test
    public void autoPrefersOperationalShizukuAndFallsBackToRoot() {
        assertEquals(
            ImGuiHostPrivileges.BACKEND_SHIZUKU,
            ImGuiHostPrivileges.resolveBackend(snapshot(true, true), "auto")
        );
        assertEquals(
            ImGuiHostPrivileges.BACKEND_ROOT,
            ImGuiHostPrivileges.resolveBackend(snapshot(true, false), null)
        );
    }

    @Test
    public void explicitBackendMustBeAvailable() {
        ImGuiHostPrivileges.Snapshot unavailable = snapshot(false, false);
        assertThrows(
            IllegalStateException.class,
            () -> ImGuiHostPrivileges.resolveBackend(unavailable, "auto")
        );
        assertThrows(
            IllegalStateException.class,
            () -> ImGuiHostPrivileges.resolveBackend(unavailable, "root")
        );
        assertThrows(
            IllegalStateException.class,
            () -> ImGuiHostPrivileges.resolveBackend(unavailable, "shizuku")
        );
        assertThrows(
            IllegalArgumentException.class,
            () -> ImGuiHostPrivileges.resolveBackend(unavailable, "adb")
        );
    }

    @Test
    public void hostShellResultIsParsedWithoutDependingOnHostClasses() throws Exception {
        FakeResult source = new FakeResult();
        source.code = 0;
        source.result = "pid=42\n";
        source.error = "";

        ImGuiHostPrivileges.CommandResult result =
            ImGuiHostPrivileges.commandResult("root", source);
        assertEquals("root", result.backend);
        assertEquals(0, result.code);
        assertEquals("pid=42\n", result.output);
        assertTrue(result.isSuccess());
    }

    private static ImGuiHostPrivileges.Snapshot snapshot(
        boolean rootCandidate,
        boolean shizukuOperational
    ) {
        return new ImGuiHostPrivileges.Snapshot(
            true,
            rootCandidate,
            rootCandidate,
            "AUTO_DETECT",
            "",
            true,
            shizukuOperational,
            shizukuOperational,
            shizukuOperational,
            shizukuOperational,
            shizukuOperational,
            ""
        );
    }

    public static final class FakeResult {

        public int code;
        public String result;
        public String error;
    }
}
