#!/usr/bin/env bash

set -euo pipefail

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

if [[ -z $CHROME_PATH ]]
then
  echo 'Must set $CHROME_PATH'
  exit 1
fi

export DEVTOOLS_PATH=${DEVTOOLS_PATH:-"$HOME/src/devtools/devtools-frontend"}

yarn build-devtools
yarn devtools "$DEVTOOLS_PATH"

cd "$DEVTOOLS_PATH"
gn gen out/Default
gclient sync
autoninja -C out/Default
"$CHROME_PATH" --custom-devtools-frontend=file://$DEVTOOLS_PATH/out/Default/resources/inspector
