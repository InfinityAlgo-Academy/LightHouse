/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';

import {Util} from '../../report/renderer/util';
import {NavigationIcon, SnapshotIcon, TimespanIcon} from './icons';

/**
 * Summarizes the category as a ratio of passed audits to total audits.
 * The rating color and icon are calculated from the passed/total ratio, not the category score.
 * A category will be given a null rating and color if none of its audits are weighted.
 */
export const CategoryRatio: FunctionComponent<{
  category: LH.ReportResult.Category,
  audits: LH.Result['audits'],
  href: string,
}> = ({category, audits, href}) => {
  const numAudits = category.auditRefs.length;

  let numPassed = 0;
  let totalWeight = 0;
  for (const auditRef of category.auditRefs) {
    totalWeight += auditRef.weight;
    const audit = audits[auditRef.id];
    if (!audit) {
      console.warn(`Could not find score for audit '${auditRef.id}', treating as failed.`);
      continue;
    }
    if (Util.showAsPassed(audit)) numPassed++;
  }

  const ratio = numPassed / numAudits;
  let rating = Util.calculateRating(ratio);

  // If none of the available audits can affect the score, a rating isn't useful.
  // The flow report should display the ratio with neutral icon and coloring in this case.
  if (totalWeight === 0) {
    rating = 'null';
  }

  return (
    <a href={href} className={`CategoryRatio CategoryRatio--${rating}`} data-testid="CategoryRatio">
      {`${numPassed}/${numAudits}`}
    </a>
  );
};

export const Separator: FunctionComponent = () => {
  return <div className="Separator" role="separator"></div>;
};

export const FlowSegment: FunctionComponent<{mode?: LH.Result.GatherMode}> = ({mode}) => {
  return (
    <div className="FlowSegment">
      <div className="FlowSegment__top-line"/>
      {
        mode === 'navigation' && <NavigationIcon/>
      }
      {
        mode === 'timespan' && <TimespanIcon/>
      }
      {
        mode === 'snapshot' && <SnapshotIcon/>
      }
      <div className="FlowSegment__bottom-line"/>
    </div>
  );
};
