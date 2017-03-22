/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const ConfigV2 = require('../../../config/v2/config.js');
const assert = require('assert');

let resets = [];

function deepFreeze(obj) {
  // eslint-disable-next-line guard-for-in
  for (const key in obj) {
    const value = obj[key];
    if (value && typeof value === 'object') {
      obj[key] = deepFreeze(value);
    }
  }

  return Object.freeze(obj);
}

function stub(object, property, retVal) {
  const args = [];
  const original = object[property];
  resets.push({object, property, original});
  object[property] = function(...thisArgs) {
    args.push(thisArgs);
    return typeof retVal === 'function' ?
        retVal.apply(this, thisArgs) :
        retVal;
  };
  return args;
}

function reset() {
  resets.forEach(reset => {
    reset.object[reset.property] = reset.original;
  });

  resets = [];
}

function emptyConfig() {
  return {
    gatherers: {},
    passes: {},
    audits: {},
    report: {},
  };
}

describe('ConfigV2', () => {
  afterEach(reset);

  describe('#extendIfNecessary', () => {
    it('should not extend when extends is not set', () => {
      const configJson = emptyConfig();
      const result = ConfigV2.extendIfNecessary(configJson, '');
      assert.strictEqual(result, configJson);
    });

    it('should extend when extends lighthouse:default', () => {
      const gatherers = {myGatherer: {}, websql: {foo: 'bar'}};
      const configJson = {extends: 'lighthouse:default', gatherers};

      const fakeDefaultConfig = emptyConfig();
      fakeDefaultConfig.gatherers.websql = {path: 'resolved'};
      fakeDefaultConfig.asJson = () => fakeDefaultConfig;
      stub(ConfigV2, '_createInstance', fakeDefaultConfig);
      const result = ConfigV2.extendIfNecessary(configJson, '');

      assert.deepEqual(result.gatherers.myGatherer, {});
      assert.equal(result.gatherers.websql.foo, 'bar');
      assert.equal(result.gatherers.websql.path, 'resolved');
    });

    it('should extend when extends a file', () => {
      const gatherers = {myGatherer: {}};
      const configJson = {extends: '../myfile.json', gatherers};

      const baseConfig = emptyConfig();
      baseConfig.gatherers.original = {path: 'foo'};
      baseConfig.asJson = () => baseConfig;
      stub(ConfigV2, '_tryResolveUntilSuccess', '');
      stub(ConfigV2, '_require', baseConfig);
      stub(ConfigV2, '_createInstance', baseConfig);
      const result = ConfigV2.extendIfNecessary(configJson, '');

      assert.deepEqual(result.gatherers.myGatherer, {});
      assert.deepEqual(result.gatherers.original, {path: 'foo'});
    });

    it('should not modify base config JSON');
    it('should resolve paths at extension stage');
  });

  describe('#resolvePaths', () => {
    it('should not attempt to resolve items with an implementation', () => {
      const implementation = class MyClass {};
      const object = deepFreeze({mykey: {implementation}});
      const result = ConfigV2.resolvePaths(object, '');
      assert.equal(result.mykey.implementation, implementation);
      assert.equal(result.mykey.path, undefined);
    });

    it('should resolve items with an explicit path', () => {
      stub(ConfigV2, '_tryResolveUntilSuccess', 'resolved');
      const object = deepFreeze({mykey: {path: './special'}});
      const result = ConfigV2.resolvePaths(object, '');
      assert.equal(result.mykey.path, 'resolved');
    });

    it('should resolve items without an explicit path', () => {
      stub(ConfigV2, '_tryResolveUntilSuccess', 'resolved');
      const object = deepFreeze({mykey: {}});
      const result = ConfigV2.resolvePaths(object, '');
      assert.equal(result.mykey.path, 'resolved');
    });

    it('should try to resolve items along multiple paths', () => {
      const resolveArgs = stub(ConfigV2, '_tryResolveUntilSuccess', 'resolved');
      const object = deepFreeze({mykey: {path: './special'}, other: {}});
      const result = ConfigV2.resolvePaths(object, '/config/nested', ['/other/path']);
      assert.equal(result.mykey.path, 'resolved');

      const firstCallPaths = resolveArgs[0][0];
      assert.equal(firstCallPaths[0], '/other/path/special');
      assert.equal(firstCallPaths[1], './special');
      assert.equal(firstCallPaths[2], '/config/nested/special');
      assert.ok(/lighthouse.*special/.test(firstCallPaths[3]), 'tests cwd');

      const secondCallPaths = resolveArgs[1][0];
      assert.equal(secondCallPaths[0], '/other/path/other');
      assert.equal(secondCallPaths[1], 'other');
      assert.equal(secondCallPaths[2], '/config/nested/other');
    });
  });

  describe('#objectToArray', () => {
    it('should work with empty object', () => {
      const result = ConfigV2.objectToArray({});
      assert.deepEqual(result, []);
    });

    it('should set ids on items', () => {
      const result = ConfigV2.objectToArray({valA: {}, valB: {}});
      assert.deepEqual(result, [{id: 'valA'}, {id: 'valB'}]);
    });

    it('should preserve existing properties', () => {
      const result = ConfigV2.objectToArray({foo: {path: 'bar'}});
      assert.deepEqual(result, [{id: 'foo', path: 'bar'}]);
    });
  });

  describe('#collectImplementations', () => {
    it('should require the implemention', () => {
      const implementation = class MyClass {};
      const requireArgs = stub(ConfigV2, '_require', () => implementation);
      const result = ConfigV2.collectImplementations({myclass: {path: 'myclass'}});
      assert.equal(requireArgs[0][0], 'myclass');
      assert.deepEqual(result, [{id: 'myclass', path: 'myclass', implementation}]);
    });
    it('should not overwrite existing implementations', () => {
      const implementation = class MyClass {};
      const requireArgs = stub(ConfigV2, '_require', '');
      const result = ConfigV2.collectImplementations({myclass: {implementation}});
      assert.equal(requireArgs.length, 0);
      assert.deepEqual(result, [{id: 'myclass', implementation}]);
    });
  });

  describe('#computePasses', () => {
    it('should replace gatherers with implementation', () => {
      const passesObject = {
        first: {
          recordTrace: true,
          gatherers: [
            'mygatherer'
          ]
        },
        second: {
          recordNetwork: true,
          gatherers: [
            'othergatherer'
          ]
        },
      };

      const implementation = class MyClass {};
      const gatherers = [
        {id: 'mygatherer', implementation},
        {id: 'othergatherer', implementation},
      ];

      const audits = [{implementation: {meta: {requiredArtifacts: ['MyClass']}}}];

      const result = ConfigV2.computePasses(passesObject, gatherers, audits);
      assert.equal(result.length, 2);
      assert.deepEqual(result[0], {
        id: 'first',
        recordTrace: true,
        gatherers: [gatherers[0]]
      });
      assert.deepEqual(result[1], {
        id: 'second',
        recordNetwork: true,
        gatherers: [gatherers[1]]
      });
    });

    it('should throw when missing a used gatherer', () => {
      const passesObject = {first: {gatherers: ['huh']}};
      assert.throws(() => {
        ConfigV2.computePasses(passesObject, [], []);
      }, 'Missing required gatherer: huh');
    });
  });

  describe('#constructor', () => {
    let numberOfDefaultAudits = 0;
    it('should create a default config', () => {
      const config = new ConfigV2();
      assert.equal(config.passes.length, 4);
      assert.ok(config.audits.length > 0, 'has audits');
      numberOfDefaultAudits = config.audits.length;
    });

    it('should create a custom config', () => {
      const configPath = require.resolve('../../fixtures/config-v2/config-v2.json');
      const configJson = require(configPath);
      const config = new ConfigV2(configJson, configPath);
      assert.equal(config.passes.length, 1);
      assert.equal(config.audits.length, 1);
    });

    it('should create an extending config', () => {
      const configJson = {
        extends: 'lighthouse:default',
        audits: {
          'my-audit': {
            path: require.resolve('../../fixtures/config-v2/my-audit')
          }
        }
      };

      const config = new ConfigV2(configJson);
      assert.ok(config.audits.length > numberOfDefaultAudits, 'added the audit');
    });
  });
});
