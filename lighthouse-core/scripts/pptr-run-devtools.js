/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * USAGE:
 * Make sure CHROME_PATH is set to a modern version of Chrome.
 * May work on older versions of Chrome.
 *
 * To use with locally built DevTools and Lighthouse, run (assuming devtools at ~/src/devtools/devtools-frontend):
 *    yarn devtools
 *    yarn run-devtools --custom-devtools-frontend=file://$HOME/src/devtools/devtools-frontend/out/Default/gen/front_end
 *
 * Or with the DevTools in .tmp:
 *   bash lighthouse-core/test/chromium-web-tests/setup.sh
 *   yarn run-devtools --custom-devtools-frontend=file://$PWD/.tmp/chromium-web-tests/devtools/devtools-frontend/out/Default/gen/front_end
 *
 * URL list file: yarn run-devtools < path/to/urls.txt
 * Single URL: yarn run-devtools "https://example.com"
 */

import fs from 'fs';
import readline from 'readline';

import puppeteer from 'puppeteer';
import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';

const y = yargs(yargsHelpers.hideBin(process.argv));
const argv = y
  .usage('$0 [url]')
  .help('help').alias('help', 'h')
  .option('_', {type: 'string'})
  .option('output-dir', {
    type: 'string',
    default: 'latest-run/devtools-lhrs',
    alias: 'o',
  })
  .option('custom-devtools-frontend', {
    type: 'string',
    alias: 'd',
  })
  .argv;

/**
 * https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/test_runner/TestRunner.js;l=170;drc=f59e6de269f4f50bca824f8ca678d5906c7d3dc8
 * @param {Record<string, function>} receiver
 * @param {string} methodName
 * @param {function} override
 */
function addSniffer(receiver, methodName, override) {
  const original = receiver[methodName];
  if (typeof original !== 'function') {
    throw new Error('Cannot find method to override: ' + methodName);
  }

  /**
   * @param  {...any} args
   */
  receiver[methodName] = function(...args) {
    let result;
    try {
      result = original.apply(this, args);
    } finally {
      receiver[methodName] = original;
    }
    // In case of exception the override won't be called.
    try {
      Array.prototype.push.call(args, result);
      override.apply(this, args);
    } catch (e) {
      throw new Error('Exception in overriden method \'' + methodName + '\': ' + e);
    }
    return result;
  };
}

const sniffLhr = `
new Promise(resolve => {
  const panel = UI.panels.lighthouse || UI.panels.audits;
  const methodName = panel.__proto__.buildReportUI ?
    'buildReportUI' : '_buildReportUI';
  (${addSniffer.toString()})(
    panel.__proto__,
    methodName,
    (lhr, artifacts) => resolve(lhr)
  );
});
`;

const sniffLighthouseStarted = `
new Promise(resolve => {
  const panel = UI.panels.lighthouse || UI.panels.audits;
  const protocolService = panel.protocolService || panel._protocolService;
  (${addSniffer.toString()})(
    protocolService.__proto__,
    'startLighthouse',
    (inspectedURL) => resolve(inspectedURL)
  );
});
`;

const startLighthouse = `
(async () => {
  const viewManager = UI.viewManager || (UI.ViewManager.ViewManager || UI.ViewManager).instance();
  const views = viewManager.views || viewManager._views;
  const panelName = views.has('lighthouse') ? 'lighthouse' : 'audits';
  await viewManager.showView(panelName);

  const panel = UI.panels.lighthouse || UI.panels.audits;
  const button = panel.contentElement.querySelector('button');
  if (button.disabled) throw new Error('Start button disabled');
  button.click();
})()
`;

/**
 * @param {string} url
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {import('puppeteer').Page} page
 * @param {import('puppeteer').Browser} browser
 * @param {string} url
 * @return {Promise<string>}
 */
async function testPage(page, browser, url) {
  const targets = await browser.targets();
  const inspectorTarget = targets.filter(t => t.url().includes('devtools'))[1];
  if (!inspectorTarget) throw new Error('No inspector found.');

  const session = await inspectorTarget.createCDPSession();
  await session.send('Runtime.enable');

  // Navigate to page and wait for initial HTML to be parsed before trying to start LH.
  await new Promise((resolve, reject) => {
    page.target().createCDPSession()
      .then(session => {
        session.send('Page.enable').then(() => {
          session.once('Page.domContentEventFired', resolve);
          page.goto(url);
        });
      })
      .catch(reject);
  });

  /** @type {Omit<puppeteer.Protocol.Runtime.EvaluateResponse, 'result'>|undefined} */
  let startLHResponse;
  while (!startLHResponse || startLHResponse.exceptionDetails) {
    if (startLHResponse) await new Promise(resolve => setTimeout(resolve, 1000));
    startLHResponse = await session.send('Runtime.evaluate', {
      expression: startLighthouse,
      awaitPromise: true,
    }).catch(err => ({exceptionDetails: err}));
  }

  /** @type {puppeteer.Protocol.Runtime.EvaluateResponse} */
  const lhStartedResponse = await session.send('Runtime.evaluate', {
    expression: sniffLighthouseStarted,
    awaitPromise: true,
    returnByValue: true,
  }).catch(err => err);
  // Verify the first parameter to `startLighthouse`, which should be a url.
  // Don't try to check the exact value (because of redirects and such), just
  // make sure it exists.
  if (!isValidUrl(lhStartedResponse.result.value)) {
    throw new Error(`Lighthouse did not start correctly. Got unexpected value for url: ${
      JSON.stringify(lhStartedResponse.result.value)}`);
  }

  /** @type {puppeteer.Protocol.Runtime.EvaluateResponse} */
  const remoteLhrResponse = await session.send('Runtime.evaluate', {
    expression: sniffLhr,
    awaitPromise: true,
    returnByValue: true,
  }).catch(err => err);

  if (!remoteLhrResponse.result || !remoteLhrResponse.result.value) {
    throw new Error('Problem sniffing LHR.');
  }

  return JSON.stringify(remoteLhrResponse.result.value, null, 2);
}

/**
 * @return {Promise<string[]>}
 */
async function readUrlList() {
  if (argv._[0]) return [argv._[0]];

  /** @type {string[]} */
  const urlList = [];
  const rl = readline.createInterface(process.stdin, process.stdout);

  rl.on('line', async line => {
    if (line.startsWith('#')) return;
    urlList.push(line);
  });

  return new Promise(resolve => rl.on('close', () => resolve(urlList)));
}

async function run() {
  const outputDir = argv['output-dir'];

  // Create output directory.
  if (fs.existsSync(outputDir)) {
    if (fs.readdirSync(outputDir).length) {
      // eslint-disable-next-line no-console
      console.warn('WARNING: Output directory is not empty.');
    }
  } else {
    fs.mkdirSync(outputDir);
  }

  const customDevtools = argv['custom-devtools-frontend'];
  if (customDevtools) {
    console.log(`Using custom devtools frontend: ${customDevtools}`);
    console.log('Make sure it has been built recently!');
  }

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    args: customDevtools ? [`--custom-devtools-frontend=${customDevtools}`] : [],
    devtools: true,
  });

  let errorCount = 0;
  const urlList = await readUrlList();
  for (let i = 0; i < urlList.length; ++i) {
    const page = await browser.newPage();
    try {
      const lhr = await testPage(page, browser, urlList[i]);
      fs.writeFileSync(`${argv.o}/lhr-${i}.json`, lhr);
    } catch (error) {
      errorCount += 1;
      console.error(error.message);
      fs.writeFileSync(`${argv.o}/lhr-${i}.json`, JSON.stringify({error: error.message}, null, 2));
    } finally {
      try {
        await page.close();
      } catch {}
    }
  }
  console.log(`${urlList.length - errorCount} / ${urlList.length} urls run successfully.`);
  console.log(`Results saved to ${argv.o}`);

  await browser.close();

  if (errorCount) process.exit(1);
}
run();
