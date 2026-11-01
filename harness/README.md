# Comando headless

Chama o Cursor Agent sem conversa interativa. A tarefa entra por argumento. Trocar a tarefa não exige editar o script.

## Consulta

Na raiz do fork, com `cursor-agent status` autenticado:

```bash
node harness/run.mjs "Localize o fluxo de disponibilidade e liste os arquivos envolvidos. Não edite arquivos."
```

O comando imprime o diretório da execução e termina com código 0 só quando o agente termina com código 0.

Cada execução cria `harness/runs/<id>/`:

- `result.txt` — stdout do agente (JSON)
- `error.txt` — stderr do processo
- `status.json` — `completed` ou `failed`, mais `exitCode` e `error`

Arquivo de resultado existente não significa sucesso. `status.json` precisa estar `completed` e `exitCode` precisa ser 0.

## Falha controlada

`--agent-arg` acrescenta um argumento à lista passada ao `cursor-agent`, sem shell:

```bash
node harness/run.mjs --agent-arg --output-format --agent-arg nao-existe "Localize o fluxo de disponibilidade. Não edite arquivos."
```

O esperado é `status.json` com `failed`, código diferente de 0, e o erro em `error.txt`.

## Duas chamadas

O controlador valida a primeira chamada em código antes de iniciar a segunda. A segunda recebe o arquivo `result.txt` da primeira.

```bash
node harness/workflow.mjs
node harness/workflow.mjs --fail-a
```

A continuação grava `harness/runs/workflow-<id>/controller.json` com `continued: true` e `runB` preenchido. `--fail-a` passa uma opção inválida na primeira chamada. O controlador para antes da segunda e grava `continued: false` com o motivo.

A execução do extra é feita numa worktree:

```bash
git worktree add -b exercicio/workflow ../cal-diy-workflow
```
