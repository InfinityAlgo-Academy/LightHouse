/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('../../../shared/localization/locales').LhlMessages} LhlMessages */

import glob from 'glob';

import {LH_ROOT, readJson} from '../../../root.js';

/** @type {LhlMessages} */
const enUsLhl = readJson('shared/localization/locales/en-US.json');

/**
 * Count how many locale files have a translated version of each string found in
 * the `en-US.json` i18n messages.
 * @return {{localeCount: number, messageCount: number, translatedCount: number, partiallyTranslatedCount: number, notTranslatedCount: number}}
 */
function countTranslatedMessages() {
  // Find all locale files, ignoring self-generated en-US and en-XL, and ctc files.
  const ignore = [
    '**/.ctc.json',
    '**/en-US.json',
    '**/en-XL.json',
  ];
  const globPattern = 'shared/localization/locales/**/+([-a-zA-Z0-9]).json';
  const localeFilenames = glob.sync(globPattern, {
    ignore,
    cwd: LH_ROOT,
  });

  /** @type {Array<[string, number]>} */
  const enUsEntries = Object.keys(enUsLhl).map(key => [key, 0]);
  const countPerMessage = new Map(enUsEntries);

  for (const localeFilename of localeFilenames) {
    // Re-read data in case other code in this process has altered the require()d form.
    /** @type {LhlMessages} */
    const localeLhl = readJson(localeFilename);

    for (const localeKey of Object.keys(localeLhl)) {
      const messageCount = countPerMessage.get(localeKey);
      // Only care about strings in `en-US.json` (the rest should have been pruned).
      if (messageCount !== undefined) {
        countPerMessage.set(localeKey, messageCount + 1);
      }
    }
  }

  const localeCount = localeFilenames.length;
  const messageCount = countPerMessage.size;
  const translatedCount = [...countPerMessage.values()].filter(c => c === localeCount).length;
  const notTranslatedCount = [...countPerMessage.values()].filter(c => c === 0).length;
  const partiallyTranslatedCount = Math.max(0, messageCount - translatedCount - notTranslatedCount);

  return {
    localeCount,
    messageCount,
    translatedCount,
    partiallyTranslatedCount,
    notTranslatedCount,
  };
}

export {
  countTranslatedMessages,
};
