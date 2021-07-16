/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// dumact

const fs = require('fs');
const jsdom = require('jsdom');
const expect = require('expect');
const {LH_ROOT} = require('../../root.js');
const {serializeArguments} = require('../gather/driver/execution-context.js');

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
        lines.push(`${varName}.textContent = ${JSON.stringify(el.textContent)};`);
      }

      return;
    }

    const isSvg = el.namespaceURI && el.namespaceURI.endsWith('/svg');
    const namespaceURI = isSvg ? el.namespaceURI : '';
    const tagName = el.tagName.toLowerCase();
    const className = el.classList.toString();

    let createElementFnName = 'createElement';
    const args = [tagName];
    if (className) {
      args.push(className);
    }
    if (namespaceURI) {
      createElementFnName = 'createElementNS';
      args.unshift(namespaceURI);
    }

    const varName = makeOrGetVarName(el);
    lines.push(`const ${varName} = dom.${createElementFnName}(${serializeArguments(args)});`);

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
  lines.push(`const ${fragmentVarName} = dom.document().createDocumentFragment();`);

  for (const topLevelEl of tmpEl.content.children) {
    process(topLevelEl);
    lines.push(`${fragmentVarName}.append(${makeOrGetVarName(topLevelEl)})`);
  }

  lines.push(`debugger; return ${fragmentVarName};`);

  // TODO: use more parseable names for template id
  const componentName = tmpEl.id.replace('tmpl-lh-', '').replace(/-/g, '');
  const functionName = `create${upperFirst(componentName)}Component`;
  const functionCode = createFunctionCode(functionName, lines);
  assertDOMTreeMatches(tmpEl, functionCode);
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

/**
 * @param {HTMLTemplateElement} tmplEl
 * @param {string} functionCode
 */
async function assertDOMTreeMatches(tmplEl, functionCode) {
  global.document = window.document;
  global.Node = window.Node;
  global.DocumentFragment = window.DocumentFragment;

  const DOM = (await import('../../report/renderer/dom.js')).DOM;
  global.dom = new DOM(window.document);

  function cleanUselessNodes(parent) {
    for (const child of Array.from(parent.childNodes)) {
      if (
        (child.nodeType === window.Node.TEXT_NODE && (child.nodeValue || '').trim().length === 0) ||
        child.nodeType === window.Node.COMMENT_NODE
      ) {
        parent.removeChild(child);
      } else if (child.nodeType === window.Node.ELEMENT_NODE) {
        cleanUselessNodes(child);
      }
    }
  }

  console.log('tmplEl.id', tmplEl.id);
  console.log(functionCode);
  /** @type {DocumentFragment} */
  const generatedFragment = eval(`(${functionCode})()`);
  console.log('eval OK');
  const originalFragment = tmplEl.content.cloneNode(true);
  cleanUselessNodes(originalFragment);

  expect(generatedFragment.childNodes.length).toEqual(originalFragment.childNodes.length);
  for (let i = 0; i < generatedFragment.childNodes.length; i++) {
    expect(generatedFragment.childNodes[0].innerHTML)
      .toEqual(originalFragment.childNodes[0].innerHTML);
  }

  // TODO: also assert something else to catch how SVG elements serialize the same, even if they dont get built correctly (with createAttributeNS, etc)
}

const processedTemplates = [...tmplEls].map(compileTemplate);
for (const {functionCode} of processedTemplates) {
  console.log(functionCode, '');
}
console.log(makeGenericCreateComponentFunctionCode());
