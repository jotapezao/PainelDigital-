# Guia de Compilação do App Android (APK / AAB)

Este documento orienta o passo a passo para transformar a versão Web do **Painel Digital** (Player e Dashboard) em um aplicativo instalável de Android TV ou Tablet, utilizando o **Capacitor**.

## ⚙️ 1. Pré-Requisitos no Computador
Antes de começar, você precisa ter instalado no seu computador de desenvolvimento:

1. **Android Studio**: Necessário para gerar o arquivo APK. 
   - [Baixe aqui](https://developer.android.com/studio)
2. Crie ou instale um **Emulador Android** no Android Studio ou conecte um dispositivo via USB com o *Modo Depuração USB* ativo.

---

## 🛠️ 2. Preparação do Projeto (Frontend)
O projeto já está com todas as dependências do Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) pré-configuradas no `package.json` e o arquivo `capacitor.config.json` já foi gerado.

1. Abra o terminal na pasta `frontend`:
   ```bash
   cd "C:\Users\joaopaulo.f\Desktop\Painel Digital\frontend"
   ```
2. Instale as dependências (caso não tenha instalado):
   ```bash
   npm install
   ```
3. **Gere a build de produção** (Isto transforma o código React em HTML/JS/CSS puros na pasta `dist`):
   ```bash
   npm run build
   ```
4. **Adicione a plataforma Android** ao projeto Capacitor:
   ```bash
   npx cap add android
   ```
5. Copie os arquivos da pasta `dist` para dentro da pasta nativa do Android gerada pelo Capacitor:
   ```bash
   npx cap sync android
   ```

> **Dica**: Sempre que você fizer alterações no código do React (`Player.jsx`, etc), você precisará rodar novamente: `npm run build` seguido de `npx cap sync android`.

---

## 📱 3. Abrindo no Android Studio e Gerando o APK

1. Após o `sync`, rode o comando abaixo para abrir o projeto diretamente no Android Studio:
   ```bash
   npx cap open android
   ```
2. O Android Studio vai carregar e fazer o "Sync" do Gradle (pode demorar alguns minutos na primeira vez, uma barrinha carregará no canto inferior direito).
3. **Para testar em um dispositivo/emulador**:
   - Selecione o seu dispositivo no menu superior e clique no botão verde de "Play" (Run 'app').
4. **Para gerar o instalador (APK) para enviar para suas TVs**:
   - No menu superior do Android Studio, vá em: `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
   - Quando finalizar, aparecerá uma notificação flutuante no canto inferior direito. Clique em "locate" ou navegue até a pasta: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
   - Esse arquivo `.apk` é o seu instalador! Basta colocar num Pendrive ou subir no Google Drive para baixar na sua Android TV e instalar.

---

## 📡 4. Apontando para o Servidor de Produção
Por padrão, o APK será empacotado com a URL configurada no seu `.env` do Frontend (exemplo: seu domínio de produção). Certifique-se de que o backend já esteja rodando na internet (ex: Railway) e que o Frontend saiba conversar com ele.

Você pode instalar o app em quantas Android TVs quiser e todas sincronizarão perfeitamente através do backend!
