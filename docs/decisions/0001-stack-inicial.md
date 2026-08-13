# ADR 0001 — Stack inicial

- **Status:** aceita
- **Data:** 2026-08-13

## Contexto

O ProfRate precisa entregar na P0 uma primeira fatia vertical completa: dados fictícios de professores armazenados em um banco, um endpoint para consultá-los, uma página web que consuma esse endpoint, testes essenciais, integração contínua e um deploy de demonstração.

O projeto é educacional e tem como foco principal o aprendizado de backend, banco de dados, arquitetura de API e testes. Por isso, a stack inicial deve permitir avançar em partes pequenas, manter visíveis conceitos fundamentais e evitar complexidade operacional que ainda não seja necessária. Ao mesmo tempo, API e frontend precisam conviver de forma organizada e compartilhar linguagem e contratos quando isso trouxer benefício real.

## Decisão

### Linguagem e runtime

Será usado **TypeScript** como linguagem compartilhada entre backend e frontend, executado no backend com **Node.js 24 LTS**.

O TypeScript oferece tipagem estática, melhor suporte de ferramentas e a possibilidade de compartilhar tipos e convenções entre aplicações. Usar uma linguagem comum reduz a troca de contexto durante a primeira fase e permite concentrar o aprendizado nas fronteiras da API, no domínio, no banco e nos testes.

O custo é adicionar compilação, configuração e conceitos próprios do sistema de tipos. Tipos estáticos também não validam dados recebidos em tempo de execução, razão pela qual a API utilizará Zod nas suas fronteiras.

O Node.js 24 LTS oferece uma versão estável e com suporte prolongado do runtime. Fixar uma versão principal torna os ambientes de desenvolvimento e CI mais previsíveis, mas exige manutenção futura quando essa linha se aproximar do fim do suporte.

### Gerenciamento do repositório e pacotes

Será usado **pnpm** como gerenciador de pacotes em um **monorepo simples**, inicialmente sem Turborepo. A organização prevista terá ao menos `apps/api` e `apps/web`, podendo receber pacotes compartilhados somente quando uma necessidade concreta aparecer.

O monorepo facilita mudanças coordenadas entre API e web, centraliza configurações e documentação e permite uma única automação de CI. O pnpm oferece workspaces e uso eficiente de disco, suficientes para a escala inicial.

Como consequência, os projetos ficam no mesmo ciclo de versionamento e precisam de limites claros para evitar acoplamento indevido. Scripts de workspace e configuração central também acrescentam algum trabalho. O Turborepo não será adotado agora porque cache distribuído e orquestração avançada não resolvem um problema presente; ele poderá ser reconsiderado se tempo de build e coordenação de tarefas se tornarem relevantes.

### API

A API ficará em **`apps/api`** e utilizará **Express 5** com **Zod**.

O Express possui um modelo pequeno e explícito para rotas, middlewares e tratamento de requisições. Isso favorece o estudo dos fundamentos de HTTP e permite que os limites arquiteturais sejam construídos conscientemente, sem uma estrutura extensa imposta pelo framework. O Zod fará a validação em tempo de execução nas fronteiras da aplicação e poderá ajudar a inferir tipos TypeScript a partir dos schemas.

O principal custo é que a equipe do projeto precisará definir e manter convenções para composição da aplicação, erros, dependências e módulos. Express não fornece por si só uma arquitetura de domínio. Zod também cria schemas adicionais que precisam ser mantidos e não substitui regras de negócio nem restrições do banco.

### Banco de dados e acesso a dados

O banco principal será **PostgreSQL**, um banco relacional adequado às relações previstas entre professores, disciplinas, usuários e avaliações. Suas restrições, transações e recursos de consulta ajudam a preservar integridade e oferecem uma base sólida para aprender modelagem relacional e SQL.

O custo inclui projetar schemas e migrações com cuidado, administrar um serviço de banco e compreender índices, transações e consultas. Essas responsabilidades são intencionais e fazem parte dos objetivos educacionais do projeto.

Será usado **Drizzle** para acesso ao banco e migrations. A escolha favorece schemas tipados e consultas próximas do modelo relacional, com uma camada menor de abstração do que ORMs mais abrangentes. Migrations versionadas tornarão explícita a evolução do schema.

**Drizzle não elimina a necessidade de aprender SQL.** Será necessário compreender tabelas, chaves, restrições, joins, índices, transações, planos de execução e o SQL produzido pelas consultas. A ferramenta auxilia a integração com TypeScript, mas não substitui conhecimento de banco de dados nem decisões de modelagem.

Como custo, Drizzle adiciona sua própria API e ferramentas, pode exigir SQL direto para consultas ou recursos específicos e não impede consultas ineficientes. As migrations precisam ser revisadas, testadas e aplicadas de forma controlada.

### Frontend web

O frontend ficará em **`apps/web`** e utilizará **React** com **Vite**.

React permite construir a interface por componentes, enquanto Vite fornece um ambiente de desenvolvimento e build direto para uma aplicação cliente. Essa combinação mantém a P0 concentrada na integração da página com a API, sem introduzir inicialmente renderização no servidor ou um framework full-stack.

Os custos incluem definir decisões de roteamento, acesso a dados e organização do frontend conforme o produto crescer. Uma aplicação renderizada no cliente também pode exigir trabalho adicional de SEO e desempenho caso esses requisitos se tornem importantes.

### Testes

**Vitest** será o executor de testes. Na API, **Supertest** será usado para exercitar os endpoints HTTP, e no frontend será usada **React Testing Library** para testar comportamentos observáveis da interface.

Vitest se integra bem ao ecossistema TypeScript e Vite e permite uma experiência consistente entre aplicações. Supertest testa a aplicação Express por HTTP sem exigir um servidor externo, e React Testing Library incentiva testes orientados ao uso da interface.

Os custos são o tempo de configurar ambientes e dados de teste e o cuidado para evitar testes frágeis ou excessivamente acoplados à implementação. Supertest não substitui testes reais de integração com o PostgreSQL quando a persistência fizer parte do comportamento, e React Testing Library não substitui os testes E2E previstos para a P1.

### Ambiente local e integração contínua

**Docker Compose** será incluído na P0 para executar o PostgreSQL localmente. A API e a aplicação web não precisam ser conteinerizadas na primeira etapa; o objetivo inicial é tornar a dependência de banco reproduzível.

Isso reduz diferenças entre instalações locais do PostgreSQL e torna explícitas versão, porta e configuração do serviço. Em contrapartida, exige Docker no ambiente de desenvolvimento e requer atenção a volumes, portas, variáveis de ambiente e inicialização do banco.

**GitHub Actions** também será incluído na P0 para CI. A automação deverá executar as verificações relevantes do repositório, como instalação reproduzível, validações estáticas e testes existentes.

O benefício é detectar regressões cedo e manter uma verificação repetível a cada mudança. Os custos são configurar e manter o workflow, controlar tempo de execução e reproduzir no CI serviços como PostgreSQL quando os testes de integração os exigirem.

### Arquitetura

A arquitetura inicial será um **monólito modular**, com limites de domínio explícitos e sem microsserviços.

A aplicação será implantada e operada como uma única API, mas seu código deverá separar responsabilidades de domínio, casos de uso, transporte HTTP e persistência. Isso preserva uma trajetória simples de execução e deploy sem abandonar limites internos que facilitem testes e evolução.

O benefício é evitar rede, consistência distribuída, múltiplos pipelines e observabilidade distribuída antes que o produto necessite disso. O custo é exigir disciplina para que o monólito não se torne uma coleção de módulos fortemente acoplados. Uma separação em serviços só será considerada se limites e necessidades operacionais reais a justificarem.

### Deploy

O provedor de deploy ainda não foi escolhido. O primeiro deploy de demonstração faz parte da P0, mas a escolha será tomada quando os requisitos da primeira fatia vertical estiverem mais concretos.

**Google Cloud Run** será estudado como uma opção após a primeira fatia vertical estar funcional. Adiar a decisão evita otimizar a arquitetura para um provedor antes de conhecer necessidades de execução, banco, custo e experiência operacional. A consequência é manter a configuração da aplicação portável e reservar uma etapa específica para comparar alternativas de hospedagem.

### MongoDB

**MongoDB será estudado separadamente** como tecnologia de banco de dados, mas não será adicionado ao ProfRate sem uma necessidade arquitetural real.

Manter PostgreSQL como único banco inicial reduz complexidade operacional e permite aprofundar modelagem relacional. Usar MongoDB apenas para ampliar a lista de tecnologias criaria persistência duplicada e problemas de consistência sem benefício para a primeira fatia. Se surgir no futuro um caso de uso que se beneficie claramente de um modelo documental, a decisão deverá ser analisada em uma nova ADR.

## Alternativas consideradas

### Fastify em vez de Express

Fastify oferece boa performance, validação orientada por schemas e uma arquitetura de plugins. Seria uma escolha válida para uma API nova. Express foi escolhido por seu modelo mínimo, ampla documentação e por deixar mais explícitas as decisões estruturais que o projeto pretende estudar. O custo aceito é configurar mais convenções e abrir mão de recursos integrados do Fastify.

### NestJS em vez de Express

NestJS fornece módulos, injeção de dependências, decorators e convenções arquiteturais abrangentes. Isso pode beneficiar aplicações e equipes maiores. Para a P0, porém, sua quantidade de abstrações e estrutura aumentaria a carga conceitual e poderia ocultar decisões que fazem parte do aprendizado. O monólito modular permitirá introduzir limites deliberadamente sem adotar todo o framework.

### Prisma em vez de Drizzle

Prisma oferece uma experiência madura de ORM, schema declarativo, client gerado e ferramentas produtivas. Drizzle foi escolhido por permanecer mais próximo de SQL e do modelo relacional, alinhando-se ao foco de aprendizado do banco. Em troca, o projeto aceita uma experiência menos abrangente e a possibilidade de escrever mais SQL ou código de consulta explicitamente.

### Next.js em vez de React com Vite

Next.js oferece roteamento, renderização no servidor, geração estática e recursos full-stack. Esses recursos poderão ser úteis se SEO, renderização no servidor ou uma camada web no servidor se tornarem requisitos. Na P0, React com Vite reduz o número de conceitos e deixa clara a fronteira entre o frontend e a API independente que o projeto quer exercitar.

### MongoDB como banco principal

MongoDB permitiria um modelo documental flexível e seria útil para aprender outra forma de persistência. O domínio inicial possui relações e restrições relevantes, e o objetivo inclui aprofundar SQL e modelagem relacional. PostgreSQL é, portanto, a escolha principal. MongoDB continuará como estudo separado e só entrará no projeto mediante necessidade demonstrável.

### Repositórios separados

Repositórios independentes isolariam ciclos de vida e permissões de API e web. Para uma única pessoa e uma primeira fatia que exige mudanças coordenadas, isso adicionaria versionamento, CI e gestão duplicados. O monorepo simples reduz esse custo. A separação poderá ser reconsiderada se aplicações passarem a ter equipes, permissões ou ciclos de entrega realmente independentes.

### Turborepo desde o começo

Turborepo pode acelerar e coordenar tarefas em monorepos maiores. Os workspaces do pnpm atendem às necessidades iniciais, e ainda não existem builds numerosos ou lentos que justifiquem outra camada. A ferramenta poderá ser avaliada com métricas concretas se a escala do repositório crescer.

### Microsserviços desde o começo

Microsserviços poderiam permitir implantação e escala independentes, mas introduziriam comunicação por rede, falhas parciais, consistência distribuída, observabilidade e múltiplos processos de entrega. Nada disso é exigido pela P0. O monólito modular mantém a operação simples e cria limites internos que poderão sustentar uma separação futura, caso haja evidência para ela.

## Consequências gerais

- API e web compartilharão linguagem e repositório, mas continuarão como aplicações com fronteiras explícitas.
- A equipe do projeto precisará definir gradualmente convenções arquiteturais que frameworks mais prescritivos forneceriam prontas.
- SQL, modelagem relacional e revisão de migrations continuarão sendo competências obrigatórias, mesmo com Drizzle.
- A P0 incluirá configuração local do PostgreSQL com Docker Compose e CI com GitHub Actions.
- A primeira implantação deverá permanecer portável enquanto o provedor não for escolhido.
- Novas ferramentas de monorepo, novos bancos ou uma divisão em serviços exigirão problemas concretos e novas decisões documentadas.
