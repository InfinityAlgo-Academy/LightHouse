/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const glob = require('glob');
const {execFileSync} = require('child_process');
const LegacyJavascript = require('../../audits/legacy-javascript.js');
const networkRecordsToDevtoolsLog = require('../../test/network-records-to-devtools-log.js');
const VARIANT_DIR = `${__dirname}/variants`;

// build, audit, all.
const STAGE = process.env.STAGE || 'all';

const mainCode = fs.readFileSync(`${__dirname}/main.js`, 'utf-8');

const plugins = LegacyJavascript.getTransformPatterns().map(pattern => pattern.name);
const polyfills = LegacyJavascript.getPolyfillData().map(d => d.module);

/**
 * @param {string} command
 * @param {string[]} args
 */
function runCommand(command, args) {
  execFileSync(command, args, {cwd: __dirname});
}

/**
 * @param {number} version
 */
function installCoreJs(version) {
  runCommand('yarn', [
    'add',
    `core-js@${version}`,
  ]);
}

function removeCoreJs() {
  try {
    runCommand('yarn', [
      'remove',
      'core-js',
    ]);
  } catch (e) { }
}

/**
 * @param {{group: string, name: string, code: string, babelrc?: *}} options
 */
async function createVariant(options) {
  const {group, name, code, babelrc} = options;
  const dir = `${VARIANT_DIR}/${group}/${name.replace(/[^a-zA-Z0-9]+/g, '-')}`;

  if (!fs.existsSync(`${dir}/main.bundle.js`) && (STAGE === 'build' || STAGE === 'all')) {
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(`${dir}/main.js`, code);
    fs.writeFileSync(`${dir}/.babelrc`, JSON.stringify(babelrc || {}, null, 2));
    // Not used in this script, but useful for running Lighthouse manually.
    // Just need to start a web server first.
    fs.writeFileSync(`${dir}/index.html`,
      `<title>${name}</title><script src=main.bundle.min.js></script><p>${name}</p>`);

    // Note: No babelrc will make babel a glorified `cp`.
    runCommand('yarn', [
      'babel',
      `${dir}/main.js`,
      '--config-file', `${dir}/.babelrc`,
      '--ignore', 'node_modules/**/*.js',
      '-o', `${dir}/main.transpiled.js`,
      '--source-maps', 'inline',
    ]);

    // Transform any require statements (like for core-js) into a big bundle.
    runCommand('yarn', [
      'browserify',
      `${dir}/main.transpiled.js`,
      '-o', `${dir}/main.bundle.js`,
      '--debug', // source maps
    ]);

    // Minify.
    runCommand('yarn', [
      'terser',
      `${dir}/main.bundle.js`,
      '-o', `${dir}/main.bundle.min.js`,
      '--source-map', 'content="inline",url="main.bundle.min.js.map"',
    ]);
  }

  if (STAGE === 'audit' || STAGE === 'all') {
    // Instead of running Lighthouse, use LegacyJavascript directly. Requires some setup.
    // Much faster than running Lighthouse.
    const documentUrl = 'http://localhost/index.html'; // These URLs don't matter.
    const scriptUrl = 'https://localhost/main.bundle.min.js';
    const networkRecords = [
      {url: documentUrl},
      {url: scriptUrl},
    ];
    const devtoolsLogs = networkRecordsToDevtoolsLog(networkRecords);
    const jsRequestWillBeSentEvent = devtoolsLogs.find(e =>
      e.method === 'Network.requestWillBeSent' && e.params.request.url === scriptUrl);
    if (!jsRequestWillBeSentEvent) throw new Error('jsRequestWillBeSentEvent is undefined');
    // @ts-ignore - the log event is not narrowed to 'Network.requestWillBeSent' event from find
    const jsRequestId = jsRequestWillBeSentEvent.params.requestId;
    const code = fs.readFileSync(`${dir}/main.bundle.min.js`, 'utf-8').toString();
    /** @type {Pick<LH.Artifacts, 'devtoolsLogs'|'URL'|'ScriptElements'>} */
    const artifacts = {
      URL: {finalUrl: documentUrl, requestedUrl: documentUrl},
      devtoolsLogs: {
        [LegacyJavascript.DEFAULT_PASS]: devtoolsLogs,
      },
      ScriptElements: [
        // @ts-ignore - partial ScriptElement excluding unused DOM properties
        {requestId: jsRequestId, content: code},
      ],
    };
    // @ts-ignore: partial Artifacts.
    const legacyJavascriptResults = await LegacyJavascript.audit(artifacts, {
      computedCache: new Map(),
    });
    fs.writeFileSync(`${dir}/legacy-javascript.json`,
      JSON.stringify(legacyJavascriptResults.details.items, null, 2));
  }
}

function makeSummary() {
  let totalSignals = 0;
  const variants = [];
  for (const dir of glob.sync('*/*', {cwd: VARIANT_DIR})) {
    /** @type {Array<{signals: string[]}>} */
    const legacyJavascriptItems = require(`${VARIANT_DIR}/${dir}/legacy-javascript.json`);
    const signals = legacyJavascriptItems.reduce((acc, cur) => {
      totalSignals += cur.signals.length;
      return acc.concat(cur.signals);
    }, /** @type {string[]} */ ([])).join(', ');
    variants.push({name: dir, signals});
  }
  return {
    totalSignals,
    variantsMissingSignals: variants.filter(v => !v.signals).map(v => v.name),
    variants,
  };
}

async function main() {
  for (const plugin of plugins) {
    await createVariant({
      group: 'only-plugin',
      name: plugin,
      code: mainCode,
      babelrc: {
        plugins: [plugin],
      },
    });
  }

  for (const coreJsVersion of [2, 3]) {
    removeCoreJs();
    installCoreJs(coreJsVersion);

    for (const esmodules of [true, false]) {
      await createVariant({
        group: `core-js-${coreJsVersion}-preset-env-esmodules`,
        name: String(esmodules),
        code: mainCode,
        babelrc: {
          presets: [
            [
              '@babel/preset-env',
              {
                targets: {esmodules},
                useBuiltIns: 'entry',
                corejs: coreJsVersion,
              },
            ],
          ],
        },
      });
    }

    for (const polyfill of polyfills) {
      await createVariant({
        group: `core-js-${coreJsVersion}-only-polyfill`,
        name: polyfill,
        code: `require("core-js/modules/${polyfill}")`,
      });
    }
  }

  removeCoreJs();

  const summary = makeSummary();
  fs.writeFileSync(`${__dirname}/summary-signals.json`, JSON.stringify(summary, null, 2));
  console.log({
    totalSignals: summary.totalSignals,
    variantsMissingSignals: summary.variantsMissingSignals,
  });
  console.table(summary.variants);

  runCommand('sh', [
    'update-sizes.sh',
  ]);
}

main();
