# Painel Digital - Digital Signage Platform

Plataforma profissional para gerenciamento de Mídia Indoor (Digital Signage) e TV Corporativa. O **Painel Digital** permite o controle remoto de múltiplos dispositivos, agendamento de playlists, e exibição de widgets interativos (Clima, Relógio, Notícias RSS, e Redes Sociais).

## 🚀 Arquitetura e Tecnologias

O sistema é construído utilizando tecnologias modernas e escaláveis:

### Backend
- **Node.js + Express**: API rápida e assíncrona.
- **PostgreSQL**: Banco de dados relacional robusto.
- **Cloudflare R2 (S3 API)**: Armazenamento distribuído e econômico para vídeos e imagens pesadas.
- **Multer**: Gerenciamento de Uploads seguro com limite estabelecido de 1GB por arquivo.

### Frontend
- **React.js (Vite)**: Renderização veloz e reativa.
- **Context API**: Gerenciamento de estado global.
- **Integração SVG nativa**: Ícones dinâmicos de alta qualidade.
- **Design System Responsivo**: Layout construído do zero com foco em adaptação (Mobile, Tablet, Desktop, TV).

## 🌟 Funcionalidades Principais

- **Multi-tenant (Multi-Empresas)**: Administração central de múltiplos clientes isolados.
- **Automação de Player**: Contas de cliente iniciam o player imediatamente ao fazer login (`autoStart=true`).
- **Widgets de Alta Personalização**:
  - **Redes Sociais**: 5 estilos (Vidro Moderno, Minimalista, Vibrante, Claro, Pílula) com suporte a QR Code em tempo real.
  - **Relógio e Clima**: Personalizáveis nos quatro cantos da tela.
  - **Notícias RSS (Ticker)**: Rodapé rotativo animado (LTR ou RTL) com controle de velocidade, altura e fontes. Integração transparente via `rss2json`.
- **Efeitos Premium de Mídia**: 
  - Controle global de Transições (Fade, Slide, Zoom).
  - Modos de enquadramento de vídeo/imagem, incluindo o efeito avançado **Blur-fill** (Preenchimento com fundo desfocado em tempo real).
- **Controle Operacional**: Auditoria de sistema e visualização do Status de "Vida" (Heartbeat) de cada tela remotamente.

## 📦 Estrutura do Repositório

```text
Painel Digital/
│
├── backend/               # Código do Servidor da API
│   ├── src/
│   │   ├── controllers/   # Lógica de manipulação das requisições
│   │   ├── database/      # Conexão DB e Migrations
│   │   ├── middleware/    # Autenticação (JWT) e Upload (Multer)
│   │   ├── routes/        # Rotas e endpoints REST
│   │   └── services/      # Integração com R2 (Cloudflare)
│   └── package.json       # Dependências Node.js
│
└── frontend/              # Interface Web (Dashboard e Player)
    ├── src/
    │   ├── components/    # Sidebar, TopBar, Cards, Modais
    │   ├── contexts/      # AuthContext, ToastContext
    │   ├── pages/         # Dashboard, PlaylistEditor, Player
    │   ├── services/      # Cliente HTTP Axios (api.js)
    │   └── index.css      # Design System global
    └── package.json       # Dependências React/Vite
```

## 🛠️ Como Instalar e Rodar Localmente

1. **Requisitos**: Instale Node.js (v18+) e PostgreSQL.
2. Crie um banco de dados no PostgreSQL chamado `painel_digital`.
3. Configure os arquivos `.env` no backend e frontend usando os `.env.example` como base.
4. Rode a API:
   ```bash
   cd backend
   npm install
   npm start
   ```
   *(As tabelas do banco serão criadas automaticamente).*
5. Rode a Interface:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---
Feito com 💡 por João Paulo Fernandes.
