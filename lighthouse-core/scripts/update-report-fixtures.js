/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const cli = require('../../lighthouse-cli/run.js');
const cliFlags = require('../../lighthouse-cli/cli-flags.js');
const assetSaver = require('../lib/asset-saver.js');

const artifactPath = 'lighthouse-core/test/results/artifacts';

const {server} = require('../../lighthouse-cli/test/fixtures/static-server.js');

/** @typedef {import('net').AddressInfo} AddressInfo */

/** @type {LH.Config.Json} */
const budgetedConfig = {
  extends: 'lighthouse:default',
  settings: {
    budgets: [{
      resourceSizes: [
        {resourceType: 'script', budget: 125},
        {resourceType: 'total', budget: 500},
      ],
      timings: [
        {metric: 'interactive', budget: 5000, tolerance: 1000},
      ],
      resourceCounts: [
        {resourceType: 'third-party', budget: 0},
      ],
    }],
  },
};

/**
 * Update the report artifacts. If artifactName is set only that artifact will be updated.
 * @param {keyof LH.Artifacts=} artifactName
 */
async function update(artifactName) {
  // get an available port
  server.listen(0, 'localhost');
  const port = await new Promise(res => server.on('listening', () => {
    // Not a pipe or a domain socket, so will not be a string. See https://nodejs.org/api/net.html#net_server_address.
    const address = /** @type {AddressInfo} */ (server.address());
    res(address.port);
  }));

  const oldArtifacts = await assetSaver.loadArtifacts(artifactPath);

  const url = `http://localhost:${port}/dobetterweb/dbw_tester.html`;
  const rawFlags = [
    `--gather-mode=${artifactPath}`,
    '--throttling-method=devtools',
    url,
  ].join(' ');
  const flags = cliFlags.getFlags(rawFlags);
  await cli.runLighthouse(url, flags, budgetedConfig);
  await new Promise(res => server.close(res));

  if (artifactName) {
    // Revert everything except the one artifact
    const newArtifacts = await assetSaver.loadArtifacts(artifactPath);
    if (!(artifactName in newArtifacts) && !(artifactName in oldArtifacts)) {
      console.warn(`❌ Unknown artifact name: '${artifactName}'. Reverting artifacts...`); // eslint-disable-line no-console
    }
    const finalArtifacts = oldArtifacts;
    finalArtifacts[artifactName] = newArtifacts[artifactName];
    await assetSaver.saveArtifacts(finalArtifacts, artifactPath);
  }
}

update(/** @type {keyof LH.Artifacts | undefined} */ (process.argv[2]));
