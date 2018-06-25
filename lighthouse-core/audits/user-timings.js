/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

/** @typedef {{name: string, isMark: true, args: LH.TraceEvent['args'], startTime: number}} MarkEvent */
/** @typedef {{name: string, isMark: false, args: LH.TraceEvent['args'], startTime: number, endTime: number, duration: number}} MeasureEvent */

class UserTimings extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'user-timings',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'User Timing marks and measures',
      description: 'Consider instrumenting your app with the User Timing API to create custom, ' +
          'real-world measurements of key user experiences. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/user-timing).',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {LH.Artifacts.TraceOfTab} tabTrace
   * @return {Array<MarkEvent|MeasureEvent>}
   */
  static filterTrace(tabTrace) {
    /** @type {Array<MarkEvent|MeasureEvent>} */
    const userTimings = [];
    const measuresStartTimes = {};

    // Get all blink.user_timing events
    // The event phases we are interested in are mark and instant events (R, i, I)
    // and duration events which correspond to measures (B, b, E, e).
    // @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview#
    tabTrace.processEvents.filter(evt => {
      if (!evt.cat.includes('blink.user_timing')) {
        return false;
      }

      // reject these "userTiming" events that aren't really UserTiming, by nuking ones with frame data (or requestStart)
      // https://cs.chromium.org/search/?q=trace_event.*?user_timing&sq=package:chromium&type=cs
      return evt.name !== 'requestStart' &&
          evt.name !== 'navigationStart' &&
          evt.name !== 'paintNonDefaultBackgroundColor' &&
          evt.args.frame === undefined;
    })
    .forEach(ut => {
      // Mark events fall under phases R and I (or i)
      if (ut.ph === 'R' || ut.ph.toUpperCase() === 'I') {
        userTimings.push({
          name: ut.name,
          isMark: true,
          args: ut.args,
          startTime: ut.ts,
        });

      // Beginning of measure event, keep track of this events start time
      } else if (ut.ph.toLowerCase() === 'b') {
        measuresStartTimes[ut.name] = ut.ts;

      // End of measure event
      } else if (ut.ph.toLowerCase() === 'e') {
        userTimings.push({
          name: ut.name,
          isMark: false,
          args: ut.args,
          startTime: measuresStartTimes[ut.name],
          endTime: ut.ts,
          duration: ut.ts - measuresStartTimes[ut.name],
        });
      }
    });

    // baseline the timestamps against navStart, and translate to milliseconds
    userTimings.forEach(ut => {
      ut.startTime = (ut.startTime - tabTrace.navigationStartEvt.ts) / 1000;
      if (!ut.isMark) {
        ut.endTime = (ut.endTime - tabTrace.navigationStartEvt.ts) / 1000;
        ut.duration = ut.duration / 1000;
      }
    });

    return userTimings;
  }

  /**
   * @return {Array<string>}
   */
  static get blacklistedPrefixes() {
    return ['goog_'];
  }

  /**
   * We remove mark/measures entered by third parties not of interest to the user
   * @param {MarkEvent|MeasureEvent} evt
   * @return {boolean}
   */
  static excludeBlacklisted(evt) {
    return UserTimings.blacklistedPrefixes.every(prefix => !evt.name.startsWith(prefix));
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    return artifacts.requestTraceOfTab(trace).then(tabTrace => {
      const userTimings = this.filterTrace(tabTrace).filter(UserTimings.excludeBlacklisted);
      const tableRows = userTimings.map(item => {
        return {
          name: item.name,
          startTime: item.startTime,
          duration: item.isMark ? undefined : item.duration,
          timingType: item.isMark ? 'Mark' : 'Measure',
        };
      }).sort((itemA, itemB) => {
        if (itemA.timingType === itemB.timingType) {
          // If both items are the same type, sort in ascending order by time
          return itemA.startTime - itemB.startTime;
        } else if (itemA.timingType === 'Measure') {
          // Put measures before marks
          return -1;
        } else {
          return 1;
        }
      });

      const headings = [
        {key: 'name', itemType: 'text', text: 'Name'},
        {key: 'timingType', itemType: 'text', text: 'Type'},
        {key: 'startTime', itemType: 'ms', granularity: 0.01, text: 'Start Time'},
        {key: 'duration', itemType: 'ms', granularity: 0.01, text: 'Duration'},
      ];

      const details = Audit.makeTableDetails(headings, tableRows);

      /** @type {LH.Audit.Product['displayValue']} */
      let displayValue;
      if (userTimings.length) {
        displayValue = [
          userTimings.length === 1 ? '%d user timing' : '%d user timings',
          userTimings.length,
        ];
      }

      return {
        // mark the audit as notApplicable if there were no user timings
        rawValue: userTimings.length === 0,
        notApplicable: userTimings.length === 0,
        displayValue,
        extendedInfo: {
          value: userTimings,
        },
        details,
      };
    });
  }
}

module.exports = UserTimings;
