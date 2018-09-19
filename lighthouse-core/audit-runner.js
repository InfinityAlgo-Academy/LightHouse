/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const isDeepEqual = require('lodash.isequal');
const log = require('lighthouse-logger');
const i18n = require('./lib/i18n.js');
const Audit = require('./audits/audit.js');
const Sentry = require('./lib/sentry.js');
const URL = require('./lib/url-shim.js');

class AuditRunner {
/**
   * Run all audits with specified settings and artifacts.
   * @param {string=} requestedUrl
   * @param {LH.Config.Settings} settings
   * @param {?Array<LH.Config.AuditDefn>} audits
   * @param {LH.Artifacts} artifacts
   * @return {Promise<{auditResults: Array<LH.Audit.Result>, runWarnings: Array<string>}>}
   */
  static async run(requestedUrl, settings, audits, artifacts) {
    log.log('status', 'Analyzing and running audits...');

    if (!audits) throw new Error('No audits in config to evaluate');
    if (requestedUrl && !URL.equalWithExcludedFragments(requestedUrl, artifacts.URL.requestedUrl)) {
      throw new Error('Cannot run audit mode on different URL than gatherers were');
    }

    // Check that current settings are compatible with settings used to gather artifacts.
    if (artifacts.settings) {
      const overrides = {gatherMode: undefined, auditMode: undefined, output: undefined};
      const normalizedGatherSettings = Object.assign({}, artifacts.settings, overrides);
      const normalizedAuditSettings = Object.assign({}, settings, overrides);

      // TODO(phulce): allow change of throttling method to `simulate`
      if (!isDeepEqual(normalizedGatherSettings, normalizedAuditSettings)) {
        throw new Error('Cannot change settings between gathering and auditing');
      }
    }

    /**
     * List of top-level warnings for this Lighthouse run, starting with any from artifacts.
     * @type {Array<string>}
     */
    const runWarnings = [...artifacts.LighthouseRunWarnings || []];
    // Run each audit sequentially
    const auditResults = [];
    for (const auditDefn of audits) {
      const auditResult = await AuditRunner._runAudit(auditDefn, artifacts, settings, runWarnings);
      auditResults.push(auditResult);
    }

    return {auditResults, runWarnings};
  }

  /**
   * Checks that the audit's required artifacts exist and runs the audit if so.
   * Otherwise returns error audit result.
   * @param {LH.Config.AuditDefn} auditDefn
   * @param {LH.Artifacts} artifacts
   * @param {LH.Config.Settings} settings
   * @param {Array<string>} runWarnings
   * @return {Promise<LH.Audit.Result>}
   * @private
   */
  static async _runAudit(auditDefn, artifacts, settings, runWarnings) {
    const audit = auditDefn.implementation;
    const status = `Evaluating: ${i18n.getFormatted(audit.meta.title, 'en-US')}`;

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
              `${artifactName} gatherer, required by audit ${audit.meta.id}, did not run.`);
          throw new Error(`Required ${artifactName} gatherer did not run.`);
        }

        // If artifact was an error, it must be non-fatal (or gatherRunner would
        // have thrown). Output error result on behalf of audit.
        if (artifacts[artifactName] instanceof Error) {
          /** @type {Error} */
          // @ts-ignore An artifact *could* be an Error, but caught here, so ignore elsewhere.
          const artifactError = artifacts[artifactName];

          Sentry.captureException(artifactError, {
            tags: {gatherer: artifactName},
            level: 'error',
          });

          log.warn('Runner', `${artifactName} gatherer, required by audit ${audit.meta.id},` +
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
      const auditContext = {
        options: auditOptions,
        settings,
        LighthouseRunWarnings: runWarnings,
      };

      const product = await audit.audit(artifacts, auditContext);
      auditResult = Audit.generateAuditResult(audit, product);
    } catch (err) {
      log.warn(audit.meta.id, `Caught exception: ${err.message}`);
      if (err.fatal) {
        throw err;
      }

      Sentry.captureException(err, {tags: {audit: audit.meta.id}, level: 'error'});
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
      ...fs.readdirSync(path.join(__dirname, './audits/metrics')).map(f => `metrics/${f}`),
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
}

module.exports = AuditRunner;
