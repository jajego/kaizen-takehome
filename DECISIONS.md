<!-- Part 1 - Price Filter Bug -->

The root cause was a two-part problem: the API special-cased priceMax === 100 to mean "no upper limit," and the slider ceiling was hardcoded at $100 with a "+" label — together preventing users from enforcing a true $100 cap or selecting values like $125. The fix removes the special-case sentinel and derives the slider ceiling dynamically from the most expensive vehicle in the catalogue, making the filter honest at any price range. Math.max() over 12 items is fine here, but at scale or with paginated data this should move to a dedicated endpoint rather than deriving the max client-side from a partial dataset.

<!-- Part 2: Holiday Discount feature -->

