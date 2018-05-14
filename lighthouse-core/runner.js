/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const isDeepEqual = require('lodash.isequal');
const Driver = require('./gather/driver.js');
const GatherRunner = require('./gather/gather-runner');
const ReportScoring = require('./scoring');
const Audit = require('./audits/audit');
const log = require('lighthouse-logger');
const assetSaver = require('./lib/asset-saver');
const fs = require('fs');
const path = require('path');
const URL = require('./lib/url-shim');
const Sentry = require('./lib/sentry');
const generateReport = require('./report/report-generator').generateReport;

const Connection = require('./gather/connections/connection.js'); // eslint-disable-line no-unused-vars

class Runner {
  /**
   * @param {Connection} connection
   * @param {{config: LH.Config, url: string, driverMock?: Driver}} opts
   * @return {Promise<LH.RunnerResult|undefined>}
   */
  static async run(connection, opts) {
    try {
      const startTime = Date.now();
      const settings = opts.config.settings;

      /**
       * List of top-level warnings for this Lighthouse run.
       * @type {Array<string>}
       */
      const lighthouseRunWarnings = [];

      // save the requestedUrl provided by the user
      const rawRequestedUrl = opts.url;
      if (typeof rawRequestedUrl !== 'string' || rawRequestedUrl.length === 0) {
        throw new Error('You must provide a url to the runner');
      }

      let parsedURL;
      try {
        parsedURL = new URL(opts.url);
      } catch (e) {
        throw new Error('The url provided should have a proper protocol and hostname.');
      }

      const sentryContext = Sentry.getContext();
      // @ts-ignore TODO(bckenny): Sentry type checking
      Sentry.captureBreadcrumb({
        message: 'Run started',
        category: 'lifecycle',
        // @ts-ignore TODO(bckenny): Sentry type checking
        data: sentryContext && sentryContext.extra,
      });

      // If the URL isn't https and is also not localhost complain to the user.
      if (parsedURL.protocol !== 'https:' && parsedURL.hostname !== 'localhost') {
        log.warn('Lighthouse', 'The URL provided should be on HTTPS');
        log.warn('Lighthouse', 'Performance stats will be skewed redirecting from HTTP to HTTPS.');
      }

      // canonicalize URL with any trailing slashes neccessary
      const requestedUrl = parsedURL.href;

      // User can run -G solo, -A solo, or -GA together
      // -G and -A will run partial lighthouse pipelines,
      // and -GA will run everything plus save artifacts to disk

      // Gather phase
      // Either load saved artifacts off disk or from the browser
      let artifacts;
      if (settings.auditMode && !settings.gatherMode) {
        // No browser required, just load the artifacts from disk.
        const path = Runner._getArtifactsPath(settings);
        artifacts = await assetSaver.loadArtifacts(path);
      } else {
        artifacts = await Runner._gatherArtifactsFromBrowser(requestedUrl, opts, connection);
        // -G means save these to ./latest-run, etc.
        if (settings.gatherMode) {
          const path = Runner._getArtifactsPath(settings);
          await assetSaver.saveArtifacts(artifacts, path);
        }
      }

      // Potentially quit early
      if (settings.gatherMode && !settings.auditMode) return;

      // Audit phase
      if (!opts.config.audits) {
        throw new Error('No audits to evaluate.');
      }
      const auditResults = await Runner._runAudits(settings, opts.config.audits, artifacts);

      // LHR construction phase
      log.log('status', 'Generating results...');

      if (artifacts.LighthouseRunWarnings) {
        lighthouseRunWarnings.push(...artifacts.LighthouseRunWarnings);
      }

      // Entering: conclusion of the lighthouse result object
      // @ts-ignore - Needs json require() support
      const lighthouseVersion = /** @type {string} */ (require('../package.json').version);

      /** @type {Object<string, LH.Audit.Result>} */
      const resultsById = {};
      for (const audit of auditResults) {
        resultsById[audit.id] = audit;

        if (audit.warnings && audit.warnings.length) {
          const prefixedWarnings = audit.warnings.map(msg => `${audit.title}: ${msg}`);
          lighthouseRunWarnings.push(...prefixedWarnings);
        }
      }

      /** @type {Object<string, LH.Result.Category>} */
      let categories = {};
      if (opts.config.categories) {
        categories = ReportScoring.scoreAllCategories(opts.config.categories, resultsById);
      }

      /** @type {LH.Result} */
      const lhr = {
        userAgent: artifacts.UserAgent,
        lighthouseVersion,
        fetchTime: artifacts.fetchTime,
        requestedUrl: requestedUrl,
        finalUrl: artifacts.URL.finalUrl,
        runWarnings: lighthouseRunWarnings,
        audits: resultsById,
        configSettings: settings,
        categories,
        categoryGroups: opts.config.groups,
        timing: {total: Date.now() - startTime},
      };

      const report = generateReport(lhr, settings.output);
      return {lhr, artifacts, report};
    } catch (err) {
      // @ts-ignore TODO(bckenny): Sentry type checking
      await Sentry.captureException(err, {level: 'fatal'});
      throw err;
    }
  }

  /**
   * Establish connection, load page and collect all required artifacts
   * @param {string} requestedUrl
   * @param {{config: LH.Config, driverMock?: Driver}} runnerOpts
   * @param {Connection} connection
   * @return {Promise<LH.Artifacts>}
   */
  static async _gatherArtifactsFromBrowser(requestedUrl, runnerOpts, connection) {
    if (!runnerOpts.config.passes) {
      throw new Error('No browser artifacts are either provided or requested.');
    }

    const driver = runnerOpts.driverMock || new Driver(connection);
    const gatherOpts = {
      driver,
      requestedUrl,
      settings: runnerOpts.config.settings,
    };
    const artifacts = await GatherRunner.run(runnerOpts.config.passes, gatherOpts);
    return artifacts;
  }

  /**
   * Save collected artifacts to disk
   * @param {LH.Config.Settings} settings
   * @param {Array<LH.Config.AuditDefn>} audits
   * @param {LH.Artifacts} artifacts
   * @return {Promise<Array<LH.Audit.Result>>}
   */
  static async _runAudits(settings, audits, artifacts) {
    log.log('status', 'Analyzing and running audits...');
    artifacts = Object.assign({}, Runner.instantiateComputedArtifacts(), artifacts);

    if (artifacts.settings) {
      const overrides = {gatherMode: undefined, auditMode: undefined, output: undefined};
      const normalizedGatherSettings = Object.assign({}, artifacts.settings, overrides);
      const normalizedAuditSettings = Object.assign({}, settings, overrides);

      // TODO(phulce): allow change of throttling method to `simulate`
      if (!isDeepEqual(normalizedGatherSettings, normalizedAuditSettings)) {
        throw new Error('Cannot change settings between gathering and auditing');
      }
    }

    // Run each audit sequentially
    const auditResults = [];
    for (const auditDefn of audits) {
      const auditResult = await Runner._runAudit(auditDefn, artifacts, settings);
      auditResults.push(auditResult);
    }

    return auditResults;
  }

  /**
   * Checks that the audit's required artifacts exist and runs the audit if so.
   * Otherwise returns error audit result.
   * @param {LH.Config.AuditDefn} auditDefn
   * @param {LH.Artifacts} artifacts
   * @param {LH.Config.Settings} settings
   * @return {Promise<LH.Audit.Result>}
   * @private
   */
  static async _runAudit(auditDefn, artifacts, settings) {
    const audit = auditDefn.implementation;
    const status = `Evaluating: ${audit.meta.description}`;

    log.log('status', status);
    let auditResult;
    try {
      // Return an early error if an artifact required for the audit is missing or an error.
      for (const artifactName of audit.meta.requiredArtifacts) {
        const noArtifact = artifacts[artifactName] === undefined;

        // If trace required, check that DEFAULT_PASS trace exists.
        // TODO: need pass-specific check of networkRecords and traces.
        const noTrace = artifactName === 'traces' && !artifacts.traces[Audit.DEFAULT_PASS];

        if (noArtifact || noTrace) {
          log.warn('Runner',
              `${artifactName} gatherer, required by audit ${audit.meta.name}, did not run.`);
          throw new Error(`Required ${artifactName} gatherer did not run.`);
        }

        // If artifact was an error, it must be non-fatal (or gatherRunner would
        // have thrown). Output error result on behalf of audit.
        if (artifacts[artifactName] instanceof Error) {
          /** @type {Error} */
          // @ts-ignore An artifact *could* be an Error, but caught here, so ignore elsewhere.
          const artifactError = artifacts[artifactName];

          // @ts-ignore TODO(bckenny): Sentry type checking
          Sentry.captureException(artifactError, {
            tags: {gatherer: artifactName},
            level: 'error',
          });

          log.warn('Runner', `${artifactName} gatherer, required by audit ${audit.meta.name},` +
            ` encountered an error: ${artifactError.message}`);

          // Create a friendlier display error and mark it as expected to avoid duplicates in Sentry
          const error = new Error(
              `Required ${artifactName} gatherer encountered an error: ${artifactError.message}`);
          // @ts-ignore Non-standard property added to Error
          error.expected = true;
          throw error;
        }
      }

      // all required artifacts are in good shape, so we proceed
      const auditOptions = Object.assign({}, audit.defaultOptions, auditDefn.options);
      const product = await audit.audit(artifacts, {options: auditOptions, settings: settings});
      auditResult = Audit.generateAuditResult(audit, product);
    } catch (err) {
      log.warn(audit.meta.name, `Caught exception: ${err.message}`);
      if (err.fatal) {
        throw err;
      }

      // @ts-ignore TODO(bckenny): Sentry type checking
      Sentry.captureException(err, {tags: {audit: audit.meta.name}, level: 'error'});
      // Non-fatal error become error audit result.
      const errorMessage = err.friendlyMessage ?
        `${err.friendlyMessage} (${err.message})` :
        `Audit error: ${err.message}`;
      auditResult = Audit.generateErrorAuditResult(audit, errorMessage);
    }

    log.verbose('statusEnd', status);
    return auditResult;
  }

  /**
   * Returns list of audit names for external querying.
   * @return {Array<string>}
   */
  static getAuditList() {
    const ignoredFiles = [
      'audit.js',
      'violation-audit.js',
      'accessibility/axe-audit.js',
      'multi-check-audit.js',
      'byte-efficiency/byte-efficiency-audit.js',
      'manual/manual-audit.js',
    ];

    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './audits')),
      ...fs.readdirSync(path.join(__dirname, './audits/dobetterweb')).map(f => `dobetterweb/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/seo')).map(f => `seo/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/seo/manual')).map(f => `seo/manual/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/accessibility'))
          .map(f => `accessibility/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/accessibility/manual'))
          .map(f => `accessibility/manual/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/byte-efficiency'))
          .map(f => `byte-efficiency/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/manual')).map(f => `manual/${f}`),
    ];
    return fileList.filter(f => {
      return /\.js$/.test(f) && !ignoredFiles.includes(f);
    }).sort();
  }

  /**
   * Returns list of gatherer names for external querying.
   * @return {Array<string>}
   */
  static getGathererList() {
    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers')),
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers/seo')).map(f => `seo/${f}`),
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers/dobetterweb'))
          .map(f => `dobetterweb/${f}`),
    ];
    return fileList.filter(f => /\.js$/.test(f) && f !== 'gatherer.js').sort();
  }

  /**
   * Returns list of computed gatherer names for external querying.
   * @return {Array<string>}
   */
  static getComputedGathererList() {
    const filenamesToSkip = [
      'computed-artifact.js', // the base class which other artifacts inherit
      'metrics', // the sub folder that contains metric names
      'metrics/lantern-metric.js', // lantern metric base class
      'metrics/metric.js', // computed metric base class
    ];

    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './gather/computed')),
      ...fs.readdirSync(path.join(__dirname, './gather/computed/metrics')).map(f => `metrics/${f}`),
    ];

    return fileList.filter(f => /\.js$/.test(f) && !filenamesToSkip.includes(f)).sort();
  }

  /**
   * TODO(bckenny): refactor artifact types
   * @return {LH.ComputedArtifacts}
   */
  static instantiateComputedArtifacts() {
    const computedArtifacts = {};
    Runner.getComputedGathererList().forEach(function(filename) {
      // Drop `.js` suffix to keep browserify import happy.
      filename = filename.replace(/\.js$/, '');
      const ArtifactClass = require('./gather/computed/' + filename);
      const artifact = new ArtifactClass(computedArtifacts);
      // define the request* function that will be exposed on `artifacts`
      computedArtifacts['request' + artifact.name] = artifact.request.bind(artifact);
    });

    return /** @type {LH.ComputedArtifacts} */ (computedArtifacts);
  }

  /**
   * Resolves the location of the specified plugin and returns an absolute
   * string path to the file. Used for loading custom audits and gatherers.
   * Throws an error if no plugin is found.
   * @param {string} plugin
   * @param {string=} configDir The absolute path to the directory of the config file, if there is one.
   * @param {string=} category Optional plugin category (e.g. 'audit') for better error messages.
   * @return {string}
   * @throws {Error}
   */
  static resolvePlugin(plugin, configDir, category) {
    // First try straight `require()`. Unlikely to be specified relative to this
    // file, but adds support for Lighthouse plugins in npm modules as
    // `require()` walks up parent directories looking inside any node_modules/
    // present. Also handles absolute paths.
    try {
      return require.resolve(plugin);
    } catch (e) {}

    // See if the plugin resolves relative to the current working directory.
    // Most useful to handle the case of invoking Lighthouse as a module, since
    // then the config is an object and so has no path.
    const cwdPath = path.resolve(process.cwd(), plugin);
    try {
      return require.resolve(cwdPath);
    } catch (e) {}

    const errorString = 'Unable to locate ' +
        (category ? `${category}: ` : '') +
        `${plugin} (tried to require() from '${__dirname}' and load from '${cwdPath}'`;

    if (!configDir) {
      throw new Error(errorString + ')');
    }

    // Finally, try looking up relative to the config file path. Just like the
    // relative path passed to `require()` is found relative to the file it's
    // in, this allows plugin paths to be specified relative to the config file.
    const relativePath = path.resolve(configDir, plugin);
    try {
      return require.resolve(relativePath);
    } catch (requireError) {}

    throw new Error(errorString + ` and '${relativePath}')`);
  }

  /**
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
}

module.exports = Runner;
