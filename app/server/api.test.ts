import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { API } from "./api";

const buildFarFutureRange = () => {
  // Keep tests away from seeded reservation windows that are near "today".
  const start = addDays(new Date(), 30);
  const end = addDays(start, 1);
  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
};

describe("API price filtering", () => {
  it("treats selected max price as a hard cap (no implicit infinity rule)", () => {
    const { startTime, endTime } = buildFarFutureRange();

    const result = API.searchVehicles({
      startTime,
      endTime,
      passengerCount: 1,
      classifications: API.getFilterOptions().classifications,
      makes: API.getFilterOptions().makes,
      priceMin: 10,
      priceMax: 100,
    });

    expect(result.vehicles.length).toBeGreaterThan(0);
    for (const vehicle of result.vehicles) {
      expect(vehicle.hourly_rate_cents).toBeLessThanOrEqual(100 * 100);
    }
  });

  it("uses the most expensive vehicle as max filter option", () => {
    const options = API.getFilterOptions();
    expect(options.maxPriceDollars).toBe(220);
  });
});
