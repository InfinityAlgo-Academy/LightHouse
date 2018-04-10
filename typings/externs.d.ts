/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _Crdp from '../node_modules/vscode-chrome-debug-core/lib/crdp/crdp';
import _StrictEventEmitter from '../third-party/strict-event-emitter-types/index';
import { EventEmitter } from 'events';

declare global {
  // Augment global Error type to include node's optional `code` property
  // see https://nodejs.org/api/errors.html#errors_error_code
  interface Error {
    code?: string;
  }

  module LH {
    // re-export useful type modules under global LH module.
    export import Crdp = _Crdp;
    export type StrictEventEmitter<TEventRecord, TEmitterType = EventEmitter, TEmitRecord = TEventRecord> =
      _StrictEventEmitter<TEmitterType, TEventRecord, TEmitRecord>;

    interface ThrottlingSettings {
      // simulation settings
      rttMs?: number;
      throughputKbps?: number;
      // devtools settings
      requestLatencyMs?: number;
      downloadThroughputKbps?: number;
      uploadThroughputKbps?: number;
      // used by both
      cpuSlowdownMultiplier?: number
    }

    interface SharedFlagsSettings {
      maxWaitForLoad?: number;
      blockedUrlPatterns?: string[];
      additionalTraceCategories?: string;
      auditMode?: boolean | string;
      gatherMode?: boolean | string;
      disableStorageReset?: boolean;
      disableDeviceEmulation?: boolean;
      throttlingMethod?: 'devtools'|'simulate'|'provided';
      throttling?: ThrottlingSettings;
      onlyAudits?: string[];
      onlyCategories?: string[];
      skipAudits?: string[];
    }

    export interface Flags extends SharedFlagsSettings {
      _: string[];
      port: number;
      chromeFlags: string;
      output: any;
      outputPath: string;
      saveAssets: boolean;
      view: boolean;
      logLevel: string;
      hostname: string;
      enableErrorReporting: boolean;
      listAllAudits: boolean;
      listTraceCategories: boolean;
      configPath?: string;
      perf: boolean;
      mixedContent: boolean;
      verbose: boolean;
      quiet: boolean;

      extraHeaders?: string;
    }

    export interface Results {
      url: string;
      audits: Audit.Results;
      lighthouseVersion: string;
      artifacts?: Object;
      initialUrl: string;
      fetchedAt: string;
      reportCategories: ReportCategory[];
    }

    export interface ReportCategory {
      name: string;
      description: string;
      audits: ReportAudit[];
    }

    export interface ReportAudit {
      id: string;
      weight: number;
      group: string;
    }

    export interface LaunchedChrome {
      pid: number;
      port: number;
      kill: () => Promise<{}>;
    }

    export interface LighthouseError extends Error {
      friendlyMessage?: string;
    }

    /**
     * A record of DevTools Debugging Protocol events.
     */
    export type DevtoolsLog = Array<Protocol.RawEventMessage>;

    export interface Trace {
      traceEvents: TraceEvent[];
      metadata?: {
        'cpu-family'?: number;
      };
      [futureProps: string]: any;
    }

    export interface TraceEvent {
      name: string;
      args: {
        data?: {
          url?: string
        };
      };
      tid: number;
      ts: number;
      dur: number;
    }

    export interface DevToolsJsonTarget {
      description: string;
      devtoolsFrontendUrl: string;
      id: string;
      title: string;
      type: string;
      url: string;
      webSocketDebuggerUrl: string;
    }
  }
}
