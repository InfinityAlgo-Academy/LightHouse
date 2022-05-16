#!/usr/bin/env bash

##
# @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# This wrapper around jest is only meant to help avoid the "Test environment has been torn down" error
# caused by a bug in v8's compilation cache. In short, due to that bug Jest will randomly use the wrong
# test environment for dynamic imports. It happens less often when fewer tests run, so a hacky workaround
# for now is to re-run the failed tests when this error occurs.
# See https://github.com/facebook/jest/issues/11438#issuecomment-923835189
# and https://bugs.chromium.org/p/v8/issues/detail?id=10284

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../.."

exec 3>&1
node --experimental-vm-modules ./node_modules/jest/bin/jest.js $* 2>&1 >&3 | tee >(sed 's/.*\r//' >.tmp/jest-stderr.txt)
jest_exit=$?
if [ $jest_exit -eq 0 ];
then
  exit 0
fi

if grep -Fq "Test environment has been torn down" .tmp/jest-stderr.txt
then
  echo "====================================================="
  echo "Noticed a v8 bug, so re-running just the failed tests"
  echo "====================================================="
  node --experimental-vm-modules ./node_modules/jest/bin/jest.js -f $*
else
  exit $jest_exit
fi
