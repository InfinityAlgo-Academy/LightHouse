/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview A runner that launches Chrome and executes Lighthouse via DevTools.
 */

import fs from 'fs';
import os from 'os';
import {spawn} from 'child_process';

import {LH_ROOT} from '../../../../root.js';

const devtoolsDir =
  process.env.DEVTOOLS_PATH || `${LH_ROOT}/.tmp/chromium-web-tests/devtools/devtools-frontend`;

/**
 * @param {string[]} logs
 * @param {string} command
 * @param {string[]} args
 */
async function spawnAndLog(logs, command, args) {
  /** @type {Promise<void>} */
  const promise = new Promise((resolve) => {
    const spawnHandle = spawn(command, args);
    spawnHandle.on('close', code => {
      if (code) {
        logs.push(`[FAILURE] Command exited with code: ${code}\n`);
      } else {
        logs.push('[SUCCESS] Command exited with code: 0\n');
      }
      resolve();
    });
    spawnHandle.on('error', (error) => {
      logs.push(`ERROR: ${error.toString()}`);
    });
    spawnHandle.stdout.setEncoding('utf8');
    spawnHandle.stdout.on('data', data => {
      process.stdout.write(data);
      logs.push(`STDOUT: ${data}`);
    });
    spawnHandle.stderr.setEncoding('utf8');
    spawnHandle.stderr.on('data', data => {
      process.stderr.write(data);
      logs.push(`STDERR: ${data}`);
    });
  });
  await promise;
}

/** @type {Promise<void>} */
let buildDevtoolsPromise;
/**
 * @param {string[]} logs
 * Download/pull latest DevTools, build Lighthouse for DevTools, roll to DevTools, and build DevTools.
 */
async function buildDevtools(logs) {
  if (process.env.CI) return;

  process.env.DEVTOOLS_PATH = devtoolsDir;
  await spawnAndLog(logs, 'bash', ['lighthouse-core/test/chromium-web-tests/download-devtools.sh']);
  await spawnAndLog(logs, 'bash', ['lighthouse-core/test/chromium-web-tests/roll-devtools.sh']);
}

/**
 * Launch Chrome and do a full Lighthouse run via DevTools.
 * By default, the latest DevTools frontend is used (.tmp/chromium-web-tests/devtools/devtools-frontend)
 * unless DEVTOOLS_PATH is set.
 * CHROME_PATH determines which Chrome is used–otherwise the default is puppeteer's chrome binary.
 * @param {string} url
 * @param {LH.Config.Json=} configJson
 * @param {{isDebug?: boolean}=} testRunnerOptions
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts, log: string}>}
 */
async function runLighthouse(url, configJson, testRunnerOptions = {}) {
  /** @type {string[]} */
  const logs = [];

  if (!buildDevtoolsPromise) buildDevtoolsPromise = buildDevtools(logs);
  await buildDevtoolsPromise;

  const outputDir = fs.mkdtempSync(os.tmpdir() + '/lh-smoke-cdt-runner-');
  const chromeFlags = [
    `--custom-devtools-frontend=file://${devtoolsDir}/out/Default/gen/front_end`,
  ];
  const args = [
    'run-devtools',
    url,
    `--chrome-flags=${chromeFlags.join(' ')}`,
    '--output-dir', outputDir,
  ];
  if (configJson) {
    args.push('--config', JSON.stringify(configJson));
  }

  await spawnAndLog(logs, 'yarn', args);
  const lhr = JSON.parse(fs.readFileSync(`${outputDir}/lhr-0.json`, 'utf-8'));
  const artifacts = JSON.parse(fs.readFileSync(`${outputDir}/artifacts-0.json`, 'utf-8'));

  if (testRunnerOptions.isDebug) {
    console.log(`${url} results saved at ${outputDir}`);
  } else {
    fs.rmSync(outputDir, {recursive: true, force: true});
  }

  const log = logs.join('') + '\n';
  return {lhr, artifacts, log};
}

export {
  runLighthouse,
};
