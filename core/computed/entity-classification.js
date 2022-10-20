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

/** @typedef {Record<string, LH.Artifacts.RecognizableEntity>} EntityCache */

class EntityClassification {
  /**
   * @param {EntityCache} entityCache
   * @param {string} url
   * @return Entity | undefined
   */
  static makeUpAnEntity(entityCache, url) {
    if (!UrlUtils.isValid(url)) return undefined;
    const rootDomain = Util.getRootDomain(url);
    if (!rootDomain) return undefined;
    if (rootDomain in entityCache) return entityCache[rootDomain];

    return /** @type LH.Artifacts.RecognizableEntity */ (entityCache[rootDomain] = {
      name: rootDomain,
      company: rootDomain,
      categories: [],
      domains: [rootDomain],
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      totalOccurrences: 0,
      isUnrecognized: true,
    });
  }

  /**
   *
   * @param {EntityCache} entityCache
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {{byEntity: Map<LH.Artifacts.RecognizableEntity, Array<string>>, byURL: Map<string, LH.Artifacts.RecognizableEntity | undefined>}}
   */
  static classify(entityCache, networkRecords) {
    /** @type {Map<string, LH.Artifacts.RecognizableEntity | undefined>} */
    const byURL = new Map();
    /** @type {Map<LH.Artifacts.RecognizableEntity, Array<string>>} */
    const byEntity = new Map();

    for (const request of networkRecords) {
      const {url} = request;
      if (byURL.has(url)) continue;

      const entity = thirdPartyWeb.getEntity(url) ||
        EntityClassification.makeUpAnEntity(entityCache, url);

      if (!entity) continue;

      byURL.set(url, entity);

      const entityURLs = byEntity.get(entity) || [];
      entityURLs.push(url);
      byEntity.set(entity, entityURLs);
    }

    return {byURL, byEntity};
  }

  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.ClassifiedEntities>}
   */
  static async compute_(data, context) {
    const madeUpEntityCache = /** @type EntityCache */ ({});
    const networkRecords = await NetworkRecords.request(data.devtoolsLog, context);
    const firstParty = thirdPartyWeb.getEntity(data.URL.finalDisplayedUrl) ||
      EntityClassification.makeUpAnEntity(madeUpEntityCache, data.URL.finalDisplayedUrl);
    return {...EntityClassification.classify(madeUpEntityCache, networkRecords), firstParty};
  }
}

const EntityClassificationComputed = makeComputedArtifact(EntityClassification, null);
export {EntityClassificationComputed as EntityClassification};
