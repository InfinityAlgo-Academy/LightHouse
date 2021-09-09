/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const open = require('open');
const puppeteer = require('puppeteer');
const lighthouse = require('../fraggle-rock/api.js');
const reportGenerator = require('../../report/generator/report-generator.js');

(async () => {
  const browser = await puppeteer.launch({headless: false, slowMo: 50});

  try {
    const page = await browser.newPage();
    const navigationResult1 = await lighthouse.navigation({
      url: 'https://www.mikescerealshack.co',
      page,
    });

    const timespan = await lighthouse.startTimespan({page});
    await page.type('input', 'call of duty');
    const networkQuietPromise = page.waitForNavigation({waitUntil: ['networkidle0']});
    await page.click('button[type=submit]');
    await networkQuietPromise;
    const timespanResult = await timespan.endTimespan();

    const snapshotResult = await lighthouse.snapshot({page});

    const navigationResult2 = await lighthouse.navigation({
      url: 'https://www.mikescerealshack.co/corrections',
      page,
    });

    if (
      !navigationResult1 ||
      !navigationResult2 ||
      !timespanResult ||
      !snapshotResult
    ) throw new Error('No results');

    const flow = {
      lhrs: [navigationResult1.lhr, timespanResult.lhr, snapshotResult.lhr, navigationResult2.lhr],
    };

    fs.writeFileSync(
      `${__dirname}/../test/fixtures/fraggle-rock/reports/sample-lhrs.json`,
      JSON.stringify(flow, null, 2)
    );

    const htmlReport = reportGenerator.generateFlowReportHtml(flow);

    fs.writeFileSync(`${__dirname}/../../flow.report.html`, htmlReport);
    open(`${__dirname}/../../flow.report.html`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
})();
