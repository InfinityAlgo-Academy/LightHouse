/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');

/* eslint-env browser, node */

/**
 *  @param {HTMLElement}
 *  @return {String}
 */
/* istanbul ignore next */
function getParentForm(node) {
  if (node == undefined){
    return "undefined"
  }
  if (node.nodeName == 'BODY'){
    return ""
  };
  if (node.nodeName == 'FORM'){
    if (node.id && node.id != ""){
      return node.id
    }
    if (node.name && node.name != ""){
      return node.name
    }
    return "unidentifiable form"
  };

  return getParentForm(node.parentElement)
}

/**
 * @return {LH.Artifacts['FormElements']}
 */
/* istanbul ignore next */
function collectFormElements() {
  // @ts-ignore - put into scope via stringification
  const inputElements = getElementsInDocument('input'); // eslint-disable-line no-undef
  return inputElements.map(/** @param {HTMLInputElement} node */ (node) => {
    return {
      id: node.id,
      elementType: node.nodeName,
      name: node.name,
      parentForm: getParentForm(node),
      placeHolder: node.placeholder,
      autocomplete: node.autocomplete,
    };
  });
}

class FormElements extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['FormElements']>}
   * @override
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    const expression = `(() => {
      ${getParentForm.toString()};
      ${pageFunctions.getOuterHTMLSnippetString};
      ${pageFunctions.getElementsInDocumentString};
      ${pageFunctions.isPositionFixedString};
      return (${collectFormElements})();

    })()`;

    /** @type {LH.Artifacts['FormElements']} */
    const formElements = await driver.evaluateAsync(expression, {useIsolation: true});
    return formElements;
  }
}

module.exports = FormElements;
