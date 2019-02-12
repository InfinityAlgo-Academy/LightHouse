const SMOKETESTS = require('../lighthouse-cli/test/smokehouse/smoke-test-dfns');
const path = require('path');
const URL = require('url').URL;
const fs = require('fs');
const {server, serverForOffline} = require('../lighthouse-cli/test/fixtures/static-server');
const puppeteer = require('puppeteer');


// TODO this is duplicated w/ smokehouse.js
/**
 * @typedef {Pick<LH.Result, 'audits' | 'finalUrl' | 'requestedUrl'> & {errorCode?: string}} ExpectedLHR
 */

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
 * @return {ExpectedLHR[]}
 */
function loadExpectations(expectationsPath) {
  /** @type {ExpectedLHR[]} */
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

const batches = smokeTests.reduce((map, test) => {
  const batch = map.get(test.batch) || [];
  batch.push(test);
  return map.set(test.batch, batch);
}, new Map());

// const contents = smokeTests.reduce((map, test) => {
//   for (const expectation of test.expectations) {
//     const url = new URL(expectation.requestedUrl);
//     if (map.has(url.href)) continue;

//     let content = '';
//     if (url.hostname === 'localhost') {
//       const pathToFile = './lighthouse-cli/test/fixtures' + url.pathname;
//       content = fs.readFileSync(pathToFile).toString('utf-8');
//     } else {
//       content = 'TODO';
//     }

//     map.set(url.href, content);
//   }

//   return map;
// }, new Map());

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
  return [
    `HTTP/1.1 ${response.status()} ${response.statusText()}`,
    ...Object.entries(response.headers()).map((key, value) => `${key}: ${value}`),
    await response.text(),
  ].join('\r\n');
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

  async function getPageContents(url) {
    const page = await browser.newPage();
    /** @type {Map<string, string>} */
    const redirects = new Map();

    // TODO: this does not capture requests for service worker JS.
    page.on('response', async response => {
      const url = response.url();
      if (contents.has(url) || url.startsWith('data:')) return;

      // LR integration test can't mock redirects, so attempt to save the body
      // of the final url as the body of the requested url (i.e. completely remove the redirect)
      if (response.status() === 301 || response.status() === 302 || response.status() === 307) {
        redirects.set(response.headers().location, url);
        return;
      }

      if (redirects.has(url)) {
        let unrolledUrl = url;
        while (redirects.has(unrolledUrl)) {
          // @ts-ignore: literally just verified it exists
          unrolledUrl = redirects.get(unrolledUrl);
        }

        if (contents.has(unrolledUrl)) return;
        contents.set(unrolledUrl, await createRawHttpText(response));
      } else {
        contents.set(url, await createRawHttpText(response));
      }
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

  // const htmlFiles = await new Promise((resolve, reject) => {
  //   glob('./lighthouse-cli/test/fixtures/**/*.html', function( err, files ) {
  //     if (err) reject(err);
  //     resolve(files);
  //   });
  // });


  // for (const file of fixtureFiles) {
  //   if (file.endsWith('.html')) {

  //   }

  //   const url = `https://localhost`;
  //   contents.set();
  // }

  const smokehouseData = JSON.stringify({
    contents: mapToObj(contents),
    smokeTests,
  }, null, 2);

  fs.writeFileSync('./dist/lighthouse-lr-smokehouse-data.json', smokehouseData);
})();
