package io.github.supermonster003.autojs6.plugin.imgui;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

import org.autojs.plugin.common.api.IPluginInfoProvider;
import org.autojs.plugin.common.api.PluginInfo;

public final class ImGuiPluginInfoService extends Service {

    private final IPluginInfoProvider.Stub binder = new IPluginInfoProvider.Stub() {
        @Override
        public PluginInfo getInfo() {
            return PluginRuntimeInfo.create(ImGuiPluginInfoService.this);
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }
}
