#!/bin/bash

set -euxo pipefail

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
GCP_DATA="$DIRNAME/gcp-data"
cd $GCP_DATA
touch extract_failures.log

for f in lhr-data-*.tar.gz; do
  echo "Extracting $f...\n"
  tar -xzvf $f  data || echo "Failed to extract $f\n" >> extract_failures.log
done

cd $DIRNAME
node analyze-lhr-data.js "$GCP_DATA/data" $1 > "$LH_ROOT/.tmp/analyze-results.json"