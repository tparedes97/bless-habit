package app.blesshabit.android;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Recordatorios propios de Bless (app 1.2+), en lugar del plugin de
 * notificaciones de Capacitor.
 *
 * Por qué: ese plugin, después del primer aviso de un hábito que se repite,
 * reprograma el siguiente con una alarma que NO despierta al teléfono
 * (AlarmManager.RTC sin "allow while idle"). Con el teléfono bloqueado esos
 * avisos se quedaban esperando hasta desbloquearlo: "a veces no llegan".
 *
 * Aquí la app manda la lista concreta de avisos de los próximos días (fecha y
 * hora exactas) y cada uno se programa con setAlarmClock(): es el mecanismo de
 * las apps de alarma, Android lo trata como alarma real, despierta al teléfono
 * y no lo atrasa por ahorro de batería. La lista se guarda para volver a
 * programarla al reiniciar el teléfono o actualizar la app (BlessBootReceiver).
 *
 * Cada aviso puede ser:
 *  - normal: notificación con sonido (canal "Recordatorios").
 *  - alarma: suena con el sonido de ALARMA del teléfono (volumen de alarma, se
 *    oye aunque esté en silencio) y se repite hasta que la persona la toca o
 *    pulsa "Detener" (máx. 2 minutos).
 */
public class BlessReminders {

    static final String PREFS = "bless_reminders";
    static final String KEY_ITEMS = "items";
    static final String KEY_CODES = "codes";

    static final String CH_REMINDERS = "bless_recordatorios_v2";
    static final String CH_ALARMS = "bless_alarmas_v1";

    static final String ACTION_FIRE = "app.blesshabit.android.REMINDER_FIRE";
    static final String ACTION_STOP = "app.blesshabit.android.REMINDER_STOP";
    static final String EXTRA_CANCEL_NOTIF = "bless_cancel_notif";

    /** Android 14+: si el usuario permite que las alarmas salgan a pantalla completa. */
    static boolean canFullScreen(Context ctx) {
        if (Build.VERSION.SDK_INT < 34) return true;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        return nm != null && nm.canUseFullScreenIntent();
    }

    /** Reemplaza todos los avisos programados por los de esta lista (JSON). */
    static int scheduleAll(Context ctx, String itemsJson) throws Exception {
        JSONArray items = new JSONArray(itemsJson);
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        cancelStored(ctx, prefs);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        long now = System.currentTimeMillis();
        JSONArray codes = new JSONArray();
        int count = 0;
        for (int i = 0; i < items.length() && count < 400; i++) {
            JSONObject it = items.optJSONObject(i);
            if (it == null) continue;
            long at = it.optLong("at", 0);
            if (at <= now) continue;
            int id = it.optInt("id", i + 1);
            schedule(ctx, am, it, id, at);
            codes.put(id);
            count++;
        }
        prefs.edit().putString(KEY_ITEMS, itemsJson).putString(KEY_CODES, codes.toString()).apply();
        return count;
    }

    /** Después de reiniciar el teléfono o actualizar la app: vuelve a programar lo guardado. */
    static void restore(Context ctx) {
        String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_ITEMS, null);
        if (raw == null) return;
        try { scheduleAll(ctx, raw); } catch (Exception ignored) { }
    }

    static boolean canExact(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    private static void schedule(Context ctx, AlarmManager am, JSONObject it, int id, long at) {
        Intent fire = new Intent(ctx, BlessReminderReceiver.class).setAction(ACTION_FIRE);
        fire.putExtra("id", id);
        fire.putExtra("title", it.optString("title", "Bless Habit"));
        fire.putExtra("body", it.optString("body", ""));
        fire.putExtra("alarm", it.optBoolean("alarm", false));
        // Para los botones de la notificación: de qué hábito es y de qué tipo
        // ("timer" muestra "Encender cronómetro").
        fire.putExtra("habitId", it.optString("habitId", ""));
        fire.putExtra("kind", it.optString("kind", ""));
        PendingIntent pi = PendingIntent.getBroadcast(ctx, id, fire,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (canExact(ctx)) {
            // Alarma "de reloj": despierta al teléfono y no se atrasa en reposo.
            AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(at, openAppIntent(ctx, id));
            am.setAlarmClock(info, pi);
        } else {
            // Sin el permiso "Alarmas y recordatorios": lo mejor posible sin él.
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    private static void cancelStored(Context ctx, SharedPreferences prefs) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        try {
            JSONArray codes = new JSONArray(prefs.getString(KEY_CODES, "[]"));
            for (int i = 0; i < codes.length(); i++) {
                int id = codes.optInt(i);
                Intent fire = new Intent(ctx, BlessReminderReceiver.class).setAction(ACTION_FIRE);
                PendingIntent pi = PendingIntent.getBroadcast(ctx, id, fire,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                if (pi != null) { am.cancel(pi); pi.cancel(); }
            }
        } catch (Exception ignored) { }
    }

    static PendingIntent openAppIntent(Context ctx, int requestCode) {
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(ctx, requestCode, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;
        boolean en = ctx.getResources().getConfiguration().getLocales().get(0).getLanguage().equals("en");

        NotificationChannel rem = new NotificationChannel(CH_REMINDERS,
                en ? "Habit reminders" : "Recordatorios de hábitos", NotificationManager.IMPORTANCE_HIGH);
        rem.setDescription(en ? "Reminders for your habits and tasks" : "Avisos a la hora de tus hábitos y tareas");
        rem.enableVibration(true);
        rem.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(rem);

        NotificationChannel alarm = new NotificationChannel(CH_ALARMS,
                en ? "Alarms" : "Alarmas", NotificationManager.IMPORTANCE_HIGH);
        alarm.setDescription(en ? "Tasks and habits that ring like an alarm" : "Tareas y hábitos que suenan como alarma");
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        alarm.setSound(sound, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
        alarm.enableVibration(true);
        alarm.setVibrationPattern(new long[]{0, 800, 400, 800, 400, 800});
        alarm.setBypassDnd(true);
        alarm.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(alarm);
    }

    static void show(Context ctx, int id, String title, String body, boolean alarm) {
        show(ctx, id, title, body, alarm, null, null);
    }

    /**
     * Abre la app con un enlace blesshabit://… que la página interpreta
     * (setupNativeAppUrlListener): encender el cronómetro, posponer, etc.
     */
    static PendingIntent deepLinkIntent(Context ctx, String uri, int requestCode) {
        return deepLinkIntent(ctx, uri, requestCode, 0);
    }

    /** cancelNotifId: notificación a quitar al tocar (así una alarma deja de sonar). */
    static PendingIntent deepLinkIntent(Context ctx, String uri, int requestCode, int cancelNotifId) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(uri), ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (cancelNotifId != 0) i.putExtra(EXTRA_CANCEL_NOTIF, cancelNotifId);
        return PendingIntent.getActivity(ctx, requestCode, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static boolean isEnglish(Context ctx) {
        return ctx.getResources().getConfiguration().getLocales().get(0).getLanguage().equals("en");
    }

    /** Muestra el aviso (lo llama BlessReminderReceiver a la hora programada). */
    static void show(Context ctx, int id, String title, String body, boolean alarm, String habitId, String kind) {
        ensureChannels(ctx);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, alarm ? CH_ALARMS : CH_REMINDERS)
                .setSmallIcon(R.drawable.ic_stat_bless)
                .setColor(0xFF7C6CF0)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(openAppIntent(ctx, id))
                .setPriority(alarm ? NotificationCompat.PRIORITY_MAX : NotificationCompat.PRIORITY_HIGH)
                .setCategory(alarm ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER);
        if (alarm) {
            Intent stop = new Intent(ctx, BlessReminderReceiver.class).setAction(ACTION_STOP).putExtra("id", id);
            PendingIntent stopPi = PendingIntent.getBroadcast(ctx, 100000 + id, stop,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            boolean en = ctx.getResources().getConfiguration().getLocales().get(0).getLanguage().equals("en");
            b.addAction(0, en ? "Stop" : "Detener", stopPi);
            b.setOngoing(true);
            b.setTimeoutAfter(2 * 60 * 1000); // deja de sonar sola a los 2 minutos
            // Pantalla completa sobre el bloqueo, como la alarma del reloj (AlarmActivity).
            Intent full = new Intent(ctx, AlarmActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION)
                    .putExtra("id", id).putExtra("title", title).putExtra("body", body)
                    .putExtra("habitId", habitId == null ? "" : habitId).putExtra("kind", kind == null ? "" : kind);
            PendingIntent fullPi = PendingIntent.getActivity(ctx, 500000 + id, full,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            b.setFullScreenIntent(fullPi, true);
            b.setContentIntent(fullPi); // tocar la notificación abre la pantalla de alarma
        }
        // Hábito: botones para encender el cronómetro (si es por tiempo) y posponer.
        if (habitId != null && !habitId.isEmpty()) {
            boolean en = isEnglish(ctx);
            String hid = Uri.encode(habitId);
            if ("timer".equals(kind)) {
                b.addAction(0, en ? "▶ Start timer" : "▶ Encender cronómetro",
                        deepLinkIntent(ctx, "blesshabit://timer?habit=" + hid + "&do=start", 200000 + id, alarm ? id : 0));
            }
            b.addAction(0, en ? "+15 min" : "Posponer 15 min",
                    deepLinkIntent(ctx, "blesshabit://postpone?habit=" + hid + "&min=15", 300000 + id, alarm ? id : 0));
        }
        Notification n = b.build();
        if (alarm) n.flags |= Notification.FLAG_INSISTENT; // repite el sonido hasta que se atienda
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        try { nm.notify(id, n); } catch (SecurityException ignored) { /* sin permiso de notificaciones */ }
    }

    static void stop(Context ctx, int id) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(id);
    }

    // ---- Cronómetro en la pantalla bloqueada / barra de notificaciones ----
    static final String CH_TIMER = "bless_cronometro_v1";
    static final int TIMER_NOTIF_ID = 777001;

    /**
     * Notificación fija mientras hay un cronómetro: el reloj lo dibuja Android
     * (setUsesChronometer), así que avanza solo aunque la app esté cerrada.
     * elapsedSec = tiempo ya contado; running = si está corriendo.
     */
    static void showTimer(Context ctx, String habitId, String title, long elapsedSec, long goalSec, boolean running) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CH_TIMER) == null) {
            NotificationChannel ch = new NotificationChannel(CH_TIMER,
                    isEnglish(ctx) ? "Timer" : "Cronómetro", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription(isEnglish(ctx) ? "Shows your running timer" : "Muestra tu cronómetro en curso");
            ch.setShowBadge(false);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        boolean en = isEnglish(ctx);
        String hid = Uri.encode(habitId == null ? "" : habitId);
        long goalMin = Math.max(1, goalSec / 60);
        String text;
        if (elapsedSec >= goalSec && goalSec > 0) text = en ? "Goal reached! 🎉 You can keep going or finish." : "¡Meta cumplida! 🎉 Puedes seguir o finalizar.";
        else text = running ? (en ? "Goal: " + goalMin + " min" : "Meta: " + goalMin + " min")
                : (en ? "Paused · " + (elapsedSec / 60) + " of " + goalMin + " min" : "En pausa · " + (elapsedSec / 60) + " de " + goalMin + " min");
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CH_TIMER)
                .setSmallIcon(R.drawable.ic_stat_bless)
                .setColor(0xFF7C6CF0)
                .setContentTitle("⏱️ " + title)
                .setContentText(text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory("stopwatch")
                .setContentIntent(deepLinkIntent(ctx, "blesshabit://timer?habit=" + hid + "&do=open", 400001))
                .setShowWhen(running)
                .setUsesChronometer(running)
                .setWhen(System.currentTimeMillis() - elapsedSec * 1000L);
        // La barra no avanza sola (el reloj sí): solo se muestra en pausa.
        if (!running && goalSec > 0 && elapsedSec < goalSec) b.setProgress((int) goalSec, (int) elapsedSec, false);
        if (running) b.addAction(0, en ? "⏸ Pause" : "⏸ Pausar", deepLinkIntent(ctx, "blesshabit://timer?habit=" + hid + "&do=pause", 400002));
        else b.addAction(0, en ? "▶ Resume" : "▶ Reanudar", deepLinkIntent(ctx, "blesshabit://timer?habit=" + hid + "&do=resume", 400003));
        b.addAction(0, en ? "■ Finish" : "■ Finalizar", deepLinkIntent(ctx, "blesshabit://timer?habit=" + hid + "&do=finish", 400004));
        try { nm.notify(TIMER_NOTIF_ID, b.build()); } catch (SecurityException ignored) { }
    }

    static void hideTimer(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(TIMER_NOTIF_ID);
    }
}
