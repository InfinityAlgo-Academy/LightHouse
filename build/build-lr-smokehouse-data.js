'use strict';

const SMOKETESTS = require('../lighthouse-cli/test/smokehouse/smoke-test-dfns');
const path = require('path');
const fs = require('fs');
const {server, serverForOffline} = require('../lighthouse-cli/test/fixtures/static-server');
const puppeteer = require('puppeteer');

/**
 * Attempt to resolve a path relative to the smokehouse folder.
 * If this fails, attempts to locate the path
 * relative to the current working directory.
 * @param {string} payloadPath
 * @return {string}
 */
function resolveLocalOrCwd(payloadPath) {
  let resolved;
  try {
    resolved = require.resolve('../lighthouse-cli/test/smokehouse/' + payloadPath);
  } catch (e) {
    const cwdPath = path.resolve(process.cwd(), payloadPath);
    resolved = require.resolve(cwdPath);
  }

  return resolved;
}

/**
 * @param {string} configPath
 * @return {LH.Config.Json}
 */
function loadConfig(configPath) {
  return require(configPath);
}

/**
 * @param {string} expectationsPath
 * @return {Smokehouse.ExpectedLHR[]}
 */
function loadExpectations(expectationsPath) {
  /** @type {Smokehouse.ExpectedLHR[]} */
  const expectations = require(expectationsPath);

  for (const expectation of expectations) {
    // TODO: true?
    // Hexa does not support redirects, so don't even try.
    expectation.requestedUrl = expectation.finalUrl;
  }

  return expectations;
}

const smokeTests = SMOKETESTS.map(smokeTestDfn => {
  return {
    id: smokeTestDfn.id,
    config: loadConfig(resolveLocalOrCwd(smokeTestDfn.config)),
    expectations: loadExpectations(resolveLocalOrCwd(smokeTestDfn.expectations)),
    batch: smokeTestDfn.batch,
  };
});

/**
 * @param {Map<*, *>} inputMap
 * @return {object}
 */
function mapToObj(inputMap) {
  const obj = {};

  inputMap.forEach(function(value, key) {
    // @ts-ignore
    obj[key] = value;
  });

  return obj;
}

/**
 * @param {puppeteer.Response} response
 */
async function createRawHttpText(response) {
  const isRedirect = [301, 302, 307].includes(response.status());
  return [
    `HTTP/1.1 ${response.status()} ${response.statusText()}`,
    ...Object.entries(response.headers()).map((key, value) => `${key}: ${value}`),
    isRedirect ? '' : await response.text(),
  ].join('\r\n').trim();
}

(async () => {
  const servers = [
    server.listen(10200, 'localhost'),
    serverForOffline.listen(10503, 'localhost'),
  ];

  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
  });

  const contents = new Map();

  /**
   * @param {string} url
   */
  async function getPageContents(url) {
    const page = await browser.newPage();

    // TODO: this does not capture requests for service worker JS.
    page.on('response', async response => {
      const url = response.url();
      if (contents.has(url) || url.startsWith('data:')) return;
      contents.set(url, await createRawHttpText(response));
    });

    // We have no time for infinite loops.
    page.setJavaScriptEnabled(!url.includes('infinite-loop'));

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 0,
    });
    await page.close();
  }

  for (const smokeTest of smokeTests) {
    for (const expectation of smokeTest.expectations) {
      if (contents.has(expectation.requestedUrl)) continue;
      await getPageContents(expectation.requestedUrl);
    }
  }

  await browser.close();
  servers.forEach(server => server.close());

  const smokehouseData = JSON.stringify({
    contents: mapToObj(contents),
    smokeTests,
  }, null, 2);

  fs.writeFileSync('./dist/lighthouse-lr-smokehouse-data.json', smokehouseData);
})();
