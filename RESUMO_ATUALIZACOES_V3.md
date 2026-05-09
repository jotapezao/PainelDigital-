# Guia de Referência Técnica - Atualizações V3

Este documento resume as principais implementações de sincronia, responsividade e ajustes nativos realizados na versão 3.0 do Painel Digital.

---

## 1. Sincronização em Tempo Real (Real-Time Push)

O sistema abandonou o polling para usar **WebSockets** via Socket.io.

### Fluxo de Funcionamento:
1.  **Registro**: Ao abrir o Player, o frontend emite `device:register`.
2.  **Backend**: O `server.js` identifica se é um ID de dispositivo (TV) ou de Usuário (App) e o coloca na sala `client:ID_DO_CLIENTE`.
3.  **Trigger**: No `playlistController.js`, as funções `update` e `setItems` chamam `notifyDevices`.
4.  **Notificação**: O servidor emite `playlist:updated` para a sala do cliente.
5.  **Refresh**: O Player recebe o evento e chama `fetchPlaylist()` instantaneamente.

---

## 2. Motor de Escalonamento de Layout

Garante a fidelidade visual entre o Editor (Admin) e o Player (TV/Celular).

### Logica de Cálculo:
- **Base do Editor**: 960px (Horizontal) / 540px (Vertical).
- **Proporção**: O Player calcula `scaleX = windowWidth / editorW` e `scaleY = windowHeight / editorH`.
- **Aplicação**: As coordenadas `clock_x`, `weather_y`, etc., são multiplicadas por esse fator antes de serem aplicadas ao `left` e `top` do widget.

---

## 3. Modo Imersivo Android (Full Screen)

Ajustes realizados no projeto nativo dentro de `frontend/android/app/src/main/`:

### MainActivity.java
- Adicionado `enableImmersiveMode()` que utiliza `WindowInsetsController` para esconder barras de sistema.
- Gerenciamento de Recorte de Tela (Notch): `layoutInDisplayCutoutMode` definido como `SHORT_EDGES` para cobrir a tela toda.
- Mantém a tela ligada permanentemente (`FLAG_KEEP_SCREEN_ON`).

### AndroidManifest.xml
- Atividade principal alterada para o tema `@style/AppTheme.NoActionBar` para evitar flashes da barra de título durante o carregamento.

---

## 4. Troubleshooting (Resolução de Problemas)

### Mudanças não aparecem no Android?
1.  Verifique se executou `npx cap sync android` após o `npm run build`.
2.  No Android Studio, use **Build > Clean Project** para forçar a limpeza do cache do WebView.

### Widgets desalinhados?
1.  Certifique-se de que a opção **"Usar Posições Customizadas"** está ativada na edição da Playlist.
2.  O sistema escala automaticamente, mas em celulares pequenos (Mobile), ele aplica adicionalmente um `scale(0.45)` global para evitar que o widget ocupe a tela inteira.

---

## 5. Variáveis de Ambiente Críticas
- `VITE_API_URL`: Deve apontar para a URL do backend (ex: `https://seu-api.railway.app`). O socket utilizará essa mesma URL para conexão.
