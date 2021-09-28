/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import fs from 'fs';

import open from 'open';
import puppeteer from 'puppeteer';

import {LH_ROOT} from '../../root.js';
import UserFlow from '../fraggle-rock/user-flow.js';

(async () => {
  const browser = await puppeteer.launch({headless: false});

  try {
    const page = await browser.newPage();
    const flow = new UserFlow(page);

    await flow.navigate('https://www.mikescerealshack.co');

    await flow.startTimespan({stepName: 'Search input'});
    await page.type('input', 'call of duty');
    const networkQuietPromise = page.waitForNavigation({waitUntil: ['networkidle0']});
    await page.click('button[type=submit]');
    await networkQuietPromise;
    await flow.endTimespan();

    await flow.snapshot({stepName: 'Search results'});

    await flow.navigate('https://www.mikescerealshack.co/corrections');

    const flowResult = flow.getFlowResult();
    const report = flow.generateReport();

    fs.writeFileSync(
      `${LH_ROOT}/lighthouse-core/test/fixtures/fraggle-rock/reports/sample-lhrs.json`,
      JSON.stringify(flowResult, null, 2)
    );

    fs.writeFileSync(`${LH_ROOT}/flow.report.html`, report);
    open(`${LH_ROOT}/flow.report.html`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
})();
