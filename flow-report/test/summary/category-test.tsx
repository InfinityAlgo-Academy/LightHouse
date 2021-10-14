/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {render} from '@testing-library/preact';

import {SummaryTooltip} from '../../src/summary/category';
import {flowResult} from '../sample-flow';
import {I18nProvider} from '../../src/i18n/i18n';
import {FlowResultContext} from '../../src/util';

let wrapper: FunctionComponent;

beforeEach(() => {
  // Include sample flowResult for locale in I18nProvider.
  wrapper = ({children}) => (
    <FlowResultContext.Provider value={flowResult}>
      <I18nProvider>
        {children}
      </I18nProvider>
    </FlowResultContext.Provider>
  );
});

describe('SummaryTooltip', () => {
  it('renders tooltip with rating', async () => {
    const category: any = {
      id: 'performance',
      score: 1,
      auditRefs: [
        {result: {score: 1, scoreDisplayMode: 'binary'}, weight: 1, group: 'diagnostics'},
        {result: {score: 1, scoreDisplayMode: 'binary'}, weight: 1, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'binary'}, weight: 1, group: 'diagnostics'},
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="snapshot"/>,
      {wrapper}
    );

    expect(root.getByText('Average')).toBeTruthy();
    expect(() => root.getByText(/^[0-9]+$/)).toThrow();
    expect(root.getByText('2 audits passed')).toBeTruthy();
    expect(root.getByText('3 passable audits')).toBeTruthy();
  });

  it('renders tooltip without rating', async () => {
    const category: any = {
      id: 'performance',
      score: 1,
      auditRefs: [
        {result: {score: 1, scoreDisplayMode: 'binary'}, weight: 0, group: 'diagnostics'},
        {result: {score: 1, scoreDisplayMode: 'binary'}, weight: 0, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'binary'}, weight: 0, group: 'diagnostics'},
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="snapshot"/>,
      {wrapper}
    );

    expect(() => root.getByText(/^(Average|Good|Poor)$/)).toThrow();
    expect(() => root.getByText(/^[0-9]+$/)).toThrow();
    expect(root.getByText('2 audits passed')).toBeTruthy();
    expect(root.getByText('3 passable audits')).toBeTruthy();
  });

  it('renders scored category tooltip with score', async () => {
    const category: any = {
      id: 'performance',
      score: 1,
      auditRefs: [
        {result: {score: 1, scoreDisplayMode: 'binary'}, weight: 1, group: 'diagnostics'},
        {result: {score: 1, scoreDisplayMode: 'binary'}, weight: 1, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'binary'}, weight: 1, group: 'diagnostics'},
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="navigation"/>,
      {wrapper}
    );

    expect(root.getByText('Good')).toBeTruthy();
    expect(root.getByText('100')).toBeTruthy();
    expect(root.getByText('2 audits passed')).toBeTruthy();
    expect(root.getByText('3 passable audits')).toBeTruthy();
  });

  it('renders informative audit count if any', async () => {
    const category: any = {
      id: 'performance',
      score: 1,
      auditRefs: [
        {result: {score: 1, scoreDisplayMode: 'binary'}, weight: 1, group: 'diagnostics'},
        {result: {score: 1, scoreDisplayMode: 'binary'}, weight: 1, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'informative'}, weight: 1, group: 'diagnostics'},
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="navigation"/>,
      {wrapper}
    );

    expect(root.getByText('Good')).toBeTruthy();
    expect(root.getByText('100')).toBeTruthy();
    expect(root.getByText('2 audits passed')).toBeTruthy();
    expect(root.getByText('2 passable audits')).toBeTruthy();
    expect(root.getByText('1 informative audit')).toBeTruthy();
  });
});
