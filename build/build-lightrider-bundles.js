/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import path from 'path';

import {rollup} from 'rollup';

import * as rollupPlugins from './rollup-plugins.js';
import {buildBundle} from './build-bundle.js';
import {LH_ROOT} from '../root.js';

const distDir = path.join(LH_ROOT, 'dist', 'lightrider');
const sourceDir = path.join(LH_ROOT, 'clients', 'lightrider');

const entrySourceName = 'lightrider-entry.js';
const entryDistName = 'lighthouse-lr-bundle.js';

fs.mkdirSync(distDir, {recursive: true});

function buildEntryPoint() {
  const inFile = `${sourceDir}/${entrySourceName}`;
  const outFile = `${distDir}/${entryDistName}`;
  return buildBundle(inFile, outFile, {minify: false});
}

async function buildReportGenerator() {
  const bundle = await rollup({
    input: 'report/generator/report-generator.js',
    plugins: [
      rollupPlugins.shim({
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export default {}',
      }),
      rollupPlugins.commonjs(),
      rollupPlugins.inlineFs({verbose: Boolean(process.env.DEBUG)}),
    ],
  });

  await bundle.write({
    file: 'dist/lightrider/report-generator-bundle.js',
    format: 'iife',
    name: 'ReportGenerator',
  });
  await bundle.close();

  // Typically one would use `umd` to export to the window object, but for some reason rollup
  // adds a `require('fs')` when used above, which errors in google3 build.
  const outPath = `${LH_ROOT}/dist/lightrider/report-generator-bundle.js`;
  fs.writeFileSync(outPath,
    fs.readFileSync(outPath, 'utf-8') + '\nwindow.ReportGenerator = ReportGenerator;\n');
}

async function buildStaticServerBundle() {
  const bundle = await rollup({
    input: 'lighthouse-cli/test/fixtures/static-server.js',
    plugins: [
      rollupPlugins.shim({
        'es-main': 'export default function() { return false; }',
      }),
      rollupPlugins.commonjs(),
      rollupPlugins.nodeResolve(),
    ],
    external: ['mime-types', 'glob'],
  });

  await bundle.write({
    file: 'dist/lightrider/static-server.js',
    format: 'commonjs',
  });
  await bundle.close();
}

async function run() {
  await Promise.all([
    buildEntryPoint(),
    buildReportGenerator(),
    buildStaticServerBundle(),
  ]);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
