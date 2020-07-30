#!/usr/bin/env bash

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Download blink tools for run_web_tests.py.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

commit_chromium="41f18f569f022d78337f586dacc6eff0e0477e46"
commit_catapult="95c1f426155576790a73778571c34a0f3cd6d608"

if [ x"$BLINK_TOOLS_PATH" == x ]; then
  echo "Error: Environment variable BLINK_TOOLS_PATH not set"
  exit 1
fi

if [ -e "$BLINK_TOOLS_PATH" ]; then
  echo "cached blink tools found"
else
  mkdir -p "$BLINK_TOOLS_PATH/third_party/blink/tools"
  wget "https://chromium.googlesource.com/chromium/src/+archive/$commit_chromium/third_party/blink/tools.tar.gz" --no-check-certificate -q -O blinktools.tar.gz
  tar -xf blinktools.tar.gz -C "$BLINK_TOOLS_PATH/third_party/blink/tools"
  rm blinktools.tar.gz

  # Just need this for the results.html template.
  mkdir -p "$BLINK_TOOLS_PATH/third_party/blink/web_tests/fast/harness"
  wget "https://chromium.googlesource.com/chromium/src/+archive/$commit_chromium/third_party/blink/web_tests/fast/harness.tar.gz" --no-check-certificate -q -O harness.tar.gz
  tar -xf harness.tar.gz -C "$BLINK_TOOLS_PATH/third_party/blink/web_tests/fast/harness"
  rm harness.tar.gz

  mkdir -p "$BLINK_TOOLS_PATH/third_party/typ"
  wget "https://chromium.googlesource.com/catapult/+archive/$commit_catapult/third_party/typ.tar.gz" --no-check-certificate -q -O typ.tar.gz
  tar -xf typ.tar.gz -C "$BLINK_TOOLS_PATH/third_party/typ"
  rm typ.tar.gz

  cd "$BLINK_TOOLS_PATH"
  git init
  echo "*.pyc" > .gitignore
  git add .
  git commit -m baseline
  patch -p1 < "$SCRIPT_DIR/blink-tools.patch"
fi
