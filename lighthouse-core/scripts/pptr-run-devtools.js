/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * USAGE:
 * Make sure CHROME_PATH is set to a modern version of Chrome.
 * This script won't work on older versions that use the "Audits" panel.
 *
 * URL list file: yarn run-devtools < path/to/urls.txt
 * Single URL: yarn run-devtools "https://example.com"
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');
const yargs = require('yargs/yargs');

const argv = yargs(process.argv.slice(2))
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
 * https://source.chromium.org/chromium/chromium/src/+/master:third_party/devtools-frontend/src/front_end/test_runner/TestRunner.js;l=170;drc=f59e6de269f4f50bca824f8ca678d5906c7d3dc8
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
  (${addSniffer.toString()})(
    UI.panels.lighthouse.__proto__,
    '_buildReportUI',
    (lhr, artifacts) => resolve(lhr)
  );
});
`;

const startLighthouse = `
(async () => {
  const ViewManager = UI.ViewManager.ViewManager || UI.ViewManager;
  await ViewManager.instance().showView('lighthouse');
  const button = UI.panels.lighthouse.contentElement.querySelector('button');
  if (button.disabled) throw new Error('Start button disabled');
  button.click();
})()
`;

/**
 * @param {import('puppeteer').Browser} browser
 * @param {string} url
 * @return {Promise<string>}
 */
async function testPage(browser, url) {
  const page = await browser.newPage();

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
    startLHResponse = await session.send('Runtime.evaluate', {
      expression: startLighthouse,
      awaitPromise: true,
    }).catch(err => ({exceptionDetails: err}));
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

  await page.close();

  return JSON.stringify(remoteLhrResponse.result.value);
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

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    args: customDevtools ? [`--custom-devtools-frontend=${customDevtools}`] : [],
    devtools: true,
  });

  const urlList = await readUrlList();
  for (let i = 0; i < urlList.length; ++i) {
    const lhr = await testPage(browser, urlList[i]);
    fs.writeFileSync(`${argv.o}/lhr-${i}.json`, lhr);
  }

  await browser.close();
}
run();
