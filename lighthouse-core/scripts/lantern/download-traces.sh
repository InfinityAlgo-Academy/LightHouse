#!/bin/bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_PATH="$DIRNAME/../../.."
cd $LH_ROOT_PATH

# snapshot of ~100 traces with no throttling recorded 2017-12-06 on a HP z840 workstation
TAR_URL="https://drive.google.com/a/chromium.org/uc?id=1_w2g6fQVLgHI62FApsyUDejZyHNXMLm0&amp;export=download"
curl -o lantern-traces.tar.gz -L $TAR_URL

tar -xzf lantern-traces.tar.gz
mv lantern-traces-subset lantern-data
rm lantern-traces.tar.gz
