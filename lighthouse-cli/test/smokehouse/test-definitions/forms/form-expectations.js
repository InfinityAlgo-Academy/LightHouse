/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse artifacts from Form gatherer
 */
const expectations = [
  {
    artifacts: {
      FormElements: [
        {
          attributes: {
            id: 'checkout1',
            name: 'checkout',
            autocomplete: 'on',
            nodeLabel: 'Name on card:',
            snippet: '<form id="checkout1" name="checkout" action="../done.html" method="post">',
          },
          inputs: [
            {
              id: 'name_cc1',
              name: '',
              placeholder: '',
              autocomplete: 'cc-name',
              nodeLabel: 'textarea',
              snippet: '<textarea type="text" id="name_cc1" autocomplete="cc-name">',
            },
            {
              id: 'CCNo1',
              name: '',
              placeholder: '',
              autocomplete: 'cc-number',
              nodeLabel: 'input',
              snippet: '<input type="text" id="CCNo1" autocomplete="cc-number">',
            },
            {
              id: 'CCExpiresMonth1',
              name: '',
              autocomplete: 'cc-exp-month',
              nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              snippet: '<select id="CCExpiresMonth1" autocomplete="cc-exp-month">',
            },
            {
              id: 'CCExpiresYear1',
              name: '',
              autocomplete: 'cc-exp-year',
              nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
              snippet: '<select id="CCExpiresYear1" autocomplete="cc-exp-year">',
            },
            {
              id: 'cvc1',
              name: '',
              placeholder: '',
              autocomplete: 'cc-csc',
              nodeLabel: 'input',
              snippet: '<input id="cvc1" autocomplete="cc-csc">',
            },
          ],
          labels: [
            {
              for: 'name_cc1',
              nodeLabel: 'Name on card:',
              snippet: '<label for="name_cc1">',
            },
            {
              for: 'CCNo1',
              nodeLabel: 'Credit card number:',
              snippet: '<label for="CCNo1">',
            },
            {
              for: 'CCExpiresMonth1',
              nodeLabel: 'Expiry Date:',
              snippet: '<label for="CCExpiresMonth1">',
            },
            {
              for: 'cvc1',
              nodeLabel: 'CVC:',
              snippet: '<label for="cvc1">',
            },
          ],
        },
        {
          inputs: [
            {
              id: 'name_shipping',
              name: '',
              placeholder: '',
              autocomplete: 'shipping name',
              nodeLabel: 'input',
              snippet: '<input type="text" id="name_shipping" autocomplete="shipping name">',
            },
            {
              id: 'address_shipping',
              name: '',
              placeholder: '',
              autocomplete: 'shipping street-address',
              nodeLabel: 'input',
              snippet: '<input type="text" id="address_shipping" autocomplete="shipping street-address">',
            },
            {
              id: 'city_shipping',
              name: '',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" id="city_shipping">',
            },
            {
              id: 'state_shipping',
              name: '',
              autocomplete: '',
              nodeLabel: 'Select a state\nCA\nMA\nNY\nMD\nOR\nOH\nIL\nDC',
              snippet: '<select id="state_shipping">',
            },
            {
              id: 'zip_shipping',
              name: '',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" id="zip_shipping">',
            },
            {
              id: 'name_billing',
              name: '',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" id="name_billing">',
            },
            {
              id: 'address_billing',
              name: '',
              placeholder: '',
              autocomplete: 'billing street-address',
              nodeLabel: 'input',
              snippet: '<input type="text" id="address_billing" autocomplete="billing street-address">',
            },
            {
              id: 'city_billing',
              name: '',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" id="city_billing">',
            },
            {
              id: 'state_billing',
              name: '',
              autocomplete: '',
              nodeLabel: '\n      Select a state\n      CA\n      MA\n      NY\n      MD\n      OR\n      OH\n   …',
              snippet: '<select id="state_billing">',
            },
            {
              id: 'zip_billing',
              name: '',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" id="zip_billing">',
            },
            {
              id: 'name_cc2',
              name: '',
              placeholder: '',
              autocomplete: 'cc-name',
              nodeLabel: 'textarea',
              snippet: '<textarea type="text" id="name_cc2" autocomplete="cc-name">',
            },
            {
              id: '',
              name: 'CCNo2',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" name="CCNo2">',
            },
            {
              id: 'CCExpiresMonth2',
              name: '',
              autocomplete: '',
              nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              snippet: '<select id="CCExpiresMonth2">',
            },
            {
              id: 'CCExpiresYear',
              name: '',
              autocomplete: '',
              nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
              snippet: '<select id="CCExpiresYear">',
            },
            {
              id: 'cvc2',
              name: '',
              placeholder: '',
              autocomplete: 'cc-csc',
              nodeLabel: 'input',
              snippet: '<input id="cvc2" autocomplete="cc-csc">',
            },
          ],
          labels: [
            {
              for: 'name_shipping',
              nodeLabel: 'Name:',
              snippet: '<label for="name_shipping">',
            },
            {
              for: 'address_shipping',
              nodeLabel: 'Address:',
              snippet: '<label for="address_shipping">',
            },
            {
              for: 'city_shipping',
              nodeLabel: 'City:',
              snippet: '<label for="city_shipping">',
            },
            {
              for: 'Sstate_shipping',
              nodeLabel: 'State:',
              snippet: '<label for="Sstate_shipping">',
            },
            {
              for: 'zip_shipping',
              nodeLabel: 'Zip:',
              snippet: '<label for="zip_shipping">',
            },
            {
              for: 'name_billing',
              nodeLabel: 'Name:',
              snippet: '<label for="name_billing">',
            },
            {
              for: 'address_billing',
              nodeLabel: 'Address:',
              snippet: '<label for="address_billing">',
            },
            {
              for: 'city_billing',
              nodeLabel: 'City:',
              snippet: '<label for="city_billing">',
            },
            {
              for: 'state_billing',
              nodeLabel: 'State:',
              snippet: '<label for="state_billing">',
            },
            {
              for: 'zip_billing',
              nodeLabel: 'Zip:',
              snippet: '<label for="zip_billing">',
            },
            {
              for: 'name_cc2',
              nodeLabel: 'Name on card:',
              snippet: '<label for="name_cc2">',
            },
            {
              for: 'CCNo2',
              nodeLabel: 'Credit card number:',
              snippet: '<label for="CCNo2">',
            },
            {
              for: 'CCExpiresMonth2',
              nodeLabel: 'Expiry Date:',
              snippet: '<label for="CCExpiresMonth2">',
            },
            {
              for: 'cvc2',
              nodeLabel: 'CVC:',
              snippet: '<label for="cvc2">',
            },
          ],
        },
      ],
    },
    lhr: {
      requestedUrl: 'http://localhost:10200/form.html',
      finalUrl: 'http://localhost:10200/form.html',
      audits: {
      },
    },
  },
];


module.exports = expectations;
