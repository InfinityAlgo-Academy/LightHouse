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
const Util = require('../report/v2/renderer/util');
const DevtoolsTimelineModel = require('../lib/traces/devtools-timeline-model');

// We group all trace events into groups to show a highlevel breakdown of the page
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

class PageExecutionTimings extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'mainthread-work-breakdown',
      description: 'Main thread work breakdown',
      informative: true,
      helpText: 'Consider reducing the time spent parsing, compiling and executing JS.' +
        'You may find delivering smaller JS payloads helps with this.',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {!Array<TraceEvent>} trace
   * @return {!Map<string, number>}
   */
  static getExecutionTimingsByCategory(trace) {
    const timelineModel = new DevtoolsTimelineModel(trace);
    const bottomUpByName = timelineModel.bottomUpGroupBy('EventName');

    const result = new Map();
    bottomUpByName.children.forEach((event, eventName) =>
      result.set(eventName, event.selfTime));

    return result;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[PageExecutionTimings.DEFAULT_PASS];
    const executionTimings = PageExecutionTimings.getExecutionTimingsByCategory(trace);
    let totalExecutionTime = 0;

    const extendedInfo = {};
    const categoryTotals = {};
    const results = Array.from(executionTimings).map(([eventName, duration]) => {
      totalExecutionTime += duration;
      extendedInfo[eventName] = duration;
      const groupName = taskToGroup[eventName];

      const categoryTotal = categoryTotals[groupName] || 0;
      categoryTotals[groupName] = categoryTotal + duration;

      return {
        category: eventName,
        group: groupName,
        duration: Util.formatMilliseconds(duration, 1),
      };
    });

    const headings = [
      {key: 'group', itemType: 'text', text: 'Category'},
      {key: 'category', itemType: 'text', text: 'Work'},
      {key: 'duration', itemType: 'text', text: 'Time spent'},
    ];
    results.stableSort((a, b) => categoryTotals[b.group] - categoryTotals[a.group]);
    const tableDetails = PageExecutionTimings.makeTableDetails(headings, results);

    return {
      score: false,
      rawValue: totalExecutionTime,
      displayValue: Util.formatMilliseconds(totalExecutionTime),
      details: tableDetails,
      extendedInfo: {
        value: extendedInfo,
      },
    };
  }
}

module.exports = PageExecutionTimings;
