/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createContext, FunctionComponent} from 'preact';
import {useContext, useMemo} from 'preact/hooks';

import {Util} from '../../report/renderer/util';
import {useFlowResult} from './util';

const ReportResultContext = createContext<Map<LH.Result, LH.ReportResult>>(new Map());

export function useReportResultCache() {
  return useContext(ReportResultContext);
}

export function useReportResult(lhr: LH.Result) {
  const reportResultCache = useReportResultCache();
  const reportResult = reportResultCache.get(lhr) || Util.prepareReportResult(lhr);
  reportResultCache.set(lhr, reportResult);
  return reportResult;
}

export const ReportResultCache: FunctionComponent = ({children}) => {
  const flowResult = useFlowResult();

  // Clear the cache if flowResult changes.
  const reportResultCache = useMemo(() => new Map(), [flowResult]);

  return (
    <ReportResultContext.Provider value={reportResultCache}>
      {children}
    </ReportResultContext.Provider>
  );
};
