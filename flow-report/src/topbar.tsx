/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent, JSX} from 'preact';
import {useState} from 'preact/hooks';

import {HelpDialog} from './help-dialog';
import {getFlowResultFilenamePrefix} from '../../report/generator/file-namer';
import {useLocalizedStrings} from './i18n/i18n';
import {HamburgerIcon, InfoIcon} from './icons';
import {useFlowResult, useOptions} from './util';
import {saveFile} from '../../report/renderer/api';

function saveHtml(flowResult: LH.FlowResult, htmlStr: string) {
  const blob = new Blob([htmlStr], {type: 'text/html'});
  const filename = getFlowResultFilenamePrefix(flowResult) + '.html';
  saveFile(blob, filename);
}

/* eslint-disable max-len */
const Logo: FunctionComponent = () => {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_1354_3101)">
        <path d="M15 17.5V8.26759C15 8.10041 15.0836 7.9443 15.2227 7.85156L23.7226 2.1849C23.8906 2.07293 24.1094 2.07293 24.2774 2.1849L32.7773 7.85156C32.9165 7.9443 33 8.10041 33 8.26759V17.5C33 17.7761 33.2239 18 33.5 18H36.5C36.7761 18 37 18.2239 37 18.5V23.5C37 23.7761 36.7761 24 36.5 24H33.5945C33.2841 24 33.0487 24.2799 33.1019 24.5857L36.8981 47.4143C36.9513 47.7201 36.7159 48 36.4055 48H11.5945C11.2841 48 11.0487 47.7201 11.1019 47.4143L14.8981 24.5857C14.9513 24.2799 14.7159 24 14.4055 24H11.5C11.2239 24 11 23.7761 11 23.5V18.5C11 18.2239 11.2239 18 11.5 18H14.5C14.7761 18 15 17.7761 15 17.5Z" fill="#FF6633"/>
        <g opacity="0.4">
          <path d="M21.0696 48H11.5944C11.284 48 11.0486 47.7201 11.1018 47.4143L11.6648 44.0292L34.4414 32.6409L35.773 40.6483L21.0696 48Z" fill="white"/>
          <path d="M31.0575 24L13.5389 32.7593L14.8981 24.5857C14.9512 24.2805 14.7169 24.0012 14.4075 24H31.0575Z" fill="white"/>
        </g>
        <path d="M20 10.5C20 10.2239 20.2239 10 20.5 10H27.5C27.7761 10 28 10.2239 28 10.5V17.5C28 17.7761 27.7761 18 27.5 18H20.5C20.2239 18 20 17.7761 20 17.5V10.5Z" fill="#FFFF33"/>
      </g>
      <defs>
        <clipPath id="clip0_1354_3101">
          <rect width="48" height="48" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
};
/* eslint-enable max-len */

const TopbarButton: FunctionComponent<{
  onClick: JSX.MouseEventHandler<HTMLButtonElement>,
  label: string,
}> =
({onClick, label, children}) => {
  return (
    <button className="TopbarButton" onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
};

export const Topbar: FunctionComponent<{onMenuClick: JSX.MouseEventHandler<HTMLButtonElement>}> =
({onMenuClick}) => {
  const flowResult = useFlowResult();
  const strings = useLocalizedStrings();
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const {getReportHtml, saveAsGist} = useOptions();

  return (
    <div className="Topbar">
      <TopbarButton onClick={onMenuClick} label="Button that opens and closes the sidebar">
        <HamburgerIcon/>
      </TopbarButton>
      <div className="Topbar__logo">
        <Logo/>
      </div>
      <div className="Topbar__title">{strings.title}</div>
      {
        getReportHtml &&
          <TopbarButton
            onClick={() => {
              const htmlStr = getReportHtml(flowResult);
              saveHtml(flowResult, htmlStr);
            }}
            label="Button that saves the report as HTML"
          >{strings.save}</TopbarButton>
      }
      {
        saveAsGist &&
          <TopbarButton
            onClick={() => saveAsGist(flowResult)}
            label="Button that saves the report to a gist"
          >{strings.dropdownSaveGist}</TopbarButton>
      }
      <div style={{flexGrow: 1}} />
      <TopbarButton
        onClick={() => setShowHelpDialog(previous => !previous)}
        label="Button that toggles the help dialog"
      >
        <div className="Topbar__help-label">
          <InfoIcon/>
          {strings.helpLabel}
        </div>
      </TopbarButton>
      {showHelpDialog ?
        <HelpDialog onClose={() => setShowHelpDialog(false)} /> :
        null
      }
    </div>
  );
};
