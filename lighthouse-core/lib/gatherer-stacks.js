/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Gathers a list of detected JS libraries and their versions.
 */

/* global window */
/* global d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests */

'use strict';

const fs = require('fs');
const libDetectorSource = fs.readFileSync(
  require.resolve('js-library-detector/library/libraries.js'),
  'utf8'
);

/**
 * @typedef JSLibrary
 * @property {string} name
 * @property {string} version
 * @property {string} npm
 * @property {string} iconName
 */

/**
 * Obtains a list of detected JS libraries and their versions.
 */
/* istanbul ignore next */
function detectLibraries() {
  /** @type {JSLibrary[]} */
  const libraries = [];

  // d41d8cd98f00b204e9800998ecf8427e_ is a consistent prefix used by the detect libraries
  // see https://github.com/HTTPArchive/httparchive/issues/77#issuecomment-291320900
  // @ts-ignore - injected libDetectorSource var
  Object.entries(d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests).forEach(
    async ([name, lib]) => {
      // eslint-disable-line max-len
      try {
        const result = await lib.test(window);
        if (result) {
          libraries.push({
            name: name,
            version: result.version,
            npm: lib.npm,
            iconName: lib.icon,
          });
        }
      } catch (e) {}
    }
  );

  return libraries;
}

/**
 * @param {LH.Gatherer.PassContext} passContext
 * @return {Promise<LH.Artifacts['Stacks']>}
 */
async function getStacks(passContext) {
  const expression = `(function () {
    ${libDetectorSource};
    return (${detectLibraries.toString()}());
  })()`;

  const jsLibraries = /** @type {JSLibrary[]} */ (await passContext.driver.evaluateAsync(
    expression
  ));

  return jsLibraries.map(lib => ({
    detector: /** @type {'js'} */ ('js'),
    id: lib.npm || lib.iconName,
    name: lib.name,
    version: lib.version,
    npm: lib.npm,
  }));
}

module.exports = getStacks;
