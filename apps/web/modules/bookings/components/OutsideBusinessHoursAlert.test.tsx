import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OutsideBusinessHoursAlert } from "./OutsideBusinessHoursAlert";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

const localesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../../packages/i18n/locales"
);

function readCommon(locale: string): Record<string, string> {
  return JSON.parse(readFileSync(path.join(localesDir, locale, "common.json"), "utf8"));
}

const mondayInside = {
  start: "2026-09-28T13:00:00.000Z",
  end: "2026-09-28T14:00:00.000Z",
};

describe("OutsideBusinessHoursAlert", () => {
  it("keeps the title and says the booking is not blocked", () => {
    const pt = readCommon("pt");
    const ptBR = readCommon("pt-BR");
    const en = readCommon("en");

    expect(pt.outside_business_hours_title).toBe("Fora do horário comercial");
    expect(ptBR.outside_business_hours_title).toBe("Fora do horário comercial");
    expect(en.outside_business_hours_title).toBe("Outside business hours");

    expect(pt.outside_business_hours_message).toBe(
      "Esta reserva está fora do horário comercial, mas não é bloqueada."
    );
    expect(ptBR.outside_business_hours_message).toBe(
      "Esta reserva está fora do horário comercial, mas não é bloqueada."
    );
    expect(en.outside_business_hours_message).toBe(
      "This booking is outside business hours, but it is not blocked."
    );
  });

  it("does not render without a time zone", () => {
    render(<OutsideBusinessHoursAlert ranges={[mondayInside]} />);

    expect(screen.queryByTestId("outside-business-hours-warning")).not.toBeInTheDocument();
  });

  it("does not render Monday 10:00-11:00 in America/Sao_Paulo", () => {
    render(<OutsideBusinessHoursAlert timeZone="America/Sao_Paulo" ranges={[mondayInside]} />);

    expect(screen.queryByTestId("outside-business-hours-warning")).not.toBeInTheDocument();
  });

  it("renders the warning when a range is outside business hours", () => {
    render(
      <OutsideBusinessHoursAlert
        timeZone="America/Sao_Paulo"
        ranges={[mondayInside, { start: "2026-10-03T13:00:00.000Z", end: "2026-10-03T14:00:00.000Z" }]}
      />
    );

    expect(screen.getByTestId("outside-business-hours-warning")).toBeInTheDocument();
    expect(screen.getByText("outside_business_hours_title")).toBeInTheDocument();
    expect(screen.getByText("outside_business_hours_message")).toBeInTheDocument();
  });
});
