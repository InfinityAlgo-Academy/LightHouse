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
                  id: "checkout",
                  name: "checkout",
                  autocomplete: "on"
                },
                inputs: [
                  {
                    id: "",
                    nodeName: "INPUT",
                    name: "name_cc",
                    placeholder: "",
                    autocomplete: "cc-name"
                  },
                  {
                    id: "",
                    nodeName: "INPUT",
                    name: "CCNo",
                    placeholder: "",
                    autocomplete: "cc-number"
                  },
                  {
                    id: "",
                    nodeName: "SELECT",
                    name: "CCExpiresMonth",
                    autocomplete: "cc-exp-month"
                  },
                  {
                    id: "",
                    nodeName: "SELECT",
                    name: "CCExpiresYear",
                    autocomplete: "cc-exp-year"
                  },
                  {
                    id: "",
                    nodeName: "INPUT",
                    name: "cvc",
                    placeholder: "",
                    autocomplete: "cc-csc"
                  },
                  {
                    id: "fill",
                    nodeName: "INPUT",
                    name: "",
                    placeholder: "",
                    autocomplete: ""
                  },
                  {
                    id: "",
                    nodeName: "INPUT",
                    name: "",
                    placeholder: "",
                    autocomplete: ""
                  }
                ],
                labels: []
              }
          
        ],
      },  
  
    lhr: {
      requestedUrl: 'https://autofill-audit-tests.herokuapp.com/autocomplete-audit-passed',
      finalUrl: 'https://autofill-audit-tests.herokuapp.com/autocomplete-audit-passed',
      audits: {
      },
    },
  },
];

module.exports = expectations;