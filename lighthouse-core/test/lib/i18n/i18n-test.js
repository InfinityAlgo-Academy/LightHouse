/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const i18n = require('../../../lib/i18n/i18n.js');
const log = require('lighthouse-logger');
const {isNode12SmallIcu} = require('../../test-utils.js');

/* eslint-env jest */

describe('i18n', () => {
  describe('#createMessageInstanceIdFn', () => {
    it('returns an IcuMessage reference', () => {
      const fakeFile = path.join(__dirname, 'fake-file.js');
      const templates = {daString: 'use {x} me!'};
      const formatter = i18n.createMessageInstanceIdFn(fakeFile, templates);

      expect(formatter(templates.daString, {x: 1})).toStrictEqual({
        i18nId: 'lighthouse-core/test/lib/i18n/fake-file.js | daString',
        values: {x: 1},
        formattedDefault: 'use 1 me!',
      });
    });
  });

  describe('#lookupLocale', () => {
    const invalidLocale = 'jk-Latn-DE-1996-a-ext-x-phonebk-i-klingon';

    it('canonicalizes the locale', () => {
      expect(i18n.lookupLocale('en-xa')).toEqual('en-XA');
    });

    it('takes multiple locale strings and returns a canonical one', () => {
      expect(i18n.lookupLocale([invalidLocale, 'en-xa'])).toEqual('en-XA');
    });

    it('falls back to default if locale not provided or cant be found', () => {
      expect(i18n.lookupLocale(undefined)).toEqual('en-US');
      expect(i18n.lookupLocale(invalidLocale)).toEqual('en-US');
      expect(i18n.lookupLocale([invalidLocale, invalidLocale])).toEqual('en-US');
    });

    it('logs a warning if locale is not available and the default is used', () => {
      const logListener = jest.fn();
      log.events.on('warning', logListener);

      expect(i18n.lookupLocale(invalidLocale)).toEqual('en-US');

      // COMPAT: Node 12 logs an extra warning that full-icu is not available.
      if (isNode12SmallIcu()) {
        expect(logListener).toBeCalledTimes(2);
        expect(logListener).toHaveBeenNthCalledWith(1, ['i18n',
          expect.stringMatching(/Requested locale not available in this version of node/)]);
        expect(logListener).toHaveBeenNthCalledWith(2, ['i18n',
          `locale(s) '${invalidLocale}' not available. Falling back to default 'en-US'`]);
        return;
      }

      expect(logListener).toBeCalledTimes(1);
      expect(logListener).toBeCalledWith(['i18n',
        `locale(s) '${invalidLocale}' not available. Falling back to default 'en-US'`]);

      log.events.off('warning', logListener);
    });

    it('falls back to root tag prefix if specific locale not available', () => {
      // COMPAT: Node 12 only has 'en-US' by default.
      if (isNode12SmallIcu()) {
        expect(i18n.lookupLocale('es-JKJK')).toEqual('en-US');
        return;
      }

      expect(i18n.lookupLocale('es-JKJK')).toEqual('es');
    });

    it('falls back to en-US if no match is available', () => {
      expect(i18n.lookupLocale(invalidLocale)).toEqual('en-US');
    });

    describe('possibleLocales option', () => {
      it('canonicalizes from the possible locales', () => {
        expect(i18n.lookupLocale('en-xa', ['ar', 'en-XA'])).toEqual('en-XA');
      });

      it('takes multiple locale strings and returns a possible, canonicalized one', () => {
        // COMPAT: Node 12 only has 'en-US' by default.
        if (isNode12SmallIcu()) {
          expect(i18n.lookupLocale([invalidLocale, 'eN-uS', 'en-xa'], ['ar', 'es', 'en-US']))
            .toEqual('en-US');
          return;
        }

        expect(i18n.lookupLocale([invalidLocale, 'eS', 'en-xa'], ['ar', 'es']))
            .toEqual('es');
      });

      it('falls back to en-US if no possible match is available', () => {
        expect(i18n.lookupLocale('es', ['en-US', 'ru', 'zh'])).toEqual('en-US');
      });

      it('falls back to en-US if no possible matchs are available at all', () => {
        expect(i18n.lookupLocale('ru', [])).toEqual('en-US');
      });
    });
  });
});
