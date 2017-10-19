/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Expected Lighthouse audit values for seo tests
 */
module.exports = [
  {
    initialUrl: 'http://localhost:10200/seo/seo-tester.html',
    url: 'http://localhost:10200/seo/seo-tester.html',
    audits: {
      'viewport': {
        score: true,
      },
      'document-title': {
        score: true,
      },
      'meta-description': {
        score: true,
      },
      'http-status-code': {
        score: true,
      },
      'link-text': {
        score: true,
      },
    },
  },
  {
    initialUrl: 'http://localhost:10200/seo/seo-failure-cases.html?status_code=403',
    url: 'http://localhost:10200/seo/seo-failure-cases.html?status_code=403',
    audits: {
      'viewport': {
        score: false,
      },
      'document-title': {
        score: false,
        extendedInfo: {
          value: {
            id: 'document-title',
          },
        },
      },
      'meta-description': {
        score: false,
      },
      'http-status-code': {
        score: false,
        displayValue: '403',
      },
      'link-text': {
        score: false,
        displayValue: '3 links found',
        details: {
          items: {
            length: 3,
          },
        },
      },
    },
  },
];
