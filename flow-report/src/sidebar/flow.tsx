/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {classNames, useCurrentLhr, useFlowResult} from '../util';

const FlowStepIcon: FunctionComponent<{mode: LH.Result.GatherMode}> = ({mode}) => {
  return <div className={`FlowStepIcon FlowStepIcon--${mode}`}></div>;
};

const SidebarFlowStep: FunctionComponent<{
  mode: LH.Result.GatherMode,
  href: string,
  label: string,
  hideTopLine: boolean,
  hideBottomLine: boolean,
  isCurrent: boolean,
}> = ({href, label, mode, hideTopLine, hideBottomLine, isCurrent}) => {
  return (
    <a
      className={classNames('SidebarFlowStep', {'Sidebar--current': isCurrent})}
      href={href}
    >
      <div className="SidebarFlowStep__icon">
        <div
          className="SidebarFlowStep__icon--line"
          style={hideTopLine ? {background: 'transparent'} : undefined}
        />
        <FlowStepIcon mode={mode}/>
        <div
          className="SidebarFlowStep__icon--line"
          style={hideBottomLine ? {background: 'transparent'} : undefined}
        />
      </div>
      <div className={`SidebarFlowStep__label SidebarFlowStep__label--${mode}`}>{label}</div>
    </a>
  );
};

export const SidebarFlow: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const currentLhr = useCurrentLhr();

  let numNavigation = 1;
  let numTimespan = 1;
  let numSnapshot = 1;

  return (
    <>
      {flowResult.lhrs.map((lhr, index) => {
        let name;
        switch (lhr.gatherMode) {
          case 'navigation':
            name = `Navigation (${numNavigation++})`;
            break;
          case 'timespan':
            name = `Timespan (${numTimespan++})`;
            break;
          case 'snapshot':
            name = `Snapshot (${numSnapshot++})`;
            break;
        }
        const url = new URL(location.href);
        url.hash = `#index=${index}`;
        return (
          <SidebarFlowStep
            key={lhr.fetchTime}
            mode={lhr.gatherMode}
            href={url.href}
            label={name}
            hideTopLine={index === 0}
            hideBottomLine={index === flowResult.lhrs.length - 1}
            isCurrent={index === (currentLhr && currentLhr.index)}
          />
        );
      })}
    </>
  );
};
