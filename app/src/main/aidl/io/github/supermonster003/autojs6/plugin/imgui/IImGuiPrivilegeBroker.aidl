package io.github.supermonster003.autojs6.plugin.imgui;

import io.github.supermonster003.autojs6.plugin.imgui.IImGuiPrivilegedEndpoint;

interface IImGuiPrivilegeBroker {
    void prepare(String token);
    void registerEndpoint(String token, IImGuiPrivilegedEndpoint endpoint);
    IImGuiPrivilegedEndpoint awaitEndpoint(String token, long timeoutMillis);
    String status(String token);
    void clear(String token);
}
