package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Bundle;

import org.autojs.plugin.common.api.PluginCapabilityKeys;
import org.autojs.plugin.common.api.PluginInfo;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

final class PluginRuntimeInfo {

    private PluginRuntimeInfo() {
        throw new AssertionError("No instances");
    }

    static PluginInfo create(Context context) {
        Context appContext = context.getApplicationContext();
        PackageInfo packageInfo;
        try {
            packageInfo = appContext.getPackageManager().getPackageInfo(appContext.getPackageName(), 0);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to read ImGui plugin package metadata", exception);
        }

        PluginInfo info = new PluginInfo();
        info.setName(appContext.getString(R.string.app_name));
        info.setDescription(appContext.getString(R.string.plugin_description));
        info.setInstruction(readInstruction(appContext));
        info.setAuthor(appContext.getString(R.string.plugin_author));
        info.setVersionName(packageInfo.versionName == null ? "" : packageInfo.versionName);
        info.setVersionCode(versionCode(packageInfo));
        info.setVersionDate(BuildConfig.VERSION_DATE);
        info.setId(ImGuiPluginContract.PLUGIN_ID);
        info.setEngine(ImGuiPluginContract.ENGINE);
        info.setVariant(ImGuiPluginContract.VARIANT);
        info.setSupportedAbis(ImGuiPluginContract.supportedAbis());
        Bundle capabilities = new Bundle();
        capabilities.putLong(
            PluginCapabilityKeys.REQUIRES_HOST_VERSION,
            ImGuiPluginContract.REQUIRED_HOST_VERSION
        );
        capabilities.putString("dearImGuiVersion", BuildConfig.DEAR_IMGUI_VERSION);
        capabilities.putBoolean("providesGlobalObject", true);
        capabilities.putString("globalObjectName", ImGuiPluginContract.GLOBAL_OBJECT_NAME);
        capabilities.putStringArray(
            ImGuiPluginContract.CAPABILITY_EXAMPLE_NAMES,
            ImGuiPluginContract.exampleNames()
        );
        capabilities.putString(
            ImGuiPluginContract.CAPABILITY_DEFAULT_EXAMPLE,
            ImGuiPluginContract.DEFAULT_EXAMPLE
        );
        capabilities.putString(
            ImGuiPluginContract.CAPABILITY_EXAMPLE_API,
            "imgui.runExample"
        );
        capabilities.putString(
            ImGuiPluginContract.CAPABILITY_EXAMPLE_MANIFEST,
            ImGuiPluginContract.EXAMPLE_MANIFEST_ASSET
        );
        capabilities.putString(
            ImGuiPluginContract.CAPABILITY_TYPESCRIPT_DECLARATION,
            ImGuiPluginContract.TYPESCRIPT_DECLARATION_ASSET
        );
        info.setCapabilities(capabilities);
        return info;
    }

    private static String readInstruction(Context context) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
            context.getResources().openRawResource(R.raw.plugin_instruction),
            StandardCharsets.UTF_8
        ))) {
            StringBuilder result = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (result.length() > 0) {
                    result.append('\n');
                }
                result.append(line);
            }
            return result.toString().trim();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read ImGui plugin instructions", exception);
        }
    }

    @SuppressWarnings("deprecation")
    private static long versionCode(PackageInfo packageInfo) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return packageInfo.getLongVersionCode();
        }
        return packageInfo.versionCode;
    }
}
