/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../../lib/url-shim');
const Audit = require('../audit');

class ExternalAnchorsUseRelNoopenerAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'external-anchors-use-rel-noopener',
      title: 'Links to cross-origin destinations are safe',
      failureTitle: 'Links to cross-origin destinations are unsafe',
      description: 'Add `rel="noopener"` or `rel="noreferrer"` to any external links to improve ' +
          'performance and prevent security vulnerabilities. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/noopener).',
      requiredArtifacts: ['URL', 'AnchorsWithNoRelNoopener'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    /** @type {string[]} */
    const warnings = [];
    const pageHost = new URL(artifacts.URL.finalUrl).host;
    // Filter usages to exclude anchors that are same origin
    // TODO: better extendedInfo for anchors with no href attribute:
    // https://github.com/GoogleChrome/lighthouse/issues/1233
    // https://github.com/GoogleChrome/lighthouse/issues/1345
    const failingAnchors = artifacts.AnchorsWithNoRelNoopener
      .filter(anchor => {
        try {
          return new URL(anchor.href).host !== pageHost;
        } catch (err) {
          // TODO(phulce): make this message better with anchor.outerHTML
          warnings.push('Unable to determine the destination for anchor tag. ' +
            'If not used as a hyperlink, consider removing target=_blank.');
          return true;
        }
      })
      .filter(anchor => {
        return !anchor.href || anchor.href.toLowerCase().startsWith('http');
      })
      .map(anchor => {
        return {
          href: anchor.href || 'Unknown',
          target: anchor.target || '',
          rel: anchor.rel || '',
          url: '<a' +
              (anchor.href ? ` href="${anchor.href}"` : '') +
              (anchor.target ? ` target="${anchor.target}"` : '') +
              (anchor.rel ? ` rel="${anchor.rel}"` : '') + '>',
        };
      });

    const headings = [
      {key: 'href', itemType: 'url', text: 'URL'},
      {key: 'target', itemType: 'text', text: 'Target'},
      {key: 'rel', itemType: 'text', text: 'Rel'},
    ];

    const details = Audit.makeTableDetails(headings, failingAnchors);

    return {
      rawValue: failingAnchors.length === 0,
      extendedInfo: {
        value: failingAnchors,
      },
      details,
      warnings,
    };
  }
}

module.exports = ExternalAnchorsUseRelNoopenerAudit;
