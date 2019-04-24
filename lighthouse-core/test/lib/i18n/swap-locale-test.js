/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const swapLocale = require('../../../lib/i18n/swap-locale.js');

const lhr = require('../../results/sample_v2.json');

/* eslint-env jest */

describe('swap-locale', () => {
  it('can change golden LHR english strings into spanish', () => {
    const lhrEn = /** @type {LH.Result} */ (JSON.parse(JSON.stringify(lhr)));

    expect(lhrEn.audits.plugins.title).toEqual('Document avoids plugins');
    expect(lhrEn.audits['dom-size'].displayValue).toEqual('31 elements');

    const lhrEs = swapLocale(lhrEn, 'es');

    // Basic replacement
    expect(lhrEs.audits.plugins.title).toEqual('El documento no usa complementos');
    // With ICU string argument values
    expect(lhrEs.audits['dom-size'].displayValue).toEqual('31 nodos');
  });
});
