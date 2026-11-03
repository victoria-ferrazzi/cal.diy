# Paralelismo

Fonte: slide 14, componente Paralelismo. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

Avaliações independentes podem correr em paralelo sobre a mesma versão do código. Os resultados ficam separados e se reúnem num gate. Etapas que dependem uma da outra conservam a ordem. Estado e orçamento ficam protegidos contra gravação simultânea.

## Entrada

O mesmo SHA candidato para cada avaliação independente. O estado e o orçamento entram com a versão lida antes da gravação.

## Saída

Um resultado por avaliação, cada um identificado pelo SHA. O gate recebe o conjunto. O controlador do exemplo continua serial: um grupo de concorrência impede duas execuções do workflow ao mesmo tempo, e a gravação do estado exige o SHA do blob lido.

## Arquivos do explorador

- `.github/workflows/harness.yml` L25–27. O grupo `cal-diy-harness-controller` não cancela a execução em andamento.

Não há, no snapshot, uma chamada que dispare as evals em paralelo. O prompt propõe esse arranjo. O código mostrado serializa o controlador.

## O que impede a transição

Uma etapa que depende do resultado de outra não começa antes. Duas gravações do mesmo estado não se sobrepõem: a segunda, sem o SHA atual do blob, falha. O gate só reúne evidências do mesmo SHA.

## O que o fork já tem

`harness/workflow.mjs` espera a primeira chamada terminar antes da segunda. Não há avaliações paralelas nem proteção de orçamento.

## O que falta

Não há evals paralelas. Também não há o controlador serial do exemplo, com grupo de concorrência e trava do blob. Paralelismo fica para depois de ler as dependências. Esta atividade não o implementa.
