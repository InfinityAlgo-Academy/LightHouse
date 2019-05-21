#!/usr/bin/env node
/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const path = require('path');
const yargs = require('yargs');
const log = require('lighthouse-logger');
const {runLighthouse} = require('./run-lighthouse-in-child.js');
const {collateResults, report} = require('./smokehouse-report');

/**
 * Attempt to resolve a path locally. If this fails, attempts to locate the path
 * relative to the current working directory.
 * @param {string} payloadPath
 * @return {string}
 */
function resolveLocalOrCwd(payloadPath) {
  let resolved;
  try {
    resolved = require.resolve('./' + payloadPath);
  } catch (e) {
    const cwdPath = path.resolve(process.cwd(), payloadPath);
    resolved = require.resolve(cwdPath);
  }

  return resolved;
}

async function run() {
  const cli = yargs
    .help('help')
    .describe({
      'config-path': 'The path to the config JSON file',
      'expectations-path': 'The path to the expected audit results file',
      'debug': 'Save the artifacts along with the output',
    })
    .require('config-path', true)
    .require('expectations-path', true)
    .argv;

  const configPath = resolveLocalOrCwd(cli['config-path']);
  /** @type {Smokehouse.ExpectedRunnerResult[]} */
  const expectations = require(resolveLocalOrCwd(cli['expectations-path']));

  // Loop sequentially over expectations, comparing against Lighthouse run, and
  // reporting result.
  let passingCount = 0;
  let failingCount = 0;
  for (const expected of expectations) {
    const requestedUrl = expected.lhr.requestedUrl;
    console.log(`Doing a run of '${requestedUrl}'...`);
    const results = await runLighthouse(requestedUrl, configPath, {isDebug: cli.debug});

    console.log(`Asserting expected results match those found. (${requestedUrl})`);
    const collated = collateResults(results, expected);
    const counts = report(collated);
    passingCount += counts.passed;
    failingCount += counts.failed;
  }

  if (passingCount) {
    console.log(log.greenify(`${passingCount} passing`));
  }
  if (failingCount) {
    console.log(log.redify(`${failingCount} failing`));
    process.exit(1);
  }
}

run();
