/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import jestMock from 'jest-mock';

import {Audit as BaseAudit} from '../../../audits/audit.js';
import * as constants from '../../../config/constants.js';
import BaseGatherer from '../../../fraggle-rock/gather/base-gatherer.js';
import {initializeConfig, getConfigDisplayString} from '../../../fraggle-rock/config/config.js';
import {LH_ROOT} from '../../../../root.js';
import format from '../../../../shared/localization/format.js';
import defaultConfig from '../../../config/default-config.js';

const {nonSimulatedPassConfigOverrides} = constants;

describe('Fraggle Rock Config', () => {
  /** @type {LH.Gatherer.GatherMode} */
  let gatherMode = 'snapshot';

  beforeEach(() => {
    gatherMode = 'snapshot';
  });

  it('should throw if the config path is not absolute', async () => {
    expect(initializeConfig(undefined, {gatherMode, configPath: '../relative/path'}))
      .rejects.toThrow(/must be an absolute path/);
  });

  it('should not mutate the original input', async () => {
    const configJson = {artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}]};
    const {config} = await initializeConfig(configJson, {gatherMode});
    expect(configJson).toEqual({artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}]});
    expect(config).not.toBe(configJson);
    expect(config).not.toEqual(configJson);
    expect(config.artifacts).toMatchObject([{gatherer: {path: 'accessibility'}}]);
  });

  it('should use default config when none passed in', async () => {
    const {config} = await initializeConfig(undefined, {gatherMode});
    expect(config.settings).toMatchObject({formFactor: 'mobile'});
    if (!config.audits) throw new Error('Did not define audits');
    expect(config.audits.length).toBeGreaterThan(0);
  });

  it('should resolve settings with defaults', async () => {
    const {config} = await initializeConfig(
      {settings: {output: 'csv', maxWaitForFcp: 1234}},
      {settingsOverrides: {maxWaitForFcp: 12345}, gatherMode}
    );

    expect(config.settings).toMatchObject({
      formFactor: 'mobile', // inherit from default
      output: 'csv', // config-specific overrides
      maxWaitForFcp: 12345, // explicit overrides
    });
  });

  it('should override throttlingMethod in timespan mode', async () => {
    const {config} = await initializeConfig(
      undefined,
      {settingsOverrides: {throttlingMethod: 'simulate'}, gatherMode: 'timespan'}
    );

    expect(config.settings).toMatchObject({
      throttlingMethod: 'devtools',
    });
  });

  it('should resolve artifact definitions', async () => {
    const configJson = {artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}]};
    const {config} = await initializeConfig(configJson, {gatherMode});

    expect(config).toMatchObject({
      artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}],
    });
  });

  it('should throw on invalid artifact definitions', () => {
    const nonFRGatherer = new BaseGatherer();
    nonFRGatherer.getArtifact = jestMock.fn();
    const configJson = {artifacts: [{id: 'LegacyGather', gatherer: {instance: nonFRGatherer}}]};
    expect(initializeConfig(configJson, {gatherMode})).rejects.toThrow(/FRGatherer gatherer/);
  });

  it('should filter configuration by gatherMode', async () => {
    const timespanGatherer = new BaseGatherer();
    timespanGatherer.getArtifact = jestMock.fn();
    timespanGatherer.meta = {supportedModes: ['timespan']};

    const configJson = {
      artifacts: [
        {id: 'Accessibility', gatherer: 'accessibility'},
        {id: 'Timespan', gatherer: {instance: timespanGatherer}},
      ],
    };

    const {config} = await initializeConfig(configJson, {gatherMode: 'snapshot'});
    expect(config).toMatchObject({
      artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}],
    });
  });

  it('should filter configuration by only/skip filters', async () => {
    const {config} = await initializeConfig(undefined, {
      gatherMode: 'navigation',
      settingsOverrides: {
        onlyAudits: ['color-contrast'],
        onlyCategories: ['seo'],
        skipAudits: ['structured-data', 'robots-txt', 'largest-contentful-paint'],
      },
    });

    const auditIds = (config.audits || []).map(audit => audit.implementation.meta.id);
    expect(auditIds).toContain('color-contrast'); // from onlyAudits
    expect(auditIds).toContain('document-title'); // from onlyCategories
    expect(auditIds).not.toContain('first-contentful-paint'); // from onlyCategories
    expect(auditIds).not.toContain('robots-txt'); // from skipAudits
  });

  it('should support plugins', async () => {
    const {config} = await initializeConfig(undefined, {
      gatherMode: 'navigation',
      configPath: `${LH_ROOT}/core/test/fixtures/config-plugins/`,
      settingsOverrides: {plugins: ['lighthouse-plugin-simple']},
    });

    expect(config).toMatchObject({
      categories: {
        'lighthouse-plugin-simple': {title: 'Simple'},
      },
      groups: {
        'lighthouse-plugin-simple-new-group': {title: 'New Group'},
      },
    });
  });

  describe('resolveArtifactDependencies', () => {
    /** @type {LH.Gatherer.FRGathererInstance} */
    let dependencyGatherer;
    /** @type {LH.Gatherer.FRGathererInstance<'ImageElements'>} */
    let dependentGatherer;
    /** @type {LH.Config.Json} */
    let configJson;

    beforeEach(() => {
      const dependencySymbol = Symbol('dependency');
      dependencyGatherer = new BaseGatherer();
      dependencyGatherer.getArtifact = jestMock.fn();
      dependencyGatherer.meta = {symbol: dependencySymbol, supportedModes: ['snapshot']};
      // @ts-expect-error - we satisfy the interface on the next line
      dependentGatherer = new BaseGatherer();
      dependentGatherer.getArtifact = jestMock.fn();
      dependentGatherer.meta = {
        supportedModes: ['snapshot'],
        dependencies: {ImageElements: dependencySymbol},
      };

      configJson = {
        artifacts: [
          {id: 'Dependency', gatherer: {instance: dependencyGatherer}},
          {id: 'Dependent', gatherer: {instance: dependentGatherer}},
        ],
        navigations: [
          {id: 'default', artifacts: ['Dependency']},
          {id: 'second', artifacts: ['Dependent']},
        ],
      };
    });

    it('should resolve artifact dependencies', async () => {
      const {config} = await initializeConfig(configJson, {gatherMode: 'snapshot'});
      expect(config).toMatchObject({
        artifacts: [
          {id: 'Dependency', gatherer: {instance: dependencyGatherer}},
          {
            id: 'Dependent',
            gatherer: {
              instance: dependentGatherer,
            },
            dependencies: {
              ImageElements: {id: 'Dependency'},
            },
          },
        ],
      });
    });

    it('should resolve artifact dependencies in navigations', async () => {
      const {config} = await initializeConfig(configJson, {gatherMode: 'snapshot'});
      expect(config).toMatchObject({
        navigations: [
          {artifacts: [{id: 'Dependency'}]},
          {
            artifacts: [
              {
                id: 'Dependent',
                dependencies: {
                  ImageElements: {id: 'Dependency'},
                },
              },
            ],
          },
        ],
      });
    });

    it('should throw when dependencies are out of order in artifacts', () => {
      if (!configJson.artifacts) throw new Error('Failed to run beforeEach');
      configJson.artifacts = [configJson.artifacts[1], configJson.artifacts[0]];
      expect(initializeConfig(configJson, {gatherMode: 'snapshot'}))
        .rejects.toThrow(/Failed to find dependency/);
    });

    it('should throw when dependencies are out of order within a navigation', () => {
      if (!configJson.navigations) throw new Error('Failed to run beforeEach');
      const invalidNavigation = {id: 'default', artifacts: ['Dependent', 'Dependency']};
      configJson.navigations = [invalidNavigation];
      expect(initializeConfig(configJson, {gatherMode: 'snapshot'}))
        .rejects.toThrow(/Failed to find dependency/);
    });

    it('should throw when dependencies are out of order between navigations', () => {
      if (!configJson.navigations) throw new Error('Failed to run beforeEach');
      const invalidNavigation = {id: 'default', artifacts: ['Dependent']};
      configJson.navigations = [invalidNavigation];
      expect(initializeConfig(configJson, {gatherMode: 'snapshot'}))
        .rejects.toThrow(/Failed to find dependency/);
    });

    it('should throw when timespan needs snapshot', () => {
      dependentGatherer.meta.supportedModes = ['timespan'];
      dependencyGatherer.meta.supportedModes = ['snapshot'];
      expect(initializeConfig(configJson, {gatherMode: 'navigation'}))
        .rejects.toThrow(/Dependency.*is invalid/);
    });

    it('should throw when timespan needs navigation', () => {
      dependentGatherer.meta.supportedModes = ['timespan'];
      dependencyGatherer.meta.supportedModes = ['navigation'];
      expect(initializeConfig(configJson, {gatherMode: 'navigation'}))
        .rejects.toThrow(/Dependency.*is invalid/);
    });
  });

  describe('.resolveNavigationsToDefns', () => {
    it('should resolve navigation definitions', async () => {
      gatherMode = 'navigation';
      const configJson = {
        artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}],
        navigations: [{id: 'default', artifacts: ['Accessibility']}],
      };
      const {config} = await initializeConfig(configJson, {gatherMode});

      expect(config).toMatchObject({
        artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}],
        navigations: [
          {id: 'default', artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}]},
        ],
      });
    });

    it('should throw when navigations are defined without artifacts', () => {
      const configJson = {
        navigations: [{id: 'default', artifacts: ['Accessibility']}],
      };

      expect(initializeConfig(configJson, {gatherMode})).rejects.toThrow(/Cannot use navigations/);
    });

    it('should throw when navigations use unrecognized artifacts', () => {
      const configJson = {
        artifacts: [],
        navigations: [{id: 'default', artifacts: ['Accessibility']}],
      };

      expect(initializeConfig(configJson, {gatherMode})).rejects.toThrow(/Unrecognized artifact/);
    });

    it('should set default properties on navigations', async () => {
      gatherMode = 'navigation';
      const configJson = {
        artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}],
        navigations: [{id: 'default', artifacts: ['Accessibility']}],
      };
      const {config} = await initializeConfig(configJson, {gatherMode});

      expect(config).toMatchObject({
        navigations: [
          {
            id: 'default',
            blankPage: 'about:blank',
            artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}],
            loadFailureMode: 'fatal',
            disableThrottling: false,
            networkQuietThresholdMs: 0,
            cpuQuietThresholdMs: 0,
          },
        ],
      });
    });

    it('should ensure minimum quiet thresholds when throttlingMethod is devtools', async () => {
      gatherMode = 'navigation';
      const configJson = {
        artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}],
        navigations: [
          {id: 'default', artifacts: ['Accessibility']},
          {id: 'noThrottling', artifacts: ['Accessibility'], disableThrottling: true},
          {id: 'alreadyHigh', artifacts: ['Accessibility'], cpuQuietThresholdMs: 10_000},
        ],
      };

      const {config} = await initializeConfig(configJson, {
        gatherMode,
        settingsOverrides: {throttlingMethod: 'devtools'},
      });

      expect(config).toMatchObject({
        navigations: [
          {
            pauseAfterFcpMs: nonSimulatedPassConfigOverrides.pauseAfterFcpMs,
            pauseAfterLoadMs: nonSimulatedPassConfigOverrides.pauseAfterLoadMs,
            networkQuietThresholdMs: nonSimulatedPassConfigOverrides.networkQuietThresholdMs,
            cpuQuietThresholdMs: nonSimulatedPassConfigOverrides.cpuQuietThresholdMs,
          },
          {networkQuietThresholdMs: 0, cpuQuietThresholdMs: 0},
          {cpuQuietThresholdMs: 10_000},
        ],
      });
    });
  });

  describe('.resolveExtensions', () => {
    /** @type {LH.Config.Json} */
    let extensionConfig;

    beforeEach(() => {
      const gatherer = new BaseGatherer();
      gatherer.getArtifact = jestMock.fn();
      gatherer.meta = {supportedModes: ['navigation']};

      class ExtraAudit extends BaseAudit {
        static get meta() {
          return {
            id: 'extra-audit',
            title: 'Extra',
            failureTitle: 'Extra',
            description: 'Extra',
            requiredArtifacts: /** @type {*} */ (['ExtraArtifact']),
          };
        }

        /** @return {LH.Audit.Product} */
        static audit() {
          throw new Error('Unimplemented');
        }
      }

      extensionConfig = {
        extends: 'lighthouse:default',
        artifacts: [
          {id: 'ExtraArtifact', gatherer: {instance: gatherer}},
        ],
        navigations: [
          {id: 'default', artifacts: ['ExtraArtifact']},
        ],
        audits: [
          {implementation: ExtraAudit},
        ],
        categories: {
          performance: {
            title: 'Performance',
            auditRefs: [
              {id: 'extra-audit', weight: 0},
            ],
          },
        },
      };
    });

    it('should do nothing when not extending', async () => {
      const {config} = await initializeConfig({
        artifacts: [
          {id: 'Accessibility', gatherer: 'accessibility'},
        ],
        navigations: [
          {id: 'default', artifacts: ['Accessibility']},
        ],
      }, {gatherMode: 'navigation'});

      expect(config).toMatchObject({
        audits: null,
        groups: null,
        artifacts: [
          {id: 'Accessibility'},
        ],
        navigations: [
          {id: 'default', artifacts: [{id: 'Accessibility'}]},
        ],
      });
    });

    it('should extend the default config with filters', async () => {
      const gatherMode = 'navigation';
      const {config} = await initializeConfig({
        extends: 'lighthouse:default',
        settings: {onlyCategories: ['accessibility']},
      }, {gatherMode});
      if (!config.artifacts) throw new Error(`No artifacts created`);
      if (!config.audits) throw new Error(`No audits created`);

      const hasAccessibilityArtifact = config.artifacts.some(a => a.id === 'Accessibility');
      if (!hasAccessibilityArtifact) expect(config.artifacts).toContain('Accessibility');

      const hasAccessibilityAudit = config.audits.
        some(a => a.implementation.meta.id === 'color-contrast');
      if (!hasAccessibilityAudit) expect(config.audits).toContain('color-contrast');

      expect(config.categories).toHaveProperty('accessibility');
      expect(config.categories).not.toHaveProperty('performance');
    });

    it('should merge in artifacts', async () => {
      const {config} = await initializeConfig(extensionConfig, {gatherMode: 'navigation'});
      if (!config.artifacts) throw new Error(`No artifacts created`);

      const hasExtraArtifact = config.artifacts.some(a => a.id === 'ExtraArtifact');
      if (!hasExtraArtifact) expect(config.artifacts).toContain('ExtraArtifact');
    });

    it('should merge in navigations', async () => {
      const {config} = await initializeConfig(extensionConfig, {gatherMode: 'navigation'});
      if (!config.navigations) throw new Error(`No navigations created`);

      expect(config.navigations).toHaveLength(1);
      const hasNavigation = config.navigations[0].artifacts.
        some(a => a.id === 'ExtraArtifact');
      if (!hasNavigation) expect(config.navigations[0].artifacts).toContain('ExtraArtifact');
    });

    it('should merge in audits', async () => {
      const {config} = await initializeConfig(extensionConfig, {gatherMode: 'navigation'});
      if (!config.audits) throw new Error(`No audits created`);

      const hasExtraAudit = config.audits.
        some(a => a.implementation.meta.id === 'extra-audit');
      if (!hasExtraAudit) expect(config.audits).toContain('extra-audit');
    });

    it('should merge in categories', async () => {
      const {config} = await initializeConfig(extensionConfig, {gatherMode: 'navigation'});
      if (!config.categories) throw new Error(`No categories created`);

      const hasCategory = config.categories.performance.auditRefs.some(a => a.id === 'extra-audit');
      if (!hasCategory) expect(config.categories.performance.auditRefs).toContain('extra-audit');
    });
  });

  it('should validate the config with warnings', async () => {
    /** @type {LH.Config.Json} */
    const extensionConfig = {
      extends: 'lighthouse:default',
      navigations: [{id: 'default', loadFailureMode: 'warn'}],
    };

    const {config, warnings} = await initializeConfig(extensionConfig, {gatherMode: 'navigation'});
    const navigations = config.navigations;
    if (!navigations) throw new Error(`Failed to initialize navigations`);
    expect(warnings).toHaveLength(1);
    expect(navigations[0].loadFailureMode).toEqual('fatal');
  });

  it('should validate the config with fatal errors', async () => {
    /** @type {LH.Config.Json} */
    const extensionConfig = {
      extends: 'lighthouse:default',
      artifacts: [{id: 'artifact', gatherer: {instance: new BaseGatherer()}}],
    };

    // https://github.com/facebook/jest/issues/11438
    // expect(initializeConfig(extensionConfig, {gatherMode: 'navigation'}))
    //   .rejects.toThrow(/did not support any gather modes/);
    try {
      await initializeConfig(extensionConfig, {gatherMode: 'navigation'});
      throw new Error('did not throw');
    } catch (err) {
      expect(err.message).toMatch(/did not support any gather modes/);
    }
  });
});

describe('getConfigDisplayString', () => {
  it('doesn\'t include empty audit options in output', async () => {
    const aOpt = 'auditOption';
    const configJson = {
      extends: 'lighthouse:default',
      passes: [{
        passName: 'defaultPass',
        gatherers: [
          {path: 'script-elements'},
        ],
      }],
      audits: [
        // `options` merged into default `metrics` audit.
        {path: 'metrics', options: {aOpt}},
      ],
    };

    const {config} = await initializeConfig(configJson, {gatherMode: 'navigation'});
    const printed = getConfigDisplayString(config);
    const printedConfig = JSON.parse(printed);

    // Check that options weren't completely eliminated.
    const metricsAudit = printedConfig.audits.find(/** @param {any} a */ a => a.path === 'metrics');
    expect(metricsAudit.options.aOpt).toEqual(aOpt);

    for (const audit of printedConfig.audits) {
      if (audit.options) {
        expect(audit.options).not.toEqual({});
      }
    }
  });

  it('returns localized category titles', async () => {
    const {config} = await initializeConfig(undefined, {gatherMode: 'navigation'});
    const printed = getConfigDisplayString(config);
    const printedConfig = JSON.parse(printed);
    let localizableCount = 0;

    for (const [printedCategoryId, printedCategory] of Object.entries(printedConfig.categories)) {
      if (!defaultConfig.categories) throw new Error('Default config will have categories');
      if (!defaultConfig.settings?.locale) throw new Error('Default config will have a locale');
      const origTitle = defaultConfig.categories[printedCategoryId].title;
      if (format.isIcuMessage(origTitle)) localizableCount++;
      const i18nOrigTitle = format.getFormatted(origTitle, defaultConfig.settings.locale);

      expect(printedCategory.title).toStrictEqual(i18nOrigTitle);
    }

    // Should have localized at least one string.
    expect(localizableCount).toBeGreaterThan(0);
  });

  it('returns a valid ConfigJson that can make an identical Config', async () => {
    // depends on defaultConfig having a `path` for all gatherers and audits.
    const {config: firstConfig} = await initializeConfig(undefined, {gatherMode: 'navigation'});
    const firstPrint = getConfigDisplayString(firstConfig);

    const {config: secondConfig} =
      await initializeConfig(JSON.parse(firstPrint), {gatherMode: 'navigation'});
    const secondPrint = getConfigDisplayString(secondConfig);

    expect(firstPrint).toEqual(secondPrint);
  });
});
