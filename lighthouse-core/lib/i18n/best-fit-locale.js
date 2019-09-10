/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const aliases = require('./cldrdata/aliases.json');
const macroLangAliases = require('./cldrdata/aliases-macrolanguage.json');
const parentLocales = require('./cldrdata/parentLocales.json');

/**
 * Find the best fitting locale match.
 * Adapted from https://github.com/ibm-js/ecma402/blob/4754edfd2564f59ec7f71d5654abe6aa84b1f9c6/impl/common.js#L398-L413
 *
 * Algorithm is similar to BestAvailableLocale, as in ECMA 402, Section 9.2.2
 * except that the following additional operations are performed:
 * 1). CLDR macrolanguage replacements are done ( i.e. "cmn" becomes "zh" )
 * 2). Known locale aliases, such as zh-TW = zh-Hant-TW, are resolved,
 * 3). Explicit parent locales are also considered.
 *
 * See scripts/validate-locale-lookups.js as well.
 *
 * @param {!Array<string>} availableLocales The canonicalized list of available locales
 * @param {string} locale The locale identifier to check
 * @returns {string|undefined} The best fit available locale, using CLDR's locale fallback mechanism.
 */

function BestFitAvailableLocale(availableLocales, locale) {
  let candidate = locale;
  if (!locale) return undefined;

  while (true) {
    const langtag = candidate.split('-')[0];
    // remap macrolanguage (eg. cmn -> zh)
    let lookupAlias = macroLangAliases[langtag];
    if (lookupAlias) {
      candidate = candidate.replace(langtag, lookupAlias);
    }
    // apply aliases (eg. iw -> he)
    lookupAlias = aliases[langtag];
    if (lookupAlias) {
      candidate = lookupAlias;
    }
    // exact match?
    if (availableLocales.includes(candidate)) {
      return candidate;
    }
    // reparent if we have to (eg. es-AR -> es-419)
    var parentLocale = parentLocales[candidate];
    if (parentLocale) {
      candidate = parentLocale;
    } else {
      // Shorten the code according to 9.2.2
      var pos = candidate.lastIndexOf('-');
      if (pos < 0) {
        return undefined;
      }
      if (pos >= 2 && candidate.charAt(pos - 2) === '-') {
        pos -= 2;
      }
      candidate = candidate.substring(0, pos);
    }
  }
}

module.exports = BestFitAvailableLocale;
