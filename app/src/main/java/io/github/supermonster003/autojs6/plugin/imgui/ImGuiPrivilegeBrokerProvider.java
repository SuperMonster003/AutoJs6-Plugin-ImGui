package io.github.supermonster003.autojs6.plugin.imgui;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Binder;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Process;

/**
 * Narrow Binder rendezvous for a root/Shizuku {@code app_process} that ActivityManager does not
 * recognize as a normal application process and therefore cannot use {@code bindService()}.
 */
public final class ImGuiPrivilegeBrokerProvider extends ContentProvider {

    static final String METHOD_ACQUIRE = "acquirePreparedBroker";
    static final String BINDER_KEY = "broker";

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public Bundle call(String method, String arg, Bundle extras) {
        if (!METHOD_ACQUIRE.equals(method)) {
            throw new IllegalArgumentException("Unknown ImGui privilege-provider method");
        }
        int callerUid = Binder.getCallingUid();
        if (callerUid != 0 && callerUid != Process.SHELL_UID) {
            throw new SecurityException(
                "Only root or the Shizuku shell UID may acquire the ImGui privilege broker"
            );
        }
        IBinder broker = ImGuiPrivilegeBrokerService.acquirePreparedBroker(arg);
        Bundle result = new Bundle();
        result.putBinder(BINDER_KEY, broker);
        return result;
    }

    @Override
    public Cursor query(
        Uri uri,
        String[] projection,
        String selection,
        String[] selectionArgs,
        String sortOrder
    ) {
        throw new UnsupportedOperationException("The ImGui privilege provider supports call() only");
    }

    @Override
    public String getType(Uri uri) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("The ImGui privilege provider is read-only");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("The ImGui privilege provider is read-only");
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("The ImGui privilege provider is read-only");
    }
}
