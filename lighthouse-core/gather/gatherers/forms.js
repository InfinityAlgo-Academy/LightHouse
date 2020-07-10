/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');

/* eslint-env browser, node */


/**
 *  @param {HTMLFormElement} formElement
 *  @return { { id: any; nodeName: any; name: any; placeholder: any; autocomplete: any; }[] }
 */
/* istanbul ignore next */
function getChildrenInputs(formElement) {
  /** @type {{ id: any; nodeName: any; name: any; placeholder: any; autocomplete: any; }[]} */
  const inputsArray = []; 
  const childrenArray = Array.prototype.slice.call(formElement.childNodes);
  
  for (const element of childrenArray){
    if (element.nodeName == 'INPUT' || element.nodeName == 'SELECT' || element.nodeName == 'TEXTAREA'){
      /** @type { { id: any; nodeName: any; name: any; placeholder: any; autocomplete: any;} } */
      const inputAttributes = {
        id: element.id,
        nodeName: element.nodeName,
        name: element.name,
        placeholder: element.placeholder,
        autocomplete: element.autocomplete,
      }
      inputsArray.push(inputAttributes);
    }
  };
  
  return inputsArray;
}

/**
 *  @param {HTMLFormElement} formElement
 *  @return { { id: any; nodeName: any; name: any; for: any; }[] }
 */
/* istanbul ignore next */
function getChildrenLabels(formElement) {
  /** @type {{ id: any; nodeName: any; name: any; for: any; }[]} */
  const labelsArray = [];

  const childrenArray = Array.prototype.slice.call(formElement.childNodes);
  for (const element of childrenArray){
    if (element.nodeName == 'LABEL'){
       /** @type { {id: any; nodeName: any; name: any; for: any;} } */
      const labelAttributes = {
        id: element.id,
        nodeName: element.nodeName,
        name: element.name,
        for: element.for,
      }
      labelsArray.push(labelAttributes);
    }
  };

  return labelsArray;
}

/**
 * @param {HTMLElement[]} formChildren
 * @return { { inputs: { id: any; nodeName: any; name: any; placeholder: any; autocomplete: any; }[], labels: { id: any; nodeName: any; name: any; for: any; }[] } } 
 */
/* istanbul ignore next */
function getFormlessElements(formChildren) {

  /** @type { { inputs: { id: any; nodeName: any; name: any; placeholder: any; autocomplete: any; }[], labels: { id: any; nodeName: any; name: any; for: any; }[] } } */
  const formless = {
    inputs: [],
    labels: [],
  };

  for (const childElement of formChildren){
    if (childElement.form) continue;

    if (childElement.nodeName == 'INPUT' || childElement.nodeName == 'SELECT' || childElement.nodeName == 'TEXTAREA'){
      const inputAttributes = {
        id: childElement.id,
        nodeName: childElement.nodeName,
        name: childElement.name,
        placeholder: childElement.placeholder,
        autocomplete: childElement.autocomplete,
      }
      formless.inputs.push(inputAttributes);
    }

    else if (childElement.nodeName == 'LABEL'){
      const labelAttributes = {
        id: childElement.id,
        nodeName: childElement.nodeName,
        name: childElement.name,
        for: childElement.for,
      }
      formless.labels.push(labelAttributes);
    }
  };

  return formless;
}


/**
 * @return {LH.Artifacts['Forms']}
 */
/* istanbul ignore next */
function collectFormElements() {

  // @ts-ignore - put into scope via stringification
  const formElements = getElementsInDocument('form'); // eslint-disable-line no-undef
  // @ts-ignore - put into scope via stringification
  const inputs = getElementsInDocument('input'); // eslint-disable-line no-undef
  // @ts-ignore - put into scope via stringification
  const labels = getElementsInDocument('labels'); // eslint-disable-line no-undef
  // @ts-ignore - put into scope via stringification
  const textareas = getElementsInDocument('textarea'); // eslint-disable-line no-undef
  // @ts-ignore - put into scope via stringification
  const selects = getElementsInDocument('select'); // eslint-disable-line no-undef

  const formChildren = inputs.concat(labels, textareas, selects)
  const formless = getFormlessElements(formChildren);
  
  const forms = formElements.map(/** @param {HTMLFormElement} formElement */ (formElement) => {
    const attributes = {
      id: formElement.id,
      name:formElement.name,
      autocomplete:formElement.autocomplete,
    }

    return{
      attributes: attributes,
      inputs: getChildrenInputs(formElement),
      labels: getChildrenLabels(formElement),
    }
  });

  if (formless.inputs.length > 0 || formless.labels.length > 0){
    forms.push(formless);
  }
  return forms;
}

class Forms extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['Forms']>}
   * @override
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    const expression = `(() => {
      ${getChildrenInputs.toString()};
      ${getChildrenLabels.toString()};
      ${getFormlessElements.toString()};
      ${pageFunctions.getOuterHTMLSnippetString};
      ${pageFunctions.getElementsInDocumentString};
      ${pageFunctions.isPositionFixedString};
      ${pageFunctions.getNodePathString};
      return (${collectFormElements})();

    })()`;

    /** @type {LH.Artifacts['Forms']} */
    const formElements = await driver.evaluateAsync(expression, {useIsolation: true});
    return formElements;
  }
}

module.exports = Forms;
