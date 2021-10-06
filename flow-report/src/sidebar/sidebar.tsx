/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';

import {Separator} from '../common';
import {useI18n, useUIStrings} from '../i18n/i18n';
import {CpuIcon, EnvIcon, SummaryIcon} from '../icons';
import {classNames, useCurrentLhr, useFlowResult} from '../util';
import {SidebarFlow} from './flow';

export const SidebarSummary: FunctionComponent = () => {
  const currentLhr = useCurrentLhr();
  const strings = useUIStrings();

  const url = new URL(location.href);
  url.hash = '#';
  return (
    <a
      href={url.href}
      className={classNames('SidebarSummary', {'Sidebar--current': currentLhr === null})}
      data-testid="SidebarSummary"
    >
      <div className="SidebarSummary__icon">
        <SummaryIcon/>
      </div>
      <div className="SidebarSummary__label">{strings.summary}</div>
    </a>
  );
};

const SidebarRuntimeSettings: FunctionComponent<{settings: LH.ConfigSettings}> = ({settings}) => {
  const strings = useUIStrings();

  return (
    <div className="SidebarRuntimeSettings">
      <div className="SidebarRuntimeSettings__item">
        <div className="SidebarRuntimeSettings__item--icon">
          <EnvIcon/>
        </div>
        {
          settings.formFactor === 'desktop' ? strings.desktop : strings.mobile
        }
      </div>
      <div className="SidebarRuntimeSettings__item">
        <div className="SidebarRuntimeSettings__item--icon">
          <CpuIcon/>
        </div>
        {
          `${settings.throttling.cpuSlowdownMultiplier}x slowdown`
        }
      </div>
    </div>
  );
};

export const SidebarHeader: FunctionComponent<{title: string, date: string}> = ({title, date}) => {
  const i18n = useI18n();
  return (
    <div className="SidebarHeader">
      <div className="SidebarHeader__title">{title}</div>
      <div className="SidebarHeader__date">{i18n.formatDateTime(date)}</div>
    </div>
  );
};

export const Sidebar: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const firstLhr = flowResult.steps[0].lhr;
  return (
    <div className="Sidebar">
      <SidebarHeader title={flowResult.name} date={firstLhr.fetchTime}/>
      <Separator/>
      <SidebarSummary/>
      <Separator/>
      <SidebarFlow/>
      <Separator/>
      <SidebarRuntimeSettings settings={firstLhr.configSettings}/>
    </div>
  );
};
