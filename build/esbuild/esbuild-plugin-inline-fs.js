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
 * Attempts to statically determine the target of a `fs.readFileSync()` call and
 * returns the already-quoted contents of the file to be loaded.
 * @param {Node} node ESTree node for `fs.readFileSync` call.
 * @param {string} contextPath
 * @return {Promise<string>}
 */
async function getReadFileReplacement(node, contextPath) {
  assert.equal(node.callee.property.name, 'readFileSync');

  assert.equal(node.arguments.length, 2, 'fs.readFileSync() must have two arguments');
  const constructedPath = collapseToStringLiteral(node.arguments[0], contextPath);
  assert.equal(isUtf8Options(node.arguments[1]), true, 'only utf8 readFileSync is supported');

  const readContent = await fs.promises.readFile(constructedPath, 'utf8');

  // Escape quotes, new lines, etc so inlined string doesn't break host file.
  return JSON.stringify(readContent);
}

/**
 * Attempts to statically determine the target of a `fs.readdirSync()` call and
 * returns a JSON.stringified array with the contents of the target directory.
 * @param {Node} node ESTree node for `fs.readdirSync` call.
 * @param {string} contextPath
 * @return {Promise<string>}
 */
async function getReaddirReplacement(node, contextPath) {
  assert.equal(node.callee.property.name, 'readdirSync');

  // If there's no second argument, fs.readdirSync defaults to 'utf8'.
  if (node.arguments.length === 2) {
    assert.equal(isUtf8Options(node.arguments[1]), true, 'only utf8 readdirSync is supported');
  }

  const constructedPath = collapseToStringLiteral(node.arguments[0], contextPath);
  const contents = await fs.promises.readdir(constructedPath, 'utf8');

  return JSON.stringify(contents);
}

/**
 * Inlines the values of selected `fs` methods if their targets can be
 * statically determined. Currently `readFileSync` and `readdirSync` are
 * supported.
 * @param {string} code
 * @param {string} contextPath
 * @return {Promise<string|null>}
 */
async function replaceFsMethods(code, contextPath) {
  // Return null for not-applicable files with as little work as possible.
  const fsSearch = /fs\.(?:readFileSync|readdirSync)/g;
  let found = fsSearch.exec(code);

  if (found === null) return null;

  const output = new MagicString(code);

  // Can iterate forwards in string because MagicString always uses original indices.
  while (found !== null) {
    const parsed = acorn.parseExpressionAt(code, found.index, {ecmaVersion: 'latest'});
    assert.equal(parsed.type, 'CallExpression');
    assert.equal(parsed.callee.type, 'MemberExpression');
    assert.equal(parsed.callee.object.name, 'fs');

    let content;
    if (parsed.callee.property.name === 'readFileSync') {
      content = await getReadFileReplacement(parsed, contextPath);
    } else if (parsed.callee.property.name === 'readdirSync') {
      content = await getReaddirReplacement(parsed, contextPath);
    } else {
      throw new Error(`unexpected fs call 'fs.${parsed.callee.property.name}'`);
    }

    // TODO(bckenny): use options to customize `storeName` for source maps.
    output.overwrite(parsed.start, parsed.end, content);

    found = fsSearch.exec(code);
  }

  return output.toString();
}

const inlineFs = {
  name: 'inline-fs',
  /** @param {PluginBuild} build */
  setup(build) {
    build.onLoad({filter: /.*/, namespace: 'file'}, async args => {
      const rawContents = await fs.promises.readFile(args.path, 'utf8');

      // TODO(bckenny): turn try/catch into warnings.
      // const contents = await replaceFsMethods(rawContents, args.path);
      let contents;
      try {
        contents = await replaceFsMethods(rawContents, args.path);
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
  replaceFsMethods,
  inlineFs,
};
