# Chromium Web Tests

## Running

```sh
# Setup dependencies.
git clone https://chromium.googlesource.com/devtools/devtools-frontend.git ~/tmp/devtools
BLINK_TOOLS_PATH=~/tmp/blink_tools bash lighthouse-core/scripts/chromium-web-tests/download-blink-tools.sh
node lighthouse-core/scripts/chromium-web-tests/download-content-shell.js

# Run web tests.
BLINK_TOOLS_PATH=~/tmp/blink_tools DEVTOOLS_PATH=~/tmp/devtools bash lighthouse-core/scripts/chromium-web-tests/run-web-tests.sh
```

## Modifying blink-tools

Simply make your changes in $BLINK_TOOLS_PATH, run `git diff | pbcopy` (copies to clipboard), and save the new patch as `blink-tools.patch`.
