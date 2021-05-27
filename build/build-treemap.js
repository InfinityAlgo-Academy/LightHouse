/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('../lighthouse-core/lib/i18n/locales').LhlMessages} LhlMessages */

const fs = require('fs');
const GhPagesApp = require('./gh-pages-app.js');

/**
 * Extract only the strings needed for lighthouse-treemap into
 * a script that sets a global variable `strings`, whose keys
 * are locale codes (en-US, es, etc.) and values are localized UIStrings.
 */
function buildStrings() {
  const locales = require('../lighthouse-core/lib/i18n/locales.js');
  const UIStrings = require(
    // Prevent `tsc -p .` from evaluating util.js using core types, it is already typchecked by `tsc -p lighthouse-treemap`.
    '' + '../lighthouse-treemap/app/src/util.js'
  ).UIStrings;
  const strings = /** @type {Record<LH.Locale, LhlMessages>} */ ({});

  for (const [locale, lhlMessages] of Object.entries(locales)) {
    const localizedStrings = Object.fromEntries(
      Object.entries(lhlMessages).map(([icuMessageId, v]) => {
        const [filename, varName] = icuMessageId.split(' | ');
        if (!filename.endsWith('util.js') || !(varName in UIStrings)) {
          return [];
        }

        return [varName, v];
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
    appDir: `${__dirname}/../lighthouse-treemap/app`,
    html: {path: 'index.html'},
    stylesheets: [
      fs.readFileSync(require.resolve('tabulator-tables/dist/css/tabulator.min.css'), 'utf8'),
      {path: 'styles/*'},
    ],
    javascripts: [
      /* eslint-disable max-len */
      fs.readFileSync(require.resolve('idb-keyval/dist/idb-keyval-min.js'), 'utf8'),
      fs.readFileSync(require.resolve('event-target-shim/umd'), 'utf8'),
      fs.readFileSync(require.resolve('webtreemap-cdt'), 'utf8'),
      fs.readFileSync(require.resolve('tabulator-tables/dist/js/tabulator_core.js'), 'utf8'),
      fs.readFileSync(require.resolve('tabulator-tables/dist/js/modules/sort.js'), 'utf8'),
      fs.readFileSync(require.resolve('tabulator-tables/dist/js/modules/format.js'), 'utf8'),
      fs.readFileSync(require.resolve('tabulator-tables/dist/js/modules/resize_columns.js'), 'utf8'),
      fs.readFileSync(require.resolve('pako/dist/pako_inflate.js'), 'utf-8'),
      /* eslint-enable max-len */
      buildStrings(),
      {path: '../../lighthouse-core/report/html/renderer/logger.js'},
      {path: '../../lighthouse-core/report/html/renderer/i18n.js'},
      {path: '../../lighthouse-core/report/html/renderer/text-encoding.js'},
      {path: '../../lighthouse-viewer/app/src/drag-and-drop.js'},
      {path: '../../lighthouse-viewer/app/src/github-api.js'},
      {path: '../../lighthouse-viewer/app/src/firebase-auth.js'},
      {path: 'src/**/*'},
    ],
    assets: [
      {path: 'images/**/*'},
      {path: 'debug.json'},
    ],
  });

  await app.build();

  const argv = process.argv.slice(2);
  if (argv.includes('--deploy')) {
    await app.deploy();
  }
}

run();
