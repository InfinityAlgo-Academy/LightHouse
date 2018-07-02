/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/html/renderer/util');
const {taskGroups} = require('../lib/task-groups');

class BootupTime extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'bootup-time',
      title: 'JavaScript boot-up time',
      failureTitle: 'JavaScript boot-up time is too high',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      description: 'Consider reducing the time spent parsing, compiling, and executing JS. ' +
        'You may find delivering smaller JS payloads helps with this. [Learn ' +
        'more](https://developers.google.com/web/tools/lighthouse/audits/bootup).',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions & {thresholdInMs: number}}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/rkphawothk
      // <500ms ~= 100, >2s is yellow, >3.5s is red
      scorePODR: 600,
      scoreMedian: 3500,
      thresholdInMs: 50,
    };
  }

  /**
   * @param {LH.Artifacts.NetworkRequest[]} records
   */
  static getJavaScriptURLs(records) {
    /** @type {Set<string>} */
    const urls = new Set();
    for (const record of records) {
      if (record.resourceType && record.resourceType === 'Script') {
        urls.add(record.url);
      }
    }

    return urls;
  }

  /**
   * @param {LH.Artifacts.TaskNode[]} tasks
   * @param {Set<string>} jsURLs
   * @return {Map<string, Object<string, number>>}
   */
  static getExecutionTimingsByURL(tasks, jsURLs) {
    /** @type {Map<string, Object<string, number>>} */
    const result = new Map();

    for (const task of tasks) {
      const jsURL = task.attributableURLs.find(url => jsURLs.has(url));
      const fallbackURL = task.attributableURLs[0];
      const attributableURL = jsURL || fallbackURL;
      if (!attributableURL || attributableURL === 'about:blank') continue;

      const timingByGroupId = result.get(attributableURL) || {};
      const originalTime = timingByGroupId[task.group.id] || 0;
      timingByGroupId[task.group.id] = originalTime + task.selfTime;
      result.set(attributableURL, timingByGroupId);
    }

    return result;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings || {};
    const trace = artifacts.traces[BootupTime.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[BootupTime.DEFAULT_PASS];
    const networkRecords = await artifacts.requestNetworkRecords(devtoolsLog);
    const tasks = await artifacts.requestMainThreadTasks(trace);
    const multiplier = settings.throttlingMethod === 'simulate' ?
      settings.throttling.cpuSlowdownMultiplier : 1;

    const jsURLs = BootupTime.getJavaScriptURLs(networkRecords);
    const executionTimings = BootupTime.getExecutionTimingsByURL(tasks, jsURLs);

    let totalBootupTime = 0;
    const results = Array.from(executionTimings)
      .map(([url, timingByGroupId]) => {
        // Add up the totalBootupTime for all the taskGroups
        let bootupTimeForURL = 0;
        for (const [groupId, timespanMs] of Object.entries(timingByGroupId)) {
          timingByGroupId[groupId] = timespanMs * multiplier;
          bootupTimeForURL += timespanMs * multiplier;
        }

        // Add up all the execution time of shown URLs
        if (bootupTimeForURL >= context.options.thresholdInMs) {
          totalBootupTime += bootupTimeForURL;
        }

        const scriptingTotal = timingByGroupId[taskGroups.scriptEvaluation.id] || 0;
        const parseCompileTotal = timingByGroupId[taskGroups.scriptParseCompile.id] || 0;

        return {
          url: url,
          total: bootupTimeForURL,
          // Highlight the JavaScript task costs
          scripting: scriptingTotal,
          scriptParseCompile: parseCompileTotal,
        };
      })
      .filter(result => result.total >= context.options.thresholdInMs)
      .sort((a, b) => b.total - a.total);

    const summary = {wastedMs: totalBootupTime};

    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'total', granularity: 1, itemType: 'ms', text: 'Total'},
      {key: 'scripting', granularity: 1, itemType: 'ms', text: taskGroups.scriptEvaluation.label},
      {key: 'scriptParseCompile', granularity: 1, itemType: 'ms',
        text: taskGroups.scriptParseCompile.label},
    ];

    const details = BootupTime.makeTableDetails(headings, results, summary);

    const score = Audit.computeLogNormalScore(
      totalBootupTime,
      context.options.scorePODR,
      context.options.scoreMedian
    );

    return {
      score,
      rawValue: totalBootupTime,
      displayValue: [Util.MS_DISPLAY_VALUE, totalBootupTime],
      details,
    };
  }
}

module.exports = BootupTime;
