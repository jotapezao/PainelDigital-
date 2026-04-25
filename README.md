# Painel Digital - Digital Signage Platform

Este é um sistema de Digital Signage com um painel administrativo (React) e uma API (Node.js/Express).

## Estrutura do Projeto

- `/backend`: API Node.js com PostgreSQL.
- `/frontend`: Painel administrativo em React (Vite).

## Deploy no Railway

Para fazer o deploy no Railway, siga estes passos:

### 1. Backend
- Crie um novo serviço no Railway a partir do GitHub.
- Selecione este repositório.
- Em **Settings**, defina o **Root Directory** como `backend`.
- Adicione as variáveis de ambiente:
  - `PORT`: 3001 (ou deixe o Railway definir)
  - `DATABASE_URL`: Conecte a um banco PostgreSQL no Railway.
  - `JWT_SECRET`: Uma chave secreta segura.
  - `FRONTEND_URL`: A URL do serviço do frontend (após criá-lo).
  - `NODE_ENV`: `production`

### 2. Frontend
- Crie outro serviço no Railway a partir do GitHub.
- Selecione este repositório.
- Em **Settings**, defina o **Root Directory** como `frontend`.
- Em **Build & Deploy**, verifique se o comando de build é `npm run build` e o diretório de saída é `dist`.
- Adicione as variáveis de ambiente:
  - `VITE_API_URL`: A URL do serviço do backend + `/api`. Ex: `https://seu-backend.up.railway.app/api`

## Configuração Local

1. Configure o `.env` no `backend` com seu banco de dados PostgreSQL.
2. `cd backend && npm install && npm run dev`
3. `cd frontend && npm install && npm run dev`

### Credenciais Padrão
- **Email:** `admin@sistema.com`
- **Senha:** `admin123`
