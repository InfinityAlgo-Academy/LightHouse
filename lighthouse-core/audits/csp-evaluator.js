/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const MainResource = require('../computed/main-resource.js');
const i18n = require('../lib/i18n/i18n.js');
const {
  evaluateRawCspForFailures,
  evaluateRawCspForWarnings,
  evaluateRawCspForSyntax,
} = require('../lib/csp-evaluator.js');

/** @typedef {import('../lib/csp-evaluator.js').Finding} Finding */

const UIStrings = {
  title: 'CSP is robust against XSS attacks',
  failureTitle: 'CSP is not robust against XSS attacks',
  description: 'A strong Content Security Policy (CSP) can significantly ' +
    'reduce the risk of XSS attacks. ' +
    '[Learn more](https://developers.google.com/web/fundamentals/security/csp)',
  metaTagWarning: 'The page contains a CSP defined in a meta tag. ' +
    'It is not recommended to use a CSP this way, ' +
    'consider defining the CSP in an HTTP header.',
  noCsp: 'No CSP found in enforcement mode',
  additionalWarning: 'Additional suggestions are available.',
  /**
   * @description [ICU Syntax] Warning message shown when one or more CSPs contain syntax errors.
   * @example {2} numSyntax
   */
  syntaxWarning: `{numSyntax, plural,
    =1 {Syntax error found.}
    other {Syntax errors found.}
  }`,
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
   * @param {Array<string>} rawCsps
   * @return {LH.Audit.Details.TableItem[]}
   */
  static collectSyntaxResults(rawCsps) {
    /** @type {LH.Audit.Details.TableItem[]} */
    const results = [];

    const syntaxFindingsByCsp = evaluateRawCspForSyntax(rawCsps);
    for (let i = 0; i < rawCsps.length; ++i) {
      const items = syntaxFindingsByCsp[i].map(f => {
        return {description: f.description};
      });
      if (!items.length) continue;
      results.push({
        description: `Syntax errors in CSP "${rawCsps[i]}"`,
        subItems: {
          type: 'subitems',
          items,
        },
      });
    }

    return results;
  }

  /**
   * @param {Array<string>} rawCsps
   * @return {LH.Audit.Details.TableItem[]}
   */
  static collectFailureResults(rawCsps) {
    const findings = evaluateRawCspForFailures(rawCsps);
    return findings.map(f => {
      return {description: f.description};
    });
  }

  /**
   * @param {Array<string>} rawCsps
   * @return {LH.Audit.Details.TableItem[]}
   */
  static collectWarningResults(rawCsps) {
    const findings = evaluateRawCspForWarnings(rawCsps);
    return findings.map(f => {
      return {description: f.description};
    });
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
    const cspMetaTags = artifacts.MetaElements.filter(m => {
      return m.httpEquiv && m.httpEquiv.toLowerCase() === 'content-security-policy';
    }).map(m => m.content || '');

    const warnings = cspMetaTags.length ? [str_(UIStrings.metaTagWarning)] : [];

    const cspHeaders = mainResource.responseHeaders.filter(h => {
      return h.name.toLowerCase() === 'content-security-policy';
    }).map(h => h.value);
    if (!cspHeaders.length) {
      return {
        warnings,
        score: 0,
        notApplicable: false,
        displayValue: UIStrings.noCsp,
      };
    }
    const rawCsps = [...cspHeaders, ...cspMetaTags];

    const syntaxResults = this.collectSyntaxResults(rawCsps);
    const failureResults = this.collectFailureResults(rawCsps);
    const warningResults = this.collectWarningResults(rawCsps);

    const results = [...failureResults, ...warningResults, ...syntaxResults];
    if (syntaxResults.length) {
      const numSyntax = syntaxResults.reduce((sum, r) => {
        if (!r.subItems) return sum;
        return sum + r.subItems.items.length;
      }, 0);
      warnings.push(str_(UIStrings.syntaxWarning, {numSyntax}));
    }
    if (warningResults.length && !failureResults.length) {
      warnings.push(str_(UIStrings.additionalWarning));
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'description', itemType: 'text', subItemsHeading: {key: 'description'}, text: 'Description'},
      /* eslint-enable max-len */
    ];
    const details = Audit.makeTableDetails(headings, results);

    return {
      warnings,
      score: failureResults.length ? 0 : 1,
      notApplicable: false,
      details,
    };
  }
}

module.exports = CSPEvaluator;
module.exports.UIStrings = UIStrings;
