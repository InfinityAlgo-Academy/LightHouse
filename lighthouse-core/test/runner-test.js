/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

require('./test-utils.js').makeMocksForGatherRunner();

jest.mock('../gather/driver/service-workers.js', () => ({
  getServiceWorkerVersions: jest.fn().mockResolvedValue({versions: []}),
  getServiceWorkerRegistrations: jest.fn().mockResolvedValue({registrations: []}),
}));

const Runner = require('../runner.js');
const GatherRunner = require('../gather/gather-runner.js');
const driverMock = require('./gather/fake-driver.js');
const Config = require('../config/config.js');
const Audit = require('../audits/audit.js');
const Gatherer = require('../gather/gatherers/gatherer.js');
const assetSaver = require('../lib/asset-saver.js');
const fs = require('fs');
const assert = require('assert').strict;
const path = require('path');
const LHError = require('../lib/lh-error.js');
const i18n = require('../lib/i18n/i18n.js');

/* eslint-env jest */

describe('Runner', () => {
  const createGatherFn = url => {
    return opts => {
      return Runner._gatherArtifactsFromBrowser(
        url,
        {...opts, computedCache: new Map()},
        null
      );
    };
  };

  const runGatherAndAudit = async (gatherFn, opts) => {
    const artifacts = await Runner.gather(gatherFn, opts);
    return Runner.audit(artifacts, opts);
  };

  /** @type {jest.Mock} */
  let saveArtifactsSpy;
  /** @type {jest.Mock} */
  let saveLhrSpy;
  /** @type {jest.Mock} */
  let loadArtifactsSpy;
  /** @type {jest.Mock} */
  let gatherRunnerRunSpy;
  /** @type {jest.Mock} */
  let runAuditSpy;

  beforeEach(() => {
    saveArtifactsSpy = jest.spyOn(assetSaver, 'saveArtifacts');
    saveLhrSpy = jest.spyOn(assetSaver, 'saveLhr').mockImplementation(() => {});
    loadArtifactsSpy = jest.spyOn(assetSaver, 'loadArtifacts');
    gatherRunnerRunSpy = jest.spyOn(GatherRunner, 'run');
    runAuditSpy = jest.spyOn(Runner, '_runAudit');
  });

  afterEach(() => {
    saveArtifactsSpy.mockRestore();
    saveLhrSpy.mockRestore();
    loadArtifactsSpy.mockRestore();
    gatherRunnerRunSpy.mockRestore();
    runAuditSpy.mockRestore();
  });

  const basicAuditMeta = {
    id: 'test-audit',
    title: 'A test audit',
    failureTitle: 'A test audit',
    description: 'An audit for testing',
    requiredArtifacts: [],
  };

  describe('Gather Mode & Audit Mode', () => {
    const url = 'https://example.com';
    const generateConfig = settings => new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: ['content-width'],
      settings,
    });
    const artifactsPath = '.tmp/test_artifacts';
    const resolvedPath = path.resolve(process.cwd(), artifactsPath);

    afterAll(() => {
      fs.rmSync(resolvedPath, {recursive: true, force: true});
    });

    it('-G gathers, quits, and doesn\'t run audits', () => {
      const opts = {config: generateConfig({gatherMode: artifactsPath}), driverMock};
      return runGatherAndAudit(createGatherFn(url), opts).then(_ => {
        expect(loadArtifactsSpy).not.toHaveBeenCalled();
        expect(saveArtifactsSpy).toHaveBeenCalled();

        const saveArtifactArg = saveArtifactsSpy.mock.calls[0][0];
        assert.ok(saveArtifactArg.ViewportDimensions);
        assert.ok(saveArtifactArg.devtoolsLogs.defaultPass.length > 100);

        expect(gatherRunnerRunSpy).toHaveBeenCalled();
        expect(runAuditSpy).not.toHaveBeenCalled();
        expect(saveLhrSpy).not.toHaveBeenCalled();

        assert.ok(fs.existsSync(resolvedPath));
        assert.ok(fs.existsSync(`${resolvedPath}/artifacts.json`));
      });
    });

    // uses the files on disk from the -G test. ;)
    it('-A audits from saved artifacts and doesn\'t gather', () => {
      const opts = {config: generateConfig({auditMode: artifactsPath}), driverMock};
      return runGatherAndAudit(createGatherFn(), opts).then(_ => {
        expect(loadArtifactsSpy).toHaveBeenCalled();
        expect(gatherRunnerRunSpy).not.toHaveBeenCalled();
        expect(saveArtifactsSpy).not.toHaveBeenCalled();
        expect(saveLhrSpy).not.toHaveBeenCalled();
        expect(runAuditSpy).toHaveBeenCalled();
      });
    });

    it('-A throws if the settings change', async () => {
      // Change throttlingMethod from its default of 'simulate'
      const settings = {auditMode: artifactsPath, throttlingMethod: 'provided'};
      const opts = {config: generateConfig(settings), driverMock};
      try {
        await runGatherAndAudit(createGatherFn(), opts);
        assert.fail('should have thrown');
      } catch (err) {
        assert.ok(/Cannot change settings/.test(err.message), 'should have prevented run');
      }
    });

    it('does not include a top-level runtimeError when gatherers were successful', async () => {
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/perflog/',

        },
        audits: [
          'content-width',
        ],
      });

      const {lhr} = await runGatherAndAudit(undefined, {config});
      assert.strictEqual(lhr.runtimeError, undefined);
    });

    it('-GA is a normal run but it saves artifacts and LHR to disk', () => {
      const settings = {auditMode: artifactsPath, gatherMode: artifactsPath};
      const opts = {config: generateConfig(settings), driverMock};
      return runGatherAndAudit(createGatherFn(url), opts).then(_ => {
        expect(loadArtifactsSpy).not.toHaveBeenCalled();
        expect(gatherRunnerRunSpy).toHaveBeenCalled();
        expect(saveArtifactsSpy).toHaveBeenCalled();
        expect(saveLhrSpy).toHaveBeenCalled();
        expect(runAuditSpy).toHaveBeenCalled();
      });
    });

    it('non -G/-A run doesn\'t save artifacts to disk', () => {
      const opts = {config: generateConfig(), driverMock};
      return runGatherAndAudit(createGatherFn(url), opts).then(_ => {
        expect(loadArtifactsSpy).not.toHaveBeenCalled();
        expect(gatherRunnerRunSpy).toHaveBeenCalled();
        expect(saveArtifactsSpy).not.toHaveBeenCalled();
        expect(saveLhrSpy).not.toHaveBeenCalled();
        expect(runAuditSpy).toHaveBeenCalled();
      });
    });

    it('serializes IcuMessages in gatherMode and is able to use them in auditMode', async () => {
      // Can use this to access shared UIStrings in i18n.js.
      // For future changes: exact messages aren't important, just choose ones with replacements.
      const str_ = i18n.createMessageInstanceIdFn(__filename, {});

      // A gatherer that produces an IcuMessage runWarning and LighthouseError artifact.
      class WarningAndErrorGatherer extends Gatherer {
        afterPass(passContext) {
          const warning = str_(i18n.UIStrings.displayValueByteSavings, {wastedBytes: 2222});
          passContext.LighthouseRunWarnings.push(warning);
          throw new LHError(LHError.errors.UNSUPPORTED_OLD_CHROME, {featureName: 'VRML'});
        }
      }
      const gatherConfig = new Config({
        settings: {gatherMode: artifactsPath},
        passes: [{gatherers: [WarningAndErrorGatherer]}],
      });
      await runGatherAndAudit(createGatherFn(url), {config: gatherConfig, driverMock});

      // Artifacts are still localizable.
      const artifacts = assetSaver.loadArtifacts(resolvedPath);
      expect(artifacts.LighthouseRunWarnings[0]).not.toBe('string');
      expect(artifacts.LighthouseRunWarnings[0]).toBeDisplayString('Potential savings of 2 KiB');
      expect(artifacts.WarningAndErrorGatherer).toMatchObject({
        name: 'LHError',
        code: 'UNSUPPORTED_OLD_CHROME',
        // eslint-disable-next-line max-len
        friendlyMessage: expect.toBeDisplayString(`This version of Chrome is too old to support 'VRML'. Use a newer version to see full results.`),
      });

      // Now run auditMode using errored artifacts to ensure the errors come through.
      class DummyAudit extends Audit {
        static get meta() {
          return {
            id: 'dummy-audit',
            title: 'Dummy',
            failureTitle: 'Dummy',
            description: 'Will fail because required artifact is an error',
            requiredArtifacts: ['WarningAndErrorGatherer'],
          };
        }
        static audit() {}
      }
      const auditConfig = new Config({
        settings: {auditMode: artifactsPath},
        audits: [{implementation: DummyAudit}],
      });
      const {lhr} = await runGatherAndAudit(createGatherFn(url), {config: auditConfig});

      // Messages are now localized and formatted.
      expect(lhr.runWarnings[0]).toBe('Potential savings of 2 KiB');
      expect(lhr.audits['dummy-audit']).toMatchObject({
        scoreDisplayMode: 'error',
        // eslint-disable-next-line max-len
        errorMessage: 'Required WarningAndErrorGatherer gatherer encountered an error: UNSUPPORTED_OLD_CHROME',
      });
    });
  });

  it('expands gatherers', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: [
        'content-width',
      ],
    });

    return runGatherAndAudit(createGatherFn(url), {config, driverMock}).then(_ => {
      expect(gatherRunnerRunSpy).toHaveBeenCalled();
      assert.ok(typeof config.passes[0].gatherers[0] === 'object');
    });
  });


  it('rejects when given neither passes nor artifacts', () => {
    const url = 'https://example.com';
    const config = new Config({
      audits: [
        'content-width',
      ],
    });

    return runGatherAndAudit(createGatherFn(url), {config, driverMock})
      .then(_ => {
        assert.ok(false);
      }, err => {
        assert.ok(/No browser artifacts are either/.test(err.message));
      });
  });

  it('accepts audit options', () => {
    const url = 'https://example.com/';

    const calls = [];
    class EavesdropAudit extends Audit {
      static get meta() {
        return {
          id: 'eavesdrop-audit',
          title: 'It eavesdrops',
          failureTitle: 'It does not',
          description: 'Helpful when eavesdropping',
          requiredArtifacts: [],
        };
      }
      static audit(artifacts, context) {
        calls.push(context.options);
        return {score: 1};
      }
    }

    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
      },
      audits: [
        {implementation: EavesdropAudit, options: {x: 1}},
        {implementation: EavesdropAudit, options: {x: 2}},
      ],
    });

    return runGatherAndAudit({}, {url, config}).then(results => {
      assert.equal(results.lhr.requestedUrl, url);
      assert.equal(results.lhr.audits['eavesdrop-audit'].score, 1);
      // assert that the options we received matched expectations
      assert.deepEqual(calls, [{x: 1}, {x: 2}]);
    });
  });

  it('accepts trace artifacts as paths and outputs appropriate data', () => {
    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'user-timings',
      ],
    });

    return runGatherAndAudit({}, {config, computedCache: new Map()}).then(results => {
      const audits = results.lhr.audits;
      assert.equal(audits['user-timings'].displayValue, '2 user timings');
      assert.deepStrictEqual(audits['user-timings'].details.items.map(i => i.startTime),
        [0.002, 1000.954]);
    });
  });

  it('rejects when given an invalid trace artifact', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        recordTrace: true,
        gatherers: [],
      }],
    });

    // Arrange for driver to return bad trace.
    const badTraceDriver = Object.assign({}, driverMock, {
      endTrace() {
        return Promise.resolve({
          traceEvents: 'not an array',
        });
      },
    });

    return runGatherAndAudit({}, {url, config, driverMock: badTraceDriver})
      .then(_ => {
        assert.ok(false);
      }, _ => {
        assert.ok(true);
      });
  });

  it('finds correct timings for multiple gather/audit pairs run separately', async () => {
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: [
        'content-width',
      ],
    });
    const options1 = {config, driverMock, computedCache: new Map()};
    const options2 = {config, driverMock, computedCache: new Map()};

    const artifacts1 = await Runner.gather(createGatherFn('https://example.com'), options1);
    const artifacts2 = await Runner.gather(createGatherFn('https://google.com'), options2);

    const result1 = await Runner.audit(artifacts1, options1);
    const result2 = await Runner.audit(artifacts2, options2);

    // Ensure the timings of the first run do not pollute the timings of the second run.
    const gatherTiming1 = result1.lhr.timing.entries.find(t => t.name === 'lh:runner:gather');
    const gatherTiming2 = result2.lhr.timing.entries.find(t => t.name === 'lh:runner:gather');
    expect(gatherTiming1.startTime).not.toEqual(gatherTiming2.startTime);

    const auditTiming1 = result1.lhr.timing.entries.find(t => t.name === 'lh:runner:audit');
    const auditTiming2 = result2.lhr.timing.entries.find(t => t.name === 'lh:runner:audit');
    expect(auditTiming1.startTime).not.toEqual(auditTiming2.startTime);
  });

  describe('Bad required artifact handling', () => {
    it('outputs an error audit result when trace required but not provided', () => {
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          // requires traces[Audit.DEFAULT_PASS]
          'user-timings',
        ],
      });

      return runGatherAndAudit({}, {config}).then(results => {
        const auditResult = results.lhr.audits['user-timings'];
        assert.strictEqual(auditResult.score, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes('traces'));
      });
    });

    it('outputs an error audit result when devtoolsLog required but not provided', async () => {
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          // requires devtoolsLogs[Audit.DEFAULT_PASS]
          'is-on-https',
        ],
      });

      const results = await runGatherAndAudit({}, {config});
      const auditResult = results.lhr.audits['is-on-https'];
      assert.strictEqual(auditResult.score, null);
      assert.strictEqual(auditResult.scoreDisplayMode, 'error');
      assert.strictEqual(auditResult.errorMessage, 'Required devtoolsLogs gatherer did not run.');
    });

    it('outputs an error audit result when missing a required artifact', () => {
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          // requires the ViewportDimensions artifact
          'content-width',
        ],
      });

      return runGatherAndAudit({}, {config}).then(results => {
        const auditResult = results.lhr.audits['content-width'];
        assert.strictEqual(auditResult.score, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes('ViewportDimensions'));
      });
    });

    it('outputs an error audit result when required artifact was an Error', async () => {
      // Start with empty-artifacts.
      const baseArtifacts = assetSaver.loadArtifacts(__dirname +
          '/fixtures/artifacts/empty-artifacts/');

      // Add error and save artifacts using assetSaver to serialize Error object.
      const errorMessage = 'blurst of times';
      const artifacts = {
        ...baseArtifacts,
        ViewportDimensions: new Error(errorMessage),
      };
      const artifactsPath = '.tmp/test_artifacts';
      const resolvedPath = path.resolve(process.cwd(), artifactsPath);
      await assetSaver.saveArtifacts(artifacts, resolvedPath);

      // Load artifacts via auditMode.
      const config = new Config({
        settings: {
          auditMode: resolvedPath,
        },
        audits: [
          // requires ViewportDimensions artifact
          'content-width',
        ],
      });

      const results = await runGatherAndAudit({}, {config});
      const auditResult = results.lhr.audits['content-width'];
      assert.strictEqual(auditResult.score, null);
      assert.strictEqual(auditResult.scoreDisplayMode, 'error');
      assert.ok(auditResult.errorMessage.includes(errorMessage));

      fs.rmSync(resolvedPath, {recursive: true, force: true});
    });

    it('only passes the requested artifacts to the audit (no optional artifacts)', async () => {
      class SimpleAudit extends Audit {
        static get meta() {
          return {
            id: 'simple',
            title: 'Requires some artifacts',
            failureTitle: 'Artifacts',
            description: 'Test for always throwing',
            requiredArtifacts: ['ArtifactA', 'ArtifactC'],
          };
        }
      }

      const auditMockFn = SimpleAudit.audit = jest.fn().mockReturnValue({score: 1});
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/alphabet-artifacts/',
        },
        audits: [
          SimpleAudit,
        ],
      });

      const results = await runGatherAndAudit({}, {config});
      expect(results.lhr).toMatchObject({audits: {simple: {score: 1}}});
      expect(auditMockFn).toHaveBeenCalled();
      expect(auditMockFn.mock.calls[0][0]).toEqual({
        ArtifactA: 'apple',
        ArtifactC: 'cherry',
      });
    });

    it('only passes the requested artifacts to the audit (w/ optional artifacts)', async () => {
      class SimpleAudit extends Audit {
        static get meta() {
          return {
            id: 'simple',
            title: 'Requires some artifacts',
            failureTitle: 'Artifacts',
            description: 'Test for always throwing',
            requiredArtifacts: ['ArtifactA', 'ArtifactC'],
            __internalOptionalArtifacts: ['ArtifactD'],
          };
        }
      }

      const auditMockFn = SimpleAudit.audit = jest.fn().mockReturnValue({score: 1});
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/alphabet-artifacts/',
        },
        audits: [
          SimpleAudit,
        ],
      });

      const results = await runGatherAndAudit({}, {config});
      expect(results.lhr).toMatchObject({audits: {simple: {score: 1}}});
      expect(auditMockFn).toHaveBeenCalled();
      expect(auditMockFn.mock.calls[0][0]).toEqual({
        ArtifactA: 'apple',
        ArtifactC: 'cherry',
        ArtifactD: 'date',
      });
    });
  });

  describe('Bad audit behavior handling', () => {
    const testAuditMeta = {
      id: 'throwy-audit',
      title: 'Always throws',
      failureTitle: 'Always throws is failing, natch',
      description: 'Test for always throwing',
      requiredArtifacts: [],
    };

    it('produces an error audit result when an audit throws an Error', () => {
      const errorMessage = 'Audit yourself';
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          class ThrowyAudit extends Audit {
            static get meta() {
              return testAuditMeta;
            }
            static audit() {
              throw new Error(errorMessage);
            }
          },
        ],
      });

      return runGatherAndAudit({}, {config}).then(results => {
        const auditResult = results.lhr.audits['throwy-audit'];
        assert.strictEqual(auditResult.score, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes(errorMessage));
      });
    });
  });

  it('accepts devtoolsLog in artifacts', () => {
    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'critical-request-chains',
      ],
    });

    return runGatherAndAudit({}, {config, computedCache: new Map()}).then(results => {
      const audits = results.lhr.audits;
      assert.equal(audits['critical-request-chains'].displayValue, '5 chains found');
      assert.equal(audits['critical-request-chains'].details.longestChain.transferSize, 2468);
    });
  });

  it('rejects when not given audits to run (and not -G)', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
    });

    return runGatherAndAudit(createGatherFn(url), {config, driverMock})
      .then(_ => {
        assert.ok(false);
      }, err => {
        assert.ok(/No audits to evaluate/.test(err.message));
      });
  });

  it('returns data even if no config categories are provided', () => {
    const url = 'https://example.com/';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: [
        'content-width',
      ],
    });

    return runGatherAndAudit(createGatherFn(url), {config, driverMock}).then(results => {
      assert.ok(results.lhr.lighthouseVersion);
      assert.ok(results.lhr.fetchTime);
      assert.equal(results.lhr.requestedUrl, url);
      assert.equal(results.lhr.audits['content-width'].id, 'content-width');
      expect(gatherRunnerRunSpy).toHaveBeenCalled();
    });
  });


  it('returns categories', () => {
    const url = 'https://example.com/';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: [
        'content-width',
      ],
      categories: {
        category: {
          title: 'Category',
          description: '',
          auditRefs: [
            {id: 'content-width', weight: 1},
          ],
        },
      },
    });

    return runGatherAndAudit(createGatherFn(url), {config, driverMock}).then(results => {
      expect(gatherRunnerRunSpy).toHaveBeenCalled();
      assert.ok(results.lhr.lighthouseVersion);
      assert.ok(results.lhr.fetchTime);
      assert.equal(results.lhr.requestedUrl, url);
      assert.equal(results.lhr.audits['content-width'].id, 'content-width');
      assert.equal(results.lhr.audits['content-width'].score, 1);
      assert.equal(results.lhr.categories.category.score, 1);
      assert.equal(results.lhr.categories.category.auditRefs[0].id, 'content-width');
    });
  });

  it('only supports core audits with names matching their filename', () => {
    const coreAudits = Runner.getAuditList();
    coreAudits.forEach(auditFilename => {
      const auditPath = '../audits/' + auditFilename;
      const auditExpectedName = path.basename(auditFilename, '.js');
      const AuditClass = require(auditPath);
      assert.strictEqual(AuditClass.meta.id, auditExpectedName);
    });
  });

  it('results include artifacts when given artifacts and audits', () => {
    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'content-width',
      ],
    });

    return runGatherAndAudit({}, {config}).then(results => {
      assert.strictEqual(results.artifacts.ViewportDimensions.innerWidth, 412);
      assert.strictEqual(results.artifacts.ViewportDimensions.innerHeight, 660);
    });
  });

  it('results include artifacts when given passes and audits', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        passName: 'firstPass',
        gatherers: ['meta-elements', 'viewport-dimensions'],
      }],

      audits: [
        'content-width',
      ],
    });

    return runGatherAndAudit(createGatherFn(url), {config, driverMock}).then(results => {
      // User-specified artifact.
      assert.ok(results.artifacts.ViewportDimensions);

      // Default artifact.
      const artifacts = results.artifacts;
      const devtoolsLogs = artifacts.devtoolsLogs['firstPass'];
      assert.equal(Array.isArray(devtoolsLogs), true, 'devtoolsLogs is not an array');
    });
  });

  it('includes any LighthouseRunWarnings from artifacts in output', () => {
    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [],
    });

    return runGatherAndAudit(createGatherFn(), {config, driverMock}).then(results => {
      assert.deepStrictEqual(results.lhr.runWarnings, [
        'I\'m a warning!',
        'Also a warning',
      ]);
    });
  });

  it('includes any LighthouseRunWarnings from audits in LHR', () => {
    const warningString = 'Really important audit warning!';

    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
      },
      audits: [
        class WarningAudit extends Audit {
          static get meta() {
            return basicAuditMeta;
          }
          static audit() {
            return {
              numericValue: 5,
              score: 1,
              runWarnings: [warningString],
            };
          }
        },
      ],
    });

    return runGatherAndAudit(createGatherFn(), {config, driverMock}).then(results => {
      assert.deepStrictEqual(results.lhr.runWarnings, [warningString]);
    });
  });

  describe('lhr.runtimeError', () => {
    const NO_FCP = LHError.errors.NO_FCP;
    class RuntimeErrorGatherer extends Gatherer {
      afterPass() {
        throw new LHError(NO_FCP);
      }
    }
    class RuntimeError2Gatherer extends Gatherer {
      afterPass() {
        throw new LHError(LHError.errors.NO_SCREENSHOTS);
      }
    }
    class WarningAudit extends Audit {
      static get meta() {
        return {
          id: 'test-audit',
          title: 'A test audit',
          failureTitle: 'A test audit',
          description: 'An audit for testing',
          requiredArtifacts: ['RuntimeErrorGatherer'],
        };
      }
      static audit() {
        throw new Error('Should not get here');
      }
    }

    const configJson = {
      passes: [
        {gatherers: [RuntimeErrorGatherer]},
        {gatherers: [RuntimeError2Gatherer], passName: 'second'},
      ],
      audits: [WarningAudit],
    };

    it('includes a top-level runtimeError when a gatherer throws one', async () => {
      const config = new Config(configJson);
      const {lhr} = await runGatherAndAudit(createGatherFn('https://example.com/'), {config, driverMock});

      // Audit error included the runtimeError
      expect(lhr.audits['test-audit'].scoreDisplayMode).toEqual('error');
      expect(lhr.audits['test-audit'].errorMessage).toEqual(expect.stringContaining(NO_FCP.code));

      // And it bubbled up to the runtimeError.
      expect(lhr.runtimeError.code).toEqual(NO_FCP.code);
      expect(lhr.runtimeError.message).toMatch(/did not paint any content.*\(NO_FCP\)/);
    });

    it('includes a pageLoadError runtimeError over any gatherer runtimeErrors', async () => {
      const url = 'https://www.reddit.com/r/nba';
      let firstLoad = true;
      const errorDriverMock = Object.assign({}, driverMock, {
        online: true,
        // Loads the page successfully in the first pass, fails with PAGE_HUNG in the second.
      });

      const gotoURL = jest.requireMock('../gather/driver/navigation.js').gotoURL;
      gotoURL.mockImplementation((_, url) => {
        if (url.includes('blank')) return {mainDocumentUrl: '', warnings: []};
        if (firstLoad) {
          firstLoad = false;
          return {mainDocumentUrl: url, warnings: []};
        } else {
          throw new LHError(LHError.errors.PAGE_HUNG);
        }
      });

      const config = new Config(configJson);
      const {lhr} = await runGatherAndAudit(
        createGatherFn(url),
        {config, driverMock: errorDriverMock}
      );

      // Audit error still includes the gatherer runtimeError.
      expect(lhr.audits['test-audit'].scoreDisplayMode).toEqual('error');
      expect(lhr.audits['test-audit'].errorMessage).toEqual(expect.stringContaining(NO_FCP.code));

      // But top-level runtimeError is the pageLoadError.
      expect(lhr.runtimeError.code).toEqual(LHError.errors.PAGE_HUNG.code);
      expect(lhr.runtimeError.message).toMatch(/because the page stopped responding/);
    });
  });

  it('localized errors thrown from driver', async () => {
    const erroringDriver = {...driverMock,
      async connect() {
        const err = new LHError(
          LHError.errors.PROTOCOL_TIMEOUT,
          {protocolMethod: 'Method.Failure'}
        );
        throw err;
      },
    };

    try {
      await runGatherAndAudit(createGatherFn('https://example.com/'), {driverMock: erroringDriver, config: new Config()});
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.code, LHError.errors.PROTOCOL_TIMEOUT.code);
      assert.ok(/^Waiting for DevTools protocol.*Method: Method.Failure/.test(err.friendlyMessage),
        'did not localize error message');
    }
  });

  it('can handle array of outputs', async () => {
    const url = 'https://example.com';
    const config = new Config({
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance'],
        output: ['json', 'html'],
      },
    });

    const results = await runGatherAndAudit(createGatherFn(url), {config, driverMock});
    assert.ok(Array.isArray(results.report) && results.report.length === 2,
      'did not return multiple reports');
    assert.ok(JSON.parse(results.report[0]), 'did not return json output');
    assert.ok(/<!doctype/.test(results.report[1]), 'did not return html output');
  });
});
