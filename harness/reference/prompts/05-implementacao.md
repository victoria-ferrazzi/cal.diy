# Implementação

Fonte: slide 14, componente Implementação. Arquivos completos em `sessoes/orquestracao/sources/`.

## Responsabilidade

O Implementer recebe o plano aprovado e altera só os arquivos permitidos. Escrever código da aplicação só é possível nesta etapa. O diff é conferido antes da PR. O mesmo candidato segue para os testes. Correção pedida pela CI mantém o plano e o limite de tentativas.

## Entrada

Issue, plano, design escolhido quando existe, e a marca de plano aprovado. No reparo, também as falhas de CI do candidato. O runner abre escrita só quando a etapa é `implement`.

## Saída

O diff do candidato e a PR publicada a partir desse diff. O SHA da cabeça identifica o commit que os testes vão receber. O estado guarda o número da tentativa.

## Arquivos do explorador

- `harness/controller.py` L270–272. A chamada `implement` recebe issue, plano, aprovação, falhas de CI no reparo e o design escolhido.
- `harness/claude.py` L10–11. As ferramentas de edição entram só com `writable`. As outras etapas ficam em leitura, busca e, no exemplo, shell.

`validate_diff` e `safe_path`, em `policy.py`, recusam caminho protegido, tipo de arquivo fora da lista e diff acima do limite antes da publicação.

## O que impede a transição

Etapa diferente de implementação não recebe escrita. Caminho protegido, fora dos prefixos da aplicação, symlink ou diff vazio ou grande demais não vira PR. Design obrigatório sem opção escolhida bloqueia. O limite de tentativas de correção encerra o reparo.

## O que o fork já tem

`harness/run.mjs` pode editar o worktree se o agente decidir editar. Não há trava por etapa nem conferência de diff antes de publicar. A lista de caminhos protegidos do exemplo não está implementada.

## O que falta

Não há Implementer preso ao plano aprovado, nem publicação de PR a partir de um diff conferido, nem limite de tentativas de reparo.
