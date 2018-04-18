/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH {
    /**
     * The full output of a Lighthouse run.
     */
    export interface Result {
      /** The URL that was supplied to Lighthouse and initially navigated to. */
      initialUrl: string;
      /** The post-redirects URL that Lighthouse loaded. */
      url: string;
      /** The ISO-8601 timestamp of when the results were generated. */
      fetchedAt: string;
      /** The version of Lighthouse with which these results were generated. */
      lighthouseVersion: string;
      /** An object containing the results of the audits, keyed by the audits' `id` identifier. */
      audits: Record<string, Audit.Result>;
      /** The top-level categories, their overall scores, and member audits. */
      reportCategories: Result.Category[];
      /** Descriptions of the groups referenced by CategoryMembers. */
      reportGroups?: Record<string, Result.Group>;


      // Additional non-LHR-lite information.
      /** Description of the runtime configuration used for gathering these results. */
      runtimeConfig: Result.RuntimeConfig;
      /** List of top-level warnings for this Lighthouse run. */
      runWarnings: string[];
      /** The User-Agent string of the browser used run Lighthouse for these results. */
      userAgent: string;
      /** Deprecated. Use fetchedAt instead. */
      generatedTime?: string;
    }

    // Result namespace
    export module Result {
      export interface Category {
        /** The string identifier of the category. */
        id: string;
        /** The human-friendly name of the category */
        name: string;
        /** A more detailed description of the category and its importance. */
        description: string;
        /** The overall score of the category, the weighted average of all its audits. */
        score: number;
        /** An array of references to all the audit members of this category. */
        audits: CategoryMember[];
      }

      export interface CategoryMember {
        /** Matches the `id` of an Audit.Result. */
        id: string;
        /** The weight of the audit's score in the overall category score. */
        weight: number;
        /** Optional grouping within the category. Matches the key of a Result.Group. */
        group?: string;
      }

      export interface Group {
        /** The title of the display group. */
        title: string;
        /** A brief description of the purpose of the display group. */
        description: string;
      }

      /**
       * A description of configuration used for gathering.
       */
      export interface RuntimeConfig {
        environment: {
          name: 'Device Emulation'|'Network Throttling'|'CPU Throttling';
          description: string;
        }[];
        blockedUrlPatterns: string[];
        extraHeaders: Crdp.Network.Headers;
      }
    }
  }
}

// empty export to keep file a module
export {}
