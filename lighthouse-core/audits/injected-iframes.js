/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('./../lib/i18n/i18n.js');
const ComputedUserTimings = require('../computed/user-timings.js');
const ProcessedTrace = require('../computed/processed-trace.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides a potential cause of CLS. This descriptive title is shown to users when no iframe is injected in a time window before a LayoutShift event. */
  title: 'Injected iframes likely didn\'t contribute to CLS',
  /** Title of a Lighthouse audit that provides a potential cause of CLS. This descriptive title is shown to users when an iframe is injected in a time window before a LayoutShift event. */
  failureTitle: 'Injected iframes potentially contributed to CLS',
  /** Label for a column in a data table; entries will be the timestamp in milliseconds an event occurs. */
  columnTimestamp: 'Timestamp',
  /** Label for audit identifying the number of iframes likely affecting the page. */
  displayValue: `{itemCount, plural,
    =1 {1 iframe}
    other {# iframes}
    }`,
  /** Description of a Lighthouse audit that tells the user potential causes of CLS. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Injecting an iframe with a correctly sized container can reduce layout shifting and improve CLS. [Learn More](https://web.dev/optimize-cls/#ads-embeds-and-iframes-without-dimensions)',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * LayoutShift timing windows are determined by trace events. We consider a timing window to be
 * between a ScheduleStyleRecalculation event and the end of its possibly corresponding UpdateLayerTree event.
 * We assume that an UpdateLayerTree event belongs to a ScheduleStyleRecalculation event if it occurs within
 * 20ms. This window is then determined to be a "layoutShiftWindow", if a LayoutShift event occurs
 * within a time frame of this UpdateLayerTree event.
 * @param {Array<{event: LH.TraceEvent; timing: number; duration: number}>} layoutEvents
 * @return {Array<LH.Artifacts.DOMWindow>}
 */
function getLayoutShiftWindows(layoutEvents) {
  /** @type {Array<LH.Artifacts.DOMWindow>} */
  const shiftWindows = [];

  // TODO: use a map for this ?
  for (let i = 0; i < layoutEvents.length; i++) {
    const event = layoutEvents[i].event;
    const SSRStart = layoutEvents[i].timing;
    const SSREnd = SSRStart + layoutEvents[i].duration;
    if (event.name !== 'ScheduleStyleRecalculation') continue;

    // look for a ULT within this limit, assume that a ULT belongs to a SSR if occurs within 20ms
    const limit = SSRStart + 20;
    for (let j = i + 1; j < layoutEvents.length; j++) {
      const ULTStart = layoutEvents[j].timing;
      const ULTEnd = ULTStart + layoutEvents[j].duration;
      // eslint-disable-next-line max-len
      if (layoutEvents[j].event.name !== 'UpdateLayerTree' && layoutEvents[j].event.name !== 'PrePaint') continue;

      if (!(ULTStart >= SSRStart && ULTStart < limit)) continue;

      // If there is a layout shift within an update layer tree, it may cause a layout shift.
      for (let k = j + 1; k < layoutEvents.length; k++) {
        if (layoutEvents[k].event.name !== 'LayoutShift') continue;

        const layoutShiftStart = layoutEvents[k].timing;
        const layoutShiftEnd = layoutShiftStart + layoutEvents[k].duration;
        if (layoutShiftStart >= ULTStart && layoutShiftStart <= ULTEnd) {
          shiftWindows.push({start: SSRStart, end: ULTEnd});
        }
      }
    }
  }

  return shiftWindows;
}

/**
 * @param {LH.Trace} trace
 * @param {LH.Audit.Context} context
 * @return {Promise<Array<{event: LH.TraceEvent; timing: number; duration: number}>>}
 */
async function getLayoutShiftTimelineEvents(trace, context) {
  const processedTrace = await ProcessedTrace.request(trace, context);
  const timeOriginEvt = processedTrace.timeOriginEvt;
  /** @param {number} ts */
  const getTiming = (ts) => (ts - timeOriginEvt.ts) / 1000;

  const mainThreadEvents = processedTrace.mainThreadEvents;
  const relevantEvents = [
    'UpdateLayerTree', // M102 renames this to PrePaint.
    'PrePaint',
    'LayoutShift',
    'ScheduleStyleRecalculation',
  ];
  const layoutShiftTimelineEvents = mainThreadEvents
    .filter(evt => relevantEvents.includes(evt.name))
    .map(evt => {
      return {event: evt, timing: getTiming(evt.ts), duration: (evt.dur || 0) / 1000};
    });
  return layoutShiftTimelineEvents;
}

class InjectedIframesAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'injected-iframes',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['DOMTimeline', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const domTimestamps = artifacts.DOMTimeline.domTimestamps;
    const timeAlignClientTs = artifacts.DOMTimeline.timeAlignTs;
    const layoutShiftTimelineEvents = await getLayoutShiftTimelineEvents(trace, context);
    const shiftWindows = getLayoutShiftWindows(layoutShiftTimelineEvents);

    // console.log("timestamps: ", timestamps, " ", timestamps.length);
    console.log('layoutShiftTimelineEvents.length: ', layoutShiftTimelineEvents.length);
    console.log('window stamps: ', shiftWindows, ' ', shiftWindows.length);
    console.log('number of iframe timestamps: ', domTimestamps.length);
    console.log('number of CLS windows: ', shiftWindows.length);

    const iframeResults = new Map();

    const userTimings = await ComputedUserTimings.request(trace, context);
    const timeAlignTiming = userTimings.find(timing => timing.name === 'lh_timealign');
    console.log('timeAlignTiming:', timeAlignTiming);

    if (!timeAlignTiming) {
      throw new Error('missing timeAlignTiming');
    }

    // timeAlignNormalizedTraceTs have already been baselined against trace's timeOrigin and converted to milliseconds (see computed/user-timings)
    //   This adjustment is identical to traceprocessor's getTiming
    // whereas timeAlignClientTs times are clientside perf.now timestamps
    const timeAlignNormalizedTraceTs = timeAlignTiming.startTime;
    // can we assume that timing in client will always be <= timing on trace ?
    // are assuming that first item in timeAlignTimings / smallest will be the one we want
    console.log({timeAlignNormalizedTraceTs, timeAlignClientTs});

    // Difference of getTiming-normalized trace event time to clientside perf.now time
    const timingNormalization = (timeAlignNormalizedTraceTs - timeAlignClientTs);

    const results = [];
    for (const timestamp of domTimestamps) {
      // const time = timestamp.time + timingNormalization;
      // console.log("is node type element node? ", typeof timestamp.element);
      const clientTs = timestamp.currTime;

      // time is a NormalizedTraceTs, as described above.
      const time = clientTs + timingNormalization;
      for (const window of shiftWindows) {
        // if iframe timestamp is within a CLS window timeframe, it is considered to contribute to CLS
        if (time >= window.start && time <= window.end) {
          // console.log('...');
          // Make sure an iframe is only added once to results
          // const ad = "id=\"aswift_"; - to filter ads from https://github.com/monofrio/stylish_ad_removal
          if (!iframeResults.has(timestamp.devtoolsNodePath)) {
            iframeResults.set(timestamp.devtoolsNodePath, timestamp.snippet);
            // console.log("time in range, with normalization: ", time);
            results.push({
              node: /** @type {LH.Audit.Details.NodeValue} */ ({
                type: 'node',
                path: timestamp.devtoolsNodePath,
                selector: timestamp.selector,
                nodeLabel: timestamp.nodeLabel,
                snippet: timestamp.snippet,
              }),
              timestamp: time,
            });
          }
        }
      }
    }

    // console.log("RESULTS: ", results);
    console.log('num of RESULTS: ', results.length);
    // console.log("RESULTS: ", results);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', itemType: 'node', text: str_(i18n.UIStrings.columnElement)},
      {key: 'timestamp', itemType: 'ms', text: str_(UIStrings.columnTimestamp)},
    ];

    return {
      score: results.length > 0 ? 0 : 1,
      displayValue: str_(UIStrings.displayValue, {itemCount: results.length}),
      details: Audit.makeTableDetails(headings, results),
      notApplicable: domTimestamps.length === 0,
    };
  }
}

module.exports = InjectedIframesAudit;
module.exports.UIStrings = UIStrings;
