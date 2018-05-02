/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH.Audit {
    export interface Context {
      options: Record<string, any>; // audit options
      settings: Config.Settings;
    }

    export interface ScoreOptions {
      scorePODR: number;
      scoreMedian: number;
    }

    export interface ScoringModes {
      NUMERIC: 'numeric';
      BINARY: 'binary';
    }

    export type ScoringModeValue = Audit.ScoringModes[keyof Audit.ScoringModes];

    export interface Meta {
      name: string;
      description: string;
      helpText: string;
      requiredArtifacts: Array<keyof Artifacts>;
      failureDescription?: string;
      informative?: boolean;
      manual?: boolean;
      scoreDisplayMode?: Audit.ScoringModeValue;
    }

    export interface Heading {
      key: string;
      itemType: string;
      text: string;
      displayUnit?: string;
      granularity?: number;
    }

    export interface ByteEfficiencyProduct {
      results: Array<ByteEfficiencyResult>;
      headings: Array<Audit.Heading>;
      displayValue?: string;
      debugString?: string;
    }

    export interface ByteEfficiencyResult {
      url: string | DetailsRendererCodeDetailJSON;
      wastedBytes: number;
      totalBytes: number;
      wastedPercent?: number;
    }

    // TODO: placeholder typedefs until Details are typed
    export interface DetailsRendererDetailsSummary {
      wastedMs?: number;
      wastedBytes?: number;
    }

    // TODO: placeholder typedefs until Details are typed
    export interface DetailsRendererDetailsJSON {
      type: 'table';
      headings: Array<Audit.Heading>;
      items: Array<{[x: string]: DetailsItem}>;
      summary?: DetailsRendererDetailsSummary;
    }

    export interface DetailsRendererCodeDetailJSON {
      type: 'code',
      value: string;
    }

    export type DetailsItem = string | number | DetailsRendererNodeDetailsJSON |
      DetailsRendererLinkDetailsJSON | DetailsRendererCodeDetailJSON | undefined |
      boolean;

    export interface DetailsRendererNodeDetailsJSON {
      type: 'node';
      path?: string;
      selector?: string;
      snippet?: string;
    }

    export interface DetailsRendererLinkDetailsJSON {
      type: 'link';
      text: string;
      url: string;
    }

    // Type returned by Audit.audit(). Only rawValue is required.
    export interface Product {
      rawValue: boolean | number | null;
      displayValue?: string;
      debugString?: string;
      score?: number;
      extendedInfo?: {[p: string]: any};
      notApplicable?: boolean;
      error?: boolean;
      // TODO(bckenny): define details
      details?: object;
    }

    /* Audit result returned in Lighthouse report. All audits offer a description and score of 0-1 */
    export interface Result {
      rawValue: boolean | number | null;
      displayValue: string;
      debugString?: string;
      score: number;
      scoreDisplayMode: ScoringModeValue;
      description: string;
      extendedInfo?: {[p: string]: any};
      notApplicable?: boolean;
      error?: boolean;
      name: string;
      helpText?: string;
      informative?: boolean;
      manual?: boolean;
      // TODO(bckenny): define details
      details?: object;
    }

    export interface Results {
      [metric: string]: Result;
    }

    export type SimpleCriticalRequestNode = {
      [id: string]: {
        request: {
          url: string;
          startTime: number;
          endTime: number;
          _responseReceivedTime: number;
          transferSize: number;
        };
        children: SimpleCriticalRequestNode;
      }
    }
  }
}

// empty export to keep file a module
export {}
