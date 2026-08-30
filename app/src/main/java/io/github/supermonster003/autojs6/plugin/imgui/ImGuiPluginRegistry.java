package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.Context;
import android.content.ServiceConnection;

public final class ImGuiPluginRegistry {

    private ImGuiPluginRegistry() {
        throw new AssertionError("No instances");
    }

    public static ServiceConnection loadDefault(
        Context hostContext,
        Context pluginContext,
        Object runtime,
        Object scope
    ) {
        if (hostContext == null) {
            throw new IllegalArgumentException("Host context must not be null");
        }
        if (pluginContext == null) {
            throw new IllegalArgumentException("Plugin context must not be null");
        }
        return new ImGuiPluginConnection(hostContext, pluginContext, runtime);
    }
}
