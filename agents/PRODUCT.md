# Regras de horário

Comportamento implementado em `packages/lib/businessHours.ts`. A interface só avisa. Não bloqueia a reserva.

`isOutsideBusinessHours(start, end)` considera `start` e `end` já no fuso aplicado por quem chama. Retorna verdadeiro quando:

- o dia é sábado ou domingo
- `start` e `end` caem em dias diferentes
- `start` é antes de 09:00 ou a partir de 18:00
- `end` é depois de 18:00

Datas inválidas retornam falso. Segunda a sexta, um intervalo que começa às 09:00 ou depois e termina até 18:00 está dentro do horário.

`OutsideBusinessHoursAlert` mostra o aviso para um intervalo fora desse horário no `timeZone` recebido. Sem `timeZone`, não mostra aviso.

Confirme com o usuário qualquer decisão nova de horário ou fuso antes de registrá-la aqui.

## Intervalo curto entre reuniões

No dia exibido no calendário semanal, as duas reuniões de um par são sinalizadas quando o fim de uma e o início da próxima têm menos de 10 minutos. Dez minutos exatos não sinalizam. Sobreposição sinaliza. Eventos de dia inteiro ficam de fora. O aviso não bloqueia o clique.

A conta usa os instantes já convertidos para o `timezone` do calendário (`CURRENT_TIMEZONE` em `packages/lib/timezoneConstants.ts`, quando o store não recebe outro). A regra está em `packages/lib/shortBreak.ts`.
