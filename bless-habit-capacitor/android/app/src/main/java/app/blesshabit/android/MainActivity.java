package app.blesshabit.android;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    // A partir de cuántos ms se muestra "Despertando a Bless…" debajo del logo.
    private static final long SLOW_LOADING_HINT_MS = 5000;

    private View loadingOverlay;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BlessDevicePlugin.class);
        super.onCreate(savedInstanceState);

        // Pantalla de carga encima del WebView hasta que termine de cargar la
        // primera página (la app real o, sin internet, www/error.html).
        loadingOverlay = getLayoutInflater().inflate(R.layout.loading_overlay, null);
        addContentView(loadingOverlay, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        final View slowText = loadingOverlay.findViewById(R.id.loading_slow_text);
        handler.postDelayed(() -> slowText.setVisibility(View.VISIBLE), SLOW_LOADING_HINT_MS);

        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                hideLoadingOverlay();
                CookieManager.getInstance().flush();
            }
        });
    }

    // El WebView guarda las cookies (la sesión iniciada) en memoria y las pasa
    // al disco cada cierto tiempo. Si la app se cierra antes, se pierde la
    // sesión y hay que volver a iniciarla: por eso se guardan al salir.
    @Override
    public void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    public void onStop() {
        super.onStop();
        CookieManager.getInstance().flush();
    }

    private void hideLoadingOverlay() {
        runOnUiThread(() -> {
            if (loadingOverlay == null) return;
            final View overlay = loadingOverlay;
            loadingOverlay = null;
            handler.removeCallbacksAndMessages(null);
            overlay.animate().alpha(0f).setDuration(250).withEndAction(() -> {
                ViewGroup parent = (ViewGroup) overlay.getParent();
                if (parent != null) parent.removeView(overlay);
            });
        });
    }
}
