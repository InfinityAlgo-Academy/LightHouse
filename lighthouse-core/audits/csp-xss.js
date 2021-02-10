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
  /** Message shown when a CSP has no syntax errors. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". */
  noSyntaxErrors: 'No syntax errors.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class CspXss extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'csp-xss',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['devtoolsLogs', 'MetaElements', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<{cspHeaders: Array<string>, cspMetaTags: Array<string>}>}
   */
  static async getRawCsps(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const mainResource = await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);

    const cspMetaTags = artifacts.MetaElements
      .filter(m => {
        return m.httpEquiv && m.httpEquiv.toLowerCase() === 'content-security-policy';
      })
      .flatMap(m => (m.content || '').split(','))
      .filter(rawCsp => rawCsp.replace(/\s/g, ''));
    const cspHeaders = mainResource.responseHeaders
      .filter(h => {
        return h.name.toLowerCase() === 'content-security-policy';
      })
      .flatMap(h => h.value.split(','))
      .filter(rawCsp => rawCsp.replace(/\s/g, ''));

    return {cspHeaders, cspMetaTags};
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
      if (!items.length) {
        items.push({description: str_(UIStrings.noSyntaxErrors)});
      }

      results.push({
        description: {
          type: 'code',
          value: rawCsps[i],
        },
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
  static collectVulnerabilityResults(rawCsps) {
    const findings = evaluateRawCspForFailures(rawCsps);
    return findings.map(this.findingToTableItem);
  }

  /**
   * @param {Array<string>} rawCsps
   * @return {LH.Audit.Details.TableItem[]}
   */
  static collectSuggestionResults(rawCsps) {
    const findings = evaluateRawCspForWarnings(rawCsps);
    const results = [
      ...findings.map(this.findingToTableItem),
    ];
    return results;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {cspHeaders, cspMetaTags} = await this.getRawCsps(artifacts, context);
    const rawCsps = [...cspHeaders, ...cspMetaTags];
    if (!rawCsps.length) {
      return {
        score: 0,
        notApplicable: false,
        displayValue: str_(UIStrings.noCsp),
      };
    }

    // TODO: Add severity icons for vulnerabilities and suggestions.
    const vulnerabilities = this.collectVulnerabilityResults(rawCsps);
    const suggestions = this.collectSuggestionResults(rawCsps);
    const syntax = this.collectSyntaxResults(rawCsps);

    // Add extra warning for a CSP defined in a meta tag.
    if (cspMetaTags.length) {
      suggestions.push({description: str_(UIStrings.metaTagMessage), directive: undefined});
    }

    const results = [...syntax, ...vulnerabilities, ...suggestions];

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'description', itemType: 'text', subItemsHeading: {key: 'description'}, text: 'Description'},
      {key: 'directive', itemType: 'code', subItemsHeading: {key: 'directive'}, text: 'Directive'},
      /* eslint-enable max-len */
    ];
    const details = Audit.makeTableDetails(headings, results);
    const warnings = suggestions.length && !vulnerabilities.length ?
      [str_(UIStrings.additionalWarning)] : [];

    return {
      warnings,
      score: vulnerabilities.length ? 0 : 1,
      notApplicable: false,
      details,
    };
  }
}

module.exports = CspXss;
module.exports.UIStrings = UIStrings;
