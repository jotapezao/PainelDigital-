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

## 🔁 4. Iniciar o app automaticamente após reiniciar (Android 8+)
O projeto Android já inclui um receiver de boot e um serviço para tentar iniciar o aplicativo após reinicialização.

Na prática, em muitos dispositivos o Android pode limitar inicialização automática. Para garantir comportamento “kiosk” em TV/Box, o método mais confiável é:
1. Ir em **Configurações do Android** > **Apps** > **Apps padrão**.
2. Definir o **Aplicativo de Tela Inicial (Launcher/Home)** como **Painel Digital**.
3. Desativar otimizações de bateria para o app (quando existir no dispositivo).

---

## 📡 5. Apontando para o Servidor de Produção
Por padrão, o APK será empacotado com a URL configurada no seu `.env` do Frontend (exemplo: seu domínio de produção). Certifique-se de que o backend já esteja rodando na internet (ex: Railway) e que o Frontend saiba conversar com ele.

Você pode instalar o app em quantas Android TVs quiser e todas sincronizarão perfeitamente através do backend!

---

## 🤖 6. Automação Completa de Build, Versão e Release

Para facilitar e agilizar o processo de atualização do aplicativo, criamos um assistente interativo que faz todo o trabalho pesado de forma automática!

### O que o assistente faz?
1. **Lê e incrementa a versão** no arquivo `build.gradle` e no código do React (`UpdateManager.jsx`).
2. **Gera a build do React** (`npm run build`) e sincroniza com o Capacitor (`npx cap sync android`).
3. **Compila o APK nativo** em plano de fundo usando o Gradle local (`assembleDebug`).
4. **Copia e renomeia o APK** para a pasta `/releases` com o nome da versão (ex: `PainelDigital-v1.0.1.apk`).
5. **Cria um Release no GitHub** e faz o upload automático do APK como asset.
6. **Atualiza o Banco de Dados local** com a nova versão e o link de download direto do APK.
7. **Faz o commit e push** das alterações de versão para o seu repositório no GitHub.

### Como usar o assistente?
1. No terminal do projeto, execute o comando:
   ```bash
   npm run release
   ```
2. O assistente é totalmente interativo e perguntará o que você deseja fazer em cada etapa (basta responder com `S` para Sim ou `N` para Não).

### Pré-requisitos para Recursos Online (GitHub/Database):
- **Token do GitHub**: Para fazer upload automático dos APKs nas Releases do seu repositório, crie um *Personal Access Token (PAT)* no GitHub com permissão `repo` e configure-o como `GITHUB_TOKEN=seu_token` no seu `.env` do backend ou insira-o quando solicitado pelo script.
- **Integração no Sistema**: Ao criar a Release no GitHub, se o campo **Repositório GitHub** nas configurações do Painel Digital (`Settings.jsx` / `/settings` no painel administrativo) estiver configurado com o nome do seu repositório (ex: `jotapezao/PainelDigital-`), o backend irá buscar as novas versões automaticamente usando a API do GitHub sem nenhuma configuração adicional!

