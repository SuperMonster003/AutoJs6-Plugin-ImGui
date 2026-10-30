package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.Context;
import android.graphics.PixelFormat;
import android.net.LocalServerSocket;
import android.net.LocalSocket;
import android.net.LocalSocketAddress;
import android.net.Uri;
import android.os.Binder;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.Process;
import android.os.RemoteException;
import android.view.Surface;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.SocketTimeoutException;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * Entry point for the P6 out-of-process renderer. It is launched with {@code app_process} by a
 * Shizuku/root controller, so every framework API is reached reflectively and the ordinary plugin
 * process never touches hidden SurfaceControl APIs.
 */
public final class ImGuiPrivilegedProcess {

    private static final int DEFAULT_LAYER = 2_000_000_000;
    private static final int MIN_DURATION_MILLIS = 250;
    private static final int MAX_DURATION_MILLIS = 60_000;
    private static final int MIN_SOCKET_TIMEOUT_MILLIS = 1000;
    private static final Pattern SOCKET_NAME_PATTERN = Pattern.compile("[A-Za-z0-9._-]{1,80}");
    private static final Pattern TOKEN_PATTERN = Pattern.compile("[0-9a-fA-F]{64}");
    private static final Pattern PACKAGE_NAME_PATTERN =
        Pattern.compile("[A-Za-z][A-Za-z0-9_]*(?:\\.[A-Za-z][A-Za-z0-9_]*)+");

    private ImGuiPrivilegedProcess() {
        throw new AssertionError("No instances");
    }

    public static void main(String[] args) {
        int exitCode;
        try {
            exitCode = run(args == null ? new String[0] : args);
        } catch (Throwable error) {
            System.err.println("ERROR " + describe(error));
            error.printStackTrace(System.err);
            exitCode = 2;
        }
        System.out.flush();
        System.err.flush();
        if (exitCode != 0) {
            System.exit(exitCode);
        }
    }

    private static int run(String[] args) throws Exception {
        if (args.length == 1 && "probe".equals(args[0])) {
            printProbe();
            return 0;
        }
        if (args.length == 5 && "smoke".equals(args[0])) {
            String nativeLibraryPath = args[1];
            int width = parseBoundedInt("width", args[2], 1, 16_384);
            int height = parseBoundedInt("height", args[3], 1, 16_384);
            int durationMillis = parseBoundedInt(
                "durationMillis",
                args[4],
                MIN_DURATION_MILLIS,
                MAX_DURATION_MILLIS
            );
            renderSmoke(nativeLibraryPath, width, height, durationMillis);
            return 0;
        }
        if (args.length == 7 && "serve".equals(args[0])) {
            String socketName = requireSocketName(args[1]);
            String token = requireToken(args[2]);
            String nativeLibraryPath = args[3];
            int width = parseBoundedInt("width", args[4], 1, 16_384);
            int height = parseBoundedInt("height", args[5], 1, 16_384);
            int timeoutMillis = parseBoundedInt(
                "timeoutMillis",
                args[6],
                MIN_SOCKET_TIMEOUT_MILLIS,
                MAX_DURATION_MILLIS
            );
            serve(socketName, token, nativeLibraryPath, width, height, timeoutMillis);
            return 0;
        }
        if (args.length == 5 && "client-smoke".equals(args[0])) {
            String socketName = requireSocketName(args[1]);
            String token = requireToken(args[2]);
            String text = args[3];
            int durationMillis = parseBoundedInt(
                "durationMillis",
                args[4],
                MIN_DURATION_MILLIS,
                MAX_DURATION_MILLIS
            );
            runClientSmoke(socketName, token, text, durationMillis);
            return 0;
        }
        if (args.length == 4 && "broker-child".equals(args[0])) {
            String token = requireToken(args[1]);
            String packageName = requirePackageName(args[2]);
            int userId = parseBoundedInt("userId", args[3], 0, 21_474);
            runBrokerChild(token, packageName, userId);
            return 0;
        }
        System.err.println(
            "Usage: ImGuiPrivilegedProcess probe | " +
                "smoke <native-lib> <width> <height> <duration-ms> | " +
                "serve <socket> <token> <native-lib> <width> <height> <timeout-ms> | " +
                "client-smoke <socket> <token> <text> <duration-ms> | " +
                "broker-child <token> <plugin-package> <user-id>"
        );
        return 64;
    }

    private static void printProbe() throws Exception {
        exemptHiddenApis();
        Class<?> surfaceControl = Class.forName("android.view.SurfaceControl");
        Class<?> surfaceSession = Class.forName("android.view.SurfaceSession");
        Class<?> builder = Class.forName("android.view.SurfaceControl$Builder");
        Class<?> transaction = Class.forName("android.view.SurfaceControl$Transaction");
        System.out.println("protocol=" + ImGuiPrivilegedProtocol.VERSION);
        System.out.println("sdk=" + Build.VERSION.SDK_INT);
        System.out.println("uid=" + Process.myUid());
        System.out.println("pid=" + Process.myPid());
        System.out.println("surfaceControl=" + surfaceControl.getName());
        System.out.println("surfaceSession=" + surfaceSession.getName());
        System.out.println("builder=" + builder.getName());
        System.out.println("transaction=" + transaction.getName());
        System.out.println("inputEventBytes=" + (
            ImGuiLinuxInput.isProcess64Bit()
                ? ImGuiLinuxInput.EVENT_BYTES_64
                : ImGuiLinuxInput.EVENT_BYTES_32
        ));
        try {
            ImGuiLinuxInput.DeviceSpec input = ImGuiLinuxInput.discover(1, 1, 0);
            ImGuiLinuxInput.verifyReadable(input);
            System.out.println("inputReadable=true");
            System.out.println("inputDevice=" + input.path);
            System.out.println("inputName=" + input.name.replace('\n', ' ').replace('\r', ' '));
            System.out.println("inputRange=" + input.minX + "," + input.maxX + "," +
                input.minY + "," + input.maxY);
            System.out.println("inputProtocol=" + (input.hasSlots ? "type-b" : "type-a"));
        } catch (IOException error) {
            System.out.println("inputReadable=false");
            System.out.println("inputError=" + describe(error).replace('\n', ' ').replace('\r', ' '));
        }
        System.out.println("READY probe");
    }

    private static void renderSmoke(
        String nativeLibraryPath,
        int width,
        int height,
        int durationMillis
    ) throws Exception {
        exemptHiddenApis();
        try (RendererSession renderer = new RendererSession(nativeLibraryPath, width, height)) {
            for (int frame = 0; frame < 3; frame++) {
                renderer.render("Direct root-process frame", 1.0F);
                if (frame < 2) {
                    Thread.sleep(16L);
                }
            }
            System.out.println(
                "READY smoke width=" + width + " height=" + height +
                    " uid=" + Process.myUid() + " pid=" + Process.myPid()
            );
            System.out.flush();
            Thread.sleep(durationMillis);
        }
    }

    private static void runBrokerChild(
        String token,
        String packageName,
        int userId
    ) throws Exception {
        exemptHiddenApis();
        if (Looper.myLooper() == null) {
            // app_process is not an Android application. A regular, quit-enabled Looper lets the
            // broker close the child cleanly; prepareMainLooper() creates a non-quittable queue and
            // turns an otherwise orderly shutdown into "Main thread not allowed to quit".
            Looper.prepare();
        }
        Context systemContext = createSystemContext();
        Handler handler = new Handler(Looper.myLooper());
        BrokerEndpoint endpoint = new BrokerEndpoint(handler);
        IBinder service = acquirePrivilegeBroker(systemContext, packageName, token, userId);
        IImGuiPrivilegeBroker broker = IImGuiPrivilegeBroker.Stub.asInterface(service);
        endpoint.setBroker(service);
        broker.registerEndpoint(token, endpoint);
        System.out.println(
            "READY broker-child uid=" + Process.myUid() +
                " pid=" + Process.myPid() +
                " provider=" + packageName + ".privilege_broker" +
                " user=" + userId
        );
        System.out.flush();
        Looper.loop();
        endpoint.close();
        System.out.println("STOPPED broker-child uid=" + Process.myUid() + " pid=" + Process.myPid());
    }

    private static IBinder acquirePrivilegeBroker(
        Context systemContext,
        String packageName,
        String token,
        int userId
    ) throws Exception {
        String authority = packageName + ".privilege_broker";
        Uri uri = Uri.parse("content://" + authority);
        try {
            if (userId != 0) {
                throw new IllegalStateException(
                    "The system Context belongs to user 0; use the external-provider API"
                );
            }
            Bundle result = systemContext.getContentResolver().call(
                uri,
                ImGuiPrivilegeBrokerProvider.METHOD_ACQUIRE,
                token,
                null
            );
            IBinder broker = result == null
                ? null
                : result.getBinder(ImGuiPrivilegeBrokerProvider.BINDER_KEY);
            if (broker != null && broker.pingBinder()) {
                return broker;
            }
        } catch (RuntimeException ignored) {
            // A raw app_process has no ActivityManager application record. Acquire the provider
            // through the external-provider API used by Android's own shell content command.
        }
        return acquirePrivilegeBrokerExternally(authority, token, userId);
    }

    private static IBinder acquirePrivilegeBrokerExternally(
        String authority,
        String token,
        int userId
    ) throws Exception {
        Class<?> activityManagerClass = Class.forName("android.app.ActivityManager");
        Method getService = activityManagerClass.getDeclaredMethod("getService");
        getService.setAccessible(true);
        Object activityManager = getService.invoke(null);
        IBinder externalToken = new Binder();
        Object holder = null;
        try {
            Method acquire = findMethod(activityManager.getClass(), "getContentProviderExternal");
            holder = acquire.invoke(
                activityManager,
                providerAcquireArguments(
                    acquire.getParameterTypes(),
                    authority,
                    externalToken,
                    userId
                )
            );
            if (holder == null) {
                throw new IllegalStateException(
                    "ActivityManager returned no external provider for " + authority
                );
            }
            Field providerField = findField(holder.getClass(), "provider");
            Object provider = providerField.get(holder);
            if (provider == null) {
                throw new IllegalStateException("External provider holder contains no Binder");
            }
            Method call = findProviderCall(provider.getClass());
            Object response = call.invoke(
                provider,
                providerCallArguments(call.getParameterTypes(), authority, token)
            );
            if (!(response instanceof Bundle)) {
                throw new IllegalStateException("Privilege provider returned no result Bundle");
            }
            IBinder broker = ((Bundle) response).getBinder(
                ImGuiPrivilegeBrokerProvider.BINDER_KEY
            );
            if (broker == null || !broker.pingBinder()) {
                throw new IllegalStateException("Privilege provider returned no live broker Binder");
            }
            return broker;
        } finally {
            releaseExternalProvider(activityManager, authority, externalToken, userId);
        }
    }

    private static Method findMethod(Class<?> type, String name) throws NoSuchMethodException {
        for (Method method : type.getMethods()) {
            if (name.equals(method.getName())) {
                method.setAccessible(true);
                return method;
            }
        }
        throw new NoSuchMethodException(type.getName() + "." + name);
    }

    private static Field findField(Class<?> type, String name) throws NoSuchFieldException {
        Class<?> current = type;
        while (current != null) {
            try {
                Field field = current.getDeclaredField(name);
                field.setAccessible(true);
                return field;
            } catch (NoSuchFieldException ignored) {
                current = current.getSuperclass();
            }
        }
        throw new NoSuchFieldException(type.getName() + "." + name);
    }

    private static Object[] providerAcquireArguments(
        Class<?>[] parameterTypes,
        String authority,
        IBinder externalToken,
        int userId
    ) {
        Object[] arguments = new Object[parameterTypes.length];
        boolean usedAuthority = false;
        boolean usedToken = false;
        for (int index = 0; index < parameterTypes.length; index++) {
            Class<?> parameter = parameterTypes[index];
            if (parameter == String.class) {
                arguments[index] = usedAuthority ? "AutoJs6-ImGui" : authority;
                usedAuthority = true;
            } else if (parameter == int.class || parameter == Integer.class) {
                arguments[index] = userId;
            } else if (IBinder.class.isAssignableFrom(parameter)) {
                arguments[index] = usedToken ? null : externalToken;
                usedToken = true;
            } else if (parameter == boolean.class || parameter == Boolean.class) {
                arguments[index] = false;
            } else if (parameter == long.class || parameter == Long.class) {
                arguments[index] = 0L;
            } else {
                arguments[index] = null;
            }
        }
        return arguments;
    }

    static Method findProviderCall(Class<?> providerClass) throws NoSuchMethodException {
        Method bestMatch = null;
        int bestScore = Integer.MIN_VALUE;
        for (Method method : providerClass.getMethods()) {
            Class<?>[] parameters = method.getParameterTypes();
            if ("call".equals(method.getName()) &&
                Bundle.class.isAssignableFrom(method.getReturnType()) &&
                parameters.length >= 4 &&
                Bundle.class.isAssignableFrom(parameters[parameters.length - 1])
            ) {
                int score = parameters.length;
                // Android 31+ retains a four-argument default compatibility method whose
                // implementation substitutes the literal authority "unknown". Prefer the
                // authoritative AttributionSource overload whenever it is present. On Android
                // 29/30, preferring the longer overload similarly preserves the real authority.
                if ("android.content.AttributionSource".equals(parameters[0].getName())) {
                    score += 100;
                }
                if (score > bestScore) {
                    bestMatch = method;
                    bestScore = score;
                }
            }
        }
        if (bestMatch != null) {
            bestMatch.setAccessible(true);
            return bestMatch;
        }
        throw new NoSuchMethodException(providerClass.getName() + ".call(...)");
    }

    private static Object[] providerCallArguments(
        Class<?>[] parameterTypes,
        String authority,
        String token
    ) throws Exception {
        Object[] arguments = new Object[parameterTypes.length];
        int stringCount = 0;
        boolean attributionSource = false;
        for (Class<?> parameter : parameterTypes) {
            if (parameter == String.class) {
                stringCount++;
            } else if ("android.content.AttributionSource".equals(parameter.getName())) {
                attributionSource = true;
            }
        }
        String callingPackage = Process.myUid() == Process.SHELL_UID
            ? "com.android.shell"
            : null;
        String[] stringArguments;
        if (attributionSource) {
            stringArguments = stringCount <= 3
                ? new String[] {
                    authority,
                    ImGuiPrivilegeBrokerProvider.METHOD_ACQUIRE,
                    token
                }
                : new String[] {
                    null,
                    authority,
                    ImGuiPrivilegeBrokerProvider.METHOD_ACQUIRE,
                    token
                };
        } else if (stringCount <= 3) {
            stringArguments = new String[] {
                callingPackage,
                ImGuiPrivilegeBrokerProvider.METHOD_ACQUIRE,
                token
            };
        } else if (stringCount == 4) {
            stringArguments = new String[] {
                callingPackage,
                authority,
                ImGuiPrivilegeBrokerProvider.METHOD_ACQUIRE,
                token
            };
        } else {
            stringArguments = new String[] {
                callingPackage,
                null,
                authority,
                ImGuiPrivilegeBrokerProvider.METHOD_ACQUIRE,
                token
            };
        }

        int stringIndex = 0;
        for (int index = 0; index < parameterTypes.length; index++) {
            Class<?> parameter = parameterTypes[index];
            if (parameter == String.class) {
                arguments[index] = stringIndex < stringArguments.length
                    ? stringArguments[stringIndex++]
                    : null;
            } else if (Bundle.class.isAssignableFrom(parameter)) {
                arguments[index] = null;
            } else if ("android.content.AttributionSource".equals(parameter.getName())) {
                arguments[index] = createAttributionSource(parameter, callingPackage);
            } else if (parameter == int.class || parameter == Integer.class) {
                arguments[index] = 0;
            } else if (parameter == boolean.class || parameter == Boolean.class) {
                arguments[index] = false;
            } else {
                arguments[index] = null;
            }
        }
        return arguments;
    }

    private static Object createAttributionSource(
        Class<?> attributionSourceClass,
        String packageName
    ) throws Exception {
        Class<?> builderClass = Class.forName("android.content.AttributionSource$Builder");
        Constructor<?> constructor = builderClass.getConstructor(int.class);
        Object builder = constructor.newInstance(Process.myUid());
        if (packageName != null) {
            builderClass.getMethod("setPackageName", String.class).invoke(builder, packageName);
        }
        return builderClass.getMethod("build").invoke(builder);
    }

    private static void releaseExternalProvider(
        Object activityManager,
        String authority,
        IBinder externalToken,
        int userId
    ) {
        for (Method method : activityManager.getClass().getMethods()) {
            if (!"removeContentProviderExternalAsUser".equals(method.getName()) &&
                !"removeContentProviderExternal".equals(method.getName())
            ) {
                continue;
            }
            try {
                method.setAccessible(true);
                method.invoke(
                    activityManager,
                    providerAcquireArguments(
                        method.getParameterTypes(),
                        authority,
                        externalToken,
                        userId
                    )
                );
                return;
            } catch (ReflectiveOperationException | RuntimeException ignored) {
                // Try the other API-level overload; process exit is the final external-token cleanup.
            }
        }
    }

    private static Context createSystemContext() throws Exception {
        Class<?> activityThreadClass = Class.forName("android.app.ActivityThread");
        Method systemMain = activityThreadClass.getDeclaredMethod("systemMain");
        systemMain.setAccessible(true);
        Object activityThread = systemMain.invoke(null);
        Method getSystemContext = activityThreadClass.getDeclaredMethod("getSystemContext");
        getSystemContext.setAccessible(true);
        Object context = getSystemContext.invoke(activityThread);
        if (!(context instanceof Context)) {
            throw new IllegalStateException("ActivityThread did not provide a system Context");
        }
        return (Context) context;
    }

    private static void serve(
        String socketName,
        String expectedToken,
        String nativeLibraryPath,
        int width,
        int height,
        int timeoutMillis
    ) throws Exception {
        exemptHiddenApis();
        try (LocalServerSocket server = new LocalServerSocket(socketName)) {
            System.out.println(
                "READY server socket=" + socketName + " protocol=" + ImGuiPrivilegedProtocol.VERSION +
                    " uid=" + Process.myUid() + " pid=" + Process.myPid()
            );
            System.out.flush();
            try (LocalSocket client = server.accept()) {
                client.setSoTimeout(timeoutMillis);
                InputStream input = client.getInputStream();
                OutputStream output = client.getOutputStream();
                ImGuiPrivilegedProtocol.Frame hello = ImGuiPrivilegedProtocol.read(input);
                if (hello == null || hello.type != ImGuiPrivilegedProtocol.TYPE_HELLO) {
                    throw new SecurityException("First privileged protocol frame must be HELLO");
                }
                byte[] providedToken = hello.payload;
                byte[] requiredToken = ImGuiPrivilegedProtocol.utf8(expectedToken);
                if (!MessageDigest.isEqual(requiredToken, providedToken)) {
                    ImGuiPrivilegedProtocol.write(
                        output,
                        ImGuiPrivilegedProtocol.TYPE_ERROR,
                        hello.requestId,
                        ImGuiPrivilegedProtocol.utf8("authentication failed")
                    );
                    throw new SecurityException("Privileged protocol authentication failed");
                }
                ImGuiPrivilegedProtocol.write(
                    output,
                    ImGuiPrivilegedProtocol.TYPE_HELLO_ACK,
                    hello.requestId,
                    ImGuiPrivilegedProtocol.utf8(
                        "protocol=" + ImGuiPrivilegedProtocol.VERSION +
                            ";sdk=" + Build.VERSION.SDK_INT +
                            ";uid=" + Process.myUid()
                    )
                );

                RendererSession renderer = null;
                try {
                    boolean running = true;
                    while (running) {
                        ImGuiPrivilegedProtocol.Frame request;
                        try {
                            request = ImGuiPrivilegedProtocol.read(input);
                        } catch (SocketTimeoutException timeout) {
                            System.err.println("WARN privileged client idle timeout");
                            break;
                        }
                        if (request == null) {
                            break;
                        }
                        switch (request.type) {
                            case ImGuiPrivilegedProtocol.TYPE_PING:
                                ImGuiPrivilegedProtocol.write(
                                    output,
                                    ImGuiPrivilegedProtocol.TYPE_PONG,
                                    request.requestId,
                                    request.payload
                                );
                                break;
                            case ImGuiPrivilegedProtocol.TYPE_RENDER_FRAME:
                                ImGuiPrivilegedProtocol.RenderFrame frame =
                                    ImGuiPrivilegedProtocol.decodeRenderFrame(request.payload);
                                if (renderer == null) {
                                    renderer = new RendererSession(nativeLibraryPath, width, height);
                                }
                                renderer.render(frame.text, frame.progress);
                                ImGuiPrivilegedProtocol.write(
                                    output,
                                    ImGuiPrivilegedProtocol.TYPE_RENDER_ACK,
                                    request.requestId,
                                    ImGuiPrivilegedProtocol.utf8("rendered")
                                );
                                break;
                            case ImGuiPrivilegedProtocol.TYPE_SHUTDOWN:
                                ImGuiPrivilegedProtocol.write(
                                    output,
                                    ImGuiPrivilegedProtocol.TYPE_SHUTDOWN_ACK,
                                    request.requestId,
                                    new byte[0]
                                );
                                running = false;
                                break;
                            default:
                                ImGuiPrivilegedProtocol.write(
                                    output,
                                    ImGuiPrivilegedProtocol.TYPE_ERROR,
                                    request.requestId,
                                    ImGuiPrivilegedProtocol.utf8(
                                        "unsupported message type " + request.type
                                    )
                                );
                                break;
                        }
                    }
                } finally {
                    if (renderer != null) {
                        renderer.close();
                    }
                }
            }
        }
        System.out.println("STOPPED server");
    }

    private static void runClientSmoke(
        String socketName,
        String token,
        String text,
        int durationMillis
    ) throws Exception {
        LocalSocket client = new LocalSocket();
        try {
            client.connect(
                new LocalSocketAddress(socketName, LocalSocketAddress.Namespace.ABSTRACT)
            );
            client.setSoTimeout(5000);
            InputStream input = client.getInputStream();
            OutputStream output = client.getOutputStream();
            int requestId = 1;
            ImGuiPrivilegedProtocol.write(
                output,
                ImGuiPrivilegedProtocol.TYPE_HELLO,
                requestId,
                ImGuiPrivilegedProtocol.utf8(token)
            );
            expect(input, ImGuiPrivilegedProtocol.TYPE_HELLO_ACK, requestId);

            requestId++;
            ImGuiPrivilegedProtocol.write(
                output,
                ImGuiPrivilegedProtocol.TYPE_RENDER_FRAME,
                requestId,
                ImGuiPrivilegedProtocol.encodeRenderFrame(1.0F, text)
            );
            expect(input, ImGuiPrivilegedProtocol.TYPE_RENDER_ACK, requestId);
            System.out.println("READY client frame=" + requestId + " socket=" + socketName);
            System.out.flush();
            long renderDeadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(durationMillis);
            while (System.nanoTime() < renderDeadline) {
                Thread.sleep(50L);
                requestId++;
                ImGuiPrivilegedProtocol.write(
                    output,
                    ImGuiPrivilegedProtocol.TYPE_RENDER_FRAME,
                    requestId,
                    ImGuiPrivilegedProtocol.encodeRenderFrame(1.0F, text)
                );
                expect(input, ImGuiPrivilegedProtocol.TYPE_RENDER_ACK, requestId);
            }

            requestId++;
            byte[] ping = ImGuiPrivilegedProtocol.utf8("p6-ping");
            ImGuiPrivilegedProtocol.write(
                output,
                ImGuiPrivilegedProtocol.TYPE_PING,
                requestId,
                ping
            );
            ImGuiPrivilegedProtocol.Frame pong = expect(
                input,
                ImGuiPrivilegedProtocol.TYPE_PONG,
                requestId
            );
            if (!MessageDigest.isEqual(ping, pong.payload)) {
                throw new IOException("PONG payload did not match PING payload");
            }

            requestId++;
            ImGuiPrivilegedProtocol.write(
                output,
                ImGuiPrivilegedProtocol.TYPE_SHUTDOWN,
                requestId,
                new byte[0]
            );
            expect(input, ImGuiPrivilegedProtocol.TYPE_SHUTDOWN_ACK, requestId);
            System.out.println("PASS client authenticated/rendered/pinged/shutdown");
        } finally {
            client.close();
        }
    }

    private static ImGuiPrivilegedProtocol.Frame expect(
        InputStream input,
        int expectedType,
        int expectedRequestId
    ) throws IOException {
        ImGuiPrivilegedProtocol.Frame response = ImGuiPrivilegedProtocol.read(input);
        if (response == null) {
            throw new IOException("Privileged server closed before replying");
        }
        if (response.type == ImGuiPrivilegedProtocol.TYPE_ERROR) {
            throw new IOException("Privileged server error: " + ImGuiPrivilegedProtocol.utf8(response.payload));
        }
        if (response.type != expectedType || response.requestId != expectedRequestId) {
            throw new IOException(
                "Unexpected privileged response type/request " + response.type + "/" +
                    response.requestId + ", expected " + expectedType + "/" + expectedRequestId
            );
        }
        return response;
    }

    private static String requireSocketName(String value) {
        if (value == null || !SOCKET_NAME_PATTERN.matcher(value).matches()) {
            throw new IllegalArgumentException(
                "Socket name must contain 1-80 ASCII letters, digits, dots, underscores, or hyphens"
            );
        }
        return value;
    }

    private static String requireToken(String value) {
        if (value == null || !TOKEN_PATTERN.matcher(value).matches()) {
            throw new IllegalArgumentException("Authentication token must be exactly 64 hexadecimal digits");
        }
        return value;
    }

    private static String requirePackageName(String value) {
        if (value == null || !PACKAGE_NAME_PATTERN.matcher(value).matches()) {
            throw new IllegalArgumentException("Plugin package name is malformed");
        }
        return value;
    }

    private static int parseBoundedInt(String name, String value, int minimum, int maximum) {
        final int parsed;
        try {
            parsed = Integer.parseInt(value);
        } catch (NumberFormatException error) {
            throw new IllegalArgumentException(name + " must be an integer", error);
        }
        if (parsed < minimum || parsed > maximum) {
            throw new IllegalArgumentException(
                name + " must be between " + minimum + " and " + maximum
            );
        }
        return parsed;
    }

    static void exemptHiddenApis() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            return;
        }
        try {
            Class<?> runtimeClass = Class.forName("dalvik.system.VMRuntime");
            Method getRuntime = runtimeClass.getDeclaredMethod("getRuntime");
            Method setHiddenApiExemptions = runtimeClass.getDeclaredMethod(
                "setHiddenApiExemptions",
                String[].class
            );
            getRuntime.setAccessible(true);
            setHiddenApiExemptions.setAccessible(true);
            Object vmRuntime = getRuntime.invoke(null);
            setHiddenApiExemptions.invoke(
                vmRuntime,
                (Object) new String[] {
                    "Landroid/app/",
                    "Landroid/content/",
                    "Landroid/view/"
                }
            );
        } catch (ReflectiveOperationException ignored) {
            // Shizuku user services and root app_process instances are normally exempt already. The
            // concrete SurfaceControl call below remains the authoritative capability check.
        }
    }

    private static String describe(Throwable error) {
        Throwable cause = error;
        while (cause instanceof InvocationTargetException && cause.getCause() != null) {
            cause = cause.getCause();
        }
        String message = cause.getMessage();
        return cause.getClass().getName() + (message == null ? "" : ": " + message);
    }

    static class BrokerEndpoint extends IImGuiPrivilegedEndpoint.Stub {

        private final Object lock = new Object();
        private final Handler handler;
        private SurfaceLayer layer;
        private ImGuiLinuxInput.DirectReader inputReader;
        private IImGuiInputCallback inputCallback;
        private IBinder.DeathRecipient inputDeathRecipient;
        private IBinder broker;
        private IBinder.DeathRecipient brokerDeathRecipient;
        private Runnable onClosed;
        private String inputStatus = "not-started";
        private boolean inputEnabled = true;
        private boolean closed;

        BrokerEndpoint(Handler handler) {
            this.handler = handler;
        }

        void setBroker(IBinder broker) throws RemoteException {
            synchronized (lock) {
                if (closed) {
                    throw new IllegalStateException("Privileged endpoint is already closed");
                }
                this.broker = broker;
                brokerDeathRecipient = this::close;
                broker.linkToDeath(brokerDeathRecipient, 0);
            }
        }

        void setOnClosed(Runnable onClosed) {
            synchronized (lock) {
                this.onClosed = onClosed;
            }
        }

        @Override
        public Surface createSurface(
            int width,
            int height,
            int rotation,
            IImGuiInputCallback callback
        ) {
            if (width < 1 || width > 16_384 || height < 1 || height > 16_384) {
                throw new IllegalArgumentException("Surface dimensions must be between 1 and 16384");
            }
            if (rotation != 0 && rotation != 90 && rotation != 180 && rotation != 270) {
                throw new IllegalArgumentException("Rotation must be 0, 90, 180, or 270 degrees");
            }
            synchronized (lock) {
                if (closed) {
                    throw new IllegalStateException("Privileged endpoint is closed");
                }
                closeResourcesLocked();
                try {
                    layer = SurfaceLayer.create(width, height);
                    inputCallback = callback;
                    if (callback != null) {
                        inputDeathRecipient = this::close;
                        callback.asBinder().linkToDeath(inputDeathRecipient, 0);
                    }
                    startDirectInputLocked(width, height, rotation);
                    return layer.surface;
                } catch (Exception error) {
                    closeResourcesLocked();
                    throw new IllegalStateException(
                        "Unable to create the privileged Surface: " + describe(error),
                        error
                    );
                }
            }
        }

        @Override
        public void setInputEnabled(boolean enabled) {
            synchronized (lock) {
                if (closed) {
                    throw new IllegalStateException("Privileged endpoint is closed");
                }
                inputEnabled = enabled;
            }
        }

        @Override
        public String info() {
            synchronized (lock) {
                return "uid=" + Process.myUid() +
                    ";pid=" + Process.myPid() +
                    ";surface=" + (layer != null) +
                    ";inputEnabled=" + inputEnabled +
                    ";input=" + inputStatus;
            }
        }

        @Override
        public void close() {
            Runnable cleanup;
            synchronized (lock) {
                if (closed) {
                    return;
                }
                closed = true;
                closeResourcesLocked();
                if (broker != null && brokerDeathRecipient != null) {
                    broker.unlinkToDeath(brokerDeathRecipient, 0);
                }
                broker = null;
                brokerDeathRecipient = null;
                cleanup = onClosed;
                onClosed = null;
            }
            handler.post(() -> {
                if (cleanup != null) {
                    cleanup.run();
                }
                handler.getLooper().quitSafely();
            });
        }

        private void startDirectInputLocked(int width, int height, int rotation) {
            try {
                ImGuiLinuxInput.DeviceSpec input = ImGuiLinuxInput.discover(width, height, rotation);
                inputStatus = input.path + "/" + (input.hasSlots ? "type-b" : "type-a");
                inputReader = ImGuiLinuxInput.open(input, new ImGuiLinuxInput.Listener() {
                    @Override
                    public void onTouch(ImGuiLinuxInput.TouchSample sample) {
                        IImGuiInputCallback callback;
                        synchronized (lock) {
                            callback = inputEnabled ? inputCallback : null;
                        }
                        if (callback == null) {
                            return;
                        }
                        try {
                            callback.onTouch(sample.action, sample.x, sample.y, sample.trackingId);
                        } catch (RemoteException error) {
                            close();
                        }
                    }

                    @Override
                    public void onError(IOException error) {
                        IImGuiInputCallback callback;
                        synchronized (lock) {
                            inputStatus = "error:" + describe(error);
                            callback = inputCallback;
                        }
                        if (callback != null) {
                            try {
                                callback.onError(describe(error));
                            } catch (RemoteException ignored) {
                                close();
                            }
                        }
                    }
                });
            } catch (IOException | RuntimeException error) {
                inputStatus = "unavailable:" + describe(error);
                if (inputCallback != null) {
                    try {
                        inputCallback.onError(describe(error));
                    } catch (RemoteException ignored) {
                        close();
                    }
                }
            }
        }

        private void closeResourcesLocked() {
            if (inputReader != null) {
                try {
                    inputReader.close();
                } catch (IOException ignored) {
                    // Reader shutdown is best effort; the process exits immediately after close.
                }
                inputReader = null;
            }
            if (inputCallback != null && inputDeathRecipient != null) {
                inputCallback.asBinder().unlinkToDeath(inputDeathRecipient, 0);
            }
            inputCallback = null;
            inputDeathRecipient = null;
            if (layer != null) {
                layer.close();
                layer = null;
            }
        }
    }

    private static final class RendererSession implements AutoCloseable {

        private final SurfaceLayer layer;
        private final int width;
        private final ImGuiInputQueue inputQueue = new ImGuiInputQueue();
        private final ImGuiInputQueue.Sink inputSink = new ImGuiInputQueue.Sink() {
            @Override
            public void touch(int action, float x, float y, int mouseButton) {
                ImGuiNative.nativeTouchEvent(action, x, y, mouseButton);
                lastTouch = actionName(action) + " x=" + Math.round(x) + " y=" + Math.round(y);
            }

            @Override
            public void characters(String text) {
                // Direct evdev input currently supplies pointer events only.
            }

            @Override
            public void key(int key, boolean down) {
                // Direct evdev input currently supplies pointer events only.
            }

            @Override
            public void wheel(float wheelX, float wheelY) {
                // Direct evdev input currently supplies pointer events only.
            }

            @Override
            public void mousePos(float x, float y) {
                // Direct evdev input currently supplies pointer events only.
            }

            @Override
            public void mouseButton(int button, boolean down) {
                // Direct evdev input currently supplies pointer events only.
            }
        };
        private ImGuiLinuxInput.DirectReader inputReader;
        private volatile String inputStatus = "unavailable";
        private String lastTouch = "none";
        private boolean closed;

        RendererSession(String nativeLibraryPath, int width, int height) throws Exception {
            this.width = width;
            layer = SurfaceLayer.create(width, height);
            boolean initialized = false;
            try {
                ImGuiNative.loadAbsolute(nativeLibraryPath);
                initialized = ImGuiNative.nativeInit(
                    null,
                    layer.surface,
                    2.0F,
                    null,
                    18.0F,
                    null,
                    new String[0],
                    new float[0],
                    false
                );
                if (!initialized) {
                    throw new IllegalStateException("Dear ImGui renderer initialization failed");
                }
                startDirectInput(width, height);
            } finally {
                if (!initialized) {
                    layer.close();
                }
            }
        }

        void render(String frameText, float progress) {
            if (closed) {
                throw new IllegalStateException("Privileged renderer is closed");
            }
            inputQueue.drainTo(inputSink);
            if (!ImGuiNative.nativeNewFrame()) {
                throw new IllegalStateException("Unable to start privileged ImGui frame");
            }
            ImGuiNative.nativeSetNextWindowPos(36.0F, 96.0F, 1, 0.0F, 0.0F);
            ImGuiNative.nativeSetNextWindowSize(
                Math.max(240.0F, width - 72.0F),
                395.0F,
                1
            );
            boolean visible = ImGuiNative.nativeBegin("AutoJs6 privileged backend", null, 0);
            if (visible) {
                ImGuiNative.nativeText("SurfaceFlinger layer created by an independent process");
                ImGuiNative.nativeSeparator();
                ImGuiNative.nativeText(
                    "Dear ImGui " + ImGuiNative.nativeVersion() +
                        " | Android API " + Build.VERSION.SDK_INT
                );
                ImGuiNative.nativeText("uid=" + Process.myUid() + " pid=" + Process.myPid());
                ImGuiNative.nativeSpacing();
                ImGuiNative.nativeTextWrapped("Frame payload: " + String.valueOf(frameText));
                ImGuiNative.nativeText("Direct input: " + inputStatus);
                ImGuiNative.nativeText("Last touch: " + lastTouch);
                float safeProgress = Float.isFinite(progress)
                    ? Math.max(0.0F, Math.min(1.0F, progress))
                    : 0.0F;
                ImGuiNative.nativeProgressBar(
                    safeProgress,
                    -1.0F,
                    24.0F,
                    "P6 socket frame: PASS"
                );
                ImGuiNative.nativeButton("Independent EGL / OpenGL ES 3", -1.0F, 48.0F);
            }
            ImGuiNative.nativeEnd();
            if (!ImGuiNative.nativeRender()) {
                throw new IllegalStateException("Unable to submit privileged ImGui frame");
            }
        }

        private void startDirectInput(int displayWidth, int displayHeight) {
            try {
                ImGuiLinuxInput.DeviceSpec input = ImGuiLinuxInput.discover(
                    displayWidth,
                    displayHeight,
                    0
                );
                inputReader = ImGuiLinuxInput.open(input, new ImGuiLinuxInput.Listener() {
                    @Override
                    public void onTouch(ImGuiLinuxInput.TouchSample sample) {
                        inputQueue.offerTouch(sample.action, sample.x, sample.y, 0);
                    }

                    @Override
                    public void onError(IOException error) {
                        inputStatus = "error: " + describe(error);
                    }
                });
                inputStatus = input.path + " " + (input.hasSlots ? "type-b" : "type-a");
                System.out.println("READY input " + inputStatus);
                System.out.flush();
            } catch (IOException error) {
                inputStatus = "unavailable: " + describe(error);
                System.err.println("WARN direct input unavailable: " + describe(error));
            }
        }

        private static String actionName(int action) {
            switch (action) {
                case ImGuiLinuxInput.ACTION_DOWN:
                    return "down";
                case ImGuiLinuxInput.ACTION_UP:
                    return "up";
                case ImGuiLinuxInput.ACTION_MOVE:
                    return "move";
                default:
                    return "action-" + action;
            }
        }

        @Override
        public void close() {
            if (closed) {
                return;
            }
            closed = true;
            try {
                if (inputReader != null) {
                    try {
                        inputReader.close();
                    } catch (IOException error) {
                        System.err.println("WARN direct input close failed: " + describe(error));
                    }
                    inputReader = null;
                }
                ImGuiNative.nativeShutdown();
            } finally {
                layer.close();
            }
        }
    }

    private static final class SurfaceLayer implements AutoCloseable {

        private final Class<?> surfaceControlClass;
        private final Object surfaceControl;
        private final Surface surface;

        private SurfaceLayer(
            Class<?> surfaceControlClass,
            Object surfaceControl,
            Surface surface
        ) {
            this.surfaceControlClass = surfaceControlClass;
            this.surfaceControl = surfaceControl;
            this.surface = surface;
        }

        static SurfaceLayer create(int width, int height) throws Exception {
            Class<?> surfaceSessionClass = Class.forName("android.view.SurfaceSession");
            Class<?> surfaceControlClass = Class.forName("android.view.SurfaceControl");
            Class<?> builderClass = Class.forName("android.view.SurfaceControl$Builder");
            Class<?> transactionClass = Class.forName("android.view.SurfaceControl$Transaction");

            Constructor<?> sessionConstructor = surfaceSessionClass.getDeclaredConstructor();
            sessionConstructor.setAccessible(true);
            Object session = sessionConstructor.newInstance();

            Object builder;
            try {
                Constructor<?> builderConstructor = builderClass.getDeclaredConstructor(
                    surfaceSessionClass
                );
                builderConstructor.setAccessible(true);
                builder = builderConstructor.newInstance(session);
            } catch (NoSuchMethodException ignored) {
                Constructor<?> builderConstructor = builderClass.getDeclaredConstructor();
                builderConstructor.setAccessible(true);
                builder = builderConstructor.newInstance();
            }
            invoke(builderClass, builder, "setName", new Class<?>[] {String.class},
                "AutoJs6-ImGui-Privileged");
            try {
                invoke(
                    builderClass,
                    builder,
                    "setBufferSize",
                    new Class<?>[] {int.class, int.class},
                    width,
                    height
                );
            } catch (NoSuchMethodException ignored) {
                invoke(
                    builderClass,
                    builder,
                    "setSize",
                    new Class<?>[] {int.class, int.class},
                    width,
                    height
                );
            }
            invoke(
                builderClass,
                builder,
                "setFormat",
                new Class<?>[] {int.class},
                PixelFormat.RGBA_8888
            );
            Object surfaceControl = invoke(
                builderClass,
                builder,
                "build",
                new Class<?>[0]
            );

            Constructor<?> transactionConstructor = transactionClass.getDeclaredConstructor();
            transactionConstructor.setAccessible(true);
            Object transaction = transactionConstructor.newInstance();
            try {
                invoke(
                    transactionClass,
                    transaction,
                    "setLayerStack",
                    new Class<?>[] {surfaceControlClass, int.class},
                    surfaceControl,
                    0
                );
                invoke(
                    transactionClass,
                    transaction,
                    "setLayer",
                    new Class<?>[] {surfaceControlClass, int.class},
                    surfaceControl,
                    DEFAULT_LAYER
                );
                invoke(
                    transactionClass,
                    transaction,
                    "setPosition",
                    new Class<?>[] {surfaceControlClass, float.class, float.class},
                    surfaceControl,
                    0.0F,
                    0.0F
                );
                invoke(
                    transactionClass,
                    transaction,
                    "show",
                    new Class<?>[] {surfaceControlClass},
                    surfaceControl
                );
                invoke(transactionClass, transaction, "apply", new Class<?>[0]);
            } finally {
                closeReflectively(transactionClass, transaction);
            }

            Surface surface = null;
            try {
                try {
                    Constructor<?> surfaceConstructor = Surface.class.getDeclaredConstructor(
                        surfaceControlClass
                    );
                    surfaceConstructor.setAccessible(true);
                    surface = (Surface) surfaceConstructor.newInstance(surfaceControl);
                } catch (NoSuchMethodException ignored) {
                    Constructor<?> surfaceConstructor = Surface.class.getDeclaredConstructor();
                    surfaceConstructor.setAccessible(true);
                    surface = (Surface) surfaceConstructor.newInstance();
                    invoke(
                        Surface.class,
                        surface,
                        "copyFrom",
                        new Class<?>[] {surfaceControlClass},
                        surfaceControl
                    );
                }
                return new SurfaceLayer(surfaceControlClass, surfaceControl, surface);
            } catch (Exception error) {
                if (surface != null) {
                    surface.release();
                }
                releaseSurfaceControl(surfaceControlClass, surfaceControl);
                throw error;
            }
        }

        @Override
        public void close() {
            surface.release();
            releaseSurfaceControl(surfaceControlClass, surfaceControl);
        }

        private static Object invoke(
            Class<?> owner,
            Object receiver,
            String name,
            Class<?>[] parameterTypes,
            Object... arguments
        ) throws Exception {
            Method method = owner.getDeclaredMethod(name, parameterTypes);
            method.setAccessible(true);
            return method.invoke(receiver, arguments);
        }

        private static void closeReflectively(Class<?> owner, Object receiver) {
            try {
                invoke(owner, receiver, "close", new Class<?>[0]);
            } catch (Exception ignored) {
                // Older releases may not expose Transaction.close(). The transaction is still
                // finalized by its framework wrapper after apply().
            }
        }

        private static void releaseSurfaceControl(Class<?> owner, Object receiver) {
            try {
                invoke(owner, receiver, "release", new Class<?>[0]);
            } catch (Exception error) {
                System.err.println(
                    String.format(Locale.ROOT, "WARN SurfaceControl release failed: %s", describe(error))
                );
            }
        }
    }
}
