package app.blesshabit.android;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

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
