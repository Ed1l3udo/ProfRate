# ProfRate

ProfRate é um projeto pessoal, educacional e de portfólio para estudar backend, banco de dados, APIs e testes automatizados por meio de uma aplicação local com professores e avaliações fictícios.

## Objetivo de aprendizagem

O projeto exercita, em fatias pequenas, a integração entre persistência relacional, API HTTP, validação de entrada, frontend React e testes. Todos os nomes, departamentos, comentários e demais dados atuais são fictícios.

## Funcionalidades implementadas

- listagem de professores fictícios;
- detalhes de um professor;
- catálogo fictício normalizado de departamentos, cursos e disciplinas;
- listagem e detalhes de disciplinas com filtros persistidos na URL;
- listagem de avaliações fictícias;
- cadastro e login local de alunos com sessão JWT;
- autoria, criação, edição e exclusão das próprias avaliações fictícias;
- ciclo de publicação de avaliações, denúncias e moderação por uma conta fictícia dedicada;
- papel administrativo local para manutenção segura do catálogo fictício;
- painel `/admin` com CRUD de departamentos, cursos, disciplinas, professores e seus relacionamentos;
- rankings públicos, favoritos pessoais e marcações de avaliações úteis;
- área de conta e listagem das avaliações do aluno;
- validação de parâmetros e corpos de requisição com respostas de erro previsíveis;
- persistência em PostgreSQL por migrations e seed repetível;
- interface web com estados de carregamento, sucesso, vazio e erro.

O projeto não é uma plataforma pública e não recebe avaliações reais.

## Estado atual

A fatia vertical da P0 está concluída para demonstração local:

```text
React/Vite ↔ API Express ↔ Drizzle ORM ↔ PostgreSQL
```

O projeto não possui serviço público. Ele não recebe avaliações reais, não utiliza dados de pessoas ou instituições reais e não deve ser apresentado como plataforma pública.

## Origem, transparência e dados

A ideia do projeto foi inspirada no **ProfRate**, um trabalho acadêmico originalmente desenvolvido em grupo. Esta é uma reimplementação pessoal, criada do zero, com histórico Git, decisões técnicas e código próprios. Nenhum código do projeto acadêmico original foi reutilizado.

O ProfRate não é afiliado, mantido nem representa a Universidade Federal do Ceará (UFC).

Os professores atuais — Ada Ribeiro, Caio Nogueira e Lina Vasconcelos — são fictícios. Todos os dados usados nas demonstrações locais devem permanecer fictícios.

## Arquitetura atual

- **Banco:** PostgreSQL 18 no Docker Compose, com volume local persistente.
- **Persistência:** Drizzle ORM, Drizzle Kit, schema TypeScript e migrations SQL versionadas.
- **API:** Node.js 24, TypeScript e Express 5 em `apps/api`.
- **Frontend:** React, React Router e Vite em `apps/web`.
- **Validação:** Zod nas fronteiras de entrada da API.
- **Integração local:** o proxy do Vite encaminha os caminhos `/api` para a API local, removendo esse prefixo.
- **Testes:** Vitest e Supertest na API; Vitest e React Testing Library no frontend.

## Pré-requisitos

- Node.js 24
- pnpm 11
- Docker Desktop com Docker Compose

## Execução local

Instale as dependências:

```sh
pnpm install --frozen-lockfile
```

Crie a configuração local a partir do exemplo:

```powershell
# PowerShell
Copy-Item .env.example .env
```

```sh
# macOS/Linux
cp .env.example .env
```

Defina em `.env` uma senha local para `POSTGRES_PASSWORD`, use a mesma senha em `DATABASE_URL` e substitua `AUTH_JWT_SECRET` por um segredo local com ao menos 32 caracteres. O servidor não inicia sem essa variável.

Inicie o PostgreSQL:

```sh
docker compose up -d
docker compose ps
```

Antes de continuar, aguarde o serviço `postgres` aparecer como saudável (`healthy`) em `docker compose ps`. Só então aplique a migration e o seed:

```sh
pnpm --filter @profrate/api db:migrate
pnpm --filter @profrate/api db:seed
pnpm --filter @profrate/api db:check
```

Mantenha estes dois processos ativos em terminais separados:

```sh
# Terminal da API
pnpm --filter @profrate/api dev
```

```sh
# Terminal do frontend
pnpm --filter @profrate/web dev
```

Abra a interface em [http://localhost:5173](http://localhost:5173). A API fica disponível em `http://localhost:3000`.

Para encerrar o banco local, execute:

```sh
docker compose down
```

Esse comando preserva o volume do PostgreSQL e seus dados. Não use `docker compose down -v` para a rotina normal, pois ele remove volumes.

## Banco de dados

- `db:migrate` aplica as migrations SQL geradas pelo Drizzle.
- `db:seed` insere o catálogo fictício com 3 departamentos, 3 cursos, 10 professores, 15 disciplinas, três avaliações de professor e três avaliações de disciplina já publicadas, uma avaliação pendente e uma denúncia pendente, sem duplicar os dados controlados nem trocar hashes quando executado novamente.
- `db:check` executa uma consulta simples para confirmar a conexão e fecha o Pool ao terminar.
- `db:generate` gera uma nova migration depois de uma alteração aprovada no schema Drizzle.

O seed também cria três contas exclusivamente locais e fictícias, sem substituir senhas caso elas já existam:

| Perfil | E-mail | Senha demonstrativa |
| --- | --- | --- |
| Aluno | `ana@student.profrate.test` | `ProfRate#2026Aluno` |
| Moderador | `moderador@profrate.test` | `ProfRate#2026Moderador` |
| Administrador | `admin@profrate.test` | `ProfRate#2026Admin` |

Essas credenciais são dados de demonstração, não devem ser reutilizadas fora deste ambiente e não representam pessoas reais. O banco armazena apenas hashes bcrypt das senhas.

```sh
pnpm --filter @profrate/api db:generate
```

## API

| Método | Caminho | Resposta |
| --- | --- | --- |
| GET | `/health` | `{ "status": "ok" }` |
| POST | `/auth/signup` | Cria uma conta `student` e retorna usuário público e token |
| POST | `/auth/login` | Autentica por e-mail e senha e retorna usuário público e token |
| GET | `/me` | Retorna o usuário autenticado |
| PATCH | `/me` | Atualiza nome e, para aluno, curso |
| GET | `/me/reviews` | Lista as avaliações do aluno autenticado com o alvo resumido |
| GET | `/professors` | Lista de professores fictícios com `id` e `name` |
| GET | `/professors/:id` | Professor com `id`, `name` e `department` |
| GET | `/professors/:id/reviews` | Lista as avaliações estruturadas do professor |
| POST | `/professors/:id/reviews` | Aluno autenticado cria uma avaliação e recebe `201` |
| PATCH | `/professors/:professorId/reviews/:reviewId` | Autor autenticado atualiza sua avaliação |
| DELETE | `/professors/:professorId/reviews/:reviewId` | Autor autenticado exclui sua avaliação e recebe `204` |
| GET | `/departments` | Lista os departamentos fictícios |
| GET | `/courses` | Lista os cursos; aceita `departmentId` |
| GET | `/disciplines` | Lista disciplinas; aceita `search`, `departmentId` e `courseId` |
| GET | `/disciplines/:id` | Detalha a disciplina, seus cursos e professores relacionados |
| GET | `/disciplines/:id/reviews` | Lista as avaliações estruturadas da disciplina |
| POST | `/disciplines/:id/reviews` | Aluno autenticado cria uma avaliação e recebe `201` |
| PATCH | `/disciplines/:disciplineId/reviews/:reviewId` | Autor autenticado atualiza sua avaliação |
| DELETE | `/disciplines/:disciplineId/reviews/:reviewId` | Autor autenticado exclui sua avaliação e recebe `204` |
| POST | `/reviews/:reviewId/reports` | Aluno autenticado e desbloqueado denuncia uma avaliação publicada de outra pessoa |
| GET | `/moderation/reviews` | Moderador lista avaliações por status (padrão: `pending`) |
| PATCH | `/moderation/reviews/:reviewId` | Moderador publica ou remove uma avaliação |
| GET | `/moderation/reports` | Moderador lista denúncias por status (padrão: `pending`) com contexto da avaliação |
| PATCH | `/moderation/reports/:reportId` | Moderador resolve ou descarta uma denúncia |
| GET | `/moderation/users` | Moderador busca usuários por nome ou e-mail |
| PATCH | `/moderation/users/:userId/block` | Moderador bloqueia um usuário, exceto a própria conta |
| PATCH | `/moderation/users/:userId/unblock` | Moderador desbloqueia um usuário |
| GET, POST | `/admin/departments` | Admin lista ou cria departamentos |
| PATCH, DELETE | `/admin/departments/:departmentId` | Admin edita ou exclui departamento sem referências |
| GET, POST | `/admin/courses` | Admin lista ou cria cursos |
| PATCH, DELETE | `/admin/courses/:courseId` | Admin edita ou exclui curso sem referências |
| GET, POST | `/admin/disciplines` | Admin lista ou cria disciplinas e cursos relacionados |
| PATCH, DELETE | `/admin/disciplines/:disciplineId` | Admin edita ou exclui disciplina sem referências |
| GET, POST | `/admin/professors` | Admin lista ou cria professores e disciplinas relacionadas |
| PATCH, DELETE | `/admin/professors/:professorId` | Admin edita ou exclui professor sem referências |
| GET | `/rankings/professors`, `/rankings/disciplines` | Rankings públicos por avaliações publicadas |
| GET | `/me/favorites` | Favoritos separados do usuário autenticado |
| PUT, DELETE | `/me/favorites/professors/:id` | Adiciona ou remove favorito de professor de modo idempotente |
| PUT, DELETE | `/me/favorites/disciplines/:id` | Adiciona ou remove favorito de disciplina de modo idempotente |
| PUT, DELETE | `/reviews/:id/helpful` | Marca ou remove uma marcação útil em review publicada |

As rotas públicas de catálogo continuam sem exigir sessão e só exibem avaliações `published`; pendentes e removidas não influenciam médias nem contagens. Escritas de avaliações e denúncias usam `Authorization: Bearer <token>`, aceitam um objeto `ratings` completo — quatro critérios para professor ou três para disciplina — e `comment` ou motivo não vazio. A média decimal `rating` é derivada pelo PostgreSQL e não é aceita no corpo da requisição; o autor vem exclusivamente do token. Usuários bloqueados continuam lendo os dados, mas não podem criar, editar, excluir ou denunciar avaliações. A leitura pública informa `canManage`, mas nunca expõe `authorId`, hash de senha ou token. Tokens HS256 carregam somente `userId` e `role` e expiram em sete dias.

Senhas são validadas na borda, armazenadas com bcrypt (custo 12) e nunca registradas ou devolvidas. O JWT é criado e verificado pelo `jose`; a API valida assinatura, expiração, formato do payload, existência, estado e papel atual do usuário antes de autorizar uma operação. O cadastro público cria somente alunos. Administradores também podem acessar a moderação, mas apenas administradores acessam `/admin`.

Os corpos administrativos são objetos estritos: nomes são normalizados, IDs são inteiros positivos, relações não aceitam IDs repetidos e referências devem existir. As alterações de relações são transacionais. Exclusões retornam `409` quando o catálogo ou avaliações ainda dependem do recurso, em vez de remover conteúdo relacionado em cascata.

## Verificações

```sh
pnpm --filter @profrate/api typecheck
pnpm --filter @profrate/api test
pnpm --filter @profrate/api build
pnpm --filter @profrate/web typecheck
pnpm --filter @profrate/web test
pnpm --filter @profrate/web build
```

## Documentação

- [Visão do produto](docs/vision.md)
- [Escopo](docs/scope.md)
- [Roadmap](docs/roadmap.md)
- [ADR 0001 — Stack inicial](docs/decisions/0001-stack-inicial.md)
- [Orientações para agentes de desenvolvimento](AGENTS.md)

## Licença

A licença do projeto ainda será definida.
