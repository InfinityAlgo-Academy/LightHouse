// @ts-nocheck
import fs from 'fs';

import puppeteer from 'puppeteer';
import open from 'open';
import {createRunner, PuppeteerRunnerExtension} from '@puppeteer/replay';
import {getChromePath} from 'chrome-launcher';

import api from '../../lighthouse-core/fraggle-rock/api.js';
import desktopConfig from '../../lighthouse-core/config/desktop-config.js';

const flow = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: getChromePath(),
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const page = await browser.newPage();

  class Extension extends PuppeteerRunnerExtension {
    async beforeAllSteps(flow) {
      await super.beforeAllSteps(flow);
      this.lhFlow = await api.startFlow(page, {
        config: desktopConfig,
        configContext: {
          settingsOverrides: {
            screenEmulation: {
              disabled: true,
            },
          },
        },
        name: flow.title,
      });
    }

    async beforeEachStep(step, flow) {
      await super.beforeEachStep(step, flow);

      // Don't measure the set viewport step.
      if (step.type === 'setViewport') return;

      if (step.type === 'navigate' || step.assertedEvents?.find(e => e.type === 'navigation')) {
        if (this.lhFlow.currentTimespan) {
          await this.lhFlow.endTimespan();
        }
        await this.lhFlow.startNavigation();
      } else if (!this.lhFlow.currentTimespan) {
        await this.lhFlow.startTimespan();
      }
    }

    async afterEachStep(step, flow) {
      await super.afterEachStep(step, flow);
      // Navigations should only be one step.
      if (this.lhFlow.currentNavigation) {
        await this.lhFlow.endNavigation();
      }
    }

    async afterAllSteps(flow) {
      await super.afterAllSteps(flow);
      if (this.lhFlow.currentTimespan) {
        await this.lhFlow.endTimespan();
      }
      const report = await this.lhFlow.generateReport();
      fs.writeFileSync('flow.report.html', report);
      open('flow.report.html');
    }
  }

  const runner = await createRunner(
    flow,
    new Extension(browser, page, 7000)
  );


  await runner.run();

  await browser.close();
})();
