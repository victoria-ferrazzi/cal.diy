# Deploy e verificação

Fonte: slide 14, componente Deploy e verificação. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

Depois do merge, o controlador acompanha o deploy e confere a versão publicada. O Deployer avalia o build, o smoke test e os critérios de produção do plano. A entrega só fica concluída quando a verificação é dessa versão. Falha registra evidência, pede rollback e avisa na issue.

## Entrada

O SHA do merge, a issue, o plano e as evidências do deploy. No exemplo, essas evidências vêm do Railway.

## Saída

A verificação com o SHA publicado, `passed` e os achados. Sucesso grava `done`. Falha grava o diagnóstico, publica a evidência e não conclui a tarefa.

## Arquivos do explorador

- `harness/controller.py` L572–575. A chamada `deploy` recebe o SHA do merge, a issue, o plano e o deployment.
- `harness/controller.py` L578–580. SHA diferente do merge, verificação reprovada ou achado impedem `done`.

## O que impede a transição

Verificação de outro SHA não conclui. `passed` falso ou achados interrompem e pedem rollback. Declarar a tarefa pronta sem a evidência observada não é uma transição válida.

## O que o fork já tem

A versão publicada é o SHA do merge em `main`. O job `Versão publicada` em `.github/workflows/harness.yml` faz checkout desse SHA, repete o teste citado no plano e grava `head_sha`, `passed` e os achados. O estado só fica `done` se o SHA da evidência for o SHA do merge e o teste passar. Não há Railway.

## O que falta

O job só roda depois que o workflow está em `main` e a PR da feature foi mergeada com os gates liberados. Falha pede para reverter o commit do merge.
