/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const path = require('path');
const assert = require('assert');
const fs = require('fs');
const puppeteer = require('../../node_modules/puppeteer/index.js');

const lighthouseExtensionPath = path.resolve(__dirname, '../dist');
const config = require(path.resolve(__dirname, '../../lighthouse-core/config/default.js'));

const getAuditsOfCategory = category => config.categories[category].audits;

// eslint-disable-next-line
function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }


describe('Lighthouse chrome extension', function() {
  const manifestLocation = path.join(lighthouseExtensionPath, 'manifest.json');
  const lighthouseCategories = Object.keys(config.categories);
  let browser;
  let extensionPage;
  let originalManifest;

  function getAuditElementsCount({category, selector}) {
    return extensionPage.evaluate(
      ({category, selector}) =>
        document.querySelector(`#${category}`).parentNode.querySelectorAll(selector).length,
      {category, selector}
    );
  }

  before(_asyncToGenerator(function* () {
    // eslint-disable-next-line
    this.timeout(90 * 1000);

    // read original manifest
    originalManifest = fs.readFileSync(manifestLocation);

    const manifest = JSON.parse(originalManifest);
    // add tabs permision to the manifest
    manifest.permissions.push('tabs');
    // write new file to document
    fs.writeFileSync(manifestLocation, JSON.stringify(manifest, null, 2));

    // start puppeteer
    browser = yield puppeteer.launch({
      headless: false,
      executablePath: process.env.CHROME_PATH,
      args: [
        `--disable-extensions-except=${lighthouseExtensionPath}`,
        `--load-extension=${lighthouseExtensionPath}`,
      ],
    });

    const page = yield browser.newPage();
    yield page.goto('https://www.paulirish.com', {waitUntil: 'networkidle2'});
    const targets = yield browser.targets();
    const extensionTarget = targets.find(function({_targetInfo}) {
      return _targetInfo.title === 'Lighthouse' && _targetInfo.type === 'background_page';
    });

    if (!extensionTarget) {
      return yield browser.close();
    }

    const client = yield extensionTarget.createCDPSession();
    const lighthouseResult = yield client.send('Runtime.evaluate', {
      expression: `runLighthouseInExtension({
        restoreCleanState: true,
      }, ${JSON.stringify(lighthouseCategories)})`,
      awaitPromise: true,
      returnByValue: true,
    });

    if (lighthouseResult.exceptionDetails) {
      if (lighthouseResult.exceptionDetails.exception) {
        throw new Error(lighthouseResult.exceptionDetails.exception.description);
      }

      throw new Error(lighthouseResult.exceptionDetails.text);
    }

    extensionPage = (yield browser.pages()).find(page =>
      page.url().includes('blob:chrome-extension://')
    );
  }));

  after(_asyncToGenerator(function* () {
    // put the default manifest back
    fs.writeFileSync(manifestLocation, originalManifest);

    if (browser) {
      yield browser.close();
    }
  }));


  const selectors = {
    audits: '.lh-audit,.lh-timeline-metric,.lh-perf-hint',
    titles: '.lh-score__title, .lh-perf-hint__title, .lh-timeline-metric__title',
  };

  it('should contain all categories', _asyncToGenerator(function* () {
    const categories = yield extensionPage.$$(`#${lighthouseCategories.join(',#')}`);
    assert.equal(
      categories.length,
      lighthouseCategories.length,
      `${categories.join(' ')} does not match ${lighthouseCategories.join(' ')}`
    );
  }));

  it('should contain audits of all categories', _asyncToGenerator(function* () {
    for (const category of lighthouseCategories) {
      let expected = getAuditsOfCategory(category).length;
      if (category === 'performance') {
        expected = getAuditsOfCategory(category).filter(a => !!a.group).length;
      }

      const elementCount = yield getAuditElementsCount({category, selector: selectors.audits});

      assert.equal(
        expected,
        elementCount,
        `${category} does not have the correct amount of audits`
      );
    }
  }));

  it('should contain a filmstrip', _asyncToGenerator(function* () {
    const filmstrip = yield extensionPage.$('.lh-filmstrip');

    assert.ok(!!filmstrip, `filmstrip is not available`);
  }));

  it('should not have any audit errors', _asyncToGenerator(function* () {
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

    const auditErrors = yield extensionPage.$$eval('.lh-debug', getDebugStrings, selectors);
    const errors = auditErrors.filter(
      item =>
        item.debugString.includes('Audit error:') &&
        // FIXME(phulce): fix timing failing on travis.
        !item.debugString.includes('No timing information available')
    );
    assert.deepStrictEqual(errors, [], 'Audit errors found within the report');
  }));
});
