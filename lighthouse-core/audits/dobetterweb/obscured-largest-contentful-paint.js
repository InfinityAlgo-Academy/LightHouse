/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that */
  title: 'Largest Contentful Paint element is fully visible',
  /** Title of a Lighthouse audit that */
  failureTitle: 'Avoid obscuring the Largest Contentful Paint element',
  /** Description of a Lighthouse audit that  */
  description: 'Description',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class ObscuredLargestContentfulPaint extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'obscured-largest-contentful-paint',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['traces', 'ElementsObscuringLCPElement'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const obscuringElements = artifacts.ElementsObscuringLCPElement
      .map(element => {
        return {
          node: /** @type {LH.Audit.Details.NodeValue} */ ({
            type: 'node',
            path: element.devtoolsNodePath,
            selector: element.selector,
            nodeLabel: element.nodeLabel,
            snippet: element.snippet,
          }),
        };
      });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', itemType: 'node', text: str_(i18n.UIStrings.columnElement)},
    ];

    return {
      score: obscuringElements.length > 0 ? 0 : 1,
      details: Audit.makeTableDetails(headings, obscuringElements),
    };
  }
}

module.exports = ObscuredLargestContentfulPaint;
module.exports.UIStrings = UIStrings;
