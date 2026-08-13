# Escopo

## Objetivo deste documento

Este documento define as fronteiras funcionais atuais do ProfRate. O detalhamento e a prioridade das entregas estão no [roadmap](roadmap.md).

## Atores

### Visitante

Pode acessar informações públicas, como a listagem de professores, disciplinas e avaliações publicadas.

### Usuário autenticado

Pode utilizar os recursos públicos e, conforme as regras definidas nas fases futuras, criar, editar e excluir suas próprias avaliações e enviar denúncias.

### Moderador

Pode analisar denúncias e tomar as ações de moderação permitidas pelas políticas do produto.

Não haverá um ator Administrador separado neste momento. Essa decisão poderá ser revisada posteriormente, caso surjam responsabilidades administrativas que não devam pertencer ao moderador.

## Entidades centrais

- **Usuário:** identidade que poderá se autenticar e realizar ações autorizadas.
- **Professor:** registro consultável de um professor fictício durante as fases iniciais.
- **Disciplina:** registro consultável de uma disciplina fictícia.
- **Professor–disciplina:** vínculo entre um professor e uma disciplina quando o modelo exigir essa relação.
- **Avaliação:** opinião estruturada criada por um usuário autenticado dentro das regras do produto.
- **Denúncia:** solicitação de análise de um conteúdo potencialmente inadequado.
- **Ação de moderação:** decisão registrada por um moderador sobre conteúdo denunciado.

O modelo exato e as relações serão refinados de forma incremental. A P0 começará somente com o necessário para a primeira fatia vertical de Professor.

## Capacidades incluídas

- Consultar professores e disciplinas.
- Autenticar usuários e aplicar autorização por responsabilidade.
- Criar, editar e excluir avaliações próprias.
- Calcular médias e filtrar informações.
- Denunciar e moderar conteúdo.
- Consumir a API por aplicações web e mobile.
- Documentar e testar os contratos relevantes da API.
- Publicar versões de demonstração e produção do sistema.

## Regras iniciais

- Os dados utilizados inicialmente serão inteiramente fictícios.
- Uma avaliação deverá pertencer ao usuário que a criou.
- Edição e exclusão de avaliações deverão respeitar autorização.
- Conteúdo inadequado poderá ser denunciado e analisado por um moderador.
- As regras de cálculo de médias, unicidade de avaliações e publicação serão definidas antes da implementação correspondente.
- Funcionalidades públicas e privadas deverão ser explicitadas nos contratos da API.

## Requisitos não funcionais

- Validação de dados nas fronteiras da aplicação.
- Autenticação e autorização aplicadas de modo consistente.
- Tratamento previsível de erros da API.
- Migrações controladas do banco de dados.
- Testes unitários, de integração e de ponta a ponta conforme o risco de cada fase.
- Rastreabilidade de ações sensíveis e de moderação.
- Documentação dos contratos da API e das decisões importantes.
- Cuidados progressivos com acessibilidade, desempenho, segurança e observabilidade.

## Fora do escopo atual

- Chat ou mensagens privadas.
- Feed ou rede social.
- Monetização e anúncios.
- Recomendações baseadas em inteligência artificial.
- Integração oficial com sistemas da UFC ou de outras instituições.
- Importação de dados pessoais ou institucionais reais nas fases iniciais.
- Um papel separado de Administrador.

Esses itens só poderão entrar no escopo após revisão explícita da visão, dos riscos e das prioridades do projeto.
