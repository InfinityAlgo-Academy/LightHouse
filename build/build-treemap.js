/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const GhPagesApp = require('./gh-pages-app.js');
const {LH_ROOT} = require('../root.js');
const {getIcuMessageIdParts} = require('../shared/localization/format.js');

/**
 * Extract only the strings needed for lighthouse-treemap into
 * a script that sets a global variable `strings`, whose keys
 * are locale codes (en-US, es, etc.) and values are localized UIStrings.
 */
function buildStrings() {
  const locales = require('../shared/localization/locales.js');
  // TODO(esmodules): use dynamic import when build/ is esm.
  const utilCode = fs.readFileSync(LH_ROOT + '/lighthouse-treemap/app/src/util.js', 'utf-8');
  const {UIStrings} = eval(utilCode.replace(/export /g, '') + '\nmodule.exports = TreemapUtil;');
  const strings = /** @type {Record<LH.Locale, string>} */ ({});

  for (const [locale, lhlMessages] of Object.entries(locales)) {
    const localizedStrings = Object.fromEntries(
      Object.entries(lhlMessages).map(([icuMessageId, v]) => {
        const {filename, key} = getIcuMessageIdParts(icuMessageId);
        if (!filename.endsWith('util.js') || !(key in UIStrings)) {
          return [];
        }

        return [key, v.message];
      })
    );
    strings[/** @type {LH.Locale} */ (locale)] = localizedStrings;
  }

  return 'const strings =' + JSON.stringify(strings, null, 2) + ';';
}

/**
 * Build treemap app, optionally deploying to gh-pages if `--deploy` flag was set.
 */
async function run() {
  const app = new GhPagesApp({
    name: 'treemap',
    appDir: `${LH_ROOT}/lighthouse-treemap/app`,
    html: {path: 'index.html'},
    stylesheets: [
      {path: require.resolve('tabulator-tables/dist/css/tabulator.min.css')},
      {path: 'styles/*'},
    ],
    javascripts: [
      buildStrings(),
      {path: require.resolve('idb-keyval/dist/idb-keyval-min.js')},
      {path: require.resolve('event-target-shim/umd')},
      {path: require.resolve('webtreemap-cdt')},
      {path: require.resolve('tabulator-tables/dist/js/tabulator_core.js')},
      {path: require.resolve('tabulator-tables/dist/js/modules/sort.js')},
      {path: require.resolve('tabulator-tables/dist/js/modules/format.js')},
      {path: require.resolve('tabulator-tables/dist/js/modules/resize_columns.js')},
      {path: require.resolve('pako/dist/pako_inflate.js')},
      {path: 'src/main.js', rollup: true},
    ],
    assets: [
      {path: 'images/**/*', destDir: 'images'},
      {path: 'debug.json'},
    ],
  });

  await app.build();

  const argv = process.argv.slice(2);
  if (argv.includes('--deploy')) {
    await app.deploy();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
