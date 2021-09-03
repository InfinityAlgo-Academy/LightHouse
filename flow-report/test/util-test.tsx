/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

import {renderHook} from '@testing-library/preact-hooks';
import {FunctionComponent} from 'preact';
import {act} from 'preact/test-utils';

import {FlowResultContext, useCurrentLhr, useDerivedStepNames} from '../src/util';

const flowResult: LH.FlowResult = JSON.parse(
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

describe('useCurrentLhr', () => {
  it('gets current lhr index from url hash', () => {
    global.location.hash = '#index=1';
    const {result} = renderHook(() => useCurrentLhr(), {wrapper});
    expect(result.current).toEqual({
      index: 1,
      value: flowResult.lhrs[1],
    });
  });

  it('changes on navigation', async () => {
    global.location.hash = '#index=1';
    const render = renderHook(() => useCurrentLhr(), {wrapper});

    expect(render.result.current).toEqual({
      index: 1,
      value: flowResult.lhrs[1],
    });

    await act(() => {
      global.location.hash = '#index=2';
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
    global.location.hash = '#index=5';
    const {result} = renderHook(() => useCurrentLhr(), {wrapper});
    expect(result.current).toBeNull();
  });

  it('returns null for invalid value', () => {
    global.location.hash = '#index=OHNO';
    const {result} = renderHook(() => useCurrentLhr(), {wrapper});
    expect(result.current).toBeNull();
  });
});

describe('useDerivedStepNames', () => {
  it('counts up for each mode', () => {
    const {result} = renderHook(() => useDerivedStepNames(), {wrapper});
    expect(result.current).toEqual([
      'Navigation report (www.mikescerealshack.co/)',
      'Timespan report (www.mikescerealshack.co/search)',
      'Snapshot report (www.mikescerealshack.co/search)',
      'Navigation report (www.mikescerealshack.co/corrections)',
    ]);
  });

  it('enumerates if multiple in same group', () => {
    const lhrs = flowResult.lhrs;
    lhrs[3] = lhrs[2];
    const newFlowResult = {lhrs};
    const wrapper: FunctionComponent = ({children}) => (
      <FlowResultContext.Provider value={newFlowResult}>{children}</FlowResultContext.Provider>
    );

    const {result} = renderHook(() => useDerivedStepNames(), {wrapper});

    expect(result.current).toEqual([
      'Navigation report (www.mikescerealshack.co/)',
      'Timespan report (www.mikescerealshack.co/search)',
      'Snapshot report 1 (www.mikescerealshack.co/search)',
      'Snapshot report 2 (www.mikescerealshack.co/search)',
    ]);
  });
});
