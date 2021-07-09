/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


declare global {
  module LH.Renderer {

    interface ReportRendererOptions {
      /** DOM element that will the overlay DOM should be a child of.
       * Must z-index overlay everything it should.
       * Defaults to the containerEl, but will be set in PSI to avoid being under the sticky header. */
      overlayParentEl?: HTMLElement

      /** Callback running after a DOM element (like .lh-node or .lh-source-location) has been created */
      onDetailsItemRendered?: (type: string, el: HTMLElement, value: any) => void;

      /** Don't automatically apply dark-mode to dark based on (prefers-color-scheme: dark). (DevTools and PSINext don't want this.)
       * Also, the fireworks easter-egg will want to flip to dark, so this setting will also disable chance of fireworks. */
      disableAutoDarkModeAndFireworks?: boolean;

      /** If defined, the 'Save as Gist' item in the topbar dropdown will be shown and when clicked, will run this function. */
      onSaveGist?: (lhr: LH.Result) => string
    }


    class ReportRenderer {
      constructor(lhr: LH.Result, options?: ReportRendererOptions);

      getContainerEl(): HTMLElement;
      getTopBarEl(): HTMLElement;


      // No need for PSI mode. it'll just getContainerEl and get solo-cat mode and pull the scoregauge out, and remove the footer.
      getFinalScreenshot(): void | string;

      // Convenience for folks:
      // category handles a bunch of plugin, n/a, and error cases. groupDefs needed only for PWA
      renderGaugeForCategory(category: LH.ReportCategory, groupDefinitions?: Object<string, LH.Result.ReportGroup>): HTMLElement;
      renderGaugeForScore(num0to1: number): HTMLElement // maybe?
    }
  }
}

Topbar


non-topbar functionality from rUIfeatures
 - elem screenshots (add css var and install overlay)
 - adding lh-narrow ?
 - third-party-filter
 - open tab with data (viewer, treemap)
 - enable fireworks
 - dark mode
 - add Button (for treemap or trace)
 - show perf metric descriptions when there's a perf metric error

 topbar func form rUIfeatures
 - setup stickyheader
 - copy LHR to clipboard
 - topbar dropdown, incl [data-i18n]
 - save json/html
 - print & collapse


/**
 * Full standalone report:
 * .lh-root.lh-vars
 *   <main>
 *     .lh-topbar
 *     .lh-container
 *       (cats.length > 1) ? undefined : .lh-sticky-header
 *       (cats.length > 1) ? <div> : .lh-header--solo-category
 *         .lh-header-container
 *       .lh-report
 *         .lh-categories
 *         .lh-footer
 *       .lh-element-screenshot__overlay
 */


/**
 * DevTools report:
 * .lh-root.lh-vars
 *   .lh-topbar
 *   .lh-container
 *     (same container contents as standalone)
 *   .lh-element-screenshot__overlay  (one level higher than CLI)
 */

todo:
lh-root and lh-vars should probably merge
psi currently doesnt render toplabel warnings

/**
 * PSI report
 * .element-screenshots-container.lh-vars
 * .result-tabs
 *   .result-container
 *     .goog-control.result.lh-vars.lh-root
 *       .psi-category-wrapper
 *         .report-summary
 *           .lh-score__gauge
 *           .inspected-url-text
 *           .lh-scorescale
 *       .result-body
 *         .report-body
 *           .field-data
 *           .psi-category-wrapper
 *             .lab-data
 *               .lh-category
 *     .goog-control.result.lh-vars.lh-root (the Desktop one)
 *        (all the same stuff)
 */

// empty export to keep file a module
export {}
