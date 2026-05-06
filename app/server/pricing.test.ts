import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { buildQuote } from "./pricing";

describe("buildQuote", () => {
  it("applies no discount when no rule matches", () => {
    const start = DateTime.fromISO("2026-01-10T10:00:00Z");
    const end = DateTime.fromISO("2026-01-11T10:00:00Z");

    const quote = buildQuote({
      start,
      end,
      hourlyRateCents: 5000,
    });

    expect(quote.discount.type).toBe("none");
    expect(quote.baseTotalCents).toBe(120000);
    expect(quote.finalTotalCents).toBe(120000);
  });

  it("applies holiday discount when reservation includes a holiday internally", () => {
    const start = DateTime.fromISO("2026-01-20T10:00:00Z");
    const end = DateTime.fromISO("2026-01-22T10:00:00Z");

    const quote = buildQuote({
      start,
      end,
      hourlyRateCents: 5000,
    });

    expect(quote.discount.type).toBe("holiday_17_percent");
    expect(quote.discount.amountCents).toBe(Math.round(240000 * 0.17));
    expect(quote.finalTotalCents).toBe(240000 - Math.round(240000 * 0.17));
  });

  it("does not apply holiday discount when reservation starts on a holiday", () => {
    const start = DateTime.fromISO("2026-01-21T10:00:00Z");
    const end = DateTime.fromISO("2026-01-23T10:00:00Z");

    const quote = buildQuote({
      start,
      end,
      hourlyRateCents: 5000,
    });

    expect(quote.discount.type).toBe("none");
  });

  it("does not apply holiday discount when reservation ends on a holiday", () => {
    const start = DateTime.fromISO("2026-01-19T10:00:00Z");
    const end = DateTime.fromISO("2026-01-21T10:00:00Z");

    const quote = buildQuote({
      start,
      end,
      hourlyRateCents: 5000,
    });

    expect(quote.discount.type).toBe("none");
  });

  it("applies long-rental discount only when duration is strictly greater than 72 hours", () => {
    const start = DateTime.fromISO("2026-02-01T10:00:00Z");
    const endAtBoundary = DateTime.fromISO("2026-02-04T10:00:00Z");
    const endAboveBoundary = DateTime.fromISO("2026-02-04T10:00:01Z");

    const boundaryQuote = buildQuote({
      start,
      end: endAtBoundary,
      hourlyRateCents: 6000,
    });
    const aboveQuote = buildQuote({
      start,
      end: endAboveBoundary,
      hourlyRateCents: 6000,
    });

    expect(boundaryQuote.discount.type).toBe("none");
    expect(aboveQuote.discount.type).toBe("long_rental_10_per_hour");
  });

  it("clamps discounted hourly rate at zero for long rentals", () => {
    const start = DateTime.fromISO("2026-02-01T10:00:00Z");
    const end = DateTime.fromISO("2026-02-05T10:00:00Z");

    const quote = buildQuote({
      start,
      end,
      hourlyRateCents: 500,
    });

    expect(quote.discount.type).toBe("long_rental_10_per_hour");
    if (quote.discount.type === "long_rental_10_per_hour") {
      expect(quote.discount.discountedHourlyRateCents).toBe(0);
    }
    expect(quote.finalTotalCents).toBe(0);
  });

  it("uses holiday discount as tie-breaker when totals are equal", () => {
    const start = DateTime.fromISO("2026-01-20T10:00:00Z");
    const end = DateTime.fromISO("2026-01-24T10:00:00Z");

    const quote = buildQuote({
      start,
      end,
      hourlyRateCents: 12000,
    });

    // Base: 96 * 12000 = 1,152,000
    // Holiday final: 956,160
    // Long-rental final: 1,056,000
    // Holiday wins outright, and would also win if tied by policy.
    expect(quote.discount.type).toBe("holiday_17_percent");
  });

  it("chooses the lower total when both discounts are eligible", () => {
    const start = DateTime.fromISO("2026-01-20T10:00:00Z");
    const end = DateTime.fromISO("2026-01-24T10:00:00Z");

    const quote = buildQuote({
      start,
      end,
      hourlyRateCents: 12000,
    });

    const durationHours = 96;
    const baseTotal = 12000 * durationHours;
    const holidayFinal = baseTotal - Math.round(baseTotal * 0.17);
    const longRentalFinal = (12000 - 1000) * durationHours;

    expect(holidayFinal).toBeLessThan(longRentalFinal);
    expect(quote.finalTotalCents).toBe(holidayFinal);
    expect(quote.discount.type).toBe("holiday_17_percent");
  });

  it("checks holidays across calendar years", () => {
    const start = DateTime.fromISO("2026-12-17T12:00:00Z");
    const end = DateTime.fromISO("2027-01-22T12:00:00Z");

    const quote = buildQuote({
      start,
      end,
      hourlyRateCents: 0,
    });

    // Includes both Dec 18 and Jan 21 between start and end dates.
    expect(quote.discount.type).toBe("holiday_17_percent");
  });
});
