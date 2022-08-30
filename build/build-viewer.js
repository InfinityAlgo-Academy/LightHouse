/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createRequire} from 'module';

import esbuild from 'esbuild';

import * as plugins from './esbuild-plugins.js';
import {GhPagesApp} from './gh-pages-app.js';
import {LH_ROOT} from '../root.js';

const require = createRequire(import.meta.url);

async function buildReportGenerator() {
  const result = await esbuild.build({
    entryPoints: ['report/generator/report-generator.js'],
    // currently there is no umd support in esbuild.
    // so we take the output and create our own umd bundle.
    // https://github.com/evanw/esbuild/pull/1331
    write: false,
    format: 'iife',
    globalName: 'reportGeneratorExports',
    bundle: true,
    minify: !process.env.DEBUG,
    plugins: [
      plugins.ignoreBuiltins(),
      plugins.replaceModules({
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export const flowReportAssets = {}',
      }),
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs,
        plugins.partialLoaders.rmGetModuleDirectory,
      ]),
    ],
  });

  const code = `
(function(root, factory) {
  if (typeof define === "function" && define.amd) {
    define(factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ReportGenerator = factory();
  }
}(typeof self !== "undefined" ? self : this, function() {
  "use strict";
  ${result.outputFiles[0].text.replace('"use strict";\n', '')};
  return reportGeneratorExports.ReportGenerator;
}));
`;

  return code;
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
      // TODO: import report generator async
      // https://github.com/GoogleChrome/lighthouse/pull/13429
      reportGeneratorJs,
      {path: require.resolve('pako/dist/pako_inflate.js')},
      {path: 'src/main.js', esbuild: true, esbuildPlugins: [
        plugins.ignoreBuiltins(),
        plugins.replaceModules({
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
        plugins.bulkLoader([
          plugins.partialLoaders.inlineFs,
          plugins.partialLoaders.rmGetModuleDirectory,
        ]),
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
