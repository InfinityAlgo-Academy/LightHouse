/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import module from 'module';
import url from 'url';
import path from 'path';

/**
 * Commonjs equivalent of `require.resolve`.
 * @param {string} packageName
 */
function resolveModulePath(packageName) {
  const require = module.createRequire(import.meta.url);
  return require.resolve(packageName);
}

/**
 * @param {ImportMeta} importMeta
 */
function createCommonjsRefs(importMeta) {
  // `build-bundle.js` converts this variable to true. `module.createRequire` cannot be
  // made to work in a browser context. The only usage of this function in a module that is
  // bundled is in `config-helpers.js`, but that is already guarded behind a check for
  // a bundled environment. All other usages are from tests.
  const isBundled = false;
  const require = isBundled ?
    // @ts-expect-error
    /** @type {NodeRequire} */ (undefined) :
    module.createRequire(importMeta.url);
  const filename = url.fileURLToPath(importMeta.url);
  const dirname = path.dirname(filename);
  return {require, __filename: filename, __dirname: dirname};
}

/**
 * @param {ImportMeta} importMeta
 */
function getModuleDirectory(importMeta) {
  const filename = url.fileURLToPath(importMeta.url);
  return path.dirname(filename);
}

/**
 * @param {ImportMeta} importMeta
 */
function getModuleName(importMeta) {
  return url.fileURLToPath(importMeta.url);
}

export {
  resolveModulePath,
  createCommonjsRefs,
  getModuleDirectory,
  getModuleName,
};
