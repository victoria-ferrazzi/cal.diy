---
name: score-ambiguity
description: Executa o runner de ambiguidade de issues e mostra o relatório. Use quando a pessoa pedir a eval de ambiguidade. A nota sai do runner, não do texto desta skill.
disable-model-invocation: true
---

# Ambiguidade de issues

A nota é a do relatório gerado pelo runner. Não atribua nota por conta própria. Não altere a rubrica por causa das issues reservadas.

## Procedimento

1. Rode `node harness/evals/ambiguity/run.mjs` na raiz do fork.
2. Abra o `comparison.md` do diretório impresso.
3. Mostre a tabela de calibração, as divergências e a tabela das issues reservadas.
4. Nota zero é issue clara. Resultado inconclusivo é falha da avaliação.
