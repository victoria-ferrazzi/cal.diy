# Workflow

Fonte: slide 14, componente Workflow. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

Uma issue com a label `priorizado` inicia a entrega. O workflow escolhe o próximo job pelo estado da tarefa, confere as condições de avanço, registra o resultado e pede decisões humanas na própria issue. No exemplo o agente é Claude Code. Neste fork o agente é o `cursor-agent`, e o workflow roda no GitHub Actions.

## Entrada

Evento do GitHub: issue marcada como `priorizado`, comentário de decisão, ou conclusão de CI. O estado já gravado, quando existe, traz status, digest da issue, SHA da base e a ação esperada.

## Saída

O próximo job: `pm`, `ambiguity`, `plan`, `implement`, `test`, `review` ou `ignored`. O job seguinte só começa se a condição do passo anterior for verdadeira.

## Arquivos do explorador

- `.github/workflows/harness.yml` L58–63. O job do PM só roda quando a entrada devolve `next == 'pm'`.
- `harness/workflow.py` L143–150. A chamada do PM recebe a issue. Se houver perguntas, o status fica `needs_information`. Sem perguntas, segue para `ambiguity`.

A escolha do próximo job, para os outros eventos, está em `workflow.py`, na função `init`, no mesmo arquivo que o explorador aponta.

## O que impede a transição

A label `priorizado` ausente ignora o evento. Quem não tem permissão de escrita não inicia nem esclarece. Uma execução ativa da mesma issue bloqueia outro começo. Issue ou base diferentes do estado gravado tornam a execução obsoleta.

## O que o fork já tem

`harness/run.mjs` chama o `cursor-agent` uma vez, com `-p --trust --output-format json`, e grava o log em `harness/runs/<timestamp>/`. `harness/workflow.mjs` encadeia duas chamadas locais: a segunda só começa se a primeira citar um caminho que existe no repositório.

## O que falta

Não há workflow de GitHub Actions disparado pela label `priorizado`. Não há controlador que escolha o próximo job a partir do estado de uma issue. O evento, o secret e as permissões da Action continuam pendentes na execução desta atividade.
