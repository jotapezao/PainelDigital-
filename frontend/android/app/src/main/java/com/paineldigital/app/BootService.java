package com.paineldigital.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class BootService extends Service {
  private static final String CANAL_ID = "painel_digital_boot";
  private static final int NOTIFICACAO_ID = 1001;

  @Override
  public void onCreate() {
    super.onCreate();
    criarCanalNotificacaoSePreciso();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    Notification notificacao = criarNotificacao();
    startForeground(NOTIFICACAO_ID, notificacao);

    new Handler(Looper.getMainLooper()).postDelayed(() -> {
      tentarAbrirApp();
      stopForeground(true);
      stopSelf();
    }, 1500);

    return START_NOT_STICKY;
  }

  private void tentarAbrirApp() {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        Intent abrir = new Intent(this, MainActivity.class);
        abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(abrir);
      }
    } catch (Exception ignored) {
      // Em versões mais novas, o Android pode bloquear a abertura automática da Activity.
    }
  }

  private Notification criarNotificacao() {
    Intent abrir = new Intent(this, MainActivity.class);
    abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }
    PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, abrir, flags);

    return new NotificationCompat.Builder(this, CANAL_ID)
        .setContentTitle("Painel Digital")
        .setContentText("Iniciando o aplicativo após reinicialização.")
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentIntent(pendingIntent)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setOngoing(true)
        .build();
  }

  private void criarCanalNotificacaoSePreciso() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }
    NotificationManager nm = getSystemService(NotificationManager.class);
    if (nm == null) {
      return;
    }
    NotificationChannel canal = new NotificationChannel(
        CANAL_ID,
        "Inicialização do Painel Digital",
        NotificationManager.IMPORTANCE_LOW
    );
    nm.createNotificationChannel(canal);
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }
}
