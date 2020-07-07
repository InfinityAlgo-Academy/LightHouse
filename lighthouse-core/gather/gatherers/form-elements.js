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
 *  @return {[String, bool]|[nodePathString, bool]|[[undefined, bool]]}
 */
/* istanbul ignore next */
function getParentForm(node) {
  if (node == undefined || node.form == undefined){
    return {identifier: undefined, found: false};
  }
  if (node.form){
    if (node.form.id && node.for.id != ""){
      return {identifier: node.form.id, found: true};
    }
    if (node.form.name && node.form.name != ""){
      return {identifier: node.form.name, found: true};
    }
  }
  // @ts-ignore - getNodePath put into scope via stringification
  return {identifier: getNodePath(node), found: false}; // eslint-disable-line no-undef


}

/**
 * @return {LH.Artifacts['FormElements']}
 */
/* istanbul ignore next */
function collectFormElements() {
  // @ts-ignore - put into scope via stringification
  const inputElements = getElementsInDocument('input'); // eslint-disable-line no-undef
  const selectElements = getElementsInDocument('select'); // eslint-disable-line no-undef
  const textareaElements = getElementsInDocument('textarea'); // eslint-disable-line no-undef
  const labelElements = getElementsInDocument('label'); // eslint-disable-line no-undef
  const formElements = inputElements.concat(selectElements, textareaElements, labelElements)
  return formElements.map(/** @param {HTMLElement} node */ (node) => {
    const parentForm = getParentForm(node)
    return {
      id: node.id,
      elementType: node.nodeName,
      name: node.name,
      parentForm: parentForm.identifier,
      parentFormIdentified: parentForm.found,
      placeHolder: node.placeholder,
      autocomplete: node.autocomplete,
      for: node.for,
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
      ${pageFunctions.getNodePathString};
      return (${collectFormElements})();

    })()`;

    /** @type {LH.Artifacts['FormElements']} */
    const formElements = await driver.evaluateAsync(expression, {useIsolation: true});
    return formElements;
  }
}

module.exports = FormElements;
