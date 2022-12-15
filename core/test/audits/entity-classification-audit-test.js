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
        name: 'pwa.rocks',
        homepage: undefined,
        company: 'pwa.rocks',
        // Identifies first party
        isFirstParty: true,
        // Marks 3pweb-unrecognized parties
        isUnrecognized: true,
      },
      {
        name: 'Google Tag Manager',
        company: 'Google',
        homepage: 'https://marketingplatform.google.com/about/tag-manager/',
      },
      {
        name: 'Google Analytics',
        company: 'Google',
        homepage: 'https://marketingplatform.google.com/about/analytics/',
      },
    ];
    expect(results.details.entities).toEqual(entities);
    // Make sure all entries in LUTs map to an entity.
    expect(results.details.nameLUT).toEqual(
      Object.fromEntries(entities.map(({name}, i) => [name, i]))
    );
    expect(results.details.originLUT).toEqual(
      Object.fromEntries([
        'https://pwa.rocks',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
      ].map((origin, i) => [origin, i]))
    );
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

    const entities = results.details.entities.map(e => e.name);
    results.details.entities.forEach(entity => {
      // Make sure isFirstParty is missing from entity when falsy.
      if (entity.name === 'example.com') expect(entity.isFirstParty).toBe(true);
      else expect(entity).not.toHaveProperty('isFirstParty');
    });
    expect(entities).toEqual([
      'example.com', 'pwa.rocks', 'Google Tag Manager', 'Google Analytics']);
    expect(Object.keys(results.details.nameLUT).length).toBe(4);
    expect(Object.keys(results.details.originLUT).length).toBe(4);
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
      if (entity.name === 'example.com') expect(entity.isFirstParty).toBe(true);
      else expect(entity).not.toHaveProperty('isFirstParty');
    });
    const entities = results.details.entities.map(e => e.name);
    expect(entities).toEqual(['example.com']);
    expect(Object.keys(results.details.nameLUT).length).toBe(1);
    expect(Object.keys(results.details.originLUT).length).toBe(1);
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
    results.details.entities.forEach(entity => {
      expect(entity).not.toHaveProperty('isFirstParty');
    });
    const entities = results.details.entities.map(e => e.name);
    expect(entities).toEqual([
      'example.com', 'pwa.rocks', 'Google Tag Manager', 'Google Analytics']);
    expect(Object.keys(results.details.nameLUT).length).toBe(4);
    expect(Object.keys(results.details.originLUT).length).toBe(4);
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
    results.details.entities.forEach(entity => {
      if (entity.name === 'pwa.rocks') expect(entity.isFirstParty).toEqual(true);
      else expect(entity).not.toHaveProperty('isFirstParty');
    });
    const entities = results.details.entities.map(e => e.name);
    expect(entities).toEqual(['example.com', 'pwa.rocks']);
    expect(Object.keys(results.details.nameLUT).length).toBe(2);
    expect(Object.keys(results.details.originLUT).length).toBe(2);
  });
});
