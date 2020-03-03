#!/usr/bin/env bash

set -eox pipefail

pwd="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
lhroot_path=$(realpath "$pwd/../..")
tmp_path="$lhroot_path/.tmp/i18n"



# clean up any previous version
rm -rf "$tmp_path"
mkdir -p "$tmp_path"


yarn build-i18n-module

cp "$lhroot_path/dist/i18n-module.js" "$tmp_path/lh-i18n.js"
cp "$lhroot_path/build/lh-i18n.package.json" "$tmp_path/package.json"

cd "$tmp_path"

npm publish --dry-run

echo "

Package is ready in $tmp_path
Please cd there and run npm publish when ready.
"

