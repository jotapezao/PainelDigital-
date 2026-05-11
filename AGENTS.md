# Repository Guidelines

## Idioma da Documentação

Escreva documentação, comentários de orientação, guias, nomes de variáveis, funções e arquivos deste repositório em português, salvo quando nomes técnicos, comandos ou APIs exigirem inglês.

## Estrutura do Projeto e Organização dos Módulos

Este repositório é uma plataforma de painel digital organizada em dois workspaces npm. A API fica em `backend/`, com ponto de entrada em `backend/src/server.js`. O backend é separado por responsabilidade: `controllers/` para lógica das requisições, `routes/` para endpoints REST, `middleware/` para autenticação e uploads, `database/` para conexão e migrações PostgreSQL, e `services/` para integração com Cloudflare R2.

O frontend React/Vite fica em `frontend/`. O código principal está em `frontend/src/`, com componentes reutilizáveis em `components/`, telas em `pages/`, estados globais em `contexts/`, cliente HTTP em `services/api.js` e estilos globais em `index.css`. Os arquivos Android/Capacitor ficam em `frontend/android/`. Mídias enviadas localmente ficam em `uploads/`.

## Comandos de Build, Teste e Desenvolvimento

- `npm install`: instala as dependências dos workspaces pela raiz.
- `npm run backend:dev`: inicia a API Express com `nodemon`.
- `npm run frontend:dev`: inicia o servidor Vite do frontend.
- `npm run build`: instala dependências, compila o frontend e prepara o backend.
- `npm start`: inicia o backend usando `backend/src/server.js`.
- `npm run build --workspace=frontend`: compila apenas o app React.
- `npm run preview --workspace=frontend`: serve o build do frontend para verificação local.

## Estilo de Código e Convenções de Nome

Use JavaScript e JSX seguindo o padrão existente. Prefira indentação de dois espaços, ponto e vírgula, e nomes em camelCase para variáveis, funções e handlers. Componentes React e páginas usam PascalCase, como `Dashboard.jsx` e `PlaylistEditor.jsx`. Mantenha arquivos do backend agrupados por responsabilidade; evite adicionar lógica de rota diretamente em `server.js` quando houver módulo adequado.

## Diretrizes de Teste

Não há scripts automatizados de teste definidos na raiz atualmente. Antes de enviar alterações, rode o servidor relevante e faça um teste manual focado no fluxo alterado. Para mudanças no frontend, execute `npm run build --workspace=frontend` para detectar erros de empacotamento. Stubs de testes Android existem em `frontend/android/app/src/test/` e `frontend/android/app/src/androidTest/`; mantenha novos testes Android nessas pastas.

## Commits e Pull Requests

Os commits recentes usam mensagens curtas e imperativas com prefixo `Fix:`, por exemplo `Fix: Ticker timer, height slider and 16:12 ratio`. Mantenha o assunto conciso e focado em uma mudança. Pull requests devem incluir descrição breve, áreas afetadas (`backend`, `frontend` ou `android`), passos de verificação, issues relacionadas quando houver, e imagens ou gravações para mudanças visíveis na interface ou no player.

## Segurança e Configuração

Não versione arquivos `.env`, credenciais, dumps de banco ou mídias enviadas. Mantenha configurações de PostgreSQL, JWT e Cloudflare R2 em variáveis de ambiente. Revise mudanças em upload e mídia com cuidado, pois o backend aceita arquivos grandes e os distribui para dispositivos remotos.
