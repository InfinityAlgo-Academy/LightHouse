/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import * as cli from '../../lighthouse-cli/run.js';
import * as cliFlags from '../../lighthouse-cli/cli-flags.js';
import assetSaver from '../lib/asset-saver.js';
import {server} from '../../lighthouse-cli/test/fixtures/static-server.js';
import budgetedConfig from '../test/results/sample-config.js';
import {Util} from '../../report/renderer/util.js';
import walkObject from '../lib/sd-validation/helpers/walk-object.js';

const artifactPath = 'lighthouse-core/test/results/artifacts';
// All artifacts must have resources from a consistent port, to ensure reproducibility.
// https://github.com/GoogleChrome/lighthouse/issues/11776
const MAGIC_SERVER_PORT = 10200;

/**
 * Update the report artifacts. If artifactNames is set only those artifacts will be updated.
 *
 * Possible usage:
 *     yarn sample-artifacts OptimizedImages
 *     yarn sample-artifacts ScriptElements JsUsage MainDocumentContent ResponseCompression
 *
 * @param {Array<keyof LH.Artifacts>} artifactNames
 */
async function update(artifactNames) {
  await server.listen(MAGIC_SERVER_PORT, 'localhost');

  const oldArtifacts = assetSaver.loadArtifacts(artifactPath);

  const url = `http://localhost:${MAGIC_SERVER_PORT}/dobetterweb/dbw_tester.html`;
  const rawFlags = [
    `--gather-mode=${artifactPath}`,
    url,
  ].join(' ');
  const flags = cliFlags.getFlags(rawFlags);
  await cli.runLighthouse(url, flags, budgetedConfig);
  await server.close();

  const rebaselinedArtifacts = assetSaver.loadArtifacts(artifactPath);
  const finalArtifacts = oldArtifacts;

  // Revert everything except the specified artifacts
  if (artifactNames.length) {
    for (const artifactName of artifactNames) {
      if (!(artifactName in rebaselinedArtifacts) && !(artifactName in oldArtifacts)) {
        throw Error('Unknown artifact name: ' + artifactNames);
      }
      const newArtifact = rebaselinedArtifacts[artifactName];
      // @ts-expect-error tsc can't yet express that artifactName is only a single type in each iteration, not a union of types.
      finalArtifacts[artifactName] = newArtifact;
    }
  } else {
    console.warn('This will overwrite ALL artifacts!');
  }

  normalize(finalArtifacts);

  await assetSaver.saveArtifacts(finalArtifacts, artifactPath);
}

/**
 * @param {LH.Artifacts} artifacts
 */
function normalize(artifacts) {
  // Reset timing
  for (const timing of artifacts.Timing) {
    // @ts-expect-error: Value actually is writeable at this point.
    timing.startTime = 0;
    // @ts-expect-error: Value actually is writeable at this point.
    timing.duration = 1;
  }

  applyDeterministicRequestIds(artifacts);
}

/**
 * @param {LH.Artifacts} artifacts
 */
function applyDeterministicRequestIds(artifacts) {
  const oldRequestIdToNew = new Map();
  let requestCounter = 1;

  // First, devtools logs to slurp up all the requestWillBeSent combos of requestId + URL
  // Then, the rest of the artifacts, including devtoolsLogs (again). dtl will need a second pass.
  const objectWalkingPasses = [
    artifacts.devtoolsLogs,
    artifacts,
  ];
  walkObject(objectWalkingPasses, (name, value, path, obj) => {
    if (name !== 'requestId') return;
    if ([...oldRequestIdToNew.values()].includes(value)) return; // already adjusted

    // We need a new happy deterministic id
    if (![...oldRequestIdToNew.keys()].includes(value)) {
      const possibleAttachedUrl = obj?.request?.url;
      // If this isn't defined, we're not dealing with the requestWillBeSent yet.
      // Oftentimes, requestWillBeSentExtraInfo comes first (out of order, yes). But no problem, we'll address these in the second walk pass.
      if (!possibleAttachedUrl) return;

      const count = (requestCounter++).toString().padStart(3, '0');
      const friendlyUrl = Util.parseURL(possibleAttachedUrl).file;
      oldRequestIdToNew.set(value, `${count}-${friendlyUrl}`);
    }

    // Apply the requestId
    if ([...oldRequestIdToNew.keys()].includes(value)) {
      obj.requestId = oldRequestIdToNew.get(value);
    } else {
      throw new Error('Unexpected case. Unknown requestId');
    }
  });
}

update(/** @type {Array<keyof LH.Artifacts>} */ (process.argv.slice(2)));
