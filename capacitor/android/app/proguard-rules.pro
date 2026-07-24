# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---------------------------------------------------------------------------
# Capacitor / Cordova keep rules (required when minifyEnabled = true)
#
# Capacitor instantiates plugins reflectively by class name (read from
# assets/capacitor.plugins.json) and dispatches to @PluginMethod-annotated
# methods, also via reflection. R8 can't see those references statically, so
# without these rules it strips or renames the classes and registration fails
# at runtime ("Plugin X not found" / native calls silently no-op).
# ---------------------------------------------------------------------------

# Preserve annotations, signatures, inner classes and JS-bridge metadata that
# the reflective bridge depends on.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod, JavascriptInterface

# Capacitor framework + bundled plugins.
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }

# Anything annotated as a Capacitor plugin, and all plugin-method / JS-interface
# members — covers current and future plugins generically.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
    @android.webkit.JavascriptInterface <methods>;
}

# Cordova bridge layer (capacitor-cordova-android-plugins module).
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin { *; }

# Third-party Capacitor plugins (classpaths from capacitor.plugins.json) — each
# is referenced only by name, so keep the whole package.
-keep class ar.com.anura.plugins.** { *; }             # @anuradev/capacitor-background-mode
-keep class com.ryltsov.alex.plugins.** { *; }          # @capacitor-community/file-opener
-keep class io.capawesome.capacitorjs.plugins.** { *; } # @capawesome/capacitor-file-picker

# This app's custom native plugins (StoragePermission, IntentHandler).
-keep class org.tagspaces.plugins.** { *; }
-keep class org.tagspaces.mobileapp.** { *; }
