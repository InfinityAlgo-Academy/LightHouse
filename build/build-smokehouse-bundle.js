/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const rollup = require('rollup');

/**
 * Rollup plugins don't export types that work with commonjs.
 * @template T
 * @param {T} module
 * @return {T['default']}
 */
function rollupPluginTypeCoerce(module) {
  // @ts-expect-error
  return module;
}

const nodeResolve = rollupPluginTypeCoerce(require('rollup-plugin-node-resolve'));
const commonjs = rollupPluginTypeCoerce(require('rollup-plugin-commonjs'));
// @ts-expect-error: no types
const shim = require('rollup-plugin-shim');
const {LH_ROOT} = require('../root.js');

const distDir = `${LH_ROOT}/dist`;
const bundleOutFile = `${distDir}/smokehouse-bundle.js`;
const smokehouseLibFilename = './lighthouse-cli/test/smokehouse/frontends/lib.js';
const smokehouseCliFilename =
  require.resolve('../lighthouse-cli/test/smokehouse/lighthouse-runners/cli.js');

async function build() {
  const bundle = await rollup.rollup({
    input: smokehouseLibFilename,
    context: 'globalThis',
    plugins: [
      nodeResolve(),
      commonjs(),
      shim({
        [smokehouseCliFilename]: 'export default {}',
      }),
    ],
  });

  await bundle.write({
    file: bundleOutFile,
    format: 'commonjs',
  });
}

build();
