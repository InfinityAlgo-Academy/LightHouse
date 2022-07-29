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
      rollupPlugins.inlineFs({verbose: Boolean(process.env.DEBUG)}),
      rollupPlugins.shim({
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export default {}',
        'fs': 'export default {}',
      }),
      rollupPlugins.commonjs(),
    ],
  });

  await bundle.write({
    file: 'dist/lightrider/report-generator-bundle.js',
    format: 'umd',
    name: 'ReportGenerator',
  });
  await bundle.close();
}

async function buildStaticServerBundle() {
  const bundle = await rollup({
    input: 'cli/test/fixtures/static-server.js',
    plugins: [
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

await Promise.all([
  buildEntryPoint(),
  buildReportGenerator(),
  buildStaticServerBundle(),
]);
