# Chromium Web Tests

## Run

```sh
yarn build-devtools
node lighthouse-core/scripts/chromium-web-tests/test.sh

# Reset the results.
node lighthouse-core/scripts/chromium-web-tests/test.sh --reset-results
```

## Modifying blink-tools

Simply make your changes in $BLINK_TOOLS_PATH, run `git diff | pbcopy` (copies to clipboard), and save the new patch as `blink-tools.patch`.
