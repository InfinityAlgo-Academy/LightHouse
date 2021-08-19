/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';
import {App} from '../App';
import {render} from '@testing-library/preact';
import {LH_ROOT} from '../../root';

const flowResult = JSON.parse(
  fs.readFileSync(
    `${LH_ROOT}/lighthouse-core/test/fixtures/fraggle-rock/reports/sample-lhrs.json`,
    'utf-8'
  )
);

it('Renders a standalone report', async () => {
  const root = render(<App flowResult={flowResult}/>);
  const navigation = await root.findByText(/navigation/);
  const timespan = await root.findByText(/timespan/);
  const snapshot = await root.findByText(/snapshot/);

  expect(navigation.innerHTML).toEqual('[2021-08-03T18:28:13.296Z] [navigation] https://www.mikescerealshack.co/');
  expect(timespan.innerHTML).toEqual('[2021-08-03T18:28:31.789Z] [timespan] https://www.mikescerealshack.co/search?q=call+of+duty');
  expect(snapshot.innerHTML).toEqual('[2021-08-03T18:28:36.856Z] [snapshot] https://www.mikescerealshack.co/search?q=call+of+duty');
});
