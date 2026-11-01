# Pesquisa: sem tempo para um café

Tarefa: sinalizar reuniões consecutivas com menos de 10 minutos de intervalo no dia exibido, no fuso do projeto. Sem notificação de fundo, integração nova ou migração.

## Comportamento atual

Não há sinal para intervalo curto entre reuniões. `bufferTime` no usuário e no tipo de evento é outra regra (folga na disponibilidade), não um aviso no dia.

O dia exibido no calendário semanal é uma coluna de `EventList`:

- `apps/web/modules/calendars/weeklyview/components/event/EventList.tsx` filtra `events` do store cujo `start` cai no `day` da coluna e ignora `options.allDay`.
- O fuso do calendário está em `useCalendarStore` (`timezone`), com padrão `CURRENT_TIMEZONE` em `packages/lib/timezoneConstants.ts` (`dayjs.tz.guess()`, ou `Europe/London`).
- Horas e células já usam esse fuso (`packages/features/calendars/weeklyview/utils/index.ts`). A coluna do dia, em `getDaysBetweenDates`, não aplica o fuso.

O padrão de aviso já usado no fork é função pura em `packages/lib` mais teste ao lado, como `packages/lib/businessHours.ts`.

## Onde a mudança cabe

- Função pura que recebe os intervalos do dia, já no fuso de quem chama, e devolve os ids com intervalo menor que 10 minutos.
- `EventList` aplica o fuso do store e marca esses eventos.
- `Event.tsx` só sinaliza. Não bloqueia clique nem reserva.

## Decisões usadas

A frase da tarefa fecha o recorte: sinalizar, menos de 10 minutos, dia exibido, fuso do projeto.

- Reunião: evento já desenhado na coluna, exceto all-day, que a coluna já ignora.
- Intervalo: fim de uma reunião até o início da próxima, em minutos. Exatos 10 minutos não sinalizam. Sobreposição sinaliza, porque o intervalo é menor que 10.
- Fuso: `timezone` do calendário, aplicado aos instantes antes da conta. A função não escolhe o fuso.
- As duas reuniões do par são sinalizadas.
- Reuniões de outro dia não entram, porque a coluna só recebe o dia exibido.
