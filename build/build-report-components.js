/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @typedef CompiledComponent
 * @property {HTMLTemplateElement} tmpEl
 * @property {string} componentName
 * @property {string} functionName
 * @property {string} functionCode
 */

const fs = require('fs');
const jsdom = require('jsdom');
const {LH_ROOT} = require('../root.js');

const html = fs.readFileSync(LH_ROOT + '/report/assets/templates.html', 'utf-8');
const {window} = new jsdom.JSDOM(html);
const tmplEls = [...window.document.querySelectorAll('template')];
tmplEls.push(createReportStylesTemplateEl());

/**
 * @param {string} str
 */
function upperFirst(str) {
  return str.charAt(0).toUpperCase() + str.substr(1);
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
 * @param {ChildNode} childNode
 * @return {string|undefined}
 */
function normalizeTextNodeText(childNode) {
  // Just for typescript.
  if (!childNode.parentElement) return;
  // Just for typescript. If a text node has no text, it's trivially not significant.
  if (!childNode.textContent) return;

  let textContent = childNode.textContent || '';
  // Consecutive whitespace is redundant, unless in certain elements.
  if (!['PRE', 'STYLE'].includes(childNode.parentElement.tagName)) {
    textContent = textContent.replace(/\s+/g, ' ');
  }

  // Somehow evil newlines get into the text on Windows. Maybe somewhere in jsdom?
  textContent = textContent.replace(/\r\n/g, '\n');

  return textContent;
}

/**
 * @param {HTMLTemplateElement} tmpEl
 * @return {CompiledComponent}
 */
function compileTemplate(tmpEl) {
  const elemToVarNames = new Map();
  const lines = [];

  /**
   * @param {Element} el
   * @return {string}
   */
  function makeOrGetVarName(el) {
    const varName = elemToVarNames.get(el) || ('el' + elemToVarNames.size);
    elemToVarNames.set(el, varName);
    return varName;
  }

  /**
   * @param {Element} el
   */
  function process(el) {
    const isSvg = el.namespaceURI && el.namespaceURI.endsWith('/svg');
    const namespaceURI = isSvg ? el.namespaceURI : '';
    const tagName = el.localName;
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
    const argsSerialzed =
      args.map(arg => arg === undefined ? 'undefined' : JSON.stringify(arg)).join(', ');
    lines.push(`const ${varName} = dom.${createElementFnName}(${argsSerialzed});`);

    if (el.getAttributeNames) {
      for (const attr of el.getAttributeNames() || []) {
        if (attr === 'class') continue;

        lines.push(`${varName}.setAttribute('${attr}', '${el.getAttribute(attr)}');`);
      }
    }

    /** @type {string[]} */
    const childNodesToAppend = [];
    for (const childNode of el.childNodes) {
      if (childNode.nodeType === window.Node.COMMENT_NODE) continue;

      if (childNode.nodeType === window.Node.TEXT_NODE) {
        if (!childNode.parentElement) continue;

        const textContent = normalizeTextNodeText(childNode);
        if (!textContent) continue;

        // Escaped string value for JS.
        childNodesToAppend.push(JSON.stringify(textContent));
        continue;
      }

      if (!(childNode instanceof /** @type {typeof Element} */ (window.Element))) {
        throw new Error(`Expected ${childNode} to be an element`);
      }
      process(childNode);

      const childVarName = elemToVarNames.get(childNode);
      if (childVarName) childNodesToAppend.push(childVarName);
    }

    if (childNodesToAppend.length) {
      lines.push(`${varName}.append(${childNodesToAppend.join(',')});`);
    }
  }

  const fragmentVarName = makeOrGetVarName(tmpEl);
  lines.push(`const ${fragmentVarName} = dom.document().createDocumentFragment();`);

  for (const topLevelEl of tmpEl.content.children) {
    process(topLevelEl);
    lines.push(`${fragmentVarName}.append(${makeOrGetVarName(topLevelEl)});`);
  }

  lines.push(`return ${fragmentVarName};`);

  const componentName = tmpEl.id;
  const functionName = `create${upperFirst(componentName)}Component`;
  const jsdoc = `
/**
 * @param {DOM} dom
 */`;
  const functionCode = jsdoc + '\n' + createFunctionCode(functionName, lines, ['dom']);
  return {tmpEl, componentName, functionName, functionCode};
}

/**
 * @param {CompiledComponent[]} compiledTemplates
 * @return {string}
 */
function makeGenericCreateComponentFunctionCode(compiledTemplates) {
  const lines = [];

  lines.push('switch (componentName) {');
  for (const {componentName, functionName} of compiledTemplates) {
    lines.push(`  case '${componentName}': return ${functionName}(dom);`);
  }
  lines.push('}');
  lines.push('throw new Error(\'unexpected component: \' + componentName)');

  const paramType = compiledTemplates.map(t => `'${t.componentName}'`).join('|');
  const jsdoc = `
/** @typedef {${paramType}} ComponentName */
/**
 * @param {DOM} dom
 * @param {ComponentName} componentName
 * @return {DocumentFragment}
 */`;
  return jsdoc + '\nexport ' +
    createFunctionCode('createComponent', lines, ['dom', 'componentName']);
}

function createReportStylesTemplateEl() {
  const reportStylesTmplEl = window.document.createElement('template');
  reportStylesTmplEl.id = 'styles';
  const reportStyleslEl = window.document.createElement('style');
  reportStyleslEl.textContent = fs.readFileSync(`${LH_ROOT}/report/assets/styles.css`, 'utf-8');
  reportStylesTmplEl.content.append(reportStyleslEl);
  return reportStylesTmplEl;
}

async function main() {
  const compiledTemplates = tmplEls.map(compileTemplate);
  compiledTemplates.sort((a, b) => a.componentName.localeCompare(b.componentName));
  const code = `
    'use strict';

    // auto-generated by build/build-report-components.js

    /** @typedef {import('./dom.js').DOM} DOM */

    /* eslint-disable max-len */

    ${compiledTemplates.map(t => t.functionCode).join('\n')}

    ${makeGenericCreateComponentFunctionCode(compiledTemplates)}
  `.trim();
  fs.writeFileSync(LH_ROOT + '/report/renderer/components.js', code);
}

if (require.main === module) {
  main();
}

module.exports = {normalizeTextNodeText};
