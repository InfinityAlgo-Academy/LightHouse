/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import path from 'path';

import esbuild from 'esbuild';

import * as plugins from './esbuild-plugins.js';
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
  const result = await esbuild.build({
    entryPoints: ['report/generator/report-generator.js'],
    outfile: 'dist/lightrider/report-generator-bundle.js',
    write: false,
    format: 'iife', // really umd! see plugins.generateUMD
    globalName: 'umdExports',
    bundle: true,
    minify: false,
    plugins: [
      plugins.replaceModules({
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export const flowReportAssets = {}',
      }),
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs,
        plugins.partialLoaders.rmGetModuleDirectory,
      ]),
      plugins.ignoreBuiltins(),
    ],
  });

  const code = plugins.generateUMD(result.outputFiles[0].text, 'ReportGenerator');
  await fs.promises.writeFile(result.outputFiles[0].path, code);
}

async function buildStaticServerBundle() {
  await esbuild.build({
    entryPoints: ['cli/test/fixtures/static-server.js'],
    outfile: 'dist/lightrider/static-server.js',
    format: 'cjs',
    bundle: true,
    minify: false,
    plugins: [
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs,
      ]),
      plugins.ignoreBuiltins(),
      // rollupPlugins.nodeResolve(), // TODO ?
    ],
    external: ['mime-types', 'glob'],
  });
}

await Promise.all([
  buildEntryPoint(),
  buildReportGenerator(),
  buildStaticServerBundle(),
]);
