# Testes e evidências

Fonte: slide 14, componente Testes e evidências. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

A CI executa testes, checagem de tipos e estilo. O Tester confere critérios de aceite e cobertura com as evidências do commit candidato. Lacunas ficam registradas e interrompem o avanço. Aprovação humana não libera candidato que falhou no teste obrigatório.

## Entrada

SHA do candidato, issue, plano, design escolhido quando existe, diff e evidências dos checks. Os checks precisam ser desse SHA.

## Saída

Resultado do Tester com o mesmo SHA, `passed` e a lista de achados. A avaliação é publicada. Sucesso leva a `awaiting_review`. Falha sela as evidências e pede correção, sem avançar para revisão.

## Arquivos do explorador

- `harness/controller.py` L386–389. A chamada `test` grava `test_review` e publica a avaliação.
- `harness/controller.py` L401–402. Revisão humana não atravessa o gate do Tester. SHA diferente, teste reprovado ou achado geram erro de gate.

## O que impede a transição

Check obrigatório sem sucesso para aquele SHA não chama o Tester. Resultado sem o SHA do candidato, `passed` falso ou achados param a etapa. Um comentário de aprovação não substitui essa evidência.

## O que o fork já tem

O repositório já tem testes, checagem de tipos e Biome, disparados pelo fluxo normal de CI. `harness/workflow.mjs` só confere se a primeira chamada citou um caminho existente. Não lê checks de um commit.

## O que falta

Não há Tester ligado ao SHA candidato nem gate que impeça a revisão quando o teste falha. Quais checks são obrigatórios para o harness continua em aberto, junto com a Action.
