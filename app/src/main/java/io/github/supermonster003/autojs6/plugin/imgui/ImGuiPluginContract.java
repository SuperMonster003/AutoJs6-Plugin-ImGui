package io.github.supermonster003.autojs6.plugin.imgui;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class ImGuiPluginContract {

    public static final String PLUGIN_ID = "imgui";
    public static final String ENGINE = "imgui";
    public static final String GLOBAL_OBJECT_NAME = "imgui";
    public static final String VARIANT = "default";
    public static final String INFO_ACTION = "org.autojs.plugin.INFO";
    public static final String REGISTRY_META_DATA = "org.autojs.plugin.sdk.registry";
    public static final String SCRIPT_DIRECTORY = "plugin";
    public static final long REQUIRED_HOST_VERSION = 3853L;

    private static final String[] SUPPORTED_ABIS = {
        "arm64-v8a",
        "armeabi-v7a",
        "x86_64",
        "x86",
    };

    private ImGuiPluginContract() {
        throw new AssertionError("No instances");
    }

    public static String[] supportedAbis() {
        return SUPPORTED_ABIS.clone();
    }

    public static List<String> supportedAbiList() {
        return Collections.unmodifiableList(Arrays.asList(SUPPORTED_ABIS.clone()));
    }
}
