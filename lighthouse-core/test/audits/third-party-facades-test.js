/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import ThirdPartyFacades from '../../audits/third-party-facades.js';
import networkRecordsToDevtoolsLog from '../network-records-to-devtools-log.js';
import createTestTrace from '../create-test-trace.js';
import pwaTrace from '../fixtures/traces/progressive-app-m60.json';
import pwaDevtoolsLog from '../fixtures/traces/progressive-app-m60.devtools.log.json';
import videoEmbedsTrace from '../fixtures/traces/video-embeds-m84.json';
import videoEmbedsDevtolsLog from '../fixtures/traces/video-embeds-m84.devtools.log.json';
import noThirdPartyTrace from '../fixtures/traces/no-tracingstarted-m74.json';
import {getURLArtifactFromDevtoolsLog} from '../test-utils.js';

function intercomProductUrl(id) {
  return `https://widget.intercom.io/widget/${id}`;
}

function intercomResourceUrl(id) {
  return `https://js.intercomcdn.com/frame-modern.${id}.js`;
}

function youtubeProductUrl(id) {
  return `https://www.youtube.com/embed/${id}`;
}

function youtubeResourceUrl(id) {
  return `https://i.ytimg.com/${id}/maxresdefault.jpg`;
}

/* eslint-env jest */
describe('Third party facades audit', () => {
  it('correctly identifies a third party product with facade alternative', async () => {
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {transferSize: 2000, url: 'https://example.com'},
          {transferSize: 4000, url: intercomProductUrl('1')},
          {transferSize: 8000, url: intercomResourceUrl('a')},
        ]),
      },
      traces: {defaultPass: createTestTrace({timeOrigin: 0, traceEnd: 2000})},
      URL: {mainDocumentUrl: 'https://example.com'},
    };

    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 4}};
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.displayValue).toBeDisplayString('1 facade alternative available');
    expect(results.details.items[0].product)
      .toBeDisplayString('Intercom Widget (Customer Success)');
    expect(results.details.items).toMatchObject([
      {
        transferSize: 12000,
        blockingTime: 0,
        subItems: {
          type: 'subitems',
          items: [
            {
              url: 'https://js.intercomcdn.com/frame-modern.a.js',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 8000,
            },
            {
              url: 'https://widget.intercom.io/widget/1',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 4000,
            },
          ],
        },
      },
    ]);
  });

  it('handles multiple products with facades', async () => {
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {transferSize: 2000, url: 'https://example.com'},
          {transferSize: 4000, url: intercomProductUrl('1')},
          {transferSize: 3000, url: youtubeProductUrl('2')},
          {transferSize: 8000, url: intercomResourceUrl('a')},
          {transferSize: 7000, url: youtubeResourceUrl('b')},
        ]),
      },
      traces: {defaultPass: createTestTrace({timeOrigin: 0, traceEnd: 2000})},
      URL: {mainDocumentUrl: 'https://example.com'},
    };

    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 4}};
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.displayValue).toBeDisplayString('2 facade alternatives available');
    expect(results.details.items[0].product)
      .toBeDisplayString('Intercom Widget (Customer Success)');
    expect(results.details.items[1].product).toBeDisplayString('YouTube Embedded Player (Video)');
    expect(results.details.items).toMatchObject([
      {
        transferSize: 12000,
        blockingTime: 0,
        subItems: {
          type: 'subitems',
          items: [
            {
              url: 'https://js.intercomcdn.com/frame-modern.a.js',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 8000,
            },
            {
              url: 'https://widget.intercom.io/widget/1',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 4000,
            },
          ],
        },
      },
      {
        transferSize: 10000,
        blockingTime: 0,
        subItems: {
          type: 'subitems',
          items: [
            {
              url: 'https://i.ytimg.com/b/maxresdefault.jpg',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 7000,
            },
            {
              url: 'https://www.youtube.com/embed/2',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 3000,
            },
          ],
        },
      },
    ]);
  });

  it('handle multiple requests to same product resource', async () => {
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {transferSize: 2000, url: 'https://example.com'},
          {transferSize: 2000, url: intercomProductUrl('1')},
          {transferSize: 8000, url: intercomResourceUrl('a')},
          {transferSize: 2000, url: intercomProductUrl('1')},
        ]),
      },
      traces: {defaultPass: createTestTrace({timeOrigin: 0, traceEnd: 2000})},
      URL: {mainDocumentUrl: 'https://example.com'},
    };

    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 4}};
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.displayValue).toBeDisplayString('1 facade alternative available');
    expect(results.details.items[0].product)
      .toBeDisplayString('Intercom Widget (Customer Success)');
    expect(results.details.items).toMatchObject([
      {
        transferSize: 12000,
        blockingTime: 0,
        subItems: {
          type: 'subitems',
          items: [
            {
              url: 'https://js.intercomcdn.com/frame-modern.a.js',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 8000,
            },
            {
              url: 'https://widget.intercom.io/widget/1',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 4000,
            },
          ],
        },
      },
    ]);
  });

  it('does not report first party resources', async () => {
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {transferSize: 2000, url: 'https://intercomcdn.com'},
          {transferSize: 4000, url: intercomProductUrl('1')},
        ]),
      },
      traces: {defaultPass: createTestTrace({timeOrigin: 0, traceEnd: 2000})},
      URL: {mainDocumentUrl: 'https://intercomcdn.com'},
    };

    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 4}};
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results).toEqual({
      score: 1,
      notApplicable: true,
    });
  });

  it('only reports resources which have facade alternatives', async () => {
    const artifacts = {
      // This devtools log has third party requests but none have facades
      devtoolsLogs: {defaultPass: pwaDevtoolsLog},
      traces: {defaultPass: pwaTrace},
      URL: getURLArtifactFromDevtoolsLog(pwaDevtoolsLog),
    };

    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 4}};
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results).toEqual({
      score: 1,
      notApplicable: true,
    });
  });

  it('not applicable when no third party resources are present', async () => {
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {transferSize: 2000, url: 'https://example.com'},
        ]),
      },
      traces: {defaultPass: noThirdPartyTrace},
      URL: {mainDocumentUrl: 'https://example.com'},
    };

    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 4}};
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results).toEqual({
      score: 1,
      notApplicable: true,
    });
  });

  it('handles real trace', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: videoEmbedsDevtolsLog},
      traces: {defaultPass: videoEmbedsTrace},
      URL: getURLArtifactFromDevtoolsLog(videoEmbedsDevtolsLog),
    };

    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 4}};
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.displayValue).toBeDisplayString('2 facade alternatives available');
    expect(results.details.items[0].product).toBeDisplayString('YouTube Embedded Player (Video)');
    expect(results.details.items[1].product).toBeDisplayString('Vimeo Embedded Player (Video)');
    expect(results.details.items).toMatchObject(
      [
        {
          transferSize: 651350,
          blockingTime: 0,
          subItems: {
            items: [
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 459603,
                url: 'https://www.youtube.com/s/player/e0d83c30/player_ias.vflset/en_US/base.js',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 66273,
                url: 'https://i.ytimg.com/vi/tgbNymZ7vqY/maxresdefault.jpg',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 50213,
                url: 'https://www.youtube.com/s/player/e0d83c30/www-embed-player.vflset/www-embed-player.js',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 46813,
                url: 'https://www.youtube.com/s/player/e0d83c30/www-player.css',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 11477,
                url: 'https://www.youtube.com/s/player/e0d83c30/player_ias.vflset/en_US/embed.js',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 16971,
                url: {
                  formattedDefault: 'Other resources',
                },
              },
            ],
            type: 'subitems',
          },
        },
        {
          transferSize: 184495,
          blockingTime: 0,
          subItems: {
            items: [
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 145772,
                url: 'https://f.vimeocdn.com/p/3.22.3/js/player.js',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 17633,
                url: 'https://f.vimeocdn.com/p/3.22.3/css/player.css',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 9313,
                url: 'https://i.vimeocdn.com/video/784397921.webp?mw=1200&mh=675&q=70',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 8300,
                url: 'https://player.vimeo.com/video/336812660',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 1474,
                url: 'https://f.vimeocdn.com/js_opt/modules/utils/vuid.min.js',
              },
              {
                blockingTime: 0,
                mainThreadTime: 0,
                transferSize: 2003,
                url: {
                  formattedDefault: 'Other resources',
                },
              },
            ],
            type: 'subitems',
          },
        },
      ]
    );
  });

  describe('.condenseItems', () => {
    it('basic case', () => {
      const items = [
        {url: 'd', transferSize: 500, blockingTime: 5},
        {url: 'b', transferSize: 1000, blockingTime: 0},
        {url: 'c', transferSize: 500, blockingTime: 5},
        {url: 'e', transferSize: 500, blockingTime: 5},
        {url: 'a', transferSize: 5000, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'b', transferSize: 1000, blockingTime: 0},
        {url: {formattedDefault: 'Other resources'}, transferSize: 1500, blockingTime: 15},
      ]);
    });

    it('only shown top 5 items', () => {
      const items = [
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 5},
        {url: 'a', transferSize: 5000, blockingTime: 5},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: {formattedDefault: 'Other resources'}, transferSize: 10000, blockingTime: 10},
      ]);
    });

    it('hide condensed row if total transfer size <1KB', () => {
      const items = [
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'b', transferSize: 100, blockingTime: 0},
        {url: 'c', transferSize: 100, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 5000, blockingTime: 0},
      ]);
    });

    it('always show at least one item', () => {
      const items = [
        {url: 'a', transferSize: 500, blockingTime: 0},
        {url: 'b', transferSize: 500, blockingTime: 0},
        {url: 'c', transferSize: 500, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 500, blockingTime: 0},
        {url: {formattedDefault: 'Other resources'}, transferSize: 1000, blockingTime: 0},
      ]);
    });

    it('single small item', () => {
      const items = [
        {url: 'a', transferSize: 500, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 500, blockingTime: 0},
      ]);
    });

    it('do not condense if only one item to condense', () => {
      const items = [
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'c', transferSize: 500, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'c', transferSize: 500, blockingTime: 0},
      ]);
    });
  });
});
