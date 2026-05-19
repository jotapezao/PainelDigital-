package com.paineldigital.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) {
            return;
        }

        boolean deveTratar =
                Intent.ACTION_BOOT_COMPLETED.equals(action)
                        || "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action)
                        || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action);

        if (!deveTratar) {
            return;
        }

        Intent serviceIntent = new Intent(context, BootService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception ignored) {
            // Se não for possível iniciar o serviço, tenta abrir a Activity (pode falhar em versões novas).
            try {
                Intent abrir = new Intent(context, MainActivity.class);
                abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(abrir);
            } catch (Exception ignoredToo) {
                // Sem ação adicional.
            }
        }
    }
}
