/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const {inlineFs} = require('./inline-fs.js');
const {LH_ROOT} = require('../../root.js');

/** @typedef {import('rollup').Plugin} RollupPlugin */

/** @type {RollupPlugin} */
const inlineFsPlugin = {
  name: 'inline-fs',

  /**
   * @param {string} code
   * @param {string} filepath
   * @return {Promise<string|null>}
   */
  async transform(originalCode, filepath) {
    // TODO(bckenny): add source maps.
    const {code, warnings} = await inlineFs(originalCode, filepath);

    // TODO(bckenny): only log warnings on verbose.
    if (warnings?.length) {
      console.log(`warnings for ${path.relative(LH_ROOT, filepath)}`);
      for (const warning of warnings) {
        console.log(`  ${warning.text}`);
      }
    }

    return code;
  },
};

module.exports = inlineFsPlugin;
