/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {{devtoolsLog?: string, lhr: string, trace: string}} Result */
/** @typedef {{url: string, wpt: Result[], unthrottled: Result[]}} Summary */

const archiver = require('archiver');
const fs = require('fs');
const readline = require('readline');
const fetch = require('isomorphic-fetch');
const {execFile} = require('child_process');
const {promisify} = require('util');
const execFileAsync = promisify(execFile);
const streamFinished = promisify(require('stream').finished);

const LH_ROOT = `${__dirname}/../../../..`;
const SAMPLES = process.env.SAMPLES ? Number(process.env.SAMPLES) : 9;
const TEST_URLS = process.env.TEST_URLS ? process.env.TEST_URLS.split(' ') : require('./urls.js');

if (!process.env.WPT_KEY) throw new Error('missing WPT_KEY');
const WPT_KEY = process.env.WPT_KEY;
const DEBUG = process.env.DEBUG;

const outputFolder = `${LH_ROOT}/dist/lantern-traces`;
const summaryPath = `${outputFolder}/summary.json`;

class ProgressLogger {
  constructor() {
    this._currentProgressMessage = '';
    this._loadingChars = '⣾⣽⣻⢿⡿⣟⣯⣷ ⠁⠂⠄⡀⢀⠠⠐⠈';
    this._nextLoadingIndex = 0;
    this._progressBarHandle = setInterval(() => this.progress(this._currentProgressMessage), 100);
  }

  /**
   * @param  {...any} args
   */
  log(...args) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    // eslint-disable-next-line no-console
    console.log(...args);
    this.progress(this._currentProgressMessage);
  }

  /**
   * @param {string} message
   */
  progress(message) {
    this._currentProgressMessage = message;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    if (message) process.stdout.write(`${this._nextLoadingChar()} ${message}`);
  }

  closeProgress() {
    clearInterval(this._progressBarHandle);
    this.progress('');
  }

  _nextLoadingChar() {
    const char = this._loadingChars[this._nextLoadingIndex++];
    if (this._nextLoadingIndex >= this._loadingChars.length) {
      this._nextLoadingIndex = 0;
    }
    return char;
  }
}

/**
 *
 * @param {string} archiveDir
 * @param {string} outputPath
 */
function archive(archiveDir, outputPath) {
  const archive = archiver('zip', {
    zlib: {level: 9},
  });

  const writeStream = fs.createWriteStream(outputPath);
  archive.pipe(writeStream);
  archive.directory(archiveDir, false);
  archive.finalize();
  return streamFinished(archive);
}

/** @type {ProgressLogger} */
let log;

/** @type {Summary[]} */
const summary = loadSummary();

/**
 * Resume state from previous invocation of script.
 * @return {Summary[]}
 */
function loadSummary() {
  if (fs.existsSync(summaryPath)) {
    /** @type {Summary[]} */
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    // Remove data if no longer in URLS.
    return summary.filter(urlSet => TEST_URLS.includes(urlSet.url));
  } else {
    return [];
  }
}

function saveSummary() {
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

/**
 * @param {string} filename
 * @param {string} data
 */
function saveData(filename, data) {
  fs.writeFileSync(`${outputFolder}/${filename}`, data);
  return filename;
}

/**
 * @param {string} url
 * @return {Promise<string>}
 */
async function fetchString(url) {
  const response = await fetch(url);
  if (response.ok) return response.text();
  throw new Error(`error fetching ${url}: ${response.status} ${response.statusText}`);
}

/**
 * @param {string} url
 */
async function startWptTest(url) {
  const apiUrl = new URL('https://www.webpagetest.org/runtest.php');
  apiUrl.search = new URLSearchParams({
    k: WPT_KEY,
    f: 'json',
    url,
    // Keep the location constant. Use Chrome and 3G network conditions.
    // Using Beta because we need 78+ traces for LCP.
    location: 'Dulles:Chrome Beta.3G',
    lighthouse: '1',
    // Make the trace file available over /getgzip.php.
    lighthouseTrace: '1',
    // Disable some things that WPT does, such as a "repeat view" analysis.
    type: 'lighthouse',
    mobile: '1',
    // mobileDevice: '1',
  }).toString();
  const wptResponseJson = await fetchString(apiUrl.href);
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
async function runUnthrottledLocally(url) {
  const artifactsFolder = `${LH_ROOT}/.tmp/collect-traces-artifacts`;
  const {stdout} = await execFileAsync('node', [
    `${LH_ROOT}/lighthouse-cli`,
    url,
    '--output=json',
    `-AG=${artifactsFolder}`,
  ], {
    // Default (1024 * 1024) is too small.
    maxBuffer: 10 * 1024 * 1024,
  });
  // Make the JSON small.
  const lhr = JSON.stringify(JSON.parse(stdout));
  const devtoolsLog = fs.readFileSync(`${artifactsFolder}/defaultPass.devtoolslog.json`, 'utf-8');
  const trace = fs.readFileSync(`${artifactsFolder}/defaultPass.trace.json`, 'utf-8');
  return {
    devtoolsLog,
    lhr,
    trace,
  };
}

/**
 * @param {string} url
 * @return {Promise<Result>}
 */
async function runForWpt(url) {
  const {testId, jsonUrl} = await startWptTest(url);
  if (DEBUG) log.log({testId, jsonUrl});

  // Poll for the results every x seconds, where x = position in queue.
  let lhr = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const responseJson = await fetchString(jsonUrl);
    const response = JSON.parse(responseJson);

    if (response.statusCode === 200) {
      lhr = JSON.stringify(response.data.lighthouse);
      break;
    }

    if (response.statusCode >= 100 && response.statusCode < 200) {
      // If behindCount doesn't exist, the test is currently running.
      const secondsToWait = response.data.behindCount || 10;
      if (DEBUG) log.log('poll wpt in', secondsToWait);
      await new Promise((resolve) => setTimeout(resolve, secondsToWait * 1500));
    } else {
      throw new Error(`unexpected response: ${response.statusCode} ${response.statusText}`);
    }
  }

  const traceUrl = new URL('https://www.webpagetest.org/getgzip.php');
  traceUrl.searchParams.set('test', testId);
  traceUrl.searchParams.set('file', 'lighthouse_trace.json');
  const traceJson = await fetchString(traceUrl.href);

  return {
    lhr,
    trace: traceJson,
  };
}

/**
 * @param {() => Promise<Result>} asyncFn
 */
async function repeatUntilPass(asyncFn) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await asyncFn();
    } catch (err) {
      log.log(err, 'error....');
    }
  }
}

async function main() {
  log = new ProgressLogger();

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }

  // Traces are collected for one URL at a time, in series, so all traces are from a small time
  // frame, reducing the chance of a site change affecting results.
  for (const url of TEST_URLS) {
    // This URL has been done on a previous script invocation. Skip it.
    if (summary.find((urlResultSet) => urlResultSet.url === url)) {
      log.log(`already collected traces for ${url}`);
      continue;
    }
    log.log(`collecting traces for ${url}`);

    const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '-');
    /** @type {Result[]} */
    const wptResults = [];
    /** @type {Result[]} */
    const unthrottledResults = [];

    // The closure this makes is too convenient to decompose.
    // eslint-disable-next-line no-inner-declarations
    function updateProgress() {
      const index = TEST_URLS.indexOf(url);
      const wptDone = wptResults.length === SAMPLES;
      const unthrottledDone = unthrottledResults.length === SAMPLES;
      log.progress([
        `${url} (${index + 1} / ${TEST_URLS.length})`,
        'wpt',
        '(' + (wptDone ? 'DONE' : `${wptResults.length + 1} / ${SAMPLES}`) + ')',
        'unthrottledResults',
        '(' + (unthrottledDone ? 'DONE' : `${unthrottledResults.length + 1} / ${SAMPLES}`) + ')',
      ].join(' '));
    }

    updateProgress();

    // Can run in parallel.
    const wptResultsPromises = [];
    for (let i = 0; i < SAMPLES; i++) {
      const resultPromise = repeatUntilPass(() => runForWpt(url));
      // Push to results array as they finish, so the progress indicator can track progress.
      resultPromise.then((result) => wptResults.push(result)).finally(updateProgress);
      wptResultsPromises.push(resultPromise);
    }

    // Must run in series.
    for (let i = 0; i < SAMPLES; i++) {
      const resultPromise = repeatUntilPass(() => runUnthrottledLocally(url));
      unthrottledResults.push(await resultPromise);
      updateProgress();
    }

    await Promise.all(wptResultsPromises);

    const urlResultSet = {
      url,
      wpt: wptResults.map((result, i) => {
        const prefix = `${sanitizedUrl}-mobile-wpt-${i + 1}`;
        return {
          lhr: saveData(`${prefix}-lhr.json`, result.lhr),
          trace: saveData(`${prefix}-trace.json`, result.trace),
        };
      }),
      unthrottled: unthrottledResults.map((result, i) => {
        if (!result.devtoolsLog) throw new Error('expected devtools log');

        const prefix = `${sanitizedUrl}-mobile-unthrottled-${i + 1}`;
        return {
          devtoolsLog: saveData(`${prefix}-devtoolsLog.json`, result.devtoolsLog),
          lhr: saveData(`${prefix}-lhr.json`, result.lhr),
          trace: saveData(`${prefix}-trace.json`, result.trace),
        };
      }),
    };

    // We just collected NUM_SAMPLES * 2 traces, so let's save our progress.
    summary.push(urlResultSet);
    saveSummary();
  }

  log.closeProgress();
  log.log('done! archiving ...');
  await archive(outputFolder, `${LH_ROOT}/dist/lantern-traces.zip`);
}

main();
