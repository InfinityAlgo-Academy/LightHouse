/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview This file is a glorified call of prepareLabData. */

/* global document window prepareLabData */

(async function __initLighthouseReport__() {
  const mobileLHR = window.__LIGHTHOUSE_JSON__;
  const desktopLHR = JSON.parse(JSON.stringify(mobileLHR));

  const lhrs = {
    'mobile': mobileLHR,
    'desktop': desktopLHR,
  };

  for (const [tabId, lhr] of Object.entries(lhrs)) {
    await distinguishLHR(lhr, tabId);

    const {scoreGaugeEl, perfCategoryEl,
      finalScreenshotDataUri, scoreScaleEl, installFeatures} = prepareLabData(lhr, document);

    const container = document.querySelector(`#${tabId}`).querySelector('main');
    container.append(scoreGaugeEl);
    container.append(scoreScaleEl);
    const imgEl = document.createElement('img');
    imgEl.src = finalScreenshotDataUri;
    container.append(imgEl);
    container.append(perfCategoryEl);
    installFeatures(container);
  }
})();


/**
 * Tweak the LHR to make the desktop and mobile reports easier to identify.
 * Adjusted: Perf category name and score, and emoji placed on top of key screenshots.
 * @param {LH.Report} lhr
 * @param {string} tabId
 */
async function distinguishLHR(lhr, tabId) {
  lhr.categories.performance.title += ` ${tabId}`; // for easier identification
  if (tabId === 'desktop') {
    lhr.categories.performance.score = 0.81;
  }

  const finalSS = lhr.audits['final-screenshot'].details.data;
  lhr.audits['final-screenshot'].details.data = await decorateScreenshot(finalSS, tabId);

  const fullPageScreenshot = lhr.audits['full-page-screenshot'].details.screenshot.data;
  lhr.audits['full-page-screenshot'].details.screenshot.data = await decorateScreenshot(fullPageScreenshot, tabId); // eslint-disable-line max-len
}

/**
 * Add 📱 and 💻 emoji on top of screenshot
 * @param {string} datauri
 * @param {string} tabId
 */
async function decorateScreenshot(datauri, tabId) {
  const img = document.createElement('img');

  await new Promise((resolve, reject) => {
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.src = datauri;
  });
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;

  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  console.log(img.width);
  ctx.font = `${img.width / 2}px serif`;
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.7;
  ctx.fillText(tabId === 'mobile' ? '📱' : '💻', img.width / 2, Math.min(img.height / 2, 700));
  return c.toDataURL();
}
