/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to show a breakdown of execution timings on the main thread
 */

'use strict';

const Audit = require('./audit');
const Util = require('../report/html/renderer/util');
const {taskGroups} = require('../lib/task-groups');

class MainThreadWorkBreakdown extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'mainthread-work-breakdown',
      title: 'Minimizes main thread work',
      failureTitle: 'Has significant main thread work',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      description: 'Consider reducing the time spent parsing, compiling and executing JS. ' +
        'You may find delivering smaller JS payloads helps with this.',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/s2eqcifkum
      scorePODR: 1500,
      scoreMedian: 4000,
    };
  }

  /**
   * @param {LH.Artifacts.TaskNode[]} tasks
   * @return {Map<string, number>}
   */
  static getExecutionTimingsByGroup(tasks) {
    /** @type {Map<string, number>} */
    const result = new Map();

    for (const task of tasks) {
      const originalTime = result.get(task.group.id) || 0;
      result.set(task.group.id, originalTime + task.selfTime);
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
    const trace = artifacts.traces[MainThreadWorkBreakdown.DEFAULT_PASS];

    const tasks = await artifacts.requestMainThreadTasks(trace);
    const multiplier = settings.throttlingMethod === 'simulate' ?
      settings.throttling.cpuSlowdownMultiplier : 1;

    const executionTimings = MainThreadWorkBreakdown.getExecutionTimingsByGroup(tasks);

    let totalExecutionTime = 0;
    const categoryTotals = {};
    const results = Array.from(executionTimings).map(([groupId, rawDuration]) => {
      const duration = rawDuration * multiplier;
      totalExecutionTime += duration;

      const categoryTotal = categoryTotals[groupId] || 0;
      categoryTotals[groupId] = categoryTotal + duration;

      return {
        group: groupId,
        groupLabel: taskGroups[groupId].label,
        duration: duration,
      };
    });

    const headings = [
      {key: 'groupLabel', itemType: 'text', text: 'Category'},
      {key: 'duration', itemType: 'ms', granularity: 1, text: 'Time Spent'},
    ];

    results.sort((a, b) => categoryTotals[b.group] - categoryTotals[a.group]);
    const tableDetails = MainThreadWorkBreakdown.makeTableDetails(headings, results);

    const score = Audit.computeLogNormalScore(
      totalExecutionTime,
      context.options.scorePODR,
      context.options.scoreMedian
    );

    return {
      score,
      rawValue: totalExecutionTime,
      displayValue: [Util.MS_DISPLAY_VALUE, totalExecutionTime],
      details: tableDetails,
    };
  }
}

module.exports = MainThreadWorkBreakdown;
