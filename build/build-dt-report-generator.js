/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const rollup = require('rollup');
const alias = require('@rollup/plugin-alias');
const {terser} = require('rollup-plugin-terser');
// Only needed b/c getFilenamePrefix loads a commonjs module.
const commonjs =
  // @ts-expect-error types are wrong.
  /** @type {import('rollup-plugin-commonjs').default} */ (require('rollup-plugin-commonjs'));
const {LH_ROOT} = require('../root.js');

async function buildReportGenerator() {
  const bundle = await rollup.rollup({
    input: './report/report-generator.js',
    plugins: [
      alias({
        entries: {
          './report-assets.js': require.resolve('../clients/devtools-report-assets.js'),
        },
      }),
      commonjs(),
      // terser(),
    ],
  });

  await bundle.write({
    file: LH_ROOT + '/dist/devtools/report-generator.js',
    format: 'esm',
    // name: 'Lighthouse',
  });
}

async function main() {
  await buildReportGenerator();
}

main();
