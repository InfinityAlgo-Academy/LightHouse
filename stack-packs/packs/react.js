/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/* eslint-disable max-len */

'use strict';

const {icon, UIStrings} = require('lighthouse-stack-packs/packs/react');
const i18n = require('../../lighthouse-core/lib/i18n/i18n.js');

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

module.exports = {
  id: 'react',
  iconDataURL: icon,
  title: 'React',
  descriptions: {
    'unminified-css': str_(UIStrings.unminified_css),
    'unminified-javascript': str_(UIStrings.unminified_javascript),
    'unused-javascript': str_(UIStrings.unused_javascript),
    'time-to-first-byte': str_(UIStrings.time_to_first_byte),
    'redirects': str_(UIStrings.redirects),
    'user-timings': str_(UIStrings.user_timings),
    'dom-size': str_(UIStrings.dom_size),
  },
};
module.exports.UIStrings = UIStrings;
