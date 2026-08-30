package io.github.supermonster003.autojs6.plugin.imgui;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.graphics.Bitmap;
import android.graphics.Color;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.net.Uri;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.os.Process;
import android.view.PixelCopy;
import android.view.Surface;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowManager;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public final class ImGuiRenderInstrumentedTest {

    private static final int WINDOW_BACKGROUND = Color.rgb(20, 40, 80);
    private static final int TITLE_BACKGROUND = Color.rgb(120, 30, 40);
    private static final int BUTTON_BACKGROUND = Color.rgb(20, 150, 60);

    @Test
    public void backendCapabilitySchemaIsStable() {
        try (ActivityScenario<ImGuiRenderTestActivity> scenario =
                 ActivityScenario.launch(ImGuiRenderTestActivity.class)) {
            AtomicReference<ImGuiRenderTestActivity> activityReference = new AtomicReference<>();
            scenario.onActivity(activityReference::set);
            ImGuiRenderTestActivity activity = activityReference.get();
            assertNotNull(activity);

            ImGuiPluginConnection connection = new ImGuiPluginConnection(activity, activity, null);
            String[] flattened = connection.getBackendCapabilities();
            assertEquals(0, flattened.length % 2);
            Map<String, String> values = new HashMap<>();
            for (int index = 0; index < flattened.length; index += 2) {
                values.put(flattened[index], flattened[index + 1]);
            }
            assertEquals("2", values.get("schemaVersion"));
            assertEquals("available", values.get("window.status"));
            assertEquals("true", values.get("window.productionReady"));
            assertEquals("available", values.get("splitTouch.status"));
            assertEquals("2", values.get("privileged.protocolVersion"));
            assertEquals(
                "authenticated-binder-surface",
                values.get("privileged.transport")
            );
            assertEquals("true", values.get("privileged.processEntrypoint"));
            assertEquals("true", values.get("directInput.readerImplemented"));
            assertTrue(Boolean.parseBoolean(values.get("privileged.productionReady")));
            assertTrue(Boolean.parseBoolean(values.get("directInput.productionReady")));
            assertEquals("observe", values.get("directInput.routingPolicy"));
            assertEquals("deferred", values.get("docking.status"));
            assertEquals("deferred", values.get("multiViewport.status"));
        }
    }

    @Test
    public void privilegeProviderRejectsOrdinaryAppUidEvenWithPreparedToken() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        CountDownLatch connected = new CountDownLatch(1);
        AtomicReference<IImGuiPrivilegeBroker> brokerReference = new AtomicReference<>();
        ServiceConnection serviceConnection = new ServiceConnection() {
            @Override
            public void onServiceConnected(ComponentName name, IBinder service) {
                brokerReference.set(IImGuiPrivilegeBroker.Stub.asInterface(service));
                connected.countDown();
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {
                brokerReference.set(null);
            }
        };
        Intent intent = new Intent(context, ImGuiPrivilegeBrokerService.class);
        assertTrue(context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE));

        String token =
            "02468ace13579bdf02468ace13579bdf02468ace13579bdf02468ace13579bdf";
        try {
            assertTrue("Privilege broker did not bind", connected.await(10, TimeUnit.SECONDS));
            IImGuiPrivilegeBroker broker = brokerReference.get();
            assertNotNull(broker);
            broker.prepare(token);
            try {
                context.getContentResolver().call(
                    Uri.parse("content://" + context.getPackageName() + ".privilege_broker"),
                    ImGuiPrivilegeBrokerProvider.METHOD_ACQUIRE,
                    token,
                    null
                );
                throw new AssertionError("Ordinary app UID acquired the privilege broker");
            } catch (SecurityException expected) {
                assertTrue(expected.getMessage().contains("root or the Shizuku shell UID"));
            }
        } finally {
            IImGuiPrivilegeBroker broker = brokerReference.get();
            if (broker != null) {
                try {
                    broker.clear(token);
                } catch (Exception ignored) {
                    // Cleanup is best effort if the broker process was concurrently reclaimed.
                }
            }
            context.unbindService(serviceConnection);
        }
    }

    @Test
    public void splitTouchFlagCanBeToggledAndRestored() {
        try (ActivityScenario<ImGuiRenderTestActivity> scenario =
                 ActivityScenario.launch(ImGuiRenderTestActivity.class)) {
            AtomicReference<ImGuiRenderTestActivity> activityReference = new AtomicReference<>();
            scenario.onActivity(activityReference::set);
            ImGuiRenderTestActivity activity = activityReference.get();
            assertNotNull(activity);

            AtomicInteger flags = new AtomicInteger();
            scenario.onActivity(current -> flags.set(current.getWindow().getAttributes().flags));
            int originalFlags = flags.get();
            boolean originallySplit =
                (originalFlags & WindowManager.LayoutParams.FLAG_SPLIT_TOUCH) != 0;

            ImGuiPluginConnection connection = new ImGuiPluginConnection(activity, activity, null);
            View anchor = connection.createActivitySurface(false, false);
            try {
                assertTrue(connection.setWindowSplitTouch(anchor, true));
                scenario.onActivity(current -> flags.set(current.getWindow().getAttributes().flags));
                assertTrue(
                    (flags.get() & WindowManager.LayoutParams.FLAG_SPLIT_TOUCH) != 0
                );

                assertTrue(connection.setWindowSplitTouch(anchor, false));
                scenario.onActivity(current -> flags.set(current.getWindow().getAttributes().flags));
                assertEquals(
                    originallySplit,
                    (flags.get() & WindowManager.LayoutParams.FLAG_SPLIT_TOUCH) != 0
                );

                // Leave the plugin-added flag enabled so closeActivitySurface must restore it.
                assertTrue(connection.setWindowSplitTouch(anchor, true));
            } finally {
                connection.closeActivitySurface(anchor);
            }

            scenario.onActivity(current -> flags.set(current.getWindow().getAttributes().flags));
            assertEquals(
                originallySplit,
                (flags.get() & WindowManager.LayoutParams.FLAG_SPLIT_TOUCH) != 0
            );
        }
    }

    @Test
    public void renderLifecycleMatchesSemanticScreenshotBaseline() throws Exception {
        try (ActivityScenario<ImGuiRenderTestActivity> scenario =
                 ActivityScenario.launch(ImGuiRenderTestActivity.class)) {
            AtomicReference<ImGuiRenderTestActivity> activityReference = new AtomicReference<>();
            scenario.onActivity(activityReference::set);
            ImGuiRenderTestActivity activity = activityReference.get();
            assertNotNull(activity);

            Surface surface = activity.awaitSurface(10, TimeUnit.SECONDS);
            SurfaceView surfaceView = activity.getSurfaceView();
            assertTrue(surfaceView.getWidth() >= 320);
            assertTrue(surfaceView.getHeight() >= 240);

            ImGuiPluginConnection connection = new ImGuiPluginConnection(activity, activity, null);
            try {
                assertTrue(connection.init(
                    surface,
                    1.0F,
                    "asset://fonts/AutoJs6CjkFallback-Regular.otf",
                    16.0F
                ));
                configureBaselinePalette(connection);

                renderBaselineFrame(connection);
                renderBaselineFrame(connection);

                Bitmap screenshot = copySurface(surfaceView);
                ImGuiScreenshotBaseline.assertCoverage(
                    screenshot,
                    WINDOW_BACKGROUND,
                    18_000,
                    90_000,
                    "window background"
                );
                ImGuiScreenshotBaseline.assertCoverage(
                    screenshot,
                    TITLE_BACKGROUND,
                    2_000,
                    15_000,
                    "active title"
                );
                ImGuiScreenshotBaseline.assertCoverage(
                    screenshot,
                    BUTTON_BACKGROUND,
                    500,
                    12_000,
                    "button"
                );
                screenshot.recycle();
            } finally {
                if (connection.isOwner()) {
                    connection.shutdown();
                }
            }
        }
    }

    @Test
    public void shellChildTransfersRenderableSurfaceThroughAuthenticatedBroker() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        CountDownLatch connected = new CountDownLatch(1);
        AtomicReference<IImGuiPrivilegeBroker> brokerReference = new AtomicReference<>();
        ServiceConnection serviceConnection = new ServiceConnection() {
            @Override
            public void onServiceConnected(ComponentName name, IBinder service) {
                brokerReference.set(IImGuiPrivilegeBroker.Stub.asInterface(service));
                connected.countDown();
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {
                brokerReference.set(null);
            }
        };
        Intent intent = new Intent(context, ImGuiPrivilegeBrokerService.class);
        assertTrue(context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE));

        String token =
            "13579bdf2468ace013579bdf2468ace013579bdf2468ace013579bdf2468ace0";
        IImGuiPrivilegedEndpoint endpoint = null;
        Surface surface = null;
        ImGuiPluginConnection connection = null;
        ParcelFileDescriptor childOutput = null;
        try {
            assertTrue("Privilege broker did not bind", connected.await(10, TimeUnit.SECONDS));
            IImGuiPrivilegeBroker broker = brokerReference.get();
            assertNotNull(broker);
            broker.prepare(token);

            String command = "/system/bin/env CLASSPATH=" + context.getApplicationInfo().sourceDir +
                " /system/bin/setsid /system/bin/app_process /system/bin " +
                "io.github.supermonster003.autojs6.plugin.imgui.ImGuiPrivilegedProcess " +
                "broker-child " + token + " " + context.getPackageName() +
                " " + (Process.myUid() / 100_000);
            childOutput = InstrumentationRegistry.getInstrumentation()
                .getUiAutomation()
                .executeShellCommand(command);
            endpoint = broker.awaitEndpoint(token, 15_000L);
            assertNotNull("Shell app_process did not register with the broker", endpoint);
            assertTrue(endpoint.info().contains("uid=2000"));

            CountDownLatch inputReported = new CountDownLatch(1);
            surface = endpoint.createSurface(480, 320, 0, new IImGuiInputCallback.Stub() {
                @Override
                public void onTouch(int action, float x, float y, int trackingId) {
                    inputReported.countDown();
                }

                @Override
                public void onError(String message) {
                    // Input discovery is device-specific; Surface transfer/rendering remains valid.
                }
            });
            assertNotNull(surface);
            assertTrue(surface.isValid());

            connection = new ImGuiPluginConnection(context, context, null);
            assertTrue(connection.init(
                surface,
                context.getResources().getDisplayMetrics().density,
                "asset://fonts/AutoJs6CjkFallback-Regular.otf",
                16.0F
            ));
            renderBaselineFrame(connection);
            renderBaselineFrame(connection);
            assertTrue(endpoint.info().contains("surface=true"));
        } finally {
            if (connection != null && connection.isOwner()) {
                connection.shutdown();
            }
            if (endpoint != null) {
                endpoint.close();
            }
            IImGuiPrivilegeBroker broker = brokerReference.get();
            if (broker != null) {
                try {
                    broker.clear(token);
                } catch (Exception ignored) {
                    // The endpoint close may already have disconnected the broker child.
                }
            }
            if (surface != null) {
                surface.release();
            }
            if (childOutput != null) {
                childOutput.close();
            }
            context.unbindService(serviceConnection);
        }
    }

    private static void configureBaselinePalette(ImGuiPluginConnection connection) {
        connection.styleColorsDark();
        connection.setStyleColor(2, 20 / 255.0F, 40 / 255.0F, 80 / 255.0F, 1.0F);
        connection.setStyleColor(10, 120 / 255.0F, 30 / 255.0F, 40 / 255.0F, 1.0F);
        connection.setStyleColor(11, 120 / 255.0F, 30 / 255.0F, 40 / 255.0F, 1.0F);
        connection.setStyleColor(22, 20 / 255.0F, 150 / 255.0F, 60 / 255.0F, 1.0F);
    }

    private static void renderBaselineFrame(ImGuiPluginConnection connection) {
        assertTrue(connection.newFrame());
        connection.setNextWindowPos(20, 20, 1, 0, 0);
        connection.setNextWindowSize(300, 200, 1);
        assertTrue(connection.begin("P6 Render Baseline", null, 0));
        connection.text("AutoJs6 ImGui instrumentation");
        connection.separator();
        connection.button("Baseline Button", 150, 32);
        connection.progressBar(0.625F, 220, 18, "62.5%");
        connection.end();
        assertTrue(connection.render());
    }

    private static Bitmap copySurface(SurfaceView surfaceView) throws InterruptedException {
        Bitmap bitmap = Bitmap.createBitmap(
            surfaceView.getWidth(),
            surfaceView.getHeight(),
            Bitmap.Config.ARGB_8888
        );
        CountDownLatch copied = new CountDownLatch(1);
        AtomicInteger result = new AtomicInteger(PixelCopy.ERROR_UNKNOWN);
        PixelCopy.request(
            surfaceView,
            bitmap,
            copyResult -> {
                result.set(copyResult);
                copied.countDown();
            },
            new Handler(Looper.getMainLooper())
        );
        assertTrue("PixelCopy timed out", copied.await(10, TimeUnit.SECONDS));
        assertTrue("PixelCopy failed with status " + result.get(), result.get() == PixelCopy.SUCCESS);
        return bitmap;
    }

}
