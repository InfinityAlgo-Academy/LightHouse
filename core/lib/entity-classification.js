import {Audit} from '../audits/audit.js';
import UrlUtils from './url-utils.js';
import {EntityClassification as ComputedEntityClassification} from '../computed/entity-classification.js';

/**
 * @param {LH.Artifacts} artifacts
 * @param {LH.Audit.Context} context
 */
async function getEntityClassification(artifacts, context) {
  const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
  if (!devtoolsLog) return;
  const classifiedEntities = await ComputedEntityClassification.request(
    {URL: artifacts.URL, devtoolsLog}, context);

  /** @type {Array<LH.Result.Entity>} */
  const entities = [];
  /** @type {Record<string, number>} */
  const originLUT = {};
  /** @type {Record<string, number>} */
  const nameLUT = {};

  for (const [entity, entityUrls] of classifiedEntities.entityToURLs.entries()) {
    /** @type {LH.Result.Entity} */
    const shortEntity = {
      name: entity.name,
      homepage: entity.homepage,
    };

    // Reduce payload size in LHR JSON by omitting whats falsy.
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
    entities,
    firstParty: classifiedEntities.firstParty?.name,
    originLUT,
    nameLUT,
  };
}

export {
  getEntityClassification,
};
