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
                        || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                        || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                        || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)
                        || "android.intent.action.REBOOT".equals(action)
                        || Intent.ACTION_USER_PRESENT.equals(action);

        if (!deveTratar) {
            return;
        }

        Intent abrir = new Intent(context, MainActivity.class);
        abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        
        try {
            // Tenta abrir a Activity diretamente (melhor chance em TV Boxes)
            context.startActivity(abrir);
        } catch (Exception e) {
            // Se falhar (ex: bloqueio do Android 10+ sem permissão SYSTEM_ALERT_WINDOW),
            // tenta via serviço de foreground que usa Full-Screen Intent
            try {
                Intent serviceIntent = new Intent(context, BootService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } catch (Exception ignored) {}
        }
    }
}
