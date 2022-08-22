/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';

import archiver from 'archiver';
import cpy from 'cpy';
import {rollup} from 'rollup';

import * as rollupPlugins from './rollup-plugins.js';
import {LH_ROOT} from '../root.js';
import {readJson} from '../core/test/test-utils.js';

const argv = process.argv.slice(2);
const browserBrand = argv[0];

const sourceName = 'popup.js';
const distName = 'popup-bundle.js';

const sourceDir = `${LH_ROOT}/clients/extension`;
const distDir = `${LH_ROOT}/dist/extension-${browserBrand}`;
const packagePath = `${distDir}/../extension-${browserBrand}-package`;

const manifestVersion = readJson(`${sourceDir}/manifest.json`).version;

/**
 * Bundle and minify entry point.
 */
async function buildEntryPoint() {
  const bundle = await rollup({
    input: `${sourceDir}/scripts/${sourceName}`,
    plugins: [
      rollupPlugins.shim({
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export default {}',
      }),
      rollupPlugins.replace({
        '___BROWSER_BRAND___': browserBrand,
      }),
      rollupPlugins.nodeResolve(),
      rollupPlugins.inlineFs({verbose: false}),
      rollupPlugins.terser(),
    ],
  });

  await bundle.write({
    file: `${distDir}/scripts/${distName}`,
    format: 'iife',
  });
  await bundle.close();
}

function copyAssets() {
  cpy([
    '*.html',
    'styles/**/*.css',
    'images/**/*',
    'manifest.json',
  ], distDir, {
    cwd: sourceDir,
    parents: true,
  });
}

/**
 * Put built extension into a zip file ready for install or upload to the
 * webstore.
 * @return {Promise<void>}
 */
async function packageExtension() {
  await fs.promises.mkdir(packagePath, {recursive: true});

  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: {level: 9},
    });

    const outPath = `${packagePath}/lighthouse-${manifestVersion}.zip`;
    const writeStream = fs.createWriteStream(outPath);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);

    archive.pipe(writeStream);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

async function main() {
  await Promise.all([
    buildEntryPoint(),
    copyAssets(),
  ]);

  await packageExtension();
}

await main();
