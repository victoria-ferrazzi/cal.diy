# Convenções

Aponte para um exemplo existente. Não invente o nome nem a pasta do próximo arquivo.

## Horário comercial

- Regra: `packages/lib/businessHours.ts`, função `isOutsideBusinessHours`.
- Teste ao lado: `packages/lib/businessHours.test.ts`.
- Aviso na interface: `apps/web/modules/bookings/components/OutsideBusinessHoursAlert.tsx`.

## Intervalo curto entre reuniões

- Regra: `packages/lib/shortBreak.ts`, função `idsWithShortBreak`.
- Teste ao lado: `packages/lib/shortBreak.test.ts`.
- Sinal na coluna do dia: `apps/web/modules/calendars/weeklyview/components/event/EventList.tsx` e `Event.tsx`.

## Specs

Quando a pessoa pedir o fluxo de spec, copie `specs/_templates/` para `specs/{feature}/` e siga `SPEC-WORKFLOW.md`.
