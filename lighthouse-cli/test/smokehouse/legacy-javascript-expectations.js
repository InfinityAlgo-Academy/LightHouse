/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Expected Lighthouse audit values for sites with polyfills.
 */
module.exports = [
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/legacy-javascript.html',
      finalUrl: 'http://localhost:10200/legacy-javascript.html',
      audits: {
        'legacy-javascript': {
          details: {
            items: [
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'ArrayBuffer',
                location: 'Ln: 1, Col: 12971',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'DataView',
                location: 'Ln: 1, Col: 12987',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Array.prototype.forEach',
                location: 'Ln: 1, Col: 15665',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Array.prototype.indexOf',
                location: 'Ln: 1, Col: 16484',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Array.isArray',
                location: 'Ln: 1, Col: 16666',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Array.prototype.lastIndexOf',
                location: 'Ln: 1, Col: 17440',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Array.of',
                location: 'Ln: 1, Col: 17974',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Date.now',
                location: 'Ln: 1, Col: 19612',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Date.prototype.toISOString',
                location: 'Ln: 1, Col: 19722',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Date.prototype.toJSON',
                location: 'Ln: 1, Col: 19869',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Function.prototype.bind',
                location: 'Ln: 1, Col: 20512',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Number.isInteger',
                location: 'Ln: 1, Col: 25512',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Number.isSafeInteger',
                location: 'Ln: 1, Col: 25712',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Number.parseFloat',
                location: 'Ln: 1, Col: 26055',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Number.parseInt',
                location: 'Ln: 1, Col: 26170',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Object.assign',
                location: 'Ln: 1, Col: 27942',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Object.create',
                location: 'Ln: 1, Col: 28026',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Object.defineProperties',
                location: 'Ln: 1, Col: 28106',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Object.defineProperty',
                location: 'Ln: 1, Col: 28213',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Object.setPrototypeOf',
                location: 'Ln: 1, Col: 29834',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Reflect.apply',
                location: 'Ln: 2, Col: 1795',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Reflect.construct',
                location: 'Ln: 2, Col: 2187',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Reflect.deleteProperty',
                location: 'Ln: 2, Col: 3064',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Reflect.get',
                location: 'Ln: 2, Col: 3807',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Reflect.has',
                location: 'Ln: 2, Col: 4260',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Reflect.isExtensible',
                location: 'Ln: 2, Col: 4389',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Reflect.ownKeys',
                location: 'Ln: 2, Col: 4517',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Reflect.preventExtensions',
                location: 'Ln: 2, Col: 4634',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: '@babel/plugin-transform-spread',
                location: 'Ln: 2, Col: 8274',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'String.prototype.codePointAt',
                location: 'Ln: 2, Col: 11942',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'String.prototype.endsWith',
                location: 'Ln: 2, Col: 12110',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'String.fromCodePoint',
                location: 'Ln: 2, Col: 12880',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'String.prototype.includes (1 / 2)',
                location: 'Ln: 2, Col: 13244',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'String.raw',
                location: 'Ln: 2, Col: 13986',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'String.prototype.repeat (1 / 2)',
                location: 'Ln: 2, Col: 14225',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'String.prototype.startsWith',
                location: 'Ln: 2, Col: 14484',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Array.prototype.includes',
                location: 'Ln: 2, Col: 21969',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Object.entries',
                location: 'Ln: 2, Col: 22158',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Object.getOwnPropertyDescriptor',
                location: 'Ln: 2, Col: 22299',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'Object.values',
                location: 'Ln: 2, Col: 22562',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'String.prototype.padEnd',
                location: 'Ln: 2, Col: 23053',
              },
              {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js',
                description: 'String.prototype.padStart',
                location: 'Ln: 2, Col: 23295',
              },
              {
                url: 'http://localhost:10200/legacy-javascript.js',
                description: 'String.prototype.repeat (2 / 2)',
                location: 'Ln: 8, Col: 0',
              },
              {
                url: 'http://localhost:10200/legacy-javascript.html',
                description: 'String.prototype.includes (2 / 2)',
                location: 'Ln: 1, Col: 6',
              },
            ],
          },
        },
      },
    },
  },
];
