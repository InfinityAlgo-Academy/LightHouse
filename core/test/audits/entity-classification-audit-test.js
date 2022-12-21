/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import EntityClassification from '../../audits/entity-classification.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {readJson} from '../test-utils.js';

const pwaDevtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

describe('Entity-Classification audit', () => {
  it('classifies all urls in devtoolsLogs', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: pwaDevtoolsLog},
      URL: {finalDisplayedUrl: 'https://pwa.rocks'},
    };
    const results = await EntityClassification.audit(artifacts, {computedCache: new Map()});
    expect(results.score).toBe(1);
    expect(results.details.type).toBe('entity-classification');
    const entities = [
      {
        homepage: undefined,
        isFirstParty: true,
        isUnrecognized: true,
        name: 'pwa.rocks',
      },
      {
        homepage: 'https://marketingplatform.google.com/about/tag-manager/',
        name: 'Google Tag Manager',
      },
      {
        homepage: 'https://marketingplatform.google.com/about/analytics/',
        name: 'Google Analytics',
      },
    ];
    expect(results.details.entities).toEqual(entities);
  });

  it('identifies 1st party URL given finalDisplayedUrl', async () => {
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://example.com'},
          {url: 'https://pwa.rocks/'},
          {url: 'https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW'},
          {url: 'https://www.google-analytics.com/cx/api.js?experiment=jdCfRmudTmy-0USnJ8xPbw'},
          {url: 'https://www.google-analytics.com/cx/api.js?experiment=qvpc5qIfRC2EMnbn6bbN5A'},
        ]),
      },
      URL: {finalDisplayedUrl: 'http://example.com'},
    };
    const results = await EntityClassification.audit(artifacts, {computedCache: new Map()});

    const entities = results.details.entities;
    entities.forEach(entity => {
      // Make sure isFirstParty is missing from entity when falsy.
      if (entity.name === 'example.com') expect(entity.isFirstParty).toBe(true);
      else expect(entity).not.toHaveProperty('isFirstParty');
    });
    expect(entities.map(entity => entity.name)).toEqual([
      'example.com', 'pwa.rocks', 'Google Tag Manager', 'Google Analytics']);
  });

  it('identifies 1st party URL given mainDocumentUrl', async () => {
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://example.com'},
        ]),
      },
      URL: {mainDocumentUrl: 'http://example.com'},
    };
    const results = await EntityClassification.audit(artifacts, {computedCache: new Map()});
    results.details.entities.forEach(entity => {
      // Make sure isFirstParty is missing from entity when falsy.
      if (entity.name === 'example.com') expect(entity.isFirstParty).toBe(true);
      else expect(entity).not.toHaveProperty('isFirstParty');
    });
  });

  it('does not identify 1st party if URL artifact is missing', async () => {
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://example.com'},
          {url: 'https://pwa.rocks/'},
          {url: 'https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW'},
          {url: 'https://www.google-analytics.com/cx/api.js?experiment=jdCfRmudTmy-0USnJ8xPbw'},
          {url: 'https://www.google-analytics.com/cx/api.js?experiment=qvpc5qIfRC2EMnbn6bbN5A'},
        ]),
      },
    };
    const results = await EntityClassification.audit(artifacts, {computedCache: new Map()});
    const entities = results.details.entities;
    entities.forEach(entity => {
      expect(entity).not.toHaveProperty('isFirstParty');
    });
    expect(entities.map(entity => entity.name)).toEqual([
      'example.com', 'pwa.rocks', 'Google Tag Manager', 'Google Analytics']);
  });

  it('prioritizes mainDocumentUrl over finalDisplayUrl when both are available', async () => {
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://example.com'},
          {url: 'https://pwa.rocks/'},
        ]),
      },
      URL: {
        finalDisplayedUrl: 'http://example.com',
        mainDocumentUrl: 'https://pwa.rocks',
      },
    };
    const results = await EntityClassification.audit(artifacts, {computedCache: new Map()});
    const entities = results.details.entities;
    entities.forEach(entity => {
      if (entity.name === 'pwa.rocks') expect(entity.isFirstParty).toBe(true);
      else expect(entity).not.toHaveProperty('isFirstParty');
    });
    expect(entities.map(entity => entity.name)).toEqual(['example.com', 'pwa.rocks']);
  });
});
