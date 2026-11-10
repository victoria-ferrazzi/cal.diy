# Desenho do harness

Este arquivo registra o ponto de partida. O controller já está na `main`. A árvore antiga (`workflow.yaml`, `roles/`, `scripts/gate`, `scripts/run`, `scripts/approve`) não será criada.

O stash `c1eae54ac3` fica de fora. Nenhum arquivo dele entra enquanto a feature do exercício final não for escolhida.

## Caminhos que existem

- `harness/controller.mjs`
- `harness/controller/policy.mjs`
- `harness/controller/github.mjs`
- `harness/controller/agent.mjs`
- `harness/ci-plan.mjs`
- `harness/reference/prompts/`
- `.github/workflows/harness.yml`
- `.github/workflows/harness-ci.yml`

O estado da tarefa fica em `runs/<issue>.json` no branch `harness-state`. A evidência humana da aprovação fica em `evidence/issues/<n>/approvals.jsonl` na pull request da feature. O gate não lê essa cópia.

`harness/runs/<id>/` é o log de uma chamada local do comando headless. Não é o estado da tarefa.

## O que este arquivo ainda não faz

O cruzamento dos gates H1 a H4 com as pausas do controller fica para o desenho seguinte. Este arquivo não muda o controller.
