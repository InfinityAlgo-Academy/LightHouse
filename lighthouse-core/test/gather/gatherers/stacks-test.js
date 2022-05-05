/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


/* eslint-env jest */

import StacksGatherer from '../../../gather/gatherers/stacks.js';
import {fnAny} from '../../test-utils.js';

describe('StacksGatherer', () => {
  /** @type {{executionContext: {evaluate: jest.Mock}}} */
  let driver;

  beforeEach(() => {
    driver = {executionContext: {evaluate: fnAny()}};
  });

  it('returns the detected stacks', async () => {
    driver.executionContext.evaluate.mockResolvedValue([
      {id: 'jquery', name: 'jQuery', version: '2.1.0', npm: 'jquery'},
      {id: 'angular', name: 'Angular', version: '', npm: ''},
      {id: 'magento', name: 'Magento', version: 2},
    ]);

    /** @type {*} */
    const executionContext = driver.executionContext;
    expect(await StacksGatherer.collectStacks(executionContext)).toEqual([
      {detector: 'js', id: 'jquery', name: 'jQuery', npm: 'jquery', version: '2.1.0'},
      {detector: 'js', id: 'angular', name: 'Angular', npm: undefined, version: undefined},
      {detector: 'js', id: 'magento', name: 'Magento', npm: undefined, version: '2'},
    ]);
  });
});
