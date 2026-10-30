package io.github.supermonster003.autojs6.plugin.imgui;

import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.PowerManager;
import android.os.SystemClock;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.LongSupplier;

/**
 * Input and screen activity for the power-saving frame loop (R2.2). Every input path of the connection (touch, IME
 * characters and keys, wheel) notes the time of the input; the script reads how long the session has been idle and,
 * once it renders at the idle rate, arms a one-shot wake that runs the listener on the next input. Screen off and a
 * locked keyguard also run the listener, so the script pauses its frame loop without polling at the full rate.
 * The listener runs on whichever thread delivered the input or the broadcast.
 */
final class ImGuiActivityMonitor {

    private final LongSupplier clock;
    private final AtomicBoolean wakeArmed = new AtomicBoolean();
    private volatile long lastActivityMillis;
    private volatile Runnable listener;
    private volatile boolean screenActive = true;
    private long token;
    private Context receiverContext;
    private BroadcastReceiver screenReceiver;

    ImGuiActivityMonitor() {
        this(SystemClock::uptimeMillis);
    }

    ImGuiActivityMonitor(LongSupplier clock) {
        this.clock = clock;
        lastActivityMillis = clock.getAsLong();
    }

    /** Counts as user activity: resets the idle time and fires an armed wake. */
    void noteActivity() {
        lastActivityMillis = clock.getAsLong();
        if (wakeArmed.compareAndSet(true, false)) {
            notifyListener();
        }
    }

    long idleMillis() {
        return Math.max(0L, clock.getAsLong() - lastActivityMillis);
    }

    void armWake(boolean armed) {
        wakeArmed.set(armed);
    }

    boolean isScreenActive() {
        return screenActive;
    }

    /** Queries the screen state again, for a broadcast that never arrived; does not run the listener. */
    synchronized boolean refreshScreenActive() {
        if (receiverContext != null) {
            boolean active = queryScreenActive(receiverContext);
            if (active && !screenActive) {
                lastActivityMillis = clock.getAsLong();
            }
            screenActive = active;
        }
        return screenActive;
    }

    /** Starts monitoring for a session and returns the token that stops it; a later start replaces the listener. */
    synchronized long start(Context context, Runnable wakeListener) {
        stopReceiver();
        listener = wakeListener;
        wakeArmed.set(false);
        lastActivityMillis = clock.getAsLong();
        token += 1;
        if (context != null) {
            Context applicationContext = context.getApplicationContext();
            receiverContext = applicationContext == null ? context : applicationContext;
            screenActive = queryScreenActive(receiverContext);
            BroadcastReceiver receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context receiverContext, Intent intent) {
                    updateScreenState(queryScreenActive(receiverContext));
                }
            };
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_SCREEN_ON);
            filter.addAction(Intent.ACTION_USER_PRESENT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                receiverContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                receiverContext.registerReceiver(receiver, filter);
            }
            screenReceiver = receiver;
        }
        return token;
    }

    /** Stops monitoring when the token is still the current one; a replaced session cannot stop its successor. */
    synchronized boolean stop(long expectedToken) {
        if (expectedToken != token) {
            return false;
        }
        stopReceiver();
        listener = null;
        wakeArmed.set(false);
        screenActive = true;
        return true;
    }

    synchronized void stopAll() {
        stopReceiver();
        listener = null;
        wakeArmed.set(false);
        screenActive = true;
    }

    /** Applies a screen state; turning the screen back on counts as activity, so the session resumes at full rate. */
    void updateScreenState(boolean active) {
        if (screenActive == active) {
            return;
        }
        screenActive = active;
        if (active) {
            lastActivityMillis = clock.getAsLong();
        }
        notifyListener();
    }

    private void notifyListener() {
        Runnable current = listener;
        if (current != null) {
            current.run();
        }
    }

    private void stopReceiver() {
        if (screenReceiver != null && receiverContext != null) {
            try {
                receiverContext.unregisterReceiver(screenReceiver);
            } catch (IllegalArgumentException ignored) {
                // Already unregistered.
            }
        }
        screenReceiver = null;
        receiverContext = null;
    }

    private static boolean queryScreenActive(Context context) {
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (powerManager != null && !powerManager.isInteractive()) {
            return false;
        }
        KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        return keyguardManager == null || !keyguardManager.isKeyguardLocked();
    }
}
