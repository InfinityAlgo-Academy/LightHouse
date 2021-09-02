/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {render} from '@testing-library/preact';

import {CategoryRatio} from '../src/common';

describe('CategoryRatio', () => {
  it('renders passed audit count', async () => {
    const audits = {
      'audit1': {score: 1},
      'audit2': {score: 1},
      'audit3': {score: 0},
    } as any;
    const category = {
      auditRefs: [
        {id: 'audit1', weight: 1},
        {id: 'audit2', weight: 0},
        {id: 'audit3', weight: 1},
      ],
    } as any;

    const root = render(<CategoryRatio
      audits={audits}
      category={category}
      href="index=0&achor=seo"
    />);
    const link = root.getByRole('link');

    expect(link.className).toEqual('CategoryRatio CategoryRatio--average');
    expect(link.textContent).toEqual('2/3');
  });

  it('renders passed audit count with fail rating', async () => {
    const audits = {
      'audit1': {score: 0},
      'audit2': {score: 0},
      'audit3': {score: 0},
    } as any;
    const category = {
      auditRefs: [
        {id: 'audit1', weight: 1},
        {id: 'audit2', weight: 1},
        {id: 'audit3', weight: 1},
      ],
    } as any;

    const root = render(<CategoryRatio
      audits={audits}
      category={category}
      href="index=0&achor=seo"
    />);
    const link = root.getByRole('link');

    expect(link.className).toEqual('CategoryRatio CategoryRatio--fail');
    expect(link.textContent).toEqual('0/3');
  });

  it('renders passed audit count with pass rating', async () => {
    const audits = {
      'audit1': {score: 1},
      'audit2': {score: 1},
      'audit3': {score: 1},
    } as any;
    const category = {
      auditRefs: [
        {id: 'audit1', weight: 1},
        {id: 'audit2', weight: 1},
        {id: 'audit3', weight: 1},
      ],
    } as any;

    const root = render(<CategoryRatio
      audits={audits}
      category={category}
      href="index=0&achor=seo"
    />);
    const link = root.getByRole('link');

    expect(link.className).toEqual('CategoryRatio CategoryRatio--pass');
    expect(link.textContent).toEqual('3/3');
  });

  it('uses null rating of no audits have weight', async () => {
    const audits = {
      'audit1': {score: 1},
      'audit2': {score: 0},
    } as any;
    const category = {
      auditRefs: [
        {id: 'audit1', weight: 0},
        {id: 'audit2', weight: 0},
      ],
    } as any;

    const root = render(<CategoryRatio
      audits={audits}
      category={category}
      href="index=0&achor=seo"
    />);
    const link = root.getByRole('link');

    expect(link.className).toEqual('CategoryRatio CategoryRatio--null');
    expect(link.textContent).toEqual('1/2');
  });

  it('treats audit ref with no matching score as fail', async () => {
    const audits = {
      'audit1': {score: 1},
    } as any;
    const category = {
      auditRefs: [
        {id: 'audit1', weight: 1},
        {id: 'audit2', weight: 1},
      ],
    } as any;

    const root = render(<CategoryRatio
      audits={audits}
      category={category}
      href="index=0&achor=seo"
    />);
    const link = root.getByRole('link');

    expect(link.className).toEqual('CategoryRatio CategoryRatio--average');
    expect(link.textContent).toEqual('1/2');
  });
});
