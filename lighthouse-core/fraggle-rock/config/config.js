/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const log = require('lighthouse-logger');
const Runner = require('../../runner.js');
const defaultConfig = require('./default-config.js');
const {isFRGathererDefn} = require('./validation.js');
const {filterConfigByGatherMode} = require('./filters.js');
const {
  deepCloneConfigJson,
  resolveSettings,
  resolveAuditsToDefns,
  resolveGathererToDefn,
} = require('../../config/config-helpers.js');
const defaultConfigPath = path.join(__dirname, './default-config.js');

/**
 * @param {LH.Config.Json|undefined} configJSON
 * @param {{configPath?: string}} context
 * @return {{configWorkingCopy: LH.Config.Json, configDir?: string, configPath?: string}}
 */
function resolveWorkingCopy(configJSON, context) {
  let {configPath} = context;

  if (configPath && !path.isAbsolute(configPath)) {
    throw new Error('configPath must be an absolute path');
  }

  if (!configJSON) {
    configJSON = defaultConfig;
    configPath = defaultConfigPath;
  }

  // The directory of the config path, if one was provided.
  const configDir = configPath ? path.dirname(configPath) : undefined;

  return {
    configWorkingCopy: deepCloneConfigJson(configJSON),
    configPath,
    configDir,
  };
}

/**
 *
 * @param {LH.Config.ArtifactJson[]|null|undefined} artifacts
 * @param {string|undefined} configDir
 * @return {LH.Config.ArtifactDefn[] | null}
 */
function resolveArtifactsToDefns(artifacts, configDir) {
  if (!artifacts) return null;

  const status = {msg: 'Resolve artifact definitions', id: 'lh:config:resolveArtifactsToDefns'};
  log.time(status, 'verbose');

  const coreGathererList = Runner.getGathererList();
  const artifactDefns = artifacts.map(artifactJson => {
    const gatherer = resolveGathererToDefn(artifactJson.gatherer, coreGathererList, configDir);
    if (!isFRGathererDefn(gatherer)) {
      throw new Error(`${gatherer.instance.name} gatherer does not support Fraggle Rock`);
    }

    return {
      id: artifactJson.id,
      gatherer,
    };
  });

  log.timeEnd(status);
  return artifactDefns;
}

/**
 * @param {LH.Config.Json|undefined} configJSON
 * @param {{gatherMode: LH.Gatherer.GatherMode, configPath?: string, settingsOverrides?: LH.SharedFlagsSettings}} context
 * @return {{config: LH.Config.FRConfig, warnings: string[]}}
 */
function initializeConfig(configJSON, context) {
  const status = {msg: 'Initialize config', id: 'lh:config'};
  log.time(status, 'verbose');

  const {configWorkingCopy, configDir} = resolveWorkingCopy(configJSON, context);

  // TODO(FR-COMPAT): handle config extension
  // TODO(FR-COMPAT): handle config plugins
  // TODO(FR-COMPAT): enforce navigation invariants

  const settings = resolveSettings(configWorkingCopy.settings || {}, context.settingsOverrides);
  const artifacts = resolveArtifactsToDefns(configWorkingCopy.artifacts, configDir);

  /** @type {LH.Config.FRConfig} */
  let config = {
    artifacts,
    audits: resolveAuditsToDefns(configWorkingCopy.audits, configDir),
    categories: configWorkingCopy.categories || null,
    groups: configWorkingCopy.groups || null,
    settings,
  };

  // TODO(FR-COMPAT): validate navigations
  // TODO(FR-COMPAT): validate audits
  // TODO(FR-COMPAT): validate categories
  // TODO(FR-COMPAT): filter config using onlyAudits/onlyCategories

  config = filterConfigByGatherMode(config, context.gatherMode);

  log.timeEnd(status);
  return {config, warnings: []};
}

module.exports = {resolveWorkingCopy, initializeConfig};
