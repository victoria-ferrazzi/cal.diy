# Review e gates

Fonte: slide 14, componente Review e gates. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

Evals de complexidade, adesão ao plano e estilo examinam o candidato. Um Reviewer independente examina o diff, o plano e as evidências. Migração, arquivo core e riscos apontados vão para revisão humana. Quando a pessoa precisa autorizar, o comentário na issue nomeia o commit avaliado. O merge confere essa autorização e os checks.

## Entrada

A eval de código recebe SHA, issue, plano, design escolhido, diff, checks, resultado do Tester e a revisão determinística. O Reviewer recebe esse pacote mais as evals e o gate. A autorização humana é um comentário cujo corpo é o SHA da cabeça.

## Saída

Três resultados, todos com o SHA do candidato: complexidade, adesão ao plano e estilo. O Reviewer devolve nota, alinhamento, achados e risco. O gate junta a regra fixa e esses resultados e diz se exige pessoa. A autorização grava ator, SHA e id do comentário.

## Arquivos do explorador

- `harness/policy.py` L100–102. `review_passes` exige o SHA do candidato, nota mínima, alinhamento, nenhum achado e risco baixo.
- `harness/policy.py` L140–143. `code_review_gate` começa pela revisão determinística: migração e arquivo core entram nas razões de revisão humana.

A chamada `code_evals` e a chamada `review` estão em `controller.py`, no fluxo `complete`, no mesmo snapshot.

## O que impede a transição

JSON de outro commit não serve. Complexidade `medium` ou `high`, adesão abaixo de 3, achado de estilo ou `human_review.required` pedem pessoa. Migração e arquivo core pedem pessoa mesmo com eval favorável. Resposta inválida da eval interrompe a etapa. O comentário de merge precisa ser o SHA da cabeça atual, feito por quem tem escrita, com issue e base iguais às do estado. Check obrigatório sem sucesso bloqueia o merge.

## O que o fork já tem

`harness/approve-pr.mjs` aplica outra política: Markdown e locales, no máximo 80 linhas e `git diff --check` daquele SHA. `harness/evals/ambiguity/` mede a issue, não o diff. As listas de arquivo core, a rubrica de código e o limiar 3 estão decididos e ainda sem código.

## O que falta

Não há eval de código, Reviewer nem gate que una regra fixa, eval e autorização do SHA.
