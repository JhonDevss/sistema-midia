# Web - Midia

Aplicação frontend em React + TypeScript para operação da plataforma Midia (login, dashboard, eventos, modelos, usuários e auditoria).

## Aviso importante

Este projeto é totalmente pessoal, desenvolvido de forma voluntária por mim para estudo e portfólio.

Ele não é um produto oficial, não foi encomendado e não possui endosso dos administradores nem do dono do servidor.

## Objetivo do sistema

Este frontend foi feito para ser a interface operacional do sistema de eventos e pontuação para a equipe de mídia do Among Us Brasil.

Na prática, ele permite:

- Visualizar o estado geral no dashboard.
- Operar o ciclo de eventos (listar, criar, acompanhar detalhes e andamento).
- Gerenciar modelos de avaliação reutilizáveis.
- Gerenciar usuários e acompanhar auditoria das ações.
- Executar o fluxo de autenticação com controle de acesso e troca obrigatória de senha quando necessário.

Importante: o frontend orquestra a operação, mas as regras de negócio críticas e o cálculo de ranking/pontuação permanecem no backend, que é a fonte de verdade.

## Stack

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS + componentes UI

## Requisitos

- Node.js 18+

## Configuração

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo .env a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Ajuste a variável de ambiente:

- VITE_API_BASE_URL: URL base da API (exemplo: http://localhost:4000).

## Scripts

- npm run dev: inicia o servidor de desenvolvimento.
- npm run build: gera build de produção.
- npm run build:dev: gera build no modo development.
- npm run preview: sobe preview da build.
- npm run lint: roda lint com ESLint.
- npm run test: executa testes com Vitest.
- npm run test:watch: executa testes em modo watch.

## Execução

Desenvolvimento:

```bash
npm run dev
```

Build + preview:

```bash
npm run build
npm run preview
```

## Fluxo de navegação (rotas)

- /: dashboard
- /eventos: lista de eventos
- /eventos/novo: criação de evento
- /eventos/:id: detalhes do evento
- /modelos: lista de modelos
- /modelos/novo: criação de modelo
- /modelos/:id/editar: edição de modelo
- /usuarios: gestão de usuários
- /auditoria: logs de auditoria
- /alterar-senha: alteração de senha

## Autenticação no frontend

- Usuário não autenticado é direcionado para tela de login.
- Se mustChangePassword estiver ativo, o fluxo vai para alteração de senha.
- Rotas internas são exibidas dentro do layout principal após autenticação.

## Observações

- A aplicação consome os dados da API; regras de negócio críticas e cálculo de pontuação devem permanecer no backend.
- Garanta que web e API usem URLs e CORS compatíveis durante desenvolvimento.
