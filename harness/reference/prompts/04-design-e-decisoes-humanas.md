# Design e decisões humanas

Fonte: slide 14, componente Design e decisões humanas. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

O PM decide se a mudança precisa de design. Tela nova pede três opções ao Designer e a escolha na issue. A opção escolhida entra no planejamento. O plano é aprovado antes da implementação. Mudança simples e definida segue sem essas pausas quando as verificações permitem.

## Entrada

A necessidade de design recebe issue, PM e pesquisa. A geração recebe issue, pesquisa e o briefing. A escolha humana é um comentário na issue. A aprovação do plano é outro comentário, com o fingerprint pendente.

## Saída

`design_required` verdadeiro ou falso. Quando há design, três opções e o fingerprint da versão publicada. A opção escolhida, com esse fingerprint, segue para o plano. A aprovação grava ator, fingerprint e id do comentário e libera `implement`.

## Arquivos do explorador

- `harness/workflow.py` L153–156. A chamada `design_need` marca design como necessário se o resultado pedir, se a confiança for menor que 0,85, ou se o PM classificou a mudança como tela.
- `harness/workflow.py` L76–77. A aprovação só é aceita por `validate_approval`. O estado passa para `implement` com o registro da aprovação.

A geração das três opções e a publicação do fingerprint estão em `workflow.py`, nas etapas `design` e `publish_plan`, no mesmo arquivo.

## O que impede a transição

Tela nova não pula o design. A escolha precisa repetir o fingerprint da versão pendente, com issue e base iguais às da publicação. A aprovação do plano exige status `awaiting_approval`, o mesmo fingerprint, issue e base inalteradas e permissão de escrita. Plano de tela, plano complexo ou caminho em `human_risk_prefixes` não entra em implementação direto.

## O que o fork já tem

A forma da aprovação está decidida: comentário com o fingerprint e registro no JSON da issue. Os caminhos que seguram o plano estão decididos em `human_risk_prefixes`. Nada disso está em código. `harness/approve-pr.mjs` decide autoaprovação de uma PR pronta. É outra regra.

## O que falta

Não há PM, Designer, publicação de opções nem gate de aprovação do plano. Se a feature passa por design continua pendente na execução.
