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
      Forms: [
        {
          attributes: {
            id: 'checkout',
            name: 'checkout',
            autocomplete: 'on',
            nodeLabel: 'Name on card:',
            snippet: '<form id="checkout" name="checkout" action="../done.html" method="post">',
          },
          inputs: [
            {
              id: 'name_cc',
              name: '',
              placeholder: '',
              autocomplete: 'cc-name',
              nodeLabel: 'textarea',
              snippet: '<textarea type="text" id="name_cc" autocomplete="cc-name">',
            },
            {
              id: 'CCNo',
              name: '',
              placeholder: '',
              autocomplete: 'cc-number',
              nodeLabel: 'input',
              snippet: '<input type="text" id="CCNo" autocomplete="cc-number">',
            },
            {
              id: 'CCExpiresMonth',
              name: '',
              autocomplete: 'cc-exp-month',
              nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              snippet: '<select id="CCExpiresMonth" autocomplete="cc-exp-month">',
            },
            {
              id: 'CCExpiresYear',
              name: '',
              autocomplete: 'cc-exp-year',
              nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
              snippet: '<select id="CCExpiresYear" autocomplete="cc-exp-year">',
            },
            {
              id: 'cvc',
              name: '',
              placeholder: '',
              autocomplete: 'cc-csc',
              nodeLabel: 'input',
              snippet: '<input id="cvc" autocomplete="cc-csc">',
            },
          ],
          labels: [
            {
              id: 'cardName',
              for: 'name_cc',
              nodeLabel: 'Name on card:',
              snippet: '<label id="cardName" for="name_cc">',
            },
            {
              id: 'cardNumber',
              for: 'CCNo',
              nodeLabel: 'Credit card number:',
              snippet: '<label id="cardNumber" for="CCNo">',
            },
            {
              id: 'expDate',
              for: 'CCExpiresMonth',
              nodeLabel: 'Expiry Date:',
              snippet: '<label id="expDate" for="CCExpiresMonth">',
            },
            {
              id: 'cvc',
              for: 'cvc',
              nodeLabel: 'CVC:',
              snippet: '<label id="cvc" for="cvc">',
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
              id: 'name_cc',
              name: '',
              placeholder: '',
              autocomplete: 'cc-name',
              nodeLabel: 'textarea',
              snippet: '<textarea type="text" id="name_cc" autocomplete="cc-name">',
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
              id: 'CCExpiresMonth',
              name: '',
              autocomplete: '',
              nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              snippet: '<select id="CCExpiresMonth">',
            },
            {
              id: 'CCExpiresYear',
              name: '',
              autocomplete: '',
              nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
              snippet: '<select id="CCExpiresYear">',
            },
            {
              id: 'cvc',
              name: '',
              placeholder: '',
              autocomplete: 'cc-csc',
              nodeLabel: 'input',
              snippet: '<input id="cvc" autocomplete="cc-csc">',
            },
          ],
          labels: [
            {
              id: 'shippingName',
              for: 'name_shipping',
              nodeLabel: 'Name:',
              snippet: '<label id="shippingName" for="name_shipping">',
            },
            {
              id: 'address_shipping',
              for: 'address_shipping',
              nodeLabel: 'Address:',
              snippet: '<label id="address_shipping" for="address_shipping">',
            },
            {
              id: 'city_shipping',
              for: 'city_shipping',
              nodeLabel: 'City:',
              snippet: '<label id="city_shipping" for="city_shipping">',
            },
            {
              id: 'state_shipping',
              for: 'Sstate_shipping',
              nodeLabel: 'State:',
              snippet: '<label id="state_shipping" for="Sstate_shipping">',
            },
            {
              id: 'zip_shipping',
              for: 'zip_shipping',
              nodeLabel: 'Zip:',
              snippet: '<label id="zip_shipping" for="zip_shipping">',
            },
            {
              id: 'name_billing',
              for: 'name_billing',
              nodeLabel: 'Name:',
              snippet: '<label id="name_billing" for="name_billing">',
            },
            {
              id: 'address_billing',
              for: 'address_billing',
              nodeLabel: 'Address:',
              snippet: '<label id="address_billing" for="address_billing">',
            },
            {
              id: 'city_billing',
              for: '',
              nodeLabel: 'City:',
              snippet: '<label id="city_billing" label="city_billing">',
            },
            {
              id: 'state_billing',
              for: 'state_billing',
              nodeLabel: 'State:',
              snippet: '<label id="state_billing" for="state_billing">',
            },
            {
              id: 'zip_billing',
              for: 'zip_billing',
              nodeLabel: 'Zip:',
              snippet: '<label id="zip_billing" for="zip_billing">',
            },
            {
              id: 'cardName',
              for: 'name_cc',
              nodeLabel: 'Name on card:',
              snippet: '<label id="cardName" for="name_cc">',
            },
            {
              id: 'cardNumber',
              for: 'CCNo',
              nodeLabel: 'Credit card number:',
              snippet: '<label id="cardNumber" for="CCNo">',
            },
            {
              id: 'expDate',
              for: 'CCExpiresMonth',
              nodeLabel: 'Expiry Date:',
              snippet: '<label id="expDate" for="CCExpiresMonth">',
            },
            {
              id: 'cvc',
              for: 'cvc',
              nodeLabel: 'CVC:',
              snippet: '<label id="cvc" for="cvc">',
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
                type: 'node',
                path: '0,HTML,1,BODY,1,DIV,11,INPUT',
                snippet: '<input type="text" name="city_shipping">',
                nodeLabel: 'input',
              },
              {
                type: 'node',
                path: '0,HTML,1,BODY,1,DIV,14,SELECT',
                snippet: '<select name="state_shipping">',
                nodeLabel: 'Select a state\nCA\nMA\nNY\nMD\nOR\nOH\nIL\nDC',
              },
              {
                type: 'node',
                path: '0,HTML,1,BODY,1,DIV,17,INPUT',
                snippet: '<input type="text" name="zip_shipping">',
                nodeLabel: 'input',
              },
              {
                type: 'node',
                path: '0,HTML,1,BODY,2,DIV,3,INPUT',
                snippet: '<input type="text" name="name_billing">',
                nodeLabel: 'input',
              },
              {
                type: 'node',
                path: '0,HTML,1,BODY,2,DIV,9,INPUT',
                snippet: '<input type="text" name="city_billing">',
                nodeLabel: 'input',
              },
              {
                type: 'node',
                path: '0,HTML,1,BODY,2,DIV,12,SELECT',
                snippet: '<select name="state_billing">',
                nodeLabel: '\n      Select a state\n      CA\n      MA\n      NY\n      MD\n      OR\n      OH\n   …',
              },
              {
                type: 'node',
                path: '0,HTML,1,BODY,2,DIV,15,INPUT',
                snippet: '<input type="text" name="zip_billing">',
                nodeLabel: 'input',
              },
              {
                type: 'node',
                path: '0,HTML,1,BODY,3,DIV,5,INPUT',
                snippet: '<input type="text" name="CCNo">',
                nodeLabel: 'input',
              },
              {
                type: 'node',
                path: '0,HTML,1,BODY,3,DIV,9,SELECT',
                snippet: '<select name="CCExpiresMonth">',
                nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
              },
              {
                type: 'node',
                path: '0,HTML,1,BODY,3,DIV,11,SELECT',
                snippet: '<select name="CCExpiresYear">',
                nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
              },
            ],
          },
        },
      },
    },
  },
];


module.exports = expectations;
