#!/usr/bin/env bash

TXT_BOLD=$(tput bold)
TXT_DIM=$(tput setaf 245)
TXT_RESET=$(tput sgr0)

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_PRISTINE_ROOT="$DIRNAME/../../../../lighthouse-pristine"

set -euxo pipefail

bash "$DIRNAME/prepare-pristine.sh"

cd "$LH_PRISTINE_ROOT"

# Install deps
yarn --check-files

# Test err'thing
echo "${TXT_BOLD}Building all the clients..."
yarn build-all

echo "Running the standard test suite..."
yarn test

echo "Testing the CLI..."
yarn start "https://example.com" --view

echo "Testing a fresh local install..."
VERSION=$(node -e "console.log(require('./package.json').version)")
npm pack

rm -rf /tmp/lighthouse-local-test || true
mkdir -p /tmp/lighthouse-local-test
cd /tmp/lighthouse-local-test

npm init -y
npm install "$LH_PRISTINE_ROOT/lighthouse-$VERSION.tgz"
cd node_modules/lighthouse/lighthouse-cli/test/ && npm install lodash.clonedeep && cd ../../../../
npm explore lighthouse -- npm run smoke -- --retries=3
npm explore lighthouse -- npm run fast -- http://example.com

cd "$LH_PRISTINE_ROOT"
rm -rf /tmp/lighthouse-local-test
rm "lighthouse-$VERSION.tgz"

set +x

echo "${TXT_BOLD}Now manually...${TXT_RESET}"
echo "✅   Test the extension. Open chrome://extensions"
echo "${TXT_DIM}Press Space to continue...${TXT_RESET}"
read -n 1 -r unused_variable

echo "✅   Test the viewer. Open http://localhost:8000"
echo "Run: "
echo "    cd dist/viewer; python -m SimpleHTTPServer"
echo ""
echo "    - Works with v4 report? http://localhost:8000/?gist=7251f9eba409f385e4c0424515fe8009"
echo "    - Works with v5 report? http://localhost:8000/?gist=6093e41b9b50c8d642a7e6bbc784e32f"
echo "    - Works with v6 report? http://localhost:8000/?gist=94722e917a507feb5371ad51be6c3334"
echo "    - Current production viewer (https://googlechrome.github.io/lighthouse/viewer/) has forward compat with next major LHR?"
echo "${TXT_DIM}Press Space to complete the test script...${TXT_RESET}"
read -n 1 -r unused_variable
