<!-- Part 1 - Price Filter Bug -->

The root cause was a two-part problem: the API special-cased priceMax === 100 to mean "no upper limit," and the slider ceiling was hardcoded at $100 with a "+" label — together preventing users from enforcing a true $100 cap or selecting values like $125. The fix removes the special-case sentinel and derives the slider ceiling dynamically from the most expensive vehicle in the catalogue, making the filter honest at any price range. Math.max() over 12 items is fine here, but at scale or with paginated data this should move to a dedicated endpoint rather than deriving the max client-side from a partial dataset.

<!-- Part 2: Holiday Discount feature -->
(Assignment doesn't explicitly ask for a writeup for this one, but felt worth including some notes.)

Isolated pricing module: All discount logic lives in `pricing.ts` as pure functions with no framework dependencies. Both `searchVehicles` and `getQuote` consume the same `buildQuote()` function, so search cards and the review page are guaranteed to show consistent pricing.

Data modeling: `AppliedDiscount` is a discriminated union on `type` rather than a flat object. This forces the UI to branch explicitly on discount type, which matters because the two discounts have different display semantics — long-rental changes the hourly rate, holiday discounts the total. A single "effective hourly rate" field would have been misleading for holiday discounts.

Conflict resolution: Best price wins. On an exact tie, holiday discount takes
precedence, which is much more marketable. The people love holidays.

Timezones: Holidays are evaluated on UTC date boundaries (MM-DD, recurring annually). The correct production implementation would use the pickup location's local timezone, but this app has no location data, so UTC is the right simplification for now.

Display: Search cards show base rate struck through alongside the discounted rate and a discount label. Showing the original price increases perceived value of the discount. No label is shown when no discount applies.