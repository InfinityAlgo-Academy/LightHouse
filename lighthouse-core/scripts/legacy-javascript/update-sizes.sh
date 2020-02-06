#!/usr/bin/env bash

for d in variants/* ; do
  echo "$d"
  wc -c "$d"/*/main.bundle.js | sort -hr
  echo -e "\n"
done > summary-sizes.txt
