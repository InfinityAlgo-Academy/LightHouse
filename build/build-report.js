/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const rollup = require('rollup');
const {terser} = require('rollup-plugin-terser');
// Only needed b/c getFilenamePrefix loads a commonjs module.
const commonjs =
  // @ts-expect-error types are wrong.
  /** @type {import('rollup-plugin-commonjs').default} */ (require('rollup-plugin-commonjs'));

async function buildStandaloneReport() {
  const bundle = await rollup.rollup({
    input: 'report/clients/standalone.js',
    plugins: [
      commonjs(),
      terser(),
    ],
  });

  await bundle.write({
    file: 'dist/report/standalone.js',
    format: 'iife',
  });
  console.log('dist/report/standalone.js written');
}

async function buildPsiReport() {
  const bundle = await rollup.rollup({
    input: 'report/clients/psi.js',
    plugins: [
      commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/report/psi.js',
    format: 'esm',
  });
  console.log('dist/report/psi.js written');
}

async function buildViewerReport() {
  const bundle = await rollup.rollup({
    input: 'report/clients/viewer.js',
    plugins: [
      commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/report/viewer.js',
    format: 'iife',
  });
  console.log('dist/report/viewer.js written');
}

async function buildTreemapReport() {
  const bundle = await rollup.rollup({
    input: 'report/clients/treemap.js',
    plugins: [
      commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/report/treemap.js',
    format: 'iife',
  });
  console.log('dist/report/treemap.js written');
}

async function buildEsModulesBundle() {
  const bundle = await rollup.rollup({
    input: 'report/clients/bundle.js',
    plugins: [
      commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/report/bundle.js',
    format: 'esm',
  });
  console.log('dist/report/bundle.js written');
}

if (require.main === module) {
  if (process.argv.includes('--also-psi')) {
    buildPsiReport();
  }

  if (process.argv.includes('--only-standalone')) {
    buildStandaloneReport();
  } else {
    buildStandaloneReport();
    buildEsModulesBundle();
  }
}

module.exports = {
  buildStandaloneReport,
  buildPsiReport,
  buildViewerReport,
  buildTreemapReport,
};
