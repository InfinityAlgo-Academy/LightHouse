/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import WorkDuringInteraction from '../../audits/work-during-interaction.js';
import interactionTrace from '../fixtures/traces/timespan-responsiveness-m103.trace.json';
import noInteractionTrace from '../fixtures/traces/jumpy-cls-m90.json';

/* eslint-env jest */

describe('Interaction to Next Paint', () => {
  function getTestData() {
    const artifacts = {
      traces: {
        [WorkDuringInteraction.DEFAULT_PASS]: interactionTrace,
      },
      devtoolsLogs: {
        [WorkDuringInteraction.DEFAULT_PASS]: [],
      },
    };

    const context = {
      settings: {throttlingMethod: 'devtools'},
      computedCache: new Map(),
      options: WorkDuringInteraction.defaultOptions,
    };

    return {artifacts, context};
  }

  it('evaluates INP correctly', async () => {
    const {artifacts, context} = getTestData();
    const result = await WorkDuringInteraction.audit(artifacts, context);
    expect(result).toMatchInlineSnapshot(`
Object {
  "details": Object {
    "debugData": Object {
      "interactionType": "mousedown",
      "navStartTs": 218687741273,
      "phases": Object {
        "inputDelay": Object {
          "endTs": 218692850273,
          "startTs": 218692802273,
        },
        "presentationDelay": Object {
          "endTs": 218693194273,
          "startTs": 218692894273,
        },
        "processingDelay": Object {
          "endTs": 218692894273,
          "startTs": 218692850273,
        },
      },
      "type": "debugdata",
    },
    "headings": Array [
      Object {
        "itemType": "text",
        "key": "phase",
        "subItemsHeading": Object {
          "itemType": "url",
          "key": "url",
        },
        "text": "Phase",
      },
      Object {
        "itemType": "ms",
        "key": "total",
        "subItemsHeading": Object {
          "granularity": 1,
          "itemType": "ms",
          "key": "total",
        },
        "text": "Total time",
      },
      Object {
        "itemType": "ms",
        "key": null,
        "subItemsHeading": Object {
          "granularity": 1,
          "itemType": "ms",
          "key": "scripting",
        },
        "text": "Script evaluation",
      },
      Object {
        "itemType": "ms",
        "key": null,
        "subItemsHeading": Object {
          "granularity": 1,
          "itemType": "ms",
          "key": "layout",
        },
        "text": "Style & Layout",
      },
      Object {
        "itemType": "ms",
        "key": null,
        "subItemsHeading": Object {
          "granularity": 1,
          "itemType": "ms",
          "key": "render",
        },
        "text": "Rendering",
      },
    ],
    "items": Array [
      Object {
        "phase": Object {
          "formattedDefault": "Input Delay",
          "i18nId": "lighthouse-core/audits/work-during-interaction.js | inputDelay",
          "values": undefined,
        },
        "subItems": Object {
          "items": Array [
            Object {
              "layout": 0,
              "render": 0,
              "scripting": 0,
              "total": 0,
              "url": "__puppeteer_evaluation_script__",
            },
          ],
          "type": "subitems",
        },
        "total": 48,
      },
      Object {
        "phase": Object {
          "formattedDefault": "Processing Delay",
          "i18nId": "lighthouse-core/audits/work-during-interaction.js | processingDelay",
          "values": undefined,
        },
        "subItems": Object {
          "items": Array [
            Object {
              "layout": 0,
              "render": 0,
              "scripting": 0,
              "total": 0,
              "url": "__puppeteer_evaluation_script__",
            },
          ],
          "type": "subitems",
        },
        "total": 44,
      },
      Object {
        "phase": Object {
          "formattedDefault": "Presentation Delay",
          "i18nId": "lighthouse-core/audits/work-during-interaction.js | presentationDelay",
          "values": undefined,
        },
        "subItems": Object {
          "items": Array [
            Object {
              "layout": 0,
              "render": 0,
              "scripting": 151.72699996829033,
              "total": 167.41800001263618,
              "url": "http://localhost:10200/events.html",
            },
            Object {
              "layout": 0,
              "render": 0,
              "scripting": 1.683999925851822,
              "total": 12.910000056028366,
              "url": "Unattributable",
            },
            Object {
              "layout": 0,
              "render": 0,
              "scripting": 0.6369999945163727,
              "total": 1.0609999895095825,
              "url": "__puppeteer_evaluation_script__",
            },
          ],
          "type": "subitems",
        },
        "total": 300,
      },
    ],
    "summary": undefined,
    "type": "table",
  },
  "score": 0,
}
`);
  });

  it('is not applicable if using simulated throttling', async () => {
    const {artifacts, context} = getTestData();
    context.settings.throttlingMethod = 'simulate';
    const result = await WorkDuringInteraction.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });

  it('is not applicable if no interactions occurred in trace', async () => {
    const {artifacts, context} = getTestData();
    artifacts.traces[WorkDuringInteraction.DEFAULT_PASS] = noInteractionTrace;
    const result = await WorkDuringInteraction.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });
});
