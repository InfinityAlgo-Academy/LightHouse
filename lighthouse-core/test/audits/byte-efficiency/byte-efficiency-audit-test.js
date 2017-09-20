/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('../../../audits/byte-efficiency/byte-efficiency-audit');
const assert = require('assert');
const NBSP = '\xa0';

/* eslint-env mocha */

describe('Byte efficiency base audit', () => {
  describe('#estimateTransferSize', () => {
    const estimate = ByteEfficiencyAudit.estimateTransferSize;

    it('should estimate by compression ratio when no network record available', () => {
      const result = estimate(undefined, 1000, '', .345);
      assert.equal(result, 345);
    });

    it('should return transferSize when asset matches', () => {
      const _resourceType = {_name: 'stylesheet'};
      const result = estimate({_transferSize: 1234, _resourceType}, 10000, 'stylesheet');
      assert.equal(result, 1234);
    });

    it('should estimate by network compression ratio when asset does not match', () => {
      const _resourceType = {_name: 'other'};
      const result = estimate({_resourceSize: 2000, _transferSize: 1000, _resourceType}, 100);
      assert.equal(result, 50);
    });

    it('should not error when missing resource size', () => {
      const _resourceType = {_name: 'other'};
      const result = estimate({_transferSize: 1000, _resourceType}, 100);
      assert.equal(result, 100);
    });
  });

  it('should format as extendedInfo', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [],
    });

    assert.deepEqual(result.extendedInfo.value.results, []);
  });

  it('should set the rawValue', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 2345, totalBytes: 3000, wastedPercent: 65}],
    }, 5000);

    assert.equal(result.rawValue, 470); // 2345 / 5000 * 1000 ~= 470
  });

  it('should score the wastedMs', () => {
    const perfectResult = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 400, totalBytes: 4000, wastedPercent: 10}],
    }, 100000);

    const goodResult = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 2345, totalBytes: 3000, wastedPercent: 65}],
    }, 10000);

    const averageResult = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 2345, totalBytes: 3000, wastedPercent: 65}],
    }, 5000);

    const failingResult = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 45000, totalBytes: 45000, wastedPercent: 100}],
    }, 10000);

    assert.equal(perfectResult.score, 100, 'scores perfect wastedMs');
    assert.ok(goodResult.score > 75 && goodResult.score < 100, 'scores good wastedMs');
    assert.ok(averageResult.score > 50 && averageResult.score < 75, 'scores average wastedMs');
    assert.ok(failingResult.score < 50, 'scores failing wastedMs');
  });

  it('should throw on invalid network throughput', () => {
    assert.throws(() => {
      ByteEfficiencyAudit.createAuditResult({
        headings: [{key: 'value', text: 'Label'}],
        results: [{wastedBytes: 350, totalBytes: 700, wastedPercent: 50}],
      }, Infinity);
    });
  });

  it('should populate KB', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [
        {wastedBytes: 2048, totalBytes: 4096, wastedPercent: 50},
        {wastedBytes: 1986, totalBytes: 5436},
      ],
    }, 1000);

    assert.equal(result.extendedInfo.value.results[0].wastedKb, `2${NBSP}KB`);
    assert.equal(result.extendedInfo.value.results[0].totalKb, `4${NBSP}KB`);
    assert.equal(result.extendedInfo.value.results[1].wastedKb, `2${NBSP}KB`);
    assert.equal(result.extendedInfo.value.results[1].totalKb, `5${NBSP}KB`);
  });

  it('should populate Ms', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [
        {wastedBytes: 350, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 326, totalBytes: 1954},
        {wastedBytes: 251, totalBytes: 899},
      ],
    }, 1000);

    assert.equal(result.extendedInfo.value.results[0].wastedMs, `350${NBSP}ms`);
    assert.equal(result.extendedInfo.value.results[0].totalMs, `700${NBSP}ms`);
    assert.equal(result.extendedInfo.value.results[1].wastedMs, `330${NBSP}ms`);
    assert.equal(result.extendedInfo.value.results[1].totalMs, `1,950${NBSP}ms`);
    assert.equal(result.extendedInfo.value.results[2].wastedMs, `250${NBSP}ms`);
    assert.equal(result.extendedInfo.value.results[2].totalMs, `900${NBSP}ms`);
  });

  it('should sort on wastedBytes', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [
        {wastedBytes: 350, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 450, totalBytes: 1000, wastedPercent: 50},
        {wastedBytes: 400, totalBytes: 450, wastedPercent: 50},
      ],
    }, 1000);

    assert.equal(result.extendedInfo.value.results[0].wastedBytes, 450);
    assert.equal(result.extendedInfo.value.results[1].wastedBytes, 400);
    assert.equal(result.extendedInfo.value.results[2].wastedBytes, 350);
  });

  it('should create a display value', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [
        {wastedBytes: 512, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 512, totalBytes: 1000, wastedPercent: 50},
        {wastedBytes: 1024, totalBytes: 1200, wastedPercent: 50},
      ],
    }, 4096);

    assert.ok(result.displayValue.includes(`2${NBSP}KB`), 'contains correct bytes');
    assert.ok(result.displayValue.includes(`500${NBSP}ms`), 'contains correct timing');
  });

  it('should populate potential savings', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [
        {wastedBytes: 22416, totalBytes: 104330},
        {wastedBytes: 512, totalBytes: 1024},
        {wastedBytes: 341, totalBytes: 1024},
      ],
    }, 2048);

    assert.equal(result.extendedInfo.value.results[0].potentialSavings, `22${NBSP}KB (21%)`);
    assert.equal(result.extendedInfo.value.results[1].potentialSavings, `1${NBSP}KB (50%)`);
    assert.equal(result.extendedInfo.value.results[2].potentialSavings, `0${NBSP}KB (33%)`);
  });
});
