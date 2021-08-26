/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import {App} from '../src/app';
import {render} from '@testing-library/preact';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

const flowResult = JSON.parse(
  fs.readFileSync(
    // eslint-disable-next-line max-len
    `${dirname(fileURLToPath(import.meta.url))}/../../lighthouse-core/test/fixtures/fraggle-rock/reports/sample-lhrs.json`,
    'utf-8'
  )
);

let mockLocation: URL;

beforeEach(() => {
  mockLocation = new URL('file:///Users/example/report.html');
  Object.defineProperty(window, 'location', {
    get: () => mockLocation,
  });
});

it('renders a standalone report with summary', async () => {
  const root = render(<App flowResult={flowResult}/>);

  await expect(root.findByTestId('Summary')).resolves.toBeTruthy();
});

it('renders the navigation step', async () => {
  mockLocation.hash = '#index=0';
  const root = render(<App flowResult={flowResult}/>);

  await expect(root.findByTestId('Report')).resolves.toBeTruthy();

  const link = await root.findByText(/https:/);
  expect(link.textContent).toEqual('https://www.mikescerealshack.co/');

  const scores = await root.findAllByText(/^\S+: [0-9.]+/);
  expect(scores.map(s => s.textContent)).toEqual([
    'performance: 0.98',
    'accessibility: 1',
    'best-practices: 1',
    'seo: 1',
    'pwa: 0.3',
  ]);
});

it('renders the timespan step', async () => {
  mockLocation.hash = '#index=1';
  const root = render(<App flowResult={flowResult}/>);

  await expect(root.findByTestId('Report')).resolves.toBeTruthy();

  const link = await root.findByText(/https:/);
  expect(link.textContent).toEqual('https://www.mikescerealshack.co/search?q=call+of+duty');

  const scores = await root.findAllByText(/^\S+: [0-9.]+/);
  expect(scores.map(s => s.textContent)).toEqual([
    'performance: 1',
    'best-practices: 0.71',
    'seo: 0',
    'pwa: 1',
  ]);
});

it('renders the snapshot step', async () => {
  mockLocation.hash = '#index=2';
  const root = render(<App flowResult={flowResult}/>);

  await expect(root.findByTestId('Report')).resolves.toBeTruthy();

  const link = await root.findByText(/https:/);
  expect(link.textContent).toEqual('https://www.mikescerealshack.co/search?q=call+of+duty');

  const scores = await root.findAllByText(/^\S+: [0-9.]+/);
  expect(scores.map(s => s.textContent)).toEqual([
    'performance: 0',
    'accessibility: 0.9',
    'best-practices: 0.88',
    'seo: 0.86',
    'pwa: 1',
  ]);
});
