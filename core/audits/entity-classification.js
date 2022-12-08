/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {Audit} from './audit.js';
import {EntityClassification as ComputedEntityClassification}
  from '../computed/entity-classification.js';
import UrlUtils from '../lib/url-utils.js';

class EntityClassification extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'entity-classification',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Entity Classification',
      description: 'All 1st and 3rd party entities on the page classified',
      requiredArtifacts: ['devtoolsLogs', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const classifiedEntities = await ComputedEntityClassification.request(
      {URL: artifacts.URL, devtoolsLog}, context);

    /** @type {Array<LH.Audit.Details.EntityClassificationEntity>} */
    const entities = [];
    /** @type {Record<string, number>} */
    const originLUT = {};
    /** @type {Record<string, number>} */
    const nameLUT = {};

    for (const [entity, entityUrls] of classifiedEntities.byEntity.entries()) {
      /** @type {LH.Audit.Details.EntityClassificationEntity} */
      const shortEntity = {
        name: entity.name,
        company: entity.company,
        homepage: entity.homepage,
      };

      // Reduce payload size in LHR by omitting where falsy.
      if (entity === classifiedEntities.firstParty) shortEntity.isFirstParty = true;
      if (entity.isUnrecognized) shortEntity.isUnrecognized = true;

      const id = entities.push(shortEntity) - 1;
      entityUrls.forEach(url => {
        const origin = UrlUtils.getOrigin(url);
        if (!origin) return;
        originLUT[origin] = id;
      });
      nameLUT[shortEntity.name] = id;
    }

    return {
      score: 1,
      details: {
        type: 'entity-classification',
        entities,
        originLUT,
        nameLUT,
      },
    };
  }
}

export default EntityClassification;
