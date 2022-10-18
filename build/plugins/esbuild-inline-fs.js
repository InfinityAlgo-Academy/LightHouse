/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

// eslint-disable-next-line no-unused-vars
import esbuild from 'esbuild';

import {inlineFs} from './inline-fs.js';

/**
 * @typedef PartialLoader
 * @property {string} name
 * @property {(code: string, args: esbuild.OnLoadArgs) => Promise<{code: string, warnings?: esbuild.PartialMessage[]}>} onLoad
 */

/**
 * @typedef InlineFsPluginOptions
 * @property {boolean} [verbose] If true, turns on verbose logging, e.g. log instances where fs methods could not be inlined.
 * @property {string[]} [ignorePaths] Absoulte paths of files to not process for inlining.
 */

/**
 * @param {InlineFsPluginOptions} options
 * @return {PartialLoader}
 */
const inlineFsPlugin = (options) => ({
  name: 'inline-fs',
  async onLoad(inputCode, args) {
    if (options.ignorePaths?.includes(args.path)) {
      return {code: inputCode}; // TODO
    }

    // TODO(bckenny): add source maps, watch files.
    const {code, warnings} = await inlineFs(inputCode, args.path);
    return {
      code: code ?? inputCode,
      warnings: options.verbose ? warnings : [],
    };
  },
});

export {inlineFsPlugin};
