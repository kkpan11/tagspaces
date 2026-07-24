package org.tagspaces.plugins;

import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Starts/stops {@link MediaKeepAliveService} so WebView audio keeps playing
 * when the app is in the background. Mirrors the enable()/disable() API
 * previously provided by @anuradev/capacitor-background-mode.
 */
@CapacitorPlugin(name = "MediaKeepAlive")
public class MediaKeepAlivePlugin extends Plugin {

    @PluginMethod
    public void enable(PluginCall call) {
        Intent intent = new Intent(getContext(), MediaKeepAliveService.class);
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void disable(PluginCall call) {
        Intent intent = new Intent(getContext(), MediaKeepAliveService.class);
        getContext().stopService(intent);
        call.resolve();
    }
}
