import dayjs from "@calcom/dayjs";
import { describe, expect, it } from "vitest";
import { isOutsideBusinessHours } from "./businessHours";

const timeZone = "America/Sao_Paulo";

const outside = (startUtc: string, endUtc: string): boolean =>
  isOutsideBusinessHours(dayjs(startUtc).tz(timeZone), dayjs(endUtc).tz(timeZone));

describe("isOutsideBusinessHours", () => {
  it("keeps a weekday booking inside 09:00–18:00", () => {
    // Monday 10:00–11:00 BRT
    expect(outside("2026-09-28T13:00:00.000Z", "2026-09-28T14:00:00.000Z")).toBe(false);
  });

  it("keeps a booking that ends exactly at 18:00", () => {
    // Monday 09:00–18:00 BRT
    expect(outside("2026-09-28T12:00:00.000Z", "2026-09-28T21:00:00.000Z")).toBe(false);
  });

  it("flags a booking that starts before 09:00", () => {
    // Monday 08:30–09:30 BRT
    expect(outside("2026-09-28T11:30:00.000Z", "2026-09-28T12:30:00.000Z")).toBe(true);
  });

  it("flags a booking that ends after 18:00", () => {
    // Monday 17:30–18:30 BRT
    expect(outside("2026-09-28T20:30:00.000Z", "2026-09-28T21:30:00.000Z")).toBe(true);
  });

  it("flags a booking that starts at 18:00", () => {
    // Monday 18:00–18:30 BRT
    expect(outside("2026-09-28T21:00:00.000Z", "2026-09-28T21:30:00.000Z")).toBe(true);
  });

  it("flags Saturday and Sunday", () => {
    expect(outside("2026-10-03T13:00:00.000Z", "2026-10-03T14:00:00.000Z")).toBe(true);
    expect(outside("2026-09-27T13:00:00.000Z", "2026-09-27T14:00:00.000Z")).toBe(true);
  });

  it("flags a booking that crosses midnight", () => {
    // Friday 17:00 BRT through Saturday 09:30 BRT
    expect(outside("2026-10-02T20:00:00.000Z", "2026-10-03T12:30:00.000Z")).toBe(true);
  });

  it("ignores invalid dates", () => {
    expect(isOutsideBusinessHours(dayjs("not-a-date"), dayjs("also-not-a-date"))).toBe(false);
  });
});
