/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

/* eslint-env jest */

const UsesRelPreconnect = require('../../audits/uses-rel-preconnect.js');
const assert = require('assert');
const Runner = require('../../runner.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

const mainResource = {
  url: 'https://www.example.com/',
  parsedURL: {
    securityOrigin: 'https://www.example.com',
  },
  endTime: 1,
};

describe('Performance: uses-rel-preconnect audit', () => {
  let simulator;
  let simulatorOptions;

  beforeEach(() => {
    simulator = {getOptions: () => simulatorOptions};
    simulatorOptions = {
      rtt: 100,
      additionalRttByOrigin: new Map(),
    };
  });

  it(`shouldn't suggest preconnect for same origin`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://www.example.com/request',
      },
    ];
    const artifacts = Object.assign(Runner.instantiateComputedArtifacts(), {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      requestMainResource: () => Promise.resolve(mainResource),
      requestLoadSimulator: () => Promise.resolve(simulator),
    });

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts, {});
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest preconnect when initiator is main resource`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/request',
        initiator: mainResource,
      },
    ];
    const artifacts = Object.assign(Runner.instantiateComputedArtifacts(), {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      requestMainResource: () => Promise.resolve(mainResource),
      requestLoadSimulator: () => Promise.resolve(simulator),
    });

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts, {});
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest non http(s) protocols as preconnect`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'data:text/plain;base64,hello',
        initiator: {},
      },
    ];
    const artifacts = Object.assign(Runner.instantiateComputedArtifacts(), {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      requestMainResource: () => Promise.resolve(mainResource),
      requestLoadSimulator: () => Promise.resolve(simulator),
    });

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts, {});
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest preconnect when already connected to the origin`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/request',
        initiator: {},
        timing: {
          dnsStart: -1,
          dnsEnd: -1,
          connectEnd: -1,
          connectStart: -1,
        },
      },
    ];
    const artifacts = Object.assign(Runner.instantiateComputedArtifacts(), {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      requestMainResource: () => Promise.resolve(mainResource),
      requestLoadSimulator: () => Promise.resolve(simulator),
    });

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts, {});
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest preconnect when request has been fired after 15s`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/request',
        initiator: {},
        startTime: 16,
      },
    ];
    const artifacts = Object.assign(Runner.instantiateComputedArtifacts(), {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      requestMainResource: () => Promise.resolve(mainResource),
      requestLoadSimulator: () => Promise.resolve(simulator),
    });

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts, {});
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`should only list an origin once`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'https://cdn.example.com/first',
        initiator: {},
        startTime: 2,
        timing: {
          dnsStart: 100,
          connectStart: 150,
          connectEnd: 300,
        },
      },
      {
        url: 'https://cdn.example.com/second',
        initiator: {},
        startTime: 3,
        timing: {
          dnsStart: 300,
          connectStart: 350,
          connectEnd: 400,
        },
      },
    ];
    const artifacts = Object.assign(Runner.instantiateComputedArtifacts(), {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      requestMainResource: () => Promise.resolve(mainResource),
      requestLoadSimulator: () => Promise.resolve(simulator),
    });

    const {rawValue, extendedInfo} = await UsesRelPreconnect.audit(artifacts, {});
    assert.equal(rawValue, 200);
    assert.equal(extendedInfo.value.length, 1);
    assert.deepStrictEqual(extendedInfo.value, [
      {url: 'https://cdn.example.com', wastedMs: 200},
    ]);
  });

  it(`should give a list of preconnected origins`, async () => {
    const networkRecords = [
      mainResource,
      {
        url: 'http://cdn.example.com/first',
        initiator: {},
        startTime: 2,
        timing: {
          dnsStart: 100,
          connectStart: 250,
          connectEnd: 300,
        },
      },
      {
        url: 'https://othercdn.example.com/second',
        initiator: {},
        startTime: 1.2,
        timing: {
          dnsStart: 100,
          connectStart: 200,
          connectEnd: 600,
        },
      },
    ];
    const artifacts = Object.assign(Runner.instantiateComputedArtifacts(), {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      requestMainResource: () => Promise.resolve(mainResource),
      requestLoadSimulator: () => Promise.resolve(simulator),
    });

    simulatorOptions = {
      rtt: 100,
      additionalRttByOrigin: new Map([['https://othercdn.example.com', 50]]),
    };

    const {rawValue, extendedInfo} = await UsesRelPreconnect.audit(artifacts, {});
    assert.equal(rawValue, 300);
    assert.equal(extendedInfo.value.length, 2);
    assert.deepStrictEqual(extendedInfo.value, [
      {url: 'https://othercdn.example.com', wastedMs: 300},
      {url: 'http://cdn.example.com', wastedMs: 100},
    ]);
  });
});
