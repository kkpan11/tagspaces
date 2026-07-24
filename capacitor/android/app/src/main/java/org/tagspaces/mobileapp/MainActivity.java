package org.tagspaces.mobileapp;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import org.tagspaces.plugins.IntentHandlerPlugin;
import org.tagspaces.plugins.MediaKeepAlivePlugin;
import org.tagspaces.plugins.StoragePermissionPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StoragePermissionPlugin.class);
        registerPlugin(IntentHandlerPlugin.class);
        registerPlugin(MediaKeepAlivePlugin.class);
        super.onCreate(savedInstanceState);
        insetWebViewFromSystemBars();
    }

    // Android 15+ (targetSdk 35+) force-enables edge-to-edge: the WebView always
    // extends behind the status bar, notch, and gesture nav. StatusBar plugin's
    // setOverlaysWebView({overlay:false}) became a no-op, and the SDK-35 opt-out
    // flag was removed in SDK 36. We restore pre-edge-to-edge behavior on the
    // top/left/right by padding the WebView's parent so the WebView no longer
    // overlaps the status bar and display cutout — this fixes both flow and
    // position:fixed/absolute UI inside the WebView.
    //
    // The BOTTOM is deliberately left unpadded: padding it pushed the WebView up
    // and revealed the parent's (white) background under the gesture-nav bar — a
    // ~15px dead strip. Instead we let the WebView extend to the screen edge so
    // the app background fills that area, and we pass the bottom inset through to
    // the WebView (instead of consuming it) so the web layer can keep its own
    // content clear of the gesture bar via env(safe-area-inset-bottom)
    // (viewport-fit=cover + body padding-bottom in index.html).
    private void insetWebViewFromSystemBars() {
        final View parent = (View) getBridge().getWebView().getParent();
        if (parent == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(parent, (v, insets) -> {
            int typeMask = WindowInsetsCompat.Type.systemBars()
                | WindowInsetsCompat.Type.displayCutout();
            Insets bars = insets.getInsets(typeMask);
            v.setPadding(bars.left, bars.top, bars.right, 0);
            // Consume top/left/right (handled by the padding above) but keep the
            // bottom inset so the WebView still receives it and env(safe-area-
            // inset-bottom) resolves to the gesture-nav height in CSS.
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(typeMask, Insets.of(0, 0, 0, bars.bottom))
                .build();
        });
        ViewCompat.requestApplyInsets(parent);
    }
}
