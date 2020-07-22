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
 *  @return { {inputs: LH.Artifacts['FormInputs'][], labels: LH.Artifacts['FormLabels'][]}}
 */
/* istanbul ignore next */
function getChildrenElements(formElement) {
  /** @type {LH.Artifacts['FormInputs'][]} */
  const inputEls = [];
  /** @type {LH.Artifacts['FormLabels'][]} */
  const labels = [];
  const childrenArray = /** @type {HTMLElement[]} */ ([...formElement.childNodes]);

  for (const element of childrenArray) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
      || element instanceof HTMLSelectElement ) {
      /** @type { LH.Artifacts['FormInputs']} */
      const inputAttributes = {
        id: element.id,
        nodeName: element.nodeName,
        name: element.name,
        placeholder: element.getAttribute('placeholder'),
        autocomplete: element.autocomplete,
      };
      inputEls.push(inputAttributes);
    }
    if (element instanceof HTMLLabelElement) {
      /** @type {LH.Artifacts['FormLabels']} */
      const labelAttributes = {
        id: element.id,
        nodeName: element.nodeName,
        for: element.htmlFor,
      };
      labels.push(labelAttributes);
    }
  }

  return {inputs: inputEls, labels: labels};
}

/**
 * @return {LH.Artifacts['Forms']}
 */
/* istanbul ignore next */
function collectFormElements() {
  // @ts-ignore - put into scope via stringification
  const formChildren = getElementsInDocument('textarea, input, labels, select'); // eslint-disable-line no-undef
  const forms = new Map();
  /** @type { { inputs: LH.Artifacts['FormInputs'][], labels: LH.Artifacts['FormLabels'][] }  } */
  const formless = {
    inputs: [],
    labels: [],
  };
  for (const child of formChildren) {
    const form = child.form ? forms.get(child.form) : formless;
    if (!form) {
      const els = getChildrenElements(child.form);
      forms.set( child.form, {
        attributes: {
          id: child.form.id,
          name: child.form.name,
          autocomplete: child.form.autocomplete,
        },
        inputs: els.inputs,
        labels: els.labels,
      });
    } else if ((child instanceof HTMLInputElement || child instanceof HTMLTextAreaElement
      || child instanceof HTMLSelectElement) && form === formless ) {
      formless.inputs.push({
        id: child.id,
        nodeName: child.nodeName,
        name: child.name,
        placeholder: child.getAttribute('placeholder'),
        autocomplete: child.autocomplete,
      });
    } else if (child instanceof HTMLLabelElement && form === formless ) {
      formless.labels.push({
        id: child.id,
        nodeName: child.nodeName,
        for: child.htmlFor,
      });
    }
  }

  if (formless.inputs.length > 0 || formless.labels.length > 0) {
    forms.set('formless', {
      inputs: formless.inputs,
      labels: formless.labels,
    });
  }
  return [...forms.values()];
}

class Forms extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['Forms']>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    const expression = `(() => {
      ${getChildrenElements.toString()};
      ${pageFunctions.getElementsInDocumentString};
      return (${collectFormElements})();
    })()`;

    /** @type {LH.Artifacts['Forms']} */
    const formElements = await driver.evaluateAsync(expression, {useIsolation: true});
    return formElements;
  }
}

module.exports = Forms;
