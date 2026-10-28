package app.blesshabit.android;

import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;

import com.tiktok.TikTokBusinessSdk;
import com.tiktok.appevents.base.EventName;

/**
 * TikTok App Events SDK: le avisa a TikTok cuando alguien instala o abre la app,
 * se registra o se suscribe, para medir y optimizar los anuncios en TikTok.
 *
 * Los IDs (TikTok App ID y App Secret de Events Manager) llegan desde la web
 * (variables TIKTOK_APP_ID / TIKTOK_APP_SECRET en Render) y se guardan aquí,
 * así en las siguientes aperturas el SDK arranca apenas abre la app.
 * Sin IDs no se inicia ni se envía nada.
 */
final class BlessTikTok {
    private static final String PREFS = "bless_tiktok";

    private BlessTikTok() {}

    /** Al abrir la app: arranca con los IDs guardados la vez anterior. */
    static void initFromPrefs(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        start(ctx, p.getString("ttAppId", ""), p.getString("secret", ""));
    }

    /** Guarda los IDs que manda la web y arranca si aún no lo hizo. */
    static boolean configure(Context ctx, String ttAppId, String secret) {
        if (TextUtils.isEmpty(ttAppId)) return false;
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("ttAppId", ttAppId).putString("secret", secret == null ? "" : secret).apply();
        return start(ctx, ttAppId, secret);
    }

    private static synchronized boolean start(Context ctx, String ttAppId, String secret) {
        if (TextUtils.isEmpty(ttAppId)) return false;
        try {
            if (TikTokBusinessSdk.isInitialized()) return true;
            TikTokBusinessSdk.TTConfig cfg = new TikTokBusinessSdk.TTConfig(ctx.getApplicationContext(), secret == null ? "" : secret)
                    .setAppId(ctx.getPackageName())
                    .setTTAppId(ttAppId);
            TikTokBusinessSdk.initializeSdk(cfg);
            TikTokBusinessSdk.startTrack();
            return true;
        } catch (Throwable t) {
            return false; // nunca debe romper la app
        }
    }

    /** Envía un evento estándar (Registration, Subscribe, CompleteTutorial…). */
    static boolean track(String name) {
        try {
            if (!TikTokBusinessSdk.isInitialized() || TextUtils.isEmpty(name)) return false;
            for (EventName e : EventName.values()) {
                if (e.toString().equalsIgnoreCase(name) || e.name().equalsIgnoreCase(name)) {
                    TikTokBusinessSdk.trackTTEvent(e);
                    return true;
                }
            }
            TikTokBusinessSdk.trackEvent(name); // evento propio
            return true;
        } catch (Throwable t) {
            return false;
        }
    }
}
