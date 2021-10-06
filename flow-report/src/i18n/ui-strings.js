/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/** @typedef {typeof UIStrings} UIStringsType */

export const UIStrings = {
  /** Description of a report that evaluates a web page as it loads, but before the user interacts with it. */
  navigationDescription: 'Page load',
  /** Description of a report that evaluates a web page over a period of time where a user could have interacted with the page. */
  timespanDescription: 'User interactions',
  /** Description of a report that evaluates the state of a web page at a single point in time. */
  snapshotDescription: 'Captured state of page',
  /** Label for a report that evaluates a page navigation. */
  navigationReport: 'Navigation report',
  /** Label for a report that evaluates a period of time where a user could have interacted with the page. */
  timespanReport: 'Timespan report',
  /** Label for a report that evaluates the state of a web page at a single point in time. */
  snapshotReport: 'Snapshot report',
  /** Title of a home page that summarizes and links to the other pages. */
  summary: 'Summary',
  /** Title of a report section lists and links to multiple sub-reports. */
  allReports: 'All Reports',
  /** Default title of a Lighthouse report over a user flow. "User Flow" refers to a series of user interactions on a page that a site developer wants to test. "Lighthouse" is a product name https://developers.google.com/web/tools/lighthouse. */
  title: 'Lighthouse User Flow Report',
  /** Label for a report evaluating a web page. Label indicates that the report refers to the desktop version of the site. */
  desktop: 'Desktop',
  /** Label for a report evaluating a web page. Label indicates that the report refers to the mobile version of the site. */
  mobile: 'Mobile',
  /** Rating indicating that a report category is good/passing. */
  ratingPass: 'Good',
  /** Rating indicating that a report category is average or needs improvement. */
  ratingAverage: 'Average',
  /** Rating indicating that a report category is poor/failing. */
  ratingFail: 'Poor',
  /** Rating indicating that a report category rating could not be calculated because of an error. */
  ratingError: 'Error',
  /** Label for a button that saves a Lighthouse report to disk. */
  save: 'Save',
};
