// https://github.com/Permutatrix/rollup-plugin-hypothetical
// but i disabled the "relative path goes too high" error.

const path = require('path').posix;

function isAbsolute(p) {
  return path.isAbsolute(p) || /^[A-Za-z]:\//.test(p);
}

function isExternal(p) {
  return !/^(\.?\.?|[A-Za-z]:)\//.test(p);
}

function absolutify(p, cwd) {
  if (cwd) {
    return path.join(cwd, p);
  } else {
    return './' + p;
  }
}

function forEachInObjectOrMap(object, map, callback) {
  if (object && map) {
    throw Error('Both an Object and a Map were supplied!');
  }

  if (map) {
    map.forEach(callback);
  } else if (object) {
    for (const key in object) {
      callback(object[key], key);
    }
  }
  // if neither was supplied, do nothing.
}

module.exports = function rollupPluginHypothetical(options) {
  options = options || {};
  const files0 = options.files;
  const files0AsMap = options.filesMap;
  const allowFallthrough = options.allowFallthrough || false;
  const allowRelativeExternalFallthrough = options.allowRelativeExternalFallthrough || false;
  let allowExternalFallthrough = options.allowExternalFallthrough;
  if (allowExternalFallthrough === undefined) {
    allowExternalFallthrough = true;
  }
  const leaveIdsAlone = options.leaveIdsAlone || true;
  let impliedExtensions = options.impliedExtensions;
  if (impliedExtensions === undefined) {
    impliedExtensions = ['.js', '/'];
  } else {
    impliedExtensions = Array.prototype.slice.call(impliedExtensions);
  }
  let cwd = options.cwd;
  if (cwd !== false) {
    if (cwd === undefined) {
      cwd = process.cwd();
    }
    cwd = unixStylePath(cwd);
  }

  const files = new Map();
  if (leaveIdsAlone) {
    forEachInObjectOrMap(files0, files0AsMap, function(contents, f) {
      files.set(normalizeModulePath(f), contents);
    });
  } else {
    forEachInObjectOrMap(files0, files0AsMap, function(contents, f) {
      const unixStyleF = unixStylePath(f);
      const pathIsExternal = isExternal(unixStyleF);
      let p = path.normalize(unixStyleF);

      // Ignore.
      // if(pathIsExternal && !isExternal(p)) {
      //   throw Error(
      //     "Supplied external file path \"" +
      //     unixStyleF +
      //     "\" normalized to \"" +
      //     p +
      //     "\"!"
      //   );
      // }
      if (!isAbsolute(p) && !pathIsExternal) {
        p = absolutify(p, cwd);
      }
      files.set(p, contents);
    });
  }

  function basicResolve(importee) {
    if (files.has(importee)) {
      return importee;
    } else if (!allowFallthrough) {
      throw Error(dneMessage(importee));
    }
  }

  const resolveId = leaveIdsAlone ? basicResolve : function(importee, importer) {
    importee = unixStylePath(importee);

    // the entry file is never external.
    const importeeIsExternal = Boolean(importer) && isExternal(importee);

    const importeeIsRelativeToExternal =
      importer &&
      !importeeIsExternal &&
      isExternal(importer) &&
      !isAbsolute(importee);

    if (importeeIsExternal) {
      const normalizedImportee = path.normalize(importee);
      // if(!isExternal(normalizedImportee)) {
      //   throw Error(
      //     "External import \"" +
      //     importee +
      //     "\" normalized to \"" +
      //     normalizedImportee +
      //     "\"!"
      //   );
      // }
      importee = normalizedImportee;
    } else if (importeeIsRelativeToExternal) {
      const joinedImportee = path.join(path.dirname(importer), importee);
      if (!isExternal(joinedImportee)) {
        throw Error(
          'Import "' +
          importee +
          '" relative to external import "' +
          importer +
          '" results in "' +
          joinedImportee +
          '"!'
        );
      }
      importee = joinedImportee;
    } else {
      if (!isAbsolute(importee) && importer) {
        importee = path.join(path.dirname(importer), importee);
      } else {
        importee = path.normalize(importee);
      }
      if (!isAbsolute(importee)) {
        importee = absolutify(importee, cwd);
      }
    }

    if (files.has(importee)) {
      return importee;
    } else if (impliedExtensions) {
      for (let i = 0, len = impliedExtensions.length; i < len; ++i) {
        const extended = importee + impliedExtensions[i];
        if (files.has(extended)) {
          return extended;
        }
      }
    }
    if (importeeIsExternal && !allowExternalFallthrough) {
      throw Error(dneMessage(importee));
    }
    if (importeeIsRelativeToExternal && !allowRelativeExternalFallthrough) {
      throw Error(dneMessage(importee));
    }
    if (!importeeIsExternal && !importeeIsRelativeToExternal && !allowFallthrough) {
      throw Error(dneMessage(importee));
    }
    if (importeeIsRelativeToExternal) {
      // we have to resolve this case specially because Rollup won't
      // treat it as external if we don't.
      // we have to trust that the user has informed Rollup that this import
      // is supposed to be external... ugh.
      return importee;
    }
  };

  /**
   * @param {string} path
   */
  function normalizeModulePath(path) {
    if (path.includes('node_modules')) {
      path.lastIndexOf('node_modules/')
      return path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length)
    }

    return path;
  }

  return {
    // resolveId: resolveId,
    load: function(id) {
      const key = normalizeModulePath(id);

      // if (id.includes('rimraf')) console.log('!', id);
      // if (files.has(key)) console.log(id);

      return files.get(key);
    },
  };
};

function unixStylePath(p) {
  return p.split('\\').join('/');
}

function dneMessage(id) {
  return '"' + id + '" does not exist in the hypothetical file system!';
}
