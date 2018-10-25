/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Technically, it's fine for usertiming measures to overlap, however non-async events make
 * for a much clearer UI in traceviewer. We do this check to make sure we aren't passing off
 * async-like measures as non-async.
 * prevEntries are expected to be sorted by startTime
 * @param {LH.Artifacts.MeasureEntry} entry user timing entry
 * @param {LH.Artifacts.MeasureEntry[]} prevEntries user timing entries
 */
function checkEventOverlap(entry, prevEntries) {
  for (const prevEntry of prevEntries) {
    const prevEnd = prevEntry.startTime + prevEntry.duration;
    const thisEnd = entry.startTime + entry.duration;
    const isOverlap = prevEnd > entry.startTime && prevEnd < thisEnd;
    if (isOverlap) {
      // eslint-disable-next-line no-console
      console.error(`Two measures overlap! ${prevEntry.name} & ${entry.name}`);
    }
  }
}

/**
 * Generates a chromium trace file from user timing measures
 * Adapted from https://github.com/tdresser/performance-observer-tracing
 * @param {LH.Artifacts.MeasureEntry[]} entries user timing entries
 * @param {string=} trackName
 */
function generateTraceEvents(entries, trackName = 'measures') {
  if (!Array.isArray(entries)) return [];

  /** @type {LH.TraceEvent[]} */
  const currentTrace = [];
  let id = 0;

  entries.sort((a, b) => a.startTime - b.startTime);
  entries.forEach((entry, i) => {
    checkEventOverlap(entry, entries.slice(0, i));

    /** @type {LH.TraceEvent} */
    const traceEvent = {
      name: entry.name,
      cat: entry.entryType,
      ts: entry.startTime * 1000,
      dur: entry.duration * 1000,
      args: {},
      pid: 0,
      tid: trackName === 'measures' ? 50 : 75,
      ph: 'X',
      id: '0x' + (id++).toString(16),
    };

    if (entry.entryType !== 'measure') throw new Error('Unexpected entryType!');
    if (entry.duration === 0) {
      traceEvent.ph = 'n';
      traceEvent.s = 't';
    }

    currentTrace.push(traceEvent);
  });

  // Add labels
  /** @type {LH.TraceEvent} */
  const metaEvtBase = {
    pid: 0,
    tid: trackName === 'measures' ? 50 : 75,
    ts: 0,
    dur: 0,
    ph: 'M',
    cat: '__metadata',
    name: 'process_labels',
    args: {labels: 'Default'},
  };
  currentTrace.push(Object.assign({}, metaEvtBase, {args: {labels: 'Lighthouse Timing'}}));
  currentTrace.push(Object.assign({}, metaEvtBase, {name: 'thread_name', args: {name: trackName}}));

  return currentTrace;
}

/**
 * Writes a trace file to disk
 * @param {LH.Result} lhr
 * @return {string}
 */
function createTraceString(lhr) {
  const gatherEntries = lhr.timing.entries.filter(entry => entry.gather);
  const entries = lhr.timing.entries.filter(entry => !gatherEntries.includes(entry));

  const auditEvents = generateTraceEvents(entries);
  const gatherEvents = generateTraceEvents(gatherEntries, 'gather');
  const events = [...auditEvents, ...gatherEvents];

  const jsonStr = `
  { "traceEvents": [
    ${events.map(evt => JSON.stringify(evt)).join(',\n')}
  ]}`;

  return jsonStr;
}

module.exports = {generateTraceEvents, createTraceString};
