# Manual do Usuário - Painel Digital

Bem-vindo ao manual completo de operação do **Painel Digital**. Aqui você aprenderá a utilizar todas as funções administrativas e operacionais do sistema.

## 1. Acesso ao Sistema

Existem dois níveis de acesso na plataforma:
- **Administrador (`admin`)**: Possui controle total do sistema, pode criar novos clientes (empresas), definir configurações globais e cadastrar usuários.
- **Cliente (`client`)**: Acessa apenas as próprias mídias e planos. Se o cliente tentar logar, ele será **redirecionado automaticamente para o Player em Tela Cheia** para exibir as propagandas (não precisa apertar nenhum botão, o play é automático).

Para acessar o painel de gerenciamento como administrador, faça o login com suas credenciais. Se precisar interromper o player automático, basta clicar **3 vezes rapidamente** em qualquer lugar da tela e clicar no botão de "Sair" que aparecerá no canto direito.

---

## 2. Gerenciamento de Empresas (Clientes)
Antes de adicionar uma mídia ou plano, é necessário ter um Cliente cadastrado (apenas Admins fazem isso).

1. No menu lateral, vá em **Empresas**.
2. Clique em **Nova Empresa** e preencha os dados (Nome, Email, e Cota de Armazenamento - por padrão, o limite de uploads cumulativos é bloqueado em **10GB** por empresa).
3. Todas as mídias anexadas a essa empresa ficam isoladas para garantir privacidade.

---

## 3. Biblioteca de Mídias
É aqui onde você guarda seus arquivos (vídeos e imagens).

1. Vá em **Mídias** e clique em **Novo Arquivo**.
2. Arraste e solte o conteúdo ou selecione no explorador. O tamanho máximo permitido para um *único arquivo* é de **1GB**.
3. O painel salva essas mídias direto no Cloudflare R2, mantendo seu sistema leve e rápido.

---

## 4. Planos de Exibição (Playlists)
O coração do sistema. É onde você cria a programação visual que será exibida nas telas.

1. Vá em **Planos** e clique em **Novo Plano**.
2. A tela é dividida em 3 passos fáceis (Você pode deslizar os passos lateralmente caso esteja usando no Celular):
   - **Passo 1 (Informações)**: Defina o nome, qual o cliente dono daquele plano, orientação da TV (Vertical/Horizontal) e a forma de corte. **Dica**: Use o modo **Blur-fill (Preenchimento Desfocado)** para preencher vídeos ou fotos em formatos diferentes da TV usando uma borra de vidro inteligente no fundo!
   - **Passo 2 (Mídias)**: Escolha os vídeos e imagens, arraste e ordene a posição que devem tocar, e defina os segundos de cada foto (vídeos rodam até acabar automaticamente).
   - **Passo 3 (Personalização Visual)**: A grande mágica acontece aqui. 

### Personalizações Disponíveis (Passo 3)
- **Notícias RSS (Ticker)**: Adicione o link de um feed RSS (ex: *https://g1.globo.com/rss/g1/*) ou escreva uma mensagem manual. O rodapé animado buscará e passará essas notícias sem parar na tela. Você pode regular a opacidade, velocidade e a altura desse rodapé.
- **Relógio, Data e Clima**: Pode ativar e definir em qual dos 4 cantos da tela eles aparecem.
- **Redes Sociais Inteligentes**: Ative o card de rede social. Escolha a plataforma (Instagram, YouTube, etc.) e o seu @. 
  - Você pode habilitar um **QR Code dinâmico** que é gerado na hora!
  - Pode escolher entre 5 temas diferentes (Recomendamos o "Vibrante" ou "Vidro Moderno").
  - Você controla a transparência (`0.1` a `1.0`) dos cards por um controle deslizante.

---

## 5. Dispositivos (Telas)
Conecta a nuvem às suas televisões.

1. Instale o aplicativo (APK) na Android TV ou TV Box, abra o Player pelo link de cliente.
2. No menu **Dispositivos** do Painel Admin, cadastre o equipamento e veja em tempo real se ele está *Online* ou *Offline*.

---

## 6. Dúvidas e Suporte
O painel foi 100% projetado para ser responsivo, logo você pode montar toda uma playlist inteira e enviar para suas TVs diretamente do seu smartphone. Em caso de dúvidas, um atalho para suporte via WhatsApp fica disponível no rodapé do menu lateral do painel admin.
