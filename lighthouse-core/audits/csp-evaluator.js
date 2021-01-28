/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
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
  getTranslatedDescription,
} = require('../lib/csp-evaluator.js');

/** @typedef {import('../lib/csp-evaluator.js').Finding} Finding */

const UIStrings = {
  /** Title of a Lighthouse audit that evaluates the security of a page's CSP. This descriptive title is shown to users when no security vulnerabilities are found in the CSP. "CSP" stands for "Content Security Policy". "XSS" stands for "Cross Site Scripting". "CSP" and "XSS" do not need to be translated. */
  title: 'CSP is robust against XSS attacks',
  /** Title of a Lighthouse audit that evaluates the security of a page's CSP. This descriptive title is shown to users when at least one security vulnerability is found in the CSP. "CSP" stands for "Content Security Policy". "XSS" stands for "Cross Site Scripting". "CSP" and "XSS" do not need to be translated. */
  failureTitle: 'CSP is not robust against XSS attacks',
  /** Description of a Lighthouse audit that evaluates the security of a page's CSP. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. "CSP" stands for "Content Security Policy". "XSS" stands for "Cross Site Scripting". "CSP" and "XSS" do not need to be translated. */
  description: 'A strong Content Security Policy (CSP) can significantly ' +
    'reduce the risk of XSS attacks. ' +
    '[Learn more](https://developers.google.com/web/fundamentals/security/csp)',
  /** Summary text for the results of a Lighthouse audit that evaluates the security of a page's CSP. This is displayed if no CSP is being enforced. "CSP" stands for "Content Security Policy". "CSP" does not need to be translated. */
  noCsp: 'No CSP found in enforcement mode',
  /** Warning message for a Lighthouse audit that evaluates the security of a page's CSP. This is displayed if no security vulnerabilities are found, but additional suggestions are available for tuning the CSP. "CSP" stands for "Content Security Policy". "CSP" does not need to be translated. */
  additionalWarning: 'Additional CSP suggestions are available.',
  /** Message shown when one or more CSPs are defined in a <meta> tag. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "CSP" and "HTTP" do not need to be translated. */
  metaTagMessage: 'The page contains a CSP defined in a <meta> tag. ' +
    'It is not recommended to use a CSP this way, ' +
    'consider defining the CSP in an HTTP header.',
  /**
   * @description [ICU Syntax] Message identifying a CSP which contains one or more syntax errors. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "CSP" does not need to be translated.
   * @example {script-src 'none'; object-src 'self';} rawCsp
   */
  syntaxMessage: `{numSyntax, plural,
    =1 {Syntax error in CSP "{rawCsp}"}
    other {Syntax errors in CSP "{rawCsp}"}
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
   * @param {Finding} finding
   * @return {LH.Audit.Details.TableItem}
   */
  static findingToTableItem(finding) {
    return {
      directive: finding.directive,
      description: getTranslatedDescription(finding),
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
      const items = syntaxFindingsByCsp[i].map(this.findingToTableItem);
      if (!items.length) continue;

      const description = str_(UIStrings.syntaxMessage, {
        numSyntax: items.length,
        rawCsp: rawCsps[i],
      });

      results.push({
        description,
        subItems: {
          type: 'subitems',
          items,
        },
      });
    }

    return results;
  }

  /**
   * @param {Array<string>} cspHeaders
   * @param {Array<string>} cspMetaTags
   * @return {LH.Audit.Details.TableItem[]}
   */
  static collectFailureResults(cspHeaders, cspMetaTags) {
    const rawCsps = [...cspHeaders, ...cspMetaTags];
    const findings = evaluateRawCspForFailures(rawCsps);
    return findings.map(this.findingToTableItem);
  }

  /**
   * @param {Array<string>} cspHeaders
   * @param {Array<string>} cspMetaTags
   * @return {LH.Audit.Details.TableItem[]}
   */
  static collectSuggestionResults(cspHeaders, cspMetaTags) {
    const rawCsps = [...cspHeaders, ...cspMetaTags];
    const findings = evaluateRawCspForWarnings(rawCsps);
    const results = [
      ...findings.map(this.findingToTableItem),
      ...this.collectSyntaxResults(rawCsps),
    ];
    if (cspMetaTags.length) {
      results.push({description: str_(UIStrings.metaTagMessage)});
    }
    return results;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const mainResource = await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);

    const cspMetaTags = artifacts.MetaElements
      .filter(m => {
        return m.httpEquiv && m.httpEquiv.toLowerCase() === 'content-security-policy';
      })
      .map(m => m.content || '');
    const cspHeaders = mainResource.responseHeaders
      .filter(h => {
        return h.name.toLowerCase() === 'content-security-policy';
      })
      .map(h => h.value);

    if (!cspHeaders.length && !cspMetaTags.length) {
      return {
        score: 0,
        notApplicable: false,
        displayValue: str_(UIStrings.noCsp),
      };
    }

    const failures = this.collectFailureResults(cspHeaders, cspMetaTags);
    const suggestions = this.collectSuggestionResults(cspHeaders, cspMetaTags);

    const results = [...failures, ...suggestions];

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'directive', itemType: 'text', subItemsHeading: {key: 'directive'}, text: 'Directive'},
      {key: 'description', itemType: 'text', subItemsHeading: {key: 'description'}, text: 'Description'},
      /* eslint-enable max-len */
    ];
    const details = Audit.makeTableDetails(headings, results);
    const warnings = suggestions.length && !failures.length ?
      [str_(UIStrings.additionalWarning)] : [];

    return {
      warnings,
      score: failures.length ? 0 : 1,
      notApplicable: false,
      details,
    };
  }
}

module.exports = CSPEvaluator;
module.exports.UIStrings = UIStrings;
