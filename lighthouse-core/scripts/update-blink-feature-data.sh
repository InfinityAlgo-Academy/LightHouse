#!/usr/bin/env bash

##
# @license Copyright 2018 Google Inc. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Download latest caniuse.com data.
url="https://raw.githubusercontent.com/Fyrd/caniuse/master/data.json"
wget "$url" -O caniuse-snapshot.json && mv caniuse-snapshot.json ./third-party/caniuse/db.json

# Download latest HTML/JS feature id -> name mappings.
url="https://www.chromestatus.com/data/blink/features"
wget "$url" -O feature-id-to-name.json && mv feature-id-to-name.json ./third-party/chromestatus/features.json

# Download latest CSS property feature id -> name mappings.
url="https://www.chromestatus.com/data/blink/cssprops"
wget "$url" -O css-id-to-name.json && mv css-id-to-name.json ./third-party/chromestatus/cssprops.json
