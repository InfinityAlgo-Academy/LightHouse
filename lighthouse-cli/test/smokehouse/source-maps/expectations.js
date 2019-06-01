/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const map = {
  version: 3,
  file: 'out.js',
  sourceRoot: '',
  sources: ['foo.js', 'bar.js'],
  names: ['src', 'maps', 'are', 'fun'],
  mappings: 'AAgBC,SAAQ,CAAEA',
};

/**
 * Expected Lighthouse audit values for Do Better Web tests.
 */
module.exports = [
  {
    artifacts: {
      SourceMaps: [{
        url: 'http://localhost:10200/source-maps/source-maps-tester.html',
        error: 'SyntaxError: Unexpected token { in JSON at position 1',
        map: undefined,
      }, {
        url: 'http://localhost:10200/source-maps/source-maps-tester.html',
        map,
        error: undefined,
      }, {
        url: 'http://localhost:10200/source-maps/bundle.js',
        map,
        error: undefined,
      }, {
        url: 'http://localhost:10200/source-maps/bundle-map-500.js',
        error: 'TypeError: Failed to fetch',
        map: undefined,
      }],
    },
    lhr: {
      requestedUrl: 'http://localhost:10200/source-maps/source-maps-tester.html',
      finalUrl: 'http://localhost:10200/source-maps/source-maps-tester.html',
    },
  },
];
