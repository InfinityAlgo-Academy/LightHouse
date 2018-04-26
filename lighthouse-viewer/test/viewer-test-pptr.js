/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const path = require('path');
const assert = require('assert');
const puppeteer = require('../../node_modules/puppeteer/index.js');

const {server} = require('../../lighthouse-cli/test/fixtures/static-server.js');
const portNumber = 10200;
const viewerUrl = `http://localhost:${portNumber}/lighthouse-viewer/dist/index.html`;
const sampleLhr = __dirname + '/../../lighthouse-core/test/results/sample_v2.json';

const config = require(path.resolve(__dirname, '../../lighthouse-core/config/default-config.js'));
const lighthouseCategories = Object.keys(config.categories);
const getAuditsOfCategory = category => config.categories[category].audits;

// TODO: should be combined in some way with lighthouse-extension/test/extension-test.js
describe('Lighthouse Viewer', function() {
  // eslint-disable-next-line no-console
  console.log('\n✨ Be sure to have recently run this: yarn build-viewer');

  let browser;
  let viewerPage;
  const pageErrors = [];

  function getAuditElementsCount({category, selector}) {
    return viewerPage.evaluate(
      ({category, selector}) =>
        document.querySelector(`#${category}`).parentNode.querySelectorAll(selector).length,
      {category, selector}
    );
  }

  before(async function() {
    server.listen(portNumber, 'localhost');

    // start puppeteer
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH,
    });
    viewerPage = await browser.newPage();
    viewerPage.on('pageerror', pageError => pageErrors.push(pageError));
    await viewerPage.goto(viewerUrl, {waitUntil: 'networkidle2', timeout: 30000});
    const fileInput = await viewerPage.$('#hidden-file-input');
    await fileInput.uploadFile(sampleLhr);
    await viewerPage.waitForSelector('.lh-container', {timeout: 30000});
  });

  after(async function() {
    await Promise.all([
      new Promise(resolve => server.close(resolve)),
      browser && browser.close(),
    ]);
  });


  const selectors = {
    audits: '.lh-audit, .lh-perf-metric, .lh-perf-hint',
    titles: '.lh-score__title, .lh-perf-hint__title, .lh-perf-metric__title',
  };

  it('should load with no errors', async () => {
    assert.deepStrictEqual(pageErrors, []);
  });

  it('should contain all categories', async () => {
    const categories = await viewerPage.$$(`#${lighthouseCategories.join(',#')}`);
    assert.equal(
      categories.length,
      lighthouseCategories.length,
      `${categories.join(' ')} does not match ${lighthouseCategories.join(' ')}`
    );
  });

  it('should contain audits of all categories', async () => {
    for (const category of lighthouseCategories) {
      let expected = getAuditsOfCategory(category).length;
      if (category === 'performance') {
        expected = getAuditsOfCategory(category).filter(a => !!a.group).length;
      }

      const elementCount = await getAuditElementsCount({category, selector: selectors.audits});

      assert.equal(
        expected,
        elementCount,
        `${category} does not have the correct amount of audits`
      );
    }
  });

  it('should contain a filmstrip', async () => {
    const filmstrip = await viewerPage.$('.lh-filmstrip');

    assert.ok(!!filmstrip, `filmstrip is not available`);
  });

  it('should not have any unexpected audit errors', async () => {
    function getDebugStrings(elems, selectors) {
      return elems.map(el => {
        const audit = el.closest(selectors.audits);
        const auditTitle = audit && audit.querySelector(selectors.titles);
        return {
          debugString: el.textContent,
          title: auditTitle ? auditTitle.textContent : 'Audit title unvailable',
        };
      });
    }

    const auditErrors = await viewerPage.$$eval('.lh-debug', getDebugStrings, selectors);
    const errors = auditErrors.filter(item => item.debugString.includes('Audit error:'));
    const unexpectedErrrors = errors.filter(item => {
      return !item.debugString.includes('Required RobotsTxt gatherer did not run');
    });
    assert.deepStrictEqual(unexpectedErrrors, [], 'Audit errors found within the report');
  });
});
