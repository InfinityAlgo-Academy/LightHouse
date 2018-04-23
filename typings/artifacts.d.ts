/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import * as parseManifest from '../lighthouse-core/lib/manifest-parser.js';

declare global {
  module LH {
    export interface Artifacts {
      // Created by by gather-runner
      fetchedAt: string;
      LighthouseRunWarnings: string[];
      UserAgent: string;
      traces: {[passName: string]: Trace};
      devtoolsLogs: {[passName: string]: DevtoolsLog};
      settings: Config.Settings;

      // Remaining are provided by gatherers
      Accessibility: Artifacts.Accessibility;
      /** Information on all anchors in the page that aren't nofollow or noreferrer. */
      AnchorsWithNoRelNoopener: {href: string; rel: string; target: string}[];
      /** The value of the page's <html> manifest attribute, or null if not defined */
      AppCacheManifest: string | null;
      CacheContents: string[];
      /** Href values of link[rel=canonical] nodes found in HEAD (or null, if no href attribute). */
      Canonical: (string | null)[];
      ChromeConsoleMessages: Crdp.Log.EntryAddedEvent[];
      /** The href and innerText of all non-nofollow anchors in the page. */
      CrawlableLinks: {href: string, text: string}[];
      CSSUsage: {rules: Crdp.CSS.RuleUsage[], stylesheets: Artifacts.CSSStyleSheetInfo[]};
      /** Information on the size of all DOM nodes in the page and the most extreme members. */
      DOMStats: Artifacts.DOMStats;
      /** Relevant attributes and child properties of all <object>s, <embed>s and <applet>s in the page. */
      EmbeddedContent: Artifacts.EmbeddedContentInfo[];
      /** Information on all event listeners in the page. */
      EventListeners: {url: string, type: string, handler?: {description?: string}, objectName: string, line: number, col: number}[];
      /** Information for font faces used in the page. */
      Fonts: Artifacts.Font[];
      FontSize: Artifacts.FontSize;
      /** The hreflang and href values of all link[rel=alternate] nodes found in HEAD. */
      Hreflang: {href: string, hreflang: string}[];
      HTMLWithoutJavaScript: {value: string};
      HTTPRedirect: {value: boolean};
      JSLibraries: {name: string, version: string, npmPkgName: string}[];
      JsUsageArtifact: Crdp.Profiler.ScriptCoverage[];
      Manifest: ReturnType<typeof parseManifest> | null;
      /** The value of the <meta name="description">'s content attribute, or null. */
      MetaDescription: string|null;
      /** The value of the <meta name="robots">'s content attribute, or null. */
      MetaRobots: string|null;
      Offline: number;
      OptimizedImages: Artifacts.OptimizedImage[];
      PasswordInputsWithPreventedPaste: {snippet: string}[];
      /** Information on fetching and the content of the /robots.txt file. */
      RobotsTxt: {status: number|null, content: string|null};
      RuntimeExceptions: Crdp.Runtime.ExceptionThrownEvent[];
      Scripts: Record<string, string>;
      ServiceWorker: {versions: Crdp.ServiceWorker.ServiceWorkerVersion[]};
      /** Information on <script> and <link> tags blocking first paint. */
      TagsBlockingFirstPaint: Artifacts.TagBlockingFirstPaint[];
      ThemeColor: string|null;
      URL: {initialUrl: string, finalUrl: string};
      Viewport: string|null;
      ViewportDimensions: Artifacts.ViewportDimensions;
      /** WebSQL database information for the page or null if none was found. */
      WebSQL: Crdp.Database.Database | null;

      // TODO(bckenny): remove this for real computed artifacts approach
      requestTraceOfTab(trace: Trace): Promise<Artifacts.TraceOfTab>
    }

    module Artifacts {
      export interface Accessibility {
        violations: {
          id: string;
          nodes: {
            path: string;
            snippet: string | null;
            target: string[];
          }[];
        }[];
        notApplicable: {
          id: string
        }[];
      }

      export interface CSSStyleSheetInfo {
        header: Crdp.CSS.CSSStyleSheetHeader;
        content: string;
      }

      export interface DOMStats {
        totalDOMNodes: number;
        width: {max: number, pathToElement: Array<string>, snippet: string};
        depth: {max: number, pathToElement: Array<string>, snippet: string};
      }

      export interface EmbeddedContentInfo {
        tagName: string;
        type: string | null;
        src: string | null;
        data: string | null;
        code: string | null;
        params: {name: string; value: string}[];
      }

      export interface Font {
        display: string;
        family: string;
        featureSettings: string;
        stretch: string;
        style: string;
        unicodeRange: string;
        variant: string;
        weight: string;
        src?: string[];
      }

      export interface FontSize {
        totalTextLength: number;
        failingTextLength: number;
        visitedTextLength: number;
        analyzedFailingTextLength: number;
        analyzedFailingNodesData: {
          fontSize: number;
          textLength: number;
          node: FontSize.DomNodeWithParent;
          cssRule: {
            type: string;
            range: {startLine: number, startColumn: number};
            parentRule: {origin: string, selectors: {text: string}[]};
            styleSheetId: string;
            stylesheet: Crdp.CSS.CSSStyleSheetHeader;
          }
        }
      }

      export module FontSize {
        export interface DomNodeWithParent extends Crdp.DOM.Node {
          parentId: number;
          parentNode: DomNodeWithParent;
        }
      }

      export interface OptimizedImage {
        isSameOrigin: boolean;
        isBase64DataUri: boolean;
        requestId: string;
        url: string;
        mimeType: string;
        resourceSize: number;
        fromProtocol?: boolean;
        originalSize?: number;
        jpegSize?: number;
        webpSize?: number;
        failed?: boolean;
        err?: Error;
      }

      export interface TagBlockingFirstPaint {
        startTime: number;
        endTime: number;
        transferSize: number;
        tag: {
          tagName: string;
          url: string;
        };
      }

      export interface ViewportDimensions {
        innerWidth: number;
        innerHeight: number;
        outerWidth: number;
        outerHeight: number;
        devicePixelRatio: number;
      }

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
