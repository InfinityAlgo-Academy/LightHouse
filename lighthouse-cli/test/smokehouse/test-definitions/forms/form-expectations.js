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
            devtoolsNodePath: '0,HTML,1,BODY,0,FORM',
          },
          inputs: [
            {
              id: '',
              nodeName: 'TEXTAREA',
              name: 'name_cc',
              placeholder: '',
              autocomplete: 'cc-name',
              devtoolsNodePath: '0,HTML,1,BODY,0,FORM,1,TEXTAREA',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'CCNo',
              placeholder: '',
              autocomplete: 'cc-number',
              devtoolsNodePath: '0,HTML,1,BODY,0,FORM,4,INPUT',
            },
            {
              id: '',
              nodeName: 'SELECT',
              name: 'CCExpiresMonth',
              autocomplete: 'cc-exp-month',
              devtoolsNodePath: '0,HTML,1,BODY,0,FORM,7,SELECT',
            },
            {
              id: '',
              nodeName: 'SELECT',
              name: 'CCExpiresYear',
              autocomplete: 'cc-exp-year',
              devtoolsNodePath: '0,HTML,1,BODY,0,FORM,9,SELECT',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'cvc',
              placeholder: '',
              autocomplete: 'cc-csc',
              devtoolsNodePath: '0,HTML,1,BODY,0,FORM,12,INPUT',
            },
          ],
          labels: [
            {
              id: 'cardName',
              nodeName: 'LABEL',
              for: 'name_cc',
              devtoolsNodePath: '0,HTML,1,BODY,0,FORM,0,LABEL',
            },
            {
              id: 'cardNumber',
              nodeName: 'LABEL',
              for: 'CCNo',
              devtoolsNodePath: '0,HTML,1,BODY,0,FORM,3,LABEL',
            },
            {
              id: 'expDate',
              nodeName: 'LABEL',
              for: 'CCExpiresMonth',
              devtoolsNodePath: '0,HTML,1,BODY,0,FORM,6,LABEL',
            },
            {
              id: 'cvc',
              nodeName: 'LABEL',
              for: 'cvc',
              devtoolsNodePath: '0,HTML,1,BODY,0,FORM,11,LABEL',
            },
          ],
        },
        {
          inputs: [
            {
              id: '',
              nodeName: 'INPUT',
              name: 'name_shipping',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,5,INPUT',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'address_shipping',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,8,INPUT',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'city_shipping',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,11,INPUT',
            },
            {
              id: '',
              nodeName: 'SELECT',
              name: 'state_shipping',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,14,SELECT',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'zip_shipping',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,17,INPUT',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'name_billing',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,3,INPUT',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'address_billing',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,6,INPUT',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'city_billing',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,9,INPUT',
            },
            {
              id: '',
              nodeName: 'SELECT',
              name: 'state_billing',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,12,SELECT',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'zip_billing',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,15,INPUT',
            },
            {
              id: '',
              nodeName: 'TEXTAREA',
              name: 'name_cc',
              placeholder: '',
              autocomplete: 'cc-name',
              devtoolsNodePath: '0,HTML,1,BODY,3,DIV,1,TEXTAREA',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'CCNo',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,3,DIV,5,INPUT',
            },
            {
              id: '',
              nodeName: 'SELECT',
              name: 'CCExpiresMonth',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,3,DIV,9,SELECT',
            },
            {
              id: '',
              nodeName: 'SELECT',
              name: 'CCExpiresYear',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,3,DIV,11,SELECT',
            },
            {
              id: '',
              nodeName: 'INPUT',
              name: 'cvc',
              placeholder: '',
              autocomplete: '',
              devtoolsNodePath: '0,HTML,1,BODY,3,DIV,14,INPUT',
            },
          ],
          labels: [
            {
              id: 'shippingName',
              nodeName: 'LABEL',
              for: 'name_shipping',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,4,LABEL',
            },
            {
              id: 'address_shipping',
              nodeName: 'LABEL',
              for: 'address_shipping',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,7,LABEL',
            },
            {
              id: 'city_shipping',
              nodeName: 'LABEL',
              for: 'city_shipping',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,10,LABEL',
            },
            {
              id: 'state_shipping',
              nodeName: 'LABEL',
              for: 'Sstate_shipping',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,13,LABEL',
            },
            {
              id: 'zip_shipping',
              nodeName: 'LABEL',
              for: 'zip_shipping',
              devtoolsNodePath: '0,HTML,1,BODY,1,DIV,16,LABEL',
            },
            {
              id: 'name_billing',
              nodeName: 'LABEL',
              for: 'name_billing',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,2,LABEL',
            },
            {
              id: 'address_billing',
              nodeName: 'LABEL',
              for: 'address_billing',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,5,LABEL',
            },
            {
              id: 'city_billing',
              nodeName: 'LABEL',
              for: '',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,8,LABEL',
            },
            {
              id: 'state_billing',
              nodeName: 'LABEL',
              for: 'state_billing',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,11,LABEL',
            },
            {
              id: 'zip_billing',
              nodeName: 'LABEL',
              for: 'zip_billing',
              devtoolsNodePath: '0,HTML,1,BODY,2,DIV,14,LABEL',
            },
            {
              id: 'cardName',
              nodeName: 'LABEL',
              for: 'name_cc',
              devtoolsNodePath: '0,HTML,1,BODY,3,DIV,0,LABEL',
            },
            {
              id: 'cardNumber',
              nodeName: 'LABEL',
              for: 'CCNo',
              devtoolsNodePath: '0,HTML,1,BODY,3,DIV,3,LABEL',
            },
            {
              id: 'expDate',
              nodeName: 'LABEL',
              for: 'CCExpiresMonth',
              devtoolsNodePath: '0,HTML,1,BODY,3,DIV,7,LABEL',
            },
            {
              id: 'cvc',
              nodeName: 'LABEL',
              for: 'cvc',
              devtoolsNodePath: '0,HTML,1,BODY,3,DIV,13,LABEL',
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
