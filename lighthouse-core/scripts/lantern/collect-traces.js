/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {{trace: string}} Result */
/** @typedef {{url: string, mobile: Result[], desktop: Result[]}} UrlResults */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const https = require('https');
const {execFile} = require('child_process');

const LH_ROOT = path.join(__dirname, '..', '..', '..');
const SAMPLES = 9;
const URLS = [
  'http://www.4399.com/',
  'http://www.4shared.com/',
  'http://www.56.com/',
  'http://www.58.com/',
  'http://www.7k7k.com/',
  'http://www.addthis.com/',
  'http://www.alexa.com/',
  'http://www.amazon.co.jp/',
  'http://www.att.com/',
  'http://www.bing.com/',
  'http://www.blogspot.com/',
  'http://www.brothersoft.com/',
  'http://www.china.com.cn/',
  'http://www.cnet.com/',
  'http://www.cntv.cn/',
  'http://www.conduit.com/',
  'http://www.craigslist.org/',
  'http://www.dawn.com/',
  'http://www.depositfiles.com/',
  'http://www.deviantart.com/',
  'http://www.dion.ne.jp/',
  'http://www.domaintools.com/',
  'http://www.douban.com/',
  'http://www.ebay.com/',
  'http://www.espn.com/',
  'http://www.facebook.com/',
  'http://www.fc2.com/',
  'http://www.filestube.com/',
  'http://www.foxnews.com/',
  'http://www.getpersonas.com/',
  'http://www.globo.com/',
  'http://www.gmx.net/',
  'http://www.hatena.ne.jp/',
  'http://www.hexun.com/',
  'http://www.hotfile.com/',
  'http://www.hp.com/',
  'http://www.huffingtonpost.com/',
  'http://www.hulu.com/',
  'http://www.iciba.com/',
  'http://www.ifeng.com/',
  'http://www.imageshack.us/',
  'http://www.irs.gov/',
  'http://www.java.com/',
  'http://www.linkedin.com/',
  'http://www.livedoor.jp/',
  'http://www.liveperson.net/',
  'http://www.mail.ru/',
  'http://www.maktoob.com/',
  'http://www.marketgid.com/',
  'http://www.metacafe.com/',
  'http://www.metrolyrics.com/',
  'http://www.mlb.com/',
  'http://www.mop.com/',
  'http://www.mozilla.org/',
  'http://www.msn.com/',
  'http://www.netflix.com/',
  'http://www.nih.gov/',
  'http://www.ning.com/',
  'http://www.nokia.com/',
  'http://www.ocn.ne.jp/',
  'http://www.onet.pl/',
  'http://www.optmd.com/',
  'http://www.orange.fr/',
  'http://www.orkut.com/',
  'http://www.partypoker.com/',
  'http://www.pcpop.com/',
  'http://www.pdfqueen.com/',
  'http://www.pptv.com/',
  'http://www.rakuten.co.jp/',
  'http://www.rakuten.ne.jp/',
  'http://www.scribd.com/',
  'http://www.shopping.com/',
  'http://www.skype.com/',
  'http://www.so-net.ne.jp/',
  'http://www.softonic.com/',
  'http://www.sogou.com/',
  'http://www.soso.com/',
  'http://www.symantec.com/',
  'http://www.t-online.de/',
  'http://www.tabelog.com/',
  'http://www.thefreedictionary.com/',
  'http://www.thepiratebay.org/',
  'http://www.thestar.com.my',
  'http://www.tianya.cn/',
  'http://www.torrentz.com/',
  'http://www.tumblr.com/',
  'http://www.twitpic.com/',
  'http://www.typepad.com/',
  'http://www.verizonwireless.com/',
  'http://www.vevo.com/',
  'http://www.weather.com/',
  'http://www.wikipedia.org/',
  'http://www.ynet.com/',
  'http://www.youdao.com/',
  'http://www.zol.com.cn/',
  'https://flipkart.com',
  'https://vine.co/',
  'https://weather.com/',
  'https://www.ebs.in/IPS/',
];

if (!process.env.WPT_KEY) throw new Error('missing WPT_KEY');
const WPT_KEY = process.env.WPT_KEY;
const DEBUG = process.env.DEBUG;

const outputFolder = path.join(LH_ROOT, 'dist', 'lantern-traces');
const summaryPath = path.join(outputFolder, 'summary.json');

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

  close() {
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

const log = new ProgressLogger();

/** @type {UrlResults[]} */
const summary = loadSummary();

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
  apiUrl.searchParams.set('location', 'Dulles:Chrome.3G');
  apiUrl.searchParams.set('lighthouse', '1');
  apiUrl.searchParams.set('lighthouseTrace', '1');
  apiUrl.searchParams.set('type', 'lighthouse');
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
  await new Promise((resolve, reject) => {
    execFile('node', [
      path.join(LH_ROOT, 'lighthouse-cli'),
      url,
      `-G=${artifactsFolder}`,
    ], (_, stderr) => {
      if (stderr) reject(stderr);
      else resolve();
    });
  });
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
  if (DEBUG) log.log({testId, jsonUrl});

  // Poll for the results every x seconds, where x = position in queue.
  // This returns a response of {data: {lighthouse: {...}}}, but we don't
  // care about the LHR so we ignore the response.
  await new Promise((resolve, reject) => {
    async function poll() {
      const responseJson = await fetch(jsonUrl);
      const response = JSON.parse(responseJson);
      if (response.statusCode === 200) {
        resolve(response);
      } else if (response.statusCode >= 100 && response.statusCode < 200) {
        // If behindCount doesn't exist, the test is currently running.
        const secondsToWait = response.data.behindCount || 5;
        if (DEBUG) log.log('poll wpt in', secondsToWait);
        setTimeout(poll, secondsToWait * 1000);
      } else {
        reject(new Error(`unexpected response: ${response.statusCode} ${response.statusText}`));
      }
    }

    poll();
  });

  const traceUrl = new URL('https://www.webpagetest.org/getgzip.php');
  traceUrl.searchParams.set('test', testId);
  traceUrl.searchParams.set('file', 'lighthouse_trace.json');
  const traceJson = await fetch(traceUrl.href);

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
      log.log(err);
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

  let urlIndex = 0;
  for (const urlResultSet of summary) {
    if (urlResultSet.mobile.length === SAMPLES && urlResultSet.desktop.length === SAMPLES) {
      continue;
    }

    const url = urlResultSet.url;
    const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '-');
    log.log(`collecting traces for ${url}`);

    function updateProgress() {
      const mobileDone = mobileResults.length === SAMPLES;
      const desktopDone = desktopResults.length === SAMPLES;
      log.progress([
        `${url} (${urlIndex + 1} / ${URLS.length})`,
        'mobile',
        '(' + (mobileDone ? 'DONE' : `${mobileResults.length + 1} / ${SAMPLES}`) + ')',
        'desktop',
        '(' + (desktopDone ? 'DONE' : `${desktopResults.length + 1} / ${SAMPLES}`) + ')',
      ].join(' '));
    }

    /** @type {Result[]} */
    const mobileResults = [];
    /** @type {Result[]} */
    const desktopResults = [];

    updateProgress();

    const mobileResultsPromises = [];
    for (let i = 0; i < SAMPLES; i++) {
      // Can run in parallel.
      const resultPromise = repeatUntilPass(() => runForMobile(url));
      resultPromise.then((result) => mobileResults.push(result)).finally(updateProgress);
      mobileResultsPromises.push(resultPromise);
    }

    for (let i = 0; i < SAMPLES; i++) {
      // Must run in series.
      const resultPromise = repeatUntilPass(() => runForDesktop(url));
      desktopResults.push(await resultPromise);
      updateProgress();
    }

    await Promise.all(mobileResultsPromises);
    urlResultSet.mobile = mobileResults.map((result, i) => {
      const traceFilename = `${sanitizedUrl}-mobile-${i + 1}-trace.json`;
      fs.writeFileSync(path.join(outputFolder, traceFilename), result.trace);
      return {trace: traceFilename};
    });

    urlResultSet.desktop = desktopResults.map((result, i) => {
      const traceFilename = `${sanitizedUrl}-desktop-${i + 1}-trace.json`;
      fs.writeFileSync(path.join(outputFolder, traceFilename), result.trace);
      return {trace: traceFilename};
    });

    // We just collected NUM_SAMPLES * 2 traces, so let's save our progress.
    saveSummary();
    urlIndex++;
  }

  log.log('done!');
  log.close();
}

main();
