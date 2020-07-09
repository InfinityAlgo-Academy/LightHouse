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
 *  @param {HTMLFormElement}
 *  @return {any[]}
 */
/* istanbul ignore next */
function getChildrenInputs(formElement) {
  if (formElement.formless == true){
    return formElement.inputs
  }

  const inputsArray = [];
  const childrenArray = Array.prototype.slice.call(formElement.childNodes);
  
  childrenArray.map(  /** @param {HTMLElement} node */ (element) => {
    if (element.nodeName == 'INPUT' || element.nodeName == 'SELECT' || element.nodeName == 'TEXTAREA'){
      inputAttributes = {
        id: element.id,
        nodeName: element.nodeName,
        name: element.name,
        placeholder: element.placeholder,
        autocomplete: element.autocomplete,
      }
      inputsArray.push(inputAttributes);
    }
  });

  return inputsArray;
}

/**
 *  @param {HTMLFormElement}
 *  @return {any[]}
 */
/* istanbul ignore next */
function getChildrenLabels(formElement) {
  if (formElement.formless == true){
    return formElement.labels
  }
  const childrenArray = Array.prototype.slice.call(formElement.childNodes);
  const labelsArray = [];
  childrenArray.map(/** @param {HTMLElement} node */ (element) => {
    if (element.nodeName == 'LABEL'){
      labelAttributes = {
        id: element.id,
        nodeName: element.nodeName,
        name: element.name,
        for: element.for,
      }
      labelsArray.push(labelAttributes);
    }
  });

  return labelsArray;
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
  const formElements = getElementsInDocument('form'); // eslint-disable-line no-undef
  const formChildren = inputElements.concat(selectElements, textareaElements, labelElements);

  const formless = {
    formless: true,
    inputs: [],
    labels: [],
  }
  formChildren.map(/** @param {HTMLElement} node */ (childElement) => {
    if (childElement.form == "" || !childElement.form){
      if (childElement.nodeName == 'INPUT' || childElement.nodeName == 'SELECT' || childElement.nodeName == 'TEXTAREA'){
        inputAttributes = {
          id: childElement.id,
          nodeName: childElement.nodeName,
          name: childElement.name,
          placeholder: childElement.placeholder,
          autocomplete: childElement.autocomplete,
        }
        formless.inputs.push(inputAttributes);
      }

      else if (childElement.nodeName == 'LABEL'){
        labelAttributes = {
          id: childElement.id,
          nodeName: childElement.nodeName,
          name: childElement.name,
          for: childElement.for,
        }
        formless.labels.push(labelAttributes);
      }
    }
  });

  if (formless.inputs.length > 0 || formless.labels.length > 0){
    formElements.push(formless);
  }

  return formElements.map(/** @param {HTMLFormElement} node */ (formElement) => {
    const form = {
      id: formElement.id,
      name:formElement.name,
      autocomplete:formElement.autocomplete,
    }

    return{
      form: form,
      inputs: getChildrenInputs(formElement),
      labels: getChildrenLabels(formElement),
    }
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
      ${getChildrenInputs.toString()};
      ${getChildrenLabels.toString()};
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
