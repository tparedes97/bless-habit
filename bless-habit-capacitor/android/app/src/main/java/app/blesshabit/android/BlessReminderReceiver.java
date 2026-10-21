package app.blesshabit.android;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Recibe la alarma programada (y el botón "Detener") y muestra o quita el aviso. */
public class BlessReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        int id = intent.getIntExtra("id", 0);
        if (BlessReminders.ACTION_STOP.equals(action)) {
            BlessReminders.stop(context, id);
            return;
        }
        if (BlessReminders.ACTION_FIRE.equals(action)) {
            BlessReminders.show(context, id,
                    intent.getStringExtra("title"),
                    intent.getStringExtra("body"),
                    intent.getBooleanExtra("alarm", false));
            // El widget también se pone al día con la hora (próximo hábito).
            BlessWidgetProvider.refreshAll(context);
        }
    }
}
