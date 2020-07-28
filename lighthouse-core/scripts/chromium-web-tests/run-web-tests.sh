#!/usr/bin/env bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../../.."

if [ x"$BLINK_TOOLS_PATH" == x ]; then
  echo "Error: Environment variable BLINK_TOOLS_PATH not set"
  exit 1
fi

if [ x"$DEVTOOLS_PATH" == x ]; then
  echo "Error: Environment variable DEVTOOLS_PATH not set"
  exit 1
fi

unset -v latest_content_shell
for file in "$LH_ROOT/.test-cache"/*/; do
  [[ $file -nt $latest_content_shell ]] && latest_content_shell=$file
done

if [ x"$latest_content_shell" == x ]; then
  echo "Error: Did not find a content shell"
  exit 1
fi

rm -rf "$latest_content_shell/out/Release/layout-test-results"

# Run a very basic server on port 8000. Only thing we need is:
#   - /devtools -> the layout tests for devtools frontend
#   - /inspector-sources -> the inspector resources from the content shell
#   - CORS (Access-Control-Allow-Origin header)

# Setup inspector-sources
ln -s "$latest_content_shell/out/Release/resources/inspector" "$DEVTOOLS_PATH/test/webtests/http/tests/inspector-sources"

# Kill background jobs when script ends.
cleanup() {
  rm "$DEVTOOLS_PATH/test/webtests/http/tests/inspector-sources"
  kill ${SERVER_PID}
}
trap 'cleanup' EXIT

# Serve from devtools frontend webtests folder.
(npx http-server "$DEVTOOLS_PATH/test/webtests/http/tests" -p 8000 --cors > /dev/null 2>&1) &
SERVER_PID=$!

echo "Waiting for server"
health_check_url='http://localhost:8000/inspector-sources/integration_test_runner.html?experiments=true&test=http://127.0.0.1:8000/devtools/lighthouse/lighthouse-view-trace-run.js'
until $(curl --output /dev/null --silent --head --fail $health_check_url); do
  printf '.'
  sleep 1
done
echo "Server is up"

echo "connor 1"

# Add typ to python path. The regular method assumes there is a chromium checkout.
# See https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/tools/blinkpy/common/path_finder.py;l=35;drc=61e88d0e7fa9217a8f5395edd0e03b1c1991257c
PYTHONPATH="${PYTHONPATH}:$BLINK_TOOLS_PATH/third_party/typ" python \
  "$BLINK_TOOLS_PATH/third_party/blink/tools/run_web_tests.py" \
  --layout-tests-directory="$DEVTOOLS_PATH/test/webtests" \
  --build-directory="$latest_content_shell/out" \
  http/tests/devtools/lighthouse
status=$?

echo "connor 2"
cp "$latest_content_shell/out/Release/layout-test-results/results.html" "$LH_ROOT/.test-cache/results.html"

echo "connor 3"
set -o xtrace
ls "$latest_content_shell/out/Release/layout-test-results"
ls "$LH_ROOT/.test-cache"

echo "connor 4"
exit $status
