/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createContext, FunctionComponent} from 'preact';
import {useContext, useMemo} from 'preact/hooks';

import {I18n} from '../../../report/renderer/i18n';
import {UIStrings} from './ui-strings';
import {useLocale} from '../util';
import strings from './localized-strings';

const I18nContext = createContext<I18n<typeof UIStrings>|undefined>(undefined);

export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) throw Error('i18n was not initialized');
  return i18n;
}

export function useUIStrings() {
  const i18n = useI18n();
  return i18n.strings;
}

export const I18nProvider: FunctionComponent = ({children}) => {
  const locale = useLocale();
  const i18n = useMemo(() => new I18n(locale, {
    // Set missing renderer strings to default (english) values.
    ...UIStrings,
    // `strings` is generated in build/build-report.js
    ...strings[locale],
  }), [locale]);

  return (
    <I18nContext.Provider value={i18n}>
      {children}
    </I18nContext.Provider>
  );
};


