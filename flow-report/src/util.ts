/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createContext} from 'preact';
import {useContext, useEffect, useState} from 'preact/hooks';

export const FlowResultContext = createContext<LH.FlowResult|undefined>(undefined);

function getHashParam(param: string): string|null {
  const params = new URLSearchParams(location.hash.replace('#', '?'));
  return params.get(param);
}

export function classNames(...args: Array<string|undefined|Record<string, boolean>>): string {
  const classes = [];
  for (const arg of args) {
    if (!arg) continue;

    if (typeof arg === 'string') {
      classes.push(arg);
      continue;
    }

    const applicableClasses = Object.entries(arg)
      .filter(([_, shouldApply]) => shouldApply)
      .map(([className]) => className);
    classes.push(...applicableClasses);
  }

  return classes.join(' ');
}

export function getScreenDimensions(reportResult: LH.ReportResult) {
  const {width, height} = reportResult.configSettings.screenEmulation;
  return {width, height};
}

export function getScreenshot(reportResult: LH.ReportResult) {
  const fullPageScreenshotAudit = reportResult.audits['full-page-screenshot'];
  const fullPageScreenshot =
    fullPageScreenshotAudit.details &&
    fullPageScreenshotAudit.details.type === 'full-page-screenshot' &&
    fullPageScreenshotAudit.details.screenshot.data;

  return fullPageScreenshot || null;
}

export function useFlowResult(): LH.FlowResult {
  const flowResult = useContext(FlowResultContext);
  if (!flowResult) throw Error('useFlowResult must be called in the FlowResultContext');
  return flowResult;
}

export function useLocale(): LH.Locale {
  const flowResult = useFlowResult();
  return flowResult.lhrs[0].configSettings.locale;
}

export function useCurrentLhr(): {value: LH.Result, index: number}|null {
  const flowResult = useFlowResult();
  const [indexString, setIndexString] = useState(getHashParam('index'));

  // Use two-way-binding on the URL hash.
  // Triggers a re-render if the LHR index changes.
  useEffect(() => {
    function hashListener() {
      const newIndexString = getHashParam('index');
      if (newIndexString === indexString) return;
      setIndexString(newIndexString);
    }
    window.addEventListener('hashchange', hashListener);
    return () => window.removeEventListener('hashchange', hashListener);
  }, [indexString]);

  if (!indexString) return null;

  const index = Number(indexString);
  if (!Number.isFinite(index)) {
    console.warn(`Invalid hash index: ${indexString}`);
    return null;
  }

  const value = flowResult.lhrs[index];
  if (!value) {
    console.warn(`No LHR at index ${index}`);
    return null;
  }

  return {value, index};
}

export function useDerivedStepNames() {
  const flowResult = useFlowResult();

  let numNavigation = 1;
  let numTimespan = 1;
  let numSnapshot = 1;

  // TODO(FR-COMPAT): Override with a provided step name.
  // TODO(FR-COMPAT): Add shortened URL and reset count for navigations.
  return flowResult.lhrs.map((lhr) => {
    switch (lhr.gatherMode) {
      case 'navigation':
        return `Navigation (${numNavigation++})`;
      case 'timespan':
        return `Timespan (${numTimespan++})`;
      case 'snapshot':
        return `Snapshot (${numSnapshot++})`;
    }
  });
}
