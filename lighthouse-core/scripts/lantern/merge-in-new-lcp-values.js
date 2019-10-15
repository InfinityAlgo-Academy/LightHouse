#!/usr/bin/env node
/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const prettyJSONStringify = require('pretty-json-stringify');

const OLD_GOLDEN = path.resolve(process.cwd(), 'lighthouse-core/test/fixtures/lantern-master-computed-values.json0')
const NEW_GOLDEN = path.resolve(process.cwd(), 'lighthouse-core/test/fixtures/lantern-master-computed-values.json2')
const OUTPUT = path.resolve(process.cwd(), 'lighthouse-core/test/fixtures/lantern-master-computed-values.json')

const oldData = JSON.parse(fs.readFileSync(OLD_GOLDEN, 'utf8'));
const newData = JSON.parse(fs.readFileSync(NEW_GOLDEN, 'utf8'));

const fixUrl = url => url.replace(/https?/, 'http').replace(/www\./, '')

let fixed = [];
for (const entry of oldData.sites) {
  const newEntry = newData.sites.find(site => fixUrl(site.url) === fixUrl(entry.url));
  if (!newEntry) {
    console.log(entry.url, 'not run in new set')
    continue;
  }

  fixed.push(entry)
  for (const k of Object.keys(newEntry)) {
    if (k.includes('LCP')) entry[k] = newEntry[k];
  }
}

console.log(fixed.length, 'URLs overlap')

fs.writeFileSync(OUTPUT, prettyJSONStringify(oldData, {
  tab: '  ',
  spaceBeforeColon: '',
  spaceInsideObject: '',
  shouldExpand: (_, level) => level < 2,
}));


