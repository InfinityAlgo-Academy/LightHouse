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

    // Perform a shallow clone so we can adjust gatherers and audits
    configJson = Object.assign({}, configJson);

    // Resolve the paths of audits and gatherers
    configJson.gatherers = ConfigV2.resolvePaths(configJson.gatherers, configPath, [
      path.join(__dirname, '../../gather/gatherers'),
    ]);
    configJson.audits = ConfigV2.resolvePaths(configJson.audits, configPath, [
      path.join(__dirname, '../../audits'),
    ]);

    // Extend only after our paths have been resolved
    configJson = ConfigV2.extendIfNecessary(configJson, configPath);

    this._json = configJson;
    this._gatherers = ConfigV2.collectImplementations(configJson.gatherers);
    this._audits = ConfigV2.collectImplementations(configJson.audits);
    this._passes = ConfigV2.computePasses(configJson, this._gatherers, this._audits);
    this._report = configJson.report;
  }

  asJson() {
    return JSON.parse(JSON.stringify(this._json));
  }

  get audits() {
    return [...this._audits];
  }

  get passes() {
    return [...this._passes];
  }

  get report() {
    return this._report;
  }

  static _tryResolveUntilSuccess(paths) {
    for (const path of paths) {
      try {
        return require.resolve(path);
      } catch (e) {}
    }

    throw new Error(`Unable to locate ${paths[0]}`);
  }

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

  static extendIfNecessary(configJson, configPath) {
    if (!configJson.extends) {
      return configJson;
    }

    let extendedConfigJson;
    let extendedConfigPath = configJson.extends;
    if (extendedConfigPath === 'lighthouse:default') {
      extendedConfigJson = defaultConfigJson;
      extendedConfigPath = defaultConfigPath;
    } else {
      extendedConfigPath = ConfigV2._tryResolveUntilSuccess([
        extendedConfigPath,
        path.resolve(configPath, extendedConfigPath),
        path.resolve(process.cwd(), extendedConfigPath),
      ])
      extendedConfigJson = require(extendedConfigPath);
    }

    const extendedConfig = new ConfigV2(extendedConfigJson, extendedConfigPath);
    return ConfigV2._mergeObjects(extendedConfig.asJson(), configJson);
  }

  static resolvePaths(object, configPath, searchPaths = []) {
    object = Object.assign({}, object);
    Object.keys(object).forEach(key => {
      // We don't need to resolve objects that already have
      if (object[key].implementation) {
        return;
      }

      const rawPath = object[key].path || key;
      const possiblePaths = searchPaths.map(searchPath => {
        return path.resolve(searchPath, rawPath);
      }).concat([
        rawPath, // for npm plugins and absolute path usage
        path.resolve(configPath, rawPath), // for relative config usage
        path.resolve(process.cwd(), rawPath), // for node module usage
      ]);
      const resolvedPath = ConfigV2._tryResolveUntilSuccess(possiblePaths);
      object[key] = Object.assign({}, object[key], {path: resolvedPath});
    });
    return object;
  }

  static objectToList(object) {
    return Object.keys(object).reduce((list, id) => {
      list.push(Object.assign({id}, object[id]));
      return list;
    }, []);
  }

  static collectImplementations(definitionsObject) {
    const definitions = ConfigV2.objectToList(definitionsObject);
    return definitions.map(definition => {
      let implementation = definition.implementation;
      if (!implementation) {
        implementation = require(definition.path);
      }

      return Object.assign({}, definition, {implementation})
    });
  }

  static computePasses(configJson, gatherers, audits) {
    const gathererIds = new Set(gatherers.map(item => item.id));
    const usedGathererIds = new Set();
    const usedGathererNames = new Set(['traces', 'networkRecords']);
    const requestedGathererNames = new Set(_flatten(audits.map(audit => audit.implementation.meta.requiredArtifacts)));
    const passDefinitions = ConfigV2.objectToList(configJson.passes);
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

    const usedButNotNeeded = _differenceAsArray(usedGathererNames, requestedGathererNames);
    if (usedButNotNeeded.length) {
      log.warn('config', `Gatherers were configured but not needed: ${usedButNotNeeded.join(', ')}`);
    }

    const neededButNotGathered = _differenceAsArray(requestedGathererNames, usedGathererNames);
    if (neededButNotGathered.length) {
      log.warn('config', `Gatherers were needed but not configured: ${neededButNotGathered.join(', ')}`);
    }

    return passes;
  }
}

module.exports = ConfigV2;
