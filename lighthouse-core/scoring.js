/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

class ReportScoring {
  /**
   * Computes the weighted-average of the score of the list of items.
   * @param {!Array<{score: ?number|boolean|undefined, weight: number|undefined}>} items
   * @return {number}
   */
  static arithmeticMean(items) {
    const results = items.reduce(
      (result, item) => {
        // HACK. remove this in the next PR
        // Srsly. The score inconsitency has been very bad.
        let itemScore = item.score;
        if (typeof item.score === 'boolean') {
          itemScore = item.score ? 100 : 0;
        }

        const score = Number(itemScore) || 0;
        const weight = Number(item.weight) || 0;
        return {
          weight: result.weight + weight,
          sum: result.sum + score * weight,
        };
      },
      {weight: 0, sum: 0}
    );

    return results.sum / results.weight || 0;
  }

  /**
   * Returns the report JSON object with computed scores.
   * @param {{categories: !Object<string, {id: string|undefined, weight: number|undefined, score: number|undefined, audits: !Array<{id: string, weight: number|undefined}>}>}} config
   * @param {!Object<string, {score: ?number|boolean|undefined, notApplicable: boolean, informative: boolean}>} resultsByAuditId
   */
  static scoreAllCategories(config, resultsByAuditId) {
    for (const [categoryId, category] of Object.entries(config.categories)) {
      category.id = categoryId;
      category.audits.forEach(audit => {
        const result = resultsByAuditId[audit.id];
        // Cast to number to catch `null` and undefined when audits error
        /** @type {number|boolean} */
        let auditScore = Number(result.score) || 0;
        if (typeof result.score === 'boolean') {
          // HACK removed in the next PR
          // While we'd like to do this boolean transformation happened on the auditDfn:
          //     auditScore = result.score ? 100 : 0;
          // …the original result.score is untouched which means the smokehouse expectations will fail
          // We're officially rebaselining all those expectations in the next PR...
          // So for now, we'll keep keep both auditDfn.score and result.score boolean
          auditScore = result.score;
        }
        // If a result was not applicable, meaning its checks did not run against anything on
        // the page, force it's weight to 0. It will not count during the arithmeticMean() but
        // will still be included in the final report json and displayed in the report as
        // "Not Applicable".
        if (result.notApplicable) {
          auditScore = 100;
          audit.weight = 0;
          result.informative = true;
        }

        result.score = auditScore;
      });

      const scores = category.audits.map(audit => ({
        score: resultsByAuditId[audit.id].score,
        weight: audit.weight,
      }));
      const categoryScore = ReportScoring.arithmeticMean(scores);
      // mutate config.categories[].score
      category.score = categoryScore;
    }
  }
}

module.exports = ReportScoring;
