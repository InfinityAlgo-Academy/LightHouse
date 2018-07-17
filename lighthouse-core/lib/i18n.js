/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const MessageFormat = require('intl-messageformat').default;
const MessageParser = require('intl-messageformat-parser');
const LOCALES = require('./locales');

let locale = MessageFormat.defaultLocale;

const LH_ROOT = path.join(__dirname, '../../');

try {
  // Node usually doesn't come with the locales we want built-in, so load the polyfill.
  // In browser environments, we won't need the polyfill, and this will throw so wrap in try/catch.

  // @ts-ignore
  const IntlPolyfill = require('intl');
  // @ts-ignore
  Intl.NumberFormat = IntlPolyfill.NumberFormat;
  // @ts-ignore
  Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
} catch (_) {}

const UIStrings = {
  ms: '{timeInMs, number, milliseconds}\xa0ms',
  columnURL: 'URL',
  columnSize: 'Size (KB)',
  columnWastedTime: 'Potential Savings (ms)',
};

const formats = {
  number: {
    milliseconds: {
      maximumFractionDigits: 0,
    },
  },
};

/**
 * @param {string} msg
 * @param {Record<string, *>} values
 */
function preprocessMessageValues(msg, values) {
  const parsed = MessageParser.parse(msg);
  // Round all milliseconds to 10s place
  parsed.elements
    .filter(el => el.format && el.format.style === 'milliseconds')
    .forEach(el => (values[el.id] = Math.round(values[el.id] / 10) * 10));

  // Replace all the bytes with KB
  parsed.elements
    .filter(el => el.format && el.format.style === 'bytes')
    .forEach(el => (values[el.id] = values[el.id] / 1024));
}

module.exports = {
  UIStrings,
  /**
   * @param {string} filename
   * @param {Record<string, string>} fileStrings
   */
  createStringFormatter(filename, fileStrings) {
    const mergedStrings = {...UIStrings, ...fileStrings};

    /** @param {string} msg @param {*} [values] */
    const formatFn = (msg, values) => {
      const keyname = Object.keys(mergedStrings).find(key => mergedStrings[key] === msg);
      if (!keyname) throw new Error(`Could not locate: ${msg}`);
      preprocessMessageValues(msg, values);

      const filenameToLookup = keyname in UIStrings ? __filename : filename;
      const lookupKey = path.relative(LH_ROOT, filenameToLookup) + '!#' + keyname;
      const localeStrings = LOCALES[locale] || {};
      const localeString = localeStrings[lookupKey] && localeStrings[lookupKey].message;
      // fallback to the original english message if we couldn't find a message in the specified locale
      // better to have an english message than no message at all, in some number cases it won't even matter
      const messageForMessageFormat = localeString || msg;
      // when using accented english, force the use of a different locale for number formatting
      const localeForMessageFormat = locale === 'en-XA' ? 'de-DE' : locale;

      const formatter = new MessageFormat(messageForMessageFormat, localeForMessageFormat, formats);
      return formatter.format(values);
    };

    return formatFn;
  },
  /**
   * @param {LH.Locale|null} [newLocale]
   */
  setLocale(newLocale) {
    if (!newLocale) return;
    locale = newLocale;
  },
};
