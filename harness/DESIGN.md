# Desenho do harness

Este arquivo registra o ponto de partida e o desenho dos gates. Não muda o controller. A árvore antiga (`workflow.yaml`, `roles/`, `scripts/gate`, `scripts/run`, `scripts/approve`) não será criada.

O stash `c1eae54ac3` fica de fora. Nenhum arquivo dele entra enquanto a feature do exercício final não for escolhida.

Testes e revisão rodam em série. Este desenho não os coloca em paralelo.

## Caminhos que existem

- `harness/controller.mjs`
- `harness/controller/policy.mjs`
- `harness/controller/github.mjs`
- `harness/controller/agent.mjs`
- `harness/ci-plan.mjs`
- `harness/reference/prompts/`
- `.github/workflows/harness.yml`
- `.github/workflows/harness-ci.yml`

O estado da tarefa fica em `runs/<issue>.json` no branch `harness-state`. Cada aprovação humana fica nesse JSON, com ator, valor aprovado e id do comentário. A evidência humana da aprovação fica em `evidence/issues/<n>/approvals.jsonl` na pull request da feature. O gate não lê essa cópia. Não há `state.json` local da tarefa.

`harness/runs/<id>/` é o log de uma chamada local do comando headless. Não é o estado da tarefa.

## Pausas que já existem

- Esclarecimento. Texto livre. O planejamento recomeça e o plano anterior deixa de valer. Não é um gate de aprovação.
- H2. Comentário cujo corpo é só o fingerprint do plano.
- H3, quando pede pessoa. Comentário cujo corpo é só o SHA da cabeça da pull request.
- H4. Merge manual, depois do comentário de que os gates passaram. Não há outro comentário.

## H1 — requisitos

Esclarecimento e a nota de ambiguidade não substituem H1. Nota 2 ou mais na ambiguidade interrompe o planejamento e pede texto livre.

H1 fica entre a ambiguidade e o plano. Só existe quando o PM não tem perguntas, a ambiguidade é menor que 2 e a issue não pede design. Nesse caso o controller comenta o digest da issue (número, título e corpo) e para em `awaiting_requirements`. A pessoa aprova comentando só esse digest.

A aprovação deixa de valer se o título ou o corpo mudam. O controller então publica o digest novo e continua parado. Um digest antigo não libera o plano.

## H2 — plano

O fingerprint que o controller já publica é o H2. O comentário de aprovação é só esse valor. A pessoa precisa ter permissão de escrita.

A aprovação deixa de valer se, antes do comentário, a issue ou o SHA da `main` usado como base mudam. Depois da aprovação, outro plano ou outra avaliação exigem outro fingerprint. A implementação fica presa à base aprovada.

A issue #10 passou por este gate. Ela não é a prova de invalidação pedida pelo exercício final.

## H3 — revisão e checks

O gate de revisão de código que já está em `harness/controller/policy.mjs` é o H3. Não há um segundo limiar para inventar.

O merge segue sem uma pessoa só quando tudo isto é verdadeiro para o SHA da cabeça:

- O Harness CI passou nesse SHA.
- O Tester passou nesse SHA, com achados vazios.
- A complexidade da eval é `low`.
- A adesão ao plano tem nota 3, `passed` verdadeiro e achados vazios.
- O estilo passou, com achados vazios.
- O caminho não é migração nem arquivo core.
- A eval não pede revisão humana.
- O Reviewer devolve nota 3, alinhado, achados vazios e risco `low`.

Fora disso, o controller comenta o SHA e espera esse comentário. `medium` e `high`, migração e arquivo core pedem pessoa mesmo com eval favorável. Resposta inválida ou SHA diferente interrompem a etapa.

A nota de ambiguidade não entra no H3.

A aprovação do SHA deixa de valer se a cabeça da pull request muda. Um comentário com o SHA antigo não libera o SHA novo.

## H4 — aprovação final

O merge manual, feito depois do comentário de que os gates passaram, é o H4. A pessoa não comenta outro valor.

Merge de outro SHA não conclui a tarefa. O job da versão publicada só aceita o resultado quando o status era `ready_to_merge`, o teste do plano passa e o SHA conferido é o do merge.

## Limites já existentes

- Uma revisão de plano.
- Duas tentativas de implementação.
- 20 minutos no implementador.
- 10 minutos no Tester, na eval de código e no Reviewer.

Estouro de tempo interrompe a etapa e não avança o gate. Este desenho não cria outro limite.

## O que este desenho não implementa

H1 está implementado em `harness/controller.mjs` e testado em `harness/controller/policy.test.mjs`. Ainda não está na `main`. H2, H3 e H4 já têm o comportamento descrito acima. A prova deliberada de invalidar uma aprovação continua pendente. A issue #10 não serve como essa prova.
