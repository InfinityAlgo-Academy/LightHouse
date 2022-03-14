/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');

/**
 * @fileoverview Tracks unused JavaScript
 */
class JsUsage extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  constructor() {
    super();
    /** @type {LH.Crdp.Debugger.ScriptParsedEvent[]} */
    this._scriptParsedEvents = [];
    /** @type {LH.Crdp.Profiler.ScriptCoverage[]} */
    this._scriptUsages = [];
    this.onScriptParsed = this.onScriptParsed.bind(this);
  }

  /**
   * @param {LH.Crdp.Debugger.ScriptParsedEvent} event
   */
  onScriptParsed(event) {
    if (event.embedderName) {
      this._scriptParsedEvents.push(event);
    }
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async startInstrumentation(context) {
    this.localSession = await context.driver.createSession();
    await this.localSession.sendCommand('Profiler.enable');
    await this.localSession.sendCommand('Profiler.startPreciseCoverage', {detailed: false});
  }

  async stopInstrumentation() {
    const coverageResponse = await this.localSession.sendCommand('Profiler.takePreciseCoverage');
    this._scriptUsages = coverageResponse.result;
    await this.localSession.sendCommand('Profiler.stopPreciseCoverage');
    await this.localSession.sendCommand('Profiler.disable');
  }

  async startSensitiveInstrumentation() {
    this.localSession.on('Debugger.scriptParsed', this.onScriptParsed);
    await this.localSession.sendCommand('Debugger.enable');
  }

  async stopSensitiveInstrumentation() {
    await this.localSession.sendCommand('Debugger.disable');
    this.localSession.off('Debugger.scriptParsed', this.onScriptParsed);
  }

  /**
   * @return {Promise<LH.Artifacts['JsUsage']>}
   */
  async getArtifact() {
    /** @type {Record<string, LH.Crdp.Profiler.ScriptCoverage>} */
    const usageByScriptId = {};

    for (const scriptUsage of this._scriptUsages) {
      // If `url` is blank, that means the script was anonymous (eval, new Function, onload, ...).
      // Or, it's because it was code Lighthouse over the protocol via `Runtime.evaluate`.
      // We currently don't consider coverage of anonymous scripts, and we definitely don't want
      // coverage of code Lighthouse ran to inspect the page, so we ignore this ScriptCoverage if
      // url is blank.
      if (scriptUsage.url === '') {
        continue;
      }

      usageByScriptId[scriptUsage.scriptId] = scriptUsage;
    }

    return usageByScriptId;
  }
}

module.exports = JsUsage;
