/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

const defaultConfigPath = './default-config.js';
const defaultConfig = require('./default-config.js');
const fullConfig = require('./full-config.js');
const constants = require('./constants');

const isDeepEqual = require('lodash.isequal');
const log = require('lighthouse-logger');
const path = require('path');
const Audit = require('../audits/audit');
const Runner = require('../runner');

/** @typedef {typeof import('../gather/gatherers/gatherer.js')} GathererConstructor */
/** @typedef {InstanceType<GathererConstructor>} Gatherer */

/**
 * @param {LH.Config['passes']} passes
 * @param {LH.Config['audits']} audits
 */
function validatePasses(passes, audits) {
  if (!Array.isArray(passes)) {
    return;
  }

  const requiredGatherers = Config.getGatherersNeededByAudits(audits);

  // Log if we are running gathers that are not needed by the audits listed in the config
  passes.forEach(pass => {
    pass.gatherers.forEach(gathererDefn => {
      const gatherer = gathererDefn.instance || gathererDefn.implementation;
      const isGatherRequiredByAudits = requiredGatherers.has(gatherer.name);
      if (!isGatherRequiredByAudits) {
        const msg = `${gatherer.name} gatherer requested, however no audit requires it.`;
        log.warn('config', msg);
      }
    });
  });

  // Passes must have unique `passName`s. Throw otherwise.
  const usedNames = new Set();
  passes.forEach(pass => {
    const passName = pass.passName;
    if (usedNames.has(passName)) {
      throw new Error(`Passes must have unique names (repeated passName: ${passName}.`);
    }
    usedNames.add(passName);
  });
}

/**
 * @param {LH.Config['categories']} categories
 * @param {LH.Config['audits']} audits
 * @param {LH.Config['groups']} groups
 */
function validateCategories(categories, audits, groups) {
  if (!categories) {
    return;
  }

  Object.keys(categories).forEach(categoryId => {
    categories[categoryId].auditRefs.forEach((auditRef, index) => {
      if (!auditRef.id) {
        throw new Error(`missing an audit id at ${categoryId}[${index}]`);
      }

      const audit = audits && audits.find(a => a.implementation.meta.name === auditRef.id);
      if (!audit) {
        throw new Error(`could not find ${auditRef.id} audit for category ${categoryId}`);
      }

      const auditImpl = audit.implementation;
      const isManual = auditImpl.meta.scoreDisplayMode === 'manual';
      if (categoryId === 'accessibility' && !auditRef.group && !isManual) {
        throw new Error(`${auditRef.id} accessibility audit does not have a group`);
      }

      if (auditRef.weight > 0 && isManual) {
        throw new Error(`${auditRef.id} is manual but has a positive weight`);
      }

      if (auditRef.group && (!groups || !groups[auditRef.group])) {
        throw new Error(`${auditRef.id} references unknown group ${auditRef.group}`);
      }
    });
  });
}

/**
 * @param {typeof Audit} auditDefinition
 * @param {string=} auditPath
 */
function assertValidAudit(auditDefinition, auditPath) {
  const auditName = auditPath ||
    (auditDefinition && auditDefinition.meta && auditDefinition.meta.name);

  if (typeof auditDefinition.audit !== 'function' || auditDefinition.audit === Audit.audit) {
    throw new Error(`${auditName} has no audit() method.`);
  }

  if (typeof auditDefinition.meta.name !== 'string') {
    throw new Error(`${auditName} has no meta.name property, or the property is not a string.`);
  }

  if (typeof auditDefinition.meta.description !== 'string') {
    throw new Error(
      `${auditName} has no meta.description property, or the property is not a string.`
    );
  }

  // If it'll have a ✔ or ✖ displayed alongside the result, it should have failureDescription
  if (typeof auditDefinition.meta.failureDescription !== 'string' &&
    auditDefinition.meta.scoreDisplayMode === Audit.SCORING_MODES.BINARY) {
    throw new Error(`${auditName} has no failureDescription and should.`);
  }

  if (typeof auditDefinition.meta.helpText !== 'string') {
    throw new Error(
      `${auditName} has no meta.helpText property, or the property is not a string.`
    );
  } else if (auditDefinition.meta.helpText === '') {
    throw new Error(
      `${auditName} has an empty meta.helpText string. Please add a description for the UI.`
    );
  }

  if (!Array.isArray(auditDefinition.meta.requiredArtifacts)) {
    throw new Error(
      `${auditName} has no meta.requiredArtifacts property, or the property is not an array.`
    );
  }
}

/**
 * @param {Gatherer} gathererInstance
 * @param {string=} gathererName
 */
function assertValidGatherer(gathererInstance, gathererName) {
  gathererName = gathererName || gathererInstance.name || 'gatherer';

  if (typeof gathererInstance.beforePass !== 'function') {
    throw new Error(`${gathererName} has no beforePass() method.`);
  }

  if (typeof gathererInstance.pass !== 'function') {
    throw new Error(`${gathererName} has no pass() method.`);
  }

  if (typeof gathererInstance.afterPass !== 'function') {
    throw new Error(`${gathererName} has no afterPass() method.`);
  }
}

/**
 * Creates a settings object from potential flags object by dropping all the properties
 * that don't exist on Config.Settings.
 * TODO(bckenny): fix Flags type
 * @param {Partial<LH.Flags>=} flags
 * @return {Partial<LH.Config.Settings>}
 */
function cleanFlagsForSettings(flags = {}) {
  const settings = {};
  for (const key of Object.keys(flags)) {
    if (typeof constants.defaultSettings[key] !== 'undefined') {
      settings[key] = flags[key];
    }
  }

  return settings;
}

// TODO(phulce): disentangle this merge function
/**
 * More widely typed than exposed merge() function, below.
 * @param {Object<string, any>|Array<any>|undefined|null} base
 * @param {Object<string, any>|Array<any>} extension
 * @param {boolean=} overwriteArrays
 */
function _merge(base, extension, overwriteArrays = false) {
  // If the default value doesn't exist or is explicitly null, defer to the extending value
  if (typeof base === 'undefined' || base === null) {
    return extension;
  } else if (typeof extension === 'undefined') {
    return base;
  } else if (Array.isArray(extension)) {
    if (overwriteArrays) return extension;
    if (!Array.isArray(base)) throw new TypeError(`Expected array but got ${typeof base}`);
    const merged = base.slice();
    extension.forEach(item => {
      if (!merged.some(candidate => isDeepEqual(candidate, item))) merged.push(item);
    });

    return merged;
  } else if (typeof extension === 'object') {
    if (typeof base !== 'object') throw new TypeError(`Expected object but got ${typeof base}`);
    if (Array.isArray(base)) throw new TypeError('Expected object but got Array');
    Object.keys(extension).forEach(key => {
      const localOverwriteArrays = overwriteArrays ||
        (key === 'settings' && typeof base[key] === 'object');
      base[key] = _merge(base[key], extension[key], localOverwriteArrays);
    });
    return base;
  }

  return extension;
}

/**
 * Until support of jsdoc templates with constraints, type in config.d.ts.
 * See https://github.com/Microsoft/TypeScript/issues/24283
 * @type {LH.Config.Merge}
 */
const merge = _merge;

/**
 * @template T
 * @param {Array<T>} array
 * @return {Array<T>}
 */
function cloneArrayWithPluginSafety(array) {
  return array.map(item => {
    if (typeof item === 'object') {
      // Return copy of instance and prototype chain (in case item is instantiated class).
      return Object.assign(
        Object.create(
          Object.getPrototypeOf(item)
        ),
        item
      );
    }

    return item;
  });
}

/**
 * // TODO(bckenny): could adopt "jsonified" type to ensure T will survive JSON
 * round trip: https://github.com/Microsoft/TypeScript/issues/21838
 * @template T
 * @param {T} json
 * @return {T}
 */
function deepClone(json) {
  return JSON.parse(JSON.stringify(json));
}

/**
 * Deep clone a ConfigJson, copying over any "live" gatherer or audit that
 * wouldn't make the JSON round trip.
 * @param {LH.Config.Json} json
 * @return {LH.Config.Json}
 */
function deepCloneConfigJson(json) {
  const cloned = deepClone(json);

  // Copy arrays that could contain plugins to allow for programmatic
  // injection of plugins.
  if (Array.isArray(cloned.passes) && Array.isArray(json.passes)) {
    for (let i = 0; i < cloned.passes.length; i++) {
      const pass = cloned.passes[i];
      pass.gatherers = cloneArrayWithPluginSafety(json.passes[i].gatherers || []);
    }
  }

  if (Array.isArray(json.audits)) {
    cloned.audits = cloneArrayWithPluginSafety(json.audits);
  }

  return cloned;
}

/**
 * Until support of jsdoc templates with constraints, type in config.d.ts.
 * See https://github.com/Microsoft/TypeScript/issues/24283
 * @type {LH.Config.MergeOptionsOfItems}
 */
const mergeOptionsOfItems = (function(items) {
  /** @type {Array<{path?: string, options?: Object<string, any>}>} */
  const mergedItems = [];

  for (const item of items) {
    const existingItem = item.path && mergedItems.find(candidate => candidate.path === item.path);
    if (!existingItem) {
      mergedItems.push(item);
      continue;
    }

    existingItem.options = Object.assign({}, existingItem.options, item.options);
  }

  return mergedItems;
});

class Config {
  /**
   * @constructor
   * @param {LH.Config.Json=} configJSON
   * @param {LH.Flags=} flags
   */
  constructor(configJSON, flags) {
    let configPath = flags && flags.configPath;

    if (!configJSON) {
      configJSON = defaultConfig;
      configPath = path.resolve(__dirname, defaultConfigPath);
    }

    if (configPath && !path.isAbsolute(configPath)) {
      throw new Error('configPath must be an absolute path.');
    }

    // We don't want to mutate the original config object
    configJSON = deepCloneConfigJson(configJSON);

    // Extend the default or full config if specified
    if (configJSON.extends === 'lighthouse:full') {
      const explodedFullConfig = Config.extendConfigJSON(deepCloneConfigJson(defaultConfig),
          deepCloneConfigJson(fullConfig));
      configJSON = Config.extendConfigJSON(explodedFullConfig, configJSON);
    } else if (configJSON.extends) {
      configJSON = Config.extendConfigJSON(deepCloneConfigJson(defaultConfig), configJSON);
    }

    // Augment config with necessary defaults
    configJSON = Config.augmentWithDefaults(configJSON);

    // Expand audit/gatherer short-hand representations and merge in defaults
    configJSON.audits = Config.expandAuditShorthandAndMergeOptions(configJSON.audits);
    configJSON.passes = Config.expandGathererShorthandAndMergeOptions(configJSON.passes);

    // Override any applicable settings with CLI flags
    configJSON.settings = merge(configJSON.settings || {}, cleanFlagsForSettings(flags), true);

    // Generate a limited config if specified
    if (Array.isArray(configJSON.settings.onlyCategories) ||
        Array.isArray(configJSON.settings.onlyAudits) ||
        Array.isArray(configJSON.settings.skipAudits)) {
      const categoryIds = configJSON.settings.onlyCategories;
      const auditIds = configJSON.settings.onlyAudits;
      const skipAuditIds = configJSON.settings.skipAudits;
      configJSON = Config.generateNewFilteredConfig(configJSON, categoryIds, auditIds,
          skipAuditIds);
    }

    Config.adjustDefaultPassForThrottling(configJSON);

    // Store the directory of the config path, if one was provided.
    this._configDir = configPath ? path.dirname(configPath) : undefined;

    /** @type {LH.Config['settings']} */
    this._settings = configJSON.settings || {};
    /** @type {LH.Config['passes']} */
    this._passes = Config.requireGatherers(configJSON.passes, this._configDir);
    /** @type {LH.Config['audits']} */
    this._audits = Config.requireAudits(configJSON.audits, this._configDir);
    /** @type {LH.Config['categories']} */
    this._categories = configJSON.categories;
    /** @type {LH.Config['groups']} */
    this._groups = configJSON.groups;

    // validatePasses must follow after audits are required
    validatePasses(configJSON.passes, this._audits);
    validateCategories(configJSON.categories, this._audits, this._groups);
  }

  /**
   * @param {LH.Config.Json} baseJSON The JSON of the configuration to extend
   * @param {LH.Config.Json} extendJSON The JSON of the extensions
   * @return {LH.Config.Json}
   */
  static extendConfigJSON(baseJSON, extendJSON) {
    if (extendJSON.passes && baseJSON.passes) {
      for (const pass of extendJSON.passes) {
        // use the default pass name if one is not specified
        const passName = pass.passName || constants.defaultPassConfig.passName;
        const basePass = baseJSON.passes.find(candidate => candidate.passName === passName);

        if (!basePass) {
          baseJSON.passes.push(pass);
        } else {
          merge(basePass, pass);
        }
      }

      delete extendJSON.passes;
    }

    return merge(baseJSON, extendJSON);
  }

  /**
   * @param {LH.Config} config
   * @return {LH.Config}
   */
  static augmentWithDefaults(config) {
    const {defaultSettings, defaultPassConfig} = constants;
    config.settings = merge(deepClone(defaultSettings), config.settings, true);
    if (config.passes) {
      config.passes = config.passes.map(pass => merge(deepClone(defaultPassConfig), pass));
    }

    return config;
  }

  /**
   * Expands the audits from user-specified JSON to an internal audit definition format.
   * @param {LH.Config.Json['audits']} audits
   * @return {?Array<{path: string, options?: {}} | {implementation: typeof Audit, path?: string, options?: {}}>}
   */
  static expandAuditShorthandAndMergeOptions(audits) {
    if (!audits) {
      return null;
    }

    const newAudits = audits.map(audit => {
      if (typeof audit === 'string') {
        return {path: audit, options: {}};
      } else if (audit && typeof audit.audit === 'function') {
        return {implementation: audit, options: {}};
      } else {
        return audit;
      }
    });

    return mergeOptionsOfItems(newAudits);
  }

  /**
   * Expands the gatherers from user-specified to an internal gatherer definition format.
   *
   * Input Examples:
   *  - 'my-gatherer'
   *  - class MyGatherer extends Gatherer { }
   *  - {instance: myGathererInstance}
   *
   * @param {Array<{gatherers: Array<LH.Config.GathererJson>}>} passes
   * @return {Array<{gatherers: Array<{instance?: Gatherer, implementation?: GathererConstructor, path?: string, options?: {}}>}>} passes
   */
  static expandGathererShorthandAndMergeOptions(passes) {
    if (!passes) {
      return passes;
    }

    passes.forEach(pass => {
      pass.gatherers = pass.gatherers.map(gatherer => {
        if (typeof gatherer === 'string') {
          return {path: gatherer, options: {}};
        } else if (typeof gatherer === 'function') {
          return {implementation: gatherer, options: {}};
        } else if (gatherer && typeof gatherer.beforePass === 'function') {
          return {instance: gatherer, options: {}};
        } else {
          return gatherer;
        }
      });

      pass.gatherers = mergeOptionsOfItems(pass.gatherers);
    });

    return passes;
  }

  /**
   * Observed throttling methods (devtools/provided) require at least 5s of quiet for the metrics to
   * be computed. This method adjusts the quiet thresholds to the required minimums if necessary.
   *
   * @param {LH.Config.Json} config
   */
  static adjustDefaultPassForThrottling(config) {
    if (config.settings.throttlingMethod !== 'devtools' &&
        config.settings.throttlingMethod !== 'provided') {
      return;
    }

    const defaultPass = config.passes.find(pass => pass.passName === 'defaultPass');
    if (!defaultPass) return;

    const overrides = constants.nonSimulatedPassConfigOverrides;
    defaultPass.pauseAfterLoadMs =
      Math.max(overrides.pauseAfterLoadMs, defaultPass.pauseAfterLoadMs);
    defaultPass.cpuQuietThresholdMs =
      Math.max(overrides.cpuQuietThresholdMs, defaultPass.cpuQuietThresholdMs);
    defaultPass.networkQuietThresholdMs =
      Math.max(overrides.networkQuietThresholdMs, defaultPass.networkQuietThresholdMs);
  }

  /**
   * Filter out any unrequested items from the config, based on requested top-level categories.
   * @param {LH.Config.Json} oldConfig Lighthouse config object
   * @param {!Array<string>=} categoryIds ID values of categories to include
   * @param {!Array<string>=} auditIds ID values of categories to include
   * @param {!Array<string>=} skipAuditIds ID values of categories to exclude
   * @return {LH.Config.Json} A new config
   */
  static generateNewFilteredConfig(oldConfig, categoryIds, auditIds, skipAuditIds) {
    // 0. Clone config to avoid mutating it
    const config = deepCloneConfigJson(oldConfig);
    config.audits = Config.expandAuditShorthandAndMergeOptions(config.audits);
    config.passes = Config.expandGathererShorthandAndMergeOptions(config.passes);
    config.passes = Config.requireGatherers(config.passes);

    // 1. Filter to just the chosen categories/audits
    const {categories, audits: requestedAuditNames} = Config.filterCategoriesAndAudits(
      config.categories,
      categoryIds,
      auditIds,
      skipAuditIds
    );

    config.categories = categories;

    // 2. Resolve which audits will need to run
    const auditPathToNameMap = Config.getMapOfAuditPathToName(config);
    const getAuditName = auditDefn => auditDefn.implementation ?
      auditDefn.implementation.meta.name :
      auditPathToNameMap.get(auditDefn.path);
    config.audits = config.audits.filter(auditDefn =>
        requestedAuditNames.has(getAuditName(auditDefn)));

    // 3. Resolve which gatherers will need to run
    const auditObjectsSelected = Config.requireAudits(config.audits);
    const requiredGatherers = Config.getGatherersNeededByAudits(auditObjectsSelected);

    // 4. Filter to only the neccessary passes
    config.passes = Config.generatePassesNeededByGatherers(config.passes, requiredGatherers);
    return config;
  }

  /**
   * Filter out any unrequested categories or audits from the categories object.
   * @param {LH.Config['categories']} oldCategories
   * @param {Array<string>=} categoryIds
   * @param {Array<string>=} auditIds
   * @param {Array<string>=} skipAuditIds
   * @return {{categories: LH.Config['categories'], requestedAuditNames: Set<string>}}
   */
  static filterCategoriesAndAudits(oldCategories, categoryIds, auditIds, skipAuditIds) {
    if (!oldCategories) {
      return {categories: null, requestedAuditNames: new Set()};
    }

    if (auditIds && skipAuditIds) {
      throw new Error('Cannot set both skipAudits and onlyAudits');
    }

    const categories = {};
    const filterByIncludedCategory = !!categoryIds;
    const filterByIncludedAudit = !!auditIds;
    categoryIds = categoryIds || [];
    auditIds = auditIds || [];
    skipAuditIds = skipAuditIds || [];

    // warn if the category is not found
    categoryIds.forEach(categoryId => {
      if (!oldCategories[categoryId]) {
        log.warn('config', `unrecognized category in 'onlyCategories': ${categoryId}`);
      }
    });

    // warn if the audit is not found in a category or there are overlaps
    const auditsToValidate = new Set(auditIds.concat(skipAuditIds));
    for (const auditId of auditsToValidate) {
      const foundCategory = Object.keys(oldCategories).find(categoryId => {
        const auditRefs = oldCategories[categoryId].auditRefs;
        return auditRefs.find(candidate => candidate.id === auditId);
      });

      if (!foundCategory) {
        const parentKeyName = skipAuditIds.includes(auditId) ? 'skipAudits' : 'onlyAudits';
        log.warn('config', `unrecognized audit in '${parentKeyName}': ${auditId}`);
      }

      if (auditIds.includes(auditId) && categoryIds.includes(foundCategory)) {
        log.warn('config', `${auditId} in 'onlyAudits' is already included by ` +
            `${foundCategory} in 'onlyCategories'`);
      }
    }

    const includedAudits = new Set(auditIds);
    skipAuditIds.forEach(id => includedAudits.delete(id));

    Object.keys(oldCategories).forEach(categoryId => {
      const category = deepClone(oldCategories[categoryId]);

      if (filterByIncludedCategory && filterByIncludedAudit) {
        // If we're filtering to the category and audit whitelist, include the union of the two
        if (!categoryIds.includes(categoryId)) {
          category.auditRefs = category.auditRefs.filter(audit => auditIds.includes(audit.id));
        }
      } else if (filterByIncludedCategory) {
        // If we're filtering to just the category whitelist and the category is not included, skip it
        if (!categoryIds.includes(categoryId)) {
          return;
        }
      } else if (filterByIncludedAudit) {
        category.auditRefs = category.auditRefs.filter(audit => auditIds.includes(audit.id));
      }

      // always filter to the audit blacklist
      category.auditRefs = category.auditRefs.filter(audit => !skipAuditIds.includes(audit.id));

      if (category.auditRefs.length) {
        categories[categoryId] = category;
        category.auditRefs.forEach(audit => includedAudits.add(audit.id));
      }
    });

    return {categories, audits: includedAudits};
  }

  /**
   * @param {LH.Config.Json} config
   * @return {Array<{id: string, title: string}>}
   */
  static getCategories(config) {
    const categories = config.categories;
    if (!categories) {
      return [];
    }

    return Object.keys(categories).map(id => {
      const title = categories[id].title;
      return {id, title};
    });
  }

  /**
   * Creates mapping from audit path (used in config.audits) to audit.name (used in categories)
   * @param {LH.Config.Json} config Lighthouse config object.
   * @return {Map<string, string>}
   */
  static getMapOfAuditPathToName(config) {
    const auditObjectsAll = Config.requireAudits(config.audits);
    if (!auditObjectsAll) {
      return new Map();
    }

    const auditPathToName = new Map(auditObjectsAll.map((auditDefn, index) => {
      const AuditClass = auditDefn.implementation;
      const auditPath = config.audits[index];
      const auditName = AuditClass.meta.name;
      return [auditPath, auditName];
    }));
    return auditPathToName;
  }

  /**
   * From some requested audits, return names of all required artifacts
   * @param {LH.Config['audits']} audits
   * @return {Set<string>}
   */
  static getGatherersNeededByAudits(audits) {
    // It's possible we weren't given any audits (but existing audit results), in which case
    // there is no need to do any work here.
    if (!audits) {
      return new Set();
    }

    return audits.reduce((list, auditDefn) => {
      auditDefn.implementation.meta.requiredArtifacts.forEach(artifact => list.add(artifact));
      return list;
    }, new Set());
  }

  /**
   * Filters to only required passes and gatherers, returning a new passes array.
   * @param {LH.Config['passes']} passes
   * @param {Set<string>} requiredGatherers
   * @return {LH.Config['passes']}
   */
  static generatePassesNeededByGatherers(passes, requiredGatherers) {
    if (!passes) {
      return null;
    }

    const auditsNeedTrace = requiredGatherers.has('traces');
    const filteredPasses = passes.map(pass => {
      // remove any unncessary gatherers from within the passes
      pass.gatherers = pass.gatherers.filter(gathererDefn => {
        const gatherer = gathererDefn.instance || gathererDefn.implementation;
        return requiredGatherers.has(gatherer.name);
      });

      // disable the trace if no audit requires a trace
      if (pass.recordTrace && !auditsNeedTrace) {
        const passName = pass.passName || 'unknown pass';
        log.warn('config', `Trace not requested by an audit, dropping trace in ${passName}`);
        pass.recordTrace = false;
      }

      return pass;
    }).filter(pass => {
      // remove any passes lacking concrete gatherers, unless they are dependent on the trace
      if (pass.recordTrace) return true;
      // Always keep defaultPass
      if (pass.passName === 'defaultPass') return true;
      return pass.gatherers.length > 0;
    });
    return filteredPasses;
  }

  /**
   * Take an array of audits and audit paths and require any paths (possibly
   * relative to the optional `configPath`) using `Runner.resolvePlugin`,
   * leaving only an array of AuditDefns.
   * @param {LH.Config.Json['audits']} audits
   * @param {string=} configPath
   * @return {LH.Config['audits']}
   */
  static requireAudits(audits, configPath) {
    if (!audits) {
      return null;
    }

    const coreList = Runner.getAuditList();
    return audits.map(auditDefn => {
      if (!auditDefn.implementation) {
        const path = auditDefn.path;
        // See if the audit is a Lighthouse core audit.
        const coreAudit = coreList.find(a => a === `${path}.js`);
        let requirePath = `../audits/${path}`;
        if (!coreAudit) {
          // Otherwise, attempt to find it elsewhere. This throws if not found.
          requirePath = Runner.resolvePlugin(path, configPath, 'audit');
        }

        auditDefn.implementation = require(requirePath);
      }

      assertValidAudit(auditDefn.implementation, auditDefn.path);
      return auditDefn;
    });
  }

  /**
   * Takes an array of passes with every property now initialized except the
   * gatherers and requires them, (relative to the optional `configPath` if
   * provided) using `Runner.resolvePlugin`, returning an array of full Passes.
   * @param {?Array<Required<LH.Config.PassJson>>} passes
   * @param {string=} configPath
   * @return {LH.Config['passes']}
   */
  static requireGatherers(passes, configPath) {
    if (!passes) {
      return null;
    }

    const coreList = Runner.getGathererList();
    passes.forEach(pass => {
      pass.gatherers.forEach(gathererDefn => {
        if (!gathererDefn.instance) {
          let GathererClass = gathererDefn.implementation;
          if (!GathererClass) {
            // See if the gatherer is a Lighthouse core gatherer
            const name = gathererDefn.path;
            const coreGatherer = coreList.find(a => a === `${name}.js`);

            let requirePath = `../gather/gatherers/${name}`;
            if (!coreGatherer) {
              // Otherwise, attempt to find it elsewhere. This throws if not found.
              requirePath = Runner.resolvePlugin(name, configPath, 'gatherer');
            }

            GathererClass = require(requirePath);
          }

          gathererDefn.implementation = GathererClass;
          gathererDefn.instance = new GathererClass();
        }

        assertValidGatherer(gathererDefn.instance, gathererDefn.path);
      });
    });

    return passes;
  }

  /** @type {string} */
  get configDir() {
    return this._configDir;
  }

  /** @type {LH.Config['passes']} */
  get passes() {
    return this._passes;
  }

  /** @type {LH.Config['audits']} */
  get audits() {
    return this._audits;
  }

  /** @type {LH.Config['categories']} */
  get categories() {
    return this._categories;
  }

  /** @type {LH.Config['groups']} */
  get groups() {
    return this._groups;
  }

  /** @type {LH.Config['settings']} */
  get settings() {
    return this._settings;
  }
}

module.exports = Config;
