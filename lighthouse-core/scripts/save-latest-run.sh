#!/bin/bash

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

set -euo pipefail

# Saves the necessary contents of the `latest-run/` folder to a subfolder for easier A/B comparison.
# Restoring the contents to `latest-run/` is just `cp latest-run/latest-run-bak/* latest-run/`.

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../.."
TARGET_DIR=${1:-latest-run-bak}

cd "$LH_ROOT/latest-run"
mkdir -p "$TARGET_DIR"

for file in *.json ; do
  echo "Copying $file to $TARGET_DIR..."
  cp "$file" "$TARGET_DIR/$file"
done
