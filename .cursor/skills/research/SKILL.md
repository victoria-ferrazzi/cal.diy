---
name: research
description: Investiga o comportamento atual de uma tarefa e grava o resultado em tasks/<slug>/research.md, sem alterar código de produto. Use quando a pessoa pedir pesquisa, research, ou o primeiro passo do fluxo Research, Plan e Implement.
disable-model-invocation: true
---

# Research

Não altere código de produto, testes, traduções nem arquivos de contexto.

## Entrada

A descrição da tarefa, o código e o contexto do projeto. Se a pessoa não der um slug, pergunte. O slug desta convenção usa kebab-case.

## Procedimento

1. Leia `AGENTS.md` e só os arquivos de `agents/` que a tarefa exigir.
2. Localize o comportamento atual e os arquivos que a mudança tocaria. Abra esses arquivos.
3. Grave `tasks/<slug>/research.md` com:
   - a tarefa, nas palavras da pessoa
   - o comportamento atual, com caminhos
   - onde a mudança cabe
   - dúvidas de produto, se houver
4. Se faltar uma decisão de produto, pare e pergunte. Não invente a regra. Não escreva o plano.

A etapa seguinte lê esse `research.md`.
