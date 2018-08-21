/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview
 * Define message file to be used for a given locale. A few aliases are defined below.
 *
 * Google locale inheritance rules: https://goto.google.com/ccssm
 * CLDR language aliases: https://www.unicode.org/cldr/charts/latest/supplemental/aliases.html
 */

/** @typedef {Record<string, {message: string}>} LocaleMessages */

// The keys within this const must exactly match the LH.Locale type in externs.d.ts
/** @type {Record<LH.Locale, LocaleMessages>} */
const locales = {
  'en-US': require('./en-US.json'), // The 'source' strings, with descriptions
  // @ts-ignore - tsc bug, something about en/en-US pointing to same file
  'en': require('./en-US.json'), // According to CLDR/ICU, 'en' == 'en-US' dates/numbers (Why?!)

  // TODO: en-GB has just ~10 messages that are different from en-US. We should only ship those.
  'en-AU': require('./en-GB.json'), // Alias of 'en-GB'
  'en-GB': require('./en-GB.json'), // Alias of 'en-GB'
  'en-IE': require('./en-GB.json'), // Alias of 'en-GB'
  'en-SG': require('./en-GB.json'), // Alias of 'en-GB'
  'en-ZA': require('./en-GB.json'), // Alias of 'en-GB'
  'en-IN': require('./en-GB.json'), // Alias of 'en-GB'

  // All locales from here have a messages file, though we allow fallback to the base locale when the files are identical
  'ar-XB': require('./ar-XB.json'), // psuedolocalization
  'ar': require('./ar.json'),
  'bg': require('./bg.json'),
  'bs': require('./hr.json'), // Alias of 'hr'
  'ca': require('./ca.json'),
  'cs': require('./cs.json'),
  'da': require('./da.json'),
  'de': require('./de.json'), // de-AT, de-CH identical, so they fall back into de
  'el': require('./el.json'),
  'en-XA': require('./en-XA.json'), // psuedolocalization
  'es': require('./es.json'),
  'fi': require('./fi.json'),
  'fil': require('./fil.json'),
  'fr': require('./fr.json'), // fr-CH identical, so it falls back into fr
  'he': require('./he.json'),
  'hi': require('./hi.json'),
  'hr': require('./hr.json'),
  'hu': require('./hu.json'),
  'gsw': require('./de.json'), // swiss german. identical (for our purposes) to 'de'
  'id': require('./id.json'),
  'in': require('./id.json'), // Alias of 'id'
  'it': require('./it.json'),
  'iw': require('./he.json'), // Alias of 'he'
  'ja': require('./ja.json'),
  'ko': require('./ko.json'),
  'ln': require('./fr.json'), // Alias of 'fr'
  'lt': require('./lt.json'),
  'lv': require('./lv.json'),
  'mo': require('./ro.json'), // Alias of 'ro'
  'nl': require('./nl.json'),
  'nb': require('./no.json'), // Alias of 'no'
  'no': require('./no.json'),
  'pl': require('./pl.json'),
  'pt': require('./pt.json'), // pt-BR identical, so it falls back into pt
  'pt-PT': require('./pt-PT.json'),
  'ro': require('./ro.json'),
  'ru': require('./ru.json'),
  'sk': require('./sk.json'),
  'sl': require('./sl.json'),
  'sr': require('./sr.json'),
  'sr-Latn': require('./sr-Latn.json'),
  'sv': require('./sv.json'),
  'ta': require('./ta.json'),
  'te': require('./te.json'),
  'th': require('./th.json'),
  'tl': require('./fil.json'), // Alias of 'fil'
  'tr': require('./tr.json'),
  'uk': require('./uk.json'),
  'vi': require('./vi.json'),
  'zh': require('./zh.json'), // zh-CN identical, so it falls back into zh
  'zh-HK': require('./zh-HK.json'),
  'zh-TW': require('./zh-TW.json'),
};

module.exports = locales;
