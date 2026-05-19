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
    - **Passo 1 (Informações)**: Defina o nome (você também pode editá-lo diretamente no cabeçalho superior do Editor Pro sem sair do editor), qual o cliente dono daquele plano, orientação da TV (Vertical/Horizontal) e a forma de corte. **Dica**: Use o modo **Blur-fill (Preenchimento Desfocado)** para preencher vídeos ou fotos em formatos diferentes da TV usando uma borra de vidro inteligente no fundo!
   - **Passo 2 (Mídias)**: Escolha os vídeos e imagens, arraste e ordene a posição que devem tocar. **Vídeos entram automaticamente com a sua duração original**. Se você decidir encurtar ou alongar o tempo de um vídeo manualmente, a timeline exibirá um aviso: *"Tempo definido excede o tempo do video ou é menor que a duração do video"*, permitindo o ajuste consciente. Ao término do último item, a playlist sempre reinicia do início de forma nativa e automática.
   - **Passo 3 (Personalização Visual)**: A grande mágica acontece aqui. 

### Personalizações Disponíveis (Passo 3)
- **Notícias RSS (Ticker)**: Adicione o link de um feed RSS (ex: *https://g1.globo.com/rss/g1/*) ou escreva uma mensagem manual. O rodapé animado buscará e passará essas notícias sem parar na tela. Você pode regular a opacidade, velocidade e a altura desse rodapé.
- **Relógio, Data e Clima**: Pode ativar e definir em qual dos 4 cantos da tela eles aparecem.
- **Widget de Redes Sociais e Campanhas**: Ative o card de conversão visual. Ele foi expandido para ir além de redes tradicionais (Instagram, YouTube, TikTok, Facebook), integrando agora **WhatsApp (Fale Conosco)**, **Site/Linktree** e **Campanhas de Divulgação Genéricas**.
  - **Título Inteligente**: O card ajusta o cabeçalho automaticamente (ex: *"Fale pelo WhatsApp:"*, *"Acesse o Link:"*, *"Siga no Instagram:"*).
  - **QR Code Dinâmico**: Gera instantaneamente na tela o QR Code do seu link ou número cadastrado, facilitando a interação física do espectador.
  - **Estilos Visuais**: Escolha entre os temas Vidro Moderno, Escuro Minimalista, Vibrante (usa a cor oficial da rede, inclusive o verde no WhatsApp), Claro e Pílula. Controlado por um slider suave de opacidade para não obstruir o conteúdo principal.

---

## 5. Dispositivos (Telas)
Conecta a nuvem às suas televisões.

1. Instale o aplicativo (APK) na Android TV ou TV Box, abra o Player pelo link de cliente.
2. No menu **Dispositivos** do Painel Admin, cadastre o equipamento e veja em tempo real se ele está *Online* ou *Offline*.

### Dica profissional (mais estabilidade)
Quando o APK está rodando em TV/Box, o Player pode manter o plano e as mídias em cache local e sincronizar apenas mudanças. Isso reduz travamentos em redes lentas e mantém a exibição mesmo com oscilações de internet.

---

## 6. Dúvidas e Suporte
O painel foi 100% projetado para ser responsivo, logo você pode montar toda uma playlist inteira e enviar para suas TVs diretamente do seu smartphone. Em caso de dúvidas, um atalho para suporte via WhatsApp fica disponível no rodapé do menu lateral do painel admin.
