import dayjs from "@calcom/dayjs";
import { describe, expect, it } from "vitest";
import { idsWithShortBreak } from "./shortBreak";

const timeZone = "America/Sao_Paulo";

const span = (id: number, startUtc: string, endUtc: string) => ({
  id,
  start: dayjs(startUtc).tz(timeZone),
  end: dayjs(endUtc).tz(timeZone),
});

describe("idsWithShortBreak", () => {
  it("lists a span once when it participates in two short breaks", () => {
    const ids = idsWithShortBreak([
      span(1, "2026-09-28T10:00:00-03:00", "2026-09-28T10:30:00-03:00"),
      span(2, "2026-09-28T10:35:00-03:00", "2026-09-28T11:00:00-03:00"),
      span(3, "2026-09-28T11:05:00-03:00", "2026-09-28T11:30:00-03:00"),
    ]);

    expect(ids.filter((id) => id === 2)).toEqual([2]);
  });
  it("marks both meetings when the break is under 10 minutes", () => {
    // Monday 10:00–10:30 and 10:35–11:00 BRT
    const ids = idsWithShortBreak([
      span(1, "2026-09-28T13:00:00.000Z", "2026-09-28T13:30:00.000Z"),
      span(2, "2026-09-28T13:35:00.000Z", "2026-09-28T14:00:00.000Z"),
    ]);
    expect(ids.sort()).toEqual([1, 2]);
  });

  it("leaves a break of exactly 10 minutes unmarked", () => {
    // Monday 10:00–10:30 and 10:40–11:00 BRT
    const ids = idsWithShortBreak([
      span(1, "2026-09-28T13:00:00.000Z", "2026-09-28T13:30:00.000Z"),
      span(2, "2026-09-28T13:40:00.000Z", "2026-09-28T14:00:00.000Z"),
    ]);
    expect(ids).toEqual([]);
  });

  it("marks only the pair that is short when a third meeting has room", () => {
    // 10:00–10:30, 10:35–11:00 (5 min), 12:00–12:30
    const ids = idsWithShortBreak([
      span(1, "2026-09-28T13:00:00.000Z", "2026-09-28T13:30:00.000Z"),
      span(3, "2026-09-28T15:00:00.000Z", "2026-09-28T15:30:00.000Z"),
      span(2, "2026-09-28T13:35:00.000Z", "2026-09-28T14:00:00.000Z"),
    ]);
    expect(ids.sort()).toEqual([1, 2]);
  });

  it("marks overlapping meetings", () => {
    const ids = idsWithShortBreak([
      span(1, "2026-09-28T13:00:00.000Z", "2026-09-28T14:00:00.000Z"),
      span(2, "2026-09-28T13:30:00.000Z", "2026-09-28T14:30:00.000Z"),
    ]);
    expect(ids.sort()).toEqual([1, 2]);
  });

  it("ignores invalid dates", () => {
    const ids = idsWithShortBreak([
      { id: 1, start: dayjs("not-a-date"), end: dayjs("also-not") },
      span(2, "2026-09-28T13:00:00.000Z", "2026-09-28T13:30:00.000Z"),
    ]);
    expect(ids).toEqual([]);
  });
});
