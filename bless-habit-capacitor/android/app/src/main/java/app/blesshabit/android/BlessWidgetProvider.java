package app.blesshabit.android;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Widget de la pantalla de inicio: progreso de hoy y próximo hábito.
 *
 * La app (la web dentro del WebView) le deja los datos con
 * BlessDevicePlugin.updateWidget: la lista de hábitos con sus días y horas, y
 * cuáles ya marcó hoy. El widget calcula el día él mismo, así que al pasar la
 * medianoche vuelve a 0 aunque la app no se abra. Tocarlo abre la app.
 */
public class BlessWidgetProvider extends AppWidgetProvider {

    static final String PREFS = "bless_widget";
    static final String KEY_DATA = "data";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, buildViews(context));
    }

    /** Vuelve a dibujar todos los widgets (se llama cuando la app guarda datos nuevos). */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, BlessWidgetProvider.class));
        if (ids == null || ids.length == 0) return;
        RemoteViews views = buildViews(context);
        for (int id : ids) manager.updateAppWidget(id, views);
    }

    static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.bless_widget);

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pi);

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_DATA, null);
        Summary s = raw == null ? null : summarize(raw, Calendar.getInstance());
        applyStyle(context, views, raw);

        if (s == null) {
            // Todavía no hay datos: la app no se ha abierto desde que se puso el widget.
            views.setTextViewText(R.id.widget_count, "");
            views.setProgressBar(R.id.widget_progress, 100, 0, false);
            views.setTextViewText(R.id.widget_pct, "");
            views.setTextViewText(R.id.widget_next, context.getString(R.string.widget_open_app));
            return views;
        }
        if (s.total == 0) {
            views.setTextViewText(R.id.widget_count, "");
            views.setProgressBar(R.id.widget_progress, 100, 0, false);
            views.setTextViewText(R.id.widget_pct, "");
            views.setTextViewText(R.id.widget_next, context.getString(R.string.widget_no_habits_today));
            return views;
        }
        int pct = Math.round(s.done * 100f / s.total);
        views.setTextViewText(R.id.widget_count, s.done + "/" + s.total);
        views.setProgressBar(R.id.widget_progress, 100, pct, false);
        views.setTextViewText(R.id.widget_pct, pct + "%");
        String next;
        if (s.done >= s.total) next = context.getString(R.string.widget_day_done);
        else if (s.nextLabel != null) next = context.getString(R.string.widget_next, s.nextIcon + " " + s.nextLabel, s.nextTime);
        else next = context.getString(R.string.widget_pending, s.total - s.done);
        views.setTextViewText(R.id.widget_next, next);
        views.setViewVisibility(R.id.widget_progress, View.VISIBLE);
        return views;
    }

    /**
     * Estilo elegido en Perfil → Widget, para que combine con la pantalla de inicio:
     *  - "dynamic": colores del fondo de pantalla (Material You, Android 12+).
     *  - "auto": claro u oscuro según el modo del teléfono.
     *  - "light", "dark", "brand" (lavanda Bless).
     * opacity: 0–100, transparencia del fondo (0 = sin fondo).
     */
    static void applyStyle(Context context, RemoteViews views, String raw) {
        String style = "dynamic";
        int opacity = 100;
        try {
            if (raw != null) {
                JSONObject data = new JSONObject(raw);
                style = data.optString("style", style);
                opacity = Math.max(0, Math.min(100, data.optInt("opacity", opacity)));
            }
        } catch (Exception ignored) { }

        boolean night = (context.getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        if ("dynamic".equals(style) && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) style = "auto";
        if ("auto".equals(style)) style = night ? "dark" : "light";

        int bg, text, dim, accent;
        switch (style) {
            case "dynamic":
                bg = context.getColor(night ? android.R.color.system_neutral1_800 : android.R.color.system_accent1_50);
                text = context.getColor(night ? android.R.color.system_neutral1_50 : android.R.color.system_neutral1_900);
                dim = context.getColor(night ? android.R.color.system_neutral2_200 : android.R.color.system_neutral2_700);
                accent = context.getColor(night ? android.R.color.system_accent1_200 : android.R.color.system_accent1_600);
                break;
            case "dark":
                bg = 0xFF1E222B; text = 0xFFEEF0F3; dim = 0xFF9AA1AD; accent = 0xFFA99BFF;
                break;
            case "brand":
                bg = 0xFF7C6CF0; text = 0xFFFFFFFF; dim = 0xE6FFFFFF; accent = 0xFFFFFFFF;
                break;
            default: // light
                bg = 0xFFFFFFFF; text = 0xFF172033; dim = 0xFF6B6585; accent = 0xFF7C6CF0;
        }
        views.setInt(R.id.widget_bg, "setColorFilter", bg);
        views.setInt(R.id.widget_bg, "setImageAlpha", Math.round(opacity * 2.55f));
        views.setTextColor(R.id.widget_title, text);
        views.setTextColor(R.id.widget_count, accent);
        views.setTextColor(R.id.widget_pct, dim);
        views.setTextColor(R.id.widget_next, dim);
    }

    static class Summary {
        int done, total;
        String nextLabel, nextIcon, nextTime;
    }

    /**
     * data = {"date":"YYYY-MM-DD","done":[ids hechos ese día],
     *         "habits":[{"id","label","icon","days":[0-6, 0=domingo],"times":{"0":"HH:MM",…},"until":"YYYY-MM-DD"|""}]}
     */
    static Summary summarize(String raw, Calendar now) {
        try {
            JSONObject data = new JSONObject(raw);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now.getTime());
            int dow = now.get(Calendar.DAY_OF_WEEK) - 1; // Calendar: domingo = 1
            String nowHm = String.format(Locale.US, "%02d:%02d", now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE));

            Set<String> doneIds = new HashSet<>();
            if (today.equals(data.optString("date"))) {
                JSONArray d = data.optJSONArray("done");
                if (d != null) for (int i = 0; i < d.length(); i++) doneIds.add(d.optString(i));
            }

            Summary s = new Summary();
            JSONArray habits = data.optJSONArray("habits");
            if (habits == null) return s;
            List<JSONObject> pending = new ArrayList<>();
            for (int i = 0; i < habits.length(); i++) {
                JSONObject h = habits.optJSONObject(i);
                if (h == null || !hasDay(h.optJSONArray("days"), dow)) continue;
                String until = h.optString("until", "");
                if (!until.isEmpty() && until.compareTo(today) < 0) continue; // ya terminó
                s.total++;
                if (doneIds.contains(h.optString("id"))) s.done++;
                else pending.add(h);
            }
            // Próximo: el pendiente con la hora más cercana desde ahora.
            String bestTime = null;
            for (JSONObject h : pending) {
                String tm = timeFor(h, dow);
                if (tm.compareTo(nowHm) < 0) continue;
                if (bestTime == null || tm.compareTo(bestTime) < 0) {
                    bestTime = tm;
                    s.nextTime = tm;
                    s.nextLabel = h.optString("label");
                    s.nextIcon = h.optString("icon", "🌱");
                }
            }
            return s;
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean hasDay(JSONArray days, int dow) {
        if (days == null) return false;
        for (int i = 0; i < days.length(); i++) if (days.optInt(i, -1) == dow) return true;
        return false;
    }

    private static String timeFor(JSONObject h, int dow) {
        JSONObject times = h.optJSONObject("times");
        String tm = times != null ? times.optString(String.valueOf(dow), "") : "";
        return tm.isEmpty() ? "23:59" : tm;
    }
}
