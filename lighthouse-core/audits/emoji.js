/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * @fileoverview Emoji yall
 */

const Audit = require('./audit');
const Formatter = require('../report/formatter');
const emojiRegex = require('emoji-regex');

class Emoji extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Emoji',
      name: 'emoji',
      description: 'Uses emoji',
      helpText: '',
      requiredArtifacts: ['BodyText']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const emojis = artifacts.BodyText.value.match(emojiRegex());
    const joined = emojis.join(', ');
    
    return Emoji.generateAuditResult({
      rawValue: emojis.length > 0,
      displayValue: joined,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.NULL,
        value: emojis
      }
    });
  }
}

module.exports = Emoji;
