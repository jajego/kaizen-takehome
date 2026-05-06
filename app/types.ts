export type AppliedDiscount =
  | {
      type: "none";
      label: null;
      amountCents: 0;
      scope: null;
    }
  | {
      type: "holiday_17_percent";
      label: "Holiday discount (17% off)";
      amountCents: number;
      scope: "total";
    }
  | {
      type: "long_rental_10_per_hour";
      label: "$10/hr long-rental discount";
      amountCents: number;
      scope: "hourly";
      discountedHourlyRateCents: number;
    };

export type Quote = {
  durationHours: number;
  baseHourlyRateCents: number;
  baseTotalCents: number;
  finalTotalCents: number;
  discount: AppliedDiscount;
};
