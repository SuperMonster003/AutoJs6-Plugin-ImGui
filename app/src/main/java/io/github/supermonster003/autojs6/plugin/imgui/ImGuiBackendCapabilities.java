package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.Context;
import android.os.Build;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

final class ImGuiBackendCapabilities {

    private ImGuiBackendCapabilities() {
        throw new AssertionError("No instances");
    }

    static String[] probe(Context hostContext, Context pluginContext, Object runtime) {
        if (hostContext == null || pluginContext == null) {
            throw new IllegalArgumentException("Host and plugin contexts must not be null");
        }
        boolean surfaceControlApi = hasClass("android.view.SurfaceControl") &&
            hasClass("android.view.SurfaceSession") &&
            hasClass("android.view.SurfaceControl$Builder") &&
            hasClass("android.view.SurfaceControl$Transaction");
        ImGuiHostPrivileges.Snapshot privileges = ImGuiHostPrivileges.probe(hostContext);
        boolean launcherCandidate =
            (privileges.rootBridgeAvailable && privileges.rootCandidate) ||
                (privileges.shizukuBridgeAvailable && privileges.shizukuOperational);
        boolean privilegedCandidate = surfaceControlApi && launcherCandidate;
        boolean appInputReadable = appInputReadable();

        Map<String, String> values = new LinkedHashMap<>();
        put(values, "schemaVersion", 2);
        put(values, "sdk", Build.VERSION.SDK_INT);

        put(values, "window.status", "available");
        put(values, "window.productionReady", true);
        put(values, "window.requiresOverlayPermission", true);

        put(values, "splitTouch.status", "available");
        put(values, "splitTouch.productionReady", true);

        put(values, "privileged.status", privilegedCandidate ? "available" : "unavailable");
        put(values, "privileged.productionReady", true);
        put(values, "privileged.protocolVersion", ImGuiPrivilegeBrokerService.PROTOCOL_VERSION);
        put(values, "privileged.legacySocketProtocolVersion", ImGuiPrivilegedProtocol.VERSION);
        put(values, "privileged.transport", ImGuiPrivilegeBrokerService.TRANSPORT);
        put(values, "privileged.rendererProcess", "host");
        put(values, "privileged.tokenBits", 256);
        put(values, "privileged.processEntrypoint", true);
        put(values, "privileged.surfaceControlApi", surfaceControlApi);
        put(values, "privileged.launcherCandidate", launcherCandidate);
        put(
            values,
            "privileged.hostBridgeAvailable",
            privileges.rootBridgeAvailable || privileges.shizukuBridgeAvailable
        );
        put(values, "privileged.rootBridgeAvailable", privileges.rootBridgeAvailable);
        put(values, "privileged.rootMode", privileges.rootMode);
        put(values, "privileged.rootBinaryPresent", privileges.rootBinaryPresent);
        put(values, "privileged.rootCandidate", privileges.rootCandidate);
        put(values, "privileged.rootError", privileges.rootError);
        put(values, "privileged.shizukuBridgeAvailable", privileges.shizukuBridgeAvailable);
        put(values, "privileged.shizukuInstalled", privileges.shizukuInstalled);
        put(values, "privileged.shizukuRunning", privileges.shizukuRunning);
        put(values, "privileged.shizukuPermission", privileges.shizukuPermission);
        put(values, "privileged.shizukuService", privileges.shizukuService);
        put(values, "privileged.shizukuOperational", privileges.shizukuOperational);
        put(values, "privileged.shizukuError", privileges.shizukuError);
        put(
            values,
            "privileged.reason",
            privilegedReason(surfaceControlApi, privileges)
        );

        put(values, "directInput.status", privilegedCandidate ? "available" : "unavailable");
        put(values, "directInput.productionReady", true);
        put(values, "directInput.readerImplemented", true);
        put(values, "directInput.appProcessReadable", appInputReadable);
        put(values, "directInput.runtimeProbeRequired", true);
        put(values, "directInput.routingPolicy", "observe");
        put(
            values,
            "directInput.reason",
            privilegedCandidate
                ? "the privileged evdev reader is enabled without EVIOCGRAB; per-device input availability is reported by Session.getBackendInfo()"
                : "a Shizuku/root launcher and SurfaceControl capability are required"
        );

        put(values, "docking.status", "deferred");
        put(values, "docking.productionReady", false);
        put(values, "multiViewport.status", "deferred");
        put(values, "multiViewport.productionReady", false);

        String[] flattened = new String[values.size() * 2];
        int index = 0;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            flattened[index++] = entry.getKey();
            flattened[index++] = entry.getValue();
        }
        return flattened;
    }

    private static String privilegedReason(
        boolean surfaceControlApi,
        ImGuiHostPrivileges.Snapshot privileges
    ) {
        if (!surfaceControlApi) {
            return "required SurfaceControl framework primitives are unavailable";
        }
        if (!(privileges.rootBridgeAvailable || privileges.shizukuBridgeAvailable)) {
            return "the AutoJs6 host privilege bridge is unavailable";
        }
        if (!(privileges.rootCandidate || privileges.shizukuOperational)) {
            return "AutoJs6 has neither an operational Shizuku service nor an allowed root backend";
        }
        return "ready through AutoJs6 host-managed Root/Shizuku: the privileged child owns the SurfaceControl layer and transfers only its Surface to the existing host renderer over authenticated Binder";
    }

    private static boolean appInputReadable() {
        for (int index = 0; index < 64; index++) {
            try (FileInputStream ignored = new FileInputStream("/dev/input/event" + index)) {
                return true;
            } catch (IOException | SecurityException ignored) {
                // Try the next event node. Opening is non-blocking; no input event is consumed.
            }
        }
        return false;
    }

    private static boolean hasClass(String name) {
        try {
            Class.forName(name, false, ImGuiBackendCapabilities.class.getClassLoader());
            return true;
        } catch (ClassNotFoundException | LinkageError ignored) {
            return false;
        }
    }

    private static void put(Map<String, String> values, String key, Object value) {
        values.put(key, String.valueOf(value));
    }
}
