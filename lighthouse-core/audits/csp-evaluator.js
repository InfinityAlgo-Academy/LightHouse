/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const MainResource = require('../computed/main-resource.js');
const i18n = require('../lib/i18n/i18n.js');
const csp = require('../../evaluator_binary.js');

const UIStrings = {
  title: 'CSP secures page from XSS attacks',
  failureTitle: 'CSP does not completely secure page from XSS attacks',
  description: 'A Content Security Policy (CSP) can significantly reduce the risk of XSS attacks. '
    + '[Learn more](https://developers.google.com/web/fundamentals/security/csp)',
  metaTagWarning: 'This page has a CSP defined in a meta tag. ' +
    'We recommend putting your CSP in the HTTP header.',
  noCsp: 'Does not have CSP',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class CSPEvaluator extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'csp-evaluator',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['devtoolsLogs', 'MetaElements', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const mainResource = await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);

    // CSP defined in meta tag is not recommended, warn if a CSP is defined this way.
    const hasCspMetaTags = !!artifacts.MetaElements.find(m => {
      return m.httpEquiv && m.httpEquiv.toLowerCase() === 'content-security-policy';
    });
    const warnings = hasCspMetaTags ? [UIStrings.metaTagWarning] : [];

    const cspHeader = mainResource.responseHeaders.find(h => {
      return h.name.toLowerCase() === 'content-security-policy';
    });
    if (!cspHeader) {
      return {
        warnings,
        score: 0,
        notApplicable: false,
        displayValue: UIStrings.noCsp,
      };
    }
    const parser = new csp.CspParser(cspHeader.value);
    const evaluator = new csp.CspEvaluator(parser.csp, csp.Version.CSP3);
    const findings = evaluator.evaluate();
    const results = [{description: cspHeader.value}, ...findings];
    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'directive', itemType: 'code', text: 'Directive'},
      {key: 'value', itemType: 'code', text: 'Value'},
      {key: 'description', itemType: 'text', text: 'Description'},
      {key: 'severity', itemType: 'text', text: 'Severity'},
      /* eslint-enable max-len */
    ];
    const details = Audit.makeTableDetails(headings, results);
    return {
      warnings,
      score: findings.find(f => f.severity < 100) ? 0 : 1,
      notApplicable: false,
      details,
    };
  }
}

module.exports = CSPEvaluator;
module.exports.UIStrings = UIStrings;
