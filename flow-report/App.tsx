/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useState} from 'preact/hooks';

export const Report: FunctionComponent<{lhr: LH.Result}> = ({lhr}) => {
  // TODO(FR-COMPAT): Render an actual report here.
  return (
    <div>
      <h1>{lhr.finalUrl}</h1>
      {
        Object.values(lhr.categories).map((category) =>
          <h2>{category.id}: {category.score}</h2>
        )
      }
    </div>
  );
};

export const App: FunctionComponent<{flowResult: LH.FlowResult}> = ({flowResult}) => {
  const [currentLhrIndex, setCurrentLhrIndex] = useState(0);
  return (
    <>
      <select onChange={e => setCurrentLhrIndex(Number(e.currentTarget.value))}>
        {
          flowResult.lhrs.map((lhr, i) =>
            <option key={lhr.fetchTime} value={i}>
              [{lhr.fetchTime}] [{lhr.gatherMode}] {lhr.finalUrl}
            </option>
          )
        }
      </select>
      <div>
        <Report lhr={flowResult.lhrs[currentLhrIndex]}/>
      </div>
    </>
  );
};
