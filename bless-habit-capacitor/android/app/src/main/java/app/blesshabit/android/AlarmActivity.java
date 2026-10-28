package app.blesshabit.android;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Pantalla de alarma a pantalla completa (como la del reloj): aparece sobre la
 * pantalla bloqueada a la hora exacta de un hábito o tarea con alarma.
 * El sonido lo da la notificación de alarma; al tocar cualquier botón se quita
 * la notificación y deja de sonar.
 */
public class AlarmActivity extends Activity {

    private int notifId;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        render(getIntent());
        // Igual que la notificación: a los 2 minutos se cierra sola.
        handler.postDelayed(this::stopAndClose, 2 * 60 * 1000);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        render(intent);
    }

    private int dp(int v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private void render(Intent in) {
        notifId = in.getIntExtra("id", 0);
        String title = in.getStringExtra("title");
        String body = in.getStringExtra("body");
        String habitId = in.getStringExtra("habitId");
        String kind = in.getStringExtra("kind");
        boolean en = getResources().getConfiguration().getLocales().get(0).getLanguage().equals("en");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(28), dp(48), dp(28), dp(48));
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{0xFF2A2350, 0xFF7C6CF0});
        root.setBackground(bg);

        TextView clock = new TextView(this);
        clock.setText(new java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault()).format(new java.util.Date()));
        clock.setTextColor(Color.WHITE);
        clock.setTextSize(64);
        clock.setTypeface(Typeface.DEFAULT_BOLD);
        clock.setGravity(Gravity.CENTER);
        root.addView(clock);

        TextView t = new TextView(this);
        t.setText(title == null ? "Bless Habit" : title);
        t.setTextColor(Color.WHITE);
        t.setTextSize(26);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setGravity(Gravity.CENTER);
        t.setPadding(0, dp(24), 0, dp(8));
        root.addView(t);

        if (body != null && !body.isEmpty()) {
            TextView b = new TextView(this);
            b.setText(body);
            b.setTextColor(0xDDFFFFFF);
            b.setTextSize(17);
            b.setGravity(Gravity.CENTER);
            b.setPadding(0, 0, 0, dp(36));
            root.addView(b);
        } else {
            root.addView(spacer(dp(36)));
        }

        boolean isHabit = habitId != null && !habitId.isEmpty();
        String hid = isHabit ? Uri.encode(habitId) : "";
        if (isHabit && "timer".equals(kind)) {
            root.addView(button(en ? "▶  Start timer" : "▶  Encender cronómetro", 0xFFFFFFFF, 0xFF2A2350,
                    () -> openApp("blesshabit://timer?habit=" + hid + "&do=start")));
        }
        if (isHabit) {
            root.addView(button(en ? "Snooze 15 min" : "Posponer 15 min", 0x33FFFFFF, Color.WHITE,
                    () -> openApp("blesshabit://postpone?habit=" + hid + "&min=15")));
        }
        root.addView(button(en ? "Stop" : "Detener", 0x33FFFFFF, Color.WHITE, this::stopAndClose));

        setContentView(root);
    }

    private android.view.View spacer(int h) {
        android.view.View v = new android.view.View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(1, h));
        return v;
    }

    private Button button(String text, int fill, int textColor, Runnable onTap) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(18);
        b.setTextColor(textColor);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable d = new GradientDrawable();
        d.setColor(fill);
        d.setCornerRadius(dp(28));
        b.setBackground(d);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(58));
        lp.topMargin = dp(12);
        b.setLayoutParams(lp);
        b.setOnClickListener(v -> onTap.run());
        return b;
    }

    private void cancelNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && notifId != 0) nm.cancel(notifId);
    }

    private void stopAndClose() {
        cancelNotification();
        finish();
    }

    /** Deja de sonar, pide desbloquear si hace falta y abre la app con la acción. */
    private void openApp(String uri) {
        cancelNotification();
        final Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(uri), this, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        if (km != null && km.isKeyguardLocked() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            km.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                @Override public void onDismissSucceeded() { startActivity(i); finish(); }
                @Override public void onDismissCancelled() { finish(); }
                @Override public void onDismissError() { finish(); }
            });
        } else {
            startActivity(i);
            finish();
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
