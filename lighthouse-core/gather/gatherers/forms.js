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
 * @return {LH.Artifacts['Forms']}
 */
/* istanbul ignore next */
function collectFormElements() {
  // @ts-ignore - put into scope via stringification
  const formChildren = getElementsInDocument('textarea, input, label, select'); // eslint-disable-line no-undef
  const forms = new Map();
  /** @type { { inputs: Array<LH.Artifacts.FormInput>, labels: Array<LH.Artifacts.FormLabel> }  } */
  const formlessObj = {
    inputs: [],
    labels: [],
  };
  for (const child of formChildren) {
    const parentFormElement = child.closest('form');
    const hasForm = !!parentFormElement;
    if (hasForm && !forms.has(parentFormElement)) {
      const newFormObj = {
        attributes: {
          id: parentFormElement.id,
          name: parentFormElement.name,
          autocomplete: parentFormElement.autocomplete,
          // @ts-ignore - put into scope via stringification
          nodeLabel: getNodeLabel(child), // eslint-disable-line no-undef,
          // @ts-ignore - put into scope via stringification
          snippet: getOuterHTMLSnippet(parentFormElement), // eslint-disable-line no-undef
        },
        inputs: [],
        labels: [],
      };
      forms.set(parentFormElement, newFormObj);
    }
    const formObj = hasForm ? forms.get(parentFormElement) : formlessObj;

    if (child instanceof HTMLInputElement || child instanceof HTMLTextAreaElement) {
      const isButton = child instanceof HTMLInputElement &&
      (child.type === 'submit' || child.type === 'button');
      if (isButton) continue;
      formObj.inputs.push({
        id: child.id,
        name: child.name,
        placeholder: child.placeholder,
        autocomplete: child.autocomplete,
        // @ts-ignore - put into scope via stringification
        nodeLabel: getNodeLabel(child), // eslint-disable-line no-undef,
        // @ts-ignore - put into scope via stringification
        snippet: getOuterHTMLSnippet(child), // eslint-disable-line no-undef
      });
    }
    if (child instanceof HTMLSelectElement) {
      formObj.inputs.push({
        id: child.id,
        name: child.name,
        autocomplete: child.autocomplete,
        // @ts-ignore - put into scope via stringification
        nodeLabel: getNodeLabel(child), // eslint-disable-line no-undef,
        // @ts-ignore - put into scope via stringification
        snippet: getOuterHTMLSnippet(child), // eslint-disable-line no-undef
      });
    }
    if (child instanceof HTMLLabelElement) {
      formObj.labels.push({
        id: child.id,
        for: child.htmlFor,
        // @ts-ignore - put into scope via stringification
        nodeLabel: getNodeLabel(child), // eslint-disable-line no-undef,
        // @ts-ignore - put into scope via stringification
        snippet: getOuterHTMLSnippet(child), // eslint-disable-line no-undef
      });
    }
  }

  if (formlessObj.inputs.length > 0 || formlessObj.labels.length > 0) {
    forms.set('formless', {
      inputs: formlessObj.inputs,
      labels: formlessObj.labels,
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
      ${pageFunctions.getElementsInDocumentString};
      ${pageFunctions.getNodePathString};
      ${pageFunctions.getOuterHTMLSnippetString};
      ${pageFunctions.getNodeLabelString};
      return (${collectFormElements})();
    })()`;

    /** @type {LH.Artifacts['Forms']} */
    const formElements = await driver.evaluateAsync(expression, {useIsolation: true});
    return formElements;
  }
}

module.exports = Forms;
