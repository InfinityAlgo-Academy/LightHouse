/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const ConfigV2 = require('../../config/v2/config');

class ReportGeneratorV2 {
  _arithmeticMean(items) {
    const results = items.reduce((result, item) => {
      const score = Number(item.score) || 0;
      const weight = Number(item.weight) || 0;
      return {
        weight: result.weight + weight,
        sum: result.sum + score * weight,
      };
    }, {weight: 0, sum: 0});

    return (results.sum / results.weight) || 0;
  }

  _geometricMean(items) {
    const results = items.reduce((result, item) => {
      const score = Number(item.score) || 0;
      const weight = Number(item.weight) || 0;
      return {
        weight: result.weight + weight,
        product: result.product * Math.max(Math.pow(score, weight), 1),
      };
    }, {weight: 0, product: 1});

    return Math.pow(results.product, 1 / results.weight) || 0;
  }

  generateReportJson(config, resultsByAuditId) {
    const categories = ConfigV2.objectToArray(config.report.categories).map(category => {
      const children = category.children.map(item => {
        const result = resultsByAuditId[item.id];
        let score = Number(result.score) || 0;
        if (typeof result.score === 'boolean') {
          score = result.score ? 100 : 0;
        }

        return Object.assign({}, item, {result, score});
      });

      const score = this._arithmeticMean(children);
      return Object.assign({}, category, {children, score});
    });

    const scoreByCategory = categories.reduce((scores, category) => {
      scores[category.id] = category.score;
      return scores;
    }, {});

    const score = this._geometricMean([
      {score: scoreByCategory.pwa, weight: 5},
      {score: scoreByCategory.performance, weight: 5},
      {score: scoreByCategory.accessibility, weight: 4},
    ]);
    return {score, categories};
  }
}

module.exports = ReportGeneratorV2;
