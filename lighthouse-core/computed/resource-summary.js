/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const NetworkRecords = require('./network-records.js');
const URL = require('../lib/url-shim.js');
const NetworkRequest = require('../lib/network-request.js');
const MainResource = require('./main-resource.js');
const Budget = require('../config/budget.js');
// const Util = require('../report/html/renderer/util.js');

// 25 most used tld plus one domains (aka public suffixes) from http archive.
// @see https://github.com/GoogleChrome/lighthouse/pull/5065#discussion_r191926212
// The canonical list is https://publicsuffix.org/learn/ but we're only using subset to conserve bytes
const listOfTlds = [
  'com', 'co', 'gov', 'edu', 'ac', 'org', 'go', 'gob', 'or', 'net', 'in', 'ne', 'nic', 'gouv',
  'web', 'spb', 'blog', 'jus', 'kiev', 'mil', 'wi', 'qc', 'ca', 'bel', 'on',
];
class Util {
  /**
   * @param {string|URL} value
   * @return {!URL}
   */
  static createOrReturnURL(value) {
    if (value instanceof URL) {
      return value;
    }

    return new URL(value);
  }

  /**
   * Returns a primary domain for provided hostname (e.g. www.example.com -> example.com).
   * @param {string|URL} url hostname or URL object
   * @returns {string}
   */
  static getRootDomain(url) {
    const hostname = Util.createOrReturnURL(url).hostname;
    const tld = Util.getTld(hostname);

    // tld is .com or .co.uk which means we means that length is 1 to big
    // .com => 2 & .co.uk => 3
    const splitTld = tld.split('.');

    // get TLD + root domain
    return hostname.split('.').slice(-splitTld.length).join('.');
  }

  /**
   * Gets the tld of a domain
   *
   * @param {string} hostname
   * @return {string} tld
   */
  static getTld(hostname) {
    const tlds = hostname.split('.').slice(-2);

    if (!listOfTlds.includes(tlds[0])) {
      return `.${tlds[tlds.length - 1]}`;
    }

    return `.${tlds.join('.')}`;
  }
}

/** @typedef {{count: number, resourceSize: number, transferSize: number}} ResourceEntry */

class ResourceSummary {
  /**
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {LH.Budget.ResourceType}
   */
  static determineResourceType(record) {
    if (!record.resourceType) return 'other';
    /** @type {Partial<Record<LH.Crdp.Network.ResourceType, LH.Budget.ResourceType>>} */
    const requestToResourceType = {
      'Stylesheet': 'stylesheet',
      'Image': 'image',
      'Media': 'media',
      'Font': 'font',
      'Script': 'script',
      'Document': 'document',
    };
    return requestToResourceType[record.resourceType] || 'other';
  }

  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {string} mainResourceURL
   * @param {ImmutableObject<LH.Budget[]|null>} budgets
   * @return {Record<LH.Budget.ResourceType, ResourceEntry>}
   */
  static summarize(networkRecords, mainResourceURL, budgets) {
    /** @type {Record<LH.Budget.ResourceType, ResourceEntry>} */
    const resourceSummary = {
      'stylesheet': {count: 0, resourceSize: 0, transferSize: 0},
      'image': {count: 0, resourceSize: 0, transferSize: 0},
      'media': {count: 0, resourceSize: 0, transferSize: 0},
      'font': {count: 0, resourceSize: 0, transferSize: 0},
      'script': {count: 0, resourceSize: 0, transferSize: 0},
      'document': {count: 0, resourceSize: 0, transferSize: 0},
      'other': {count: 0, resourceSize: 0, transferSize: 0},
      'total': {count: 0, resourceSize: 0, transferSize: 0},
      'third-party': {count: 0, resourceSize: 0, transferSize: 0},
    };
    const budget = Budget.getMatchingBudget(budgets, mainResourceURL);
    /** @type {ReadonlyArray<string>} */
    let firstPartyHosts = [];
    if (budget && budget.options && budget.options.firstPartyHostnames) {
      firstPartyHosts = budget.options.firstPartyHostnames;
    } else {
      const rootDomain = Util.getRootDomain(mainResourceURL);
      firstPartyHosts = [`*.${rootDomain}`];
    }

    networkRecords.filter(record => {
      // Ignore favicon.co
      // Headless Chrome does not request /favicon.ico, so don't consider this request.
      // Makes resource summary consistent across LR / other channels.
      const type = this.determineResourceType(record);
      if (type === 'other' && record.url.endsWith('/favicon.ico')) {
        return false;
      }
      // Ignore non-network protocols
      if (NetworkRequest.isNonNetworkRequest(record)) return false;
      return true;
    }).forEach((record) => {
      const type = this.determineResourceType(record);
      resourceSummary[type].count++;
      resourceSummary[type].resourceSize += record.resourceSize;
      resourceSummary[type].transferSize += record.transferSize;

      resourceSummary.total.count++;
      resourceSummary.total.resourceSize += record.resourceSize;
      resourceSummary.total.transferSize += record.transferSize;

      const isFirstParty = firstPartyHosts.some((hostExp) => {
        const url = new URL(record.url);
        if (hostExp.startsWith('*.')) {
          return url.hostname.endsWith(hostExp.slice(2));
        }
        return url.hostname === hostExp;
      });

      if (!isFirstParty) {
        resourceSummary['third-party'].count++;
        resourceSummary['third-party'].resourceSize += record.resourceSize;
        resourceSummary['third-party'].transferSize += record.transferSize;
      }
    });
    return resourceSummary;
  }

  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog, budgets: ImmutableObject<LH.Budget[]|null>}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<Record<LH.Budget.ResourceType,ResourceEntry>>}
   */
  static async compute_(data, context) {
    const [networkRecords, mainResource] = await Promise.all([
      NetworkRecords.request(data.devtoolsLog, context),
      MainResource.request({devtoolsLog: data.devtoolsLog, URL: data.URL}, context),
    ]);
    return ResourceSummary.summarize(networkRecords, mainResource.url, data.budgets);
  }
}

module.exports = makeComputedArtifact(ResourceSummary);
