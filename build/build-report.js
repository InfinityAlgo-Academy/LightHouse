/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const rollup = require('rollup');
const rollupPlugins = require('./rollup-plugins.js');

async function buildStandaloneReport() {
  const bundle = await rollup.rollup({
    input: 'report/clients/standalone.js',
    plugins: [
      rollupPlugins.commonjs(),
      rollupPlugins.terser(),
    ],
  });

  await bundle.write({
    file: 'dist/report/standalone.js',
    format: 'iife',
  });
}

async function buildFlowReport() {
  const bundle = await rollup.rollup({
    input: 'flow-report/standalone-flow.tsx',
    plugins: [
      rollupPlugins.nodeResolve(),
      rollupPlugins.commonjs(),
      rollupPlugins.typescript({
        tsconfig: 'flow-report/tsconfig.json',
        // Plugin struggles with custom outDir, so revert it from tsconfig value
        // as well as any options that require an outDir is set.
        outDir: null,
        composite: false,
        emitDeclarationOnly: false,
        declarationMap: false,
      }),
      rollupPlugins.terser(),
    ],
  });

  await bundle.write({
    file: 'dist/report/flow.js',
    format: 'iife',
  });
}

async function buildPsiReport() {
  const bundle = await rollup.rollup({
    input: 'report/clients/psi.js',
    plugins: [
      rollupPlugins.commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/report/psi.js',
    format: 'esm',
  });
}

async function buildEsModulesBundle() {
  const bundle = await rollup.rollup({
    input: 'report/clients/bundle.js',
    plugins: [
      rollupPlugins.commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/report/bundle.esm.js',
    format: 'esm',
  });
}

async function buildUmdBundle() {
  const bundle = await rollup.rollup({
    input: 'report/clients/bundle.js',
    plugins: [
      rollupPlugins.commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/report/bundle.umd.js',
    format: 'umd',
    name: 'report',
  });
}

if (require.main === module) {
  if (process.argv.length <= 2) {
    buildStandaloneReport();
    buildFlowReport();
    buildEsModulesBundle();
    buildPsiReport();
    buildUmdBundle();
  }

  if (process.argv.includes('--psi')) {
    buildPsiReport();
  }
  if (process.argv.includes('--standalone')) {
    buildStandaloneReport();
  }
  if (process.argv.includes('--flow')) {
    buildFlowReport();
  }
  if (process.argv.includes('--esm')) {
    buildEsModulesBundle();
  }
  if (process.argv.includes('--umd')) {
    buildUmdBundle();
  }
}

module.exports = {
  buildStandaloneReport,
  buildFlowReport,
  buildPsiReport,
  buildUmdBundle,
};
