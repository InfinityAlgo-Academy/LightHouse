/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Capture IssueAdded events
 */

'use strict';

const Gatherer = require('./gatherer.js');

/**
 * @param {LH.Crdp.Audits.InspectorIssue} issue
 */
function getDetails(issue) {
  const keys = Object.keys(issue.details);
  if (keys.length !== 1) return;
  const key = /** @type {keyof typeof issue.details} */ (keys[0]);
  return issue.details[key];
}

class InspectorIssues extends Gatherer {
  constructor() {
    super();
    /** @type {Array<LH.Crdp.Audits.InspectorIssue>} */
    this._issues = [];
    this._onIssueAdded = this.onIssueAdded.bind(this);
  }

  /**
   * @param {LH.Crdp.Audits.IssueAddedEvent} entry
   */
  onIssueAdded(entry) {
    this._issues.push(entry.issue);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  async beforePass(passContext) {
    const driver = passContext.driver;
    driver.on('Audits.issueAdded', this._onIssueAdded);
    await driver.sendCommand('Audits.enable');
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['InspectorIssues']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    const networkRecords = loadData.networkRecords;

    driver.off('Audits.issueAdded', this._onIssueAdded);
    await driver.sendCommand('Audits.disable');
    const artifact = {
      blockedByResponse: [],
      mixedContent: [],
    };

    for (const issue of this._issues) {
      const details = getDetails(issue);
      if (!details) continue;

      const issueRequestId = details.request && details.request.requestId;
      const issueRequest = networkRecords.find(req => req.requestId === issueRequestId);

      // Expected a request, but didn't find it.
      if (issueRequestId && !issueRequest) continue;

      const artifactKey = /** @type {keyof typeof artifact} */ (
        issue.code.charAt(0).toLowerCase() + issue.code.substr(1).replace('Issue', ''));
      if (artifactKey in artifact) {
        // @ts-ignore: Coerce to specific details subtype.
        artifact[artifactKey].push(details);
      }
    }

    return artifact;
  }
}

module.exports = InspectorIssues;
