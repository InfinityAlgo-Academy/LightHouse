/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview A script for measuring the size of an each property of an object.
 * Primary purpose is to better understand what takes up the most space in an LHR.
 */

/* eslint-disable no-console */

// cat latest-run/lhr.report.json | node lighthouse-core/scripts/json-size.js | less
// cat latest-run/lhr.report.json | jq .audits | node lighthouse-core/scripts/json-size.js | less

import fs from 'fs';

const inputJson = fs.readFileSync(0, 'utf-8');
const object = JSON.parse(inputJson);

/**
 * @param {*} obj
 */
function size(obj) {
  return JSON.stringify(obj).length;
}

/**
 * @param {string} key
 * @param {number} keySize
 */
function printRow(key, keySize) {
  const keyPadded = key.padEnd(longestKeyLength);
  const percentage = Math.round((keySize / totalSize) * 100);
  console.log(`${keyPadded} ${percentage}\t${keySize}`);
}

const totalSize = size(object);
const longestKeyLength = Math.max(...Object.keys(object).map(key => key.length));

printRow('total', totalSize);
Object.entries(object)
  .map(([key, value]) => /** @type {[string, number]} */([key, size(value)]))
  .sort((a, b) => b[1] - a[1])
  .forEach(([key, keySize]) => {
    printRow(key, keySize);
  });
