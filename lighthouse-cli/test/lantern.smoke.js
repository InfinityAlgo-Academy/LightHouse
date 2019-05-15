/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const config = {
  extends: 'lighthouse:full',
  settings: {
    onlyCategories: ['performanceormance'],
    precomputedLanternData: {
      additionalRttByOrigin: {
        'http://localhost:10200': 500,
      },
      serverResponseTimeByOrigin: {
        'http://localhost:10200': 1000,
      },
    },
  },
};

module.exports = [
  {
    batch: 'performance',
    url: 'http://localhost:10200/online-only.html',
    config,
    /** @param {() => Promise<Smokehouse.RunResult>} getResults */
    describe(getResults) {
      it('should compute the metric values using precomputedLanternData', async () => {
        const {lhr} = await getResults();
        expect(lhr.audits['first-contentful-paint'].numericValue).toBeGreaterThan(2000);
        expect(lhr.audits['first-cpu-idle'].numericValue).toBeGreaterThan(2000);
        expect(lhr.audits['interactive'].numericValue).toBeGreaterThan(2000);
      });
    },
  },
  {
    batch: 'performance',
    url: 'http://localhost:10200/tricky-main-thread.html?setTimeout',
    config,
    /** @param {() => Promise<Smokehouse.RunResult>} getResults */
    describe(getResults) {
      it('should compute the metric values correctly', async () => {
        const {lhr} = await getResults();

        // The scripts stalls for 3 seconds and lantern has a 4x multiplier so 12s minimum.
        expect(lhr.audits['interactive'].numericValue).toBeGreaterThan(12000);
      });

      it('should attribute bootup time correclty', async () => {
        const {lhr} = await getResults();
        const {items} = lhr.audits['bootup-time'].details;

        expect(items[0].scripting).toBeGreaterThan(1000);

        // FIXME: Appveyor finds the following assertion very flaky for some reason :(
        if (process.env.APPVEYOR) return;
        expect(items[0].url).toContain('main-thread-consumer');
      });
    },
  },
  {
    batch: 'performance',
    url: 'http://localhost:10200/tricky-main-thread.html?fetch',
    config,
    /** @param {() => Promise<Smokehouse.RunResult>} getResults */
    describe(getResults) {
      it('should compute the metric values correctly', async () => {
        const {lhr} = await getResults();

        // The scripts stalls for 3 seconds and lantern has a 4x multiplier so 12s minimum.
        expect(lhr.audits['interactive'].numericValue).toBeGreaterThan(12000);
      });

      it('should attribute bootup time correclty', async () => {
        const {lhr} = await getResults();
        const {items} = lhr.audits['bootup-time'].details;

        expect(items[0].scripting).toBeGreaterThan(1000);

        // TODO: requires sampling profiler and async stacks, see https://github.com/GoogleChrome/lighthouse/issues/8526
        // expect(items[0].url).toContain('main-thread-consumer');
      });
    },
  },
];
