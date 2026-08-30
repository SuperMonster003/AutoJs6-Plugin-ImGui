package io.github.supermonster003.autojs6.plugin.imgui;

import static org.junit.Assert.assertEquals;

import android.content.AttributionSource;
import android.os.Bundle;

import java.lang.reflect.Method;

import org.junit.Test;

public class ImGuiPrivilegedProcessTest {

    @Test
    public void providerCallPrefersApi31AuthoritativeOverload() throws Exception {
        Method method = ImGuiPrivilegedProcess.findProviderCall(Api31Provider.class);

        assertEquals(5, method.getParameterTypes().length);
        assertEquals(AttributionSource.class, method.getParameterTypes()[0]);
    }

    @Test
    public void providerCallPrefersApi29AuthorityOverload() throws Exception {
        Method method = ImGuiPrivilegedProcess.findProviderCall(Api29Provider.class);

        assertEquals(5, method.getParameterTypes().length);
        assertEquals(String.class, method.getParameterTypes()[0]);
    }

    public static final class Api31Provider {
        public Bundle call(String callingPackage, String method, String arg, Bundle extras) {
            return null;
        }

        public Bundle call(
            AttributionSource source,
            String authority,
            String method,
            String arg,
            Bundle extras
        ) {
            return null;
        }
    }

    public static final class Api29Provider {
        public Bundle call(String callingPackage, String method, String arg, Bundle extras) {
            return null;
        }

        public Bundle call(
            String callingPackage,
            String authority,
            String method,
            String arg,
            Bundle extras
        ) {
            return null;
        }
    }
}
