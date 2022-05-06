/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import {getProtoRoundTrip} from '../test-utils.js';
import {processForProto} from '../../lib/proto-preprocessor.js';
import sampleJson from '../results/sample_v2.json';

const {describeIfProtoExists, sampleResultsRoundtripStr} = getProtoRoundTrip();
const roundTripJson = sampleResultsRoundtripStr && JSON.parse(sampleResultsRoundtripStr);

/* eslint-env jest */
describe('processing for proto', () => {
  it('doesn\'t modify the input object', () => {
    const input = JSON.parse(JSON.stringify(sampleJson));
    processForProto(input);
    expect(input).toEqual(sampleJson);
  });

  it('keeps only necessary configSettings', () => {
    const input = {
      'configSettings': {
        'output': [
          'json',
        ],
        'maxWaitForLoad': 45000,
        'throttlingMethod': 'devtools',
        'throttling': {
          'rttMs': 150,
          'throughputKbps': 1638.4,
          'requestLatencyMs': 562.5,
          'downloadThroughputKbps': 1474.5600000000002,
          'uploadThroughputKbps': 675,
          'cpuSlowdownMultiplier': 4,
        },
        'gatherMode': false,
        'disableStorageReset': false,
        'formFactor': 'mobile',
        'locale': 'en-US',
        'blockedUrlPatterns': null,
        'additionalTraceCategories': null,
        'extraHeaders': null,
        'onlyAudits': null,
        'onlyCategories': null,
        'skipAudits': null,
      },
    };
    const expectation = {
      'configSettings': {
        'formFactor': 'mobile',
        'locale': 'en-US',
        'onlyCategories': null,
      },
    };
    const output = processForProto(input);

    expect(output).toMatchObject(expectation);
  });

  it('cleans up default runtimeErrors', () => {
    const input = {
      'runtimeError': {
        'code': 'NO_ERROR',
      },
    };

    const output = processForProto(input);

    expect(output).not.toHaveProperty('runtimeError');
  });

  it('non-default runtimeErrors are untouched', () => {
    const input = {
      'runtimeError': {
        'code': 'ERROR_NO_DOCUMENT_REQUEST',
      },
    };

    const output = processForProto(input);

    expect(output).toMatchObject(input);
  });

  it('cleans up audits', () => {
    const input = {
      'audits': {
        'critical-request-chains': {
          'scoreDisplayMode': 'not-applicable',
          'numericValue': 14.3,
          'displayValue': ['hello %d', 123],
        },
      },
    };
    const expectation = {
      'audits': {
        'critical-request-chains': {
          'scoreDisplayMode': 'notApplicable',
          'displayValue': 'hello %d | 123',
        },
      },
    };
    const output = processForProto(input);

    expect(output).toMatchObject(expectation);
  });


  it('removes i18n icuMessagePaths', () => {
    const input = {
      'i18n': {
        'icuMessagePaths': {
          'content': 'paths',
        },
      },
    };
    const expectation = {
      'i18n': {},
    };
    const output = processForProto(input);

    expect(output).toMatchObject(expectation);
  });

  it('removes empty strings', () => {
    const input = {
      'audits': {
        'critical-request-chains': {
          'details': {
            'chains': {
              '1': '',
            },
          },
        },
      },
      'i18n': {
        'icuMessagePaths': {
          'content': 'paths',
        },
        '2': '',
        '3': [
          {
            'hello': 'world',
            '4': '',
          },
        ],
      },
    };
    const expectation = {
      'audits': {
        'critical-request-chains': {
          'details': {
            'chains': {},
          },
        },
      },
      'i18n': {
        '3': [
          {'hello': 'world'},
        ],
      },
    };
    const output = processForProto(input);

    expect(output).toMatchObject(expectation);
  });
});

describeIfProtoExists('round trip JSON comparison subsets', () => {
  let processedLHR;

  beforeEach(() => {
    processedLHR = processForProto(sampleJson);
  });

  it('has the same audit results and details (if applicable)', () => {
    for (const auditId of Object.keys(processedLHR.audits)) {
      expect(roundTripJson.audits[auditId]).toEqual(processedLHR.audits[auditId]);
    }
  });

  it('has the same i18n rendererFormattedStrings', () => {
    expect(roundTripJson.i18n).toMatchObject(processedLHR.i18n);
  });

  it('has the same top level values', () => {
    // Don't test all top level properties that are objects.
    Object.keys(processedLHR).forEach(audit => {
      if (typeof processedLHR[audit] === 'object' && !Array.isArray(processedLHR[audit])) {
        delete processedLHR[audit];
      }
    });

    // Properties set to their type's default value will be omitted in the roundTripJson.
    // For an explicit list of properties, remove sampleJson values if set to a default.
    if (Array.isArray(processedLHR.stackPacks) && processedLHR.stackPacks.length === 0) {
      delete processedLHR.stackPacks;
    }

    expect(roundTripJson).toMatchObject(processedLHR);
  });

  it('has the same config values', () => {
    // Config settings from proto round trip should be a subset of the actual settings.
    expect(processedLHR.configSettings).toMatchObject(roundTripJson.configSettings);
  });
});

describeIfProtoExists('round trip JSON comparison to everything', () => {
  let processedLHR;

  beforeEach(() => {
    processedLHR = processForProto(sampleJson);

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
    expect(processedLHR).toMatchObject(roundTripJson);
  });
});
