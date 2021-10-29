/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global ReportGenerator */

/** @typedef {import('../../../report/renderer/dom').DOM} DOM */
/** @typedef {import('../../../shared/localization/locales').LhlMessages} LhlMessages */

import {ReportUIFeatures} from '../../../report/renderer/report-ui-features.js';
import {SwapLocaleFeature} from '../../../report/renderer/swap-locale-feature.js';

/**
 * Extends ReportUIFeatures to add an (optional) ability to save to a gist and
 * generates the saved report from a browserified ReportGenerator.
 */
export class ViewerUIFeatures extends ReportUIFeatures {
  /**
   * @param {DOM} dom
   * @param {{saveGist?: function(LH.Result): void, refresh: function(LH.Result): void}} callbacks
   */
  constructor(dom, callbacks) {
    super(dom);

    this._saveGistCallback = callbacks.saveGist;
    this._refreshCallback = callbacks.refresh;
    this._swapLocales = new SwapLocaleFeature(this, this._dom, {
      onLocaleSelected: this._swapLocale.bind(this),
    });
  }

  /**
   * @param {LH.Result} report
   * @override
   */
  initFeatures(report) {
    super.initFeatures(report);

    // Disable option to save as gist if no callback for saving.
    if (!this._saveGistCallback) {
      const saveGistItem =
        this._dom.find('.lh-tools__dropdown a[data-action="save-gist"]', this._document);
      saveGistItem.setAttribute('disabled', 'true');
    }

    this._getI18nModule().then(async (i18nModule) => {
      const locales = /** @type {LH.Locale[]} */ (
        await i18nModule.format.getCanonicalLocales());
      this._swapLocales.enable(locales);
    }).catch(err => console.error(err));
  }

  /**
   * Uses ReportGenerator to create the html that recreates this report.
   * @return {string}
   * @override
   */
  getReportHtml() {
    return ReportGenerator.generateReportHtml(this.json);
  }

  /**
   * @override
   */
  saveAsGist() {
    if (this._saveGistCallback) {
      this._saveGistCallback(this.json);
    } else {
      // UI should prevent this from being called with no callback, but throw to be sure.
      throw new Error('Cannot save this report as a gist');
    }

    // Disable save-gist option after saving.
    const saveGistItem =
      this._dom.find('.lh-tools__dropdown a[data-action="save-gist"]', this._document);
    saveGistItem.setAttribute('disabled', 'true');
  }

  /**
   * @param {LH.Locale} locale
   * @return {Promise<LhlMessages>}
   */
  async _fetchLocaleMessages(locale) {
    const response = await fetch(`./locales/${locale}.json`);
    return response.json();
  }

  /**
   * @param {LH.Locale} locale
   */
  async _swapLocale(locale) {
    const lhlMessages = await this._fetchLocaleMessages(locale);
    const i18nModule = await this._getI18nModule();
    if (!lhlMessages) throw new Error(`could not fetch data for locale: ${locale}`);

    i18nModule.format.registerLocaleData(locale, lhlMessages);
    const newLhr = i18nModule.swapLocale(this.json, locale).lhr;
    this._refreshCallback(newLhr);
  }

  /**
   * The i18n module is only need for swap-locale-feature.js, and is ~30KB,
   * so it is lazily loaded.
   * TODO: reduce the size of the formatting code and include it always (remove lazy load),
   *       possibly moving into base ReportUIFeatures.
   */
  _getI18nModule() {
    return import('../../../shared/localization/i18n-module.js');
  }
}
