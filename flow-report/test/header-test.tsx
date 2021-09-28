/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

import {FunctionComponent} from 'preact';
import {render} from '@testing-library/preact';

import {Header} from '../src/header';
import {FlowResultContext} from '../src/util';

const flowResult = JSON.parse(
  fs.readFileSync(
    // eslint-disable-next-line max-len
    `${dirname(fileURLToPath(import.meta.url))}/../../lighthouse-core/test/fixtures/fraggle-rock/reports/sample-lhrs.json`,
    'utf-8'
  )
);

let wrapper: FunctionComponent;

beforeEach(() => {
  wrapper = ({children}) => (
    <FlowResultContext.Provider value={flowResult}>{children}</FlowResultContext.Provider>
  );
});

it('renders all sections for a middle step', () => {
  const currentLhr = {index: 1} as any;
  const root = render(<Header currentLhr={currentLhr}/>, {wrapper});

  expect(root.baseElement.querySelector('.Header__prev-thumbnail')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__prev-title')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__next-thumbnail')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__next-title')).toBeTruthy();
});

it('renders only next section for first step', () => {
  const currentLhr = {index: 0} as any;
  const root = render(<Header currentLhr={currentLhr}/>, {wrapper});

  expect(root.baseElement.querySelector('.Header__prev-thumbnail')).toBeFalsy();
  expect(root.baseElement.querySelector('.Header__prev-title')).toBeFalsy();
  expect(root.baseElement.querySelector('.Header__next-thumbnail')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__next-title')).toBeTruthy();
});

it('renders only previous section for last step', () => {
  const currentLhr = {index: 3} as any;
  const root = render(<Header currentLhr={currentLhr}/>, {wrapper});

  expect(root.baseElement.querySelector('.Header__prev-thumbnail')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__prev-title')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__next-thumbnail')).toBeFalsy();
  expect(root.baseElement.querySelector('.Header__next-title')).toBeFalsy();
});
