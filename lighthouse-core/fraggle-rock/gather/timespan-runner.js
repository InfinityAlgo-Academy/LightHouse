/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('./driver.js');
const Runner = require('../../runner.js');
const {initializeConfig} = require('../config/config.js');
const {getBaseArtifacts} = require('./base-artifacts.js');

/**
 * @param {{page: import('puppeteer').Page, config?: LH.Config.Json}} options
 * @return {Promise<{endTimespan(): Promise<LH.RunnerResult|undefined>}>}
 */
async function startTimespan(options) {
  const {config} = initializeConfig(options.config, {gatherMode: 'timespan'});
  const driver = new Driver(options.page);
  await driver.connect();

  const requestedUrl = await options.page.url();

  /** @type {Record<string, Promise<Error|undefined>>} */
  const artifactErrors = {};

  for (const {id, gatherer} of config.artifacts || []) {
    artifactErrors[id] = await Promise.resolve()
      .then(() => gatherer.instance.beforeTimespan({gatherMode: 'timespan', driver}))
      .catch(err => err);
  }

  return {
    async endTimespan() {
      const finalUrl = await options.page.url();
      return Runner.run(
        async () => {
          const baseArtifacts = getBaseArtifacts(config);
          baseArtifacts.URL.requestedUrl = requestedUrl;
          baseArtifacts.URL.finalUrl = finalUrl;

          /** @type {Partial<LH.GathererArtifacts>} */
          const artifacts = {};

          for (const {id, gatherer} of config.artifacts || []) {
            const artifactName = /** @type {keyof LH.GathererArtifacts} */ (id);
            const artifact = artifactErrors[id]
              ? Promise.reject(artifactErrors[id])
              : await Promise.resolve()
                  .then(() => gatherer.instance.afterTimespan({gatherMode: 'timespan', driver}))
                  .catch(err => err);

            artifacts[artifactName] = artifact;
          }

          return /** @type {LH.Artifacts} */ ({...baseArtifacts, ...artifacts}); // Cast to drop Partial<>
        },
        {
          url: finalUrl,
          config,
        }
      );
    },
  };
}

module.exports = {
  startTimespan,
};
