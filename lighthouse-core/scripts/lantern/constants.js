/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('./collect/common.js').Golden} Golden */

/** @typedef {Golden & {baseline: LanternMetrics, lantern: LanternMetrics}} LanternSiteDefinition */

/** @typedef {{url: string} & LanternMetrics} MasterLanternValues */

/**
 * @typedef LanternMetrics
 * @property {number} optimisticFCP
 * @property {number} optimisticFMP
 * @property {number} optimisticSI
 * @property {number} optimisticTTFCPUI
 * @property {number} optimisticTTI
 * @property {number} pessimisticFCP
 * @property {number} pessimisticFMP
 * @property {number} pessimisticSI
 * @property {number} pessimisticTTFCPUI
 * @property {number} pessimisticTTI
 * @property {number} roughEstimateOfFCP
 * @property {number} roughEstimateOfFMP
 * @property {number} roughEstimateOfSI
 * @property {number} roughEstimateOfTTFCPUI
 * @property {number} roughEstimateOfTTI
 */

const path = require('path');

/* eslint-disable max-len */

module.exports = {
  SITE_INDEX_WITH_GOLDEN_PATH: './lantern-data/golden.json',
  SITE_INDEX_WITH_GOLDEN_WITH_COMPUTED_PATH: path.join(__dirname, '../../../.tmp/golden-plus-computed.json'),
  MASTER_COMPUTED_PATH: path.join(__dirname, '../../test/fixtures/lantern-master-computed-values.json'),
};
