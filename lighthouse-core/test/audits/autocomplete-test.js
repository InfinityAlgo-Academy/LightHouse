/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const Autocomplete = require('../../audits/autocomplete.js');


describe('Best Practices: autocomplete audit', () => {
  it('fails when an there is no autocomplete attribute set', () => {
    const artifacts = {
      FormElements: [
        {
          inputs: [
            {
              id: '',
              name: 'name_cc',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" name="name_cc">',
            },
            {
              id: '',
              name: 'CCNo',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" name="CCNo">',
            },
            {
              id: '',
              name: 'CCExpiresMonth',
              autocomplete: '',
              nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              snippet: '<select name="CCExpiresMonth">',
            },
            {
              id: '',
              name: 'CCExpiresYear',
              autocomplete: '',
              nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
              snippet: '<select name="CCExpiresYear">',
            },
            {
              id: '',
              name: 'cvc',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input name="cvc">',
            },
          ],
          labels: [],
        },
      ],
    };
    const expectedDetails = {
      headings: [
        {
          itemType: 'node',
          key: 'failingElements',
          text: 'lighthouse-core/lib/i18n/i18n.js | columnFailingElem # 0',
        },
      ],
      items: [
        {
          failingElements: {
            nodeLabel: 'input',
            snippet: '<input type="text" name="name_cc">',
            type: 'node',
          },
        },
        {
          failingElements: {
            nodeLabel: 'input',
            snippet: '<input type="text" name="CCNo">',
            type: 'node',
          },
        },
        {
          failingElements: {
            nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
            snippet: '<select name="CCExpiresMonth">',
            type: 'node',
          },
        },
        {
          failingElements: {
            nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
            snippet: '<select name="CCExpiresYear">',
            type: 'node',
          },
        },
        {
          failingElements: {
            nodeLabel: 'input',
            snippet: '<input name="cvc">',
            type: 'node',
          },
        },
      ],
      summary: undefined,
      type: 'table',
    };
    const {score, details} = Autocomplete.audit(artifacts);
    expect(score).toBe(0);
    expect(details).toStrictEqual(expectedDetails);
  });
  it('fails when an there is an invalid autocomplete attribute set', () => {
    const artifacts = {
      FormElements: [
        {
          inputs: [
            {
              id: '',
              name: 'name_cc',
              placeholder: '',
              /* autocomplete attribute is blank because the gatherer does not collect invalid autocomplete attributes */
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" name="name_cc" autocomplete="namez">',
            },
            {
              id: '',
              name: 'CCNo',
              placeholder: '',
              /* autocomplete attribute is blank because the gatherer does not collect invalid autocomplete attributes */
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" name="CCNo" autocomplete="ccc-num">',
            },
            {
              id: '',
              name: 'CCExpiresMonth',
              /* autocomplete attribute is blank because the gatherer does not collect invalid autocomplete attributes */
              autocomplete: '',
              nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              snippet: '<select name="CCExpiresMonth" autocomplete="ccc-exp">',
            },
            {
              id: '',
              name: 'CCExpiresYear',
              /* autocomplete attribute is blank because the gatherer does not collect invalid autocomplete attributes */
              autocomplete: '',
              nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
              snippet: '<select name="CCExpiresYear" autocomplete="none">',
            },
            {
              id: '',
              name: 'cvc',
              placeholder: '',
              /* autocomplete attribute is blank because the gatherer does not collect invalid autocomplete attributes */
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input name="cvc" autocomplete="cc-cvc">',
            },
          ],
          labels: [],
        },
      ],
    };
    const expectedDetails = {
      headings: [
        {
          itemType: 'node',
          key: 'failingElements',
          text: 'lighthouse-core/lib/i18n/i18n.js | columnFailingElem # 0',
        },
      ],
      items: [
        {
          failingElements: {
            nodeLabel: 'input',
            snippet: '<input type="text" name="name_cc" autocomplete="namez">',
            type: 'node',
          },
        },
        {
          failingElements: {
            nodeLabel: 'input',
            snippet: '<input type="text" name="CCNo" autocomplete="ccc-num">',
            type: 'node',
          },
        },
        {
          failingElements: {
            nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
            snippet: '<select name="CCExpiresMonth" autocomplete="ccc-exp">',
            type: 'node',
          },
        },
        {
          failingElements: {
            nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
            snippet: '<select name="CCExpiresYear" autocomplete="none">',
            type: 'node',
          },
        },
        {
          failingElements: {
            nodeLabel: 'input',
            snippet: '<input name="cvc" autocomplete="cc-cvc">',
            type: 'node',
          },
        },
      ],
      summary: undefined,
      type: 'table',
    };
    const {score, details} = Autocomplete.audit(artifacts);
    expect(score).toBe(0);
    expect(details).toStrictEqual(expectedDetails);
  });
  it('passes when an there is a valid autocomplete attribute set', () => {
    const artifacts = {
      FormElements: [
        {
          inputs: [
            {
              id: '',
              name: 'name_cc',
              placeholder: '',
              autocomplete: 'cc-name',
              nodeLabel: 'textarea',
              snippet: '<textarea type="text" name="name_cc" autocomplete="cc-name">',
            },
            {
              id: '',
              name: 'CCNo',
              placeholder: '',
              autocomplete: 'cc-number',
              nodeLabel: 'input',
              snippet: '<input type="text" name="CCNo" autocomplete="cc-number">',
            },
            {
              id: '',
              name: 'CCExpiresMonth',
              autocomplete: 'cc-exp-month',
              nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              snippet: '<select name="CCExpiresMonth" autocomplete="cc-exp-month">',
            },
            {
              id: '',
              name: 'CCExpiresYear',
              autocomplete: 'cc-exp-year',
              nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
              snippet: '<select name="CCExpiresYear" autocomplete="cc-exp-year">',
            },
            {
              id: '',
              name: 'cvc',
              placeholder: '',
              autocomplete: 'cc-csc',
              nodeLabel: 'input',
              snippet: '<input name="cvc" autocomplete="cc-csc">',
            },
          ],
          labels: [],
        },
      ],
    };
    const {score} = Autocomplete.audit(artifacts);
    expect(score).toBe(1);
  });
});
