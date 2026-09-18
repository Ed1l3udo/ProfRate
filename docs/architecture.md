# Arquitetura atual

O ProfRate é um monólito modular em TypeScript. `apps/web` é uma SPA React servida pelo Vite; `apps/api` compõe Express com repositórios injetados em `createApp`. O proxy web encaminha `/api` à API local.

## Componentes

- A API valida entradas com Zod e concentra autorização nos middlewares.
- `server.ts` monta repositórios Drizzle, serviços de senha e token e os injeta na aplicação.
- Repositórios encapsulam consultas, transações e relações PostgreSQL.
- O frontend mantém sessão JWT local, protege rotas por papel e consome contratos HTTP sem acesso direto ao banco.

## Persistência, segurança e testes

PostgreSQL usa migrations Drizzle versionadas, constraints, índices e transações. Senhas usam bcrypt; JWTs têm assinatura e expiração; tokens de redefinição são armazenados como hash; tentativas de login têm janela e bloqueio temporário. Vitest e Supertest cobrem a API, React Testing Library cobre a web e a integração usa PostgreSQL descartável. A CI executa `pnpm check` e a suíte de integração.
