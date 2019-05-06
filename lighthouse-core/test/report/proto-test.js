/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const fs = require('fs');

const sample = fs.readFileSync(path.resolve(__dirname, '../results/sample_v2.json'));
const roundTripJson = require('../../../proto/sample_v2_round_trip');
const preprocessor = require('../../lib/proto-preprocessor.js');

/* eslint-env jest */

describe('round trip JSON comparison subsets', () => {
  let sampleJson;

  beforeEach(() => {
    sampleJson = JSON.parse(preprocessor.processForProto(sample));
  });

  it('has the same audit results and details (if applicable)', () => {
    for (const auditId of Object.keys(sampleJson.audits)) {
      expect(roundTripJson.audits[auditId]).toEqual(sampleJson.audits[auditId]);
    }
  });

  it('has the same i18n rendererFormattedStrings', () => {
    expect(roundTripJson.i18n).toMatchObject(sampleJson.i18n);
  });

  it('has the same top level values', () => {
    // Don't test all top level properties that are objects.
    Object.keys(sampleJson).forEach(audit => {
      if (typeof sampleJson[audit] === 'object' && !Array.isArray(sampleJson[audit])) {
        delete sampleJson[audit];
      }
    });

    // Properties set to their type's default value will be omitted in the roundTripJson.
    // For an explicit list of properties, remove sampleJson values if set to a default.
    if (Array.isArray(sampleJson.stackPacks) && sampleJson.stackPacks.length === 0) {
      delete sampleJson.stackPacks;
    }

    expect(roundTripJson).toMatchObject(sampleJson);
  });

  it('has the same config values', () => {
    // Config settings from proto round trip should be a subset of the actual settings.
    expect(sampleJson.configSettings).toMatchObject(roundTripJson.configSettings);
  });
});

describe('round trip JSON comparison to everything', () => {
  let sampleJson;

  beforeEach(() => {
    sampleJson = JSON.parse(preprocessor.processForProto(sample));

    // Proto conversion turns empty summaries into null. This is OK,
    // and is handled in the PSI roundtrip just fine, but messes up the easy
    // jest sub-object matcher. So, we put the empty object back in its place.
    for (const audit of Object.values(roundTripJson.audits)) {
      if (audit.details && audit.details.summary === null) {
        audit.details.summary = {};
      }
    }
  });

  it('has the same JSON overall', () => {
    expect(sampleJson).toMatchObject(roundTripJson);
  });
});
