/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const DevtoolsTimelineModel = require('../lib/traces/devtools-timeline-model');
const WebInspector = require('../lib/web-inspector');
const Util = require('../report/v2/renderer/util.js');

const group = {
  loading: 'Network request loading',
  parseHTML: 'Parsing DOM',
  styleLayout: 'Style & Layout',
  compositing: 'Compositing',
  painting: 'Paint',
  gpu: 'GPU',
  scripting: 'Script Evaluation',
  scriptParseCompile: 'Script Parsing & Compile',
  scriptGC: 'Garbage collection',
  other: 'Other',
  images: 'Images',
};
const taskToGroup = {
  'Animation': group.painting,
  'Async Task': group.other,
  'Frame Start': group.painting,
  'Frame Start (main thread)': group.painting,
  'Cancel Animation Frame': group.scripting,
  'Cancel Idle Callback': group.scripting,
  'Compile Script': group.scriptParseCompile,
  'Composite Layers': group.compositing,
  'Console Time': group.scripting,
  'Image Decode': group.images,
  'Draw Frame': group.painting,
  'Embedder Callback': group.scripting,
  'Evaluate Script': group.scripting,
  'Event': group.scripting,
  'Animation Frame Fired': group.scripting,
  'Fire Idle Callback': group.scripting,
  'Function Call': group.scripting,
  'DOM GC': group.scriptGC,
  'GC Event': group.scriptGC,
  'GPU': group.gpu,
  'Hit Test': group.compositing,
  'Invalidate Layout': group.styleLayout,
  'JS Frame': group.scripting,
  'Input Latency': group.scripting,
  'Layout': group.styleLayout,
  'Major GC': group.scriptGC,
  'DOMContentLoaded event': group.scripting,
  'First paint': group.painting,
  'FMP': group.painting,
  'FMP candidate': group.painting,
  'Load event': group.scripting,
  'Minor GC': group.scriptGC,
  'Paint': group.painting,
  'Paint Image': group.images,
  'Paint Setup': group.painting,
  'Parse Stylesheet': group.parseHTML,
  'Parse HTML': group.parseHTML,
  'Parse Script': group.scriptParseCompile,
  'Other': group.other,
  'Rasterize Paint': group.painting,
  'Recalculate Style': group.styleLayout,
  'Request Animation Frame': group.scripting,
  'Request Idle Callback': group.scripting,
  'Request Main Thread Frame': group.painting,
  'Image Resize': group.images,
  'Finish Loading': group.loading,
  'Receive Data': group.loading,
  'Receive Response': group.loading,
  'Send Request': group.loading,
  'Run Microtasks': group.scripting,
  'Schedule Style Recalculation': group.styleLayout,
  'Scroll': group.compositing,
  'Task': group.other,
  'Timer Fired': group.scripting,
  'Install Timer': group.scripting,
  'Remove Timer': group.scripting,
  'Timestamp': group.scripting,
  'Update Layer': group.compositing,
  'Update Layer Tree': group.compositing,
  'User Timing': group.scripting,
  'Create WebSocket': group.scripting,
  'Destroy WebSocket': group.scripting,
  'Receive WebSocket Handshake': group.scripting,
  'Send WebSocket Handshake': group.scripting,
  'XHR Load': group.scripting,
  'XHR Ready State Change': group.scripting,
};

class BootupTime extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'bootup-time',
      description: 'JavaScript boot-up time is high (> 4s)',
      failureDescription: 'JavaScript boot-up time is too high',
      helpText: 'Consider reducing the time spent parsing, compiling and executing JS. ' +
        'You may find delivering smaller JS payloads helps with this.',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {!Array<TraceEvent>=} trace
   * @return {!Map<string, Number>}
   */
  static getExecutionTimingsByURL(trace) {
    const timelineModel = new DevtoolsTimelineModel(trace);
    const bottomUpByURL = timelineModel.bottomUpGroupBy('URL');
    const result = new Map();

    bottomUpByURL.children.forEach((perUrlNode, url) => {
      // when url is "" or about:blank, we skip it
      if (!url || url === 'about:blank') {
        return;
      }

      const taskGroups = {};
      perUrlNode.children.forEach((perTaskPerUrlNode) => {
        // eventStyle() returns a string like 'Evaluate Script'
        const task = WebInspector.TimelineUIUtils.eventStyle(perTaskPerUrlNode.event);
        // Resolve which taskGroup we're using
        const groupName = taskToGroup[task.title] || group.other;
        const groupTotal = taskGroups[groupName] || 0;
        taskGroups[groupName] = groupTotal + (perTaskPerUrlNode.selfTime || 0);
      });
      result.set(url, taskGroups);
    });

    return result;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[BootupTime.DEFAULT_PASS];
    const executionTimings = BootupTime.getExecutionTimingsByURL(trace);

    let totalBootupTime = 0;
    const extendedInfo = {};

    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'scripting', itemType: 'text', text: group.scripting},
      {key: 'scriptParseCompile', itemType: 'text', text: group.scriptParseCompile},
    ];

    // map data in correct format to create a table
    const results = Array.from(executionTimings).map(([url, groups]) => {
      // Add up the totalBootupTime for all the taskGroups
      totalBootupTime += Object.keys(groups).reduce((sum, name) => sum += groups[name], 0);
      extendedInfo[url] = groups;

      const scriptingTotal = groups[group.scripting] || 0;
      const parseCompileTotal = groups[group.scriptParseCompile] || 0;
      return {
        url: url,
        sum: scriptingTotal + parseCompileTotal,
        // Only reveal the javascript task costs
        // Later we can account for forced layout costs, etc.
        scripting: Util.formatMilliseconds(scriptingTotal, 1),
        scriptParseCompile: Util.formatMilliseconds(parseCompileTotal, 1),
      };
    }).sort((a, b) => b.sum - a.sum);

    const tableDetails = BootupTime.makeTableDetails(headings, results);

    return {
      score: totalBootupTime < 4000,
      rawValue: totalBootupTime,
      displayValue: Util.formatMilliseconds(totalBootupTime),
      details: tableDetails,
      extendedInfo: {
        value: extendedInfo,
      },
    };
  }
}

module.exports = BootupTime;
