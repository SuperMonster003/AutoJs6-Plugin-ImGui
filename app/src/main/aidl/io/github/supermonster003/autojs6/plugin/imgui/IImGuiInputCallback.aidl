package io.github.supermonster003.autojs6.plugin.imgui;

oneway interface IImGuiInputCallback {
    void onTouch(int action, float x, float y, int trackingId);
    void onError(String message);
}
