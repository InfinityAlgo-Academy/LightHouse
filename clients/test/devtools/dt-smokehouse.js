/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Script to run smoketests in DevTools. Not run in CI - meant to be run
 * during rolls to DevTools.
 */

/* eslint-disable no-console */

const log = require('lighthouse-logger');
const Smokes = require('../../../lighthouse-cli/test/smokehouse/smoke-test-dfns.js');
const {collateResults, report} =
  require('../../../lighthouse-cli/test/smokehouse/smokehouse-report.js');
const puppeteer = require('../../../node_modules/puppeteer/index.js');
const {server, serverForOffline} =
  require('../../../lighthouse-cli/test/fixtures/static-server.js');

/* istanbul ignore next */
async function runAuditsInDevTools() {
  while (!window.UI) {
    await new Promise(requestAnimationFrame);
  }

  // Audits used to be Audits2.
  try {
    await window.UI.viewManager.showView('audits');
  } catch (_) {
    await window.UI.viewManager.showView('audits2');
  }
  // Audits/Audits2 is only loaded after the view is shown.
  const Audits = window.Audits || window.Audits2;

  const btnSelector = window.Audits ? '.audits-start-button' : '.audits2-start-button';
  let btn;
  while (!(btn = document.querySelector(btnSelector))) {
    await new Promise(requestAnimationFrame);
  }
  btn.click();

  return new Promise(resolve => {
    const originalStartLighthouse = Audits.ProtocolService.prototype.startLighthouse;
    Audits.ProtocolService.prototype.startLighthouse = async function(...args) {
      const result = await originalStartLighthouse.call(this, ...args);
      if (result.fatal) {
        const runtimeError = {code: result.message};
        resolve({lhr: {runtimeError}, artifacts: result.artifacts});
      } else {
        resolve({lhr: result.lhr, artifacts: result.artifacts});
      }
    };
  });
}

async function runLighthouse(url) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: process.env.CHROME_PATH,
    devtools: true,
  });

  const page = (await browser.pages())[0];
  await page.goto(url);

  const dtTarget = await browser.waitForTarget(target => {
    const url = target.url();
    return url.startsWith('devtools://') || url.startsWith('chrome-devtools://');
  });
  const session = await dtTarget.createCDPSession();
  const evalResult = await session.send('Runtime.evaluate', {
    expression: `(${runAuditsInDevTools.toString()})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evalResult.exceptionDetails) {
    throw new Error(evalResult.exceptionDetails.text);
  }
  const {lhr, artifacts} = evalResult.result.value;

  await browser.close();
  if (lhr.runtimeError) {
    lhr.requestedUrl = new URL(url).href;
    lhr.finalUrl = new URL(url).href;
  }
  return {lhr, artifacts};
}

function shouldSkip(test, expectation) {
  if (expectation.lhr.requestedUrl.includes('infinite-loop')) {
    return true;
  }

  // Audits and artifacts don't survive the error case in DevTools.
  if (test.id === 'errors') {
    return true;
  }

  // if (!expectation.lhr.requestedUrl.includes('airh')) {
  //   return true;
  // }

  return false;
}

function modify(test, expectation) {
  // Nothing yet.
}

async function main() {
  server.listen(10200, 'localhost');
  serverForOffline.listen(10503, 'localhost');

  const smokeFilterRegExp = process.env.SMOKE_GREP ? new RegExp(process.env.SMOKE_GREP) : null;
  let passingCount = 0;
  let failingCount = 0;

  for (const test of Smokes.getSmokeTests()) {
    for (const expected of test.expectations) {
      if (smokeFilterRegExp && !expected.lhr.requestedUrl.match(smokeFilterRegExp)) {
        continue;
      }

      console.log(`======  ${expected.lhr.requestedUrl} ======`);
      if (shouldSkip(test, expected)) {
        console.log('skipping');
        continue;
      }

      modify(test, expected);

      const results = await runLighthouse(expected.lhr.requestedUrl);
      console.log(`Asserting expected results match those found. (${expected.lhr.requestedUrl})`);
      const collated = collateResults(results, expected);
      const counts = report(collated);
      passingCount += counts.passed;
      failingCount += counts.failed;
    }
  }

  await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => serverForOffline.close(resolve));

  if (passingCount) {
    console.log(log.greenify(`${passingCount} passing`));
  }
  if (failingCount) {
    console.log(log.redify(`${failingCount} failing`));
  }
  process.exit(passingCount > 0 && failingCount === 0 ? 0 : 1);
}

main();
