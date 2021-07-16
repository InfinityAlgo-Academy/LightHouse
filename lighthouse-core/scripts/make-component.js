/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// dumact

const fs = require('fs');
const jsdom = require('jsdom');
const {LH_ROOT} = require('../../root.js');
const {serializeArguments} = require('../gather/driver/execution-context.js');

// TODO: should change templates.html to use `div` instead of `template`.
// idea: have paremeters in template?
const html = fs.readFileSync(LH_ROOT + '/report/assets/templates.html', 'utf-8');

const {window} = new jsdom.JSDOM(html);

const tmplEls = window.document.querySelectorAll('template');

/**
 * @param {HTMLTemplateElement} tmpEl
 */
function compileTemplate(tmpEl) {
  const map = new Map();
  const lines = [];

  /**
   * @param {HTMLElement} el
   * @return {string}
   */
  function makeOrGetVarName(el) {
    const varName = map.get(el) || ('v' + map.size);
    map.set(el, varName);
    return varName;
  }

  /**
   * @param {HTMLElement} el
   */
  function process(el) {
    if (el.nodeType === window.Node.COMMENT_NODE) return;

    if (el.nodeType === window.Node.TEXT_NODE) {
      if (el.parentElement && el.textContent && el.textContent.trim()) {
        const varName = makeOrGetVarName(el.parentElement);
        lines.push(`${varName}.textContent = ${JSON.stringify(el.textContent)});`);
      }

      return;
    }

    const isSvg = el.namespaceURI && el.namespaceURI.endsWith('/svg');
    const tagName = el.tagName.toLowerCase();
    const namespaceURI = isSvg ? el.namespaceURI : '';
    const className = el.classList.toString();

    let args;
    if (!namespaceURI && !className) {
      args = [tagName];
    } else if (namespaceURI && !className) {
      args = [tagName, namespaceURI];
    } else {
      args = [tagName, namespaceURI || '', className];
    }

    const varName = makeOrGetVarName(el);
    lines.push(`const ${varName} = dom.createElement(${serializeArguments(args)});`);

    if (el.getAttributeNames) {
      for (const attr of el.getAttributeNames() || []) {
        if (attr === 'class') continue;

        if (namespaceURI) {
          lines.push(
            `${varName}.setAttributeNS('${namespaceURI}', '${attr}', '${el.getAttribute(attr)}');`);
        } else {
          lines.push(`${varName}.setAttribute('${attr}', '${el.getAttribute(attr)}');`);
        }
      }
    }

    for (const childEl of el.childNodes) {
      process(childEl);
      const childVarName = map.get(childEl);
      if (childVarName) lines.push(`${varName}.append(${childVarName});`);
    }
  }

  const fragmentVarName = makeOrGetVarName(tmpEl);
  lines.push(`const ${fragmentVarName} = new DocumentFragment();`);

  for (const topLevelEl of tmpEl.content.children) {
    process(topLevelEl);
    lines.push(`${fragmentVarName}.append(${makeOrGetVarName(topLevelEl)})`);
  }

  lines.push(`return ${fragmentVarName};`);

  // TODO: use more parseable names for template id
  const componentName = tmpEl.id.replace('tmpl-lh-', '').replace(/-/g, '_');
  const functionName = `create${upperFirst(componentName)}Component`;
  const functionCode = createFunctionCode(functionName, lines);
  return {componentName, functionName, functionCode};
}

/**
 * @param {string} functionName
 * @param {string[]} bodyLines
 * @param {string[]} parameterNames
 */
function createFunctionCode(functionName, bodyLines, parameterNames = []) {
  const body = bodyLines.map(l => `  ${l}`).join('\n');
  const functionCode = `function ${functionName}(${parameterNames.join(', ')}) {\n${body}\n}`;
  return functionCode;
}

/**
 * @param {string} str
 * @return
 */
function upperFirst(str) {
  return str.charAt(0).toUpperCase() + str.substr(1);
}

const processedTemplates = [...tmplEls].map(compileTemplate);

for (const {functionCode} of processedTemplates) {
  console.log(functionCode, '');
}

function makeGenericCreateComponentFunctionCode() {
  const lines = [];

  lines.push('switch (componentName) {');
  for (const {componentName, functionName} of processedTemplates) {
    lines.push(`  case '${componentName}': return ${functionName}();`);
  }
  lines.push('}');
  lines.push('throw new Error(\'unexpected component: \' + componentName)');

  return createFunctionCode('createComponent', lines, ['componentName']);
}

console.log(makeGenericCreateComponentFunctionCode());
