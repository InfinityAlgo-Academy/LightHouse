#!/bin/bash

set -euox pipefail

# This script requires LHCI_CANARY_SERVER_URL and LHCI_CANARY_SERVER_TOKEN variables to be set.

if [[ -z "$LHCI_CANARY_SERVER_TOKEN" ]]; then
  echo "No server token available, skipping.";
  exit 0;
fi

if [[ "$TRAVIS_NODE_VERSION" != "10" ]]; then
  echo "Not running dogfood script on node versions other than 10";
  exit 0;
fi


SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_DIR="$SCRIPT_DIR/../.."

# Testing lhci takes time and the server ain't massive, we'll only run the tests if we touched files that affect the report.
CHANGED_FILES=""
if [[ "$CI" ]]; then
  CHANGED_FILES=$(git --no-pager diff --name-only "$TRAVIS_COMMIT_RANGE")
else
  CHANGED_FILES=$(git --no-pager diff --name-only master)
fi

printf "Determined the following files have been touched:\n\n$CHANGED_FILES\n\n"

if ! echo "$CHANGED_FILES" | grep -E 'report|lhci' > /dev/null; then
  echo "No report files affected, skipping lhci checks."
  exit 0
fi

# Generate an HTML report and copy into static-server directory for serving.
yarn now-build
cp ./dist/now/english/index.html ./lighthouse-cli/test/fixtures/lhci.report.html

# Install LHCI
npm install -g @lhci/cli@next
# Start up a test server.
yarn static-server &
# Wait for the server to start before hitting it with data.
sleep 10
# Collect our LHCI results.
lhci collect --url=http://localhost:10200/lhci.report.html
# Upload the results to our canary server.
lhci upload --serverBaseUrl="$LHCI_CANARY_SERVER_URL" --token="$LHCI_CANARY_SERVER_TOKEN"

# Kill the static server from earlier.
kill $!
