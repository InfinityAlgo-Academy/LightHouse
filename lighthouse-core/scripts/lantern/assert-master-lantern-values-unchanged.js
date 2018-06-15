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
const execSync = require('child_process').execSync;
const constants = require('./constants');

const INPUT_PATH = process.argv[2] || constants.SITE_INDEX_WITH_GOLDEN_WITH_COMPUTED_PATH;
const HEAD_PATH = path.resolve(process.cwd(), INPUT_PATH);
const MASTER_PATH = constants.MASTER_COMPUTED_PATH;

const TMP_DIR = path.join(__dirname, '../../../.tmp');
const TMP_HEAD_PATH = path.join(TMP_DIR, 'HEAD-for-diff.json');
const TMP_MASTER_PATH = path.join(TMP_DIR, 'master-for-diff.json');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

if (!fs.existsSync(HEAD_PATH) || !fs.existsSync(MASTER_PATH)) {
  throw new Error('Usage $0 <computed file>');
}

let exitCode = 0;

try {
  const computedResults = require(HEAD_PATH);
  const expectedResults = require(MASTER_PATH);

  const sites = [];
  for (const entry of computedResults.sites) {
    const lanternValues = entry.lantern;
    Object.keys(lanternValues).forEach(key => lanternValues[key] = Math.round(lanternValues[key]));
    sites.push({url: entry.url, ...lanternValues});
  }

  fs.writeFileSync(TMP_HEAD_PATH, JSON.stringify({sites}, null, 2));
  fs.writeFileSync(TMP_MASTER_PATH, JSON.stringify(expectedResults, null, 2));

  try {
    execSync(`git --no-pager diff --color=always --no-index ${TMP_MASTER_PATH} ${TMP_HEAD_PATH}`);
    console.log('✅  PASS    No changes between expected and computed!');
  } catch (err) {
    console.log('❌  FAIL    Changes between expected and computed!\n');
    console.log(err.stdout.toString());
    exitCode = 1;
  }
} finally {
  fs.unlinkSync(TMP_HEAD_PATH);
  fs.unlinkSync(TMP_MASTER_PATH);
}

process.exit(exitCode);
