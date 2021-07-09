/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const LighthouseRunner = require('../lighthouse-core/runner.js');
const {inlineFs} = require('./esbuild/esbuild-plugin-inline-fs.js');

const {LH_ROOT} = require('../root.js');
const audits = LighthouseRunner.getAuditList()
    .map(f => `./lighthouse-core/audits/${f}`);
const gatherers = LighthouseRunner.getGathererList()
    .map(f => `./lighthouse-core/gather/gatherers/${f}`);

// @ts-expect-error - no types
const pubAdsAudits = require('lighthouse-plugin-publisher-ads/plugin.js').audits.map(a => a.path);

/** @typedef {import('esbuild').PluginBuild} PluginBuild */

// TODO: Devtools only
const localeLoadPlugin = {
  name: 'localeLoad',
  /** @param {PluginBuild} build */
  setup(build) {
    // replace locales with empty files.
    build.onLoad({filter: /locales\/[\w-]+\.json$/}, () => {
      return {contents: '{}'};
    });
  },
};


async function run() {
  const result = await esbuild.build({
    entryPoints: ['clients/devtools-entry.js'],
    logLevel: 'warning',
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    outfile: 'dist/lighthouse-dt-bundle.js',
    external: [
      // 'js-library-detector/library/libraries.js',
      'debug/node',
      'raven',
      'pako/lib/zlib/inflate.js',
    ],
    plugins: [localeLoadPlugin, inlineFs],
    charset: 'utf8',
    absWorkingDir: LH_ROOT,
    metafile: true,
  }).catch(() => process.exit(1));

  console.log(result.metafile);
}

run();
