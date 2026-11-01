---
name: implement
description: Implementa um plan.md já aprovado, roda as verificações do plano e abre a PR com o que passou e o que não rodou. Use quando a pessoa aprovar o plano ou pedir implement, o terceiro passo do fluxo Research, Plan e Implement.
disable-model-invocation: true
---

# Implement

## Entrada

`tasks/<slug>/plan.md` aprovado e os arquivos que o plano cita. Sem uma frase da pessoa aprovando esse arquivo, pare. Não trate o pedido de "criar o plano" como aprovação.

## Procedimento

1. Leia `tasks/<slug>/plan.md`. Implemente só o que está nele.
2. Rode as verificações listadas no plano. Um comando que falhou ou não pôde rodar não conta como sucesso.
3. Abra a PR no fork pessoal, com base em `main`. Não faça merge. Na descrição, indique a feature, a pesquisa, o plano e separe verificação que passou de verificação que não rodou.
4. O push por HTTPS deste fork falha sem credencial. Use `git@github.com:victoria-ferrazzi/cal.diy.git` sem alterar `origin`.
