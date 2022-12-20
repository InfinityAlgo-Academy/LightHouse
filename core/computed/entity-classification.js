/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRecords} from './network-records.js';
import {Util} from '../util.cjs';
import UrlUtils from '../lib/url-utils.js';
import thirdPartyWeb from '../lib/third-party-web.js';

/** @typedef {Map<string, LH.Artifacts.Entity>} EntityCache */

class EntityClassification {
  /**
   * @param {EntityCache} entityCache
   * @param {string} url
   * @return Entity | undefined
   */
  static makeUpAnEntity(entityCache, url) {
    // We can make up an entity only for those URLs with a valid domain attached.
    // So we further restrict from allowed URLs to (/^h/ or http[s] and h2).
    if (!(UrlUtils.isValid(url) && UrlUtils.isProtocolAllowed(url) &&
      Util.createOrReturnURL(url).protocol[0] === 'h')) return;
    const rootDomain = Util.getRootDomain(url);
    if (!rootDomain) return;
    if (entityCache.has(rootDomain)) return entityCache.get(rootDomain);

    const unrecognizedEntity = {
      name: rootDomain,
      company: rootDomain,
      category: '',
      categories: [],
      domains: [rootDomain],
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      totalOccurrences: 0,
      isUnrecognized: true,
    };
    entityCache.set(rootDomain, unrecognizedEntity);
    return unrecognizedEntity;
  }

  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.EntityClassification>}
   */
  static async compute_(data, context) {
    const networkRecords = await NetworkRecords.request(data.devtoolsLog, context);
    /** @type {EntityCache} */
    const madeUpEntityCache = new Map();
    /** @type {Map<string, LH.Artifacts.Entity>} */
    const urlToEntity = new Map();
    /** @type {Map<LH.Artifacts.Entity, Array<string>>} */
    const entityToURLs = new Map();

    for (const record of networkRecords) {
      const {url} = record;
      if (urlToEntity.has(url)) continue;

      const entity = thirdPartyWeb.getEntity(url) ||
        EntityClassification.makeUpAnEntity(madeUpEntityCache, url);
      if (!entity) continue;

      const entityURLs = entityToURLs.get(entity) || [];
      entityURLs.push(url);
      entityToURLs.set(entity, entityURLs);
      urlToEntity.set(url, entity);
    }

    // When available, first party identification will be done via
    // `mainDocumentUrl` (for navigations), and falls back to `finalDisplayedUrl` (for timespan/snapshot).
    // See https://github.com/GoogleChrome/lighthouse/issues/13706
    let firstParty;
    const firstPartyUrl = data.URL?.mainDocumentUrl || data.URL?.finalDisplayedUrl;
    if (firstPartyUrl) {
      firstParty = thirdPartyWeb.getEntity(firstPartyUrl) ||
        EntityClassification.makeUpAnEntity(madeUpEntityCache, firstPartyUrl);
    }

    return {urlToEntity, entityToURLs, firstParty};
  }
}

const EntityClassificationComputed = makeComputedArtifact(EntityClassification, null);
export {EntityClassificationComputed as EntityClassification};
