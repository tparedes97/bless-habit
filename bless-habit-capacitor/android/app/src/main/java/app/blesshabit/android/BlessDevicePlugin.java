package app.blesshabit.android;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.AlarmClock;
import android.provider.Settings;

import com.getcapacitor.JSArray;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ayuda a que los recordatorios lleguen con la app cerrada.
 *
 * Muchas marcas (Honor, Huawei, Xiaomi, Oppo, Vivo, Samsung…) cierran las apps
 * en segundo plano para ahorrar batería y con eso borran las alarmas
 * programadas. Este plugin dice si la app está "sin restricciones" de batería
 * y abre la pantalla de ajustes correcta de cada marca para permitirlo.
 */
@CapacitorPlugin(name = "BlessDevice")
public class BlessDevicePlugin extends Plugin {

    @PluginMethod
    public void getBackgroundStatus(PluginCall call) {
        Context ctx = getContext();
        boolean ignoring = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            ignoring = pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }
        JSObject ret = new JSObject();
        ret.put("ignoringBatteryOptimizations", ignoring);
        ret.put("manufacturer", Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase());
        ret.put("hasAutostartScreen", findAutostartIntent() != null);
        call.resolve(ret);
    }

    /** Abre la pantalla de "inicio automático / segundo plano" de la marca, o la de batería. */
    @PluginMethod
    public void openBackgroundSettings(PluginCall call) {
        Intent intent = findAutostartIntent();
        if (intent == null) intent = batteryIntent();
        if (!tryStart(intent)) tryStart(appDetailsIntent());
        call.resolve();
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        if (!tryStart(batteryIntent())) tryStart(appDetailsIntent());
        call.resolve();
    }

    /**
     * Crea una alarma en la app Reloj del teléfono (suena aunque Bless esté
     * cerrada o el teléfono en silencio). Recibe hour, minutes, message y,
     * opcionalmente, days: días de la semana con 0 = domingo … 6 = sábado
     * (si no vienen, es una alarma de una sola vez a la próxima hora indicada).
     */
    @PluginMethod
    public void setAlarm(PluginCall call) {
        Integer hour = call.getInt("hour");
        Integer minutes = call.getInt("minutes");
        if (hour == null || minutes == null) { call.reject("hour y minutes son obligatorios"); return; }
        Intent i = new Intent(AlarmClock.ACTION_SET_ALARM);
        i.putExtra(AlarmClock.EXTRA_HOUR, hour);
        i.putExtra(AlarmClock.EXTRA_MINUTES, minutes);
        String message = call.getString("message", "Bless Habit");
        i.putExtra(AlarmClock.EXTRA_MESSAGE, message);
        i.putExtra(AlarmClock.EXTRA_SKIP_UI, call.getBoolean("skipUi", false));
        JSArray days = call.getArray("days");
        if (days != null && days.length() > 0) {
            java.util.ArrayList<Integer> list = new java.util.ArrayList<>();
            for (int k = 0; k < days.length(); k++) {
                int d = days.optInt(k, -1);
                // java.util.Calendar: SUNDAY = 1 … SATURDAY = 7
                if (d >= 0 && d <= 6) list.add(d + 1);
            }
            if (!list.isEmpty()) i.putExtra(AlarmClock.EXTRA_DAYS, list);
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        JSObject ret = new JSObject();
        if (i.resolveActivity(getContext().getPackageManager()) == null) {
            ret.put("ok", false);
            ret.put("reason", "no_clock_app");
            call.resolve(ret);
            return;
        }
        ret.put("ok", tryStart(i));
        call.resolve(ret);
    }

    private Intent findAutostartIntent() {
        String[][] candidates = {
            // Honor (Magic UI) y Huawei (EMUI)
            {"com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
            {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
            {"com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"},
            // Xiaomi / Redmi / POCO
            {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
            // Oppo / Realme / OnePlus (ColorOS)
            {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
            {"com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"},
            {"com.oplus.battery", "com.oplus.powermanager.fuelgaue.PowerUsageModelActivity"},
            // Vivo
            {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"},
            {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"},
            // Samsung
            {"com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity"},
        };
        for (String[] c : candidates) {
            Intent i = new Intent().setComponent(new ComponentName(c[0], c[1]));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (i.resolveActivity(getContext().getPackageManager()) != null) return i;
        }
        return null;
    }

    private Intent batteryIntent() {
        Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return i;
    }

    private Intent appDetailsIntent() {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.fromParts("package", getContext().getPackageName(), null));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return i;
    }

    private boolean tryStart(Intent intent) {
        if (intent == null) return false;
        try {
            getContext().startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
