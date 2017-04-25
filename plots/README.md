# Plots Archive

This is a simple static site for viewing archived runs.

## Adding a new archive run

1. Create a folder in `./archive/` with a descriptive name of the analysis (e.g. `{date}-{overview}`)
2. After running the analyze step, copy the `generatedResults.js` from `/out/`
3. Copy an `index.html` from one of the other archive folders. Replace the url with the appropriate commit hash: `lighthouse/${HASH}/plots/chart.js`. Because the API of chart.js may change, we want to pin down the version.
