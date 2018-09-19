/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const GatherRunner = require('./gather/gather-runner');
const AuditRunner = require('./audit-runner.js');
const ReportScoring = require('./scoring');
const log = require('lighthouse-logger');
const i18n = require('./lib/i18n');
const assetSaver = require('./lib/asset-saver');
const Sentry = require('./lib/sentry');
const generateReport = require('./report/report-generator').generateReport;
const lighthouseVersion = require('../package.json').version;

/** @typedef {import('./gather/connections/connection.js')} Connection */
/** @typedef {import('./config/config.js')} Config */
/** @typedef {import('./gather/driver.js')} Driver */

class Runner {
  /**
   * @param {Connection} connection
   * @param {{config: Config, requestedUrl?: string, driverMock?: Driver}} runOpts
   * @return {Promise<LH.RunnerResult|undefined>}
   */
  static async run(connection, runOpts) {
    const config = runOpts.config;
    const settings = config.settings;

    try {
      const startTime = Date.now();
      const sentryContext = Sentry.getContext();
      Sentry.captureBreadcrumb({
        message: 'Run started',
        category: 'lifecycle',
        data: sentryContext && sentryContext.extra,
      });

      // User can run -G solo, -A solo, or -GA together
      // -G and -A will run partial lighthouse pipelines,
      // and -GA will run everything plus save artifacts to disk

      // Gather phase. either load saved artifacts from the browser or off disk.
      let artifacts;
      if (Runner.shouldGather(runOpts.config.settings)) {
        if (!runOpts.requestedUrl) {
          throw new Error(`You must provide a url to the runner.`);
        }

        const gatherOpts = {
          settings,
          connection,
          driverMock: runOpts.driverMock,
        };
        artifacts = await GatherRunner.run(runOpts.requestedUrl, config.passes, gatherOpts);
      } else {
        // TODO(bckenny): move out of core.
        // No browser required, just load the artifacts from disk.
        const path = Runner._getArtifactsPath(runOpts.config.settings);
        artifacts = await assetSaver.loadArtifacts(path);
      }

      // TODO(bckenny): move out of core.
      // -G means save these to ./latest-run (or user-provided dir).
      if (settings.gatherMode) {
        const path = Runner._getArtifactsPath(settings);
        await assetSaver.saveArtifacts(artifacts, path);
      }

      // Quit early if that's all that was needed.
      if (!Runner.shouldAudit(settings)) return;

      // Audit phase
      const fullArtifacts = Object.assign({}, Runner.instantiateComputedArtifacts(), artifacts);
      const {auditResults, lighthouseRunWarnings} = await AuditRunner.run(runOpts.requestedUrl,
          settings, config.audits, fullArtifacts);

      // LHR construction phase
      log.log('status', 'Generating results...');

      /** @type {Object<string, LH.Audit.Result>} */
      const resultsById = {};
      for (const audit of auditResults) {
        resultsById[audit.id] = audit;
      }

      /** @type {Object<string, LH.Result.Category>} */
      let categories = {};
      if (config.categories) {
        categories = ReportScoring.scoreAllCategories(config.categories, resultsById);
      }

      /** @type {LH.Result} */
      const lhr = {
        userAgent: artifacts.HostUserAgent,
        environment: {
          networkUserAgent: artifacts.NetworkUserAgent,
          hostUserAgent: artifacts.HostUserAgent,
          benchmarkIndex: artifacts.BenchmarkIndex,
        },
        lighthouseVersion,
        fetchTime: artifacts.fetchTime,
        requestedUrl: artifacts.URL.requestedUrl,
        finalUrl: artifacts.URL.finalUrl,
        runWarnings: lighthouseRunWarnings,
        audits: resultsById,
        configSettings: config.settings,
        categories,
        categoryGroups: config.groups || undefined,
        timing: {total: Date.now() - startTime},
        i18n: {
          rendererFormattedStrings: i18n.getRendererFormattedStrings(config.settings.locale),
          icuMessagePaths: {},
        },
      };

      // Replace ICU message references with localized strings; save replaced paths in lhr.
      lhr.i18n.icuMessagePaths = i18n.replaceIcuMessageInstanceIds(lhr, config.settings.locale);

      const report = generateReport(lhr, settings.output);
      return {lhr, artifacts, report};
    } catch (err) {
      await Sentry.captureException(err, {level: 'fatal'});
      throw err;
    }
  }

  /**
   * Whether artifacts should be gathered from the browser, or just loaded from
   * disk. True if explicitly gatherMode or default state.
   * @param {LH.Config.Settings} settings
   * @return {boolean}
   */
  static shouldGather(settings) {
    return !!(settings.gatherMode || settings.gatherMode === settings.auditMode);
  }

  /**
   * Whether audits should be run. True if explicitly auditMode or default state.
   * @param {LH.Config.Settings} settings
   * @return {boolean}
   */
  static shouldAudit(settings) {
    return !!(settings.auditMode || settings.gatherMode === settings.auditMode);
  }

  /**
   * TODO(bckenny): move out of core
   * Get path to use for -G and -A modes. Defaults to $CWD/latest-run
   * @param {LH.Config.Settings} settings
   * @return {string}
   */
  static _getArtifactsPath(settings) {
    const {auditMode, gatherMode} = settings;

    // This enables usage like: -GA=./custom-folder
    if (typeof auditMode === 'string') return path.resolve(process.cwd(), auditMode);
    if (typeof gatherMode === 'string') return path.resolve(process.cwd(), gatherMode);

    return path.join(process.cwd(), 'latest-run');
  }

  /**
   * TODO(bckenny): refactor artifact types
   * @return {LH.ComputedArtifacts}
   */
  static instantiateComputedArtifacts() {
    const computedArtifacts = {};
    AuditRunner.getComputedGathererList().forEach(function(filename) {
      // Drop `.js` suffix to keep browserify import happy.
      filename = filename.replace(/\.js$/, '');
      const ArtifactClass = require('./gather/computed/' + filename);
      const artifact = new ArtifactClass(computedArtifacts);
      // define the request* function that will be exposed on `artifacts`
      // @ts-ignore - doesn't have an index signature, so can't be set dynamically.
      computedArtifacts['request' + artifact.name] = artifact.request.bind(artifact);
    });

    return /** @type {LH.ComputedArtifacts} */ (computedArtifacts);
  }
}

module.exports = Runner;
