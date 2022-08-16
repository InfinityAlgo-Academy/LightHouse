/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import {promisify} from 'util';
import {execFile} from 'child_process';

import {stringify} from '@puppeteer/replay';

import {LH_ROOT} from '../../../../root.js';
import LighthouseStringifyExtension from '../../../fraggle-rock/replay/stringify-extension.js';
import {getAuditsBreakdown, createTestState} from './pptr-test-utils.js';
import {readJson} from '../../test-utils.js';

const execFileAsync = promisify(execFile);
const desktopReplayJson = readJson('core/test/fixtures/fraggle-rock/replay/desktop-test-flow.json');
const mobileReplayJson = readJson('core/test/fixtures/fraggle-rock/replay/mobile-test-flow.json');
const FLOW_JSON_REGEX = /window\.__LIGHTHOUSE_FLOW_JSON__ = (.*);<\/script>/;

describe('Running the stringified output script', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(60_000);

  // Flow JSON specifies port 10200 so we have to use that for the server.
  const state = createTestState();
  state.installServerHooks(10200);

  const tmpDir = `${LH_ROOT}/.tmp/replay`;
  let testTmpDir = '';
  let scriptPath = '';

  before(() => {
    fs.mkdirSync(tmpDir, {recursive: true});
  });

  beforeEach(() => {
    testTmpDir = fs.mkdtempSync(`${tmpDir}/replay-`);
    scriptPath = `${testTmpDir}/stringified.cjs`;
  });

  after(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('generates a valid desktop flow report', async () => {
    const scriptContents = await stringify(desktopReplayJson, {
      extension: new LighthouseStringifyExtension(),
    });

    expect(scriptContents).toMatchSnapshot();
    fs.writeFileSync(scriptPath, scriptContents);

    const {stdout, stderr} = await execFileAsync('node', [scriptPath], {timeout: 50_000});

    // Ensure script didn't quietly report an issue.
    expect(stdout).toEqual('');
    expect(stderr).toEqual('');

    const reportHtml = fs.readFileSync(`${testTmpDir}/flow.report.html`, 'utf-8');
    const flowResultJson = FLOW_JSON_REGEX.exec(reportHtml)?.[1];
    if (!flowResultJson) throw new Error('Could not find flow json');

    /** @type {LH.FlowResult} */
    const flowResult = JSON.parse(flowResultJson);
    expect(flowResult.name).toEqual(desktopReplayJson.title);
    expect(flowResult.steps.map(step => step.lhr.gatherMode)).toEqual([
      'navigation',
      'timespan',
      'navigation',
      'timespan',
    ]);

    for (const {lhr} of flowResult.steps) {
      expect(lhr.configSettings.formFactor).toEqual('desktop');
      expect(lhr.configSettings.screenEmulation.disabled).toBeTruthy();

      const {auditResults, erroredAudits} = getAuditsBreakdown(lhr);
      expect(auditResults.length).toBeGreaterThanOrEqual(10);
      expect(erroredAudits.length).toStrictEqual(0);
    }
  });

  it('generates a valid mobile flow report', async () => {
    const scriptContents = await stringify(mobileReplayJson, {
      extension: new LighthouseStringifyExtension(),
    });

    expect(scriptContents).toMatchSnapshot();
    fs.writeFileSync(scriptPath, scriptContents);

    const {stdout, stderr} = await execFileAsync('node', [scriptPath], {timeout: 50_000});

    // Ensure script didn't quietly report an issue.
    expect(stdout).toEqual('');
    expect(stderr).toEqual('');

    const reportHtml = fs.readFileSync(`${testTmpDir}/flow.report.html`, 'utf-8');
    const flowResultJson = FLOW_JSON_REGEX.exec(reportHtml)?.[1];
    if (!flowResultJson) throw new Error('Could not find flow json');

    /** @type {LH.FlowResult} */
    const flowResult = JSON.parse(flowResultJson);
    expect(flowResult.name).toEqual(mobileReplayJson.title);
    expect(flowResult.steps.map(step => step.lhr.gatherMode)).toEqual([
      'navigation',
      'timespan',
      'navigation',
      'timespan',
    ]);

    for (const {lhr} of flowResult.steps) {
      expect(lhr.configSettings.formFactor).toEqual('mobile');
      expect(lhr.configSettings.screenEmulation.disabled).toBeTruthy();

      const {auditResults, erroredAudits} = getAuditsBreakdown(lhr);
      expect(auditResults.length).toBeGreaterThanOrEqual(10);
      expect(erroredAudits.length).toStrictEqual(0);
    }
  });
});
