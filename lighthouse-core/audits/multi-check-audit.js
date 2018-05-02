/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Base class for boolean audits that can have multiple reasons for failure
 */

const Audit = require('./audit');

class MultiCheckAudit extends Audit {
  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts) {
    return Promise.resolve(this.audit_(artifacts)).then(result => this.createAuditProduct(result));
  }

  /**
   * @param {{failures: Array<string>, warnings?: Array<string>, manifestValues?: LH.Artifacts.ManifestValues}} result
   * @return {LH.Audit.Product}
   */
  static createAuditProduct(result) {
    const extendedInfo = {
      value: result,
    };

    // If we fail, share the failures
    if (result.failures.length > 0) {
      return {
        rawValue: false,
        debugString: `Failures: ${result.failures.join(', ')}.`,
        extendedInfo,
      };
    }

    let debugString;
    if (result.warnings && result.warnings.length > 0) {
      debugString = `Warnings: ${result.warnings.join(', ')}`;
    }

    // Otherwise, we pass
    return {
      rawValue: true,
      extendedInfo,
      debugString,
    };
  }

  /* eslint-disable no-unused-vars */

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<{failures: Array<string>, warnings?: Array<string>, manifestValues?: LH.Artifacts.ManifestValues}>}
   */
  static audit_(artifacts) {
    throw new Error('audit_ unimplemented');
  }

  /* eslint-enable no-unused-vars */
}

module.exports = MultiCheckAudit;
