package io.github.supermonster003.autojs6.plugin.imgui;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotSame;
import static org.junit.Assert.assertThrows;

import org.junit.Test;

import java.util.List;

public class ImGuiPluginContractTest {

    private static final String[] EXPECTED_ABIS = {
        "arm64-v8a",
        "armeabi-v7a",
        "x86_64",
        "x86",
    };

    @Test
    public void supportedAbisReturnsDefensiveCopies() {
        String[] first = ImGuiPluginContract.supportedAbis();
        String[] second = ImGuiPluginContract.supportedAbis();

        assertArrayEquals(EXPECTED_ABIS, first);
        assertArrayEquals(EXPECTED_ABIS, second);
        assertNotSame(first, second);

        first[0] = "changed";
        assertArrayEquals(EXPECTED_ABIS, ImGuiPluginContract.supportedAbis());
    }

    @Test
    public void supportedAbiListIsStableAndImmutable() {
        List<String> abis = ImGuiPluginContract.supportedAbiList();

        assertEquals(List.of(EXPECTED_ABIS), abis);
        assertThrows(UnsupportedOperationException.class, () -> abis.add("riscv64"));
    }

    @Test
    public void pluginIdentityMatchesGlobalApi() {
        assertEquals("imgui", ImGuiPluginContract.PLUGIN_ID);
        assertEquals("imgui", ImGuiPluginContract.ENGINE);
        assertEquals("imgui", ImGuiPluginContract.GLOBAL_OBJECT_NAME);
        assertEquals(
            "types/imgui.d.ts",
            ImGuiPluginContract.TYPESCRIPT_DECLARATION_ASSET
        );
    }

    @Test
    public void exampleInventoryIsWhitelistedAndStable() {
        assertArrayEquals(
            new String[]{
                "widget-overview",
                "parameter-panel",
                "log-hud",
                "data-table-demo",
                "theme-gallery",
                "error-handling",
            },
            ImGuiPluginContract.exampleNames()
        );
        assertEquals(
            "examples/widget-overview.js",
            ImGuiPluginContract.exampleAssetPath("widget-overview")
        );
        assertThrows(
            IllegalArgumentException.class,
            () -> ImGuiPluginContract.exampleAssetPath("../plugin/index")
        );
    }
}
