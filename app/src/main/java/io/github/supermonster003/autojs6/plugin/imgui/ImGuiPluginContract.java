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
    public static final String EXAMPLE_DIRECTORY = "examples";
    public static final String DEFAULT_EXAMPLE = "widget-overview";
    public static final String CAPABILITY_EXAMPLE_NAMES = "exampleNames";
    public static final String CAPABILITY_DEFAULT_EXAMPLE = "defaultExample";
    public static final String CAPABILITY_EXAMPLE_API = "exampleApi";
    public static final String CAPABILITY_EXAMPLE_MANIFEST = "exampleManifest";
    public static final String CAPABILITY_TYPESCRIPT_DECLARATION = "typescriptDeclaration";
    public static final String EXAMPLE_MANIFEST_ASSET = "examples/index.json";
    public static final String TYPESCRIPT_DECLARATION_ASSET = "types/imgui.d.ts";
    public static final long REQUIRED_HOST_VERSION = 5935L;

    private static final String[] SUPPORTED_ABIS = {
        "arm64-v8a",
        "armeabi-v7a",
        "x86_64",
        "x86",
    };

    private static final String[] EXAMPLE_NAMES = {
        DEFAULT_EXAMPLE,
        "parameter-panel",
        "log-hud",
        "data-table-demo",
        "theme-gallery",
        "error-handling",
        "background-task",
        "large-list",
        "texture-refresh",
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

    public static String[] exampleNames() {
        return EXAMPLE_NAMES.clone();
    }

    public static List<String> exampleNameList() {
        return Collections.unmodifiableList(Arrays.asList(EXAMPLE_NAMES.clone()));
    }

    public static boolean isKnownExample(String name) {
        return name != null && exampleNameList().contains(name);
    }

    public static String exampleAssetPath(String name) {
        if (!isKnownExample(name)) {
            throw new IllegalArgumentException("Unknown ImGui example: " + name);
        }
        return EXAMPLE_DIRECTORY + "/" + name + ".js";
    }
}
