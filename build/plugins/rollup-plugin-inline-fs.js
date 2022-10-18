/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import path from 'path';

import {inlineFs} from './inline-fs.js';
import {LH_ROOT} from '../../root.js';

/** @typedef {import('rollup').Plugin} RollupPlugin */

/**
 * @typedef Options
 * @property {boolean} [verbose] If true, turns on verbose logging, e.g. log instances where fs methods could not be inlined.
 * @property {string[]} [ignorePaths] Absoulte paths of files to not process for inlining.
 */

/**
 * An inline-fs plugin for rollup.
 * @see {@link inlineFs inline-fs}
 * @param {Options} [options]
 * @return {RollupPlugin}
 */
function rollupInlineFs(options = {}) {
  return {
    name: 'inline-fs',

    /**
     * @param {string} originalCode
     * @param {string} filepath
     * @return {Promise<import('rollup').TransformResult>}
     */
    async transform(originalCode, filepath) {
      if (options.ignorePaths?.includes(filepath)) {
        return;
      }

      // TODO(bckenny): add source maps, watch files.
      const {code, warnings} = await inlineFs(originalCode, filepath);

      if (options.verbose && warnings.length) {
        console.log(`warnings for ${path.relative(LH_ROOT, filepath)}`);
        for (const warning of warnings) {
          const {line, column} = warning.location;
          console.log(`  ${warning.text} (${line}:${column})`);
        }
      }

      return code;
    },
  };
}

export default rollupInlineFs;
