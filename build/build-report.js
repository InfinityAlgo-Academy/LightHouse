/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// TODO: where to output?
// standalone: lighthouse-core/report/html/renderer/generated/standalone.js + checking into source seems simplest for publishing.
// esmodules bundle (for devtools/whatever): dist/report.mjs seems good. don't check in cuz dont need it for publishing.

const rollup = require('rollup');
const commonjs =
  // @ts-expect-error types are wrong.
  /** @type {import('rollup-plugin-commonjs').default} */ (require('rollup-plugin-commonjs'));

async function buildStandaloneReport() {
  const bundle = await rollup.rollup({
    input: 'lighthouse-core/report/html/renderer/standalone.js',
    plugins: [
      commonjs(),
    ],
  });

  await bundle.write({
    file: 'lighthouse-core/report/html/renderer/generated/standalone.js',
    format: 'iife',
  });

  // TODO: run thru terser.
}

async function buildEsModulesBundle() {
  const bundle = await rollup.rollup({
    input: 'lighthouse-core/report/html/renderer/common/index.js',
    plugins: [
      commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/report.mjs',
    format: 'esm',
  });
}

buildStandaloneReport();
// TODO buildPsiReport(); ?
buildEsModulesBundle();

module.exports = {
  buildStandaloneReport,
};
