/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* eslint-disable no-console */

import fs from 'fs';

import ts from 'typescript';

import {LH_ROOT} from '../root.js';

/**
 * @typedef Modification
 * @property {string} input
 * @property {string} output
 * @property {string} template
 * @property {Record<string, string>} rawCodeToReplace Complicated expressions are hard detect with the TS lib, so instead use this to work with the raw code.
 * @property {string[]} classesToRemove
 * @property {string[]} methodsToRemove
 * @property {string[]} variablesToRemove
 */

const outDir = `${LH_ROOT}/core/lib/cdt/generated`;

/** @type {Modification[]} */
const modifications = [
  {
    input: 'node_modules/chrome-devtools-frontend/front_end/core/sdk/SourceMap.ts',
    output: `${outDir}/SourceMap.js`,
    template: [
      'const Common = require(\'../Common.js\');',
      'const Platform = require(\'../Platform.js\');',
      '%sourceFilePrinted%',
      'module.exports = TextSourceMap;',
    ].join('\n'),
    rawCodeToReplace: {
      /* Original:

        let url = Common.ParsedURL.ParsedURL.completeURL(this.#baseURL, href) || href;
        const source = sourceMap.sourcesContent && sourceMap.sourcesContent[i];
        if (url === this.#compiledURLInternal && source) {
          url = Common.ParsedURL.ParsedURL.concatenate(url, '? [sm]');
        }
        if (this.#sourceInfos.has(url)) {
          continue;
        }
        this.#sourceInfos.set(url, new TextSourceMap.SourceInfo(source || null, null));
        sourcesList.push(url);
      ----
      If a source file is the same as the compiled url and there is a sourcesContent,
      then `entry.sourceURL` (what is returned from .mappings) will have `? [sm]` appended.
      This is useful in DevTools - to show that a sources panel tab not a real network resource -
      but for us it is not wanted. The sizing function uses `entry.sourceURL` to index the byte
      counts, and is further used in the details to specify a file within a source map.
      */
      [`url = Common.ParsedURL.ParsedURL.concatenate(url, '? [sm]');`]: '',
      // Use normal console.warn so we don't need to import CDT's logger.
      'Common.Console.Console.instance().warn': 'console.warn',
      // Similar to the reason for removing `url += Common.UIString('? [sm]')`.
      // The entries in `.mappings` should not have their url property modified.
      'Common.ParsedURL.ParsedURL.completeURL(this.#baseURL, href)': `''`,
      // Replace i18n function with a very simple templating function.
      'i18n.i18n.getLocalizedString.bind(undefined, str_)': (
        /** @param {string} template @param {object} vars */
        function(template, vars) {
          let result = template;
          for (const [key, value] of Object.entries(vars)) {
            result = result.replace(new RegExp('{' + key + '}'), value);
          }
          return result;
        }).toString(),
      // Add some types.
      // eslint-disable-next-line max-len
      'mappings(): SourceMapEntry[] {': '/** @return {Array<{lineNumber: number, columnNumber: number, sourceURL?: string, sourceLineNumber: number, sourceColumnNumber: number, name?: string, lastColumnNumber?: number}>} */\nmappings(): SourceMapEntry[] {',
    },
    classesToRemove: [],
    methodsToRemove: [
      // Not needed.
      'load',
      // Not needed.
      'sourceContentProvider',
    ],
    variablesToRemove: [
      'Common',
      'CompilerSourceMappingContentProvider_js_1',
      'i18n',
      'i18nString',
      'PageResourceLoader_js_1',
      'Platform',
      'str_',
      'TextUtils',
      'UIStrings',
    ],
  },
  {
    input: 'node_modules/chrome-devtools-frontend/front_end/core/common/ParsedURL.ts',
    output: `${outDir}/ParsedURL.js`,
    template: '%sourceFilePrinted%',
    rawCodeToReplace: {},
    classesToRemove: [],
    methodsToRemove: [
      // TODO: look into removing the `Common.ParsedURL.ParsedURL.completeURL` replacement above,
      // which will also mean including all/most of these methods.
      'completeURL',
      'dataURLDisplayName',
      'domain',
      'encodedFromParentPathAndName',
      'encodedPathToRawPathString',
      'extractExtension',
      'extractName',
      'extractOrigin',
      'extractPath',
      'fromString',
      'isAboutBlank',
      'isBlobURL',
      'isDataURL',
      'isHttpOrHttps',
      'isValidUrlString',
      'join',
      'lastPathComponentWithFragment',
      'preEncodeSpecialCharactersInPath',
      'prepend',
      'rawPathToEncodedPathString',
      'rawPathToUrlString',
      'relativePathToUrlString',
      'removeWasmFunctionInfoFromURL',
      'securityOrigin',
      'slice',
      'sliceUrlToEncodedPathString',
      'split',
      'splitLineAndColumn',
      'substr',
      'substring',
      'toLowerCase',
      'trim',
      'urlFromParentUrlAndName',
      'urlRegex',
      'urlRegexInstance',
      'urlToRawPathString',
      'urlWithoutHash',
      'urlWithoutScheme',
    ],
    variablesToRemove: [
      'Platform',
    ],
  },
];

/**
 * @param {string} code
 * @param {string[]} codeFragments
 */
function assertPresence(code, codeFragments) {
  for (const codeFragment of codeFragments) {
    if (!code.includes(codeFragment)) {
      throw new Error(`did not find expected code fragment: ${codeFragment}`);
    }
  }
}

/**
 * @param {Modification} modification
 */
function doModification(modification) {
  const {rawCodeToReplace, classesToRemove, methodsToRemove, variablesToRemove} = modification;

  const code = fs.readFileSync(modification.input, 'utf-8');
  assertPresence(code, Object.keys(rawCodeToReplace));

  // First pass - do raw string replacements.
  let modifiedCode = code;
  for (const [code, replacement] of Object.entries(rawCodeToReplace)) {
    modifiedCode = modifiedCode.replace(code, replacement);
  }

  const codeTranspiledToCommonJS = ts.transpileModule(modifiedCode, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText.replace(`"use strict";`, '');

  const sourceFile = ts.createSourceFile('', codeTranspiledToCommonJS,
    ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const simplePrinter = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});

  // Second pass - use tsc to remove all references to certain variables.
  assertPresence(codeTranspiledToCommonJS, [
    ...classesToRemove,
    ...methodsToRemove,
    ...variablesToRemove,
  ]);

  const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed}, {
    substituteNode(hint, node) {
      let removeNode = false;

      if (ts.isMethodDeclaration(node) &&
          // Make typescript happy.
          !ts.isComputedPropertyName(node.name) &&
          methodsToRemove.includes(node.name.text)) {
        removeNode = true;
      }

      if (ts.isClassDeclaration(node) && node.name && classesToRemove.includes(node.name.text)) {
        removeNode = true;
      }

      if (ts.isExpressionStatement(node)) {
        const asString = simplePrinter.printNode(ts.EmitHint.Unspecified, node, sourceFile);
        if (classesToRemove.some(className => asString.includes(className))) {
          removeNode = true;
        }
      }

      if (ts.isVariableDeclarationList(node) && node.declarations.length === 1) {
        // @ts-expect-error: is read-only, but whatever.
        node.declarations =
          node.declarations.filter(d => !variablesToRemove.includes(d.name.getText()));
        if (node.declarations.length === 0) removeNode = true;
      }

      if (removeNode) {
        return ts.createNode(ts.SyntaxKind.Unknown);
      }

      return node;
    },
  });

  let sourceFilePrinted = '';
  sourceFile.forEachChild(node => {
    sourceFilePrinted += printer.printNode(ts.EmitHint.Unspecified, node, sourceFile) + '\n';
  });

  const modifiedFile = [
    '// @ts-nocheck\n',
    '// generated by yarn build-cdt-lib\n',
    '/* eslint-disable */\n',
    '"use strict";\n',
    modification.template.replace('%sourceFilePrinted%', () => sourceFilePrinted),
  ].join('');

  fs.writeFileSync(modification.output, modifiedFile);
}

modifications.forEach(doModification);
