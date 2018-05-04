/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const Audit = require('./audits/audit');

/**
 * Clamp figure to 2 decimal places
 * @param {number} val
 * @return {number}
 */
const clampTo2Decimals = val => Math.round(val * 100) / 100;

class ReportScoring {
  /**
   * Computes the weighted-average of the score of the list of items.
   * @param {Array<{score: number, weight: number}>} items
   * @return {number}
   */
  static arithmeticMean(items) {
    const results = items.reduce(
      (result, item) => {
        const score = item.score;
        const weight = item.weight;
        return {
          weight: result.weight + weight,
          sum: result.sum + score * weight,
        };
      },
      {weight: 0, sum: 0}
    );

    return clampTo2Decimals(results.sum / results.weight || 0);
  }

  /**
   * Returns the report JSON object with computed scores.
   * @param {Object<string, LH.Config.Category>} configCategories
   * @param {Object<string, LH.Audit.Result>} resultsByAuditId
   * @return {Array<LH.Result.Category>}
   */
  static scoreAllCategories(configCategories, resultsByAuditId) {
    const scoredCategories = [];

    for (const [categoryId, configCategory] of Object.entries(configCategories)) {
      // Copy category audit members
      const audits = configCategory.audits.map(configMember => {
        const member = {...configMember};

        // If a result was not applicable, meaning its checks did not run against anything on
        // the page, force it's weight to 0. It will not count during the arithmeticMean() but
        // will still be included in the final report json and displayed in the report as
        // "Not Applicable".
        const result = resultsByAuditId[member.id];
        if (result.scoreDisplayMode === Audit.SCORING_MODES.NOT_APPLICABLE) {
          member.weight = 0;
        }
        return member;
      });

      const scores = audits.map(member => ({
        score: resultsByAuditId[member.id].score,
        weight: member.weight,
      }));
      const score = ReportScoring.arithmeticMean(scores);

      scoredCategories.push({
        ...configCategory,
        audits,
        id: categoryId,
        score,
      });
    }

    return scoredCategories;
  }
}

module.exports = ReportScoring;
