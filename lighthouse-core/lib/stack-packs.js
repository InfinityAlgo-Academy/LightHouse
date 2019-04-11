/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const stackPacks = require('@lighthouse/stack-packs');

const stackPacksToInclude = [{
  packId: 'wordpress',
  requiredStacks: ['js:wordpress'],
}];

/**
 * @param {LH.Artifacts} artifacts
 * @return {Array<LH.Result.StackPack>}
 */
function getStackPacks(artifacts) {
  /** @type {Array<LH.Result.StackPack>} */
  const packs = [];

  if (artifacts.Stacks) {
    for (const pageStack of artifacts.Stacks) {
      const stackPackToIncl = stackPacksToInclude.find(stackPackToIncl =>
        stackPackToIncl.requiredStacks.includes(`${pageStack.detector}:${pageStack.id}`));
      if (!stackPackToIncl) {
        continue;
      }

      // Grab the full pack definition
      const matchedPack = stackPacks.find(pack => pack.id === stackPackToIncl.packId);
      if (!matchedPack) {
        // we couldn't find a pack that's in our inclusion list, this is weird.
        continue;
      }

      packs.push({
        id: matchedPack.id,
        title: matchedPack.title,
        iconDataURL: matchedPack.iconDataURL,
        descriptions: matchedPack.descriptions,
      });
    }
  }

  return packs;
}

module.exports = {
  getStackPacks,
};
