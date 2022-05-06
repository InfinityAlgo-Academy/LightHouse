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
const NetworkRecords = require('../computed/network-records.js');
const MainThreadTasks = require('../lib/tracehouse/main-thread-tasks.js');
const {taskGroups} = require('../lib/tracehouse/task-groups.js');
const LHError = require('../lib/lh-error.js');
const TraceProcessor = require('../lib/tracehouse/trace-processor.js');
const {getExecutionTimingsByURL} = require('../lib/tracehouse/task-summary.js');

// The subset of EventTiming/EventDispatch events we care about.
/** @typedef {'keydown'|'keypress'|'keyup'|'mousedown'|'mouseup'|'pointerdown'|'pointerup'|'click'} EventTimingType */
/** @typedef {LH.Trace.CompleteEvent & {name: 'EventTiming', args: {frame: string, data: {duration: number, processingEnd: number, processingStart: number, timeStamp: number, type: EventTimingType}}}} EventTimingEvent */
/** @typedef {LH.Trace.CompleteEvent & {name: 'EventDispatch', args: {data: {type: EventTimingType}}}} EventDispatchEvent */
/** @typedef {import('../computed/metrics/responsiveness.js').ResponsivenessEvent} ResponsivenessEvent */
/** @typedef {import('../lib/tracehouse/main-thread-tasks.js').TaskNode} TaskNode */

const MAX_DURATION_THRESHOLD = 100;
const TASK_THRESHOLD = 1;
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
  inputDelay: 'Input Delay',
  processingDelay: 'Processing Delay',
  presentationDelay: 'Presentation Delay',

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
   * @param {LH.Trace} trace
   * @return {EventTimingEvent}
   */
  static findInteractionEvent(responsivenessEvent, {traceEvents}) {
    const candidates = traceEvents.filter(/** @return {evt is EventTimingEvent} */ evt => {
      if (evt.name !== 'EventTiming') return false;
      if (evt.args.frame !== responsivenessEvent.args.frame) return false;
      return true;
    });

    const {data: {maxDuration, interactionType}} = responsivenessEvent.args;
    let bestMatchEvent;
    let minDurationDiff = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const {type, duration} = candidate.args.data;
      // Discard if type is incompatible with responsiveness interactionType.
      if (interactionType === 'keyboard') {
        if (!KEYBOARD_EVENTS.has(type)) continue;
      } else if (interactionType === 'tapOrClick' || interactionType === 'drag') {
        if (!CLICK_TAP_DRAG_EVENTS.has(type)) continue;
      } else {
        throw new Error(`unexpected responsiveness interactionType '${interactionType}'`);
      }

      const durationDiff = Math.abs(duration - maxDuration);
      if (durationDiff < minDurationDiff) {
        bestMatchEvent = candidate;
        minDurationDiff = durationDiff;
      }
    }

    if (!bestMatchEvent) {
      throw new Error(`no interaction event found for responsiveness type '${interactionType}'`);
    }
    if (minDurationDiff > 2) {
      // throw new Error(`no interaction event found within 2ms of responsiveness maxDuration (max: ${maxDuration}, closest ${interactionEvent.args.data.duration})`); // eslint-disable-line max-len
      // TODO: seems to regularly happen up to 3ms and as high as 4
      console.warn(`no interaction event found within 2ms of responsiveness maxDuration (max: ${maxDuration}, closest ${bestMatchEvent.args.data.duration})`); // eslint-disable-line max-len
    }

    return bestMatchEvent;
  }

  /**
   * @param {TaskNode} task
   * @param {TaskNode|undefined} parent
   * @param {number} startTs
   * @param {number} endTs
   * @return {number}
   */
  static recursivelyClipTasks(task, parent, startTs, endTs) {
    const taskEventStart = task.event.ts;
    const taskEventEnd = task.endEvent?.ts ?? task.event.ts + Number(task.event.dur || 0);

    task.startTime = Math.max(startTs, Math.min(endTs, taskEventStart)) / 1000;
    task.endTime = Math.max(startTs, Math.min(endTs, taskEventEnd)) / 1000;
    task.duration = task.endTime - task.startTime;

    const childTime = task.children
      .map(child => WorkDuringInteraction.recursivelyClipTasks(child, task, startTs, endTs))
      .reduce((sum, child) => sum + child, 0);
    task.selfTime = task.duration - childTime;
    return task.duration;
  }

  /**
   * Clip the tasks by the start and end points. Take the easy route and drop
   * to duration 0 if out of bounds, since only durations are needed in the
   * end (for now).
   * Assumes owned tasks, so modifies in place. Can be called multiple times on
   * the same `tasks` because always computed from original event timing.
   * @param {Array<TaskNode>} tasks
   * @param {number} startTs
   * @param {number} endTs
   */
  static clipTasksByTs(tasks, startTs, endTs) {
    for (const task of tasks) {
      if (task.parent) continue;
      WorkDuringInteraction.recursivelyClipTasks(task, undefined, startTs, endTs);
    }
  }

  /**
   * @param {number} navStartTs
   * @param {EventTimingEvent} interactionEvent
   */
  static getPhaseTimes(navStartTs, interactionEvent) {
    const interactionData = interactionEvent.args.data;
    const startTs = navStartTs + interactionEvent.args.data.timeStamp * 1000;
    const processingStartTs = navStartTs + interactionData.processingStart * 1000;
    const processingEndTs = navStartTs + interactionData.processingEnd * 1000;
    const endTs = startTs + interactionData.duration * 1000;
    return {
      inputDelay: {startTs, endTs: processingStartTs},
      processingDelay: {startTs: processingStartTs, endTs: processingEndTs},
      presentationDelay: {startTs: processingEndTs, endTs},
    };
  }

  /**
   * @param {EventTimingEvent} interactionEvent
   * @param {LH.Trace} trace
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {Promise<{items: Array<LH.Audit.Details.TableItem>, navStartTs: number, phases: Record<string, {startTs: number, endTs: number}>}>}
   */
  static async mainThreadBreakdown(interactionEvent, trace, networkRecords, context) {
    // frames is only used for URL attribution, so can include all frames, even if OOPIF.
    const {frames, timeOriginEvt} = await ProcessedTrace.request(trace, context);

    // TODO(bckenny): need to find *frame* navStart. This is wrong for frames
    // that loaded more than a tiny bit later.
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

    // Limit to interactionEvent's thread.
    const threadEvents = TraceProcessor.filteredTraceSort(trace.traceEvents, evt => {
      return evt.pid === interactionEvent.pid && evt.tid === interactionEvent.tid;
    });
    const traceEndTs = threadEvents.reduce((endTs, evt) => {
      return Math.max(evt.ts + (evt.dur || 0), endTs);
    }, 0);
    const threadTasks = await MainThreadTasks.getMainThreadTasks(threadEvents, frames, traceEndTs);

    const phases = WorkDuringInteraction.getPhaseTimes(navStartTs, interactionEvent);

    /** @type {LH.Audit.Details.TableItem[]} */
    const items = [];
    for (const [phaseName, phaseTimes] of Object.entries(phases)) {
      // Clip tasks to start and end time.
      WorkDuringInteraction.clipTasksByTs(threadTasks, phaseTimes.startTs, phaseTimes.endTs);
      const executionTimings = getExecutionTimingsByURL(threadTasks, networkRecords);

      const results = [];
      for (const [url, timingByGroupId] of executionTimings) {
        // Add up the totalExecutionTime for all the taskGroups
        let totalExecutionTimeForURL = 0;
        for (const [groupId, timespanMs] of Object.entries(timingByGroupId)) {
          if (timespanMs === 0) continue;
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
        .filter(result => result.total > TASK_THRESHOLD)
        .sort((a, b) => b.total - a.total);
      if (filteredResults.length === 0) {
        // Add back so at least one entry is in there. Probably can just drop the (parent) item instead.
        filteredResults.push(results[1]);
      }

      items.push({
        phase: str_(UIStrings[/** @type {keyof UIStrings} */ (phaseName)]),
        total: (phaseTimes.endTs - phaseTimes.startTs) / 1000,
        subItems: {
          type: 'subitems',
          items: filteredResults,
        },
      });
    }

    return {
      items,
      navStartTs,
      phases,
    };
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
    const interactionEvent = WorkDuringInteraction.findInteractionEvent(responsivenessEvent, trace);
    // console.log('responsivenessEvent', responsivenessEvent);
    // console.log('interactionEvent', interactionEvent);

    // Network records will usually be empty for timespans.
    const devtoolsLog = artifacts.devtoolsLogs[WorkDuringInteraction.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    const {phases, navStartTs, items} = await WorkDuringInteraction.mainThreadBreakdown(
          interactionEvent, trace, networkRecords, context);

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
      details: {
        ...Audit.makeTableDetails(headings, items),
        debugData: {
          type: 'debugdata',
          interactionType: interactionEvent.args.data.type,
          navStartTs,
          phases,
        },
      },
    };
  }
}

module.exports = WorkDuringInteraction;
module.exports.UIStrings = UIStrings;
