# Persistência da memória

Fonte: slide 14, componente Persistência da memória. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

O estado da tarefa, o plano, as decisões e as evidências permanecem entre etapas. Cada chamada recebe só o contexto do seu papel. A decisão humana fica na issue. O detalhe da avaliação fica na PR. Ao retomar, o workflow carrega o estado salvo e confere a versão dos artefatos.

## Entrada

O número da issue e, na gravação, o SHA do arquivo de estado lido antes. Cada etapa recebe o recorte montado na chamada, não o estado inteiro.

## Saída

`runs/<issue>.json` no branch `harness-state`, com status, plano, avaliação, SHA da base, versão pendente e a aprovação. A gravação devolve o novo SHA do blob. A cópia `approvals.jsonl` na evidência da PR repete a aprovação para leitura humana. O gate não lê essa cópia.

## Arquivos do explorador

- `harness/controller.py` L57–62. `save` atualiza o status e os campos e grava pelo GitHub, devolvendo o SHA do blob.
- `harness/github.py` L83–84. `load_state` lê `runs/<issue>.json` no branch `harness-state` e devolve o conteúdo com o SHA do blob.

O comentário curto sai por `comment`. O JSON da avaliação sai por `publish_evaluation`, nos mesmos arquivos do snapshot.

## O que impede a transição

Gravação sem o SHA lido antes não substitui um estado mais novo. Retomada com digest da issue ou SHA da base diferente do estado não continua. Ausência do arquivo significa que ainda não há execução.

## O que o fork já tem

`harness/runs/<timestamp>/` guarda o log de uma chamada local do `cursor-agent`. Esse diretório acaba com o processo e não é lido pela etapa seguinte. A decisão de usar `harness-state` como fonte do gate já está fechada e ainda sem código.

## O que falta

Não há branch `harness-state`, arquivo `runs/<issue>.json` nem evidência `approvals.jsonl` na PR.
