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
    <svg role="img" fill="none" height="48" width="48" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="a">
        <path d="M0 0h48v48H0z"/>
      </clipPath>
      <g clip-path="url(#a)">
        <path d="M15 17.5V8.268a.5.5 0 0 1 .223-.416l8.5-5.667a.5.5 0 0 1 .554 0l8.5 5.667a.5.5 0 0 1 .223.416V17.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-2.905a.5.5 0 0 0-.493.586l3.796 22.828a.5.5 0 0 1-.493.586h-24.81a.5.5 0 0 1-.493-.586l3.796-22.828a.5.5 0 0 0-.493-.586H11.5a.5.5 0 0 1-.5-.5v-5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 0 .5-.5z" fill="#f63"/>
        <g fill="#fff" opacity=".4">
          <path d="M21.07 48h-9.476a.5.5 0 0 1-.492-.586l.563-3.385L34.44 32.641l1.332 8.007zM31.058 24l-17.52 8.76 1.36-8.174a.5.5 0 0 0-.49-.586z"/>
        </g>
        <path d="M20 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5z" fill="#ff3"/>
      </g>
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
