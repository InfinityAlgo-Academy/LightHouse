/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const GhPagesApp = require('./gh-pages-app.js');

/**
 * Build treemap app, optionally deploying to gh-pages if `--deploy` flag was set.
 */
async function run() {
  const app = new GhPagesApp({
    name: 'treemap',
    appDir: `${__dirname}/../lighthouse-treemap/app`,
    html: {path: 'index.html'},
    stylesheets: [
      {path: 'styles/*'},
    ],
    javascripts: [
      fs.readFileSync(require.resolve('webtreemap-cdt'), 'utf8'),
      {path: 'src/*'},
    ],
    assets: [
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
