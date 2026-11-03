# Coordenação dos agentes

Fonte: slide 14, componente Coordenação dos agentes. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

PM, Designer, Planner, Implementer, Tester, Reviewer e Deployer têm papel e ferramentas definidos. O workflow escolhe o agente da etapa, entrega o contexto desse papel e valida a saída. Os comentários identificam o agente e ficam curtos. O papel vem do roteamento, não do texto da issue.

## Entrada

O nome da etapa. O contexto é o pacote montado por quem chama `stage`. O worker acrescenta o `AGENTS.md` do commit de origem ao prompt e valida a resposta contra um schema.

## Saída

O resultado estruturado da etapa, mais o registro da chamada: nome, SHA de base, papel, executor, modelo e uso. O comentário visível leva o nome do agente e um resumo de uma ou duas frases. JSON, logs e hashes ficam fora desse resumo.

## Arquivos do explorador

- `harness/controller.py` L111–119. `stage` resolve o papel, chama o runner e grava a chamada antes de devolver o resultado.
- `harness/agents.py` L39–40. `agent_for_stage` lê a tabela `STAGE_ROLES`.
- `harness/worker.py` L63–68. O prompt recebe as instruções do repositório e a saída passa pela validação do schema.

Os papéis e a tabela de etapas estão no mesmo `agents.py`. O executor do exemplo é Claude Code isolado. Neste fork o executor é o `cursor-agent`.

## O que impede a transição

Etapa sem papel na tabela interrompe a chamada. Resposta que não cumpre o schema não segue. Uma etapa de escrita só existe na implementação. As outras recebem leitura.

## O que o fork já tem

`harness/run.mjs` e `harness/workflow.mjs` chamam um único agente, sem papéis. O `AGENTS.md` da raiz aponta para `agents/`. Há skills locais de onboarding, pesquisa, plano, implementação, autoaprovação de PR e ambiguidade.

## O que falta

Não há tabela de papéis nem validação de schema por etapa. Não há comentário de issue identificado por agente.
