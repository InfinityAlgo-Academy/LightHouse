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
const execFileSync = require('child_process').execFileSync;

if (!process.argv[2]) throw new Error('Usage $0 <expectations file>');

const RUN_ONCE_PATH = path.join(__dirname, 'run-once.js');
const EXPECTATIONS_PATH = path.resolve(process.cwd(), process.argv[2]);
const EXPECTATIONS_DIR = path.dirname(EXPECTATIONS_PATH);
const expectations = require(EXPECTATIONS_PATH);

for (const site of expectations.sites) {
  const trace = path.join(EXPECTATIONS_DIR, site.tracePath);
  const log = path.join(EXPECTATIONS_DIR, site.devtoolsLogPath);

  console.log('Running', site.url, '...');
  const rawOutput = execFileSync(RUN_ONCE_PATH, [trace, log])
    .toString()
    .trim();
  if (!rawOutput) console.log('ERROR EMPTY OUTPUT!');
  const lantern = JSON.parse(rawOutput);

  Object.assign(site, {lantern});
}

const computedSummaryPath = path.join(EXPECTATIONS_DIR, 'lantern-computed.json');
fs.writeFileSync(computedSummaryPath, JSON.stringify(expectations, null, 2));
