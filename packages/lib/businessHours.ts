import type { Dayjs } from "@calcom/dayjs";

/** Monday–Friday, 09:00 inclusive through 18:00 inclusive. */
const BUSINESS_HOUR_OPEN_MINUTES: number = 9 * 60;
const BUSINESS_HOUR_CLOSE_MINUTES: number = 18 * 60;

/**
 * A booking is outside business hours when, in the timezone already applied to
 * `start` and `end`, it falls on a weekend, starts before 09:00, ends after
 * 18:00, or crosses midnight.
 */
export function isOutsideBusinessHours(start: Dayjs, end: Dayjs): boolean {
  if (!start.isValid() || !end.isValid()) return false;

  const weekday = start.day();
  if (weekday === 0 || weekday === 6) return true;
  if (!start.isSame(end, "day")) return true;

  const startMinutes = start.hour() * 60 + start.minute();
  const endMinutes = end.hour() * 60 + end.minute();

  if (startMinutes < BUSINESS_HOUR_OPEN_MINUTES || startMinutes >= BUSINESS_HOUR_CLOSE_MINUTES) {
    return true;
  }

  return endMinutes > BUSINESS_HOUR_CLOSE_MINUTES;
}
