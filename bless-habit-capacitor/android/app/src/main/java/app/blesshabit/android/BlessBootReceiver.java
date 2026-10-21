package app.blesshabit.android;

import android.app.AlarmManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Android borra las alarmas programadas al reiniciar el teléfono, al actualizar
 * la app y al cambiar la hora. Aquí se vuelven a programar desde lo guardado.
 */
public class BlessBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String a = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                || Intent.ACTION_TIME_CHANGED.equals(a)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(a)
                || "android.intent.action.QUICKBOOT_POWERON".equals(a)
                || AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED.equals(a)) {
            BlessReminders.restore(context);
            BlessWidgetProvider.refreshAll(context);
        }
    }
}
