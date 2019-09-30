#!/usr/bin/env node
/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

/** @typedef {import('./constants.js').LanternSiteDefinition} LanternSiteDefinition */
/** @typedef {import('./constants.js').MasterLanternValues} MasterLanternValues */

const fs = require('fs');
const path = require('path');
const execFileSync = require('child_process').execFileSync;
const prettyJSONStringify = require('pretty-json-stringify');
const constants = require('./constants.js');

const INPUT_PATH = process.argv[2] || constants.SITE_INDEX_WITH_GOLDEN_PATH;
const SITE_INDEX_PATH = path.resolve(process.cwd(), INPUT_PATH);
const HEAD_COMPUTED_PATH = constants.SITE_INDEX_WITH_GOLDEN_WITH_COMPUTED_PATH;
const RUN_ALL_SCRIPT_PATH = path.join(__dirname, 'run-on-all-assets.js');
const OUTPUT_PATH = constants.MASTER_COMPUTED_PATH;

if (!fs.existsSync(HEAD_COMPUTED_PATH) || process.env.FORCE) {
  if (!fs.existsSync(SITE_INDEX_PATH)) throw new Error('Usage $0 <expectations file>');
  execFileSync(RUN_ALL_SCRIPT_PATH, [SITE_INDEX_PATH]);
}

/** @type {LanternSiteDefinition[]} */
const computedResults = require(HEAD_COMPUTED_PATH);

/** @type {MasterLanternValues[]} */
const masterLanternValues = [];
for (const entry of computedResults) {
  const lanternValues = entry.lantern;
  // @ts-ignore - ignore missing index signature.
  Object.keys(lanternValues).forEach(key => lanternValues[key] = Math.round(lanternValues[key]));
  masterLanternValues.push({url: entry.url, ...lanternValues});
}

fs.writeFileSync(OUTPUT_PATH, prettyJSONStringify(masterLanternValues, {
  tab: '  ',
  spaceBeforeColon: '',
  spaceInsideObject: '',
  shouldExpand: (_, level) => level < 1,
}));
