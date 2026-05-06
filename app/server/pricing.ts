import { DateTime } from "luxon";
import { AppliedDiscount, Quote } from "../types";

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
const LONG_RENTAL_THRESHOLD_HOURS = 72;

const NO_DISCOUNT: AppliedDiscount = {
  type: "none",
  label: null,
  amountCents: 0,
  scope: null,
};

const toUtcDate = (dateTime: DateTime) => dateTime.toUTC().startOf("day");

const isHolidayDate = (dateTime: DateTime) =>
  HOLIDAYS_MM_DD.has(dateTime.toFormat("MM-dd"));

const reservationIncludesHoliday = (start: DateTime, end: DateTime) => {
  const endUtcDate = toUtcDate(end);
  let cursor = toUtcDate(start).plus({ days: 1 });
  while (cursor < endUtcDate) {
    if (isHolidayDate(cursor)) return true;
    cursor = cursor.plus({ days: 1 });
  }
  return false;
};

function computeHolidayDiscount(
  baseTotalCents: number,
  start: DateTime,
  end: DateTime,
): AppliedDiscount | null {
  const eligible =
    reservationIncludesHoliday(start, end) &&
    !isHolidayDate(toUtcDate(start)) &&
    !isHolidayDate(toUtcDate(end));

  if (!eligible) return null;

  const amountCents = Math.round(baseTotalCents * HOLIDAY_DISCOUNT_RATE);
  return {
    type: "holiday_17_percent",
    label: "Holiday discount (17% off)",
    amountCents,
    scope: "total",
  };
}

function computeLongRentalDiscount(
  hourlyRateCents: number,
  baseTotalCents: number,
  durationHours: number,
): AppliedDiscount | null {
  if (durationHours <= LONG_RENTAL_THRESHOLD_HOURS) return null;

  const discountedHourlyRateCents = Math.max(
    0,
    hourlyRateCents - LONG_RENTAL_DISCOUNT_CENTS_PER_HOUR,
  );
  const amountCents =
    baseTotalCents - Math.round(discountedHourlyRateCents * durationHours);
  return {
    type: "long_rental_10_per_hour",
    label: "$10/hr long-rental discount",
    amountCents,
    scope: "hourly",
    discountedHourlyRateCents,
  };
}

// Picks the discount that results in the lowest final total.
// Holiday discount wins on a tie.
function pickBestDiscount(
  a: AppliedDiscount | null,
  b: AppliedDiscount | null,
  baseTotalCents: number,
): AppliedDiscount {
  const finalTotal = (d: AppliedDiscount | null) =>
    d ? baseTotalCents - d.amountCents : Infinity;

  if (!a && !b) return NO_DISCOUNT;
  if (!a) return b!;
  if (!b) return a;
  return finalTotal(a) <= finalTotal(b) ? a : b;
}

/**
 * Calculates a pricing quote for a vehicle reservation, applying the best
 * available discount if one applies.
 *
 * Discount rules:
 * - Holiday (17% off total): a recognised holiday must fall strictly between
 *   the start and end dates. A holiday on the start or end day does not
 *   qualify. Holidays are evaluated on UTC date boundaries — the time
 *   component is ignored.
 * - Long rental ($10/hr off): reservation must be strictly longer than 72
 *   hours.
 * - Discounts are mutually exclusive. If both apply, the one producing the
 *   lower total is used. Holiday discount wins on a tie — this is intentional
 *   for marketing reasons, not an arbitrary choice.
 */
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

  const holiday = computeHolidayDiscount(baseTotalCents, start, end);
  const longRental = computeLongRentalDiscount(
    hourlyRateCents,
    baseTotalCents,
    durationHours,
  );
  const discount = pickBestDiscount(holiday, longRental, baseTotalCents);

  return {
    durationHours,
    baseHourlyRateCents: hourlyRateCents,
    baseTotalCents,
    finalTotalCents: baseTotalCents - discount.amountCents,
    discount,
  };
}
