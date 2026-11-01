---
name: plan
description: Escreve tasks/<slug>/plan.md a partir da pesquisa de uma tarefa e para até a pessoa aprovar. Use quando a pessoa pedir o plano, plan, ou o segundo passo do fluxo Research, Plan e Implement.
disable-model-invocation: true
---

# Plan

Não implemente. Não edite código de produto.

## Entrada

A tarefa e `tasks/<slug>/research.md`. Se a pesquisa não existir, pare e peça para rodar a skill research.

## Procedimento

1. Leia `tasks/<slug>/research.md` inteiro antes de propor mudanças.
2. Confira se o plano responde à tarefa. Se a pesquisa tiver dúvida de produto em aberto, pare e pergunte.
3. Grave `tasks/<slug>/plan.md` com:
   - o que muda, arquivo a arquivo
   - o que fica de fora
   - as verificações, com o comando exato
4. Pare. Diga que a implementação espera a pessoa aprovar esse `plan.md`.

A skill implement só segue depois dessa aprovação.
