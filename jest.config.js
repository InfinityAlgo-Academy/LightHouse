/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

module.exports = {
  collectCoverage: false,
  coverageReporters: ['none'],
  collectCoverageFrom: [
    '**/core/**/*.js',
    '**/cli/**/*.js',
    '**/report/**/*.js',
    '**/viewer/**/*.js',
  ],
  coveragePathIgnorePatterns: [
    '/test/',
    '/scripts/',
  ],
  setupFilesAfterEnv: ['./core/test/test-utils.js'],
  testEnvironment: 'node',
  testMatch: [
    '**/core/**/*-test.js',
    '**/cli/**/*-test.js',
    '**/report/**/*-test.js',
    '**/core/test/fraggle-rock/**/*-test-pptr.js',
    '**/treemap/**/*-test.js',
    '**/treemap/**/*-test-pptr.js',
    '**/viewer/**/*-test.js',
    '**/viewer/**/*-test-pptr.js',
    '**/third-party/**/*-test.js',
    '**/clients/test/**/*-test.js',
    '**/docs/**/*.test.js',
  ],
  transform: {},
  prettierPath: null,
};
