// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickStartButton,
  getAuditsBreakdown,
  navigateToLighthouseTab,
  setLegacyNavigation,
  setThrottlingMethod,
  waitForResult,
} from '../helpers/lighthouse-helpers.js';
import {click, goToResource, waitFor, setDevToolsSettings, waitForElementWithTextContent} from '../../shared/helper.js';

import type {ElementHandle} from 'puppeteer';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.

// TODO: update upstream.
async function navigateToLighthouseTab_2(path?: string): Promise<ElementHandle<Element>> {
  await click('#tab-lighthouse');
  // await waitForLighthousePanelContentLoaded();
  await waitFor('.view-container > .lighthouse');
  if (path) {
    await goToResource(path);
  }

  return waitFor('.lighthouse-start-view-fr');
}

async function setLegacyNavigation_2(enabled: boolean, textContext = 'Legacy navigation') {
  const toolbarHandle = await waitFor('.lighthouse-settings-pane .toolbar');
  const label = await waitForElementWithTextContent(textContext, toolbarHandle);
  await label.evaluate((label, enabled: boolean) => {
    const rootNode = label.getRootNode() as ShadowRoot;
    const checkboxId = label.getAttribute('for') as string;
    const checkboxElem = rootNode.getElementById(checkboxId) as HTMLInputElement;
    checkboxElem.checked = enabled;
    checkboxElem.dispatchEvent(new Event('change'));  // Need change event to update the backing setting.
  }, enabled);
}

describe('Navigation', async function() {
  // The tests in this suite are particularly slow
  this.timeout(60_000);

  const modes = ['legacy', 'FR'];

  for (const mode of modes) {
    describe(`in ${mode} mode`, () => {
      beforeEach(() => {
        if (mode === 'FR') {
          // TODO: Figure out why these are emitted in FR.
          expectError(/Protocol Error: the message with wrong session id/);
          expectError(/Protocol Error: the message with wrong session id/);
        }
      });

      it('successfully returns a Lighthouse report', async () => {
        await setDevToolsSettings({language: 'en-XL'});
        await navigateToLighthouseTab_2('lighthouse/hello.html');

        await setLegacyNavigation_2(mode === 'legacy', 'L̂éĝáĉý n̂áv̂íĝát̂íôń');
        await clickStartButton();

        const {lhr, artifacts, reportEl} = await waitForResult();

        // TODO: Reenable this for 10.0
        // 9.6.x is forked so Lighthouse ToT is still using 9.5.0 as the version.
        // assert.strictEqual(lhr.lighthouseVersion, '9.6.2');
        assert.match(lhr.finalUrl, /^https:\/\/localhost:[0-9]+\/test\/e2e\/resources\/lighthouse\/hello.html/);
        assert.strictEqual(lhr.configSettings.throttlingMethod, 'simulate');

        const {innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio} = artifacts.ViewportDimensions;
        // This value can vary slightly, depending on the display.
        assert.approximately(innerHeight, 1742, 1);
        assert.strictEqual(innerWidth, 980);
        assert.strictEqual(outerWidth, 360);
        assert.strictEqual(outerHeight, 640);
        assert.strictEqual(devicePixelRatio, 3);

        const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
        assert.strictEqual(auditResults.length, 150);
        assert.strictEqual(erroredAudits.length, 0);
        assert.deepStrictEqual(failedAudits.map(audit => audit.id), [
          'service-worker',
          'viewport',
          'installable-manifest',
          'splash-screen',
          'themed-omnibox',
          'maskable-icon',
          'content-width',
          'document-title',
          'html-has-lang',
          'meta-description',
          'font-size',
          'tap-targets',
        ]);

        const viewTraceText = await reportEl.$eval('.lh-button--trace', viewTraceEl => {
          return viewTraceEl.textContent;
        });
        assert.strictEqual(viewTraceText, 'V̂íêẃ Ôŕîǵîńâĺ T̂ŕâćê');

        assert.strictEqual(lhr.i18n.rendererFormattedStrings.footerIssue, 'F̂íl̂é âń îśŝúê');
      });

      it('successfully returns a Lighthouse report with DevTools throttling', async () => {
        await navigateToLighthouseTab('lighthouse/hello.html');

        await setThrottlingMethod('devtools');
        await setLegacyNavigation(mode === 'legacy');
        await clickStartButton();

        const {lhr, reportEl} = await waitForResult();

        assert.strictEqual(lhr.configSettings.throttlingMethod, 'devtools');

        const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
        assert.strictEqual(auditResults.length, 150);
        assert.strictEqual(erroredAudits.length, 0);
        assert.deepStrictEqual(failedAudits.map(audit => audit.id), [
          'service-worker',
          'viewport',
          'installable-manifest',
          'splash-screen',
          'themed-omnibox',
          'maskable-icon',
          'content-width',
          'document-title',
          'html-has-lang',
          'meta-description',
          'font-size',
          'tap-targets',
        ]);

        const viewTraceText = await reportEl.$eval('.lh-button--trace', viewTraceEl => {
          return viewTraceEl.textContent;
        });
        assert.strictEqual(viewTraceText, 'View Trace');
      });
    });
  }
});
