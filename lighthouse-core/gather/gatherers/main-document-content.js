/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const NetworkAnalyzer = require('../../lib/dependency-graph/simulator/network-analyzer.js');
const NetworkRecords = require('../../computed/network-records.js');
const Trace = require('./trace.js');
const {fetchResponseBodyFromCache} = require('../driver/network.js');

/**
 * Collects the content of the main html document.
 */
class MainDocumentContent extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta<'Trace'>} */
  meta = {
    supportedModes: ['navigation'],
    dependencies: {
      Trace: Trace.symbol,
    },
  }

  /**
   *
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @return {Promise<LH.Artifacts['MainDocumentContent']>}
   */
  async _getArtifact(context, networkRecords) {
    const mainResource = NetworkAnalyzer.findMainDocument(networkRecords, context.url);
    const session = context.driver.defaultSession;
    return fetchResponseBodyFromCache(session, mainResource.requestId);
  }
  /**
   *
   * @param {LH.Gatherer.FRTransitionalContext<'Trace'>} context
   * @return {Promise<LH.Artifacts['MainDocumentContent']>}
   */
  async getArtifact(context) {
    const trace = context.dependencies.Trace;
    const networkRecords = await NetworkRecords.request(trace, context);
    return this._getArtifact(context, networkRecords);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['MainDocumentContent']>}
   */
  async afterPass(passContext, loadData) {
    return this._getArtifact({...passContext, dependencies: {}}, loadData.networkRecords);
  }
}

module.exports = MainDocumentContent;
