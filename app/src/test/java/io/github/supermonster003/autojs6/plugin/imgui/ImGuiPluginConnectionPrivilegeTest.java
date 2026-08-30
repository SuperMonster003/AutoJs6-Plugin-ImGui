package io.github.supermonster003.autojs6.plugin.imgui;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

public class ImGuiPluginConnectionPrivilegeTest {

    private static final String TOKEN =
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Test
    public void launchCommandQuotesApkPathAndKeepsFixedEntrypoint() {
        String command = ImGuiPluginConnection.buildPrivilegedLaunchCommand(
            "/data/app/a path/it's/base.apk",
            TOKEN,
            "io.github.example.plugin",
            10
        );

        assertTrue(command.contains("CLASSPATH='/data/app/a path/it'\"'\"'s/base.apk'"));
        assertTrue(command.contains("/system/bin/setsid /system/bin/app_process /system/bin"));
        assertTrue(command.contains("ImGuiPrivilegedProcess broker-child " + TOKEN));
        assertTrue(command.endsWith("io.github.example.plugin 10 </dev/null >/dev/null 2>&1 &"));
        assertFalse(command.contains(";rm -rf"));
    }

    @Test
    public void launchCommandRejectsTokenAndPackageInjection() {
        expectIllegalArgument(() -> ImGuiPluginConnection.buildPrivilegedLaunchCommand(
            "/data/app/base.apk",
            TOKEN + ";id",
            "io.github.example.plugin",
            0
        ));
        expectIllegalArgument(() -> ImGuiPluginConnection.buildPrivilegedLaunchCommand(
            "/data/app/base.apk",
            TOKEN,
            "io.github.example.plugin;id",
            0
        ));
        expectIllegalArgument(() -> ImGuiPluginConnection.buildPrivilegedLaunchCommand(
            "/data/app/base.apk",
            TOKEN,
            "io.github.example.plugin",
            -1
        ));
    }

    private static void expectIllegalArgument(Runnable action) {
        try {
            action.run();
            fail("Expected IllegalArgumentException");
        } catch (IllegalArgumentException expected) {
            // Expected.
        }
    }
}
