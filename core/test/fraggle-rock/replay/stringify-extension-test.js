/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {stringify} from '@puppeteer/replay';

import LighthouseStringifyExtension from '../../../fraggle-rock/replay/stringify-extension.js';

describe('LighthouseStringifyExtension', () => {
  it('handles ending timespan', async () => {
    /** @type {import('@puppeteer/replay').Schema.UserFlow} */
    const flowJson = {
      title: 'Test Flow',
      steps: [
        {
          type: 'setViewport',
          width: 757,
          height: 988,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
          isLandscape: false,
        },
        {
          type: 'navigate',
          url: 'https://example.com',
          assertedEvents: [
            {
              type: 'navigation',
              url: 'https://example.com',
              title: '',
            },
          ],
        },
        {
          type: 'click',
          target: 'main',
          selectors: [['#button']],
          offsetY: 13.5625,
          offsetX: 61,
        },
      ],
    };

    const scriptContents = await stringify(flowJson, {
      extension: new LighthouseStringifyExtension(),
    });

    // Trim the output to the relevant stuff
    const endIndex = scriptContents.indexOf('browser.close');
    const relevantOutput = scriptContents.substring(0, endIndex);

    expect(relevantOutput).toMatchSnapshot();
  });

  it('handles ending navigation', async () => {
    /** @type {import('@puppeteer/replay').Schema.UserFlow} */
    const flowJson = {
      title: 'Test Flow',
      steps: [
        {
          type: 'setViewport',
          width: 757,
          height: 988,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
          isLandscape: false,
        },
        {
          type: 'navigate',
          url: 'https://example.com',
          assertedEvents: [
            {
              type: 'navigation',
              url: 'https://example.com',
              title: '',
            },
          ],
        },
        {
          type: 'click',
          target: 'main',
          selectors: [['#button']],
          offsetY: 13.5625,
          offsetX: 61,
        },
        {
          type: 'navigate',
          url: 'https://example.com/page/',
          assertedEvents: [
            {
              type: 'navigation',
              url: 'https://example.com/page/',
              title: '',
            },
          ],
        },
      ],
    };

    const scriptContents = await stringify(flowJson, {
      extension: new LighthouseStringifyExtension(),
    });

    // Trim the output to the relevant stuff
    const endIndex = scriptContents.indexOf('browser.close');
    const relevantOutput = scriptContents.substring(0, endIndex);

    expect(relevantOutput).toMatchSnapshot();
  });

  it('handles multiple sequential navigations', async () => {
    /** @type {import('@puppeteer/replay').Schema.UserFlow} */
    const flowJson = {
      title: 'Test Flow',
      steps: [
        {
          type: 'setViewport',
          width: 757,
          height: 988,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
          isLandscape: false,
        },
        {
          type: 'navigate',
          url: 'https://example.com',
          assertedEvents: [
            {
              type: 'navigation',
              url: 'https://example.com',
              title: '',
            },
          ],
        },
        {
          type: 'click',
          target: 'main',
          selectors: [['#link']],
          offsetY: 13.5625,
          offsetX: 61,
          assertedEvents: [
            {
              type: 'navigation',
              url: 'https://example.com/page',
              title: '',
            },
          ],
        },
      ],
    };

    const scriptContents = await stringify(flowJson, {
      extension: new LighthouseStringifyExtension(),
    });

    // Trim the output to the relevant stuff
    const endIndex = scriptContents.indexOf('browser.close');
    const relevantOutput = scriptContents.substring(0, endIndex);

    expect(relevantOutput).toMatchSnapshot();
  });
});
