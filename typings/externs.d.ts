/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

export as namespace LH

export interface Flags {
  _: string[];
  port: number;
  chromeFlags: string;
  output: any;
  outputPath: string;
  saveAssets: boolean;
  view: boolean;
  maxWaitForLoad: number;
  logLevel: string;
  hostname: string;
  blockedUrlPatterns: string[];
  extraHeaders: string;
  enableErrorReporting: boolean;
  listAllAudits: boolean;
  listTraceCategories: boolean;
  auditMode: boolean;
  gatherMode: boolean;
  configPath?: string;
  perf: boolean;
  mixedContent: boolean;
  verbose: boolean;
  quiet: boolean;
}

export interface Config {

}

export interface AuditResult {
  rawValue: boolean|number;
  displayValue?: string;
  debugString?: string;
  score?: boolean|number;
  optimalValue: number|string;
  extendedInfo?: {value: string;};
}

export interface AuditResults {
  [metric: string]: AuditResult
}

export interface AuditFullResult {
  rawValue: boolean|number;
  displayValue: string;
  debugString?: string;
  score: boolean|number;
  scoringMode: string;
  error?: boolean;
  description: string;
  name: string;
  informative?: boolean;
  manual?: boolean;
  notApplicable?: boolean;
  helpText?: string;
  extendedInfo?: any;
  details?: AuditDetails;
  summary?: AuditSummary;
}


export interface AuditSummary {
  wastedMs?: number;
  wastedKb?: number;
}

export interface AuditDetailsItem {
  [key: string]: LegacyDetails | string | number | boolean
}


export interface AuditDetails {
  type: string,
  // summary?: AuditDetailsSummary
  items?: AuditDetailsItem[]
  headings?: any; // AuditTableHeading[]

  header?: LegacyDetails

  scale?: number // for filmstrip
}

export interface AuditDetailsItem {
  [key: string]: LegacyDetails | string | number | boolean
}

export interface LegacyDetails {
  type: string
  text?: string;   // not ideal both of these are ?
  label?: string
  value?: string | number
  granularity?: string
  displayUnit?: string
}

// TODO, move rawValue's use in report to details.summary
export interface AuditDetailsSummary {
  // displayValue?: LegacyDetails
  wastedMs?: number // I might prefer sticking these two into a `performanceOpportunity` object or something, but we never really came up with other uses thus far either...
  wastedKb?: number
}

export interface AuditTableHeading extends LegacyDetails {
  key?: string // TODO, remove ?
  itemKey? : string  // TODO, remove this
  text: string
  itemType: string
}


// export interface CRCDetails {
//   header?: {text: string},
//   longestChain: {duration: number, length: number, transferSize: number},
//   chains: {[requestId: string]: CriticalRequestChainRenderer.CRCNode}
// }


export interface AuditFullResults {
  [auditId: string]: AuditFullResult
}

export interface Results {
  url: string;
  initialUrl: string;
  audits: AuditFullResults;
  lighthouseVersion: string;
  generatedTime: string;
  timing: {total: number},
  userAgent: string,
  artifacts?: Object;
  runWarnings?: string[];
  reportCategories: CategoryMeta[];
  reportGroups: {[groupName: string]: GroupMeta};
  runtimeConfig: {
    blockedUrlPatterns: string[];
    extraHeaders: Object;
    environment: Array<{description: string, enabled: boolean, name: string}>
  }
}

export interface CategoryMeta {
  name: string;
  id: string;
  score: number;
  description: string;
  audits: AuditMeta[];
}
export interface AuditMeta {
  id: string;
  weight: number;
  group?: string;
}

export interface GroupMeta {
  title: string;
  description?: string;
}

export interface LaunchedChrome {
  pid: number;
  port: number;
  kill: () => Promise<{}>;
}

export interface LighthouseError extends Error {
  code?: string;
  friendlyMessage?: string;
}



export interface ByteEfficiencyAuditDetails {
  type: string,
  // summary?: AuditDetailsSummary // do we use this right now?
  items: BEAuditDetailsItem[]
  headings: any; // AuditTableHeading; // TODO, define later.
}

export interface TotalMsAuditDetails {
  type: string,
  // summary?: AuditDetailsSummary
  items: TotalMsAuditDetailsItem[]
  headings: any; // AuditTableHeading; // TODO, define later.
}

export interface CachingAuditDetails {
  type: string,
  // summary?: AuditDetailsSummary
  items: CachingAuditDetailsItem[]
  headings: any; // AuditTableHeading; // TODO, define later.
}




export interface BEAuditDetailsItem {
  url: string;
  wastedBytes: number;
  totalBytes: number;

  wastedMs?: number; // we plan to remove these, though it's currently always present
  totalMs: number;

  wastedPercent?: number;
  fromProtocol?: boolean;
  isCrossOrigin?: boolean;
  isWasteful?: boolean;
}

export interface TotalMsAuditDetailsItem {
  url: string;
  wastedMs: number;
  totalBytes?: number; // todo: make consistent across the audits
}

export interface CachingAuditDetailsItem {
  url: string;
  wastedBytes: number;
  totalBytes: number;

  cacheHitProbability: number;
  cacheLifetimeInSeconds: number;
}
