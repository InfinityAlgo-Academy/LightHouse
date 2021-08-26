/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import {FlowResultContext, useCurrentLhr, useDerivedStepNames} from '../src/util';
import {renderHook} from '@testing-library/preact-hooks';
import {FunctionComponent} from 'preact';
import {act} from 'preact/test-utils';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

const flowResult: LH.FlowResult = JSON.parse(
  fs.readFileSync(
    // eslint-disable-next-line max-len
    `${dirname(fileURLToPath(import.meta.url))}/../../lighthouse-core/test/fixtures/fraggle-rock/reports/sample-lhrs.json`,
    'utf-8'
  )
);

let wrapper: FunctionComponent;

beforeEach(() => {
  window.location.hash = '';
  wrapper = ({children}) => (
    <FlowResultContext.Provider value={flowResult}>{children}</FlowResultContext.Provider>
  );
});

describe('useCurrentLhr', () => {
  it('gets current lhr index from url hash', () => {
    window.location.hash = '#index=1';
    const {result} = renderHook(() => useCurrentLhr(), {wrapper});
    expect(result.current).toEqual({
      index: 1,
      value: flowResult.lhrs[1],
    });
  });

  it('changes on navigation', async () => {
    window.location.hash = '#index=1';
    const render = renderHook(() => useCurrentLhr(), {wrapper});

    expect(render.result.current).toEqual({
      index: 1,
      value: flowResult.lhrs[1],
    });

    await act(() => {
      window.location.hash = '#index=2';
    });
    await render.waitForNextUpdate();

    expect(render.result.current).toEqual({
      index: 2,
      value: flowResult.lhrs[2],
    });
  });

  it('return null if lhr index is unset', () => {
    const {result} = renderHook(() => useCurrentLhr(), {wrapper});
    expect(result.current).toBeNull();
  });

  it('return null if lhr index is out of bounds', () => {
    window.location.hash = '#index=5';
    const {result} = renderHook(() => useCurrentLhr(), {wrapper});
    expect(result.current).toBeNull();
  });

  it('returns null for invalid value', () => {
    window.location.hash = '#index=OHNO';
    const {result} = renderHook(() => useCurrentLhr(), {wrapper});
    expect(result.current).toBeNull();
  });
});

describe('useDerivedStepNames', () => {
  it('counts up for each mode', () => {
    const {result} = renderHook(() => useDerivedStepNames(), {wrapper});
    expect(result.current).toEqual([
      'Navigation (1)',
      'Timespan (1)',
      'Snapshot (1)',
      'Navigation (2)',
    ]);
  });
});
