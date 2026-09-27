"use client";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { isOutsideBusinessHours } from "@calcom/lib/businessHours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";

type Instant = Date | string | Dayjs;

export function OutsideBusinessHoursAlert({
  ranges,
  timeZone,
  className,
}: {
  ranges: { start: Instant; end: Instant }[];
  timeZone?: string | null;
  className?: string;
}): JSX.Element | null {
  const { t } = useLocale();

  if (!timeZone) return null;

  const outside = ranges.some((range) =>
    isOutsideBusinessHours(dayjs(range.start).tz(timeZone), dayjs(range.end).tz(timeZone))
  );

  if (!outside) return null;

  return (
    <div data-testid="outside-business-hours-warning">
      <Alert
        className={className}
        severity="warning"
        title={t("outside_business_hours_title")}
        message={t("outside_business_hours_message")}
      />
    </div>
  );
}
