/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const rollup = require('rollup');
const rollupPlugins = require('./rollup-plugins.js');
const GhPagesApp = require('./gh-pages-app.js');
const {LH_ROOT} = require('../root.js');

async function buildReportGenerator() {
  const bundle = await rollup.rollup({
    input: 'report/generator/report-generator.js',
    plugins: [
      rollupPlugins.shim({
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export default {}',
      }),
      rollupPlugins.commonjs(),
      rollupPlugins.nodeResolve(),
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
async function run() {
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
      {path: require.resolve('pako/dist/pako_inflate.js')},
      {path: 'src/main.js', rollup: true, rollupPlugins: [
        rollupPlugins.shim({
          './locales.js': 'export default {}',
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
        rollupPlugins.replace({
          values: {
            '__dirname': '""',
          },
        }),
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

run();
