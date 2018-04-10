/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH {
    export interface Artifacts {
      fetchedAt: string;
      LighthouseRunWarnings: string[];
      UserAgent: string;
      traces: {[passName: string]: Trace};
      devtoolsLogs: {[passName: string]: DevtoolsLog};
    }

    module Artifacts {
      export interface MetricComputationDataInput {
        devtoolsLog: DevtoolsLog;
        trace: Trace;
        settings: Config.Settings;
      }

      export interface MetricComputationData extends MetricComputationDataInput {
        networkRecords: Array<WebInspector.NetworkRequest>;
        traceOfTab: TraceOfTab;
      }

      export interface Metric {
        timing: number;
        timestamp: number;
      }

      export interface LanternMetric {
        timing: number;
        optimisticEstimate: Gatherer.Simulation.Result
        pessimisticEstimate: Gatherer.Simulation.Result;
        optimisticGraph: Gatherer.Simulation.GraphNode;
        pessimisticGraph: Gatherer.Simulation.GraphNode;
      }

      export interface TraceTimes {
        navigationStart: number;
        firstPaint: number;
        firstContentfulPaint: number;
        firstMeaningfulPaint: number;
        traceEnd: number;
        onLoad: number;
        domContentLoaded: number;
      }

      export interface TraceOfTab {
        timings: TraceTimes;
        timestamps: TraceTimes;
        processEvents: Array<TraceEvent>;
        mainThreadEvents: Array<TraceEvent>;
        startedInPageEvt: TraceEvent;
        navigationStartEvt: TraceEvent;
        firstPaintEvt: TraceEvent;
        firstContentfulPaintEvt: TraceEvent;
        firstMeaningfulPaintEvt: TraceEvent;
        onLoadEvt: TraceEvent;
        fmpFellBack: boolean;
      }
    }
  }
}

// empty export to keep file a module
export {}
