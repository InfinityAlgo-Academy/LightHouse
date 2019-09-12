// 9 desktop, 9 mobile WPT

const path = require('path');
const fs = require('fs');
const https = require('https');
const {execFileSync} = require('child_process');

const LH_ROOT = path.join(__dirname, '..', '..', '..');
const SAMPLES = 2;
const URLS = [
  'https://www.example.com',
  'https://www.paulirish.com',
];

if (!process.env.WPT_KEY) throw new Error('missing WPT_KEY');
const WPT_KEY = process.env.WPT_KEY;
const DEBUG = process.env.DEBUG;

const outputFolder = path.join(__dirname, '..', '..', '..', 'dist', 'lantern-traces');
const summaryPath = path.join(outputFolder, 'summary.json');

/** @typedef {{trace: string}} Result */
/** @typedef {{url: string, mobile: Result[], desktop: Result[]}} UrlResults */

/** @type {UrlResults[]} */
let summary = loadSummary();

function loadSummary() {
  if (fs.existsSync(summaryPath)) {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  } else {
    return URLS.map((url) => {
      return {
        url,
        mobile: [],
        desktop: [],
      };
    });
  }
}

function saveSummary() {
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

/**
 * @param {string} url
 * @return {Promise<string>}
 */
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', (err) => reject(err));
    });
  });
}

/**
 * @param {string} url
 */
async function startWptTest(url) {
  const apiUrl = new URL('https://www.webpagetest.org/runtest.php');
  apiUrl.searchParams.set('k', WPT_KEY);
  apiUrl.searchParams.set('f', 'json');
  apiUrl.searchParams.set('lighthouse', '1');
  apiUrl.searchParams.set('mobile', '1');
  apiUrl.searchParams.set('url', url);
  const wptResponseJson = await fetch(apiUrl.href);
  const wptResponse = JSON.parse(wptResponseJson);
  if (wptResponse.statusCode !== 200) {
    throw new Error(`unexpected status code ${wptResponse.statusCode} ${wptResponse.statusText}`);
  }

  return {
    testId: wptResponse.data.testId,
    jsonUrl: wptResponse.data.jsonUrl,
  };
}

/**
 * @param {string} url
 * @return {Promise<Result>}
 */
async function runForDesktop(url) {
  const artifactsFolder = `${LH_ROOT}/.tmp/collect-traces-artifacts`;
  execFileSync('node', [
    path.join(LH_ROOT, 'lighthouse-cli'),
    url,
    `-G=${artifactsFolder}`,
  ] );
  const trace = fs.readFileSync(`${artifactsFolder}/defaultPass.trace.json`, 'utf-8');
  return {
    trace,
  };
}

/**
 * @param {string} url
 * @return {Promise<Result>}
 */
async function runForMobile(url) {
  return {trace:''};

  const {testId, jsonUrl} = await startWptTest(url);
  if (DEBUG) console.log({testId, jsonUrl});

  // Give the test at least 30 seconds before we start polling.
  await new Promise((resolve) => setTimeout(resolve, 30 * 1000));

  // Poll for the results every 5 seconds.
  const wptResult = await new Promise((resolve, reject) => {
    const pollingInterval = 5 * 1000;

    async function poll() {
      if (DEBUG) console.log('poll ...');
      const responseJson = await fetch(jsonUrl);
      const response = JSON.parse(responseJson);
      if (response.statusCode === 200) return resolve(response);
      if (response.statusCode >= 100 && response.statusCode < 200) return setTimeout(poll, pollingInterval);
      reject(new Error(`unexpected response: ${response.statusCode} ${response.statusText}`));
    }

    poll();
  });
  const lhr = wptResult.data.lighthouse;

  const traceUrl = new URL('https://www.webpagetest.org/getgzip.php');
  traceUrl.searchParams.set('test', testId);
  traceUrl.searchParams.set('file', 'lighthouse_trace.json');
  // TODO this isn't working ...
  if (DEBUG) console.log(traceUrl.href);
  // const traceJson = await fetch(traceUrl.href);
  const traceJson = '';

  return {
    trace: traceJson,
  };
}

/**
 * @param {() => Promise<Result>} asyncFn
 */
async function repeatUntilPass(asyncFn) {
  while (true) {
    try {
      return await asyncFn();
    } catch (err) {
      console.log(err);
    }
  }
}

async function main() {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }

  if (fs.existsSync(summaryPath)) {
    loadSummary();
  }

  for (const urlResultSet of summary) {
    if (urlResultSet.mobile.length === SAMPLES && urlResultSet.desktop.length === SAMPLES) {
      continue;
    }

    const url = urlResultSet.url;
    const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '-');
    console.log('collecting traces for', url);

    const mobileResultPromises = [];
    for (let i = 0; i < SAMPLES; i++) {
      // Can run in parallel.
      mobileResultPromises.push(repeatUntilPass(() => runForMobile(url)));
    }

    const desktopResults= [];
    for (let i = 0; i < SAMPLES; i++) {
      // Must run in series.
      desktopResults.push(await repeatUntilPass(() => runForDesktop(url)));
    }

    const mobileTraces = await Promise.all(mobileResultPromises);
    urlResultSet.mobile = mobileTraces.map((result, i) => {
      const traceFilename = `${sanitizedUrl}-mobile-${i + 1}-trace.json`;
      fs.writeFileSync(path.join(outputFolder, traceFilename), result.trace);
      return {trace: traceFilename}
    });

    urlResultSet.desktop = desktopResults.map((result, i) => {
      const traceFilename = `${sanitizedUrl}-desktop-${i + 1}-trace.json`;
      fs.writeFileSync(path.join(outputFolder, traceFilename), result.trace);
      return {trace: traceFilename}
    });

    saveSummary();
  }
}

main();
