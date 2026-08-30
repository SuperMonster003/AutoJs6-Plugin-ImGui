package io.github.supermonster003.autojs6.plugin.imgui;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Bundle;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Debug-only Surface host used by the connected renderer test. */
public final class ImGuiRenderTestActivity extends Activity implements SurfaceHolder.Callback {

    private final CountDownLatch surfaceReady = new CountDownLatch(1);
    private SurfaceView surfaceView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        surfaceView = new SurfaceView(this);
        surfaceView.getHolder().setFormat(PixelFormat.RGBA_8888);
        surfaceView.getHolder().addCallback(this);
        root.addView(
            surfaceView,
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );
        setContentView(root);
    }

    public SurfaceView getSurfaceView() {
        return surfaceView;
    }

    public Surface awaitSurface(long timeout, TimeUnit unit) throws InterruptedException {
        if (!surfaceReady.await(timeout, unit)) {
            throw new IllegalStateException("Timed out waiting for the instrumentation Surface");
        }
        Surface surface = surfaceView.getHolder().getSurface();
        if (surface == null || !surface.isValid()) {
            throw new IllegalStateException("Instrumentation Surface is invalid");
        }
        return surface;
    }

    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        surfaceReady.countDown();
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
        if (width > 0 && height > 0) {
            surfaceReady.countDown();
        }
    }

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        // The test owns renderer shutdown before ActivityScenario closes this Surface.
    }
}
