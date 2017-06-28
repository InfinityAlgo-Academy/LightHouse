/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const Util = require('../../report/v2/renderer/util');

const KB_IN_BYTES = 1024;

const WASTED_MS_FOR_AVERAGE = 300;
const WASTED_MS_FOR_POOR = 750;

/**
 * @overview Used as the base for all byte efficiency audits. Computes total bytes
 *    and estimated time saved. Subclass and override `audit_` to return results.
 */
class UnusedBytes extends Audit {
  /**
   * @param {number} wastedMs
   * @return {number}
   */
  static scoreForWastedMs(wastedMs) {
    if (wastedMs === 0) return 100;
    else if (wastedMs < WASTED_MS_FOR_AVERAGE) return 90;
    else if (wastedMs < WASTED_MS_FOR_POOR) return 65;
    else return 0;
  }

  /**
   * @param {number} bytes
   * @return {string}
   */
  static bytesToKbString(bytes) {
    return Util.formatBytesToKB(bytes, 0);
  }

  /**
   * @param {number} bytes
   * @param {number} percent
   * @return {string}
   */
  static toSavingsString(bytes = 0, percent = 0) {
    const kbDisplay = this.bytesToKbString(bytes);
    const percentDisplay = Util.formatNumber(Math.round(percent)) + '%';
    return `${kbDisplay} (${percentDisplay})`;
  }

  /**
   * @param {number} bytes
   * @param {number} networkThroughput measured in bytes/second
   * @return {string}
   */
  static bytesToMsString(bytes, networkThroughput) {
    return Util.formatMilliseconds(bytes / networkThroughput * 1000, 10);
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Promise<!AuditResult>}
   */
  static audit(artifacts) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLog)
      .then(networkRecords => this.audit_(artifacts, networkRecords))
      .then(result => {
        return artifacts.requestNetworkThroughput(devtoolsLog)
          .then(networkThroughput => this.createAuditResult(result, networkThroughput));
      });
  }

  /**
   * @param {!Audit.HeadingsResult} result
   * @param {number} networkThroughput
   * @return {!AuditResult}
   */
  static createAuditResult(result, networkThroughput) {
    if (!Number.isFinite(networkThroughput) && result.results.length) {
      throw new Error('Invalid network timing information');
    }

    const debugString = result.debugString;
    const results = result.results
        .map(item => {
          const wastedPercent = 100 * item.wastedBytes / item.totalBytes;
          item.wastedKb = this.bytesToKbString(item.wastedBytes);
          item.wastedMs = this.bytesToMsString(item.wastedBytes, networkThroughput);
          item.totalKb = this.bytesToKbString(item.totalBytes);
          item.totalMs = this.bytesToMsString(item.totalBytes, networkThroughput);
          item.potentialSavings = this.toSavingsString(item.wastedBytes, wastedPercent);
          return item;
        })
        .sort((itemA, itemB) => itemB.wastedBytes - itemA.wastedBytes);

    const wastedBytes = results.reduce((sum, item) => sum + item.wastedBytes, 0);
    const wastedKb = Math.round(wastedBytes / KB_IN_BYTES);
    const wastedMs = Math.round(wastedBytes / networkThroughput * 100) * 10;

    let displayValue = result.displayValue || '';
    if (typeof result.displayValue === 'undefined' && wastedBytes) {
      const wastedKbDisplay = this.bytesToKbString(wastedBytes);
      const wastedMsDisplay = this.bytesToMsString(wastedBytes, networkThroughput);
      displayValue = `Potential savings of ${wastedKbDisplay} (~${wastedMsDisplay})`;
    }

    const tableDetails = Audit.makeTableDetails(result.headings, results);

    return {
      debugString,
      displayValue,
      rawValue: wastedMs,
      score: UnusedBytes.scoreForWastedMs(wastedMs),
      extendedInfo: {
        value: {
          wastedMs,
          wastedKb,
          results,
        },
      },
      details: tableDetails
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {{results: !Array<Object>, tableHeadings: Object,
   *     passes: boolean=, debugString: string=}}
   */
  static audit_() {
    throw new Error('audit_ unimplemented');
  }
}

module.exports = UnusedBytes;
