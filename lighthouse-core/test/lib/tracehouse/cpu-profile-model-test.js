/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const CpuProfileModel = require('../../../lib/tracehouse/cpu-profile-model.js');
const TraceProcessor = require('../../../lib/tracehouse/trace-processor.js');
const MainThreadTasks = require('../../../lib/tracehouse/main-thread-tasks.js');
const profilerTrace = require('../../fixtures/traces/cpu-profiler-m86.trace.json');
const CpuProfilerModel = require('../../../lib/tracehouse/cpu-profile-model.js');

describe('CPU Profiler Model', () => {
  /** @type {LH.TraceCpuProfile} */
  let profile;

  beforeEach(() => {
    /*
    An artistic rendering of the below profile:
    ████████████████(root)████████████████
    ███████████████(program)██████████████
    ███████████████Foo██████████████
      ██████Bar███████     █Baz█
        █Baz█
    */
    profile = {
      id: '0x1',
      pid: 1,
      tid: 1,
      startTime: 9e6,
      nodes: [
        {id: 0, callFrame: {functionName: '(root)'}},
        {id: 1, callFrame: {functionName: '(program)'}, parent: 0},
        {id: 2, callFrame: {functionName: 'Foo', url: 'fileA.js'}, parent: 1},
        {id: 3, callFrame: {functionName: 'Bar', url: 'fileA.js'}, parent: 2},
        {id: 4, callFrame: {functionName: 'Baz', url: 'fileA.js'}, parent: 3},
        {id: 5, callFrame: {functionName: 'Baz', url: 'fileB.js'}, parent: 2},
      ],
      samples: [2, 2, 3, 4, 3, 3, 2, 5, 1, 1],
      timeDeltas: [10e3, 1e3, 1e3, 1e3, 1e3, 1e3, 1e3, 1e3, 1e3, 1e3],
    };
  });

  describe('#_findEffectiveTimestamp', () => {
    it('should default to the latest possible timestamp when no task data available', () => {
      const result = CpuProfilerModel._findEffectiveTimestamp({
        earliestPossibleTimestamp: 0,
        latestPossibleTimestamp: 1000,
        knownTasksByStartTime: [],
        knownTaskStartTimeIndex: 0,
        knownTasksByEndTime: [],
        knownTaskEndTimeIndex: 0,
      });

      expect(result).toEqual({timestamp: 1000, lastStartTimeIndex: 0, lastEndTimeIndex: 0});
    });

    it('should use the latest possible timestamp when tasks fully include range', () => {
      const tasks = [{startTime: 500, endTime: 2500}];
      const result = CpuProfilerModel._findEffectiveTimestamp({
        earliestPossibleTimestamp: 1000,
        latestPossibleTimestamp: 2000,
        knownTasksByStartTime: tasks,
        knownTaskStartTimeIndex: 0,
        knownTasksByEndTime: tasks,
        knownTaskEndTimeIndex: 0,
      });

      expect(result).toEqual({timestamp: 2000, lastStartTimeIndex: 1, lastEndTimeIndex: 0});
    });

    it('should use the latest possible timestamp when tasks are fully contained in range', () => {
      const tasks = [{startTime: 250, endTime: 750}];
      const result = CpuProfilerModel._findEffectiveTimestamp({
        earliestPossibleTimestamp: 0,
        latestPossibleTimestamp: 1000,
        knownTasksByStartTime: tasks,
        knownTaskStartTimeIndex: 0,
        knownTasksByEndTime: tasks,
        knownTaskEndTimeIndex: 0,
      });

      expect(result).toEqual({timestamp: 1000, lastStartTimeIndex: 1, lastEndTimeIndex: 1});
    });

    it('should use earliest of the start task timestamps when tasks started in range', () => {
      const tasks = [{startTime: 250, endTime: 2000}];
      const result = CpuProfilerModel._findEffectiveTimestamp({
        earliestPossibleTimestamp: 0,
        latestPossibleTimestamp: 1000,
        knownTasksByStartTime: tasks,
        knownTaskStartTimeIndex: 0,
        knownTasksByEndTime: tasks,
        knownTaskEndTimeIndex: 0,
      });

      expect(result).toEqual({timestamp: 250, lastStartTimeIndex: 1, lastEndTimeIndex: 0});
    });

    it('should use latest of the end task timestamps when tasks ended in range', () => {
      const tasks = [{startTime: 250, endTime: 1500}];
      const result = CpuProfilerModel._findEffectiveTimestamp({
        earliestPossibleTimestamp: 1000,
        latestPossibleTimestamp: 2000,
        knownTasksByStartTime: tasks,
        knownTaskStartTimeIndex: 0,
        knownTasksByEndTime: tasks,
        knownTaskEndTimeIndex: 0,
      });

      expect(result).toEqual({timestamp: 1500, lastStartTimeIndex: 1, lastEndTimeIndex: 1});
    });

    it('should handle multiple tasks', () => {
      const tasks = [
        {startTime: 250, endTime: 1500},
        {startTime: 500, endTime: 1400},
        {startTime: 1100, endTime: 1200},
        {startTime: 1700, endTime: 1800},
        {startTime: 1900, endTime: 2200},
        {startTime: 1925, endTime: 1975},
      ];

      // TODO: eventually, this should split the start and end effective timestamps.
      // For now it assumes both are the same timestamp which forces this to choose the latest option.
      // Eventually the endTimestamp should be 1500 and the startTimestamp should be 1900.
      const result = CpuProfilerModel._findEffectiveTimestamp({
        earliestPossibleTimestamp: 1000,
        latestPossibleTimestamp: 2000,
        knownTasksByStartTime: tasks,
        knownTaskStartTimeIndex: 0,
        knownTasksByEndTime: tasks.slice().sort((a, b) => a.endTime - b.endTime),
        knownTaskEndTimeIndex: 0,
      });

      expect(result).toEqual({timestamp: 1900, lastStartTimeIndex: 6, lastEndTimeIndex: 5});
    });
  });

  describe('#synthesizeTraceEvents', () => {
    it('should create events in order', () => {
      const ts = x => profile.startTime + x;
      const events = CpuProfilerModel.synthesizeTraceEvents(profile);

      expect(events).toMatchObject([
        {ph: 'B', ts: ts(10e3), args: {data: {callFrame: {functionName: '(root)'}}}},
        {ph: 'B', ts: ts(10e3), args: {data: {callFrame: {functionName: '(program)'}}}},
        {ph: 'B', ts: ts(10e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'B', ts: ts(12e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'B', ts: ts(13e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(14e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(16e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'B', ts: ts(17e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(18e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(18e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'E', ts: ts(19e3), args: {data: {callFrame: {functionName: '(program)'}}}},
        {ph: 'E', ts: ts(19e3), args: {data: {callFrame: {functionName: '(root)'}}}},
      ]);
    });

    it('should create events while aware of other tasks', () => {
      const ts = x => profile.startTime + x;

      // With the sampling profiler we know that Baz and Foo ended *sometime between* 17e3 and 18e3.
      // We want to make sure when additional task information is present, we refine the end time.
      const tasks = [
        // The RunTask at the toplevel, should move start time of Foo to 8.0e3 and end time to 17.5e3
        {startTime: ts(8.0e3), endTime: ts(17.5e3)},
        // The EvaluateScript at the 2nd level, should not affect anything.
        {startTime: ts(9.0e3), endTime: ts(17.4e3)},
        // A small task inside Baz, should move the start time of Baz to 12.5e3.
        {startTime: ts(12.5e3), endTime: ts(13.4e3)},
        // A small task inside Foo, should move the end time of Bar to 15.7e3, start time of Baz to 16.8e3.
        {startTime: ts(15.7e3), endTime: ts(16.8e3)},
      ];

      const events = CpuProfilerModel.synthesizeTraceEvents(profile, tasks);

      expect(events).toMatchObject([
        {ph: 'B', ts: ts(8.0e3), args: {data: {callFrame: {functionName: '(root)'}}}},
        {ph: 'B', ts: ts(8.0e3), args: {data: {callFrame: {functionName: '(program)'}}}},
        {ph: 'B', ts: ts(8.0e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'B', ts: ts(12.0e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'B', ts: ts(12.5e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(13.4e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(15.7e3), args: {data: {callFrame: {functionName: 'Bar'}}}},
        {ph: 'B', ts: ts(16.8e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(17.5e3), args: {data: {callFrame: {functionName: 'Baz'}}}},
        {ph: 'E', ts: ts(17.5e3), args: {data: {callFrame: {functionName: 'Foo'}}}},
        {ph: 'E', ts: ts(19.0e3), args: {data: {callFrame: {functionName: '(program)'}}}},
        {ph: 'E', ts: ts(19.0e3), args: {data: {callFrame: {functionName: '(root)'}}}},
      ]);
    });

    it('should create main-thread-task parseable events', () => {
      const ts = x => profile.startTime + x;
      const events = CpuProfilerModel.synthesizeTraceEvents(profile);

      const tasks = MainThreadTasks.getMainThreadTasks(events, [], ts(19e3));
      expect(tasks).toHaveLength(6);
      expect(tasks[0]).toMatchObject({
        event: {args: {data: {callFrame: {functionName: '(root)'}}}},
        children: [
          {
            event: {args: {data: {callFrame: {functionName: '(program)'}}}},
            children: [{event: {args: {data: {callFrame: {functionName: 'Foo'}}}}}],
          },
        ],
      });

      const fooTask = tasks[0].children[0].children[0];
      expect(fooTask).toMatchObject({
        startTime: 0,
        endTime: 8,
        event: {args: {data: {callFrame: {functionName: 'Foo'}}}},
        children: [
          {
            startTime: 2,
            endTime: 6,
            event: {args: {data: {callFrame: {functionName: 'Bar'}}}},
            children: [{event: {args: {data: {callFrame: {functionName: 'Baz'}}}}}],
          },
          {
            startTime: 7,
            endTime: 8,
            event: {args: {data: {callFrame: {functionName: 'Baz'}}}},
            children: [],
          },
        ],
      });

      const visualization = MainThreadTasks.printTaskTreeToDebugString(tasks, {
        printWidth: 80,
      }).replace(/ +\n/g, '\n');
      expect(visualization).toMatchInlineSnapshot(`
        "Trace Duration: 9ms
        Range: [0, 9]
        █ = 0.11ms

        ████████████████████████████████████████A████████████████████████████████████████
        ████████████████████████████████████████B████████████████████████████████████████
        ███████████████████████████████████C████████████████████████████████████
                         ██████████████████D██████████████████        ████F█████
                                  ████E█████

        A = FunctionCall-SynthesizedByProfilerModel
        B = FunctionCall-SynthesizedByProfilerModel
        C = FunctionCall-SynthesizedByProfilerModel
        D = FunctionCall-SynthesizedByProfilerModel
        E = FunctionCall-SynthesizedByProfilerModel
        F = FunctionCall-SynthesizedByProfilerModel"
      `);
    });

    it('should work on a real trace', () => {
      const {processEvents} = TraceProcessor.computeTraceOfTab(profilerTrace);
      const profiles = CpuProfileModel.collectProfileEvents(processEvents);
      const events = CpuProfileModel.synthesizeTraceEvents(profiles[0]);
      expect(events).toHaveLength(230);
      const lastTs = events[events.length - 1].length;
      const tasks = MainThreadTasks.getMainThreadTasks(events, [], lastTs);
      expect(tasks).toHaveLength(115);
    });
  });

  describe('#collectProfileEvents', () => {
    const nodes = [{id: 0}, {id: 1}];
    const samples = [0, 1, 0, 1];
    const timeDeltas = [10, 5, 5, 5];
    /** @param {Record<string, any>} data */
    const args = data => ({args: {data}});

    it('should extract profiles', () => {
      const cpuProfile = {nodes, samples, timeDeltas};
      const traceEvents = [
        {id: 'A', name: 'Profile', pid: 1, tid: 2, ...args({startTime: 1234, cpuProfile})},
        {id: 'B', name: 'Profile', pid: 1, tid: 3, ...args({startTime: 2345, cpuProfile})},
      ];

      const profiles = CpuProfileModel.collectProfileEvents(traceEvents);
      expect(profiles).toEqual([
        {id: 'A', pid: 1, tid: 2, startTime: 1234, nodes, samples, timeDeltas},
        {id: 'B', pid: 1, tid: 3, startTime: 2345, nodes, samples, timeDeltas},
      ]);
    });

    it('should ignore profiles without an ID', () => {
      const cpuProfile = {nodes, samples, timeDeltas};
      const traceEvents = [
        {name: 'Profile', pid: 1, tid: 2, ...args({startTime: 1234, cpuProfile})},
        {id: 'missing', name: 'ProfileChunk', pid: 1, tid: 3, ...args({cpuProfile})},
      ];

      const profiles = CpuProfileModel.collectProfileEvents(traceEvents);
      expect(profiles).toEqual([]);
    });

    it('should handle definition of a profile across multiple events', () => {
      const traceEvents = [
        {id: 'A', name: 'Profile', pid: 1, tid: 2, ...args({startTime: 1234})},
        {id: 'B', name: 'Profile', ts: 1235, pid: 1, tid: 3, ...args({cpuProfile: {nodes}})},
        {id: 'A', name: 'ProfileChunk', ts: 2345, pid: 1, tid: 2, ...args({cpuProfile: {nodes}})},
        {id: 'A', name: 'ProfileChunk', ts: 3456, pid: 1, tid: 2, ...args({cpuProfile: {samples}})},
        {id: 'A', name: 'ProfileChunk', ts: 4567, pid: 1, tid: 2, ...args({timeDeltas})},
      ];

      const profiles = CpuProfileModel.collectProfileEvents(traceEvents);
      expect(profiles).toEqual([
        {id: 'A', pid: 1, tid: 2, startTime: 1234, nodes, samples, timeDeltas},
        {id: 'B', pid: 1, tid: 3, startTime: 1235, nodes, samples: [], timeDeltas: []},
      ]);
    });

    it('should work on a real trace', () => {
      const {processEvents} = TraceProcessor.computeTraceOfTab(profilerTrace);
      const profiles = CpuProfileModel.collectProfileEvents(processEvents);
      expect(profiles).toMatchObject([
        {
          id: '0x2',
          pid: 9318,
          tid: 775,
          startTime: 459852380794,
        },
      ]);

      expect(profiles[0]).toHaveProperty('nodes');
      expect(profiles[0].samples).toHaveLength(profiles[0].timeDeltas.length);
    });
  });
});
