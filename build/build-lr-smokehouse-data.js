'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const SMOKETESTS = require('../lighthouse-cli/test/smokehouse/smoke-test-dfns');
const {
  server,
  serverForOffline,
  setLrSmokehouseGatherMode,
} = require('../lighthouse-cli/test/fixtures/static-server');

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
  return require(expectationsPath);
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
async function createRawHttpTextFromResponse(response) {
  const status = response.status();
  const isRedirect = [301, 302, 307].includes(status);
  return createRawHttpText({
    status,
    statusText: response.statusText(),
    headers: response.headers(),
    // .text() errors if response is a redirect
    text: isRedirect ? '' : await response.text(),
  });
}

/**
 * Puppeteer (actually, the DevTools protocol) compacts multiple same-key headers
 * into the same key, separated by a newline. Undo that.
 *
 * See https://github.com/GoogleChrome/puppeteer/issues/1893
 *
 * @param {string} headerKey
 * @param {string} headerValues
 */
function splitMultipleHeaders(headerKey, headerValues) {
  return headerValues.split('\n').map(value => `${headerKey}: ${value}`).join('\r\n');
}

/**
 * @param {{status: number, statusText: string,
 *          headers?: Record<string, string>, text?: string}} opts
 */
function createRawHttpText({status, statusText, headers = {}, text = ''}) {
  return [
    `HTTP/1.1 ${status} ${statusText}`,
    ...Object.entries(headers).map(kv => splitMultipleHeaders(...kv)),
    text,
  ].join('\r\n').trim();
}

(async () => {
  setLrSmokehouseGatherMode(true);
  const servers = [
    server.listen(10200, 'localhost'),
    serverForOffline.listen(10503, 'localhost'),
  ];

  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
  });

  const contents = new Map();

  // Need an explict response to indicate that robots.txt does not exist.
  contents.set('http://localhost:10200/robots.txt', createRawHttpText({
    status: 404,
    statusText: 'Not Found',
  }));

  /**
   * @param {string} url
   */
  async function getPageContents(url) {
    const page = await browser.newPage();

    // TODO: this does not capture requests for service worker JS.
    page.on('response', async response => {
      const url = response.url();
      if (contents.has(url) || url.startsWith('data:')) return;
      contents.set(url, await createRawHttpTextFromResponse(response));
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
