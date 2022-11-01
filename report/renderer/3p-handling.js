/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @param {LH.Result} lhr
 */
function buildAuditItemGroups(lhr) {
  // @ts-expect-error
  const entities = lhr.audits['entity-classification']?.details?.entities;

  for (const result of Object.values(lhr.audits)) {
    if (result.details.type !== 'opportunity' || result.details.type !== 'table') continue;

    if (result.details.groups) {
      result.details.oldGroups = result.details.groups;
      delete result.details.groups;
    }

    const groups = new Map();
    const newGroup = {
      groupByColumn: 'entity',
      totalBytes: 0,
      wastedBytes: 0,
    };

    for (const item of result.details.items) {
      if (!item.entity) continue;
      const matchedEntity = entities.find(e => e.name = item.entity);
      if (!matchedEntity) throw new Error('no match!');

      const matchedGroup = groups.get(item.entity) || {...newGroup};
      matchedGroup.groupByValue = item.entity;
      matchedGroup.totalBytes += item.totalBytes;
      matchedGroup.wastedBytes += item.wastedBytes;
      matchedGroup.wastedPercent = matchedGroup.wastedBytes / matchedGroup.totalBytes * 100;
      groups.set(item.entity, matchedGroup);
    }

    result.details.groups = [...groups.values()];

    if (result.details.oldGroups) {
      console.log(result);
    }
  }
}

export {
  buildAuditItemGroups,
}
