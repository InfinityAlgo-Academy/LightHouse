/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {strict as assert} from 'assert';

import InputsCanBePastedIntoAudit from '../../../audits/dobetterweb/inputs-can-be-pasted-into.js';

describe('Inputs can be pasted into', () => {
  it('passes when there are no inputs preventing paste', () => {
    const auditResult = InputsCanBePastedIntoAudit.audit({
      Inputs: {
        inputs: [],
      },
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when there are inputs preventing paste', () => {
    const auditResult = InputsCanBePastedIntoAudit.audit({
      Inputs: {
        inputs: [
          {node: {snippet: 'bad'}, preventsPaste: true},
          {node: {snippet: ''}, preventsPaste: false},
          {node: {snippet: ''}},
        ],
      },
    });
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.details.items[0].node.snippet, 'bad');
  });
});
