import type { Dayjs } from "@calcom/dayjs";

/** A break shorter than this, in minutes, is signaled. Ten minutes is enough. */
export const SHORT_BREAK_MINUTES = 10;

export type TimedSpan = {
  id: number;
  start: Dayjs;
  end: Dayjs;
};

/**
 * Ids of spans with less than `gapMinutes` between the end of one and the start
 * of the next. `start` and `end` are already in the timezone applied by the caller.
 * Invalid dates are ignored. The caller passes only the spans of the displayed day.
 */
export function idsWithShortBreak(spans: TimedSpan[], gapMinutes: number = SHORT_BREAK_MINUTES): number[] {
  const valid = spans.filter((span) => span.start.isValid() && span.end.isValid());
  const sorted = [...valid].sort((a, b) => a.start.valueOf() - b.start.valueOf());
  const marked = new Set<number>();

  for (let index = 0; index < sorted.length - 1; index++) {
    const gap = sorted[index + 1].start.diff(sorted[index].end, "minute", true);
    if (gap < gapMinutes) {
      marked.add(sorted[index].id);
      marked.add(sorted[index + 1].id);
    }
  }

  return [...marked];
}
