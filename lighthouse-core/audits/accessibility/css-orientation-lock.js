/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures content is not locked to any specific display orientation.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class CSSOrientationLock extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'css-orientation-lock',
      title: 'Content is not locked to a specific display orientation',
      failureTitle: 'Content is not operable in all display orientations.',
      description: 'Locking orientation with CSS media queries may prevent users of assistive ' +
          'technology from accessing content. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/3.1/css-orientation-lock?application=lighthouse).',
      requiredArtifacts: ['Accessibility'],
    };
  }
}

module.exports = CSSOrientationLock;
