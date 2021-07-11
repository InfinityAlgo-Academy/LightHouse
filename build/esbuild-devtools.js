/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable max-len */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const LighthouseRunner = require('../lighthouse-core/runner.js');
const {inlineFs} = require('./esbuild/esbuild-plugin-inline-fs.js');

const {LH_ROOT} = require('../root.js');

// Manually add audits, gatherers, and the pubAds plugin that can be dynamically loaded.
// Path is relative to `lighthouse-core/config/` for loading from files in that directory.
/** @type {Array<string>} */
const dynamicLoads = [
  ...LighthouseRunner.getAuditList().map(f => `../audits/${f.replace(/\.js$/, '')}`),
  ...LighthouseRunner.getGathererList().map(f => `../gather/gatherers/${f.replace(/\.js$/, '')}`),
  'lighthouse-plugin-publisher-ads',
  // @ts-expect-error - no types.
  ...require('lighthouse-plugin-publisher-ads/plugin.js').audits.map(a => a.path),
];

/** @typedef {import('esbuild').PluginBuild} PluginBuild */

const lighthousePlugin = {
  name: 'lighthouse',
  /** @param {PluginBuild} build */
  setup(build) {
    // Resolve pubAds lighthouse dep loads back to LH_ROOT.
    // build.onResolve({filter: /^lighthouse\/$/}, args => {
    //   return {path: args.path.replace(/^lighthouse$/, LH_ROOT)};
    // });
    // TODO: Devtools only
    // Replace locales with empty files.
    build.onLoad({filter: /locales\/[\w-]+\.json$/}, () => {
      return {contents: '{}'};
    });
    // Replace dynamically-loaded audits and gatherers with static load function.
    build.onLoad({filter: /config-loader.js$/}, () => {
      return {
        contents: `
          'use strict';

          const loadMap = {
          ${dynamicLoads.map(id => `  '${id}': () => require('${id}'),`).join('\n')}
          }

          function requireModule(id) {
            const requireFn = loadMap[id];
            if (!requireFn) throw new Error(\`unable to load '\${id}'\`);
            return requireFn();
          }

          module.exports = {
            requireModule,
          };
      `};
    });
  },
};

async function run() {
  const result = await esbuild.build({
    entryPoints: ['clients/devtools-entry.js'],
    logLevel: 'warning',
    bundle: true,
    platform: 'browser',
    target: 'esnext',
    outfile: 'dist/lighthouse-dt-bundle.js',
    external: [
      'debug/node',
      'raven',
      'pako/lib/zlib/inflate.js',
    ],
    plugins: [lighthousePlugin, inlineFs],
    banner: {
      js:
        // esbuild does not mock `require.resolve`. Provide a simple identity
        // version with a banner-define combo so it can still be used for loading
        // the pubAds plugin and audits. TODO: remove when moving to ES modules.
        'global.requireResolve = (path) => path;',
    },
    define: {
      'require.resolve': 'requireResolve',
    },
    charset: 'utf8',
    absWorkingDir: LH_ROOT,
    metafile: true,

    // Minification.
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: false,
    legalComments: 'none',
    // keepNames: true,
  }).catch(() => process.exit(1));

  console.log(result.metafile);
}

run();
