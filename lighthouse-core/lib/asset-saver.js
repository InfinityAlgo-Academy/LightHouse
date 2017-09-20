/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const log = require('lighthouse-logger');
const stream = require('stream');
const stringifySafe = require('json-stringify-safe');
const Metrics = require('./traces/pwmetrics-events');

/**
 * Generate basic HTML page of screenshot filmstrip
 * @param {!Array<{timestamp: number, datauri: string}>} screenshots
 * @return {!string}
 */
function screenshotDump(screenshots) {
  return `
  <!doctype html>
  <meta charset="utf-8">
  <title>screenshots</title>
  <style>
html {
    overflow-x: scroll;
    overflow-y: hidden;
    height: 100%;
    background-image: linear-gradient(to left, #4ca1af , #c4e0e5);
    background-attachment: fixed;
    padding: 10px;
}
body {
    white-space: nowrap;
    background-image: linear-gradient(to left, #4ca1af , #c4e0e5);
    width: 100%;
    margin: 0;
}
img {
    margin: 4px;
}
</style>
  <body>
    <script>
      var shots = ${JSON.stringify(screenshots)};

  shots.forEach(s => {
    var i = document.createElement('img');
    i.src = s.datauri;
    i.title = s.timestamp;
    document.body.appendChild(i);
  });
  </script>
  `;
}

/**
 * Save entire artifacts object to a single stringified file located at
 * pathWithBasename + .artifacts.log
 * @param {!Artifacts} artifacts
 * @param {string} pathWithBasename
 */
// Set to ignore because testing it would imply testing fs, which isn't strictly necessary.
/* istanbul ignore next */
function saveArtifacts(artifacts, pathWithBasename) {
  const fullPath = `${pathWithBasename}.artifacts.log`;
  // The networkRecords artifacts have circular references
  fs.writeFileSync(fullPath, stringifySafe(artifacts));
  log.log('artifacts file saved to disk', fullPath);
}

/**
 * Filter traces and extract screenshots to prepare for saving.
 * @param {!Artifacts} artifacts
 * @param {!Audits} audits
 * @return {!Promise<!Array<{traceData: !Object, html: string}>>}
 */
function prepareAssets(artifacts, audits) {
  const passNames = Object.keys(artifacts.traces);
  const assets = [];

  return passNames.reduce((chain, passName) => {
    const trace = artifacts.traces[passName];
    const devtoolsLog = artifacts.devtoolsLogs[passName];

    return chain.then(_ => artifacts.requestScreenshots(trace))
      .then(screenshots => {
        const traceData = Object.assign({}, trace);
        const screenshotsHTML = screenshotDump(screenshots);

        if (audits) {
          const evts = new Metrics(traceData.traceEvents, audits).generateFakeEvents();
          traceData.traceEvents.push(...evts);
        }
        assets.push({
          traceData,
          devtoolsLog,
          screenshotsHTML,
          screenshots,
        });
      });
  }, Promise.resolve())
    .then(_ => assets);
}

/**
 * Generates a JSON representation of traceData line-by-line to avoid OOM due to
 * very large traces.
 * @param {{traceEvents: !Array}} traceData
 * @return {!Iterator<string>}
 */
function* traceJsonGenerator(traceData) {
  const keys = Object.keys(traceData);

  yield '{\n';

  // Stringify and emit trace events separately to avoid a giant string in memory.
  yield '"traceEvents": [\n';
  if (traceData.traceEvents.length > 0) {
    const eventsIterator = traceData.traceEvents[Symbol.iterator]();
    // Emit first item manually to avoid a trailing comma.
    const firstEvent = eventsIterator.next().value;
    yield `  ${JSON.stringify(firstEvent)}`;
    for (const event of eventsIterator) {
      yield `,\n  ${JSON.stringify(event)}`;
    }
  }
  yield '\n]';

  // Emit the rest of the object (usually just `metadata`)
  if (keys.length > 1) {
    for (const key of keys) {
      if (key === 'traceEvents') continue;

      yield `,\n"${key}": ${JSON.stringify(traceData[key], null, 2)}`;
    }
  }

  yield '}\n';
}

/**
 * Save a trace as JSON by streaming to disk at traceFilename.
 * @param {{traceEvents: !Array}} traceData
 * @param {string} traceFilename
 * @return {!Promise<undefined>}
 */
function saveTrace(traceData, traceFilename) {
  return new Promise((resolve, reject) => {
    const traceIter = traceJsonGenerator(traceData);
    // A stream that pulls in the next traceJsonGenerator chunk as writeStream
    // reads from it. Closes stream with null when iteration is complete.
    const traceStream = new stream.Readable({
      read() {
        const next = traceIter.next();
        this.push(next.done ? null : next.value);
      },
    });

    const writeStream = fs.createWriteStream(traceFilename);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);

    traceStream.pipe(writeStream);
  });
}

/**
 * Writes trace(s) and associated screenshot(s) to disk.
 * @param {!Artifacts} artifacts
 * @param {!Audits} audits
 * @param {string} pathWithBasename
 * @return {!Promise}
 */
function saveAssets(artifacts, audits, pathWithBasename) {
  return prepareAssets(artifacts, audits).then(assets => {
    return Promise.all(assets.map((data, index) => {
      const devtoolsLogFilename = `${pathWithBasename}-${index}.devtoolslog.json`;
      fs.writeFileSync(devtoolsLogFilename, JSON.stringify(data.devtoolsLog, null, 2));
      log.log('saveAssets', 'devtools log saved to disk: ' + devtoolsLogFilename);

      const screenshotsHTMLFilename = `${pathWithBasename}-${index}.screenshots.html`;
      fs.writeFileSync(screenshotsHTMLFilename, data.screenshotsHTML);
      log.log('saveAssets', 'screenshots saved to disk: ' + screenshotsHTMLFilename);

      const screenshotsJSONFilename = `${pathWithBasename}-${index}.screenshots.json`;
      fs.writeFileSync(screenshotsJSONFilename, JSON.stringify(data.screenshots, null, 2));
      log.log('saveAssets', 'screenshots saved to disk: ' + screenshotsJSONFilename);

      const streamTraceFilename = `${pathWithBasename}-${index}.trace.json`;
      log.log('saveAssets', 'streaming trace file to disk: ' + streamTraceFilename);
      return saveTrace(data.traceData, streamTraceFilename).then(_ => {
        log.log('saveAssets', 'trace file streamed to disk: ' + streamTraceFilename);
      });
    }));
  });
}

module.exports = {
  saveArtifacts,
  saveAssets,
  prepareAssets,
  saveTrace,
};
