package io.github.supermonster003.autojs6.plugin.imgui;

import android.view.Surface;
import io.github.supermonster003.autojs6.plugin.imgui.IImGuiInputCallback;

interface IImGuiPrivilegedEndpoint {
    Surface createSurface(
        int width,
        int height,
        int rotation,
        IImGuiInputCallback inputCallback
    );
    void setInputEnabled(boolean enabled);
    String info();
    void close();
}
