/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import {SummaryHeader, SummaryFlowStep} from '../../src/summary/summary';
import {render} from '@testing-library/preact';
import {dirname} from 'path';
import {fileURLToPath} from 'url';
import {FunctionComponent} from 'preact';
import {FlowResultContext} from '../../src/util';
import {ReportRendererProvider} from '../../src/wrappers/report-renderer';

const flowResult:LH.FlowResult = JSON.parse(
  fs.readFileSync(
    // eslint-disable-next-line max-len
    `${dirname(fileURLToPath(import.meta.url))}/../../../lighthouse-core/test/fixtures/fraggle-rock/reports/sample-lhrs.json`,
    'utf-8'
  )
);

let mockLocation: URL;
let wrapper: FunctionComponent;

beforeEach(() => {
  mockLocation = new URL('file:///Users/example/report.html');
  Object.defineProperty(window, 'location', {
    get: () => mockLocation,
  });

  wrapper = ({children}) => (
    <FlowResultContext.Provider value={flowResult}>
      <ReportRendererProvider>
        {children}
      </ReportRendererProvider>
    </FlowResultContext.Provider>
  );
});

describe('SummaryHeader', () => {
  it('renders header content', async () => {
    const root = render(<SummaryHeader/>, {wrapper});

    const lhrCounts = await root.findByText(/·/);
    await expect(root.findByText('Summary')).resolves.toBeTruthy();
    expect(lhrCounts.textContent).toEqual(
      '2 navigation reports · 1 timespan reports · 1 snapshot reports'
    );
  });
});

describe('SummaryFlowStep', () => {
  it('renders navigation step', async () => {
    const root = render(<SummaryFlowStep
      lhr={flowResult.lhrs[0]}
      label="Navigation (1)"
      hashIndex={0}
    />, {wrapper});

    await expect(root.findByTestId('SummaryNavigationHeader')).resolves.toBeTruthy();

    await expect(root.findByText('Navigation (1)')).resolves.toBeTruthy();

    const screenshot = await root.findByTestId('SummaryFlowStep__screenshot') as HTMLImageElement;
    expect(screenshot.src).toMatch(/data:image\/jpeg;base64/);

    const gauges = await root.findAllByTestId('Gauge');
    expect(gauges).toHaveLength(4);

    const links = await root.findAllByRole('link') as HTMLAnchorElement[];
    expect(links.map(a => a.href)).toEqual([
      'http://localhost/#index=0',
      'http://localhost/#index=0&anchor=performance',
      'http://localhost/#index=0&anchor=accessibility',
      'http://localhost/#index=0&anchor=best-practices',
      'http://localhost/#index=0&anchor=seo',
    ]);
  });

  it('renders timespan step', async () => {
    const root = render(<SummaryFlowStep
      lhr={flowResult.lhrs[1]}
      label="Timespan (1)"
      hashIndex={1}
    />, {wrapper});

    await expect(root.findByTestId('SummaryNavigationHeader')).rejects.toBeTruthy();

    await expect(root.findByText('Timespan (1)')).resolves.toBeTruthy();

    const screenshot = await root.findByTestId('SummaryFlowStep__screenshot') as HTMLImageElement;
    expect(screenshot.src).toBeFalsy();

    await expect(root.findByTestId('SummaryCategory__null'));
    const gauges = await root.findAllByTestId('CategoryRatio');
    expect(gauges).toHaveLength(3);

    const links = await root.findAllByRole('link') as HTMLAnchorElement[];
    expect(links.map(a => a.href)).toEqual([
      'http://localhost/#index=1',
      'http://localhost/#index=1&anchor=performance',
      // Accessibility is missing in timespan.
      'http://localhost/#index=1&anchor=best-practices',
      'http://localhost/#index=1&anchor=seo',
    ]);
  });

  it('renders snapshot step', async () => {
    const root = render(<SummaryFlowStep
      lhr={flowResult.lhrs[2]}
      label="Snapshot (1)"
      hashIndex={2}
    />, {wrapper});

    await expect(root.findByTestId('SummaryNavigationHeader')).rejects.toBeTruthy();

    await expect(root.findByText('Snapshot (1)')).resolves.toBeTruthy();

    const screenshot = await root.findByTestId('SummaryFlowStep__screenshot') as HTMLImageElement;
    expect(screenshot.src).toMatch(/data:image\/jpeg;base64/);

    const gauges = await root.findAllByTestId('CategoryRatio');
    expect(gauges).toHaveLength(4);

    const links = await root.findAllByRole('link') as HTMLAnchorElement[];
    expect(links.map(a => a.href)).toEqual([
      'http://localhost/#index=2',
      'http://localhost/#index=2&anchor=performance',
      'http://localhost/#index=2&anchor=accessibility',
      'http://localhost/#index=2&anchor=best-practices',
      'http://localhost/#index=2&anchor=seo',
    ]);
  });
});
