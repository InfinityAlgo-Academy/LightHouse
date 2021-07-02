/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const resolve = require('resolve');
const MagicString = require('magic-string').default;

/* eslint-disable max-len */

/** @typedef {import('acorn').Node} Node */
/** @typedef {import('esbuild').PluginBuild} PluginBuild */

/**
 * Collapse tree using supported transforms until only a string literal is
 * returned (or an error for non-supported nodes is thrown).
 * @param {Node} node ESTree node.
 * @param {string} contextPath The path of the file containing this node.
 * @return {string}
 */
function collapseToStringLiteral(node, contextPath) {
  switch (node.type) {
    case 'Literal': {
      // If your literal wasn't a string, sorry, you're getting a string.
      return String(node.value);
    }

    case 'Identifier': {
      if (node.name === '__dirname') {
        return path.dirname(contextPath);
      } else if (node.name === '__filename') {
        return contextPath;
      }
      throw new Error(`unsupported identifier '${node.name}'`);
    }

    case 'CallExpression': {
      assert.equal(node.callee.type, 'MemberExpression');
      const requireResolveMsg = 'Only require.resolve() calls are supported within fs function calls';
      assert.equal(node.callee.object.name, 'require', requireResolveMsg);
      assert.equal(node.callee.property.name, 'resolve', requireResolveMsg);

      assert.equal(node.arguments.length, 1, 'only single-argument `require.resolve` call is supported');
      const argument = collapseToStringLiteral(node.arguments[0], contextPath);
      return resolve.sync(argument, {basedir: path.dirname(contextPath)});
    }

    case 'BinaryExpression': {
      assert.equal(node.operator, '+', 'only string `+` operators supported');
      const left = collapseToStringLiteral(node.left, contextPath);
      const right = collapseToStringLiteral(node.right, contextPath);
      return left + right;
    }

    case 'TemplateLiteral': {
      assert.equal(node.expressions.length + 1, node.quasis.length);
      // Parts alternate between quasis and expressions, starting and ending with a quasi.
      const parts = [];
      for (let i = 0; i < node.expressions.length; i++) {
        parts.push(collapseToStringLiteral(node.quasis[i], contextPath));
        parts.push(collapseToStringLiteral(node.expressions[i], contextPath));
      }
      parts.push(collapseToStringLiteral(node.quasis[node.quasis.length - 1], contextPath));
      return parts.join('');
    }

    case 'TemplateElement': {
      return node.value.cooked;
    }
  }

  throw new Error(`unsupported node: ${node.type}`);
}

/**
 * Returns whether the options object/string specifies the allowed utf8/utf-8
 * encoding.
 * @param {Node} node ESTree node.
 * @return {boolean}
 */
function isUtf8Options(node) {
  // Node allows 'utf-8' as an alias for 'utf8'.
  if (node.type === 'Literal') {
    return node.value === 'utf8' || node.value === 'utf-8';
  } else if (options.type === 'ObjectExpression') {
    // Matches type `{encoding: 'utf8'|'utf-8'}`.
    return node.properties.some(prop => {
      return prop.key.name === 'encoding' &&
      (prop.value.value === 'utf8' || prop.value.value === 'utf-8');
    });
  }
  return false;
}

/**
 * Replaces instances of `fs.readFileSync()` with an inlined version of the read
 * file. Returns `null` if `fs.readFileSync` was not found in the code.
 * @param {string} code
 * @param {string} contextPath
 * @return {Promise<string|null>}
 */
async function replaceReadFileSync(code, contextPath) {
  // Return null for not applicable files with as little work as possible.
  let foundIndex = code.indexOf('fs.readFileSync');
  if (foundIndex === -1) return null;

  const s = new MagicString(code);

  // Can iterate forwards in string because MagicString always uses original indices.
  while (foundIndex !== -1) {
    const parsed = acorn.parseExpressionAt(code, foundIndex, {ecmaVersion: 'latest'});
    assert.equal(parsed.type, 'CallExpression');
    assert.equal(parsed.callee.type, 'MemberExpression');
    assert.equal(parsed.callee.object.name, 'fs');
    assert.equal(parsed.callee.property.name, 'readFileSync');

    assert.equal(parsed.arguments.length, 2, 'fs.readFileSync() must have two arguments');
    const constructedPath = collapseToStringLiteral(parsed.arguments[0], contextPath);
    assert.equal(isUtf8Options(parsed.arguments[1]), true, 'only utf8 readFileSync is supported');

    const readContent = await fs.promises.readFile(constructedPath, 'utf8');
    // Escape quotes, new lines, etc so inlined string doesn't break host file.
    const escapedContent = JSON.stringify(readContent);

    // TODO(bckenny): can use options to customize `storeName` for source maps.
    s.overwrite(parsed.start, parsed.end, escapedContent);

    foundIndex = code.indexOf('fs.readFileSync', foundIndex + 1);
  }

  return s.toString();
}

const inlineFs = {
  name: 'inline-fs',
  /** @param {PluginBuild} build */
  setup(build) {
    build.onLoad({filter: /.*/, namespace: 'file'}, async args => {
      const rawContents = await fs.promises.readFile(args.path, 'utf8');

      // TODO(bckenny): turn try/catch into warnings.
      // const contents = await replaceReadFileSync(rawContents, args.path);
      let contents;
      try {
        contents = await replaceReadFileSync(rawContents, args.path);
      } catch (e) {
        return;
      }

      if (contents === null) return;
      return {contents};
    });
  },
};

module.exports = {
  collapseToStringLiteral,
  replaceReadFileSync,
  inlineFs,
};
