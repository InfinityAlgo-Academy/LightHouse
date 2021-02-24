#!/bin/bash

set -euxo pipefail

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Unarchives "lhr-data-*.tar.gz" files inside gcp-data folder, places
# them inside gcp-data/data.

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
GCP_DATA="$DIRNAME/gcp-data"
OUTPUT_DIR="$GCP_DATA/data"
mkdir -p "$OUTPUT_DIR"

cd "$GCP_DATA"

rm -rf extract_failures.log

# Change this line if you want to extract trace data instead.
i=0
for f in lhr-data-*.tar.gz; do # change to traces-*.tar.gz if extracting trace data
  echo "Extracting $f...\n"
  tar -xzvf $f data || echo "Failed to extract $f\n" >> extract_failures.log
  mv "$OUTPUT_DIR/urls.txt" "$OUTPUT_DIR/urls-$i.txt"
  ((i += 1))
done

echo "Run to analyze data:"
echo   node "$DIRNAME/analyze-lhr-data.js" "$OUTPUT_DIR" '___AUDIT-ID-GOES-HERE___' > "$LH_ROOT/.tmp/analyze-results.json"
