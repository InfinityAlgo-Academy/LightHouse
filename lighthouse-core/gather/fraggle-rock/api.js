'use strict';

const _ = require('lodash');
const DriverV2 = require('./driver-v2.js');
const Runner = require('../../runner.js');
const Config = require('../../config/config.js');
const gathererMappings = require('./gatherer-mapping.js');

/** @typedef {import('../../config/config.js')} Config */

/**
 *
 * @param {any} modeFn
 * @param {{page: import('puppeteer').Page, config: Config}} opts
 */
async function runLighthouseInMode(modeFn, opts) {
  const config = new Config(opts.config);
  const driver = new DriverV2(opts.page);
  await driver.connect();
  return Runner.run(() => modeFn({config, driver}), {url: await opts.page.url(), config});
}

/** @param {{driver: DriverV2, config: Config}} p1 */
async function runSnapshot(p1) {
  const {driver, config} = p1;
  const gatherers = _.flatMap(config.passes, pass => pass.gatherers);

  const artifacts = {
    fetchTime: (new Date()).toJSON(),
    LighthouseRunWarnings: [],
    URL: {requestedUrl: 'http://unknown.com', finalUrl: 'http://unknown.com'},
    Stacks: [],
    HostFormFactor: 'unknown',
    HostUserAgent: 'unknown',
    NetworkUserAgent: 'unknown',
    BenchmarkIndex: 0,
    settings: config.settings,
    Timing: [],
  };

  for (const gatherer of gatherers) {
    if (gathererMappings[gatherer.instance.name] !== 'snapshot') continue;
    console.log('Gatherer:', gatherer.instance.name);
    artifacts[gatherer.instance.name] = await Promise.resolve().then(() => gatherer.instance.afterPass({driver})).catch(err => err);
  }

  return artifacts;
}

module.exports = {
  snapshot: runLighthouseInMode.bind(null, runSnapshot),
};
