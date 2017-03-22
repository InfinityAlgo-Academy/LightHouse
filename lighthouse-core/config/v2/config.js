/**
 * @license
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

const path = require('path');
const log = require('../../lib/log');

const defaultConfigPath = './default.json';
const defaultConfigJson = require(defaultConfigPath);

const _flatten = arr => [].concat(...arr);
const _differenceAsArray = (setA, setB) => Array.from(setA).filter(x => !setB.has(x));

class ConfigV2 {
  constructor(configJson, configPath) {
    if (!configJson) {
      configJson = defaultConfigJson;
      configPath = path.resolve(__dirname, defaultConfigPath);
    }

    const configDir = typeof configPath === 'string' ? path.dirname(configPath) : process.cwd();
    if (!path.isAbsolute(configDir)) {
      throw new Error('Must pass an absolute path to config');
    }

    // Perform a shallow clone so we can adjust gatherers and audits
    configJson = Object.assign({}, configJson);

    // Resolve the paths of audits and gatherers
    configJson.gatherers = ConfigV2.resolvePaths(configJson.gatherers, configDir, [
      path.join(__dirname, '../../gather/gatherers'),
    ]);
    configJson.audits = ConfigV2.resolvePaths(configJson.audits, configDir, [
      path.join(__dirname, '../../audits'),
    ]);

    // Extend only after our paths have been resolved
    configJson = ConfigV2.extendIfNecessary(configJson, configDir);

    this._json = configJson;
    this._gatherers = ConfigV2.collectImplementations(configJson.gatherers);
    this._audits = ConfigV2.collectImplementations(configJson.audits);
    this._passes = ConfigV2.computePasses(configJson.passes, this._gatherers, this._audits);
    this._report = configJson.report;
  }

  /**
   * Returns a deep clone of the final extended config JSON.
   * @return {!Object}
   */
  asJson() {
    return JSON.parse(JSON.stringify(this._json));
  }

  /**
   * @return {!Array<{id: string, implementation: !Audit}>}
   */
  get audits() {
    return [...this._audits];
  }

  /**
   * @return {!Array<{id: string, gatherers: !Array<!Gatherer>}>}
   */
  get passes() {
    return [...this._passes];
  }

  get report() {
    return this._report;
  }

  /**
   * Creates a new ConfigV2 object, used to stub for testing.
   * @param {Object=} json
   * @param {string=} path
   */
  static _createInstance(json, path) {
    return new ConfigV2(json, path);
  }

  /**
   * Requires the given file, used to stub for testing.
   * @param {string} path
   * @return {*}
   */
  static _require(path) {
    return require(path);
  }

  /**
   * Returns the first path that resolves via require.resolve or throws.
   * @param {!Array<string>} paths
   * @return {string}
   */
  static _tryResolveUntilSuccess(paths) {
    for (const path of paths) {
      try {
        return require.resolve(path);
      } catch (e) {}
    }

    throw new Error(`Unable to locate ${paths[0]}`);
  }

  /**
   * Recursively merges all of the properties from extension into base.
   * @param {*} base
   * @param {*} extension
   */
  static _mergeObjects(base, extension) {
    if (!base ||
        !extension ||
        typeof extension !== 'object' ||
        typeof base !== 'object' ||
        Array.isArray(base)) {
      return extension;
    }

    for (const key in extension) {
      if (key !== 'extends') {
        base[key] = ConfigV2._mergeObjects(base[key], extension[key]);
      }
    }

    return base;
  }

  /**
   * Computes the final extended JSON or returns the original if no extension was needed.
   * @param {!Object} configJson
   * @param {string} configDir
   * @return {!Object}
   */
  static extendIfNecessary(configJson, configDir) {
    if (!configJson.extends) {
      return configJson;
    }

    let extendedConfigJson;
    let extendedConfigPath = configJson.extends;
    if (extendedConfigPath === 'lighthouse:default') {
      extendedConfigJson = defaultConfigJson;
      extendedConfigPath = path.resolve(__dirname, defaultConfigPath);
    } else {
      extendedConfigPath = ConfigV2._tryResolveUntilSuccess([
        extendedConfigPath,
        path.resolve(configDir, extendedConfigPath),
        path.resolve(process.cwd(), extendedConfigPath),
      ]);
      extendedConfigJson = ConfigV2._require(extendedConfigPath);
    }

    const extendedConfig = ConfigV2._createInstance(extendedConfigJson, extendedConfigPath);
    return ConfigV2._mergeObjects(extendedConfig.asJson(), configJson);
  }

  /**
   * Traverses all the keys in the object and sets the path property of the child object to the
   * resolved path of the mentioned file. Throws if no file could be found for a child.
   * @param {!Object} object
   * @param {string} configDir
   * @param {Array<string>=} searchPaths
   * @return {!Object} A copy of the input object with path set for all children.
   */
  static resolvePaths(object, configDir, searchPaths = []) {
    object = Object.assign({}, object);
    Object.keys(object).forEach(key => {
      // We don't need to resolve paths whose implementation we already have
      if (object[key].implementation) {
        return;
      }

      const rawPath = object[key].path || key;
      const possiblePaths = searchPaths.map(searchPath => {
        return path.resolve(searchPath, rawPath);
      }).concat([
        rawPath, // for npm plugins and absolute path usage
        path.resolve(configDir, rawPath), // for relative config usage
        path.resolve(process.cwd(), rawPath), // for node module usage
      ]);
      const resolvedPath = ConfigV2._tryResolveUntilSuccess(possiblePaths);
      object[key] = Object.assign({}, object[key], {path: resolvedPath});
    });
    return object;
  }

  /**
   * Converts an object to an array of objects, also sets the `id` property of each item to its
   * key in the parent.
   * @param {!Object<!Object>} object
   * @return {!Array<!Object>}
   */
  static objectToArray(object) {
    return Object.keys(object).reduce((list, id) => {
      list.push(Object.assign({id}, object[id]));
      return list;
    }, []);
  }

  /**
   * Converts the object to an array, requires the files specified by `path`, and sets the
   * `implementation` property of each item to the required value.
   * @param {!Object<!Object>} definitionsObject
   * @return {!Array<!Object>}
   */
  static collectImplementations(definitionsObject) {
    const definitions = ConfigV2.objectToArray(definitionsObject);
    return definitions.map(definition => {
      let implementation = definition.implementation;
      if (!implementation) {
        implementation = ConfigV2._require(definition.path);
      }

      return Object.assign({}, definition, {implementation});
    });
  }

  /**
   * Converts the object to an array, replaces the `gatherers` property of each pass to an array
   * of the classes, and validates the usage of gatherers.
   * @param {!Object} passesObject
   * @param {!Array<{id: string, implementation: !Gatherer>} gatherers
   * @param {!Array<{id: string, implementation: !Audit>} audits
   * @return {!Array<{gatherers: !Array<!Gatherer>}>}
   */
  static computePasses(passesObject, gatherers, audits) {
    const gathererIds = new Set(gatherers.map(item => item.id));
    const usedGathererIds = new Set();
    const usedGathererNames = new Set(['traces', 'networkRecords']);

    const allRequiredArtifacts = audits.map(audit => audit.implementation.meta.requiredArtifacts);
    const requestedGathererNames = new Set(_flatten(allRequiredArtifacts));

    const passDefinitions = ConfigV2.objectToArray(passesObject);
    const passes = passDefinitions.map(definition => {
      const foundGatherers = definition.gatherers.map(id => {
        const gatherer = gatherers.find(item => item.id === id);
        if (!gatherer) {
          throw new Error(`Missing required gatherer: ${id}`);
        }

        usedGathererIds.add(id);
        usedGathererNames.add(gatherer.implementation.name);
        return gatherer;
      });

      return Object.assign({}, definition, {gatherers: foundGatherers});
    });

    if (gathererIds.size !== usedGathererIds.size) {
      const unused = _differenceAsArray(gathererIds, usedGathererIds);
      log.warn('config', `Gatherers are unused: ${unused.join(', ')}`);
    }

    const usedNotNeeded = _differenceAsArray(usedGathererNames, requestedGathererNames);
    if (usedNotNeeded.length) {
      log.warn('config', `Gatherers were configured but not needed: ${usedNotNeeded.join(', ')}`);
    }

    const neededNotUsed = _differenceAsArray(requestedGathererNames, usedGathererNames);
    if (neededNotUsed.length) {
      log.warn('config', `Gatherers were needed but not configured: ${neededNotUsed.join(', ')}`);
    }

    return passes;
  }
}

module.exports = ConfigV2;
