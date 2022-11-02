#!/usr/bin/env node

/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/** @fileoverview Read in a LHR JSON file, remove whatever shouldn't be compared, write it back. */

import {readFileSync, writeFileSync} from 'fs';
import url from 'url';

import esMain from 'es-main';

import {LH_ROOT} from '../../root.js';

/**
 * @param {LH.Result} lhr
 * @param {{skipDescription?: boolean}=} opts
 */
function cleanAndFormatLHR(lhr, opts = {}) {
  // TODO: Resolve the below so we don't need to force it to a boolean value:
  // 1) The string|boolean story for proto
  // 2) CI gets a absolute path during yarn diff:sample-json
  lhr.configSettings.auditMode = true;

  // Set timing values, which change from run to run, to predictable values
  lhr.timing.total = 12345.6789;
  lhr.timing.entries.sort((a, b) => a.startTime - b.startTime);
  lhr.timing.entries.forEach(entry => {
    // @ts-expect-error - write to readonly property
    entry.duration = 100;
    // @ts-expect-error - write to readonly property
    entry.startTime = 0; // Not realsitic, but avoids a lot of diff churn
  });

  const baseCallFrameUrl = url.pathToFileURL(LH_ROOT);

  for (const auditResult of Object.values(lhr.audits)) {
    if (!opts.skipDescription) {
      auditResult.description = '**Excluded from diff**';
    }
    if (auditResult.errorStack) {
      auditResult.errorStack = auditResult.errorStack.replaceAll(baseCallFrameUrl.href, '');
    }
  }
}

if (esMain(import.meta)) {
  const filename = process.argv[2];
  const extraFlag = process.argv[3];
  if (!filename) throw new Error('No filename provided.');

  const lhr = JSON.parse(readFileSync(filename, 'utf8'));
  cleanAndFormatLHR(lhr, {
    skipDescription: extraFlag === '--only-remove-timing',
  });
  // Ensure we have a final newline to conform to .editorconfig
  const cleaned = `${JSON.stringify(lhr, null, 2)}\n`;
  writeFileSync(filename, cleaned, 'utf8');
}

export {cleanAndFormatLHR};
