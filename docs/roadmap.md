# Roadmap

O desenvolvimento será incremental e orientado por fatias verticais. Cada fase deve produzir entregas revisáveis, acompanhadas dos testes e da documentação proporcionais ao risco.

## P0 — Fundação e primeira fatia vertical

### Objetivo

Estabelecer as bases do projeto e demonstrar localmente um fluxo mínimo completo: dados fictícios de professores persistidos no banco, expostos por uma API e exibidos em uma página web.

### Entregas

- Documentação inicial e escolha justificada da stack.
- Estrutura mínima do repositório.
- Modelagem inicial de Professor.
- Banco de dados com dados fictícios.
- Endpoint para listar professores.
- Página web consumindo esse endpoint.
- Testes essenciais da primeira fatia vertical.
- Demonstração local documentada.

### Critério de conclusão

Uma pessoa com os pré-requisitos deve conseguir iniciar o PostgreSQL, a API e o frontend localmente e visualizar, pela página web, uma lista de professores fictícios obtida da API e persistida no banco. As decisões principais e o caminho crítico devem estar documentados e testados.

### Decisão sobre deploy

O deploy público foi adiado deliberadamente nesta etapa. O projeto permanece como demonstração local, sem operação pública, sem recebimento de avaliações reais e usando somente dados fictícios. A decisão evita custos e manutenção de infraestrutura enquanto o foco é aprendizado e portfólio.

## P1 — Produto web principal

### Objetivo

Transformar a primeira fatia em um produto web funcional, cobrindo os fluxos centrais e consolidando a qualidade da API e da persistência.

### Entregas

- Autenticação e autorização.
- Professores e disciplinas.
- Criação, edição e exclusão de avaliações.
- Médias e filtros.
- Interface web responsiva.
- API documentada.
- Testes unitários, de integração e de ponta a ponta (E2E).
- Deploy completo com PostgreSQL.

### Critério de conclusão

Visitantes devem conseguir consultar o catálogo e as avaliações, enquanto usuários autenticados devem conseguir gerenciar suas próprias avaliações com autorização adequada. Os fluxos principais devem estar documentados, testados e publicados com PostgreSQL.

## P2 — Expansão

### Objetivo

Expandir o produto para operação responsável, novas plataformas e maior maturidade técnica.

### Entregas

- Denúncias e moderação.
- Administração do catálogo, inicialmente atribuída às responsabilidades adequadas do moderador até futura revisão de papéis.
- Aplicativo mobile.
- Notificações.
- Observabilidade.
- Acessibilidade, desempenho e segurança avançada.
- Automação de deploy.

### Critério de conclusão

O produto deve oferecer tratamento rastreável de denúncias, manutenção controlada do catálogo e uma experiência mobile integrada à API, além de processos operacionais e de entrega mais maduros.

## Forma de trabalho

Antes de cada decisão importante de backend, serão apresentados o problema, as opções consideradas, a escolha e suas consequências. As entregas serão divididas em mudanças pequenas para permitir compreensão, revisão e testes antes do avanço para a etapa seguinte.
