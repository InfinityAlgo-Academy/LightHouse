/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/redirects.js');
const assert = require('assert');

/* eslint-env mocha */
const FAILING_REDIRECTS = {
  startTime: 17,
  redirects: [
    {
      endTime: 1,
      responseReceivedTime: 5,
      startTime: 0,
      url: 'http://example.com/',
    },
    {
      endTime: 16,
      responseReceivedTime: 14,
      startTime: 11,
      url: 'https://example.com/',
    },
    {
      endTime: 17,
      responseReceivedTime: 15,
      startTime: 12,
      url: 'https://m.example.com/',
    },
  ],
};

const SUCCESS_ONE_REDIRECT = {
  startTime: 0.7,
  redirects: [{
    endTime: 0.7,
    responseReceivedTime: 5,
    startTime: 0,
    url: 'https://example.com/',
  }],
};

const SUCCESS_NOREDIRECT = {};

const mockArtifacts = (mockChain) => {
  return {
    devtoolsLogs: {
      [Audit.DEFAULT_PASS]: [],
    },
    requestNetworkRecords: () => {
      return Promise.resolve([]);
    },
    requestMainResource: function() {
      return Promise.resolve(mockChain);
    },
  };
};

describe('Performance: Redirects audit', () => {
  it('fails when more than one redirect detected', () => {
    return Audit.audit(mockArtifacts(FAILING_REDIRECTS)).then(output => {
      assert.equal(output.score, 0);
      assert.equal(output.details.items.length, 3);
      assert.equal(output.rawValue, 6000);
    });
  });

  it('passes when one redirect detected', () => {
    return Audit.audit(mockArtifacts(SUCCESS_ONE_REDIRECT)).then(output => {
      assert.equal(output.score, 100);
      assert.equal(output.details.items.length, 1);
      assert.equal(output.rawValue, 0);
    });
  });

  it('passes when no redirect detected', () => {
    return Audit.audit(mockArtifacts(SUCCESS_NOREDIRECT)).then(output => {
      assert.equal(output.score, 100);
      assert.equal(output.details.items.length, 0);
      assert.equal(output.rawValue, 0);
    });
  });
});
