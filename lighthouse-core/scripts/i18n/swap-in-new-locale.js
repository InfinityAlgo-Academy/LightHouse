#!/usr/bin/env node
/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console, max-len */

const fs = require('fs');
const path = require('path');
const _set = require('lodash.set');

const i18n = require('../../lib/i18n/i18n.js');

/**
 * Replaces all strings within an LHR with ones from a different locale
 * @param {LH.Result} lhr
 * @param {LH.Locale} locale
 */
function replaceLHRLocale(lhr, locale) {
  const resolvedLocale = i18n.lookupLocale(locale);
  const {icuMessagePaths} = lhr.i18n;

  Object.entries(icuMessagePaths).forEach(([icuMessageId, messageInstancesInLHR]) => {
    for (const instance of messageInstancesInLHR) {
      const path = /** @type {LH.I18NMessageValuesEntry} */ (instance).path || /** @type {string} */ (instance);
      const values = /** @type {LH.I18NMessageValuesEntry} */ (instance).values || undefined;
      // Get new formatted strings in revised locale
      const formattedStr = i18n.formatMessageFromIdWithValues(locale, icuMessageId, values);
      // Write strings back into the LHR
      _set(lhr, path, formattedStr);
    }
  });

  // Tweak the config locale
  lhr.configSettings.locale = resolvedLocale;
  return lhr;
}

module.exports = replaceLHRLocale;
