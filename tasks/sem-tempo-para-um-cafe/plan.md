# Plano: sem tempo para um café

Aprovado para execução quando a pessoa pediu para construir o plano da aula de skills, com esta feature já escolhida.

## Mudanças

- `packages/lib/shortBreak.ts`: `idsWithShortBreak`. Intervalo estritamente menor que 10 minutos marca os dois ids. Datas inválidas ficam de fora.
- `packages/lib/shortBreak.test.ts`: intervalo de 5 minutos, intervalo de 10, par isolado entre três reuniões, sobreposição e data inválida. Instants convertidos com `America/Sao_Paulo`.
- `apps/web/modules/calendars/weeklyview/components/event/EventList.tsx`: lê `timezone` do store, converte início e fim com esse fuso e passa `shortBreak` para o evento.
- `apps/web/modules/calendars/weeklyview/components/event/Event.tsx`: marca o evento com `data-testid="short-break-warning"` e o texto traduzido. O clique continua igual.
- Chaves `short_break_message` em `packages/i18n/locales/en/common.json`, `pt/common.json` e `pt-BR/common.json`.
- `agents/PRODUCT.md` e `agents/CONVENTIONS.md`: registrar a regra e apontar os arquivos. O `AGENTS.md` da raiz não cresce.

## Fora

- Notificação de fundo, calendário externo, migração e alteração de `bufferTime`.
- Mudar de coluna um evento perto da meia-noite. A coluna continua a de `EventList`. O fuso entra na medida do intervalo.

## Verificações

- `yarn vitest run packages/lib/shortBreak.test.ts`
- `yarn workspace @calcom/web lint` no arquivo do calendário, se o lint do app couber no ambiente.
