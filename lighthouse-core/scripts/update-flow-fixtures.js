/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import fs from 'fs';
import assert from 'assert';

import waitForExpect from 'wait-for-expect';
import puppeteer from 'puppeteer';

import {LH_ROOT} from '../../root.js';
import UserFlow from '../fraggle-rock/user-flow.js';


/** @param {puppeteer.Page} page */
async function waitForImagesToLoad(page) {
  const TIMEOUT = 30_000;
  const QUIET_WINDOW = 3_000;

  /** @return {Promise<Array<{src: string, complete: boolean}>>} */
  async function getImageLoadingStates() {
    return page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .map(img => ({
          src: img.src,
          complete: img.complete,
        }))
    );
  }

  await waitForExpect(async () => {
    // First check all images that are in the page are complete.
    const firstRunImages = await getImageLoadingStates();
    const completeImages = firstRunImages.filter(image => image.complete);
    assert.deepStrictEqual(completeImages, firstRunImages);

    // Next check we haven't added any new images in the quiet window.
    await page.waitForTimeout(QUIET_WINDOW);
    const secondRunImages = await getImageLoadingStates();
    assert.deepStrictEqual(secondRunImages, firstRunImages);
  }, TIMEOUT);
}

(async () => {
  const browser = await puppeteer.launch({
    ignoreDefaultArgs: ['--enable-automation'],
    executablePath: process.env.CHROME_PATH,
    headless: false,
  });

  try {
    const page = await browser.newPage();
    const flow = new UserFlow(page);

    await flow.navigate('https://www.mikescerealshack.co');

    await flow.startTimespan({stepName: 'Search input'});
    await page.type('input', 'call of duty');
    const networkQuietPromise = page.waitForNavigation({waitUntil: ['networkidle0']});
    await page.click('button[type=submit]');
    await networkQuietPromise;
    await waitForImagesToLoad(page);
    await flow.endTimespan();

    await flow.snapshot({stepName: 'Search results'});

    await flow.navigate('https://www.mikescerealshack.co/corrections');

    const flowResult = flow.getFlowResult();

    fs.writeFileSync(
      `${LH_ROOT}/lighthouse-core/test/fixtures/fraggle-rock/reports/sample-flow-result.json`,
      JSON.stringify(flowResult, null, 2)
    );

    process.exit(0);
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
})();
