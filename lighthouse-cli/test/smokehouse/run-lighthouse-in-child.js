/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const {spawn, spawnSync} = require('child_process');
const log = require('lighthouse-logger');

const PROTOCOL_TIMEOUT_EXIT_CODE = 67;
const PAGE_HUNG_EXIT_CODE = 68;
const INSECURE_DOCUMENT_REQUEST_EXIT_CODE = 69;
const RETRIES = 3;

/**
 * @param {string} cmd
 * @param {string[]} cmdArgs
 * @return {Promise<{status: number, stdout: string, stderr: string}>}
 */
function spawnAsync(cmd, cmdArgs) {
  let stdout = '';
  let stderr = '';

  return new Promise(resolve => {
    const childProcess = spawn(cmd, cmdArgs);
    childProcess.stdout.on('data', data => (stdout += data.toString()));
    childProcess.stderr.on('data', data => (stderr += data.toString()));
    childProcess.on('exit', code => resolve({status: code === null ? 1 : code, stderr, stdout}));
  });
}

/**
 * Determines if the Lighthouse run ended in an unexpected fatal result.
 * @param {number} exitCode
 * @param {string} outputPath
 */
function isUnexpectedFatalResult(exitCode, outputPath) {
  return exitCode !== 0
    // These runtime errors are currently fatal but "expected" runtime errors we are asserting against.
    && exitCode !== PAGE_HUNG_EXIT_CODE
    && exitCode !== INSECURE_DOCUMENT_REQUEST_EXIT_CODE
    // On runtime errors we exit with a error status code, but still output a report.
    // If the report exists, it wasn't a fatal LH error we need to abort on, it's one we're asserting :)
    && !fs.existsSync(outputPath);
}

/**
 * Launch Chrome and do a full Lighthouse run.
 * @param {string} url
 * @param {string|LH.Config.Json} configPathOrConfig
 * @param {{isDebug?: boolean, isAsync?: boolean, logger?: Pick<Console, 'log'|'error'>, exit?: (code: number) => void}} [options]
 * @return {Promise<Smokehouse.ExpectedRunnerResult>}
 */
async function runLighthouse(url, configPathOrConfig, options = {}) {
  const exitFn = options.exit || process.exit;
  const logger = options.logger || console;
  const isAsync = !!options.isAsync;
  const isDebug = options.isDebug || Boolean(process.env.LH_SMOKE_DEBUG);

  const command = 'node';
  const randInt = Math.round(Math.random() * 100000);
  const outputPath = `smokehouse-${randInt}.report.json`;
  const artifactsDirectory = path.join(__dirname, `../../../.tmp/smokehouse-artifacts-${randInt}`);
  mkdirp.sync(artifactsDirectory);

  let configPath = configPathOrConfig;
  if (typeof configPath !== 'string') {
    configPath = path.join(artifactsDirectory, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(configPathOrConfig));
  }

  const args = [
    'lighthouse-cli/index.js',
    url,
    `--config-path=${configPath}`,
    `--output-path=${outputPath}`,
    '--output=json',
    `-G=${artifactsDirectory}`,
    `-A=${artifactsDirectory}`,
    '--quiet',
    '--port=0',
  ];

  if (process.env.APPVEYOR) {
    // Appveyor is hella slow already, disable CPU throttling so we're not 16x slowdown
    // see https://github.com/GoogleChrome/lighthouse/issues/4891
    args.push('--throttling.cpuSlowdownMultiplier=1');
  }

  // Lighthouse sometimes times out waiting to for a connection to Chrome in CI.
  // Watch for this error and retry relaunching Chrome and running Lighthouse up
  // to RETRIES times. See https://github.com/GoogleChrome/lighthouse/issues/833
  let runResults;
  let runCount = 0;
  do {
    if (runCount > 0) {
      logger.log('  Lighthouse error: timed out waiting for debugger connection. Retrying...');
    }

    runCount++;
    logger.log(`${log.dim}$ ${command} ${args.join(' ')} ${log.reset}`);
    runResults = isAsync
      ? await spawnAsync(command, args)
      : spawnSync(command, args, {encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit']});
  } while (runResults.status === PROTOCOL_TIMEOUT_EXIT_CODE && runCount <= RETRIES);

  if (runResults.status === PROTOCOL_TIMEOUT_EXIT_CODE) {
    logger.error(`Lighthouse debugger connection timed out ${RETRIES} times. Giving up.`);
    exitFn(1);
  } else if (isUnexpectedFatalResult(runResults.status, outputPath)) {
    logger.error(`Lighthouse run failed with exit code ${runResults.status}. stderr to follow:`);
    logger.error(runResults.stderr);
    exitFn(runResults.status);
  }

  if (isDebug) {
    logger.log(`STDOUT: ${runResults.stdout}`);
    logger.error(`STDERR: ${runResults.stderr}`);
  }

  let errorCode;
  let lhr = {requestedUrl: url, finalUrl: url, audits: {}};
  if (runResults.status === PAGE_HUNG_EXIT_CODE) {
    errorCode = 'PAGE_HUNG';
  } else if (runResults.status === INSECURE_DOCUMENT_REQUEST_EXIT_CODE) {
    errorCode = 'INSECURE_DOCUMENT_REQUEST';
  } else {
    lhr = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    if (isDebug) {
      logger.log('LHR output available at: ', outputPath);
    } else if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }

  // Artifacts are undefined if they weren't written to disk (e.g. if there was an error).
  let artifacts;
  try {
    artifacts = JSON.parse(fs.readFileSync(`${artifactsDirectory}/artifacts.json`, 'utf8'));
  } catch (e) {}

  return {
    errorCode,
    lhr,
    artifacts,
  };
}

module.exports = {runLighthouse};
