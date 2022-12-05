/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createRequire} from 'module';

import {rollup} from 'rollup';

import * as rollupPlugins from './rollup-plugins.js';
import {GhPagesApp} from './gh-pages-app.js';
import {LH_ROOT} from '../root.js';

const require = createRequire(import.meta.url);

async function buildReportGenerator() {
  const bundle = await rollup({
    input: 'report/generator/report-generator.js',
    plugins: [
      rollupPlugins.shim({
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export const flowReportAssets = {}',
      }),
      rollupPlugins.nodeResolve(),
      rollupPlugins.removeModuleDirCalls(),
      rollupPlugins.inlineFs({verbose: Boolean(process.env.DEBUG)}),
    ],
  });

  const result = await bundle.generate({
    format: 'umd',
    name: 'ReportGenerator',
  });
  await bundle.close();
  return result.output[0].code;
}

/**
 * Build viewer, optionally deploying to gh-pages if `--deploy` flag was set.
 */
async function main() {
  const reportGeneratorJs = await buildReportGenerator();

  const app = new GhPagesApp({
    name: 'viewer',
    appDir: `${LH_ROOT}/viewer/app`,
    html: {path: 'index.html'},
    stylesheets: [
      {path: 'styles/*'},
      {path: '../../flow-report/assets/styles.css'},
    ],
    javascripts: [
      reportGeneratorJs,
      // TODO: https://github.com/GoogleChrome/lighthouse/pull/13429
      'window.ReportGenerator = window.ReportGenerator.ReportGenerator',
      {path: require.resolve('pako/dist/pako_inflate.js')},
      {path: 'src/main.js', rollup: true, rollupPlugins: [
        rollupPlugins.replace({
          delimiters: ['', ''],
          values: {
            'getModuleDirectory(import.meta)': '""',
          },
        }),
        rollupPlugins.shim({
          './locales.js': 'export const locales = {};',
          'module': `
            export const createRequire = () => {
              return {
                resolve() {
                  throw new Error('createRequire.resolve is not supported in bundled Lighthouse');
                },
              };
            };
          `,
        }),
        rollupPlugins.typescript({
          tsconfig: 'flow-report/tsconfig.json',
          // Plugin struggles with custom outDir, so revert it from tsconfig value
          // as well as any options that require an outDir is set.
          outDir: null,
          composite: false,
          emitDeclarationOnly: false,
          declarationMap: false,
        }),
        rollupPlugins.inlineFs({verbose: Boolean(process.env.DEBUG)}),
        rollupPlugins.commonjs(),
        rollupPlugins.nodePolyfills(),
        rollupPlugins.nodeResolve({preferBuiltins: true}),
      ]},
    ],
    assets: [
      {path: 'images/**/*', destDir: 'images'},
      {path: 'manifest.json'},
      {path: '../../shared/localization/locales/*.json', destDir: 'locales'},
    ],
  });

  await app.build();

  const argv = process.argv.slice(2);
  if (argv.includes('--deploy')) {
    await app.deploy();
  }
}

await main();
