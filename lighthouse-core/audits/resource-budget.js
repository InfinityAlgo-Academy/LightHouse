/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const NetworkRecords = require('../computed/network-records.js');
const ComputedResourceSummary = require('../computed/resource-summary.js');
const i18n = require('../lib/i18n/i18n.js');
const MainResource = require('../computed/main-resource.js');
const Budget = require('../config/budget.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to minimize the size and quantity of resources used to load the page. */
  title: 'Performance budget',
  /** Description of a Lighthouse audit that tells the user that they can setup a budgets for the quantity and size of page resources. No character length limits. */
  description: 'How the network resources match up against the provided budget.',
  /** [ICU Syntax] Label identifying the number of requests*/
  requestCount: `{count, plural,
    =1 {1 request}
    other {# requests}
   }`,
  totalResourceType: 'Total',
  /** Label for the 'Document' resource type. */
  documentResourceType: 'Document',
  /** Label for the 'script' resource type. */
  scriptResourceType: 'Script',
  /** Label for the 'stylesheet' resource type. */
  stylesheetResourceType: 'Stylesheet',
  /** Label for the 'image' resource type. */
  imageResourceType: 'Image',
  /** Label for the 'media' resource type. */
  mediaResourceType: 'Media',
  /** Label for the 'font' resource type. */
  fontResourceType: 'Font',
  /** Label for the 'other' resource type. */
  otherResourceType: 'Other',
  /** Label for the 'third-party' resource type. */
  thirdPartyResourceType: 'Third-party',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class ResourceBudget extends Audit {
  /**
     * @return {LH.Audit.Meta}
     */
  static get meta() {
    return {
      id: 'resource-budget',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
 * @param {Array<LH.Budget.ResourceBudget>|undefined} budget
 * @param {number} measurement
 * @param {string} resourceType
 * @return {number|undefined}
 */
  static overBudgetAmount(budget, measurement, resourceType) {
    if (budget === undefined) {
      return undefined;
    }
    const resourceBudget = budget.find((b) => b.resourceType === resourceType);
    if (resourceBudget === undefined) {
      return undefined;
    }
    const overBudget = measurement - resourceBudget.budget;
    return overBudget > 0 ? overBudget : undefined;
  }

  /**
 * @param {LH.Budget | undefined} budget
 * @return {LH.Audit.Details.Table['headings']}
 */
  static tableHeadings(budget) {
    /** @type {LH.Audit.Details.Table['headings']} */
    const headers = [
      {key: 'label', itemType: 'text', text: 'Resource Type'},
      {key: 'count', itemType: 'numeric', text: 'Requests'},
      {key: 'size', itemType: 'bytes', text: 'File Size'},
    ];

    /** @type {LH.Audit.Details.Table['headings']} */
    const budgetHeaders = [
      // {key: 'overBudget', itemType: 'text', text: 'Over Budget'},
      {key: 'countOverBudget', itemType: 'text', text: ''},
      {key: 'sizeOverBudget', itemType: 'bytes', text: 'Over Budget'},
    ];
    return budget ? headers.concat(budgetHeaders) : headers;
  }

  /**
* @param {{resourceType: string, count: number, size: number}} row
* @param {LH.Budget | undefined} budget
* @return {boolean}
*/
  static shouldIncludeRow(row, budget) {
    if (budget === undefined) {
      return true;
    } else {
      const budgets = (budget.resourceCounts || []).concat(budget.resourceSizes || []);
      return !!budgets.find((b) => {
        return b.resourceType === row.resourceType;
      });
    }
  }

  /**
* @param {LH.Budget|undefined} budget
* @param {Object<string,{resourceType: string, count: number, size: number}>} summary
* @return {Array<{label: string, count: number, size: number, countOverBudget?: string|undefined, sizeOverBudget?: number|undefined}>}
*/
  static tableItems(budget, summary) {
    /** @type {Object<string,string>} */
    const strMappings = {
      'total': str_(UIStrings.totalResourceType),
      'document': str_(UIStrings.documentResourceType),
      'script': str_(UIStrings.scriptResourceType),
      'stylesheet': str_(UIStrings.stylesheetResourceType),
      'image': str_(UIStrings.imageResourceType),
      'media': str_(UIStrings.mediaResourceType),
      'font': str_(UIStrings.fontResourceType),
      'other': str_(UIStrings.otherResourceType),
      'third-party': str_(UIStrings.thirdPartyResourceType),
    };

    /** @type {Array<{label: string, count: number, size: number, countOverBudget?: string|undefined, sizeOverBudget?: number|undefined}>}*/
    return Object.values(summary).filter((row) => {
      return this.shouldIncludeRow(row, budget);
    }).map((row) => {
      const type = row.resourceType;

      const overCount = this.overBudgetAmount(budget && budget.resourceCounts, row.count, type);
      const overSize = this.overBudgetAmount(budget && budget.resourceSizes, row.size, type);

      return {
        label: strMappings[type],
        count: row.count,
        size: row.size,
        countOverBudget: overCount !== undefined ?
          str_(UIStrings.requestCount, {count: overCount}) : undefined,
        sizeOverBudget: overSize,
      };
    }).sort((a, b) => {
      const overBudgetComparison = (b.sizeOverBudget || 0) - (a.sizeOverBudget || 0);
      const sizeComparison = b.size - a.size;
      return budget ? overBudgetComparison : sizeComparison;
    });
  }

  /**
     * @param {LH.Artifacts} artifacts
     * @param {LH.Audit.Context} context
     * @return {Promise<LH.Audit.Product>}
     */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const mainResource = await (MainResource.request({devtoolsLog, URL: artifacts.URL}, context));

    /** @type{LH.Budget | undefined} */
    const budget = (context.settings.budgets || []).reverse().find((budget) => {
      return Budget.urlMatchesPattern(mainResource.url, budget.path);
    });
    // Don't return results if no budget was provided or matched
    if (!budget) {
      return {
        score: 0,
        notApplicable: true
      }
    }
    const resourceSummary = ComputedResourceSummary.summarize(networkRecords, mainResource.url);

    const headings = ResourceBudget.tableHeadings(budget);
    const tableItems = ResourceBudget.tableItems(budget, resourceSummary);

    return {
      details: Audit.makeTableDetails(headings, tableItems),
      score: 1,
    };
  }
}

module.exports = ResourceBudget;
module.exports.UIStrings = UIStrings;
