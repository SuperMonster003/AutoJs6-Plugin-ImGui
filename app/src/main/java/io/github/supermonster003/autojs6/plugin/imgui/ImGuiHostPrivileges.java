package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.Context;

import java.io.File;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Locale;

/**
 * Reflection-only adapter for the privilege managers owned by the AutoJs6 host.
 *
 * <p>The plugin deliberately does not bundle Shizuku or RootShell. Loading the host classes through
 * {@link Context#getClassLoader()} preserves the host's permission state, RootMode preference, Shizuku
 * user-service reconnect behavior, and future implementation fixes without creating a second authority
 * inside the plugin APK.</p>
 */
final class ImGuiHostPrivileges {

    static final String BACKEND_AUTO = "auto";
    static final String BACKEND_SHIZUKU = "shizuku";
    static final String BACKEND_ROOT = "root";

    private static final String WRAPPED_SHIZUKU =
        "org.autojs.autojs.runtime.api.WrappedShizuku";
    private static final String ROOT_UTILS = "org.autojs.autojs.util.RootUtils";
    private static final String PROCESS_SHELL = "org.autojs.autojs.runtime.api.ProcessShell";
    private static final String[] ROOT_BINARY_CANDIDATES = {
        "/system/xbin/su",
        "/system/bin/su",
        "/vendor/bin/su",
        "/system_ext/bin/su",
        "/odm/bin/su",
        "/sbin/su",
        "/su/bin/su",
        "/system/su",
    };

    private ImGuiHostPrivileges() {
        throw new AssertionError("No instances");
    }

    static Snapshot probe(Context hostContext) {
        if (hostContext == null) {
            throw new IllegalArgumentException("Host context must not be null");
        }
        ClassLoader loader = hostContext.getClassLoader();
        boolean rootBinaryPresent = rootBinaryPresent();

        boolean rootBridgeAvailable = false;
        String rootMode = "UNKNOWN";
        boolean rootCandidate = rootBinaryPresent;
        String rootError = "";
        try {
            Class<?> rootUtils = Class.forName(ROOT_UTILS, false, loader);
            rootBridgeAvailable = true;
            Object mode = rootUtils.getMethod("getRootMode").invoke(null);
            rootMode = mode instanceof Enum<?> ? ((Enum<?>) mode).name() : String.valueOf(mode);
            if ("FORCE_NON_ROOT".equals(rootMode)) {
                rootCandidate = false;
            } else if ("FORCE_ROOT".equals(rootMode)) {
                rootCandidate = true;
            } else if ("AUTO_DETECT".equals(rootMode)) {
                // Keep capability probing non-elevating. The host performs its authoritative
                // PATH/RootShell check immediately before launch in execute().
                rootCandidate = true;
            }
        } catch (ReflectiveOperationException | LinkageError | RuntimeException error) {
            rootError = describe(error);
        }

        boolean shizukuBridgeAvailable = false;
        boolean shizukuInstalled = false;
        boolean shizukuRunning = false;
        boolean shizukuPermission = false;
        boolean shizukuService = false;
        boolean shizukuOperational = false;
        String shizukuError = "";
        try {
            Object shizuku = kotlinObject(loader, WRAPPED_SHIZUKU);
            shizukuBridgeAvailable = true;
            shizukuInstalled = invokeBoolean(
                shizuku,
                "isInstalled",
                new Class<?>[]{Context.class},
                hostContext
            );
            shizukuRunning = invokeBoolean(shizuku, "isRunning", new Class<?>[0]);
            shizukuPermission = invokeBoolean(shizuku, "hasPermission", new Class<?>[0]);
            shizukuService = invokeBoolean(shizuku, "hasService", new Class<?>[0]);
            shizukuOperational = invokeBoolean(shizuku, "isOperational", new Class<?>[0]);
        } catch (ReflectiveOperationException | LinkageError | RuntimeException error) {
            shizukuError = describe(error);
        }

        return new Snapshot(
            rootBridgeAvailable,
            rootBinaryPresent,
            rootCandidate,
            rootMode,
            rootError,
            shizukuBridgeAvailable,
            shizukuInstalled,
            shizukuRunning,
            shizukuPermission,
            shizukuService,
            shizukuOperational,
            shizukuError
        );
    }

    static CommandResult execute(Context hostContext, String backend, String command) {
        if (hostContext == null) {
            throw new IllegalArgumentException("Host context must not be null");
        }
        if (command == null || command.trim().isEmpty()) {
            throw new IllegalArgumentException("Privileged command must not be empty");
        }
        String resolvedBackend = resolveBackend(probe(hostContext), backend);
        try {
            Object result;
            ClassLoader loader = hostContext.getClassLoader();
            if (BACKEND_SHIZUKU.equals(resolvedBackend)) {
                Object shizuku = kotlinObject(loader, WRAPPED_SHIZUKU);
                result = shizuku.getClass()
                    .getMethod("execCommand", Context.class, String.class)
                    .invoke(shizuku, hostContext, command);
            } else {
                Class<?> rootUtils = Class.forName(ROOT_UTILS, false, loader);
                boolean rootAvailable = (Boolean) rootUtils
                    .getMethod("isRootAvailable")
                    .invoke(null);
                if (!rootAvailable) {
                    throw new IllegalStateException(
                        "AutoJs6 reports that the configured root backend is unavailable"
                    );
                }
                Class<?> processShell = Class.forName(PROCESS_SHELL, false, loader);
                result = processShell
                    .getMethod("execCommand", String.class, boolean.class)
                    .invoke(null, command, true);
            }
            return commandResult(resolvedBackend, result);
        } catch (InvocationTargetException error) {
            Throwable cause = error.getCause() == null ? error : error.getCause();
            throw new IllegalStateException(
                "AutoJs6 " + resolvedBackend + " command failed: " + describe(cause),
                cause
            );
        } catch (ReflectiveOperationException | LinkageError error) {
            throw new IllegalStateException(
                "Unable to call the AutoJs6 " + resolvedBackend + " bridge: " + describe(error),
                error
            );
        }
    }

    static String resolveBackend(Snapshot snapshot, String requested) {
        if (snapshot == null) {
            throw new IllegalArgumentException("Privilege snapshot must not be null");
        }
        String normalized = requested == null
            ? BACKEND_AUTO
            : requested.trim().toLowerCase(Locale.ROOT);
        switch (normalized) {
            case BACKEND_AUTO:
                if (snapshot.shizukuOperational) {
                    return BACKEND_SHIZUKU;
                }
                if (snapshot.rootCandidate) {
                    return BACKEND_ROOT;
                }
                throw new IllegalStateException(
                    "Neither an operational AutoJs6 Shizuku bridge nor an allowed root backend is available"
                );
            case BACKEND_SHIZUKU:
                if (!snapshot.shizukuOperational) {
                    throw new IllegalStateException(
                        "AutoJs6 Shizuku is not running with permission"
                    );
                }
                return BACKEND_SHIZUKU;
            case BACKEND_ROOT:
                if (!snapshot.rootCandidate) {
                    throw new IllegalStateException(
                        "AutoJs6 root mode does not currently allow the root backend"
                    );
                }
                return BACKEND_ROOT;
            default:
                throw new IllegalArgumentException("Unknown privileged backend: " + requested);
        }
    }

    static CommandResult commandResult(String backend, Object hostResult)
        throws ReflectiveOperationException {
        if (hostResult == null) {
            throw new IllegalStateException("AutoJs6 returned no shell result");
        }
        Class<?> resultClass = hostResult.getClass();
        int code = resultClass.getField("code").getInt(hostResult);
        String output = stringField(resultClass.getField("result"), hostResult);
        String error = stringField(resultClass.getField("error"), hostResult);
        return new CommandResult(backend, code, output, error);
    }

    private static Object kotlinObject(ClassLoader loader, String className)
        throws ReflectiveOperationException {
        Class<?> type = Class.forName(className, false, loader);
        return type.getField("INSTANCE").get(null);
    }

    private static boolean invokeBoolean(
        Object receiver,
        String method,
        Class<?>[] parameterTypes,
        Object... arguments
    ) throws ReflectiveOperationException {
        Object result = receiver.getClass().getMethod(method, parameterTypes).invoke(receiver, arguments);
        return result instanceof Boolean && (Boolean) result;
    }

    private static String stringField(Field field, Object receiver) throws IllegalAccessException {
        Object value = field.get(receiver);
        return value == null ? "" : String.valueOf(value);
    }

    private static boolean rootBinaryPresent() {
        for (String path : ROOT_BINARY_CANDIDATES) {
            File candidate = new File(path);
            if (candidate.isFile() && candidate.canExecute()) {
                return true;
            }
        }
        return false;
    }

    private static String describe(Throwable error) {
        Throwable current = error;
        while (current instanceof InvocationTargetException &&
            ((InvocationTargetException) current).getCause() != null) {
            current = ((InvocationTargetException) current).getCause();
        }
        String message = current.getMessage();
        return current.getClass().getSimpleName() +
            (message == null || message.trim().isEmpty() ? "" : ": " + message.trim());
    }

    static final class Snapshot {

        final boolean rootBridgeAvailable;
        final boolean rootBinaryPresent;
        final boolean rootCandidate;
        final String rootMode;
        final String rootError;
        final boolean shizukuBridgeAvailable;
        final boolean shizukuInstalled;
        final boolean shizukuRunning;
        final boolean shizukuPermission;
        final boolean shizukuService;
        final boolean shizukuOperational;
        final String shizukuError;

        Snapshot(
            boolean rootBridgeAvailable,
            boolean rootBinaryPresent,
            boolean rootCandidate,
            String rootMode,
            String rootError,
            boolean shizukuBridgeAvailable,
            boolean shizukuInstalled,
            boolean shizukuRunning,
            boolean shizukuPermission,
            boolean shizukuService,
            boolean shizukuOperational,
            String shizukuError
        ) {
            this.rootBridgeAvailable = rootBridgeAvailable;
            this.rootBinaryPresent = rootBinaryPresent;
            this.rootCandidate = rootCandidate;
            this.rootMode = rootMode;
            this.rootError = rootError;
            this.shizukuBridgeAvailable = shizukuBridgeAvailable;
            this.shizukuInstalled = shizukuInstalled;
            this.shizukuRunning = shizukuRunning;
            this.shizukuPermission = shizukuPermission;
            this.shizukuService = shizukuService;
            this.shizukuOperational = shizukuOperational;
            this.shizukuError = shizukuError;
        }
    }

    static final class CommandResult {

        final String backend;
        final int code;
        final String output;
        final String error;

        CommandResult(String backend, int code, String output, String error) {
            this.backend = backend;
            this.code = code;
            this.output = output;
            this.error = error;
        }

        boolean isSuccess() {
            return code == 0;
        }

        void throwIfError() {
            if (!isSuccess()) {
                throw new IllegalStateException(
                    "AutoJs6 " + backend + " command exited with " + code +
                        (error.isEmpty() ? "" : ": " + error.trim())
                );
            }
        }
    }

}
