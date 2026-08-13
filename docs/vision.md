# Visão do produto

## Contexto

ProfRate é um projeto pessoal, educacional e de portfólio voltado ao aprendizado de desenvolvimento de software de ponta a ponta. A proposta é construir, de forma incremental, uma plataforma em que usuários possam consultar professores e disciplinas e, futuramente, publicar avaliações responsáveis.

A ideia foi inspirada em um projeto acadêmico homônimo originalmente desenvolvido em grupo. Esta implementação será individual e criada do zero, sem reutilização de código do projeto original, com decisões técnicas, histórico Git e deploy próprios.

O projeto não possui vínculo oficial com a Universidade Federal do Ceará (UFC). Durante o desenvolvimento e nas demonstrações iniciais, serão utilizados somente dados fictícios.

## Problema

Informações sobre experiências acadêmicas podem estar dispersas, sem estrutura consistente e sem mecanismos adequados de responsabilidade e moderação. O projeto explora como organizar esse tipo de informação em um produto tecnicamente sólido, seguro e respeitoso.

## Proposta de valor

Oferecer uma experiência simples para consultar professores e disciplinas e registrar avaliações estruturadas, com regras claras, proteção contra abuso e evolução transparente do produto.

Para o desenvolvimento do portfólio, o valor principal está em demonstrar a construção consciente de uma API, de um modelo de dados, de testes automatizados e de integrações web e mobile.

## Público-alvo

- Pessoas interessadas em consultar informações acadêmicas organizadas.
- Usuários autenticados que desejem compartilhar avaliações responsáveis.
- Moderadores responsáveis por analisar conteúdo denunciado.
- Recrutadores e profissionais que avaliem o projeto como peça de portfólio.

## Objetivos

- Construir uma API clara, versionável e testável.
- Praticar modelagem, persistência e evolução de banco de dados.
- Implementar autenticação e autorização com responsabilidades bem definidas.
- Disponibilizar experiências web e mobile integradas à mesma API.
- Desenvolver uma estratégia de testes em diferentes níveis.
- Exercitar CI, deploy, observabilidade e evolução arquitetural.
- Documentar decisões e tornar o processo de aprendizado visível.

## Princípios do produto

- **Respeito:** avaliações não devem servir para assédio, discriminação ou ataques pessoais.
- **Privacidade:** somente dados adequados ao propósito do produto devem ser tratados.
- **Transparência:** regras, limitações e natureza fictícia dos dados iniciais devem ser claras.
- **Segurança:** autenticação, autorização, validação e proteção de dados devem fazer parte do desenho.
- **Rastreabilidade:** operações sensíveis e ações de moderação devem poder ser auditadas quando necessário.
- **Evolução incremental:** cada fase deve entregar algo pequeno, utilizável e testável.

## Critérios gerais de sucesso

- Uma primeira fatia vertical publicada, da persistência à interface web.
- Contratos da API documentados e cobertos por testes relevantes.
- Modelo de dados compreensível e evoluído por migrações controladas.
- Fluxos principais do produto funcionando na web e, posteriormente, no mobile.
- Processo de moderação capaz de tratar denúncias sem criar um ambiente de abuso.
- Decisões técnicas importantes registradas com seus motivos e consequências.

## Riscos e limitações

- Avaliações podem conter conteúdo ofensivo, falso ou discriminatório.
- Dados associados a pessoas reais exigiriam cuidados adicionais de privacidade, base legal e governança.
- Médias numéricas podem simplificar excessivamente experiências subjetivas.
- A moderação pode demandar políticas e ferramentas além do escopo de uma pessoa.
- Como projeto educacional, a solução não deve ser apresentada como serviço oficial ou fonte institucional.

Esses riscos serão considerados na modelagem, nas regras de negócio e nas decisões sobre uma eventual utilização de dados reais no futuro.
