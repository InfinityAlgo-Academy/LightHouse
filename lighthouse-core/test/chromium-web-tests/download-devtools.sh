#!/usr/bin/env bash

set -euxo pipefail

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

if [ -d "$DEVTOOLS_PATH" ]
then
  echo "Directory $DEVTOOLS_PATH already exists. Updating checkout"
  cd "$DEVTOOLS_PATH"
  set -x
  git checkout -- .
  git pull
else
  echo "Downloading DevTools frontend at $DEVTOOLS_PATH"
  set -x
  mkdir -p `dirname $DEVTOOLS_PATH`
  cd `dirname $DEVTOOLS_PATH`
  fetch --nohooks --no-history devtools-frontend
  cd devtools-frontend
  gn gen out/Default
fi

gclient sync

set +x
