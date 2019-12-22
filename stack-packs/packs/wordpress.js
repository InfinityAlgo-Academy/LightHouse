/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/* eslint-disable max-len */

'use strict';

const {icon, UIStrings} = require('lighthouse-stack-packs/packs/wordpress');
const i18n = require('../../lighthouse-core/lib/i18n/i18n.js');

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

module.exports = {
  id: 'wordpress',
  iconDataURL: icon,
  title: 'WordPress',
  descriptions: {
    'unused-css-rules': str_(UIStrings.unused_css_rules),
    'uses-webp-images': str_(UIStrings.uses_webp_images),
    'offscreen-images': str_(UIStrings.offscreen_images),
    'total-byte-weight': str_(UIStrings.total_byte_weight),
    'render-blocking-resources': str_(UIStrings.render_blocking_resources),
    'unminified-css': str_(UIStrings.unminified_css),
    'unminified-javascript': str_(UIStrings.unminified_javascript),
    'efficient-animated-content': str_(UIStrings.efficient_animated_content),
    'unused-javascript': str_(UIStrings.unused_javascript),
    'uses-long-cache-ttl': str_(UIStrings.uses_long_cache_ttl),
    'uses-optimized-images': str_(UIStrings.uses_optimized_images),
    'uses-text-compression': str_(UIStrings.uses_text_compression),
    'uses-responsive-images': str_(UIStrings.uses_responsive_images),
    'time-to-first-byte': str_(UIStrings.time_to_first_byte),
  },
};
module.exports.UIStrings = UIStrings;
