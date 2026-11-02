# Comparação

Nota zero é uma issue clara. Inconclusivo é falha da avaliação e não é nota zero.

## Casos de calibração

| Caso | Humana | Execução 1 | Execução 2 |
| --- | --- | --- | --- |
| clara | 0 | 0 | 0 |
| decisao-ausente | 2 | 3 | 2 |
| vaga | 3 | 3 | 3 |

## Divergências

### decisao-ausente, execução 1

Referência humana (2): O objetivo está dito e a tela está indicada. O plano da autorização depende de uma regra que a issue e o contexto não definem: qualquer membro, só admin, ou só o dono da agenda.

Juiz (3), modelo Grok 4.7.
Evidências: Membros da equipe precisam editar a disponibilidade uns dos outros. | A tela de disponibilidade passa a permitir essa edição. | O contexto só localiza horário em `packages/lib/businessHours.ts` e intervalo curto em `packages/lib/shortBreak.ts`; não cita tela, membros nem edição de disponibilidade.
Ausências: Comportamento verificável da edição: o que muda na tela, o que é salvo e como confirmar que ficou pronto. | Módulo, arquivo ou responsabilidade da tela de disponibilidade. | Regra de quem pode editar a disponibilidade de quem. | Definição dos dados de disponibilidade que podem ser alterados.
Perguntas: Quais membros podem editar a disponibilidade de quais outros membros? | Quais dados de disponibilidade podem ser alterados e qual resultado observável confirma o salvamento? | Em qual módulo ou tela existente essa edição deve acontecer?

A rubrica permanece na v1. A segunda execução de `decisao-ausente` deu nota 2, que é a referência. A primeira leu a falta de detalhe de aceite como nota 3. O critério da v1 já separa essa decisão de uma issue sem objetivo. Não houve ajuste.

## Issues reservadas

Estas issues não orientam ajuste da rubrica.

| Caso | Humana | Execução |
| --- | --- | --- |
| reservada-clara | 0 | 0 |
| reservada-vaga | 3 | 3 |
