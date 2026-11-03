# Planejamento e contexto

Fonte: slide 14, componente Planejamento e contexto. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

O Planner recebe a issue, a pesquisa, as decisões do PM e o design escolhido, quando existe. O plano traz arquivos, testes e critérios de aceite. Uma avaliação confere a aderência ao pedido antes da implementação. Divergência sem decisão humana pendente volta ao Planner, com uma tentativa de correção.

## Entrada

Na primeira chamada de plano: issue, pesquisa, PM e design escolhido. Na correção: os mesmos campos, mais o plano anterior e o feedback da avaliação. A avaliação recebe issue, pesquisa, plano, PM e design escolhido.

## Saída

O plano, com os testes novos incluídos na lista de arquivos. A avaliação traz alinhamento, nota, critérios de aceite ausentes, risco e se exige pessoa. O status seguinte é `needs_information`, `awaiting_approval`, `implement` ou `manual_change_required`. O fingerprint do plano identifica essa versão.

## Arquivos do explorador

- `harness/workflow.py` L188–189. A chamada `plan` grava o plano e passa para a avaliação.
- `harness/workflow.py` L201–205. A correção devolve o plano anterior e o feedback da avaliação. O exemplo permite uma tentativa.

`route_plan` e `plan_fingerprint`, no `policy.py` do mesmo snapshot, decidem o destino e o identificador da versão.

## O que impede a transição

Nota abaixo do mínimo, falta de alinhamento, critério de aceite ausente ou pergunta em aberto pedem informação. Risco que não seja baixo, avaliação que exige pessoa, ou arquivo em `human_risk_prefixes`, segura o plano para aprovação. Caminho fora de `safe_path` vira mudança manual. Esgotada a tentativa de correção sem pergunta em aberto, a implementação permanece bloqueada.

## O que o fork já tem

A rubrica de ambiguidade em `harness/evals/ambiguity/` mede a issue antes do plano. A decisão de fingerprint já está fechada: SHA-256 da issue, do SHA da base, do plano e da avaliação. Não há código disso no fork.

## O que falta

Não há Planner, avaliação de plano nem tentativa de correção. Não há publicação do fingerprint na issue.
