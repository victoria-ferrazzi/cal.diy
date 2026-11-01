---
name: onboarding
description: Explica o produto, a arquitetura, a organização do código e como executar e testar este repositório. Use quando a pessoa pedir onboarding, uma visão do projeto, onde fica o código ou como rodar lint e testes.
disable-model-invocation: true
---

# Onboarding

Investigue o repositório. Aponte arquivos e comandos que existem. Não copie regras de produto para esta skill.

## Procedimento

1. Leia `AGENTS.md`.
2. Leia só os arquivos de `agents/` que a pergunta exigir. Comandos ficam em `agents/COMMANDS.md`. Regras de horário ficam em `agents/PRODUCT.md`. Exemplos de código ficam em `agents/CONVENTIONS.md`. A organização do monorepo fica em `agents/PROJECT.md`.
3. Se o mapa não responder, procure no código. Apps ficam em `apps/`. Pacotes compartilhados ficam em `packages/`. O app principal é `apps/web` (`@calcom/web`).
4. Explique, com caminho real:
   - o que o produto faz
   - como os componentes citados se comunicam
   - onde está o código relevante
   - como executar e testar, usando os comandos de `agents/COMMANDS.md` e o `package.json` da raiz
5. Abra o arquivo antes de afirmar o que ele faz. Se disser que um comando rodou, mostre o resultado. Sem saída, não diga que passou.

`apps/web` não tem script `test`. O gerenciador é Yarn.
