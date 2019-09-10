/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const lookup = require('../../../lib/i18n/best-fit-locale.js');

/* eslint-env jest */

describe('lookup', () => {
  it('returns obvious results', () => {
    expect(lookup(['en'], 'en')).toEqual('en');
    expect(lookup(['pt-BR'], 'pt-BR')).toEqual('pt-BR');
  });

  it('returns subtag', () => {
    expect(lookup(['pt'], 'pt-BR')).toEqual('pt');
  });

  it('returns undefined if no appropriate locale is present', () => {
    expect(lookup(['de'], 'pt-BR')).toEqual(undefined);
    expect(lookup(['de'], '')).toEqual(undefined);
    expect(lookup(['de'], null)).toEqual(undefined);
    expect(lookup(['de'], undefined)).toEqual(undefined);
  });


  // 'nb': require('./locales/nb.json'), // Alias of 'no'
  // 'no': require('./locales/nb.json'),


  it('handles all aliases previously explicitly defined', () => {
    const previousAliasToCanonicalMap = {
      // TODO en mapping
      // en: 'en-US',

      // TODO engb mapping
      // 'en-AU': 'en-GB',
      // 'en-IE': 'en-GB',
      // 'en-SG': 'en-GB',
      // 'en-ZA': 'en-GB',
      // 'en-IN': 'en-GB',

      // bs: 'hr',  This was a mistake. Bosnian and croatian are both distinct.
      'es-AR': 'es-419',
      'es-BO': 'es-419',
      'es-BR': 'es-419',
      'es-BZ': 'es-419',
      'es-CL': 'es-419',
      'es-CO': 'es-419',
      'es-CR': 'es-419',
      'es-CU': 'es-419',
      'es-DO': 'es-419',
      'es-EC': 'es-419',
      'es-GT': 'es-419',
      'es-HN': 'es-419',
      'es-MX': 'es-419',
      'es-NI': 'es-419',
      'es-PA': 'es-419',
      'es-PE': 'es-419',
      'es-PR': 'es-419',
      'es-PY': 'es-419',
      'es-SV': 'es-419',
      'es-US': 'es-419',
      'es-UY': 'es-419',
      'es-VE': 'es-419',

      // TODO we decided to remap swiss german onto de
      //gsw: 'de',

      in: 'id',
      iw: 'he',
      // ln: 'fr',  // This was a mistake. We shouldn't advertise support for Lingala and remap to French.
      mo: 'ro',
      no: 'nb',
      tl: 'fil',
    };

    const trueLocales = [
      "ar-XB",
      "ar",
      "bg",
      "ca",
      "cs",
      "da",
      "de",
      "el",
      "en-GB",
      "en-US",
      "en-XA",
      "en-XL",
      "es-419",
      "es",
      "fi",
      "fil",
      "fr",
      "he",
      "hi",
      "hr",
      "hu",
      "id",
      "it",
      "ja",
      "ko",
      "lt",
      "lv",
      "nb",
      "nl",
      "pl",
      "pt-PT",
      "pt",
      "ro",
      "ru",
      "sk",
      "sl",
      "sr-Latn",
      "sr",
      "sv",
      "ta",
      "te",
      "th",
      "tr",
      "uk",
      "vi",
      "zh-HK",
      "zh-TW",
      "zh",
    ];

    for (const [alias, replacement] of Object.entries(previousAliasToCanonicalMap)) {
      expect(lookup(trueLocales, alias)).not.toEqual(alias);
      expect(lookup(trueLocales, alias)).toEqual(replacement);
    }
  });
});
