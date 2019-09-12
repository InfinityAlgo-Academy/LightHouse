// 9 desktop, 9 mobile WPT

const path = require('path');
const fs = require('fs');
const https = require('https');
const {execFileSync} = require('child_process');

const LH_ROOT = path.join(__dirname, '..', '..', '..');
const NUM_SAMPLES = 1;
const URLS = [
  'https://www.example.com',
];

if (!process.env.WPT_KEY) throw new Error('missing WPT_KEY');
const WPT_KEY = process.env.WPT_KEY;

const outputFolder = path.join(__dirname, '..', '..', '..', 'dist', 'lantern-traces');
const summaryPath = path.join(outputFolder, 'summary.json');

/** @typedef {{trace: string}} Result */
/** @typedef {{mobile: Result[], desktop: Result[]}} UrlResults */

/** @type {Record<string, UrlResults>} */
let summary = {};

function loadSummary() {
  summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
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
  ]);
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
  const {testId, jsonUrl} = await startWptTest(url);
  console.log({testId, jsonUrl});

  // Give the test at least 30 seconds before we start polling.
  await new Promise((resolve) => setTimeout(resolve, 30 * 1000));

  // Poll for the results every 5 seconds.
  const wptResult = await new Promise((resolve, reject) => {
    const pollingInterval = 5 * 1000;

    async function poll() {
      console.log('poll ...');
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
  console.log(traceUrl.href);
  // const traceJson = await fetch(traceUrl.href);
  const traceJson = '';

  return {
    trace: traceJson,
  };
}

async function main() {
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }

  if (fs.existsSync(summaryPath)) {
    loadSummary();
  }

  const tasks = [];
  for (const url of URLS) {
    if (!summary[url]) summary[url] = {mobile: [], desktop: []};

    const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '-');
    for (let i = summary[url].mobile.length; i < NUM_SAMPLES; i++) {
      tasks.push({
        url,
        mobile: true,
        pathPrefix: `${sanitizedUrl}-mobile-${i + 1}`,
      });
    }
    for (let i = summary[url].desktop.length; i < NUM_SAMPLES; i++) {
      tasks.push({
        url,
        mobile: false,
        pathPrefix: `${sanitizedUrl}-desktop-${i + 1}`,
      });
    }
  }

  console.log(`tasks: ${tasks.length}`);
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(task);
    const result = await (task.mobile ? runForMobile(task.url) : runForDesktop(task.url));
    const tracePath = `${task.pathPrefix}-trace.json`;
    fs.writeFileSync(path.join(outputFolder, tracePath), result.trace);
    if (task.mobile) {
      summary[task.url].mobile.push({trace: tracePath});
    } else {
      summary[task.url].desktop.push({trace: tracePath});
    }

    // Only commit changes if all tasks for a URL are done.
    // This ensures that all samples for a URL are collected at
    // the same time (in the same invocation of this script).
    if (i === tasks.length - 1 || task.url !== tasks[i + 1].url) {
      console.log(`tasks done: ${i + 1} / ${tasks.length}`);
      saveSummary();
    }
  }
}

main();
