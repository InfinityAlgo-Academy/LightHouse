/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useEffect, useLayoutEffect, useRef} from 'preact/hooks';

import {useReportRenderer} from './report-renderer';

export const Gauge: FunctionComponent<{category: LH.ReportResult.Category, href: string}> =
({category, href}) => {
  const {categoryRenderer} = useReportRenderer();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = categoryRenderer.renderScoreGauge(category, {});

    // Category label is displayed in the navigation header.
    const label = el.querySelector('.lh-gauge__label');
    if (label) label.remove();

    if (ref.current) ref.current.append(el);
    return () => {
      if (ref.current && ref.current.contains(el)) {
        ref.current.removeChild(el);
      }
    };
  }, [categoryRenderer, category]);

  useEffect(() => {
    const anchor = ref.current && ref.current.querySelector('a') as HTMLAnchorElement;
    if (anchor) anchor.href = href;
  }, [href]);

  return (
    <div ref={ref} data-testid="Gauge"/>
  );
};
