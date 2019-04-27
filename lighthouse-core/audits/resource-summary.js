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

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to minimize the size and quantity of resources used to load the page. */
  title: 'Keep request counts and file sizes small',
  /** Description of a Lighthouse audit that tells the user that they can setup a budgets for the quantity and size of page resources. No character length limits. */
  description: 'To set budgets for the quantity and size of page resources,' +
    ' add a budget.json file.',
  /** [ICU Syntax] Label for an audit identifying the number of requests and kilobytes used to load the page. */
  displayValue: `{requestCount, plural, =1 {1 request} other {# requests}}` +
    ` • { byteCount, number, bytes } KB`,
  /** Label for the combination of all resources on the page. */
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

class ResourceSummary extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'resource-summary',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
    * @param {LH.Artifacts} artifacts
    * @param {LH.Audit.Context} context
    * @return {Promise<LH.Audit.Product>}
    */
  static async audit(artifacts, context) {
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

    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const mainResource = await (MainResource.request({devtoolsLog, URL: artifacts.URL}, context));
    const resourceSummary = ComputedResourceSummary.summarize(networkRecords, mainResource.url);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'label', itemType: 'text', text: 'Resource Type'},
      {key: 'count', itemType: 'numeric', text: 'Requests'},
      {key: 'size', itemType: 'bytes', text: 'File Size'},
    ];

    const tableContents = Object.values(resourceSummary).map((resource) => {
      return {
        resourceType: resource.resourceType,
        label: strMappings[resource.resourceType],
        count: resource.count,
        size: resource.size,
      };
    }).sort((a, b) => {
      return b.size - a.size;
    });

    const tableDetails = Audit.makeTableDetails(headings, tableContents);

    return {
      details: tableDetails,
      score: 1,
      displayValue: str_(UIStrings.displayValue, {
        requestCount: resourceSummary.total.count,
        byteCount: resourceSummary.total.size,
      }),
    };
  }
}

module.exports = ResourceSummary;
module.exports.UIStrings = UIStrings;
