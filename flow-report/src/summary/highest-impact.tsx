/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useMemo} from 'preact/hooks';

import {Util} from '../../../report/renderer/util';
import {useFlowResult} from '../util';

const MAX_HIGH_IMPACT = 5;

function computeHighestImpactAudits(reportResults: LH.ReportResult[], categoryId: string) {
  const reportListMap: Map<string, {
    ref: LH.ReportResult.AuditRef,
    reports: number[],
    /** Total extra score that would be gained if this audit passed in every report. */
    remainingScore: number,
  }> = new Map();

  for (let i = 0; i < reportResults.length; ++i) {
    const reportResult = reportResults[i];
    const category = reportResult.categories[categoryId];
    if (!category) continue;

    for (const auditRef of category.auditRefs) {
      const reportListForAudit = reportListMap.get(auditRef.id) || {
        ref: auditRef,
        reports: [],
        remainingScore: 0,
      };
      if (!Util.showAsPassed(auditRef.result)) {
        reportListForAudit.reports.push(i);
        reportListForAudit.remainingScore += (1 - Number(auditRef.result.score)) * auditRef.weight;
      }
      reportListMap.set(auditRef.id, reportListForAudit);
    }
  }

  return Array.from(reportListMap.values())
    .filter(audit =>
      audit.reports.length &&
      audit.ref.group !== 'metrics' &&
      audit.ref.result.scoreDisplayMode !== 'informative' &&
      audit.ref.result.scoreDisplayMode !== 'error'
    )
    .sort((a, b) => {
      if (a.remainingScore === b.remainingScore) {
        return b.reports.length - a.reports.length;
      }
      return b.remainingScore - a.remainingScore;
    })
    .splice(0, MAX_HIGH_IMPACT);
}

export const SummaryHighestImpact: FunctionComponent<{categoryIds: string[]}> =
({categoryIds}) => {
  const flowResult = useFlowResult();
  const reportResults = useMemo(() => flowResult.lhrs.map(Util.prepareReportResult), [flowResult]);
  return (
    <div>
      {
        categoryIds.map(c => {
          const highImpactAudits = computeHighestImpactAudits(reportResults, c);
          return (
            <div key={c}>
              <h2>{c}</h2>
              {
                highImpactAudits.map(o =>
                  <div key={o.ref.id}>{o.ref.id}: [{o.reports.join(',')}]</div>
                )
              }
            </div>
          );
        })
      }
    </div>
  );
};
