/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const ComputedResponsivenes = require('../computed/metrics/responsiveness.js');
const ProcessedTrace = require('../computed/processed-trace.js');
const i18n = require('../lib/i18n/i18n.js');
const NetworkRequest = require('../lib/network-request.js');
const NetworkRecords = require('../computed/network-records.js');
const MainThreadTasks = require('../lib/tracehouse/main-thread-tasks.js');
const {taskGroups} = require('../lib/tracehouse/task-groups.js');
const LHError = require('../lib/lh-error.js');

// The subset of EventTiming/EventDispatch events we care about.
/** @typedef {'keydown'|'keypress'|'keyup'|'mousedown'|'mouseup'|'pointerdown'|'pointerup'|'click'} EventTimingType */
/** @typedef {LH.Trace.CompleteEvent & {name: 'EventTiming', args: {frame: string, data: {duration: number, processingEnd: number, processingStart: number, timeStamp: number, type: EventTimingType}}}} EventTimingEvent */
/** @typedef {LH.Trace.CompleteEvent & {name: 'EventDispatch', args: {data: {type: EventTimingType}}}} EventDispatchEvent */
/** @typedef {import('../computed/metrics/responsiveness.js').ResponsivenessEvent} ResponsivenessEvent */
/** @typedef {import('../lib/tracehouse/main-thread-tasks.js').TaskNode} TaskNode */

const MAX_DURATION_THRESHOLD = 100;
const TASK_THRESHOLD = 10;
const KEYBOARD_EVENTS = new Set(['keydown', 'keypress', 'keyup']);
const CLICK_TAP_DRAG_EVENTS = new Set([
  'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'click']);

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did during user interactions. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Minimizes work during interactions',
  /** Title of a diagnostic audit that provides detail on the main thread work the browser did during user interactions. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Minimize work during interactions',
  /** Description of the work-during-interaction metric. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'These were the main-thread tasks that blocked during an interaction. [Learn more](https://web.dev/inp/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview This metric gives a high-percentile measure of responsiveness to input.
 */
class WorkDuringInteraction extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'work-during-interaction',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      supportedModes: ['timespan'],
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * Finds the interaction event that was probably the responsivenessEvent.maxDuration
   * source.
   * Note that (presumably due to rounding to ms), the interaction duration may not
   * be the same value as `maxDuration`, just the closest value. Function will throw
   * if the closest match is off by more than 3ms.
   * TODO: this doesn't try to match inputs to interactions and break ties if more than
   * one interaction had this duration by returning the first found.
   * @param {ResponsivenessEvent} responsivenessEvent
   * @param {Array<LH.TraceEvent>} interactionEvents
   * @return {EventTimingEvent}
   */
  static findInteractionEvent(responsivenessEvent, interactionEvents) {
    const {frame, data: {maxDuration, interactionType}} = responsivenessEvent.args;
    const candidates = interactionEvents.filter(/** @return {evt is EventTimingEvent} */ evt => {
      return evt.name === 'EventTiming';
    });

    let interactionEvent;
    let minDurationDiff = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const {frame: candidateFrame, data: {type, duration}} = candidate.args;

      // Must be same-frame.
      if (candidateFrame !== frame) continue;

      // Check if type is compatible with responsiveness interactionType.
      switch (interactionType) {
        case 'keyboard': {
          if (!KEYBOARD_EVENTS.has(type)) continue;
          break;
        }
        case 'tapOrClick':
        case 'drag': {
          if (!CLICK_TAP_DRAG_EVENTS.has(type)) continue;
          break;
        }
        default:
          throw new Error(`unexpected responsiveness interactionType '${interactionType}'`);
      }

      const durationDiff = Math.abs(duration - maxDuration);
      if (durationDiff < minDurationDiff) {
        interactionEvent = candidate;
        minDurationDiff = durationDiff;
      }
    }

    if (!interactionEvent) {
      throw new Error(`no interaction event found for responsiveness type '${interactionType}'`);
    }
    if (minDurationDiff > 2) {
      // throw new Error(`no interaction event found within 2ms of responsiveness maxDuration (max: ${maxDuration}, closest ${interactionEvent.args.data.duration})`); // eslint-disable-line max-len
      // TODO: seems to regularly happen up to 3ms and as high as 4
      console.warn(`no interaction event found within 2ms of responsiveness maxDuration (max: ${maxDuration}, closest ${interactionEvent.args.data.duration})`); // eslint-disable-line max-len
    }

    return interactionEvent;
  }

  /**
   * TODO: extract shared methods from bootup-time instead of copy/pasting them here.
   * @param {EventTimingEvent} interactionEvent
   * @param {Array<LH.TraceEvent>} mainThreadEvents
   * @param {LH.Artifacts.ProcessedTrace['frames']} frames
   * @param {LH.TraceEvent} timeOriginEvt
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {Promise<Array<LH.Audit.Details.TableItem>>}
   */
  static async mainThreadBreakdown(interactionEvent, mainThreadEvents, frames, timeOriginEvt, networkRecords) {
    // These trace events, when not triggered by a script inside a particular task, are just general Chrome overhead.
    const BROWSER_TASK_NAMES_SET = new Set([
      'CpuProfiler::StartProfiling',
    ]);

    // These trace events, when not triggered by a script inside a particular task, are GC Chrome overhead.
    const BROWSER_GC_TASK_NAMES_SET = new Set([
      'V8.GCCompactor',
      'MajorGC',
      'MinorGC',
    ]);

    /**
     * @param {LH.Artifacts.NetworkRequest[]} records
     */
    function getJavaScriptURLs(records) {
      /** @type {Set<string>} */
      const urls = new Set();
      for (const record of records) {
        if (record.resourceType === NetworkRequest.TYPES.Script) {
          urls.add(record.url);
        }
      }

      return urls;
    }

    /**
     * @param {LH.Artifacts.TaskNode} task
     * @param {Set<string>} jsURLs
     * @return {string}
     */
    function getAttributableURLForTask(task, jsURLs) {
      const jsURL = task.attributableURLs.find(url => jsURLs.has(url));
      const fallbackURL = task.attributableURLs[0];
      let attributableURL = jsURL || fallbackURL;
      // If we can't find what URL was responsible for this execution, attribute it to the root page
      // or Chrome depending on the type of work.
      if (!attributableURL || attributableURL === 'about:blank') {
        if (BROWSER_TASK_NAMES_SET.has(task.event.name)) attributableURL = 'Browser';
        else if (BROWSER_GC_TASK_NAMES_SET.has(task.event.name)) attributableURL = 'Browser GC';
        else attributableURL = 'Unattributable';
      }

      return attributableURL;
    }

    /**
     * @param {LH.Artifacts.TaskNode[]} tasks
     * @param {Set<string>} jsURLs
     * @return {Map<string, Object<string, number>>}
     */
    function getExecutionTimingsByURL(tasks, jsURLs) {
      /** @type {Map<string, Object<string, number>>} */
      const result = new Map();

      for (const task of tasks) {
        const attributableURL = getAttributableURLForTask(task, jsURLs);
        const timingByGroupId = result.get(attributableURL) || {};
        const originalTime = timingByGroupId[task.group.id] || 0;
        timingByGroupId[task.group.id] = originalTime + task.selfTime;
        result.set(attributableURL, timingByGroupId);
      }

      return result;
    }

    /**
     * From tracehouse/main-thread-tasks.js
     * @param {TaskNode} task
     * @param {TaskNode|undefined} parent
     * @return {number}
     */
    function computeRecursiveSelfTime(task, parent) {
      if (parent && task.endTime > parent.endTime) {
        throw new Error('Fatal trace logic error - child cannot end after parent');
      }

      const childTime = task.children
        .map(child => MainThreadTasks._computeRecursiveSelfTime(child, task))
        .reduce((sum, child) => sum + child, 0);
      task.selfTime = task.duration - childTime;
      return task.duration;
    }

    /**
     * Clip the tasks by the start and end points. Take the easy route and drop
     * to duration 0 if out of bounds, since only durations are needed in the
     * end (for now).
     * Assumes owned tasks, so modifies in place.
     * @param {Array<TaskNode>} tasks
     * @param {number} start
     * @param {number} end
     */
    function clipTasksByTs(tasks, start, end) {
      for (const task of tasks) {
        const taskEventStart = task.event.ts;
        const taskEventEnd = task.endEvent?.ts ?? task.event.ts + Number(task.event.dur || 0);

        task.startTime = Math.max(start, Math.min(end, taskEventStart));
        task.endTime = Math.max(start, Math.min(end, taskEventEnd));
        task.duration = task.endTime - task.startTime;
      }

      for (const task of tasks) {
        if (task.parent) continue;
        computeRecursiveSelfTime(task, undefined);
      }

      const firstTs = (tasks[0] || {startTime: 0}).startTime;
      for (const task of tasks) {
        task.startTime = (task.startTime - firstTs) / 1000;
        task.endTime = (task.endTime - firstTs) / 1000;
        task.duration /= 1000;
        task.selfTime /= 1000;

        // Check that we have selfTime which captures all other timing data.
        if (!Number.isFinite(task.selfTime)) {
          throw new Error('Invalid task timing data');
        }
      }
    }

    // Get the time relative to navStart (which won't exist in a timespan trace).
    // Only supported in 103.0.5040.0+.
    let navStartTs;
    if (timeOriginEvt.name === 'navigationStart') {
      navStartTs = timeOriginEvt.ts;
    } else if (timeOriginEvt.args.startTime !== undefined) {
      // Only supported in 103.0.5040.0+.
      navStartTs = timeOriginEvt.ts - timeOriginEvt.args.startTime * 1000;
    } else {
      throw new LHError(
LHError.errors.UNSUPPORTED_OLD_CHROME,
        {featureName: 'timestamped user-timing trace events'}
      );
    }

    const jsURLs = getJavaScriptURLs(networkRecords);

    const interactionData = interactionEvent.args.data;
    const startTs = navStartTs + interactionEvent.args.data.timeStamp * 1000;
    const processingStartTs = navStartTs + interactionData.processingStart * 1000;
    const processingEndTs = navStartTs + interactionData.processingEnd * 1000;
    const endTs = startTs + interactionData.duration * 1000;
    const phases = [
      {name: 'Input Delay', start: startTs, end: processingStartTs},
      {name: 'Processing Delay', start: processingStartTs, end: processingEndTs},
      {name: 'Presentation Delay', start: processingEndTs, end: endTs},
    ];

    /** @type {LH.Audit.Details.TableItem[]} */
    const items = [];
    for (const phase of phases) {
      // TODO: see note below about mainThreadEvents/frames for oopif situations.
      // const clippedEvents = clipEventsByTs(mainThreadEvents, phase.start, phase.end);
      const tasks = await MainThreadTasks.getMainThreadTasks(mainThreadEvents, frames, phase.end);
      // Clip tasks to start and end time.
      clipTasksByTs(tasks, phase.start, phase.end);
      const executionTimings = getExecutionTimingsByURL(tasks, jsURLs);

      const results = [];
      for (const [url, timingByGroupId] of executionTimings) {
        // Add up the totalExecutionTime for all the taskGroups
        let totalExecutionTimeForURL = 0;
        for (const [groupId, timespanMs] of Object.entries(timingByGroupId)) {
          timingByGroupId[groupId] = timespanMs;
          totalExecutionTimeForURL += timespanMs;
        }

        const scriptingTotal = timingByGroupId[taskGroups.scriptEvaluation.id] || 0;
        // const parseCompileTotal = timingByGroupId[taskGroups.scriptParseCompile.id] || 0;
        const layoutTotal = timingByGroupId[taskGroups.styleLayout.id] || 0;
        const renderTotal = timingByGroupId[taskGroups.paintCompositeRender.id] || 0;

        results.push({
          url: url,
          total: totalExecutionTimeForURL,
          scripting: scriptingTotal,
          // scriptParseCompile: parseCompileTotal,
          layout: layoutTotal,
          render: renderTotal,
        });
      }

      const filteredResults = results
        .filter(result => result.total > 1)
        .sort((a, b) => b.total - a.total);
      if (filteredResults.length === 0) {
        // Add back so at least one entry is in there. Probably can just drop the (parent) item instead.
        filteredResults.push(results[1]);
      }

      items.push({
        phase: phase.name,
        total: (phase.end - phase.start) / 1000,
        subItems: {
          type: 'subitems',
          items: filteredResults,
        },
      });
    }

    return items;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {settings} = context;
    // TODO: responsiveness isn't yet supported by lantern.
    if (settings.throttlingMethod === 'simulate') {
      return {score: null, notApplicable: true};
    }

    const trace = artifacts.traces[WorkDuringInteraction.DEFAULT_PASS];
    const metricData = {trace, settings};
    const responsivenessEvent = await ComputedResponsivenes.request(metricData, context);
    // If no interaction, diagnostic audit is n/a.
    if (responsivenessEvent === null) {
      return {score: null, notApplicable: true};
    }

    // TODO: if frame is OOPIF, can't use mainThreadEvents for this and need to trim `frames`.
    const {
      frameTreeEvents,
      frames,
      mainThreadEvents,
      timeOriginEvt,
    } = await ProcessedTrace.request(trace, context);
    const interactionEvent = WorkDuringInteraction.findInteractionEvent(
        responsivenessEvent, frameTreeEvents);
    // console.log('responsivenessEvent', responsivenessEvent);
    // console.log('interactionEvent', interactionEvent);

    const devtoolsLog = artifacts.devtoolsLogs[WorkDuringInteraction.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const items = await WorkDuringInteraction.mainThreadBreakdown(
      interactionEvent, mainThreadEvents, frames, timeOriginEvt, networkRecords);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'phase', itemType: 'text', subItemsHeading: {key: 'url', itemType: 'url'}, text: 'Phase'},
      {key: 'total', itemType: 'ms', subItemsHeading: {key: 'total', granularity: 1, itemType: 'ms'}, text: 'Total time'},
      {key: null, itemType: 'ms', subItemsHeading: {key: 'scripting', granularity: 1, itemType: 'ms'}, text: 'Script evaluation'},
      {key: null, itemType: 'ms', subItemsHeading: {key: 'layout', granularity: 1, itemType: 'ms'}, text: taskGroups.styleLayout.label},
      {key: null, itemType: 'ms', subItemsHeading: {key: 'render', granularity: 1, itemType: 'ms'}, text: taskGroups.paintCompositeRender.label},
      /* eslint-enable max-len */
    ];

    return {
      score: responsivenessEvent.args.data.maxDuration < MAX_DURATION_THRESHOLD ? 1 : 0,
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

module.exports = WorkDuringInteraction;
module.exports.UIStrings = UIStrings;
