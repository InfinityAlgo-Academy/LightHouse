#!/usr/bin/env bash

for d in variants/* ; do
  echo "$d"
  wc -c "$d"/*/main.bundle.min.js | sort -hr
  echo -e "\n"
done > summary-sizes.txt
