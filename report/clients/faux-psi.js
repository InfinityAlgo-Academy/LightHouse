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
  desktopLHR.categories.performance.score = 0.81;

  const lhrs = {
    'mobile': mobileLHR,
    'desktop': desktopLHR,
  };

  for (const [elId, lhr] of Object.entries(lhrs)) {
    await distinguishLHR(lhr, elId);

    const {scoreGaugeEl, perfCategoryEl,
      finalScreenshotDataUri, scoreScaleEl, installFeatures} = prepareLabData(lhr, document);

    const container = document.querySelector(`#${elId}`).querySelector('main');
    container.append(scoreGaugeEl);
    container.append(scoreScaleEl);
    const imgEl = document.createElement('img');
    imgEl.src = finalScreenshotDataUri;
    container.append(imgEl);
    container.append(perfCategoryEl);
    installFeatures(container);
  }
})();


async function distinguishLHR(lhr, elId) {
  lhr.categories.performance.title += ` ${elId}`; // for easier identification

  const finalSS = lhr.audits['final-screenshot'].details.data;
  lhr.audits['final-screenshot'].details.data = await decorateScreenshot(finalSS, elId);

  const fullPageScreenshot = lhr.audits['full-page-screenshot'].details.screenshot.data;
  lhr.audits['full-page-screenshot'].details.screenshot.data = await decorateScreenshot(fullPageScreenshot, elId);
}

async function decorateScreenshot(datauri, elId) {
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
  ctx.fillText(elId === 'mobile' ? '📱' : '💻', img.width / 2, Math.min(img.height / 2, 700));
  return c.toDataURL();
}
