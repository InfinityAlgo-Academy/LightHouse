/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const legacyDefaultConfig = require('../../config/default-config.js');

/** @type {LH.Config.Json} */
const defaultConfig = {
  artifacts: [
    // Artifacts which can be depended on come first.
    {id: 'DevtoolsLog', gatherer: 'devtools-log'},
    {id: 'Trace', gatherer: 'trace'},

    /* eslint-disable max-len */
    {id: 'Accessibility', gatherer: 'accessibility'},
    {id: 'Appcache', gatherer: 'dobetterweb/appcache'},
    {id: 'CacheContents', gatherer: 'cache-contents'},
    {id: 'ConsoleMessages', gatherer: 'console-messages'},
    {id: 'Doctype', gatherer: 'dobetterweb/doctype'},
    {id: 'Domstats', gatherer: 'dobetterweb/domstats'},
    {id: 'EmbeddedContent', gatherer: 'seo/embedded-content'},
    {id: 'FontSize', gatherer: 'seo/font-size'},
    {id: 'FormElements', gatherer: 'form-elements'},
    {id: 'GlobalListeners', gatherer: 'global-listeners'},
    {id: 'IframeElements', gatherer: 'iframe-elements'},
    {id: 'MetaElements', gatherer: 'meta-elements'},
    {id: 'PasswordInputsWithPreventedPaste', gatherer: 'dobetterweb/password-inputs-with-prevented-paste'},
    {id: 'RobotsTxt', gatherer: 'seo/robots-txt'},
    {id: 'TapTargets', gatherer: 'seo/tap-targets'},
    {id: 'ViewportDimensions', gatherer: 'viewport-dimensions'},
    /* eslint-enable max-len */

    // Artifact copies are renamed for compatibility with legacy artifacts.
    {id: 'devtoolsLogs', gatherer: 'devtools-log-compat'},
    {id: 'traces', gatherer: 'trace-compat'},
  ],
  navigations: [
    {
      id: 'default',
      artifacts: [
        // Artifacts which can be depended on come first.
        'DevtoolsLog',
        'Trace',

        'Accessibility',
        'Appcache',
        'CacheContents',
        'ConsoleMessages',
        'Doctype',
        'Domstats',
        'EmbeddedContent',
        'FontSize',
        'FormElements',
        'GlobalListeners',
        'IframeElements',
        'MetaElements',
        'PasswordInputsWithPreventedPaste',
        'RobotsTxt',
        'TapTargets',
        'ViewportDimensions',

        // Compat artifacts come last.
        'devtoolsLogs',
        'traces',
      ],
    },
  ],
  settings: legacyDefaultConfig.settings,
  audits: legacyDefaultConfig.audits,
  categories: legacyDefaultConfig.categories,
  groups: legacyDefaultConfig.groups,
};

module.exports = defaultConfig;
