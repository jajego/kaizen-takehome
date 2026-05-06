import { DateTime } from "luxon";
import { Quote } from "../types";

const HOLIDAYS_MM_DD = new Set([
  "01-21",
  "02-12",
  "03-04",
  "05-02",
  "06-16",
  "07-26",
  "08-03",
  "09-01",
  "11-05",
  "12-18",
]);

const LONG_RENTAL_DISCOUNT_CENTS_PER_HOUR = 1000;
const HOLIDAY_DISCOUNT_RATE = 0.17;


const toUtcDate = (dateTime: DateTime) => dateTime.toUTC().startOf("day");

const isHolidayDate = (dateTime: DateTime) => {
  const mmdd = dateTime.toFormat("MM-dd");
  return HOLIDAYS_MM_DD.has(mmdd);
};

const reservationIncludesHoliday = (start: DateTime, end: DateTime) => {
  const startUtcDate = toUtcDate(start);
  const endUtcDate = toUtcDate(end);

  let cursor = startUtcDate.plus({ days: 1 });
  while (cursor < endUtcDate) {
    if (isHolidayDate(cursor)) {
      return true;
    }
    cursor = cursor.plus({ days: 1 });
  }
  return false;
};

export function buildQuote({
  start,
  end,
  hourlyRateCents,
}: {
  start: DateTime;
  end: DateTime;
  hourlyRateCents: number;
}): Quote {
  const durationHours = end.diff(start, "hours").hours || 0;
  const baseTotalCents = Math.round(hourlyRateCents * durationHours);

  const startsOnHoliday = isHolidayDate(toUtcDate(start));
  const endsOnHoliday = isHolidayDate(toUtcDate(end));
  const includesHoliday = reservationIncludesHoliday(start, end);
  const holidayEligible = includesHoliday && !startsOnHoliday && !endsOnHoliday;
  const longRentalEligible = durationHours > 72;

  const holidayDiscountAmount = holidayEligible
    ? Math.round(baseTotalCents * HOLIDAY_DISCOUNT_RATE)
    : 0;
  const holidayFinalTotal = baseTotalCents - holidayDiscountAmount;

  const discountedHourlyRateCents = Math.max(
    0,
    hourlyRateCents - LONG_RENTAL_DISCOUNT_CENTS_PER_HOUR,
  );
  const longRentalFinalTotal = Math.round(
    discountedHourlyRateCents * durationHours,
  );
  const longRentalDiscountAmount = baseTotalCents - longRentalFinalTotal;

  if (holidayEligible && longRentalEligible) {
    // Tie-breaker is intentionally biased toward holiday discount.
    if (holidayFinalTotal <= longRentalFinalTotal) {
      return {
        durationHours,
        baseHourlyRateCents: hourlyRateCents,
        baseTotalCents,
        finalTotalCents: holidayFinalTotal,
        discount: {
          type: "holiday_17_percent",
          label: "Holiday discount (17% off)",
          amountCents: holidayDiscountAmount,
          scope: "total",
        },
      };
    }

    return {
      durationHours,
      baseHourlyRateCents: hourlyRateCents,
      baseTotalCents,
      finalTotalCents: longRentalFinalTotal,
      discount: {
        type: "long_rental_10_per_hour",
        label: "$10/hr long-rental discount",
        amountCents: longRentalDiscountAmount,
        scope: "hourly",
        discountedHourlyRateCents,
      },
    };
  }

  if (holidayEligible) {
    return {
      durationHours,
      baseHourlyRateCents: hourlyRateCents,
      baseTotalCents,
      finalTotalCents: holidayFinalTotal,
      discount: {
        type: "holiday_17_percent",
        label: "Holiday discount (17% off)",
        amountCents: holidayDiscountAmount,
        scope: "total",
      },
    };
  }

  if (longRentalEligible) {
    return {
      durationHours,
      baseHourlyRateCents: hourlyRateCents,
      baseTotalCents,
      finalTotalCents: longRentalFinalTotal,
      discount: {
        type: "long_rental_10_per_hour",
        label: "$10/hr long-rental discount",
        amountCents: longRentalDiscountAmount,
        scope: "hourly",
        discountedHourlyRateCents,
      },
    };
  }

  return {
    durationHours,
    baseHourlyRateCents: hourlyRateCents,
    baseTotalCents,
    finalTotalCents: baseTotalCents,
    discount: {
      type: "none",
      label: null,
      amountCents: 0,
      scope: null,
    },
  };
}
