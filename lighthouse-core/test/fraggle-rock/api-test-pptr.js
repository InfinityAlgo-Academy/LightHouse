/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const path = require('path');
const lighthouse = require('../../fraggle-rock/api.js');
const puppeteer = require('puppeteer');
const StaticServer = require('../../../lighthouse-cli/test/fixtures/static-server.js').Server;

jest.setTimeout(90_000);

describe('Fraggle Rock API', () => {
  /** @type {InstanceType<StaticServer>} */
  let server;
  /** @type {import('puppeteer').Browser} */
  let browser;
  /** @type {import('puppeteer').Page} */
  let page;
  /** @type {string} */
  let serverBaseUrl;

  beforeAll(async () => {
    server = new StaticServer();
    await server.listen(0, '127.0.0.1');
    serverBaseUrl = `http://localhost:${server.getPort()}`;
    browser = await puppeteer.launch({
      headless: true,
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  describe('snapshot', () => {
    beforeEach(() => {
      server.baseDir = path.join(__dirname, '../fixtures/fraggle-rock/snapshot-basic');
    });

    it('should compute accessibility results on the page as-is', async () => {
      await page.goto(`${serverBaseUrl}/onclick.html`);
      // Wait for the javascript to run
      await page.waitForSelector('button');
      await page.click('button');
      // Wait for the violations to appear
      await page.waitForSelector('input');

      const result = await lighthouse.snapshot({page});
      if (!result) throw new Error('Lighthouse failed to produce a result');

      const {lhr} = result;
      const accessibility = lhr.categories.accessibility;
      expect(accessibility.score).toBeLessThan(1);

      const auditResults = accessibility.auditRefs.map(ref => lhr.audits[ref.id]);
      const irrelevantDisplayModes = new Set(['notApplicable', 'manual']);
      const applicableAudits = auditResults
        .filter(audit => !irrelevantDisplayModes.has(audit.scoreDisplayMode));

      const erroredAudits = applicableAudits
        .filter(audit => audit.score === null);
      expect(erroredAudits).toHaveLength(0);

      const failedAuditIds = applicableAudits
        .filter(audit => audit.score !== null && audit.score < 1)
        .map(audit => audit.id);
      expect(failedAuditIds).toContain('label');
    });
  });
});
