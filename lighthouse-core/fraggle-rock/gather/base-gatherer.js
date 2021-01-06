/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-unused-vars */

/**
 * Base class for all gatherers supporting both Fraggle Rock and the legacy flow.
 * Most extending classes should implement the Fraggle Rock API and let this class handle translation.
 * See lighthouse-core/gather/gatherers/gatherer.js for legacy method explanations.
 *
 * @implements {LH.Gatherer.GathererInstance}
 * @implements {LH.Gatherer.FRGathererInstance}
 */
class FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {supportedModes: []}

  /**
   * Method to gather results about a page in a particular state.
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {LH.Gatherer.PhaseResult}
   */
  snapshot(passContext) { }

  /**
   * Legacy property used to define the artifact ID. In Fraggle Rock, the artifact ID lives on the config.
   * @return {keyof LH.GathererArtifacts}
   */
  get name() {
    // @ts-expect-error - assume that class name has been added to LH.GathererArtifacts.
    return this.constructor.name;
  }

  /**
   * Legacy method. Called before navigation to target url, roughly corresponds to `beforeTimespan`.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {LH.Gatherer.PhaseResult}
   */
  beforePass(passContext) { }

  /**
   * Legacy method. Should never be used by a Fraggle Rock gatherer, here for compat only.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {LH.Gatherer.PhaseResult}
   */
  pass(passContext) { }

  /**
   * Legacy method. Roughly corresponds to `afterTimespan` or `snapshot` depending on type of gatherer.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {LH.Gatherer.PhaseResult}
   */
  afterPass(passContext, loadData) {
    return this.snapshot(passContext);
  }
}

module.exports = FRGatherer;
