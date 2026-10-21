package app.blesshabit.android;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Widget de la pantalla de inicio. Tres formas, elegidas en Perfil → Widget:
 *  - "summary" (Resumen): progreso de hoy + próximo hábito.
 *  - "list" (Lista): los hábitos de hoy con su círculo de hecho/pendiente.
 *  - "single" (Un hábito): un hábito elegido, grande.
 *
 * La app (la web del WebView) guarda con BlessDevicePlugin.updateWidget:
 *   {"date","done":[ids hechos ese día],
 *    "habits":[{"id","key","label","icon","days":[0-6],"times":{"0":"HH:MM"},"until"}],
 *    "cfg":{layout,title,bg,text,iconMode,iconColor,transparent,opacity,
 *           showToday,showProgress,showTime,singleHabitId,textSize,corners}}
 * El día lo calcula el widget (a medianoche vuelve a 0 solo). Tocarlo abre la app.
 */
public class BlessWidgetProvider extends AppWidgetProvider {

    static final String PREFS = "bless_widget";
    static final String KEY_DATA = "data";

    private static final int[] ROW = {R.id.w_row1, R.id.w_row2, R.id.w_row3, R.id.w_row4, R.id.w_row5};
    private static final int[] RING = {R.id.w1_ring, R.id.w2_ring, R.id.w3_ring, R.id.w4_ring, R.id.w5_ring};
    private static final int[] DOT = {R.id.w1_dot, R.id.w2_dot, R.id.w3_dot, R.id.w4_dot, R.id.w5_dot};
    private static final int[] TICK = {R.id.w1_tick, R.id.w2_tick, R.id.w3_tick, R.id.w4_tick, R.id.w5_tick};
    private static final int[] EMOJI = {R.id.w_emoji1, R.id.w_emoji2, R.id.w_emoji3, R.id.w_emoji4, R.id.w_emoji5};
    private static final int[] ICON = {R.id.w_icon1, R.id.w_icon2, R.id.w_icon3, R.id.w_icon4, R.id.w_icon5};
    private static final int[] LABEL = {R.id.w_label1, R.id.w_label2, R.id.w_label3, R.id.w_label4, R.id.w_label5};
    private static final int[] TIME = {R.id.w_time1, R.id.w_time2, R.id.w_time3, R.id.w_time4, R.id.w_time5};

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, buildViews(context, manager, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle newOptions) {
        // Al agrandar o achicar el widget, la Lista muestra más o menos filas.
        manager.updateAppWidget(id, buildViews(context, manager, id));
    }

    /** Vuelve a dibujar todos los widgets (cuando la app guarda datos nuevos). */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, BlessWidgetProvider.class));
        if (ids == null) return;
        for (int id : ids) manager.updateAppWidget(id, buildViews(context, manager, id));
    }

    // ------------------------------------------------------------------ datos

    static class Habit {
        String id, key, label, icon, time;
        boolean done;
    }

    static class Cfg {
        String layout = "list", title = null, iconMode = "original", textSize = "m", corners = "round";
        int bg = 0xFFD6E8FA, text = 0xFF1F1C4B, iconColor = 0xFF8B6CF6, opacity = 90;
        boolean transparent = false, showToday = true, showProgress = true, showTime = false;
        String singleHabitId = null;
    }

    static class Day {
        List<Habit> today = new ArrayList<>(); // hábitos que tocan hoy, ordenados por hora
        List<Habit> all = new ArrayList<>();   // todos (para "Un hábito" aunque no toque hoy)
        int done, total;
        Habit next;
        boolean hasData;
    }

    static int parseColor(String s, int def) {
        try { return s == null || s.isEmpty() ? def : Color.parseColor(s); } catch (Exception e) { return def; }
    }

    static Cfg readCfg(JSONObject data) {
        Cfg c = new Cfg();
        JSONObject j = data == null ? null : data.optJSONObject("cfg");
        if (j == null) return c;
        c.layout = j.optString("layout", c.layout);
        c.title = j.optString("title", "").trim();
        if (c.title.isEmpty()) c.title = null;
        c.bg = parseColor(j.optString("bg"), c.bg);
        c.text = parseColor(j.optString("text"), c.text);
        c.iconColor = parseColor(j.optString("iconColor"), c.iconColor);
        c.iconMode = j.optString("iconMode", c.iconMode);
        c.transparent = j.optBoolean("transparent", false);
        c.opacity = Math.max(0, Math.min(100, j.optInt("opacity", c.opacity)));
        c.showToday = j.optBoolean("showToday", true);
        c.showProgress = j.optBoolean("showProgress", true);
        c.showTime = j.optBoolean("showTime", false);
        c.singleHabitId = j.optString("singleHabitId", "");
        c.textSize = j.optString("textSize", "m");
        c.corners = j.optString("corners", "round");
        return c;
    }

    static Day readDay(JSONObject data, Calendar now) {
        Day d = new Day();
        if (data == null) return d;
        d.hasData = true;
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now.getTime());
        int dow = now.get(Calendar.DAY_OF_WEEK) - 1; // Calendar: domingo = 1
        String nowHm = String.format(Locale.US, "%02d:%02d", now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE));
        Set<String> doneIds = new HashSet<>();
        if (today.equals(data.optString("date"))) {
            JSONArray dn = data.optJSONArray("done");
            if (dn != null) for (int i = 0; i < dn.length(); i++) doneIds.add(dn.optString(i));
        }
        JSONArray habits = data.optJSONArray("habits");
        if (habits == null) return d;
        for (int i = 0; i < habits.length(); i++) {
            JSONObject h = habits.optJSONObject(i);
            if (h == null) continue;
            Habit x = new Habit();
            x.id = h.optString("id");
            x.key = h.optString("key", "general");
            x.label = h.optString("label");
            x.icon = h.optString("icon", "🌱");
            x.done = doneIds.contains(x.id);
            x.time = timeFor(h, dow);
            d.all.add(x);
            String until = h.optString("until", "");
            if (!hasDay(h.optJSONArray("days"), dow)) continue;
            if (!until.isEmpty() && until.compareTo(today) < 0) continue;
            d.today.add(x);
            d.total++;
            if (x.done) d.done++;
        }
        Collections.sort(d.today, (a, b) -> String.valueOf(a.time).compareTo(String.valueOf(b.time)));
        for (Habit x : d.today) {
            if (!x.done && x.time != null && x.time.compareTo(nowHm) >= 0) { d.next = x; break; }
        }
        return d;
    }

    private static boolean hasDay(JSONArray days, int dow) {
        if (days == null) return false;
        for (int i = 0; i < days.length(); i++) if (days.optInt(i, -1) == dow) return true;
        return false;
    }

    private static String timeFor(JSONObject h, int dow) {
        JSONObject times = h.optJSONObject("times");
        String tm = times != null ? times.optString(String.valueOf(dow), "") : "";
        return tm.isEmpty() ? null : tm;
    }

    // ------------------------------------------------------------------ dibujo

    static RemoteViews buildViews(Context ctx, AppWidgetManager manager, int widgetId) {
        String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_DATA, null);
        JSONObject data = null;
        try { if (raw != null) data = new JSONObject(raw); } catch (Exception ignored) { }
        Cfg c = readCfg(data);
        Day d = readDay(data, Calendar.getInstance());

        int layout = "summary".equals(c.layout) ? R.layout.widget_summary
                : "single".equals(c.layout) ? R.layout.widget_single : R.layout.widget_list;
        RemoteViews v = new RemoteViews(ctx.getPackageName(), layout);

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(ctx, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        float scale = "s".equals(c.textSize) ? 0.88f : "l".equals(c.textSize) ? 1.15f : 1f;
        int dim = withAlpha(c.text, 0.62f);

        // Fondo: color, esquinas y transparencia.
        int bgRes = "square".equals(c.corners) ? R.drawable.widget_bg_square
                : "soft".equals(c.corners) ? R.drawable.widget_bg_soft : R.drawable.widget_bg_round;
        v.setImageViewResource(R.id.w_bg, bgRes);
        v.setInt(R.id.w_bg, "setColorFilter", c.bg | 0xFF000000);
        v.setInt(R.id.w_bg, "setImageAlpha", c.transparent ? 0 : Math.round(c.opacity * 2.55f));

        // Encabezado
        v.setTextViewText(R.id.w_title, c.title != null ? c.title : ctx.getString(R.string.widget_title));
        v.setTextColor(R.id.w_title, c.text);
        size(v, R.id.w_title, 16, scale);
        v.setViewVisibility(R.id.w_today, c.showToday ? View.VISIBLE : View.GONE);
        v.setTextColor(R.id.w_today, dim);
        size(v, R.id.w_today, 13, scale);

        if ("single".equals(c.layout)) drawSingle(ctx, v, c, d, dim, scale);
        else if ("summary".equals(c.layout)) drawSummary(ctx, v, c, d, dim, scale);
        else drawList(ctx, v, c, d, dim, scale, rowsFor(manager, widgetId));
        return v;
    }

    private static void drawProgress(Context ctx, RemoteViews v, Cfg c, Day d, int dim, float scale) {
        v.setViewVisibility(R.id.w_progress_row, c.showProgress && d.total > 0 ? View.VISIBLE : View.GONE);
        int pct = d.total == 0 ? 0 : Math.round(d.done * 100f / d.total);
        v.setProgressBar(R.id.w_progress, 100, pct, false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            v.setColorStateList(R.id.w_progress, "setProgressTintList", ColorStateList.valueOf(c.iconColor));
            v.setColorStateList(R.id.w_progress, "setProgressBackgroundTintList", ColorStateList.valueOf(withAlpha(c.text, 0.15f)));
        }
        v.setTextViewText(R.id.w_progress_text, ctx.getString(R.string.widget_x_of_y, d.done, d.total));
        v.setTextColor(R.id.w_progress_text, dim);
        size(v, R.id.w_progress_text, 12, scale);
    }

    private static void drawSummary(Context ctx, RemoteViews v, Cfg c, Day d, int dim, float scale) {
        drawProgress(ctx, v, c, d, dim, scale);
        String next;
        if (!d.hasData) next = ctx.getString(R.string.widget_open_app);
        else if (d.total == 0) next = ctx.getString(R.string.widget_no_habits_today);
        else if (d.done >= d.total) next = ctx.getString(R.string.widget_day_done);
        else if (d.next != null) next = ctx.getString(R.string.widget_next, d.next.icon + " " + d.next.label, d.next.time);
        else next = ctx.getString(R.string.widget_pending, d.total - d.done);
        v.setTextViewText(R.id.w_next, next);
        v.setTextColor(R.id.w_next, withAlpha(c.text, 0.8f));
        size(v, R.id.w_next, 13, scale);
    }

    private static void drawList(Context ctx, RemoteViews v, Cfg c, Day d, int dim, float scale, int maxRows) {
        boolean mono = "mono".equals(c.iconMode);
        int shown = Math.min(maxRows, d.today.size());
        for (int i = 0; i < ROW.length; i++) {
            if (i >= shown) { v.setViewVisibility(ROW[i], View.GONE); continue; }
            Habit h = d.today.get(i);
            v.setViewVisibility(ROW[i], View.VISIBLE);
            check(v, RING[i], DOT[i], TICK[i], h.done, c, dim);
            icon(ctx, v, EMOJI[i], ICON[i], h, mono, c.iconColor, 17, scale);
            v.setTextViewText(LABEL[i], h.label);
            v.setTextColor(LABEL[i], c.text);
            size(v, LABEL[i], 15, scale);
            boolean showT = c.showTime && h.time != null;
            v.setViewVisibility(TIME[i], showT ? View.VISIBLE : View.GONE);
            if (showT) { v.setTextViewText(TIME[i], h.time); v.setTextColor(TIME[i], dim); size(v, TIME[i], 12, scale); }
        }
        String empty = null;
        if (!d.hasData) empty = ctx.getString(R.string.widget_open_app);
        else if (d.total == 0) empty = ctx.getString(R.string.widget_no_habits_today);
        else if (d.today.size() > shown) empty = ctx.getString(R.string.widget_more, d.today.size() - shown);
        v.setViewVisibility(R.id.w_empty, empty != null ? View.VISIBLE : View.GONE);
        if (empty != null) { v.setTextViewText(R.id.w_empty, empty); v.setTextColor(R.id.w_empty, dim); size(v, R.id.w_empty, 13, scale); }
        drawProgress(ctx, v, c, d, dim, scale);
    }

    private static void drawSingle(Context ctx, RemoteViews v, Cfg c, Day d, int dim, float scale) {
        Habit h = null;
        for (Habit x : d.all) if (x.id.equals(c.singleHabitId)) { h = x; break; }
        if (h == null && !d.today.isEmpty()) h = d.next != null ? d.next : d.today.get(0);
        if (h == null && !d.all.isEmpty()) h = d.all.get(0);
        boolean mono = "mono".equals(c.iconMode);
        v.setInt(R.id.w_single_circle, "setColorFilter", withAlpha(c.iconColor, 0.18f));
        if (h == null) {
            v.setTextViewText(R.id.w_single_emoji, "🌱");
            v.setTextViewText(R.id.w_single_label, ctx.getString(R.string.widget_title));
            v.setTextViewText(R.id.w_single_status, ctx.getString(d.hasData ? R.string.widget_no_habits_today : R.string.widget_open_app));
            check(v, R.id.w_single_ring, R.id.w_single_dot, R.id.w_single_tick, false, c, dim);
        } else {
            icon(ctx, v, R.id.w_single_emoji, R.id.w_single_icon, h, mono, c.iconColor, 24, scale);
            v.setTextViewText(R.id.w_single_label, h.label);
            boolean today = d.today.contains(h);
            String status = !today ? ctx.getString(R.string.widget_single_not_today)
                    : h.done ? ctx.getString(R.string.widget_single_done)
                    : h.time != null ? ctx.getString(R.string.widget_single_pending_at, h.time)
                    : ctx.getString(R.string.widget_single_pending);
            v.setTextViewText(R.id.w_single_status, status);
            check(v, R.id.w_single_ring, R.id.w_single_dot, R.id.w_single_tick, h.done, c, dim);
        }
        v.setTextColor(R.id.w_single_label, c.text);
        size(v, R.id.w_single_label, 18, scale);
        v.setTextColor(R.id.w_single_status, dim);
        size(v, R.id.w_single_status, 13, scale);
    }

    // ------------------------------------------------------------------ piezas

    private static void check(RemoteViews v, int ring, int dot, int tick, boolean done, Cfg c, int dim) {
        v.setViewVisibility(ring, done ? View.GONE : View.VISIBLE);
        v.setViewVisibility(dot, done ? View.VISIBLE : View.GONE);
        v.setViewVisibility(tick, done ? View.VISIBLE : View.GONE);
        v.setInt(ring, "setColorFilter", withAlpha(c.text, 0.45f));
        v.setInt(dot, "setColorFilter", c.iconColor | 0xFF000000);
        v.setInt(tick, "setColorFilter", 0xFFFFFFFF);
    }

    private static void icon(Context ctx, RemoteViews v, int emojiId, int iconId, Habit h, boolean mono, int color, float sp, float scale) {
        if (mono) {
            v.setViewVisibility(emojiId, View.GONE);
            v.setViewVisibility(iconId, View.VISIBLE);
            v.setImageViewResource(iconId, iconFor(ctx, h.key));
            v.setInt(iconId, "setColorFilter", color | 0xFF000000);
        } else {
            v.setViewVisibility(iconId, View.GONE);
            v.setViewVisibility(emojiId, View.VISIBLE);
            v.setTextViewText(emojiId, h.icon);
            size(v, emojiId, sp, scale);
        }
    }

    /** Ícono de un solo color según el tipo de hábito (res/drawable/wi_<tipo>.xml). */
    private static int iconFor(Context ctx, String key) {
        switch (key == null ? "" : key) {
            case "ejercicio": return R.drawable.wi_ejercicio;
            case "caminar": return R.drawable.wi_caminar;
            case "lectura": return R.drawable.wi_lectura;
            case "agua": return R.drawable.wi_agua;
            case "meditacion": return R.drawable.wi_meditacion;
            case "sueno": return R.drawable.wi_sueno;
            case "comida": return R.drawable.wi_comida;
            case "escritura": return R.drawable.wi_escritura;
            case "estudio": return R.drawable.wi_estudio;
            case "orden": return R.drawable.wi_orden;
            case "finanzas": return R.drawable.wi_finanzas;
            case "pantalla": return R.drawable.wi_pantalla;
            case "gratitud": return R.drawable.wi_gratitud;
            case "fumar": return R.drawable.wi_fumar;
            case "alcohol": return R.drawable.wi_alcohol;
            case "musica": return R.drawable.wi_musica;
            case "idioma": return R.drawable.wi_idioma;
            case "familia": return R.drawable.wi_familia;
            default: return R.drawable.wi_general;
        }
    }

    private static int rowsFor(AppWidgetManager manager, int widgetId) {
        if (manager == null) return 3;
        Bundle o = manager.getAppWidgetOptions(widgetId);
        int h = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (h <= 0) return 3;
        if (h < 130) return 2;
        if (h < 175) return 3;
        if (h < 220) return 4;
        return 5;
    }

    private static void size(RemoteViews v, int id, float sp, float scale) {
        v.setTextViewTextSize(id, TypedValue.COMPLEX_UNIT_SP, sp * scale);
    }

    static int withAlpha(int color, float a) {
        return (Math.round(255 * a) << 24) | (color & 0x00FFFFFF);
    }
}
