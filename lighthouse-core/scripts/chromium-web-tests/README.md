# Chromium Web Tests

## Running

```sh
# Setup dependencies.
export DEVTOOLS_PATH=~/tmp/devtools/devtools-frontend
export BLINK_TOOLS_PATH=~/tmp/blink_tools

bash lighthouse-core/scripts/chromium-web-tests/download-devtools.sh
bash lighthouse-core/scripts/chromium-web-tests/download-blink-tools.sh
node lighthouse-core/scripts/chromium-web-tests/download-content-shell.js
yarn build-devtools

# Run web tests.
bash lighthouse-core/scripts/chromium-web-tests/run-web-tests.sh
```

## Modifying blink-tools

Simply make your changes in $BLINK_TOOLS_PATH, run `git diff | pbcopy` (copies to clipboard), and save the new patch as `blink-tools.patch`.
