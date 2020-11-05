#!/bin/bash

set -euo pipefail

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
cd $DIRNAME

GCLOUD_USER=$(gcloud config get-value account | awk -F '@' '{gsub("[^a-z]","",$1); print $1}')
INSTANCE_NAME="lighthouse-collection-$GCLOUD_USER"
CLOUDSDK_CORE_PROJECT=${LIGHTHOUSE_COLLECTION_GCLOUD_PROJECT:-lighthouse-lantern-collect}
ZONE=us-central1-a

echo "Fetching instances..."
INSTANCES=$(gcloud --project=$CLOUDSDK_CORE_PROJECT compute instances list | grep "$INSTANCE_NAME" | awk '{print $1}')
for instance in $INSTANCES
do
  printf "Killing $instance...\n"
  gcloud -q --project="$CLOUDSDK_CORE_PROJECT" compute instances delete "$instance" --zone="$ZONE"
  printf "done!\n"
done
