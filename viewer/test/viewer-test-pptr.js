/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

import fs from 'fs';
import assert from 'assert';

import {jest} from '@jest/globals';
import puppeteer from 'puppeteer';

import {server} from '../../lighthouse-cli/test/fixtures/static-server.js';
import defaultConfig from '../../lighthouse-core/config/default-config.js';
import {LH_ROOT} from '../../root.js';
import {getCanonicalLocales} from '../../shared/localization/format.js';

const portNumber = 10200;
const viewerUrl = `http://localhost:${portNumber}/dist/gh-pages/viewer/index.html`;
const sampleLhr = LH_ROOT + '/lighthouse-core/test/results/sample_v2.json';
// eslint-disable-next-line max-len
const sampleFlowResult = LH_ROOT + '/lighthouse-core/test/fixtures/fraggle-rock/reports/sample-flow-result.json';

const lighthouseCategories = Object.keys(defaultConfig.categories);
const getAuditsOfCategory = category => defaultConfig.categories[category].auditRefs;

// These tests run in Chromium and have their own timeouts.
// Make sure we get the more helpful test-specific timeout error instead of jest's generic one.
jest.setTimeout(35_000);

// TODO: should be combined in some way with clients/test/extension/extension-test.js
describe('Lighthouse Viewer', () => {
  // eslint-disable-next-line no-console
  console.log('\n✨ Be sure to have recently run this: yarn build-viewer');

  /** @type {import('puppeteer').Browser} */
  let browser;
  /** @type {import('puppeteer').Page} */
  let viewerPage;
  const pageErrors = [];

  const selectors = {
    audits: '.lh-audit, .lh-metric',
    titles: '.lh-audit__title, .lh-metric__title',
  };

  function getAuditElementsIds({category, selector}) {
    return viewerPage.evaluate(
      ({category, selector}) => {
        const elems = document.querySelector(`#${category}`).parentNode.querySelectorAll(selector);
        return Array.from(elems).map(el => el.id);
      }, {category, selector}
    );
  }

  function getCategoryElementsIds() {
    return viewerPage.evaluate(
      () => {
        return Array.from(document.querySelectorAll(`.lh-category`)).map(el => el.id);
      });
  }

  beforeAll(async () => {
    await server.listen(portNumber, 'localhost');

    // start puppeteer
    browser = await puppeteer.launch({
      headless: true,
    });
    viewerPage = await browser.newPage();
    viewerPage.on('pageerror', pageError => pageErrors.push(pageError));
  });

  afterAll(async function() {
    // Log any page load errors encountered in case before() failed.
    // eslint-disable-next-line no-console
    if (pageErrors.length > 0) console.error(pageErrors);

    await Promise.all([
      server.close(),
      browser && browser.close(),
    ]);
  });

  describe('Renders the flow report', () => {
    beforeAll(async () => {
      await viewerPage.goto(viewerUrl, {waitUntil: 'networkidle2', timeout: 30000});
      const fileInput = await viewerPage.$('#hidden-file-input');
      await fileInput.uploadFile(sampleFlowResult);
      await viewerPage.waitForSelector('.App', {timeout: 30000});
    });

    it('should load with no errors', async () => {
      assert.deepStrictEqual(pageErrors, []);
    });

    it('renders the summary page', async () => {
      const summary = await viewerPage.evaluate(() => document.querySelector('.Summary'));
      assert.ok(summary);

      const scores = await viewerPage.evaluate(() =>
        Array.from(document.querySelectorAll('.lh-gauge__wrapper, .lh-fraction__wrapper'))
      );
      assert.equal(scores.length, 14);

      assert.deepStrictEqual(pageErrors, []);
    });
  });

  describe('Renders the report', () => {
    beforeAll(async function() {
      await viewerPage.goto(viewerUrl, {waitUntil: 'networkidle2', timeout: 30000});
      const fileInput = await viewerPage.$('#hidden-file-input');
      await fileInput.uploadFile(sampleLhr);
      await viewerPage.waitForSelector('.lh-categories', {timeout: 30000});
    });

    it('should load with no errors', async () => {
      assert.deepStrictEqual(pageErrors, []);
    });

    it('should contain all categories', async () => {
      const categories = await getCategoryElementsIds();
      assert.deepStrictEqual(
        categories.sort(),
        lighthouseCategories.sort(),
        `all categories not found`
      );
    });

    it('should contain audits of all categories', async () => {
      for (const category of lighthouseCategories) {
        let expected = getAuditsOfCategory(category);
        if (category === 'performance') {
          expected = getAuditsOfCategory(category).filter(a => a.group !== 'hidden');
        }
        expected = expected.map(audit => audit.id);
        const elementIds = await getAuditElementsIds({category, selector: selectors.audits});

        assert.deepStrictEqual(
          elementIds.sort(),
          expected.sort(),
          `${category} does not have the identical audits`
        );
      }
    });

    it('should contain a filmstrip', async () => {
      const filmstrip = await viewerPage.$('.lh-filmstrip');

      assert.ok(!!filmstrip, `filmstrip is not available`);
    });

    it('should not have any unexpected audit errors', async () => {
      function getErrors(elems, selectors) {
        return elems.map(el => {
          const audit = el.closest(selectors.audits);
          const auditTitle = audit && audit.querySelector(selectors.titles);
          return {
            explanation: el.textContent,
            title: auditTitle ? auditTitle.textContent : 'Audit title unvailable',
          };
        });
      }

      const errorSelectors = '.lh-audit-explanation, .lh-tooltip--error';
      const auditErrors = await viewerPage.$$eval(errorSelectors, getErrors, selectors);
      const errors = auditErrors.filter(item => item.explanation.includes('Audit error:'));
      assert.deepStrictEqual(errors, [], 'Audit errors found within the report');
    });

    it('should support swapping locales', async () => {
      function queryLocaleState() {
        return viewerPage.$$eval('.lh-locale-selector', (elems) => {
          const selectEl = elems[0];
          const optionEls = [...selectEl.querySelectorAll('option')];
          return {
            selectedValue: selectEl.value,
            options: optionEls.map(el => {
              return el.value;
            }),
            sampleString: document.querySelector('.lh-report-icon--copy').textContent,
          };
        });
      }

      const resultBeforeSwap = await queryLocaleState();
      expect(resultBeforeSwap.selectedValue).toBe('en-US');
      expect(resultBeforeSwap.options).toEqual(getCanonicalLocales());
      expect(resultBeforeSwap.sampleString).toBe('Copy JSON');

      await viewerPage.select('.lh-locale-selector', 'es');
      await viewerPage.waitForFunction(() => {
        return document.querySelector('.lh-report-icon--copy').textContent === 'Copiar JSON';
      });

      const resultAfterSwap = await queryLocaleState();
      expect(resultAfterSwap.selectedValue).toBe('es');
      expect(resultAfterSwap.sampleString).toBe('Copiar JSON');
    });
  });

  describe('PSI', () => {
    /** @type {Partial<puppeteer.ResponseForRequest>} */
    let interceptedRequest;
    /** @type {Partial<puppeteer.ResponseForRequest>} */
    let psiResponse;

    const sampleLhrJson = JSON.parse(fs.readFileSync(sampleLhr, 'utf-8'));
    /** @type {Partial<puppeteer.ResponseForRequest>} */
    const goodPsiResponse = {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({lighthouseResult: sampleLhrJson}),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
    /** @type {Partial<puppeteer.ResponseForRequest>} */
    const badPsiResponse = {
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({error: {message: 'badPsiResponse error'}}),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };

    /**
     * Sniffs just the request made to the PSI API. All other requests
     * fall through.
     * To set the mocked PSI response, assign `psiResponse`.
     * To read the intercepted request, use `interceptedRequest`.
     * @param {import('puppeteer').HTTPRequest} request
     */
    function onRequest(request) {
      if (request.url().includes('https://www.googleapis.com')) {
        interceptedRequest = request;
        request.respond(psiResponse);
      } else {
        request.continue();
      }
    }

    beforeAll(async () => {
      await viewerPage.setRequestInterception(true);
      viewerPage.on('request', onRequest);
    });

    afterAll(async () => {
      viewerPage.off('request', onRequest);
      await viewerPage.setRequestInterception(false);
    });

    beforeEach(() => {
      interceptedRequest = undefined;
      psiResponse = undefined;
    });

    it('should call out to PSI with all categories by default', async () => {
      psiResponse = goodPsiResponse;

      const url = `${viewerUrl}?psiurl=https://www.example.com`;
      await viewerPage.goto(url);

      // Wait for report to render.
      await viewerPage.waitForSelector('.lh-metrics-container', {timeout: 5000});

      const interceptedUrl = new URL(interceptedRequest.url());
      expect(interceptedUrl.origin + interceptedUrl.pathname)
        .toEqual('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');

      const params = {
        key: interceptedUrl.searchParams.get('key'),
        url: interceptedUrl.searchParams.get('url'),
        category: interceptedUrl.searchParams.getAll('category'),
        strategy: interceptedUrl.searchParams.get('strategy'),
        locale: interceptedUrl.searchParams.get('locale'),
        utm_source: interceptedUrl.searchParams.get('utm_source'),
      };
      expect(params).toEqual({
        key: 'AIzaSyAjcDRNN9CX9dCazhqI4lGR7yyQbkd_oYE',
        url: 'https://www.example.com',
        // Order in the api call is important to PSI!
        category: [
          'performance',
          'accessibility',
          'seo',
          'best-practices',
          'pwa',
        ],
        strategy: 'mobile',
        // These values aren't set by default.
        locale: null,
        utm_source: null,
      });

      // Confirm that all default categories are used.
      const defaultCategories = Object.keys(defaultConfig.categories).sort();
      expect(interceptedUrl.searchParams.getAll('category').sort()).toEqual(defaultCategories);

      // No errors.
      assert.deepStrictEqual(pageErrors, []);

      // All categories.
      const categoryElementIds = await getCategoryElementsIds();
      assert.deepStrictEqual(
        categoryElementIds.sort(),
        lighthouseCategories.sort(),
        `all categories not found`
      );

      // Should not clear the query string.
      expect(await viewerPage.url()).toEqual(url);
    });

    it('should call out to PSI with specified categories', async () => {
      psiResponse = goodPsiResponse;

      const url = `${viewerUrl}?psiurl=https://www.example.com&category=seo&category=pwa&utm_source=utm&locale=es`;
      await viewerPage.goto(url);

      // Wait for report to render.call out to PSI with specified categories
      await viewerPage.waitForSelector('.lh-metrics-container');

      const interceptedUrl = new URL(interceptedRequest.url());
      expect(interceptedUrl.origin + interceptedUrl.pathname)
        .toEqual('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');

      const params = {
        url: interceptedUrl.searchParams.get('url'),
        category: interceptedUrl.searchParams.getAll('category'),
        locale: interceptedUrl.searchParams.get('locale'),
        utm_source: interceptedUrl.searchParams.get('utm_source'),
      };
      expect(params).toEqual({
        url: 'https://www.example.com',
        category: [
          'seo',
          'pwa',
        ],
        locale: 'es',
        utm_source: 'utm',
      });

      // No errors.
      assert.deepStrictEqual(pageErrors, []);
    });

    it('should handle errors from the API', async () => {
      psiResponse = badPsiResponse;

      const url = `${viewerUrl}?psiurl=https://www.example.com`;
      await viewerPage.goto(url);

      // Wait for error.
      const errorEl = await viewerPage.waitForSelector('#lh-log.lh-show');
      const errorMessage = await viewerPage.evaluate(errorEl => errorEl.textContent, errorEl);
      expect(errorMessage).toBe('badPsiResponse error');

      // One error.
      expect(pageErrors).toHaveLength(1);
      expect(pageErrors[0].message).toContain('badPsiResponse error');
    });
  });
});
