/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

jest.setTimeout(180 * 1000);

const fs = require('fs')
const smokeFilenames = fs.readdirSync(__dirname).filter(name => name.includes('.smoke.js'))
const smokeExports = smokeFilenames.map(filename => require(`./${filename}`))

const MAX_PARALLEL_SMOKES = 4

/**
 *
 * @param {Array<Array<{batch?: string}>>} smokeExports
 */
function getTestBatches(smokeExports) {
  // Flatten all of our runs to a single list
  const flattenedDefinitions = smokeExports.reduce((a, b) => a.concat(b))
  // Group everything by batch
  /** @type {Map<string|undefined, any[]>} */
  const groupedByBatch = flattenedDefinitions.reduce((groupMap, definition) => {
    const group = groupMap.get(definition.batch) || []
    group.push(definition)
    groupMap.set(definition.batch, group)
    return groupMap
  }, new Map());

  /** @type {Array<{label: string, definitions: any[]}>} */
  const batches = []
  for (const [batchName, definitions] of groupedByBatch.entries()) {
    if (batchName === 'performance') {
      definitions.forEach((definition, idx) => batches.push({label: `performance#${idx}`, definitions: [definition]}))
    } else if (batchName) {
      batches.push({label: batchName, definitions})
    } else {
      let currentBatch = []
      for (let i = 0; i < definitions.length; i++) {
        if (currentBatch.length >= MAX_PARALLEL_SMOKES) {
          batches.push({label: `unbatched#${Math.floor(i / MAX_PARALLEL_SMOKES)}`, definitions: currentBatch})
          currentBatch = []
        }

        currentBatch.push(definitions[i])
      }

      batches.push({
        label: `unbatched#${Math.floor(definitions.length / MAX_PARALLEL_SMOKES)}`,
        definitions: currentBatch,
      })
    }
  }

  return batches
}

describe('Smoke Tests', () => {
  const batches = getTestBatches(smokeExports)

  describe('Run Lighthouse', () => {
    for (const batch of batches) {
      it(`should collect results for the ${batch.label} batch`, async () => {
        await Promise.all(batch.definitions
          .map(async definition => {
            const results = await runLighthouse(definition.url, definition.config)
            definition.results = results
          }))
      })
    }
  });

  describe('Assert Results', () => {
    for (const batch of batches) {
      describe(batch.label, () => {
        for (const definition of batch.definitions) {
          describe(definition.url, () => {
            definition.describe(() => definition.results)
          })
        }
      })
    }
  });
});
