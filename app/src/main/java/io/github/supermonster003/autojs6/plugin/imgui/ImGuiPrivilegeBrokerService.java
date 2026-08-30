package io.github.supermonster003.autojs6.plugin.imgui;

import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Binder;
import android.os.IBinder;
import android.os.Process;
import android.os.RemoteException;
import android.os.SystemClock;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Pattern;

/**
 * Small capability broker between the AutoJs6 process and an explicitly launched root/Shizuku
 * {@code app_process}. The host binds the service normally; UID 0/2000 obtains the same Binder
 * through {@link ImGuiPrivilegeBrokerProvider}. Every operation is gated by both caller identity
 * and a per-session 256-bit token.
 */
public final class ImGuiPrivilegeBrokerService extends Service {

    static final int PROTOCOL_VERSION = 2;
    static final String TRANSPORT = "authenticated-binder-surface";

    private static final String HOST_PERMISSION = "org.autojs.permission.PLUGIN";
    private static final Pattern TOKEN_PATTERN = Pattern.compile("[0-9a-fA-F]{64}");
    private static final long MAX_AWAIT_MILLIS = 15_000L;

    private static final Object LOCK = new Object();
    private static String activeToken;
    private static int ownerUid = -1;
    private static IImGuiPrivilegedEndpoint endpoint;
    private static IBinder.DeathRecipient endpointDeathRecipient;
    private static volatile ImGuiPrivilegeBrokerService instance;

    private static final IImGuiPrivilegeBroker.Stub BINDER = new IImGuiPrivilegeBroker.Stub() {
        @Override
        public void prepare(String token) {
            enforceHostCallerStatic();
            validateToken(token);
            IImGuiPrivilegedEndpoint previous;
            synchronized (LOCK) {
                previous = detachEndpointLocked();
                activeToken = token;
                ownerUid = Binder.getCallingUid();
                LOCK.notifyAll();
            }
            closeQuietly(previous);
        }

        @Override
        public void registerEndpoint(String token, IImGuiPrivilegedEndpoint candidate) {
            enforcePrivilegedCaller();
            if (candidate == null || !candidate.asBinder().pingBinder()) {
                throw new IllegalArgumentException("Privileged endpoint binder is unavailable");
            }
            IImGuiPrivilegedEndpoint previous;
            synchronized (LOCK) {
                enforceTokenLocked(token);
                if (endpoint != null && endpoint.asBinder().pingBinder()) {
                    throw new IllegalStateException(
                        "A privileged endpoint is already registered for this session"
                    );
                }
                previous = detachEndpointLocked();
                endpoint = candidate;
                endpointDeathRecipient = () -> {
                    synchronized (LOCK) {
                        if (endpoint != null && endpoint.asBinder() == candidate.asBinder()) {
                            detachEndpointLocked();
                            LOCK.notifyAll();
                        }
                    }
                };
                try {
                    candidate.asBinder().linkToDeath(endpointDeathRecipient, 0);
                } catch (RemoteException error) {
                    endpoint = null;
                    endpointDeathRecipient = null;
                    throw new IllegalStateException("Privileged endpoint died during registration", error);
                }
                LOCK.notifyAll();
            }
            closeQuietly(previous);
        }

        @Override
        public IImGuiPrivilegedEndpoint awaitEndpoint(String token, long timeoutMillis) {
            enforceOwnerCaller();
            long boundedTimeout = Math.max(1L, Math.min(MAX_AWAIT_MILLIS, timeoutMillis));
            long deadline = SystemClock.elapsedRealtime() + boundedTimeout;
            synchronized (LOCK) {
                enforceTokenLocked(token);
                while (endpoint == null || !endpoint.asBinder().pingBinder()) {
                    long remaining = deadline - SystemClock.elapsedRealtime();
                    if (remaining <= 0L) {
                        return null;
                    }
                    try {
                        LOCK.wait(remaining);
                    } catch (InterruptedException error) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException(
                            "Interrupted while waiting for the privileged endpoint",
                            error
                        );
                    }
                    enforceTokenLocked(token);
                }
                return endpoint;
            }
        }

        @Override
        public String status(String token) {
            enforceOwnerCaller();
            synchronized (LOCK) {
                enforceTokenLocked(token);
                boolean connected = endpoint != null && endpoint.asBinder().pingBinder();
                return "ownerUid=" + ownerUid + ";endpoint=" + connected;
            }
        }

        @Override
        public void clear(String token) {
            enforceOwnerCaller();
            IImGuiPrivilegedEndpoint previous;
            synchronized (LOCK) {
                enforceTokenLocked(token);
                previous = detachEndpointLocked();
                activeToken = null;
                ownerUid = -1;
                LOCK.notifyAll();
            }
            closeQuietly(previous);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return BINDER;
    }

    @Override
    public void onDestroy() {
        IImGuiPrivilegedEndpoint previous;
        synchronized (LOCK) {
            previous = detachEndpointLocked();
            activeToken = null;
            ownerUid = -1;
            LOCK.notifyAll();
        }
        closeQuietly(previous);
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }

    static IBinder acquirePreparedBroker(String token) {
        synchronized (LOCK) {
            enforceTokenLocked(token);
            return BINDER;
        }
    }

    private static void enforceHostCallerStatic() {
        int callerUid = Binder.getCallingUid();
        if (callerUid == Process.myUid()) {
            return;
        }
        ImGuiPrivilegeBrokerService service = instance;
        if (service == null || service.checkPermission(HOST_PERMISSION, -1, callerUid) !=
            PackageManager.PERMISSION_GRANTED) {
            throw new SecurityException(
                "Caller UID " + callerUid + " does not hold the AutoJs6 plugin permission"
            );
        }
    }

    private static void enforceOwnerCaller() {
        int callerUid = Binder.getCallingUid();
        synchronized (LOCK) {
            if (ownerUid < 0 || callerUid != ownerUid) {
                throw new SecurityException("Caller does not own the privileged ImGui session");
            }
        }
    }

    private static void enforcePrivilegedCaller() {
        int callerUid = Binder.getCallingUid();
        if (callerUid != 0 && callerUid != Process.SHELL_UID) {
            throw new SecurityException(
                "Privileged endpoint must register as root or shell; uid=" + callerUid
            );
        }
    }

    private static void enforceTokenLocked(String token) {
        validateToken(token);
        if (activeToken == null || !MessageDigest.isEqual(
            activeToken.getBytes(StandardCharsets.US_ASCII),
            token.getBytes(StandardCharsets.US_ASCII)
        )) {
            throw new SecurityException("Privileged ImGui session token mismatch");
        }
    }

    private static IImGuiPrivilegedEndpoint detachEndpointLocked() {
        IImGuiPrivilegedEndpoint previous = endpoint;
        if (previous != null && endpointDeathRecipient != null) {
            previous.asBinder().unlinkToDeath(endpointDeathRecipient, 0);
        }
        endpoint = null;
        endpointDeathRecipient = null;
        return previous;
    }

    private static void validateToken(String token) {
        if (token == null || !TOKEN_PATTERN.matcher(token).matches()) {
            throw new IllegalArgumentException("Session token must contain exactly 256 bits of hex");
        }
    }

    private static void closeQuietly(IImGuiPrivilegedEndpoint candidate) {
        if (candidate == null) {
            return;
        }
        try {
            candidate.close();
        } catch (RemoteException ignored) {
            // The endpoint is already dead, which is equivalent to a successful cleanup request.
        }
    }
}
