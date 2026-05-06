<!-- Part 1 - Price Filter Bug -->

This issue was twofold. Functionally, the root cause is that the API special-cased `priceMax === 100` to "infinite", so users could neither enforce a true $100/hr cap nor choose specific values like $125/hr. For users, this issue was exacerbated by making the highest value "$100+", which clearly confused User #2.

I fixed the issue along two lines: make the UI clearer (i.e. remove the "+" from the max selectable value), and make the max value the actual max value of the items instead of an arbitrary $100.

There is no need for the max to be configurable since it's now dynamic based on the items. You could consider making the step sizes by market configurable based on the local currency for easy deployment to other markets without needing frontend code changes.

Using max(...) here to find the most expensive is OK given the number of items we're working with here, but I would consider a dedicated endpoint for determining the max, or sourcing this + other relevant info for the page from a `/config` endpoint if there were a) many more items (thousands), or b) the items were paginated on the back-end such that the frontend only gets access to a slice of the data at a time.