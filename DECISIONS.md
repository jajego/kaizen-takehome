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

<!-- Part 3: Refactor -->

1. `Quote` and `AppliedDiscount` were defined in `pricing.ts` but imported by two UI components + the API layer, escaping their origin module. I moved them to `app/types.ts` so that they live at a more sensible level of the stack as a shared contract between the server and client.

2. `buildQuote` was a huge function with four return paths and duplicated discount objects. I broke this down into various helpers that each own a single concern. `buildQuote` is now a much more readable pipline (compute each candidate, pick the best, return one Quote). This is easier for other devs to understand and each helper is independently testable if needed. I also added documentation for non-obvious business rules to help ensure future development does not introduce regressions.

If I had more time: currently, the holiday list and the discount rates are hardcoded constants, which means a business rule change requires a code deploy. The right long-term fix here would be to make these values configurable, either via a DB table or an admin-editable config so that non-engineers can update them easily.

I'd also like to add proper timezone handling using the pickup location's local time rather than UTC, which requires surfacing location data that the app doesn't currently track. It would also require extremely clear, well-considered design as any ambiguity here for the user translates to myriad frustrations and likely a lost customer.

<!-- UX Improvements -->

The most significant UX optimization would be to alert the user when the dates they've selected nearly qualify for a long-duration or holiday discount. We built in these discounts but never surface them proactively, and a nudge in this direction could meaningfully improve conversion.

Others include:
- The list of items shift slightly shift horizontally when filters are applied. This is a little jarring and fixing this subtlety adds trust/professionality and is an accessibility win as well.
- Debounce filtering. Fast filter changes can cause janky re-renders and could stress the API unnecessarily. Debouncing makes this smoother and results in fewer calls. If a search was added, we'd want to debounce this as well.
- Car images currently have no skeleton and load in as "image not found" style errors for the first couple paints. Skeletons would make the loading state feel intentional.
