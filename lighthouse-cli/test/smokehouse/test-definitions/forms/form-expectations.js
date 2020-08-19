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
            id: 'checkout',
            name: 'checkout',
            autocomplete: 'on',
            nodeLabel: 'Name on card: \nCredit card number: \nExpiry Date: \nMM\n01\n02\n03\n04\n05\n06\n07\n08\n09…',
            snippet: '<form id="checkout" name="checkout" action="../done.html" method="post">',
          },
          inputs: [
            {
              id: 'name_cc1',
              name: 'name_cc1',
              placeholder: 'John Doe',
              autocomplete: 'cc-name',
              nodeLabel: 'textarea',
              snippet: '<textarea type="text" id="name_cc1" name="name_cc1" autocomplete="cc-name" placeholder="John Doe">',
            },
            {
              id: 'CCNo1',
              name: 'CCNo1',
              placeholder: '5555 5555 5555 5555',
              autocomplete: 'cc-number',
              nodeLabel: 'input',
              snippet: '<input type="text" id="CCNo1" name="CCNo1" autocomplete="cc-number" placeholder="5555 5555 5555 5555">',
            },
            {
              id: 'CCExpiresMonth1',
              name: 'CCExpiresMonth1',
              autocomplete: 'cc-exp-month',
              nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              snippet: '<select id="CCExpiresMonth1" name="CCExpiresMonth1" autocomplete="cc-exp-month">',
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
              name: 'cvc1',
              placeholder: '555',
              autocomplete: 'cc-csc',
              nodeLabel: 'input',
              snippet: '<input id="cvc1" name="cvc1" autocomplete="cc-csc" placeholder="555">',
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
          /** All Elements in this object are formless because attributes is undefined */
          attributes: undefined,
          inputs: [
            {
              id: 'name_shipping',
              name: '',
              placeholder: 'John Doe',
              autocomplete: 'shipping name',
              nodeLabel: 'input',
              snippet: '<input type="text" id="name_shipping" autocomplete="shipping name" placeholder="John Doe">',
            },
            {
              id: 'address_shipping',
              name: '',
              placeholder: 'Your address',
              autocomplete: 'shipping street-address',
              nodeLabel: 'input',
              snippet: '<input type="text" id="address_shipping" autocomplete="shipping street-address" placeholder="Your address">',
            },
            {
              id: 'city_shipping',
              name: '',
              placeholder: 'city you live',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" id="city_shipping" placeholder="city you live">',
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
              name: 'name_billing',
              placeholder: 'your name',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" id="name_billing" name="name_billing" placeholder="your name">',
            },
            {
              id: 'address_billing',
              name: 'address_billing',
              placeholder: 'your address',
              autocomplete: 'billing street-address',
              nodeLabel: 'input',
              snippet: '<input type="text" id="address_billing" name="address_billing" autocomplete="billing street-address" placeholder="your address">',
            },
            {
              id: 'city_billing',
              name: 'city_billing',
              placeholder: 'city you live in',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" id="city_billing" name="city_billing" placeholder="city you live in">',
            },
            {
              id: 'state_billing',
              name: 'state_billing',
              autocomplete: '',
              nodeLabel: '\n            Select a state\n            CA\n            MA\n            NY\n      …',
              snippet: '<select id="state_billing" name="state_billing">',
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
              name: 'name_cc2',
              placeholder: '',
              autocomplete: 'cc-name',
              nodeLabel: 'textarea',
              snippet: '<textarea type="text" id="name_cc2" name="name_cc2" autocomplete="cc-name">',
            },
            {
              id: 'CCNo2',
              name: 'CCNo2',
              placeholder: '',
              autocomplete: '',
              nodeLabel: 'input',
              snippet: '<input type="text" id="CCNo2" name="CCNo2">',
            },
            {
              id: 'CCExpiresMonth2',
              name: 'CCExpiresMonth2',
              autocomplete: '',
              nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              snippet: '<select id="CCExpiresMonth2" name="CCExpiresMonth2">',
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
              name: 'cvc2',
              placeholder: '',
              autocomplete: 'cc-csc',
              nodeLabel: 'input',
              snippet: '<input id="cvc2" name="cvc2" autocomplete="cc-csc">',
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
        'autocomplete': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  type: 'node',
                  snippet: '<input type="text" id="city_shipping" placeholder="city you live">',
                  nodeLabel: 'input',
                },
              },
              {
                node: {
                  type: 'node',
                  snippet: '<select id="state_shipping">',
                  nodeLabel: 'Select a state\nCA\nMA\nNY\nMD\nOR\nOH\nIL\nDC',
                },
              },
              {
                node: {
                  type: 'node',
                  snippet: '<input type="text" id="zip_shipping">',
                  nodeLabel: 'input',
                },
              },
              {
                node: {
                  type: 'node',
                  snippet: '<input type="text" id="name_billing" name="name_billing" placeholder="your name">',
                  nodeLabel: 'input',
                },
              },
              {
                node: {
                  type: 'node',
                  snippet: '<input type="text" id="city_billing" name="city_billing" placeholder="city you live in">',
                  nodeLabel: 'input',
                },
              },
              {
                node: {
                  type: 'node',
                  snippet: '<select id="state_billing" name="state_billing">',
                  nodeLabel: '\n            Select a state\n            CA\n            MA\n            NY\n      …',
                },
              },
              {
                node: {
                  type: 'node',
                  snippet: '<input type="text" id="zip_billing">',
                  nodeLabel: 'input',
                },
              },
              {
                node: {
                  type: 'node',
                  snippet: '<input type="text" id="CCNo2" name="CCNo2">',
                  nodeLabel: 'input',
                },
              },
              {
                node: {
                  type: 'node',
                  snippet: '<select id="CCExpiresMonth2" name="CCExpiresMonth2">',
                  nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
                },
              },
              {
                node: {
                  type: 'node',
                  snippet: '<select id="CCExpiresYear">',
                  nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
                },
              },
            ],
          },
        },
      },
    },
  },
];


module.exports = expectations;
