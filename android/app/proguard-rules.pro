# Razorpay ProGuard Rules
-keepclassmembers class * {
    @android.support.annotation.Keep *;
}

-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# Keep all classes with Keep annotation
-keep @android.support.annotation.Keep class * { *; }
-keepclassmembers class * {
    @android.support.annotation.Keep *;
}

# Razorpay specific classes
-keep class com.razorpay.AnalyticsEvent { *; }
-keep class com.razorpay.CheckoutActivity { *; }
-keep class com.razorpay.RzpTokenReceiver { *; }
-keep class com.razorpay.BaseRazorpay { *; }
-keep class com.razorpay.RazorpayClient { *; }

# OkHttp (used by Razorpay)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }

# Retrofit (if used)
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Gson (if used by Razorpay)
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Keep JavaScript interface for WebView (Razorpay uses WebView)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# General Android rules
-keep class * extends android.app.Activity
-keep class * extends android.app.Service
-keep class * extends android.content.BroadcastReceiver
-keep class * extends android.content.ContentProvider

# Keep payment gateway related classes
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}