'use strict';

/**
 * @typedef {object} SmoketestDfn
 * @property {string} id
 * @property {string} expectations
 * @property {string} config
 * @property {string | undefined} batch
 */

const smokehouseDir = 'lighthouse-cli/test/smokehouse/';

/** @type {Array<SmoketestDfn>} */
module.exports = [{
  id: 'a11y',
  config: smokehouseDir + 'a11y/a11y-config.js',
  expectations: 'a11y/expectations.js',
  batch: 'parallel-first',
}, {
  id: 'errors',
  expectations: smokehouseDir + 'error-expectations.js',
  config: smokehouseDir + 'error-config.js',
  batch: 'errors',
}, {
  id: 'pwa',
  expectations: smokehouseDir + 'pwa-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
  batch: 'parallel-second',
}, {
  id: 'pwa2',
  expectations: smokehouseDir + 'pwa2-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
  batch: 'parallel-second',
}, {
  id: 'pwa3',
  expectations: smokehouseDir + 'pwa3-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
  batch: 'parallel-first',
}, {
  id: 'dbw',
  expectations: 'dobetterweb/dbw-expectations.js',
  config: smokehouseDir + 'dbw-config.js',
  batch: 'parallel-second',
}, {
  id: 'redirects',
  expectations: 'redirects/expectations.js',
  config: smokehouseDir + 'redirects-config.js',
  batch: 'parallel-first',
}, {
  id: 'seo',
  expectations: 'seo/expectations.js',
  config: smokehouseDir + 'seo-config.js',
  batch: 'parallel-first',
}, {
  id: 'offline',
  expectations: 'offline-local/offline-expectations.js',
  config: smokehouseDir + 'offline-config.js',
  batch: 'offline',
}, {
  id: 'byte',
  expectations: 'byte-efficiency/expectations.js',
  config: smokehouseDir + 'byte-config.js',
  batch: 'perf-opportunity',
}, {
  id: 'perf',
  expectations: 'perf/expectations.js',
  config: 'lighthouse-core/config/perf-config.js',
  batch: 'perf-metric',
}, {
  id: 'metrics',
  expectations: 'tricky-metrics/expectations.js',
  config: 'lighthouse-core/config/perf-config.js',
  batch: 'parallel-second',
}];
