package app.blesshabit.android;

import android.app.Application;
import android.text.TextUtils;
import android.util.Log;

import com.tiktok.TikTokBusinessSdk;

/**
 * Arranque de la app. Solo inicia el SDK de TikTok (TikTok Events Manager),
 * que manda solo los eventos InstallApp, LaunchApp y 2DRetention. Se inicia
 * aquí y no en MainActivity para que cuente bien las aperturas de la app.
 */
public class BlessApplication extends Application {

    private static final String TAG = "BlessTikTok";

    @Override
    public void onCreate() {
        super.onCreate();
        initTikTok();
    }

    private void initTikTok() {
        String ttAppId = BuildConfig.TIKTOK_APP_ID;
        if (TextUtils.isEmpty(ttAppId)) {
            Log.i(TAG, "Falta TIKTOK_APP_ID en gradle.properties: SDK de TikTok no iniciado");
            return;
        }
        try {
            // El access token es opcional: el SDK 1.7.1 no lo usa para enviar eventos.
            String token = TextUtils.isEmpty(BuildConfig.TIKTOK_ACCESS_TOKEN) ? null : BuildConfig.TIKTOK_ACCESS_TOKEN;
            TikTokBusinessSdk.TTConfig config = new TikTokBusinessSdk.TTConfig(getApplicationContext(), token)
                    // "App ID" para TikTok en Android = package name.
                    .setAppId(BuildConfig.APPLICATION_ID)
                    // "TikTok App ID" = el número de Events Manager.
                    .setTTAppId(ttAppId)
                    // Las compras ya se validan en el servidor (/api/gplay/verify) con
                    // Google Play Billing 9 (@capgo/native-purchases). El rastreo
                    // automático de compras del SDK está hecho para Billing 8, así
                    // que se apaga para no arriesgar fallos.
                    .disableAutoIapTrack();
            if (BuildConfig.DEBUG) {
                // Solo en compilaciones de prueba: logs en Logcat y eventos visibles
                // en Events Manager → Test Events.
                config.openDebugMode().setLogLevel(TikTokBusinessSdk.LogLevel.DEBUG);
            }
            TikTokBusinessSdk.initializeSdk(config, new TikTokBusinessSdk.TTInitCallback() {
                @Override
                public void success() {
                    Log.i(TAG, "SDK de TikTok iniciado");
                }

                @Override
                public void fail(int code, String msg) {
                    Log.w(TAG, "SDK de TikTok no se pudo iniciar: " + code + " " + msg);
                }
            });
        } catch (Throwable t) {
            // Nunca dejar que la medición de TikTok impida abrir la app.
            Log.w(TAG, "Error al iniciar el SDK de TikTok", t);
        }
    }
}
