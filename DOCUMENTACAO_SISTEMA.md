# Detalhamento Completo do Sistema - Painel Digital

Este documento descreve exaustivamente todas as funcionalidades, fluxos de uso, funções de negócio, parâmetros de componentes e arquitetura que compõem o **Painel Digital**, cobrindo o Backend (API) e o Frontend (React Dashboard e Player Nativo).

---

## 1. Visão Geral da Plataforma

O **Painel Digital** é uma plataforma SaaS (Software as a Service) Multi-Tenant desenvolvida para gerenciamento remoto de Mídia Indoor (TV Corporativa, Painéis de LED, Menuboards e Totens).

**Stack Tecnológico:**
*   **Backend**: Node.js + Express.
*   **Banco de Dados**: PostgreSQL (Relacional, armazenando metadados de mídia, configurações de widgets e filas de reprodução).
*   **Storage Cloud**: Cloudflare R2 (API S3-compatible). Reduz custos de banda (egress zero) e fornece CDN ultrarrápida para entrega de vídeos pesados às TVs.
*   **Frontend Web / App**: React.js com Vite. Interface de gerenciamento e motor de renderização do Player unificados no mesmo SPA (Single Page Application).
*   **Empacotamento Mobile/TV**: Capacitor.js (Transforma a aplicação Web em APK nativo para rodar embarcado nas Android TVs ou TV Boxes).

---

## 2. Fluxos de Autenticação e UX Adaptativa

O sistema utiliza JWT (JSON Web Tokens) e adapta inteiramente a interface baseado na "Role" (nível de acesso) do usuário que fez o login.

### 2.1. O Modo Administrador (`admin`)
*   **Dashboard Completo**: Acesso aos gráficos de utilização, cadastro de Empresas, upload de mídias globais e acompanhamento do status Online/Offline de todos os monitores conectados.
*   **Controle Centralizado**: Pode intervir nas playlists de todos os clientes em tempo real.

### 2.2. O Modo Cliente (`client` / Auto-Player)
*   **Experiência "Zero Clique" (Kiosk Mode)**: Quando uma conta nível `client` se autentica, ela **não visualiza menus administrativos**. O sistema identifica a "Role", busca no banco de dados o Plano de Exibição (Playlist) marcado como *ativo* para aquele cliente e **inicia automaticamente a reprodução em tela cheia**.
*   **Escape Hatch (Menu Oculto)**: Como o Player remove toda a interface (barras, botões), caso o instalador precise sair do player ou deslogar, basta clicar (ou tocar) **3 vezes rapidamente** (Triple-Click) na tela. Isso faz surgir um botão flutuante temporário "Sair" e "Voltar ao Painel".

---

## 3. Detalhamento dos Módulos Administrativos

### 3.1. Módulo de Empresas (Clientes Multi-Tenant)
Gerencia quem tem acesso à plataforma.
*   **Isolamento de Dados**: Toda mídia ou playlist criada pertence a uma Empresa, impedindo vazamento de dados corporativos entre clientes diferentes.
*   **Cota de Armazenamento (`storage_quota`)**: O sistema defende a integridade do disco/nuvem bloqueando novos uploads se a cota total for atingida (Padrão: 10GB, customizável pelo Admin ao editar o cliente).

### 3.2. Biblioteca de Mídias (Pipeline de Upload)
*   **Upload em Stream**: Ao enviar um arquivo, o Multer recebe o *stream* via Node.js e repassa simultaneamente para o Cloudflare R2, sem estourar a memória RAM do servidor.
*   **Limites de Arquivo**: Configurado para aceitar arquivos de até **1GB** por envio, focando em suportar vídeos 4K prolongados.
*   **Clean Up Lógico**: Caso uma mídia seja deletada da biblioteca, o backend aciona uma API para apagar o arquivo real no Cloudflare R2, evitando arquivos órfãos pagando hospedagem indevida.
*   **Preview**: O dashboard gera previews das imagens e vídeos antes mesmo de serem alocados num Plano de Exibição.

### 3.3. Dispositivos (Monitoramento e Heartbeat)
Permite saber se uma TV ligada lá na ponta está de fato rodando a programação.
*   **Cadastro Simplificado**: Cada TV recebe um nome (ex: "TV Recepção - Matriz").
*   **Heartbeat Constante**: O aplicativo Player envia um sinal "Estou Vivo" (Heartbeat ping) para a API a cada poucos minutos. 
*   **Status Online/Offline**: No Dashboard do Admin, dispositivos que não reportaram ping nos últimos 5 minutos ficam vermelhos (Offline), ajudando na manutenção proativa de TVs desligadas ou sem internet.

---

## 4. Playlists e Editor de Planos (O Coração do Sistema)

O Playlist Editor é o módulo mais complexo da aplicação, atuando quase como um software de edição de vídeo em nuvem. Ele controla exatamente a diagramação e comportamento final da TV.

### 4.1. Fila de Reprodução (Items)
A ordem na qual as imagens e vídeos aparecem na tela, manipuladas por *Drag and Drop*.
*   **Duração Inteligente (`duration_seconds`)**: Para imagens, o cliente define quantos segundos quer que ela fique em tela (ex: 15s). Para vídeos, o sistema entende a extensão `.mp4` ou tipo de mime, ignora o tempo predefinido, espera o vídeo carregar nativamente e avança a fila *apenas e exatamente* quando o vídeo der o trigger de evento de "Fim de Reprodução" do HTML5.

### 4.2. Efeitos e Comportamento Visual
*   **`transition_effect`**: Ao invés de uma troca seca e feia entre uma foto e outra, o React aplica animações CSS de Fade (Esmaecer), Slide (Deslizar lados) ou Zoom, disfarçando o tempo de carregamento da próxima mídia na rede.
*   **`scale_mode` (A Mágica do Blur-fill)**: O maior problema em Painéis Digitais é colocar uma imagem quadrada/vertical numa TV horizontal. O modo `blur-fill` cria um clone da própria imagem que está tocando, aplica um desfoque máximo no fundo da tela em formato 16:9, e sobrepõe a imagem original no centro sem distorcê-la. O resultado é profissional e automático.
*   **`orientation`**: Gira o layout do HTML via CSS Transformations (`horizontal` vs `portrait`). Extremamente útil para Menu Boards e Totens de shopping que ficam na vertical (9:16).

---

## 5. Super Widgets Dinâmicos

Os Widgets não são gravados no vídeo. Eles flutuam por cima das mídias rodando em HTML puro e interativo, reagindo à internet.

### 5.1. Widget: Notícias RSS & Ticker Animado
Uma faixa rodapé ou topo (News Ticker) semelhante a canais de notícias na TV (GloboNews, CNN).
*   **`rss_url`**: Busca em tempo real feeds de notícias XML de provedores da internet (G1, BBC). O sistema converte o XML em um scroll de notícias sem fim.
*   **Controle Fino**: Permite definir `ticker_speed` (Velocidade do scroll), `ticker_direction` (Direita para Esquerda ou Esquerda para Direita), `ticker_height` (Tamanho da faixa) e a cor de tema.
*   **Efeito Glassmorphism (`ticker_blur`)**: A faixa pode ser opaca ou aplicar um efeito de vidro (blur do CSS), permitindo que o vídeo original seja sutilmente visível atrás da caixa de notícias.

### 5.2. Widget: Relógio, Clima e Progresso
*   **Posicionamento Livres (`widget_position`)**: Relógio e Clima podem ser afixados em qualquer um dos 4 cantos da tela.
*   **`show_progress_bar`**: Uma fina linha na extrema borda inferior da tela, que cresce sutilmente de 0% a 100% durante os segundos configurados na foto, ou baseado no tempo do vídeo, indicando visualmente quando a mídia vai passar.

### 5.3. Widget: Redes Sociais Inteligentes (Com QR Code)
Um card de alta conversão projetado para fazer quem passa pela TV seguir a empresa.
*   **Renderização SVG Premium (`social_platform`)**: Se o cliente selecionar Instagram, a logo oficial carrega em formato vetorial sem perder resolução.
*   **Estilos Dinâmicos (`social_card_style`)**: O usuário altera com um clique a estética do card:
    *   *Vidro Moderno*: Translúcido com reflexo.
    *   *Escuro Minimalista*: Discreto em tom grafite.
    *   *Vibrante*: Usa a cor original da rede (ex: rosa/laranja do Instagram, vermelho do Youtube).
    *   *Claro*: Fundo sólido branco com sombras suaves.
    *   *Arredondado / Pílula*: Formato oval para locais sem cantos vivos.
*   **Geração Real-Time de QR Code (`social_qrcode`)**: Se ativo, o painel processa a plataforma e o "@" (`social_handle`) digitado, constrói a URL e injeta um QR Code válido na tela sem precisar hospedar ou baixar nenhuma imagem extra.
*   **Transparência Granular (`card_transparency`)**: Controle de opacidade num slider indo de 10% a 100%, garantindo que o card não bloqueie a visualização vital do vídeo que corre atrás dele.

---

## 6. Motor do Player (Engine de Exibição)
A engine que roda na ponta (nas TVs) é o ápice da lógica.

*   **Auto-Restart e Resiliência**: Caso a conexão com a internet ou R2 caia enquanto baixa a próxima mídia, o player tem tratamento de erros (`onError`). Ele cancela a transição e pula para a mídia seguinte já cacheada, não deixando a tela ficar preta ("tela morta" em locais públicos).
*   **Polling de Sincronia**: A TV não precisa ser reiniciada quando o administrador muda uma playlist lá no escritório. O Player checa a API e percebe que as configurações do Plano de Exibição mudaram, reinjetando a nova fila *on-the-fly* (ao vivo).
*   **Leanback Support**: No momento do empacotamento (Build Capacitor para Android Studio), o *Manifest* é assinado com categorias exclusivas para TV (`CATEGORY_LEANBACK_LAUNCHER`), fazendo com que o app fique controlável pelo controle remoto direcional da TV Box, sem precisar de mouse.
