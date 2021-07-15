/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const jsdom = require('jsdom');
const {LH_ROOT} = require('../../root.js');
const { serializeArguments } = require('../gather/driver/execution-context.js');

// TODO: should change templates.html to use `div` instead of `template`.
// idea: have paremeters in template?
// fs.readFileSync(LH_ROOT + '/report/assets/templates.html', 'utf-8').replaceAll('template', 'div');
const html = `
<div id="tmpl-lh-metric">
  <div class="lh-metric" id="${'id'}">
    <div class="lh-metric__innerwrap">
      <span class="lh-metric__title"></span>
      <div class="lh-metric__value">hi</div>
      <div class="lh-metric__description"></div>
    </div>
  </div>
</div>

<div id="tmpl-lh-topbar">
<style>
.lh-topbar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  height: var(--topbar-height);
  background-color: var(--topbar-background-color);
  padding: var(--topbar-padding);
}

.lh-topbar__logo {
  width: var(--topbar-logo-size);
  height: var(--topbar-logo-size);
  user-select: none;
  flex: none;
}
.lh-topbar__logo .shape {
  fill: var(--report-text-color);
}

.lh-topbar__url {
  margin: var(--topbar-padding);
  text-decoration: none;
  color: var(--report-text-color);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.lh-tools {
  margin-left: auto;
  will-change: transform;
  min-width: var(--report-icon-size);
}
.lh-tools__button {
  width: var(--report-icon-size);
  height: var(--report-icon-size);
  cursor: pointer;
  margin-right: 5px;
  /* This is actually a button element, but we want to style it like a transparent div. */
  display: flex;
  background: none;
  color: inherit;
  border: none;
  padding: 0;
  font: inherit;
  outline: inherit;
}
.lh-tools__button svg {
  fill: var(--tools-icon-color);
}
.dark .lh-tools__button svg {
  filter: invert(1);
}
.lh-tools__button.active + .lh-tools__dropdown {
  opacity: 1;
  clip: rect(-1px, 194px, 242px, -3px);
  visibility: visible;
}
.lh-tools__dropdown {
  position: absolute;
  background-color: var(--report-background-color);
  border: 1px solid var(--report-border-color);
  border-radius: 3px;
  padding: calc(var(--default-padding) / 2) 0;
  cursor: pointer;
  top: 36px;
  right: 0;
  box-shadow: 1px 1px 3px #ccc;
  min-width: 125px;
  clip: rect(0, 164px, 0, 0);
  visibility: hidden;
  opacity: 0;
  transition: all 200ms cubic-bezier(0,0,0.2,1);
}
.lh-tools__dropdown a {
  color: currentColor;
  text-decoration: none;
  white-space: nowrap;
  padding: 0 12px;
  line-height: 2;
}
.lh-tools__dropdown a:hover,
.lh-tools__dropdown a:focus {
  background-color: var(--color-gray-200);
  outline: none;
}
/* save-gist option hidden in report. */
.lh-tools__dropdown a[data-action='save-gist'] {
  display: none;
}

@media screen and (max-width: 964px) {
  .lh-tools__dropdown {
    right: 0;
    left: initial;
  }
}
@media print {
  .lh-topbar {
    position: static;
    margin-left: 0;
  }

  .lh-tools__dropdown {
    display: none;
  }
}
</style>

  <div class="lh-topbar">
    <!-- Lighthouse logo.  -->
    <svg class="lh-topbar__logo" viewBox="0 0 24 24">
      <defs>
        <linearGradient x1="57.456%" y1="13.086%" x2="18.259%" y2="72.322%" id="lh-topbar__logo--a">
          <stop stop-color="#262626" stop-opacity=".1" offset="0%"/>
          <stop stop-color="#262626" stop-opacity="0" offset="100%"/>
        </linearGradient>
        <linearGradient x1="100%" y1="50%" x2="0%" y2="50%" id="lh-topbar__logo--b">
          <stop stop-color="#262626" stop-opacity=".1" offset="0%"/>
          <stop stop-color="#262626" stop-opacity="0" offset="100%"/>
        </linearGradient>
        <linearGradient x1="58.764%" y1="65.756%" x2="36.939%" y2="50.14%" id="lh-topbar__logo--c">
          <stop stop-color="#262626" stop-opacity=".1" offset="0%"/>
          <stop stop-color="#262626" stop-opacity="0" offset="100%"/>
        </linearGradient>
        <linearGradient x1="41.635%" y1="20.358%" x2="72.863%" y2="85.424%" id="lh-topbar__logo--d">
          <stop stop-color="#FFF" stop-opacity=".1" offset="0%"/>
          <stop stop-color="#FFF" stop-opacity="0" offset="100%"/>
        </linearGradient>
      </defs>
      <g fill="none" fill-rule="evenodd">
        <path d="M12 3l4.125 2.625v3.75H18v2.25h-1.688l1.5 9.375H6.188l1.5-9.375H6v-2.25h1.875V5.648L12 3zm2.201 9.938L9.54 14.633 9 18.028l5.625-2.062-.424-3.028zM12.005 5.67l-1.88 1.207v2.498h3.75V6.86l-1.87-1.19z" fill="#F44B21"/>
        <path fill="#FFF" d="M14.201 12.938L9.54 14.633 9 18.028l5.625-2.062z"/>
        <path d="M6 18c-2.042 0-3.95-.01-5.813 0l1.5-9.375h4.326L6 18z" fill="url(#lh-topbar__logo--a)" fill-rule="nonzero" transform="translate(6 3)"/>
        <path fill="#FFF176" fill-rule="nonzero" d="M13.875 9.375v-2.56l-1.87-1.19-1.88 1.207v2.543z"/>
        <path fill="url(#lh-topbar__logo--b)" fill-rule="nonzero" d="M0 6.375h6v2.25H0z" transform="translate(6 3)"/>
        <path fill="url(#lh-topbar__logo--c)" fill-rule="nonzero" d="M6 6.375H1.875v-3.75L6 0z" transform="translate(6 3)"/>
        <path fill="url(#lh-topbar__logo--d)" fill-rule="nonzero" d="M6 0l4.125 2.625v3.75H12v2.25h-1.688l1.5 9.375H.188l1.5-9.375H0v-2.25h1.875V2.648z" transform="translate(6 3)"/>
      </g>
    </svg>

    <a href="" class="lh-topbar__url" target="_blank" rel="noopener"></a>

    <div class="lh-tools">
      <button id="lh-tools-button" class="lh-tools__button" title="Tools menu" aria-label="Toggle report tools menu" aria-haspopup="menu" aria-expanded="false" aria-controls="lh-tools-dropdown">
        <svg width="100%" height="100%" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0z" fill="none"/>
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>
      <div id="lh-tools-dropdown" role="menu" class="lh-tools__dropdown" aria-labelledby="lh-tools-button">
        <a role="menuitem" tabindex="-1" href="#" class="report-icon report-icon--print" data-i18n="dropdownPrintSummary" data-action="print-summary"></a>
        <a role="menuitem" tabindex="-1" href="#" class="report-icon report-icon--print" data-i18n="dropdownPrintExpanded" data-action="print-expanded"></a>
        <a role="menuitem" tabindex="-1" href="#" class="report-icon report-icon--copy" data-i18n="dropdownCopyJSON" data-action="copy"></a>
        <a role="menuitem" tabindex="-1" href="#" class="report-icon report-icon--download" data-i18n="dropdownSaveHTML" data-action="save-html"></a>
        <a role="menuitem" tabindex="-1" href="#" class="report-icon report-icon--download" data-i18n="dropdownSaveJSON" data-action="save-json"></a>
        <a role="menuitem" tabindex="-1" href="#" class="report-icon report-icon--open" data-i18n="dropdownViewer" data-action="open-viewer"></a>
        <a role="menuitem" tabindex="-1" href="#" class="report-icon report-icon--open" data-i18n="dropdownSaveGist" data-action="save-gist"></a>
        <a role="menuitem" tabindex="-1" href="#" class="report-icon report-icon--dark" data-i18n="dropdownDarkTheme" data-action="toggle-dark"></a>
      </div>
    </div>
  </div>
</div>
`;

const {window} = new jsdom.JSDOM(html);

const tmplEls = window.document.querySelectorAll('body > div');

/**
 * @param {HTMLElement} tmpEl
 */
function compileTemplate(tmpEl) {
  const map = new Map();
  const lines = [];

  /**
   * @param {HTMLElement} el
   */
  function makeOrGetVarName(el) {
    const varName = map.get(el) || ('el' + map.size);
    map.set(el, varName);
    return varName;
  }

  /**
   * @param {HTMLElement} el
   */
  function process(el) {
    if (el.nodeType === window.Node.COMMENT_NODE) return;

    if (el.nodeType === window.Node.TEXT_NODE) {
      if (el.textContent && el.textContent.trim()) {
        const varName = makeOrGetVarName(el);
        lines.push(
          `const ${varName} = document.createTextNode(${JSON.stringify(el.textContent)});`);
      }

      return;
    }

    const args = [el.tagName];
    const isSvg = el.namespaceURI && el.namespaceURI.endsWith('/svg');
    const namespaceURI = isSvg ? el.namespaceURI : '';
    if (namespaceURI || el.className) args.push(namespaceURI || '', el.className);

    const varName = makeOrGetVarName(el);
    lines.push(`const ${varName} = dom.createElement(${serializeArguments(args)});`);

    if (el.getAttributeNames) {
      for (const attr of el.getAttributeNames() || []) {
        if (attr === 'class') continue;
        lines.push(`${varName}.setAttribute('${attr}', '${el.getAttribute(attr)}');`);
      }
    }

    for (const childEl of el.childNodes) {
      process(childEl);
      const childVarName = map.get(childEl);
      if (childVarName) lines.push(`${varName}.append(${childVarName});`);
    }
  }

  process(tmpEl);
  lines.push('return el0;');

  const componentName = tmpEl.id.replace('tmpl-lh-', '');
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
