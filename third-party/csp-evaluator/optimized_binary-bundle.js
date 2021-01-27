// @ts-nocheck
//javascript/closure/base.js
/**
 * @license
 * Copyright The Closure Library Authors.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Bootstrap for the Google JS Library (Closure).
 *
 * In uncompiled mode base.js will attempt to load Closure's deps file, unless
 * the global <code>CLOSURE_NO_DEPS</code> is set to true.  This allows projects
 * to include their own deps file(s) from different locations.
 *
 * Avoid including base.js more than once. This is strictly discouraged and not
 * supported. goog.require(...) won't work properly in that case.
 *
 * @provideGoog
 */


/**
 * @define {boolean} Overridden to true by the compiler.
 */
var COMPILED = false;


/**
 * Base namespace for the Closure library.  Checks to see goog is already
 * defined in the current scope before assigning to prevent clobbering if
 * base.js is loaded more than once.
 *
 * @const
 */
var goog = goog || {};

/**
 * Reference to the global object.
 * https://www.ecma-international.org/ecma-262/9.0/index.html#sec-global-object
 *
 * More info on this implementation here:
 * https://docs.google.com/document/d/1NAeW4Wk7I7FV0Y2tcUFvQdGMc89k2vdgSXInw8_nvCI/edit
 *
 * @const
 * @suppress {undefinedVars} self won't be referenced unless `this` is falsy.
 * @type {!Global}
 */
goog.global =
    // Check `this` first for backwards compatibility.
    // Valid unless running as an ES module or in a function wrapper called
    //   without setting `this` properly.
    // Note that base.js can't usefully be imported as an ES module, but it may
    // be compiled into bundles that are loadable as ES modules.
    this ||
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/self
    // For in-page browser environments and workers.
    self;


/**
 * A hook for overriding the define values in uncompiled mode.
 *
 * In uncompiled mode, `CLOSURE_UNCOMPILED_DEFINES` may be defined before
 * loading base.js.  If a key is defined in `CLOSURE_UNCOMPILED_DEFINES`,
 * `goog.define` will use the value instead of the default value.  This
 * allows flags to be overwritten without compilation (this is normally
 * accomplished with the compiler's "define" flag).
 *
 * Example:
 * <pre>
 *   var CLOSURE_UNCOMPILED_DEFINES = {'goog.DEBUG': false};
 * </pre>
 *
 * @type {Object<string, (string|number|boolean)>|undefined}
 */
goog.global.CLOSURE_UNCOMPILED_DEFINES;


/**
 * A hook for overriding the define values in uncompiled or compiled mode,
 * like CLOSURE_UNCOMPILED_DEFINES but effective in compiled code.  In
 * uncompiled code CLOSURE_UNCOMPILED_DEFINES takes precedence.
 *
 * Also unlike CLOSURE_UNCOMPILED_DEFINES the values must be number, boolean or
 * string literals or the compiler will emit an error.
 *
 * While any @define value may be set, only those set with goog.define will be
 * effective for uncompiled code.
 *
 * Example:
 * <pre>
 *   var CLOSURE_DEFINES = {'goog.DEBUG': false} ;
 * </pre>
 *
 * @type {Object<string, (string|number|boolean)>|undefined}
 */
goog.global.CLOSURE_DEFINES;


/**
 * Builds an object structure for the provided namespace path, ensuring that
 * names that already exist are not overwritten. For example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by goog.provide and goog.exportSymbol.
 * @param {string} name The name of the object that this file defines.
 * @param {*=} object The object to expose at the end of the path.
 * @param {boolean=} overwriteImplicit If object is set and a previous call
 *     implicitly constructed the namespace given by name, this parameter
 *     controls whether object should overwrite the implicitly constructed
 *     namespace or be merged into it. Defaults to false.
 * @param {?Object=} objectToExportTo The object to add the path to; if this
 *     field is not specified, its value defaults to `goog.global`.
 * @private
 */
goog.exportPath_ = function(name, object, overwriteImplicit, objectToExportTo) {
  var parts = name.split('.');
  var cur = objectToExportTo || goog.global;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && typeof cur.execScript != 'undefined') {
    cur.execScript('var ' + parts[0]);
  }

  for (var part; parts.length && (part = parts.shift());) {
    if (!parts.length && object !== undefined) {
      if (!overwriteImplicit && goog.isObject(object) &&
          goog.isObject(cur[part])) {
        // Merge properties on object (the input parameter) with the existing
        // implicitly defined namespace, so as to not clobber previously
        // defined child namespaces.
        for (var prop in object) {
          if (object.hasOwnProperty(prop)) {
            cur[part][prop] = object[prop];
          }
        }
      } else {
        // Either there is no existing implicit namespace, or overwriteImplicit
        // is set to true, so directly assign object (the input parameter) to
        // the namespace.
        cur[part] = object;
      }
    } else if (cur[part] && cur[part] !== Object.prototype[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Defines a named value. In uncompiled mode, the value is retrieved from
 * CLOSURE_DEFINES or CLOSURE_UNCOMPILED_DEFINES if the object is defined and
 * has the property specified, and otherwise used the defined defaultValue.
 * When compiled the default can be overridden using the compiler options or the
 * value set in the CLOSURE_DEFINES object. Returns the defined value so that it
 * can be used safely in modules. Note that the value type MUST be either
 * boolean, number, or string.
 *
 * @param {string} name The distinguished name to provide.
 * @param {T} defaultValue
 * @return {T} The defined value.
 * @template T
 */
goog.define = function(name, defaultValue) {
  var value = defaultValue;
  if (!COMPILED) {
    var uncompiledDefines = goog.global.CLOSURE_UNCOMPILED_DEFINES;
    var defines = goog.global.CLOSURE_DEFINES;
    if (uncompiledDefines &&
        // Anti DOM-clobbering runtime check (b/37736576).
        /** @type {?} */ (uncompiledDefines).nodeType === undefined &&
        Object.prototype.hasOwnProperty.call(uncompiledDefines, name)) {
      value = uncompiledDefines[name];
    } else if (
        defines &&
        // Anti DOM-clobbering runtime check (b/37736576).
        /** @type {?} */ (defines).nodeType === undefined &&
        Object.prototype.hasOwnProperty.call(defines, name)) {
      value = defines[name];
    }
  }
  return value;
};


/**
 * @define {number} Integer year indicating the set of browser features that are
 * guaranteed to be present.  This is defined to include exactly features that
 * work correctly on all "modern" browsers that are stable on January 1 of the
 * specified year.  For example,
 * ```js
 * if (goog.FEATURESET_YEAR >= 2019) {
 *   // use APIs known to be available on all major stable browsers Jan 1, 2019
 * } else {
 *   // polyfill for older browsers
 * }
 * ```
 * This is intended to be the primary define for removing
 * unnecessary browser compatibility code (such as ponyfills and workarounds),
 * and should inform the default value for most other defines:
 * ```js
 * const ASSUME_NATIVE_PROMISE =
 *     goog.define('ASSUME_NATIVE_PROMISE', goog.FEATURESET_YEAR >= 2016);
 * ```
 *
 * The default assumption is that IE9 is the lowest supported browser, which was
 * first available Jan 1, 2012.
 *
 * TODO(mathiasb): Reference more thorough documentation when it's available.
 */
goog.FEATURESET_YEAR = goog.define('goog.FEATURESET_YEAR', 2012);


/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production. It can be easily stripped
 * by specifying --define goog.DEBUG=false to the Closure Compiler aka
 * JSCompiler. For example, most toString() methods should be declared inside an
 * "if (goog.DEBUG)" conditional because they are generally used for debugging
 * purposes and it is difficult for the JSCompiler to statically determine
 * whether they are used.
 */
goog.DEBUG = goog.define('goog.DEBUG', true);


/**
 * @define {string} LOCALE defines the locale being used for compilation. It is
 * used to select locale specific data to be compiled in js binary. BUILD rule
 * can specify this value by "--define goog.LOCALE=<locale_name>" as a compiler
 * option.
 *
 * Take into account that the locale code format is important. You should use
 * the canonical Unicode format with hyphen as a delimiter. Language must be
 * lowercase, Language Script - Capitalized, Region - UPPERCASE.
 * There are few examples: pt-BR, en, en-US, sr-Latin-BO, zh-Hans-CN.
 *
 * See more info about locale codes here:
 * http://www.unicode.org/reports/tr35/#Unicode_Language_and_Locale_Identifiers
 *
 * For language codes you should use values defined by ISO 693-1. See it here
 * http://www.w3.org/WAI/ER/IG/ert/iso639.htm. There is only one exception from
 * this rule: the Hebrew language. For legacy reasons the old code (iw) should
 * be used instead of the new code (he).
 *
 * MOE:begin_intracomment_strip
 * See http://g3doc/i18n/identifiers/g3doc/synonyms.
 * MOE:end_intracomment_strip
 */
goog.LOCALE = goog.define('goog.LOCALE', 'en');  // default to en


/**
 * @define {boolean} Whether this code is running on trusted sites.
 *
 * On untrusted sites, several native functions can be defined or overridden by
 * external libraries like Prototype, Datejs, and JQuery and setting this flag
 * to false forces closure to use its own implementations when possible.
 *
 * If your JavaScript can be loaded by a third party site and you are wary about
 * relying on non-standard implementations, specify
 * "--define goog.TRUSTED_SITE=false" to the compiler.
 */
goog.TRUSTED_SITE = goog.define('goog.TRUSTED_SITE', true);


/**
 * @define {boolean} Whether code that calls {@link goog.setTestOnly} should
 *     be disallowed in the compilation unit.
 */
goog.DISALLOW_TEST_ONLY_CODE =
    goog.define('goog.DISALLOW_TEST_ONLY_CODE', COMPILED && !goog.DEBUG);


/**
 * @define {boolean} Whether to use a Chrome app CSP-compliant method for
 *     loading scripts via goog.require. @see appendScriptSrcNode_.
 */
goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING =
    goog.define('goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING', false);


/**
 * Defines a namespace in Closure.
 *
 * A namespace may only be defined once in a codebase. It may be defined using
 * goog.provide() or goog.module().
 *
 * The presence of one or more goog.provide() calls in a file indicates
 * that the file defines the given objects/namespaces.
 * Provided symbols must not be null or undefined.
 *
 * In addition, goog.provide() creates the object stubs for a namespace
 * (for example, goog.provide("goog.foo.bar") will create the object
 * goog.foo.bar if it does not already exist).
 *
 * Build tools also scan for provide/require/module statements
 * to discern dependencies, build dependency files (see deps.js), etc.
 *
 * @see goog.require
 * @see goog.module
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part".
 * deprecated Use goog.module (see b/159289405)
 */
goog.provide = function(name) {
  if (goog.isInModuleLoader_()) {
    throw new Error('goog.provide cannot be used within a module.');
  }
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice.
    // A goog.module/goog.provide maps a goog.require to a specific file
    if (goog.isProvided_(name)) {
      throw new Error('Namespace "' + name + '" already declared.');
    }
  }

  goog.constructNamespace_(name);
};


/**
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part".
 * @param {?Object=} object The object to embed in the namespace.
 * @param {boolean=} overwriteImplicit If object is set and a previous call
 *     implicitly constructed the namespace given by name, this parameter
 *     controls whether opt_obj should overwrite the implicitly constructed
 *     namespace or be merged into it. Defaults to false.
 * @private
 */
goog.constructNamespace_ = function(name, object, overwriteImplicit) {
  if (!COMPILED) {
    delete goog.implicitNamespaces_[name];

    var namespace = name;
    while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
      if (goog.getObjectByName(namespace)) {
        break;
      }
      goog.implicitNamespaces_[namespace] = true;
    }
  }

  goog.exportPath_(name, object, overwriteImplicit);
};


/**
 * Returns CSP nonce, if set for any script tag.
 * @param {?Window=} opt_window The window context used to retrieve the nonce.
 *     Defaults to global context.
 * @return {string} CSP nonce or empty string if no nonce is present.
 */
goog.getScriptNonce = function(opt_window) {
  if (opt_window && opt_window != goog.global) {
    return goog.getScriptNonce_(opt_window.document);
  }
  if (goog.cspNonce_ === null) {
    goog.cspNonce_ = goog.getScriptNonce_(goog.global.document);
  }
  return goog.cspNonce_;
};


/**
 * According to the CSP3 spec a nonce must be a valid base64 string.
 * @see https://www.w3.org/TR/CSP3/#grammardef-base64-value
 * @private @const
 */
goog.NONCE_PATTERN_ = /^[\w+/_-]+[=]{0,2}$/;


/**
 * @private {?string}
 */
goog.cspNonce_ = null;


/**
 * Returns CSP nonce, if set for any script tag.
 * @param {!Document} doc
 * @return {string} CSP nonce or empty string if no nonce is present.
 * @private
 */
goog.getScriptNonce_ = function(doc) {
  var script = doc.querySelector && doc.querySelector('script[nonce]');
  if (script) {
    // Try to get the nonce from the IDL property first, because browsers that
    // implement additional nonce protection features (currently only Chrome) to
    // prevent nonce stealing via CSS do not expose the nonce via attributes.
    // See https://github.com/whatwg/html/issues/2369
    var nonce = script['nonce'] || script.getAttribute('nonce');
    if (nonce && goog.NONCE_PATTERN_.test(nonce)) {
      return nonce;
    }
  }
  return '';
};


/**
 * Module identifier validation regexp.
 * Note: This is a conservative check, it is very possible to be more lenient,
 *   the primary exclusion here is "/" and "\" and a leading ".", these
 *   restrictions are intended to leave the door open for using goog.require
 *   with relative file paths rather than module identifiers.
 * @private
 */
goog.VALID_MODULE_RE_ = /^[a-zA-Z_$][a-zA-Z0-9._$]*$/;


/**
 * Defines a module in Closure.
 *
 * Marks that this file must be loaded as a module and claims the namespace.
 *
 * A namespace may only be defined once in a codebase. It may be defined using
 * goog.provide() or goog.module().
 *
 * goog.module() has three requirements:
 * - goog.module may not be used in the same file as goog.provide.
 * - goog.module must be the first statement in the file.
 * - only one goog.module is allowed per file.
 *
 * When a goog.module annotated file is loaded, it is enclosed in
 * a strict function closure. This means that:
 * - any variables declared in a goog.module file are private to the file
 * (not global), though the compiler is expected to inline the module.
 * - The code must obey all the rules of "strict" JavaScript.
 * - the file will be marked as "use strict"
 *
 * NOTE: unlike goog.provide, goog.module does not declare any symbols by
 * itself. If declared symbols are desired, use
 * goog.module.declareLegacyNamespace().
 *
 * MOE:begin_intracomment_strip
 * See the goog.module announcement at http://go/goog.module-announce
 * MOE:end_intracomment_strip
 *
 * See the public goog.module proposal: http://goo.gl/Va1hin
 *
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part", is expected but not required.
 * @return {void}
 */
goog.module = function(name) {
  if (typeof name !== 'string' || !name ||
      name.search(goog.VALID_MODULE_RE_) == -1) {
    throw new Error('Invalid module identifier');
  }
  if (!goog.isInGoogModuleLoader_()) {
    throw new Error(
        'Module ' + name + ' has been loaded incorrectly. Note, ' +
        'modules cannot be loaded as normal scripts. They require some kind of ' +
        'pre-processing step. You\'re likely trying to load a module via a ' +
        'script tag or as a part of a concatenated bundle without rewriting the ' +
        'module. For more info see: ' +
        'https://github.com/google/closure-library/wiki/goog.module:-an-ES6-module-like-alternative-to-goog.provide.');
  }
  if (goog.moduleLoaderState_.moduleName) {
    throw new Error('goog.module may only be called once per module.');
  }

  // Store the module name for the loader.
  goog.moduleLoaderState_.moduleName = name;
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice.
    // A goog.module/goog.provide maps a goog.require to a specific file
    if (goog.isProvided_(name)) {
      throw new Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];
  }
};


/**
 * @param {string} name The module identifier.
 * @return {?} The module exports for an already loaded module or null.
 *
 * Note: This is not an alternative to goog.require, it does not
 * indicate a hard dependency, instead it is used to indicate
 * an optional dependency or to access the exports of a module
 * that has already been loaded.
 * @suppress {missingProvide}
 */
goog.module.get = function(name) {
  return goog.module.getInternal_(name);
};


/**
 * @param {string} name The module identifier.
 * @return {?} The module exports for an already loaded module or null.
 * @private
 */
goog.module.getInternal_ = function(name) {
  if (!COMPILED) {
    if (name in goog.loadedModules_) {
      return goog.loadedModules_[name].exports;
    } else if (!goog.implicitNamespaces_[name]) {
      var ns = goog.getObjectByName(name);
      return ns != null ? ns : null;
    }
  }
  return null;
};


/**
 * Types of modules the debug loader can load.
 * @enum {string}
 */
goog.ModuleType = {
  ES6: 'es6',
  GOOG: 'goog'
};


/**
 * @private {?{
 *   moduleName: (string|undefined),
 *   declareLegacyNamespace:boolean,
 *   type: ?goog.ModuleType
 * }}
 */
goog.moduleLoaderState_ = null;


/**
 * @private
 * @return {boolean} Whether a goog.module or an es6 module is currently being
 *     initialized.
 */
goog.isInModuleLoader_ = function() {
  return goog.isInGoogModuleLoader_() || goog.isInEs6ModuleLoader_();
};


/**
 * @private
 * @return {boolean} Whether a goog.module is currently being initialized.
 */
goog.isInGoogModuleLoader_ = function() {
  return !!goog.moduleLoaderState_ &&
      goog.moduleLoaderState_.type == goog.ModuleType.GOOG;
};


/**
 * @private
 * @return {boolean} Whether an es6 module is currently being initialized.
 */
goog.isInEs6ModuleLoader_ = function() {
  var inLoader = !!goog.moduleLoaderState_ &&
      goog.moduleLoaderState_.type == goog.ModuleType.ES6;

  if (inLoader) {
    return true;
  }

  var jscomp = goog.global['$jscomp'];

  if (jscomp) {
    // jscomp may not have getCurrentModulePath if this is a compiled bundle
    // that has some of the runtime, but not all of it. This can happen if
    // optimizations are turned on so the unused runtime is removed but renaming
    // and Closure pass are off (so $jscomp is still named $jscomp and the
    // goog.provide/require calls still exist).
    if (typeof jscomp.getCurrentModulePath != 'function') {
      return false;
    }

    // Bundled ES6 module.
    return !!jscomp.getCurrentModulePath();
  }

  return false;
};


/**
 * Provide the module's exports as a globally accessible object under the
 * module's declared name.  This is intended to ease migration to goog.module
 * for files that have existing usages.
 * @suppress {missingProvide}
 */
goog.module.declareLegacyNamespace = function() {
  if (!COMPILED && !goog.isInGoogModuleLoader_()) {
    throw new Error(
        'goog.module.declareLegacyNamespace must be called from ' +
        'within a goog.module');
  }
  if (!COMPILED && !goog.moduleLoaderState_.moduleName) {
    throw new Error(
        'goog.module must be called prior to ' +
        'goog.module.declareLegacyNamespace.');
  }
  goog.moduleLoaderState_.declareLegacyNamespace = true;
};


/**
 * Associates an ES6 module with a Closure module ID so that is available via
 * goog.require. The associated ID  acts like a goog.module ID - it does not
 * create any global names, it is merely available via goog.require /
 * goog.module.get / goog.forwardDeclare / goog.requireType. goog.require and
 * goog.module.get will return the entire module as if it was import *'d. This
 * allows Closure files to reference ES6 modules for the sake of migration.
 *
 * @param {string} namespace
 * @suppress {missingProvide}
 */
goog.declareModuleId = function(namespace) {
  if (!COMPILED) {
    if (!goog.isInEs6ModuleLoader_()) {
      throw new Error(
          'goog.declareModuleId may only be called from ' +
          'within an ES6 module');
    }
    if (goog.moduleLoaderState_ && goog.moduleLoaderState_.moduleName) {
      throw new Error(
          'goog.declareModuleId may only be called once per module.');
    }
    if (namespace in goog.loadedModules_) {
      throw new Error(
          'Module with namespace "' + namespace + '" already exists.');
    }
  }
  if (goog.moduleLoaderState_) {
    // Not bundled - debug loading.
    goog.moduleLoaderState_.moduleName = namespace;
  } else {
    // Bundled - not debug loading, no module loader state.
    var jscomp = goog.global['$jscomp'];
    if (!jscomp || typeof jscomp.getCurrentModulePath != 'function') {
      throw new Error(
          'Module with namespace "' + namespace +
          '" has been loaded incorrectly.');
    }
    var exports = jscomp.require(jscomp.getCurrentModulePath());
    goog.loadedModules_[namespace] = {
      exports: exports,
      type: goog.ModuleType.ES6,
      moduleId: namespace
    };
  }
};


/**
 * Marks that the current file should only be used for testing, and never for
 * live code in production.
 *
 * In the case of unit tests, the message may optionally be an exact namespace
 * for the test (e.g. 'goog.stringTest'). The linter will then ignore the extra
 * provide (if not explicitly defined in the code).
 *
 * @param {string=} opt_message Optional message to add to the error that's
 *     raised when used in production code.
 */
goog.setTestOnly = function(opt_message) {
  if (goog.DISALLOW_TEST_ONLY_CODE) {
    opt_message = opt_message || '';
    throw new Error(
        'Importing test-only code into non-debug environment' +
        (opt_message ? ': ' + opt_message : '.'));
  }
};


/**
 * Forward declares a symbol. This is an indication to the compiler that the
 * symbol may be used in the source yet is not required and may not be provided
 * in compilation.
 *
 * The most common usage of forward declaration is code that takes a type as a
 * function parameter but does not need to require it. By forward declaring
 * instead of requiring, no hard dependency is made, and (if not required
 * elsewhere) the namespace may never be required and thus, not be pulled
 * into the JavaScript binary. If it is required elsewhere, it will be type
 * checked as normal.
 *
 * Before using goog.forwardDeclare, please read the documentation at
 * https://github.com/google/closure-compiler/wiki/Bad-Type-Annotation to
 * understand the options and tradeoffs when working with forward declarations.
 *
 * @param {string} name The namespace to forward declare in the form of
 *     "goog.package.part".
 * @deprecated See go/noforwarddeclaration, Use `goog.requireType` instead.
 */
goog.forwardDeclare = function(name) {};


/**
 * Forward declare type information. Used to assign types to goog.global
 * referenced object that would otherwise result in unknown type references
 * and thus block property disambiguation.
 */
goog.forwardDeclare('Document');
goog.forwardDeclare('HTMLScriptElement');
goog.forwardDeclare('XMLHttpRequest');


if (!COMPILED) {
  /**
   * Check if the given name has been goog.provided. This will return false for
   * names that are available only as implicit namespaces.
   * @param {string} name name of the object to look for.
   * @return {boolean} Whether the name has been provided.
   * @private
   */
  goog.isProvided_ = function(name) {
    return (name in goog.loadedModules_) ||
        (!goog.implicitNamespaces_[name] && goog.getObjectByName(name) != null);
  };

  /**
   * Namespaces implicitly defined by goog.provide. For example,
   * goog.provide('goog.events.Event') implicitly declares that 'goog' and
   * 'goog.events' must be namespaces.
   *
   * @type {!Object<string, (boolean|undefined)>}
   * @private
   */
  goog.implicitNamespaces_ = {'goog.module': true};

  // NOTE: We add goog.module as an implicit namespace as goog.module is defined
  // here and because the existing module package has not been moved yet out of
  // the goog.module namespace. This satisifies both the debug loader and
  // ahead-of-time dependency management.
}


/**
 * Returns an object based on its fully qualified external name.  The object
 * is not found if null or undefined.  If you are using a compilation pass that
 * renames property names beware that using this function will not find renamed
 * properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object=} opt_obj The object within which to look; default is
 *     |goog.global|.
 * @return {?} The value (object or primitive) or, if not found, null.
 */
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || goog.global;
  for (var i = 0; i < parts.length; i++) {
    cur = cur[parts[i]];
    if (cur == null) {
      return null;
    }
  }
  return cur;
};


/**
 * Adds a dependency from a file to the files it requires.
 * @param {string} relPath The path to the js file.
 * @param {!Array<string>} provides An array of strings with
 *     the names of the objects this file provides.
 * @param {!Array<string>} requires An array of strings with
 *     the names of the objects this file requires.
 * @param {boolean|!Object<string>=} opt_loadFlags Parameters indicating
 *     how the file must be loaded.  The boolean 'true' is equivalent
 *     to {'module': 'goog'} for backwards-compatibility.  Valid properties
 *     and values include {'module': 'goog'} and {'lang': 'es6'}.
 */
goog.addDependency = function(relPath, provides, requires, opt_loadFlags) {
  if (!COMPILED && goog.DEPENDENCIES_ENABLED) {
    goog.debugLoader_.addDependency(relPath, provides, requires, opt_loadFlags);
  }
};


// MOE:begin_strip
/**
 * Whether goog.require should throw an exception if it fails.
 * @type {boolean}
 */
goog.useStrictRequires = false;


// MOE:end_strip


// NOTE(nnaze): The debug DOM loader was included in base.js as an original way
// to do "debug-mode" development.  The dependency system can sometimes be
// confusing, as can the debug DOM loader's asynchronous nature.
//
// With the DOM loader, a call to goog.require() is not blocking -- the script
// will not load until some point after the current script.  If a namespace is
// needed at runtime, it needs to be defined in a previous script, or loaded via
// require() with its registered dependencies.
//
// User-defined namespaces may need their own deps file. For a reference on
// creating a deps file, see:
// MOE:begin_strip
// Internally: http://go/deps-files and http://go/be#js_deps
// MOE:end_strip
// Externally: https://developers.google.com/closure/library/docs/depswriter
//
// Because of legacy clients, the DOM loader can't be easily removed from
// base.js.  Work was done to make it disableable or replaceable for
// different environments (DOM-less JavaScript interpreters like Rhino or V8,
// for example). See bootstrap/ for more information.


/**
 * @define {boolean} Whether to enable the debug loader.
 *
 * If enabled, a call to goog.require() will attempt to load the namespace by
 * appending a script tag to the DOM (if the namespace has been registered).
 *
 * If disabled, goog.require() will simply assert that the namespace has been
 * provided (and depend on the fact that some outside tool correctly ordered
 * the script).
 */
goog.ENABLE_DEBUG_LOADER = goog.define('goog.ENABLE_DEBUG_LOADER', true);


/**
 * @param {string} msg
 * @private
 */
goog.logToConsole_ = function(msg) {
  if (goog.global.console) {
    goog.global.console['error'](msg);
  }
};


/**
 * Implements a system for the dynamic resolution of dependencies that works in
 * parallel with the BUILD system.
 *
 * Note that all calls to goog.require will be stripped by the compiler.
 *
 * @see goog.provide
 * @param {string} namespace Namespace (as was given in goog.provide,
 *     goog.module, or goog.declareModuleId) in the form
 *     "goog.package.part".
 * @return {?} If called within a goog.module or ES6 module file, the associated
 *     namespace or module otherwise null.
 */
goog.require = function(namespace) {
  if (!COMPILED) {
    // Might need to lazy load on old IE.
    if (goog.ENABLE_DEBUG_LOADER) {
      goog.debugLoader_.requested(namespace);
    }

    // If the object already exists we do not need to do anything.
    if (goog.isProvided_(namespace)) {
      if (goog.isInModuleLoader_()) {
        return goog.module.getInternal_(namespace);
      }
    } else if (goog.ENABLE_DEBUG_LOADER) {
      var moduleLoaderState = goog.moduleLoaderState_;
      goog.moduleLoaderState_ = null;
      try {
        goog.debugLoader_.load_(namespace);
      } finally {
        goog.moduleLoaderState_ = moduleLoaderState;
      }
    }

    return null;
  }
};


/**
 * Requires a symbol for its type information. This is an indication to the
 * compiler that the symbol may appear in type annotations, yet it is not
 * referenced at runtime.
 *
 * When called within a goog.module or ES6 module file, the return value may be
 * assigned to or destructured into a variable, but it may not be otherwise used
 * in code outside of a type annotation.
 *
 * Note that all calls to goog.requireType will be stripped by the compiler.
 *
 * @param {string} namespace Namespace (as was given in goog.provide,
 *     goog.module, or goog.declareModuleId) in the form
 *     "goog.package.part".
 * @return {?}
 */
goog.requireType = function(namespace) {
  // Return an empty object so that single-level destructuring of the return
  // value doesn't crash at runtime when using the debug loader. Multi-level
  // destructuring isn't supported.
  return {};
};


/**
 * Path for included scripts.
 * @type {string}
 */
goog.basePath = '';


/**
 * A hook for overriding the base path.
 * @type {string|undefined}
 */
goog.global.CLOSURE_BASE_PATH;


/**
 * Whether to attempt to load Closure's deps file. By default, when uncompiled,
 * deps files will attempt to be loaded.
 * @type {boolean|undefined}
 */
goog.global.CLOSURE_NO_DEPS;


/**
 * A function to import a single script. This is meant to be overridden when
 * Closure is being run in non-HTML contexts, such as web workers. It's defined
 * in the global scope so that it can be set before base.js is loaded, which
 * allows deps.js to be imported properly.
 *
 * The first parameter the script source, which is a relative URI. The second,
 * optional parameter is the script contents, in the event the script needed
 * transformation. It should return true if the script was imported, false
 * otherwise.
 * @type {(function(string, string=): boolean)|undefined}
 */
goog.global.CLOSURE_IMPORT_SCRIPT;


/**
 * Null function used for default values of callbacks, etc.
 * @return {void} Nothing.
 * @deprecated use '()=>{}' or 'function(){}' instead.
 */
goog.nullFunction = function() {};


/**
 * When defining a class Foo with an abstract method bar(), you can do:
 * Foo.prototype.bar = goog.abstractMethod
 *
 * Now if a subclass of Foo fails to override bar(), an error will be thrown
 * when bar() is invoked.
 *
 * @type {!Function}
 * @throws {Error} when invoked to indicate the method should be overridden.
 * @deprecated Use "@abstract" annotation instead of goog.abstractMethod in new
 *     code. See
 *     https://github.com/google/closure-compiler/wiki/@abstract-classes-and-methods
 */
goog.abstractMethod = function() {
  throw new Error('unimplemented abstract method');
};


/**
 * Adds a `getInstance` static method that always returns the same
 * instance object.
 * @param {!Function} ctor The constructor for the class to add the static
 *     method to.
 * @suppress {missingProperties} 'instance_' isn't a property on 'Function'
 *     but we don't have a better type to use here.
 */
goog.addSingletonGetter = function(ctor) {
  // instance_ is immediately set to prevent issues with sealed constructors
  // such as are encountered when a constructor is returned as the export object
  // of a goog.module in unoptimized code.
  // Delcare type to avoid conformance violations that ctor.instance_ is unknown
  /** @type {undefined|!Object} @suppress {underscore} */
  ctor.instance_ = undefined;
  ctor.getInstance = function() {
    if (ctor.instance_) {
      return ctor.instance_;
    }
    if (goog.DEBUG) {
      // NOTE: JSCompiler can't optimize away Array#push.
      goog.instantiatedSingletons_[goog.instantiatedSingletons_.length] = ctor;
    }
    // Cast to avoid conformance violations that ctor.instance_ is unknown
    return /** @type {!Object|undefined} */ (ctor.instance_) = new ctor;
  };
};


/**
 * All singleton classes that have been instantiated, for testing. Don't read
 * it directly, use the `goog.testing.singleton` module. The compiler
 * removes this variable if unused.
 * @type {!Array<!Function>}
 * @private
 */
goog.instantiatedSingletons_ = [];


/**
 * @define {boolean} Whether to load goog.modules using `eval` when using
 * the debug loader.  This provides a better debugging experience as the
 * source is unmodified and can be edited using Chrome Workspaces or similar.
 * However in some environments the use of `eval` is banned
 * so we provide an alternative.
 */
goog.LOAD_MODULE_USING_EVAL = goog.define('goog.LOAD_MODULE_USING_EVAL', true);


/**
 * @define {boolean} Whether the exports of goog.modules should be sealed when
 * possible.
 */
goog.SEAL_MODULE_EXPORTS = goog.define('goog.SEAL_MODULE_EXPORTS', goog.DEBUG);


/**
 * The registry of initialized modules:
 * The module identifier or path to module exports map.
 * @private @const {!Object<string, {exports:?,type:string,moduleId:string}>}
 */
goog.loadedModules_ = {};


/**
 * True if the debug loader enabled and used.
 * @const {boolean}
 */
goog.DEPENDENCIES_ENABLED = !COMPILED && goog.ENABLE_DEBUG_LOADER;


/**
 * @define {string} How to decide whether to transpile.  Valid values
 * are 'always', 'never', and 'detect'.  The default ('detect') is to
 * use feature detection to determine which language levels need
 * transpilation.
 */
// NOTE(sdh): we could expand this to accept a language level to bypass
// detection: e.g. goog.TRANSPILE == 'es5' would transpile ES6 files but
// would leave ES3 and ES5 files alone.
goog.TRANSPILE = goog.define('goog.TRANSPILE', 'detect');

/**
 * @define {boolean} If true assume that ES modules have already been
 * transpiled by the jscompiler (in the same way that transpile.js would
 * transpile them - to jscomp modules). Useful only for servers that wish to use
 * the debug loader and transpile server side. Thus this is only respected if
 * goog.TRANSPILE is "never".
 */
goog.ASSUME_ES_MODULES_TRANSPILED =
    goog.define('goog.ASSUME_ES_MODULES_TRANSPILED', false);


/**
 * @define {string} If a file needs to be transpiled what the output language
 * should be. By default this is the highest language level this file detects
 * the current environment supports. Generally this flag should not be set, but
 * it could be useful to override. Example: If the current environment supports
 * ES6 then by default ES7+ files will be transpiled to ES6, unless this is
 * overridden.
 *
 * Valid values include: es3, es5, es6, es7, and es8. Anything not recognized
 * is treated as es3.
 *
 * Note that setting this value does not force transpilation. Just if
 * transpilation occurs this will be the output. So this is most useful when
 * goog.TRANSPILE is set to 'always' and then forcing the language level to be
 * something lower than what the environment detects.
 */
goog.TRANSPILE_TO_LANGUAGE = goog.define('goog.TRANSPILE_TO_LANGUAGE', '');


/**
 * @define {string} Path to the transpiler.  Executing the script at this
 * path (relative to base.js) should define a function $jscomp.transpile.
 */
goog.TRANSPILER = goog.define('goog.TRANSPILER', 'transpile.js');


/**
 * @package {?boolean}
 * Visible for testing.
 */
goog.hasBadLetScoping = null;


/**
 * @param {function(?):?|string} moduleDef The module definition.
 */
goog.loadModule = function(moduleDef) {
  // NOTE: we allow function definitions to be either in the from
  // of a string to eval (which keeps the original source intact) or
  // in a eval forbidden environment (CSP) we allow a function definition
  // which in its body must call `goog.module`, and return the exports
  // of the module.
  var previousState = goog.moduleLoaderState_;
  try {
    goog.moduleLoaderState_ = {
      moduleName: '',
      declareLegacyNamespace: false,
      type: goog.ModuleType.GOOG
    };
    var origExports = {};
    var exports = origExports;
    if (typeof moduleDef === 'function') {
      exports = moduleDef.call(undefined, exports);
    } else if (typeof moduleDef === 'string') {
      exports = goog.loadModuleFromSource_.call(undefined, exports, moduleDef);
    } else {
      throw new Error('Invalid module definition');
    }

    var moduleName = goog.moduleLoaderState_.moduleName;
    if (typeof moduleName === 'string' && moduleName) {
      // Don't seal legacy namespaces as they may be used as a parent of
      // another namespace
      if (goog.moduleLoaderState_.declareLegacyNamespace) {
        // Whether exports was overwritten via default export assignment.
        // This is important for legacy namespaces as it dictates whether
        // previously a previously loaded implicit namespace should be clobbered
        // or not.
        var isDefaultExport = origExports !== exports;
        goog.constructNamespace_(moduleName, exports, isDefaultExport);
      } else if (
          goog.SEAL_MODULE_EXPORTS && Object.seal &&
          typeof exports == 'object' && exports != null) {
        Object.seal(exports);
      }

      var data = {
        exports: exports,
        type: goog.ModuleType.GOOG,
        moduleId: goog.moduleLoaderState_.moduleName
      };
      goog.loadedModules_[moduleName] = data;
    } else {
      throw new Error('Invalid module name \"' + moduleName + '\"');
    }
  } finally {
    goog.moduleLoaderState_ = previousState;
  }
};


/**
 * @private @const
 */
goog.loadModuleFromSource_ =
    /** @type {function(!Object, string):?} */ (function(exports) {
      // NOTE: we avoid declaring parameters or local variables here to avoid
      // masking globals or leaking values into the module definition.
      'use strict';
      eval(goog.CLOSURE_EVAL_PREFILTER_.createScript(arguments[1]));
      return exports;
    });


/**
 * Normalize a file path by removing redundant ".." and extraneous "." file
 * path components.
 * @param {string} path
 * @return {string}
 * @private
 */
goog.normalizePath_ = function(path) {
  var components = path.split('/');
  var i = 0;
  while (i < components.length) {
    if (components[i] == '.') {
      components.splice(i, 1);
    } else if (
        i && components[i] == '..' && components[i - 1] &&
        components[i - 1] != '..') {
      components.splice(--i, 2);
    } else {
      i++;
    }
  }
  return components.join('/');
};


/**
 * Provides a hook for loading a file when using Closure's goog.require() API
 * with goog.modules.  In particular this hook is provided to support Node.js.
 *
 * @type {(function(string):string)|undefined}
 */
goog.global.CLOSURE_LOAD_FILE_SYNC;


/**
 * Loads file by synchronous XHR. Should not be used in production environments.
 * @param {string} src Source URL.
 * @return {?string} File contents, or null if load failed.
 * @private
 */
goog.loadFileSync_ = function(src) {
  if (goog.global.CLOSURE_LOAD_FILE_SYNC) {
    return goog.global.CLOSURE_LOAD_FILE_SYNC(src);
  } else {
    try {
      /** @type {XMLHttpRequest} */
      var xhr = new goog.global['XMLHttpRequest']();
      xhr.open('get', src, false);
      xhr.send();
      // NOTE: Successful http: requests have a status of 200, but successful
      // file: requests may have a status of zero.  Any other status, or a
      // thrown exception (particularly in case of file: requests) indicates
      // some sort of error, which we treat as a missing or unavailable file.
      return xhr.status == 0 || xhr.status == 200 ? xhr.responseText : null;
    } catch (err) {
      // No need to rethrow or log, since errors should show up on their own.
      return null;
    }
  }
};


/**
 * Lazily retrieves the transpiler and applies it to the source.
 * @param {string} code JS code.
 * @param {string} path Path to the code.
 * @param {string} target Language level output.
 * @return {string} The transpiled code.
 * @private
 */
goog.transpile_ = function(code, path, target) {
  var jscomp = goog.global['$jscomp'];
  if (!jscomp) {
    goog.global['$jscomp'] = jscomp = {};
  }
  var transpile = jscomp.transpile;
  if (!transpile) {
    var transpilerPath = goog.basePath + goog.TRANSPILER;
    var transpilerCode = goog.loadFileSync_(transpilerPath);
    if (transpilerCode) {
      // This must be executed synchronously, since by the time we know we
      // need it, we're about to load and write the ES6 code synchronously,
      // so a normal script-tag load will be too slow. Wrapped in a function
      // so that code is eval'd in the global scope.
      (function() {
        (0, eval)(transpilerCode + '\n//# sourceURL=' + transpilerPath);
      }).call(goog.global);
      // Even though the transpiler is optional, if $gwtExport is found, it's
      // a sign the transpiler was loaded and the $jscomp.transpile *should*
      // be there.
      if (goog.global['$gwtExport'] && goog.global['$gwtExport']['$jscomp'] &&
          !goog.global['$gwtExport']['$jscomp']['transpile']) {
        throw new Error(
            'The transpiler did not properly export the "transpile" ' +
            'method. $gwtExport: ' + JSON.stringify(goog.global['$gwtExport']));
      }
      // transpile.js only exports a single $jscomp function, transpile. We
      // grab just that and add it to the existing definition of $jscomp which
      // contains the polyfills.
      goog.global['$jscomp'].transpile =
          goog.global['$gwtExport']['$jscomp']['transpile'];
      jscomp = goog.global['$jscomp'];
      transpile = jscomp.transpile;
    }
  }
  if (!transpile) {
    // The transpiler is an optional component.  If it's not available then
    // replace it with a pass-through function that simply logs.
    var suffix = ' requires transpilation but no transpiler was found.';
    // MOE:begin_strip
    suffix +=  // Provide a more appropriate message internally.
        ' Please add "//javascript/closure:transpiler" as a data ' +
        'dependency to ensure it is included.';
    // MOE:end_strip
    transpile = jscomp.transpile = function(code, path) {
      // TODO(sdh): figure out some way to get this error to show up
      // in test results, noting that the failure may occur in many
      // different ways, including in loadModule() before the test
      // runner even comes up.
      goog.logToConsole_(path + suffix);
      return code;
    };
  }
  // Note: any transpilation errors/warnings will be logged to the console.
  return transpile(code, path, target);
};

//==============================================================================
// Language Enhancements
//==============================================================================


/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {?} value The value to get the type of.
 * @return {string} The name of the type.
 */
goog.typeOf = function(value) {
  var s = typeof value;

  if (s != 'object') {
    return s;
  }

  if (!value) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }
  return s;
};


/**
 * Returns true if the object looks like an array. To qualify as array like
 * the value needs to be either a NodeList or an object with a Number length
 * property. Note that for this function neither strings nor functions are
 * considered "array-like".
 *
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  // We do not use goog.isObject here in order to exclude function values.
  return type == 'array' || type == 'object' && typeof val.length == 'number';
};


/**
 * Returns true if the object looks like a Date. To qualify as Date-like the
 * value needs to be an object and have a getFullYear() function.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is a like a Date.
 */
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == 'function';
};


/**
 * Returns true if the specified value is an object.  This includes arrays and
 * functions.
 * @param {?} val Variable to test.
 * @return {boolean} Whether variable is an object.
 */
goog.isObject = function(val) {
  var type = typeof val;
  return type == 'object' && val != null || type == 'function';
  // return Object(val) === val also works, but is slower, especially if val is
  // not an object.
};


/**
 * Gets a unique ID for an object. This mutates the object so that further calls
 * with the same object as a parameter returns the same value. The unique ID is
 * guaranteed to be unique across the current session amongst objects that are
 * passed into `getUid`. There is no guarantee that the ID is unique or
 * consistent across sessions. It is unsafe to generate unique ID for function
 * prototypes.
 *
 * @param {Object} obj The object to get the unique ID for.
 * @return {number} The unique ID for the object.
 */
goog.getUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.
  return Object.prototype.hasOwnProperty.call(obj, goog.UID_PROPERTY_) &&
      obj[goog.UID_PROPERTY_] ||
      (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};


/**
 * Whether the given object is already assigned a unique ID.
 *
 * This does not modify the object.
 *
 * @param {!Object} obj The object to check.
 * @return {boolean} Whether there is an assigned unique id for the object.
 */
goog.hasUid = function(obj) {
  return !!obj[goog.UID_PROPERTY_];
};


/**
 * Removes the unique ID from an object. This is useful if the object was
 * previously mutated using `goog.getUid` in which case the mutation is
 * undone.
 * @param {Object} obj The object to remove the unique ID field from.
 */
goog.removeUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // In IE, DOM nodes are not instances of Object and throw an exception if we
  // try to delete.  Instead we try to use removeAttribute.
  if (obj !== null && 'removeAttribute' in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_);
  }

  try {
    delete obj[goog.UID_PROPERTY_];
  } catch (ex) {
  }
};


/**
 * Name for unique ID property. Initialized in a way to help avoid collisions
 * with other closure JavaScript on the same page.
 * @type {string}
 * @private
 */
goog.UID_PROPERTY_ = 'closure_uid_' + ((Math.random() * 1e9) >>> 0);


/**
 * Counter for UID.
 * @type {number}
 * @private
 */
goog.uidCounter_ = 0;


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.cloneObject</code> does not detect reference loops. Objects that
 * refer to themselves will cause infinite recursion.
 *
 * <code>goog.cloneObject</code> is unaware of unique identifiers, and copies
 * UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 * @deprecated goog.cloneObject is unsafe. Prefer the goog.object methods.
 */
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (typeof obj.clone === 'function') {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.cloneObject(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * A native implementation of goog.bind.
 * @param {?function(this:T, ...)} fn A function to partially apply.
 * @param {T} selfObj Specifies the object which this should point to when the
 *     function is run.
 * @param {...*} var_args Additional arguments that are partially applied to the
 *     function.
 * @return {!Function} A partially-applied form of the function goog.bind() was
 *     invoked as a method of.
 * @template T
 * @private
 */
goog.bindNative_ = function(fn, selfObj, var_args) {
  return /** @type {!Function} */ (fn.call.apply(fn.bind, arguments));
};


/**
 * A pure-JS implementation of goog.bind.
 * @param {?function(this:T, ...)} fn A function to partially apply.
 * @param {T} selfObj Specifies the object which this should point to when the
 *     function is run.
 * @param {...*} var_args Additional arguments that are partially applied to the
 *     function.
 * @return {!Function} A partially-applied form of the function goog.bind() was
 *     invoked as a method of.
 * @template T
 * @private
 */
goog.bindJs_ = function(fn, selfObj, var_args) {
  if (!fn) {
    throw new Error();
  }

  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs);
    };

  } else {
    return function() {
      return fn.apply(selfObj, arguments);
    };
  }
};


/**
 * Partially applies this function to a particular 'this object' and zero or
 * more arguments. The result is a new function with some arguments of the first
 * function pre-filled and the value of this 'pre-specified'.
 *
 * Remaining arguments specified at call-time are appended to the pre-specified
 * ones.
 *
 * Also see: {@link #partial}.
 *
 * Usage:
 * <pre>var barMethBound = goog.bind(myFunction, myObj, 'arg1', 'arg2');
 * barMethBound('arg3', 'arg4');</pre>
 *
 * @param {?function(this:T, ...)} fn A function to partially apply.
 * @param {T} selfObj Specifies the object which this should point to when the
 *     function is run.
 * @param {...*} var_args Additional arguments that are partially applied to the
 *     function.
 * @return {!Function} A partially-applied form of the function goog.bind() was
 *     invoked as a method of.
 * @template T
 * @suppress {deprecated} See above.
 * @deprecated use `=> {}` or Function.prototype.bind instead.
 */
goog.bind = function(fn, selfObj, var_args) {
  // TODO(nicksantos): narrow the type signature.
  if (Function.prototype.bind &&
      // NOTE(nicksantos): Somebody pulled base.js into the default Chrome
      // extension environment. This means that for Chrome extensions, they get
      // the implementation of Function.prototype.bind that calls goog.bind
      // instead of the native one. Even worse, we don't want to introduce a
      // circular dependency between goog.bind and Function.prototype.bind, so
      // we have to hack this to make sure it works correctly.
      Function.prototype.bind.toString().indexOf('native code') != -1) {
    goog.bind = goog.bindNative_;
  } else {
    goog.bind = goog.bindJs_;
  }
  return goog.bind.apply(null, arguments);
};


/**
 * Like goog.bind(), except that a 'this object' is not required. Useful when
 * the target function is already bound.
 *
 * Usage:
 * var g = goog.partial(f, arg1, arg2);
 * g(arg3, arg4);
 *
 * @param {Function} fn A function to partially apply.
 * @param {...*} var_args Additional arguments that are partially applied to fn.
 * @return {!Function} A partially-applied form of the function goog.partial()
 *     was invoked as a method of.
 */
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    // Clone the array (with slice()) and append additional arguments
    // to the existing arguments.
    var newArgs = args.slice();
    newArgs.push.apply(newArgs, arguments);
    return fn.apply(/** @type {?} */ (this), newArgs);
  };
};


/**
 * Copies all the members of a source object to a target object. This method
 * does not work on all browsers for all objects that contain keys such as
 * toString or hasOwnProperty. Use goog.object.extend for this purpose.
 *
 * NOTE: Some have advocated for the use of goog.mixin to setup classes
 * with multiple inheritence (traits, mixins, etc).  However, as it simply
 * uses "for in", this is not compatible with ES6 classes whose methods are
 * non-enumerable.  Changing this, would break cases where non-enumerable
 * properties are not expected.
 *
 * @param {Object} target Target.
 * @param {Object} source Source.
 * @deprecated Prefer Object.assign
 */
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }

  // For IE7 or lower, the for-in-loop does not contain any properties that are
  // not enumerable on the prototype object (for example, isPrototypeOf from
  // Object.prototype) but also it will not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
};


/**
 * @return {number} An integer value representing the number of milliseconds
 *     between midnight, January 1, 1970 and the current time.
 * @deprecated Use Date.now
 */
goog.now = function() {
  return Date.now();
};


/**
 * Evals JavaScript in the global scope.
 *
 * Throws an exception if neither execScript or eval is defined.
 * @param {string|!TrustedScript} script JavaScript string.
 */
goog.globalEval = function(script) {
  (0, eval)(script);
};


/**
 * Optional map of CSS class names to obfuscated names used with
 * goog.getCssName().
 * @private {!Object<string, string>|undefined}
 * @see goog.setCssNameMapping
 */
goog.cssNameMapping_;


/**
 * Optional obfuscation style for CSS class names. Should be set to either
 * 'BY_WHOLE' or 'BY_PART' if defined.
 * @type {string|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMappingStyle_;



/**
 * A hook for modifying the default behavior goog.getCssName. The function
 * if present, will receive the standard output of the goog.getCssName as
 * its input.
 *
 * @type {(function(string):string)|undefined}
 */
goog.global.CLOSURE_CSS_NAME_MAP_FN;


/**
 * Handles strings that are intended to be used as CSS class names.
 *
 * This function works in tandem with @see goog.setCssNameMapping.
 *
 * Without any mapping set, the arguments are simple joined with a hyphen and
 * passed through unaltered.
 *
 * When there is a mapping, there are two possible styles in which these
 * mappings are used. In the BY_PART style, each part (i.e. in between hyphens)
 * of the passed in css name is rewritten according to the map. In the BY_WHOLE
 * style, the full css name is looked up in the map directly. If a rewrite is
 * not specified by the map, the compiler will output a warning.
 *
 * When the mapping is passed to the compiler, it will replace calls to
 * goog.getCssName with the strings from the mapping, e.g.
 *     var x = goog.getCssName('foo');
 *     var y = goog.getCssName(this.baseClass, 'active');
 *  becomes:
 *     var x = 'foo';
 *     var y = this.baseClass + '-active';
 *
 * If one argument is passed it will be processed, if two are passed only the
 * modifier will be processed, as it is assumed the first argument was generated
 * as a result of calling goog.getCssName.
 *
 * @param {string} className The class name.
 * @param {string=} opt_modifier A modifier to be appended to the class name.
 * @return {string} The class name or the concatenation of the class name and
 *     the modifier.
 */
goog.getCssName = function(className, opt_modifier) {
  // String() is used for compatibility with compiled soy where the passed
  // className can be non-string objects.
  if (String(className).charAt(0) == '.') {
    throw new Error(
        'className passed in goog.getCssName must not start with ".".' +
        ' You passed: ' + className);
  }

  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName;
  };

  var renameByParts = function(cssName) {
    // Remap all the parts individually.
    var parts = cssName.split('-');
    var mapped = [];
    for (var i = 0; i < parts.length; i++) {
      mapped.push(getMapping(parts[i]));
    }
    return mapped.join('-');
  };

  var rename;
  if (goog.cssNameMapping_) {
    rename =
        goog.cssNameMappingStyle_ == 'BY_WHOLE' ? getMapping : renameByParts;
  } else {
    rename = function(a) {
      return a;
    };
  }

  var result =
      opt_modifier ? className + '-' + rename(opt_modifier) : rename(className);

  // The special CLOSURE_CSS_NAME_MAP_FN allows users to specify further
  // processing of the class name.
  if (goog.global.CLOSURE_CSS_NAME_MAP_FN) {
    return goog.global.CLOSURE_CSS_NAME_MAP_FN(result);
  }

  return result;
};


/**
 * Sets the map to check when returning a value from goog.getCssName(). Example:
 * <pre>
 * goog.setCssNameMapping({
 *   "goog": "a",
 *   "disabled": "b",
 * });
 *
 * var x = goog.getCssName('goog');
 * // The following evaluates to: "a a-b".
 * goog.getCssName('goog') + ' ' + goog.getCssName(x, 'disabled')
 * </pre>
 * When declared as a map of string literals to string literals, the JSCompiler
 * will replace all calls to goog.getCssName() using the supplied map if the
 * --process_closure_primitives flag is set.
 *
 * @param {!Object} mapping A map of strings to strings where keys are possible
 *     arguments to goog.getCssName() and values are the corresponding values
 *     that should be returned.
 * @param {string=} opt_style The style of css name mapping. There are two valid
 *     options: 'BY_PART', and 'BY_WHOLE'.
 * @see goog.getCssName for a description.
 */
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style;
};


/**
 * To use CSS renaming in compiled mode, one of the input files should have a
 * call to goog.setCssNameMapping() with an object literal that the JSCompiler
 * can extract and use to replace all calls to goog.getCssName(). In uncompiled
 * mode, JavaScript code should be loaded before this base.js file that declares
 * a global variable, CLOSURE_CSS_NAME_MAPPING, which is used below. This is
 * to ensure that the mapping is loaded before any calls to goog.getCssName()
 * are made in uncompiled mode.
 *
 * A hook for overriding the CSS name mapping.
 * @type {!Object<string, string>|undefined}
 */
goog.global.CLOSURE_CSS_NAME_MAPPING;


if (!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  // This does not call goog.setCssNameMapping() because the JSCompiler
  // requires that goog.setCssNameMapping() be called with an object literal.
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING;
}


/**
 * Gets a localized message.
 *
 * This function is a compiler primitive. If you give the compiler a localized
 * message bundle, it will replace the string at compile-time with a localized
 * version, and expand goog.getMsg call to a concatenated string.
 *
 * Messages must be initialized in the form:
 * <code>
 * var MSG_NAME = goog.getMsg('Hello {$placeholder}', {'placeholder': 'world'});
 * </code>
 *
 * This function produces a string which should be treated as plain text. Use
 * {@link goog.html.SafeHtmlFormatter} in conjunction with goog.getMsg to
 * produce SafeHtml.
 *
 * @param {string} str Translatable string, places holders in the form {$foo}.
 * @param {Object<string, string>=} opt_values Maps place holder name to value.
 * @param {{html: (boolean|undefined),
 *         unescapeHtmlEntities: (boolean|undefined)}=} opt_options Options:
 *     html: Escape '<' in str to '&lt;'. Used by Closure Templates where the
 *     generated code size and performance is critical which is why {@link
 *     goog.html.SafeHtmlFormatter} is not used. The value must be literal true
 *     or false.
 *     unescapeHtmlEntities: Unescape common html entities: &gt;, &lt;, &apos;,
 *     &quot; and &amp;. Used for messages not in HTML context, such as with
 *     `textContent` property.
 * @return {string} message with placeholders filled.
 */
goog.getMsg = function(str, opt_values, opt_options) {
  if (opt_options && opt_options.html) {
    // Note that '&' is not replaced because the translation can contain HTML
    // entities.
    str = str.replace(/</g, '&lt;');
  }
  if (opt_options && opt_options.unescapeHtmlEntities) {
    // Note that "&amp;" must be the last to avoid "creating" new entities.
    str = str.replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&apos;/g, '\'')
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&');
  }
  if (opt_values) {
    str = str.replace(/\{\$([^}]+)}/g, function(match, key) {
      return (opt_values != null && key in opt_values) ? opt_values[key] :
                                                         match;
    });
  }
  return str;
};


/**
 * Gets a localized message. If the message does not have a translation, gives a
 * fallback message.
 *
 * This is useful when introducing a new message that has not yet been
 * translated into all languages.
 *
 * This function is a compiler primitive. Must be used in the form:
 * <code>var x = goog.getMsgWithFallback(MSG_A, MSG_B);</code>
 * where MSG_A and MSG_B were initialized with goog.getMsg.
 *
 * @param {string} a The preferred message.
 * @param {string} b The fallback message.
 * @return {string} The best translated message.
 */
goog.getMsgWithFallback = function(a, b) {
  return a;
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated, unless they are
 * exported in turn via this function or goog.exportProperty.
 *
 * Also handy for making public items that are defined in anonymous closures.
 *
 * ex. goog.exportSymbol('public.path.Foo', Foo);
 *
 * ex. goog.exportSymbol('public.path.Foo.staticFunction', Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. goog.exportSymbol('public.path.Foo.prototype.myMethod',
 *                       Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {*} object Object the name should point to.
 * @param {?Object=} objectToExportTo The object to add the path to; default
 *     is goog.global.
 */
goog.exportSymbol = function(publicPath, object, objectToExportTo) {
  goog.exportPath_(
      publicPath, object, /* overwriteImplicit= */ true, objectToExportTo);
};


/**
 * Exports a property unobfuscated into the object's namespace.
 * ex. goog.exportProperty(Foo, 'staticFunction', Foo.staticFunction);
 * ex. goog.exportProperty(Foo.prototype, 'myMethod', Foo.prototype.myMethod);
 * @param {Object} object Object whose static property is being exported.
 * @param {string} publicName Unobfuscated name to export.
 * @param {*} symbol Object the name should point to.
 */
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { };
 *
 * function ChildClass(a, b, c) {
 *   ChildClass.base(this, 'constructor', a, b);
 * }
 * goog.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // This works.
 * </pre>
 *
 * @param {!Function} childCtor Child class.
 * @param {!Function} parentCtor Parent class.
 * @suppress {strictMissingProperties} superClass_ and base is not defined on
 *    Function.
 * @deprecated Use ECMAScript class syntax instead.
 */
goog.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {}
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  /** @override */
  childCtor.prototype.constructor = childCtor;

  /**
   * Calls superclass constructor/method.
   *
   * This function is only available if you use goog.inherits to
   * express inheritance relationships between classes.
   *
   * NOTE: This is a replacement for goog.base and for superClass_
   * property defined in childCtor.
   *
   * @param {!Object} me Should always be "this".
   * @param {string} methodName The method name to call. Calling
   *     superclass constructor can be done with the special string
   *     'constructor'.
   * @param {...*} var_args The arguments to pass to superclass
   *     method/constructor.
   * @return {*} The return value of the superclass method/constructor.
   */
  childCtor.base = function(me, methodName, var_args) {
    // Copying using loop to avoid deop due to passing arguments object to
    // function. This is faster in many JS engines as of late 2014.
    var args = new Array(arguments.length - 2);
    for (var i = 2; i < arguments.length; i++) {
      args[i - 2] = arguments[i];
    }
    return parentCtor.prototype[methodName].apply(me, args);
  };
};


/**
 * Allow for aliasing within scope functions.  This function exists for
 * uncompiled code - in compiled code the calls will be inlined and the aliases
 * applied.  In uncompiled code the function is simply run since the aliases as
 * written are valid JavaScript.
 *
 * MOE:begin_intracomment_strip
 * See the goog.scope document at http://go/goog.scope
 *
 * For more on goog.scope deprecation, see the style guide entry:
 * http://go/jsstyle#appendices-legacy-exceptions-goog-scope
 * MOE:end_intracomment_strip
 *
 * @param {function()} fn Function to call.  This function can contain aliases
 *     to namespaces (e.g. "var dom = goog.dom") or classes
 *     (e.g. "var Timer = goog.Timer").
 * @deprecated Use goog.module instead.
 */
goog.scope = function(fn) {
  if (goog.isInModuleLoader_()) {
    throw new Error('goog.scope is not supported within a module.');
  }
  fn.call(goog.global);
};


/*
 * To support uncompiled, strict mode bundles that use eval to divide source
 * like so:
 *    eval('someSource;//# sourceUrl sourcefile.js');
 * We need to export the globally defined symbols "goog" and "COMPILED".
 * Exporting "goog" breaks the compiler optimizations, so we required that
 * be defined externally.
 * NOTE: We don't use goog.exportSymbol here because we don't want to trigger
 * extern generation when that compiler option is enabled.
 */
if (!COMPILED) {
  goog.global['COMPILED'] = COMPILED;
}


//==============================================================================
// goog.defineClass implementation
//==============================================================================


/**
 * Creates a restricted form of a Closure "class":
 *   - from the compiler's perspective, the instance returned from the
 *     constructor is sealed (no new properties may be added).  This enables
 *     better checks.
 *   - the compiler will rewrite this definition to a form that is optimal
 *     for type checking and optimization (initially this will be a more
 *     traditional form).
 *
 * @param {Function} superClass The superclass, Object or null.
 * @param {goog.defineClass.ClassDescriptor} def
 *     An object literal describing
 *     the class.  It may have the following properties:
 *     "constructor": the constructor function
 *     "statics": an object literal containing methods to add to the constructor
 *        as "static" methods or a function that will receive the constructor
 *        function as its only parameter to which static properties can
 *        be added.
 *     all other properties are added to the prototype.
 * @return {!Function} The class constructor.
 * @deprecated Use ECMAScript class syntax instead.
 */
goog.defineClass = function(superClass, def) {
  // TODO(johnlenz): consider making the superClass an optional parameter.
  var constructor = def.constructor;
  var statics = def.statics;
  // Wrap the constructor prior to setting up the prototype and static methods.
  if (!constructor || constructor == Object.prototype.constructor) {
    constructor = function() {
      throw new Error(
          'cannot instantiate an interface (no constructor defined).');
    };
  }

  var cls = goog.defineClass.createSealingConstructor_(constructor, superClass);
  if (superClass) {
    goog.inherits(cls, superClass);
  }

  // Remove all the properties that should not be copied to the prototype.
  delete def.constructor;
  delete def.statics;

  goog.defineClass.applyProperties_(cls.prototype, def);
  if (statics != null) {
    if (statics instanceof Function) {
      statics(cls);
    } else {
      goog.defineClass.applyProperties_(cls, statics);
    }
  }

  return cls;
};


/**
 * @typedef {{
 *   constructor: (!Function|undefined),
 *   statics: (Object|undefined|function(Function):void)
 * }}
 */
goog.defineClass.ClassDescriptor;


/**
 * @define {boolean} Whether the instances returned by goog.defineClass should
 *     be sealed when possible.
 *
 * When sealing is disabled the constructor function will not be wrapped by
 * goog.defineClass, making it incompatible with ES6 class methods.
 */
goog.defineClass.SEAL_CLASS_INSTANCES =
    goog.define('goog.defineClass.SEAL_CLASS_INSTANCES', goog.DEBUG);


/**
 * If goog.defineClass.SEAL_CLASS_INSTANCES is enabled and Object.seal is
 * defined, this function will wrap the constructor in a function that seals the
 * results of the provided constructor function.
 *
 * @param {!Function} ctr The constructor whose results maybe be sealed.
 * @param {Function} superClass The superclass constructor.
 * @return {!Function} The replacement constructor.
 * @private
 */
goog.defineClass.createSealingConstructor_ = function(ctr, superClass) {
  if (!goog.defineClass.SEAL_CLASS_INSTANCES) {
    // Do now wrap the constructor when sealing is disabled. Angular code
    // depends on this for injection to work properly.
    return ctr;
  }

  // NOTE: The sealing behavior has been removed

  /**
   * @this {Object}
   * @return {?}
   */
  var wrappedCtr = function() {
    // Don't seal an instance of a subclass when it calls the constructor of
    // its super class as there is most likely still setup to do.
    var instance = ctr.apply(this, arguments) || this;
    instance[goog.UID_PROPERTY_] = instance[goog.UID_PROPERTY_];

    return instance;
  };

  return wrappedCtr;
};



// TODO(johnlenz): share these values with the goog.object
/**
 * The names of the fields that are defined on Object.prototype.
 * @type {!Array<string>}
 * @private
 * @const
 */
goog.defineClass.OBJECT_PROTOTYPE_FIELDS_ = [
  'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
  'toLocaleString', 'toString', 'valueOf'
];


// TODO(johnlenz): share this function with the goog.object
/**
 * @param {!Object} target The object to add properties to.
 * @param {!Object} source The object to copy properties from.
 * @private
 */
goog.defineClass.applyProperties_ = function(target, source) {
  // TODO(johnlenz): update this to support ES5 getters/setters

  var key;
  for (key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }

  // For IE the for-in-loop does not contain any properties that are not
  // enumerable on the prototype object (for example isPrototypeOf from
  // Object.prototype) and it will also not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
  for (var i = 0; i < goog.defineClass.OBJECT_PROTOTYPE_FIELDS_.length; i++) {
    key = goog.defineClass.OBJECT_PROTOTYPE_FIELDS_[i];
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }
};


// There's a bug in the compiler where without collapse properties the
// Closure namespace defines do not guard code correctly. To help reduce code
// size also check for !COMPILED even though it redundant until this is fixed.
if (!COMPILED && goog.DEPENDENCIES_ENABLED) {
  // MOE:begin_strip
  // TODO(b/67050526) This object is obsolete but some people are relying on
  // it internally. Keep it around until we migrate them.
  /**
   * @private
   * @type {{
   *   loadFlags: !Object<string, !Object<string, string>>,
   *   nameToPath: !Object<string, string>,
   *   requires: !Object<string, !Object<string, boolean>>,
   *   visited: !Object<string, boolean>,
   *   written: !Object<string, boolean>,
   *   deferred: !Object<string, string>
   * }}
   */
  goog.dependencies_ = {
    loadFlags: {},  // 1 to 1

    nameToPath: {},  // 1 to 1

    requires: {},  // 1 to many

    // Used when resolving dependencies to prevent us from visiting file
    // twice.
    visited: {},

    written: {},  // Used to keep track of script files we have written.

    deferred: {}  // Used to track deferred module evaluations in old IEs
  };

  /**
   * @return {!Object}
   * @private
   */
  goog.getLoader_ = function() {
    return {
      dependencies_: goog.dependencies_,
      writeScriptTag_: goog.writeScriptTag_
    };
  };


  /**
   * @param {string} src The script url.
   * @param {string=} opt_sourceText The optionally source text to evaluate
   * @return {boolean} True if the script was imported, false otherwise.
   * @private
   */
  goog.writeScriptTag_ = function(src, opt_sourceText) {
    if (goog.inHtmlDocument_()) {
      /** @type {!HTMLDocument} */
      var doc = goog.global.document;

      // If the user tries to require a new symbol after document load,
      // something has gone terribly wrong. Doing a document.write would
      // wipe out the page. This does not apply to the CSP-compliant method
      // of writing script tags.
      if (!goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING &&
          doc.readyState == 'complete') {
        // Certain test frameworks load base.js multiple times, which tries
        // to write deps.js each time. If that happens, just fail silently.
        // These frameworks wipe the page between each load of base.js, so this
        // is OK.
        var isDeps = /\bdeps.js$/.test(src);
        if (isDeps) {
          return false;
        } else {
          throw Error('Cannot write "' + src + '" after document load');
        }
      }

      var nonceAttr = '';
      var nonce = goog.getScriptNonce();
      if (nonce) {
        nonceAttr = ' nonce="' + nonce + '"';
      }

      if (opt_sourceText === undefined) {
        var script = '<script src="' + src + '"' + nonceAttr + '></' +
            'script>';
        doc.write(
            goog.TRUSTED_TYPES_POLICY_ ?
                goog.TRUSTED_TYPES_POLICY_.createHTML(script) :
                script);
      } else {
        var script = '<script' + nonceAttr + '>' +
            goog.protectScriptTag_(opt_sourceText) + '</' +
            'script>';
        doc.write(
            goog.TRUSTED_TYPES_POLICY_ ?
                goog.TRUSTED_TYPES_POLICY_.createHTML(script) :
                script);
      }
      return true;
    } else {
      return false;
    }
  };
  // MOE:end_strip


  /**
   * Tries to detect whether the current browser is Edge, based on the user
   * agent. This matches only pre-Chromium Edge.
   * @see https://docs.microsoft.com/en-us/microsoft-edge/web-platform/user-agent-string
   * @return {boolean} True if the current browser is Edge.
   * @private
   */
  goog.isEdge_ = function() {
    var userAgent = goog.global.navigator && goog.global.navigator.userAgent ?
        goog.global.navigator.userAgent :
        '';
    var edgeRe = /Edge\/(\d+)(\.\d)*/i;
    return !!userAgent.match(edgeRe);
  };


  /**
   * Tries to detect whether is in the context of an HTML document.
   * @return {boolean} True if it looks like HTML document.
   * @private
   */
  goog.inHtmlDocument_ = function() {
    /** @type {!Document} */
    var doc = goog.global.document;
    return doc != null && 'write' in doc;  // XULDocument misses write.
  };


  /**
   * We'd like to check for if the document readyState is 'loading'; however
   * there are bugs on IE 10 and below where the readyState being anything other
   * than 'complete' is not reliable.
   * @return {boolean}
   * @private
   */
  goog.isDocumentLoading_ = function() {
    // attachEvent is available on IE 6 thru 10 only, and thus can be used to
    // detect those browsers.
    /** @type {!HTMLDocument} */
    var doc = goog.global.document;
    return doc.attachEvent ? doc.readyState != 'complete' :
                             doc.readyState == 'loading';
  };


  /**
   * Tries to detect the base path of base.js script that bootstraps Closure.
   * @private
   */
  goog.findBasePath_ = function() {
    if (goog.global.CLOSURE_BASE_PATH != undefined &&
        // Anti DOM-clobbering runtime check (b/37736576).
        typeof goog.global.CLOSURE_BASE_PATH === 'string') {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else if (!goog.inHtmlDocument_()) {
      return;
    }
    /** @type {!Document} */
    var doc = goog.global.document;
    // If we have a currentScript available, use it exclusively.
    var currentScript = doc.currentScript;
    if (currentScript) {
      var scripts = [currentScript];
    } else {
      var scripts = doc.getElementsByTagName('SCRIPT');
    }
    // Search backwards since the current script is in almost all cases the one
    // that has base.js.
    for (var i = scripts.length - 1; i >= 0; --i) {
      var script = /** @type {!HTMLScriptElement} */ (scripts[i]);
      var src = script.src;
      var qmark = src.lastIndexOf('?');
      var l = qmark == -1 ? src.length : qmark;
      if (src.substr(l - 7, 7) == 'base.js') {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };

  goog.findBasePath_();

  /** @struct @constructor @final */
  goog.Transpiler = function() {
    /** @private {?Object<string, boolean>} */
    this.requiresTranspilation_ = null;
    /** @private {string} */
    this.transpilationTarget_ = goog.TRANSPILE_TO_LANGUAGE;
  };


  // MOE:begin_strip
  // LINT.IfChange
  // MOE:end_strip
  /**
   * Returns a newly created map from language mode string to a boolean
   * indicating whether transpilation should be done for that mode as well as
   * the highest level language that this environment supports.
   *
   * Guaranteed invariant:
   * For any two modes, l1 and l2 where l2 is a newer mode than l1,
   * `map[l1] == true` implies that `map[l2] == true`.
   *
   * Note this method is extracted and used elsewhere, so it cannot rely on
   * anything external (it should easily be able to be transformed into a
   * standalone, top level function).
   *
   * @private
   * @return {{
   *   target: string,
   *   map: !Object<string, boolean>
   * }}
   */
  goog.Transpiler.prototype.createRequiresTranspilation_ = function() {
    var transpilationTarget = 'es3';
    var /** !Object<string, boolean> */ requiresTranspilation = {'es3': false};
    var transpilationRequiredForAllLaterModes = false;

    /**
     * Adds an entry to requiresTranspliation for the given language mode.
     *
     * IMPORTANT: Calls must be made in order from oldest to newest language
     * mode.
     * @param {string} modeName
     * @param {function(): boolean} isSupported Returns true if the JS engine
     *     supports the given mode.
     */
    function addNewerLanguageTranspilationCheck(modeName, isSupported) {
      if (transpilationRequiredForAllLaterModes) {
        requiresTranspilation[modeName] = true;
      } else if (isSupported()) {
        transpilationTarget = modeName;
        requiresTranspilation[modeName] = false;
      } else {
        requiresTranspilation[modeName] = true;
        transpilationRequiredForAllLaterModes = true;
      }
    }

    /**
     * Does the given code evaluate without syntax errors and return a truthy
     * result?
     */
    function /** boolean */ evalCheck(/** string */ code) {
      try {
        return !!eval(code);
      } catch (ignored) {
        return false;
      }
    }

    // Identify ES3-only browsers by their incorrect treatment of commas.
    addNewerLanguageTranspilationCheck('es5', function() {
      return evalCheck('[1,].length==1');
    });
    addNewerLanguageTranspilationCheck('es6', function() {
      // Edge has a non-deterministic (i.e., not reproducible) bug with ES6:
      // https://github.com/Microsoft/ChakraCore/issues/1496.
      // MOE:begin_strip
      // TODO(joeltine): Our internal web-testing version of Edge will need to
      // be updated before we can remove this check. See http://b/34945376.
      // MOE:end_strip
      if (goog.isEdge_()) {
        // The Reflect.construct test below is flaky on Edge. It can sometimes
        // pass or fail on 40 15.15063, so just exit early for Edge and treat
        // it as ES5. Until we're on a more up to date version just always use
        // ES5. See https://github.com/Microsoft/ChakraCore/issues/3217.
        return false;
      }
      // Test es6: [FF50 (?), Edge 14 (?), Chrome 50]
      //   (a) default params (specifically shadowing locals),
      //   (b) destructuring, (c) block-scoped functions,
      //   (d) for-of (const), (e) new.target/Reflect.construct
      var es6fullTest =
          'class X{constructor(){if(new.target!=String)throw 1;this.x=42}}' +
          'let q=Reflect.construct(X,[],String);if(q.x!=42||!(q instanceof ' +
          'String))throw 1;for(const a of[2,3]){if(a==2)continue;function ' +
          'f(z={a}){let a=0;return z.a}{function f(){return 0;}}return f()' +
          '==3}';

      return evalCheck('(()=>{"use strict";' + es6fullTest + '})()');
    });
    // ** and **= are the only new features in 'es7'
    addNewerLanguageTranspilationCheck('es7', function() {
      return evalCheck('2**3==8');
    });
    // async functions are the only new features in 'es8'
    addNewerLanguageTranspilationCheck('es8', function() {
      return evalCheck('async()=>1,1');
    });
    addNewerLanguageTranspilationCheck('es9', function() {
      return evalCheck('({...rest}={}),1');
    });
    // optional catch binding, unescaped unicode paragraph separator in strings
    addNewerLanguageTranspilationCheck('es_2019', function() {
      return evalCheck('let r;try{throw 0}catch{r="\u2029"};r');
    });
    // optional chaining, nullish coalescing
    // untested/unsupported: bigint, import meta
    addNewerLanguageTranspilationCheck('es_2020', function() {
      return evalCheck('null?.x??1');
    });
    addNewerLanguageTranspilationCheck('es_next', function() {
      return false;  // assume it always need to transpile
    });
    return {target: transpilationTarget, map: requiresTranspilation};
  };
  // MOE:begin_strip
  // LINT.ThenChange(//depot/google3/java/com/google/testing/web/devtools/updatebrowserinfo/requires_transpilation.js)
  // MOE:end_strip


  /**
   * Determines whether the given language needs to be transpiled.
   * @param {string} lang
   * @param {string|undefined} module
   * @return {boolean}
   */
  goog.Transpiler.prototype.needsTranspile = function(lang, module) {
    if (goog.TRANSPILE == 'always') {
      return true;
    } else if (goog.TRANSPILE == 'never') {
      return false;
    } else if (!this.requiresTranspilation_) {
      var obj = this.createRequiresTranspilation_();
      this.requiresTranspilation_ = obj.map;
      this.transpilationTarget_ = this.transpilationTarget_ || obj.target;
    }
    if (lang in this.requiresTranspilation_) {
      if (this.requiresTranspilation_[lang]) {
        return true;
      } else if (
          goog.inHtmlDocument_() && module == 'es6' &&
          !('noModule' in goog.global.document.createElement('script'))) {
        return true;
      } else {
        return false;
      }
    } else {
      throw new Error('Unknown language mode: ' + lang);
    }
  };


  /**
   * Lazily retrieves the transpiler and applies it to the source.
   * @param {string} code JS code.
   * @param {string} path Path to the code.
   * @return {string} The transpiled code.
   */
  goog.Transpiler.prototype.transpile = function(code, path) {
    // TODO(johnplaisted): We should delete goog.transpile_ and just have this
    // function. But there's some compile error atm where goog.global is being
    // stripped incorrectly without this.
    return goog.transpile_(code, path, this.transpilationTarget_);
  };


  /** @private @final {!goog.Transpiler} */
  goog.transpiler_ = new goog.Transpiler();

  /**
   * Rewrites closing script tags in input to avoid ending an enclosing script
   * tag.
   *
   * @param {string} str
   * @return {string}
   * @private
   */
  goog.protectScriptTag_ = function(str) {
    return str.replace(/<\/(SCRIPT)/ig, '\\x3c/$1');
  };


  /**
   * A debug loader is responsible for downloading and executing javascript
   * files in an unbundled, uncompiled environment.
   *
   * This can be custimized via the setDependencyFactory method, or by
   * CLOSURE_IMPORT_SCRIPT/CLOSURE_LOAD_FILE_SYNC.
   *
   * @struct @constructor @final @private
   */
  goog.DebugLoader_ = function() {
    /** @private @const {!Object<string, !goog.Dependency>} */
    this.dependencies_ = {};
    /** @private @const {!Object<string, string>} */
    this.idToPath_ = {};
    /** @private @const {!Object<string, boolean>} */
    this.written_ = {};
    /** @private @const {!Array<!goog.Dependency>} */
    this.loadingDeps_ = [];
    /** @private {!Array<!goog.Dependency>} */
    this.depsToLoad_ = [];
    /** @private {boolean} */
    this.paused_ = false;
    /** @private {!goog.DependencyFactory} */
    this.factory_ = new goog.DependencyFactory(goog.transpiler_);
    /** @private @const {!Object<string, !Function>} */
    this.deferredCallbacks_ = {};
    /** @private @const {!Array<string>} */
    this.deferredQueue_ = [];
  };

  /**
   * @param {!Array<string>} namespaces
   * @param {function(): undefined} callback Function to call once all the
   *     namespaces have loaded.
   */
  goog.DebugLoader_.prototype.bootstrap = function(namespaces, callback) {
    var cb = callback;
    function resolve() {
      if (cb) {
        goog.global.setTimeout(cb, 0);
        cb = null;
      }
    }

    if (!namespaces.length) {
      resolve();
      return;
    }

    var deps = [];
    for (var i = 0; i < namespaces.length; i++) {
      var path = this.getPathFromDeps_(namespaces[i]);
      if (!path) {
        throw new Error('Unregonized namespace: ' + namespaces[i]);
      }
      deps.push(this.dependencies_[path]);
    }

    var require = goog.require;
    var loaded = 0;
    for (var i = 0; i < namespaces.length; i++) {
      require(namespaces[i]);
      deps[i].onLoad(function() {
        if (++loaded == namespaces.length) {
          resolve();
        }
      });
    }
  };


  /**
   * Loads the Closure Dependency file.
   *
   * Exposed a public function so CLOSURE_NO_DEPS can be set to false, base
   * loaded, setDependencyFactory called, and then this called. i.e. allows
   * custom loading of the deps file.
   */
  goog.DebugLoader_.prototype.loadClosureDeps = function() {
    // Circumvent addDependency, which would try to transpile deps.js if
    // transpile is set to always.
    var relPath = 'deps.js';
    this.depsToLoad_.push(this.factory_.createDependency(
        goog.normalizePath_(goog.basePath + relPath), relPath, [], [], {},
        false));
    this.loadDeps_();
  };


  /**
   * Notifies the debug loader when a dependency has been requested.
   *
   * @param {string} absPathOrId Path of the dependency or goog id.
   * @param {boolean=} opt_force
   */
  goog.DebugLoader_.prototype.requested = function(absPathOrId, opt_force) {
    var path = this.getPathFromDeps_(absPathOrId);
    if (path &&
        (opt_force || this.areDepsLoaded_(this.dependencies_[path].requires))) {
      var callback = this.deferredCallbacks_[path];
      if (callback) {
        delete this.deferredCallbacks_[path];
        callback();
      }
    }
  };


  /**
   * Sets the dependency factory, which can be used to create custom
   * goog.Dependency implementations to control how dependencies are loaded.
   *
   * @param {!goog.DependencyFactory} factory
   */
  goog.DebugLoader_.prototype.setDependencyFactory = function(factory) {
    this.factory_ = factory;
  };


  /**
   * Travserses the dependency graph and queues the given dependency, and all of
   * its transitive dependencies, for loading and then starts loading if not
   * paused.
   *
   * @param {string} namespace
   * @private
   */
  goog.DebugLoader_.prototype.load_ = function(namespace) {
    if (!this.getPathFromDeps_(namespace)) {
      var errorMessage = 'goog.require could not find: ' + namespace;
      goog.logToConsole_(errorMessage);
    } else {
      var loader = this;

      var deps = [];

      /** @param {string} namespace */
      var visit = function(namespace) {
        var path = loader.getPathFromDeps_(namespace);

        if (!path) {
          throw new Error('Bad dependency path or symbol: ' + namespace);
        }

        if (loader.written_[path]) {
          return;
        }

        loader.written_[path] = true;

        var dep = loader.dependencies_[path];
        // MOE:begin_strip
        if (goog.dependencies_.written[dep.relativePath]) {
          return;
        }
        // MOE:end_strip
        for (var i = 0; i < dep.requires.length; i++) {
          if (!goog.isProvided_(dep.requires[i])) {
            visit(dep.requires[i]);
          }
        }

        deps.push(dep);
      };

      visit(namespace);

      var wasLoading = !!this.depsToLoad_.length;
      this.depsToLoad_ = this.depsToLoad_.concat(deps);

      if (!this.paused_ && !wasLoading) {
        this.loadDeps_();
      }
    }
  };


  /**
   * Loads any queued dependencies until they are all loaded or paused.
   *
   * @private
   */
  goog.DebugLoader_.prototype.loadDeps_ = function() {
    var loader = this;
    var paused = this.paused_;

    while (this.depsToLoad_.length && !paused) {
      (function() {
        var loadCallDone = false;
        var dep = loader.depsToLoad_.shift();

        var loaded = false;
        loader.loading_(dep);

        var controller = {
          pause: function() {
            if (loadCallDone) {
              throw new Error('Cannot call pause after the call to load.');
            } else {
              paused = true;
            }
          },
          resume: function() {
            if (loadCallDone) {
              loader.resume_();
            } else {
              // Some dep called pause and then resume in the same load call.
              // Just keep running this same loop.
              paused = false;
            }
          },
          loaded: function() {
            if (loaded) {
              throw new Error('Double call to loaded.');
            }

            loaded = true;
            loader.loaded_(dep);
          },
          pending: function() {
            // Defensive copy.
            var pending = [];
            for (var i = 0; i < loader.loadingDeps_.length; i++) {
              pending.push(loader.loadingDeps_[i]);
            }
            return pending;
          },
          /**
           * @param {goog.ModuleType} type
           */
          setModuleState: function(type) {
            goog.moduleLoaderState_ = {
              type: type,
              moduleName: '',
              declareLegacyNamespace: false
            };
          },
          /** @type {function(string, string, string=)} */
          registerEs6ModuleExports: function(
              path, exports, opt_closureNamespace) {
            if (opt_closureNamespace) {
              goog.loadedModules_[opt_closureNamespace] = {
                exports: exports,
                type: goog.ModuleType.ES6,
                moduleId: opt_closureNamespace || ''
              };
            }
          },
          /** @type {function(string, ?)} */
          registerGoogModuleExports: function(moduleId, exports) {
            goog.loadedModules_[moduleId] = {
              exports: exports,
              type: goog.ModuleType.GOOG,
              moduleId: moduleId
            };
          },
          clearModuleState: function() {
            goog.moduleLoaderState_ = null;
          },
          defer: function(callback) {
            if (loadCallDone) {
              throw new Error(
                  'Cannot register with defer after the call to load.');
            }
            loader.defer_(dep, callback);
          },
          areDepsLoaded: function() {
            return loader.areDepsLoaded_(dep.requires);
          }
        };

        try {
          dep.load(controller);
        } finally {
          loadCallDone = true;
        }
      })();
    }

    if (paused) {
      this.pause_();
    }
  };


  /** @private */
  goog.DebugLoader_.prototype.pause_ = function() {
    this.paused_ = true;
  };


  /** @private */
  goog.DebugLoader_.prototype.resume_ = function() {
    if (this.paused_) {
      this.paused_ = false;
      this.loadDeps_();
    }
  };


  /**
   * Marks the given dependency as loading (load has been called but it has not
   * yet marked itself as finished). Useful for dependencies that want to know
   * what else is loading. Example: goog.modules cannot eval if there are
   * loading dependencies.
   *
   * @param {!goog.Dependency} dep
   * @private
   */
  goog.DebugLoader_.prototype.loading_ = function(dep) {
    this.loadingDeps_.push(dep);
  };


  /**
   * Marks the given dependency as having finished loading and being available
   * for require.
   *
   * @param {!goog.Dependency} dep
   * @private
   */
  goog.DebugLoader_.prototype.loaded_ = function(dep) {
    for (var i = 0; i < this.loadingDeps_.length; i++) {
      if (this.loadingDeps_[i] == dep) {
        this.loadingDeps_.splice(i, 1);
        break;
      }
    }

    for (var i = 0; i < this.deferredQueue_.length; i++) {
      if (this.deferredQueue_[i] == dep.path) {
        this.deferredQueue_.splice(i, 1);
        break;
      }
    }

    if (this.loadingDeps_.length == this.deferredQueue_.length &&
        !this.depsToLoad_.length) {
      // Something has asked to load these, but they may not be directly
      // required again later, so load them now that we know we're done loading
      // everything else. e.g. a goog module entry point.
      while (this.deferredQueue_.length) {
        this.requested(this.deferredQueue_.shift(), true);
      }
    }

    dep.loaded();
  };


  /**
   * @param {!Array<string>} pathsOrIds
   * @return {boolean}
   * @private
   */
  goog.DebugLoader_.prototype.areDepsLoaded_ = function(pathsOrIds) {
    for (var i = 0; i < pathsOrIds.length; i++) {
      var path = this.getPathFromDeps_(pathsOrIds[i]);
      if (!path ||
          (!(path in this.deferredCallbacks_) &&
           !goog.isProvided_(pathsOrIds[i]))) {
        return false;
      }
    }

    return true;
  };


  /**
   * @param {string} absPathOrId
   * @return {?string}
   * @private
   */
  goog.DebugLoader_.prototype.getPathFromDeps_ = function(absPathOrId) {
    if (absPathOrId in this.idToPath_) {
      return this.idToPath_[absPathOrId];
    } else if (absPathOrId in this.dependencies_) {
      return absPathOrId;
    } else {
      return null;
    }
  };


  /**
   * @param {!goog.Dependency} dependency
   * @param {!Function} callback
   * @private
   */
  goog.DebugLoader_.prototype.defer_ = function(dependency, callback) {
    this.deferredCallbacks_[dependency.path] = callback;
    this.deferredQueue_.push(dependency.path);
  };


  /**
   * Interface for goog.Dependency implementations to have some control over
   * loading of dependencies.
   *
   * @record
   */
  goog.LoadController = function() {};


  /**
   * Tells the controller to halt loading of more dependencies.
   */
  goog.LoadController.prototype.pause = function() {};


  /**
   * Tells the controller to resume loading of more dependencies if paused.
   */
  goog.LoadController.prototype.resume = function() {};


  /**
   * Tells the controller that this dependency has finished loading.
   *
   * This causes this to be removed from pending() and any load callbacks to
   * fire.
   */
  goog.LoadController.prototype.loaded = function() {};


  /**
   * List of dependencies on which load has been called but which have not
   * called loaded on their controller. This includes the current dependency.
   *
   * @return {!Array<!goog.Dependency>}
   */
  goog.LoadController.prototype.pending = function() {};


  /**
   * Registers an object as an ES6 module's exports so that goog.modules may
   * require it by path.
   *
   * @param {string} path Full path of the module.
   * @param {?} exports
   * @param {string=} opt_closureNamespace Closure namespace to associate with
   *     this module.
   */
  goog.LoadController.prototype.registerEs6ModuleExports = function(
      path, exports, opt_closureNamespace) {};


  /**
   * Sets the current module state.
   *
   * @param {goog.ModuleType} type Type of module.
   */
  goog.LoadController.prototype.setModuleState = function(type) {};


  /**
   * Clears the current module state.
   */
  goog.LoadController.prototype.clearModuleState = function() {};


  /**
   * Registers a callback to call once the dependency is actually requested
   * via goog.require + all of the immediate dependencies have been loaded or
   * all other files have been loaded. Allows for lazy loading until
   * require'd without pausing dependency loading, which is needed on old IE.
   *
   * @param {!Function} callback
   */
  goog.LoadController.prototype.defer = function(callback) {};


  /**
   * @return {boolean}
   */
  goog.LoadController.prototype.areDepsLoaded = function() {};


  /**
   * Basic super class for all dependencies Closure Library can load.
   *
   * This default implementation is designed to load untranspiled, non-module
   * scripts in a web broswer.
   *
   * For transpiled non-goog.module files {@see goog.TranspiledDependency}.
   * For goog.modules see {@see goog.GoogModuleDependency}.
   * For untranspiled ES6 modules {@see goog.Es6ModuleDependency}.
   *
   * @param {string} path Absolute path of this script.
   * @param {string} relativePath Path of this script relative to goog.basePath.
   * @param {!Array<string>} provides goog.provided or goog.module symbols
   *     in this file.
   * @param {!Array<string>} requires goog symbols or relative paths to Closure
   *     this depends on.
   * @param {!Object<string, string>} loadFlags
   * @struct @constructor
   */
  goog.Dependency = function(
      path, relativePath, provides, requires, loadFlags) {
    /** @const */
    this.path = path;
    /** @const */
    this.relativePath = relativePath;
    /** @const */
    this.provides = provides;
    /** @const */
    this.requires = requires;
    /** @const */
    this.loadFlags = loadFlags;
    /** @private {boolean} */
    this.loaded_ = false;
    /** @private {!Array<function()>} */
    this.loadCallbacks_ = [];
  };


  /**
   * @return {string} The pathname part of this dependency's path if it is a
   *     URI.
   */
  goog.Dependency.prototype.getPathName = function() {
    var pathName = this.path;
    var protocolIndex = pathName.indexOf('://');
    if (protocolIndex >= 0) {
      pathName = pathName.substring(protocolIndex + 3);
      var slashIndex = pathName.indexOf('/');
      if (slashIndex >= 0) {
        pathName = pathName.substring(slashIndex + 1);
      }
    }
    return pathName;
  };


  /**
   * @param {function()} callback Callback to fire as soon as this has loaded.
   * @final
   */
  goog.Dependency.prototype.onLoad = function(callback) {
    if (this.loaded_) {
      callback();
    } else {
      this.loadCallbacks_.push(callback);
    }
  };


  /**
   * Marks this dependency as loaded and fires any callbacks registered with
   * onLoad.
   * @final
   */
  goog.Dependency.prototype.loaded = function() {
    this.loaded_ = true;
    var callbacks = this.loadCallbacks_;
    this.loadCallbacks_ = [];
    for (var i = 0; i < callbacks.length; i++) {
      callbacks[i]();
    }
  };


  /**
   * Whether or not document.written / appended script tags should be deferred.
   *
   * @private {boolean}
   */
  goog.Dependency.defer_ = false;


  /**
   * Map of script ready / state change callbacks. Old IE cannot handle putting
   * these properties on goog.global.
   *
   * @private @const {!Object<string, function(?):undefined>}
   */
  goog.Dependency.callbackMap_ = {};


  /**
   * @param {function(...?):?} callback
   * @return {string}
   * @private
   */
  goog.Dependency.registerCallback_ = function(callback) {
    var key = Math.random().toString(32);
    goog.Dependency.callbackMap_[key] = callback;
    return key;
  };


  /**
   * @param {string} key
   * @private
   */
  goog.Dependency.unregisterCallback_ = function(key) {
    delete goog.Dependency.callbackMap_[key];
  };


  /**
   * @param {string} key
   * @param {...?} var_args
   * @private
   * @suppress {unusedPrivateMembers}
   */
  goog.Dependency.callback_ = function(key, var_args) {
    if (key in goog.Dependency.callbackMap_) {
      var callback = goog.Dependency.callbackMap_[key];
      var args = [];
      for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      callback.apply(undefined, args);
    } else {
      var errorMessage = 'Callback key ' + key +
          ' does not exist (was base.js loaded more than once?).';
      // MOE:begin_strip
      // TODO(johnplaisted): Some people internally are mistakenly loading
      // base.js twice, and this can happen while a dependency is loading,
      // wiping out state.
      goog.logToConsole_(errorMessage);
      // MOE:end_strip
      // MOE:insert throw Error(errorMessage);
    }
  };


  /**
   * Starts loading this dependency. This dependency can pause loading if it
   * needs to and resume it later via the controller interface.
   *
   * When this is loaded it should call controller.loaded(). Note that this will
   * end up calling the loaded method of this dependency; there is no need to
   * call it explicitly.
   *
   * @param {!goog.LoadController} controller
   */
  goog.Dependency.prototype.load = function(controller) {
    if (goog.global.CLOSURE_IMPORT_SCRIPT) {
      if (goog.global.CLOSURE_IMPORT_SCRIPT(this.path)) {
        controller.loaded();
      } else {
        controller.pause();
      }
      return;
    }

    if (!goog.inHtmlDocument_()) {
      goog.logToConsole_(
          'Cannot use default debug loader outside of HTML documents.');
      if (this.relativePath == 'deps.js') {
        // Some old code is relying on base.js auto loading deps.js failing with
        // no error before later setting CLOSURE_IMPORT_SCRIPT.
        // CLOSURE_IMPORT_SCRIPT should be set *before* base.js is loaded, or
        // CLOSURE_NO_DEPS set to true.
        goog.logToConsole_(
            'Consider setting CLOSURE_IMPORT_SCRIPT before loading base.js, ' +
            'or setting CLOSURE_NO_DEPS to true.');
        controller.loaded();
      } else {
        controller.pause();
      }
      return;
    }

    /** @type {!HTMLDocument} */
    var doc = goog.global.document;

    // If the user tries to require a new symbol after document load,
    // something has gone terribly wrong. Doing a document.write would
    // wipe out the page. This does not apply to the CSP-compliant method
    // of writing script tags.
    if (doc.readyState == 'complete' &&
        !goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING) {
      // Certain test frameworks load base.js multiple times, which tries
      // to write deps.js each time. If that happens, just fail silently.
      // These frameworks wipe the page between each load of base.js, so this
      // is OK.
      var isDeps = /\bdeps.js$/.test(this.path);
      if (isDeps) {
        controller.loaded();
        return;
      } else {
        throw Error('Cannot write "' + this.path + '" after document load');
      }
    }

    var nonce = goog.getScriptNonce();
    if (!goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING &&
        goog.isDocumentLoading_()) {
      var key;
      var callback = function(script) {
        if (script.readyState && script.readyState != 'complete') {
          script.onload = callback;
          return;
        }
        goog.Dependency.unregisterCallback_(key);
        controller.loaded();
      };
      key = goog.Dependency.registerCallback_(callback);

      var defer = goog.Dependency.defer_ ? ' defer' : '';
      var nonceAttr = nonce ? ' nonce="' + nonce + '"' : '';
      var script = '<script src="' + this.path + '"' + nonceAttr + defer +
          ' id="script-' + key + '"><\/script>';

      script += '<script' + nonceAttr + '>';

      if (goog.Dependency.defer_) {
        script += 'document.getElementById(\'script-' + key +
            '\').onload = function() {\n' +
            '  goog.Dependency.callback_(\'' + key + '\', this);\n' +
            '};\n';
      } else {
        script += 'goog.Dependency.callback_(\'' + key +
            '\', document.getElementById(\'script-' + key + '\'));';
      }

      script += '<\/script>';

      doc.write(
          goog.TRUSTED_TYPES_POLICY_ ?
              goog.TRUSTED_TYPES_POLICY_.createHTML(script) :
              script);
    } else {
      var scriptEl =
          /** @type {!HTMLScriptElement} */ (doc.createElement('script'));
      scriptEl.defer = goog.Dependency.defer_;
      scriptEl.async = false;

      // If CSP nonces are used, propagate them to dynamically created scripts.
      // This is necessary to allow nonce-based CSPs without 'strict-dynamic'.
      if (nonce) {
        scriptEl.nonce = nonce;
      }

      if (goog.DebugLoader_.IS_OLD_IE_) {
        // Execution order is not guaranteed on old IE, halt loading and write
        // these scripts one at a time, after each loads.
        controller.pause();
        scriptEl.onreadystatechange = function() {
          if (scriptEl.readyState == 'loaded' ||
              scriptEl.readyState == 'complete') {
            controller.loaded();
            controller.resume();
          }
        };
      } else {
        scriptEl.onload = function() {
          scriptEl.onload = null;
          controller.loaded();
        };
      }

      scriptEl.src = goog.TRUSTED_TYPES_POLICY_ ?
          goog.TRUSTED_TYPES_POLICY_.createScriptURL(this.path) :
          this.path;
      doc.head.appendChild(scriptEl);
    }
  };


  /**
   * @param {string} path Absolute path of this script.
   * @param {string} relativePath Path of this script relative to goog.basePath.
   * @param {!Array<string>} provides Should be an empty array.
   *     TODO(johnplaisted) add support for adding closure namespaces to ES6
   *     modules for interop purposes.
   * @param {!Array<string>} requires goog symbols or relative paths to Closure
   *     this depends on.
   * @param {!Object<string, string>} loadFlags
   * @struct @constructor
   * @extends {goog.Dependency}
   */
  goog.Es6ModuleDependency = function(
      path, relativePath, provides, requires, loadFlags) {
    goog.Es6ModuleDependency.base(
        this, 'constructor', path, relativePath, provides, requires, loadFlags);
  };
  goog.inherits(goog.Es6ModuleDependency, goog.Dependency);


  /**
   * @override
   * @param {!goog.LoadController} controller
   */
  goog.Es6ModuleDependency.prototype.load = function(controller) {
    if (goog.global.CLOSURE_IMPORT_SCRIPT) {
      if (goog.global.CLOSURE_IMPORT_SCRIPT(this.path)) {
        controller.loaded();
      } else {
        controller.pause();
      }
      return;
    }

    if (!goog.inHtmlDocument_()) {
      goog.logToConsole_(
          'Cannot use default debug loader outside of HTML documents.');
      controller.pause();
      return;
    }

    /** @type {!HTMLDocument} */
    var doc = goog.global.document;

    var dep = this;

    // TODO(johnplaisted): Does document.writing really speed up anything? Any
    // difference between this and just waiting for interactive mode and then
    // appending?
    function write(src, contents) {
      var nonceAttr = '';
      var nonce = goog.getScriptNonce();
      if (nonce) {
        nonceAttr = ' nonce="' + nonce + '"';
      }

      if (contents) {
        var script = '<script type="module" crossorigin' + nonceAttr + '>' +
            contents + '</' +
            'script>';
        doc.write(
            goog.TRUSTED_TYPES_POLICY_ ?
                goog.TRUSTED_TYPES_POLICY_.createHTML(script) :
                script);
      } else {
        var script = '<script type="module" crossorigin src="' + src + '"' +
            nonceAttr + '></' +
            'script>';
        doc.write(
            goog.TRUSTED_TYPES_POLICY_ ?
                goog.TRUSTED_TYPES_POLICY_.createHTML(script) :
                script);
      }
    }

    function append(src, contents) {
      var scriptEl =
          /** @type {!HTMLScriptElement} */ (doc.createElement('script'));
      scriptEl.defer = true;
      scriptEl.async = false;
      scriptEl.type = 'module';
      scriptEl.setAttribute('crossorigin', true);

      // If CSP nonces are used, propagate them to dynamically created scripts.
      // This is necessary to allow nonce-based CSPs without 'strict-dynamic'.
      var nonce = goog.getScriptNonce();
      if (nonce) {
        scriptEl.nonce = nonce;
      }

      if (contents) {
        scriptEl.text = goog.TRUSTED_TYPES_POLICY_ ?
            goog.TRUSTED_TYPES_POLICY_.createScript(contents) :
            contents;
      } else {
        scriptEl.src = goog.TRUSTED_TYPES_POLICY_ ?
            goog.TRUSTED_TYPES_POLICY_.createScriptURL(src) :
            src;
      }

      doc.head.appendChild(scriptEl);
    }

    var create;

    if (goog.isDocumentLoading_()) {
      create = write;
      // We can ONLY call document.write if we are guaranteed that any
      // non-module script tags document.written after this are deferred.
      // Small optimization, in theory document.writing is faster.
      goog.Dependency.defer_ = true;
    } else {
      create = append;
    }

    // Write 4 separate tags here:
    // 1) Sets the module state at the correct time (just before execution).
    // 2) A src node for this, which just hopefully lets the browser load it a
    //    little early (no need to parse #3).
    // 3) Import the module and register it.
    // 4) Clear the module state at the correct time. Guaranteed to run even
    //    if there is an error in the module (#3 will not run if there is an
    //    error in the module).
    var beforeKey = goog.Dependency.registerCallback_(function() {
      goog.Dependency.unregisterCallback_(beforeKey);
      controller.setModuleState(goog.ModuleType.ES6);
    });
    create(undefined, 'goog.Dependency.callback_("' + beforeKey + '")');

    // TODO(johnplaisted): Does this really speed up anything?
    create(this.path, undefined);

    var registerKey = goog.Dependency.registerCallback_(function(exports) {
      goog.Dependency.unregisterCallback_(registerKey);
      controller.registerEs6ModuleExports(
          dep.path, exports, goog.moduleLoaderState_.moduleName);
    });
    create(
        undefined,
        'import * as m from "' + this.path + '"; goog.Dependency.callback_("' +
            registerKey + '", m)');

    var afterKey = goog.Dependency.registerCallback_(function() {
      goog.Dependency.unregisterCallback_(afterKey);
      controller.clearModuleState();
      controller.loaded();
    });
    create(undefined, 'goog.Dependency.callback_("' + afterKey + '")');
  };


  /**
   * Superclass of any dependency that needs to be loaded into memory,
   * transformed, and then eval'd (goog.modules and transpiled files).
   *
   * @param {string} path Absolute path of this script.
   * @param {string} relativePath Path of this script relative to goog.basePath.
   * @param {!Array<string>} provides goog.provided or goog.module symbols
   *     in this file.
   * @param {!Array<string>} requires goog symbols or relative paths to Closure
   *     this depends on.
   * @param {!Object<string, string>} loadFlags
   * @struct @constructor @abstract
   * @extends {goog.Dependency}
   */
  goog.TransformedDependency = function(
      path, relativePath, provides, requires, loadFlags) {
    goog.TransformedDependency.base(
        this, 'constructor', path, relativePath, provides, requires, loadFlags);
    /** @private {?string} */
    this.contents_ = null;

    /**
     * Whether to lazily make the synchronous XHR (when goog.require'd) or make
     * the synchronous XHR when initially loading. On FireFox 61 there is a bug
     * where an ES6 module cannot make a synchronous XHR (rather, it can, but if
     * it does then no other ES6 modules will load after).
     *
     * tl;dr we lazy load due to bugs on older browsers and eager load due to
     * bugs on newer ones.
     *
     * https://bugzilla.mozilla.org/show_bug.cgi?id=1477090
     *
     * @private @const {boolean}
     */
    this.lazyFetch_ = !goog.inHtmlDocument_() ||
        !('noModule' in goog.global.document.createElement('script'));
  };
  goog.inherits(goog.TransformedDependency, goog.Dependency);


  /**
   * @override
   * @param {!goog.LoadController} controller
   */
  goog.TransformedDependency.prototype.load = function(controller) {
    var dep = this;

    function fetch() {
      dep.contents_ = goog.loadFileSync_(dep.path);

      if (dep.contents_) {
        dep.contents_ = dep.transform(dep.contents_);
        if (dep.contents_) {
          dep.contents_ += '\n//# sourceURL=' + dep.path;
        }
      }
    }

    if (goog.global.CLOSURE_IMPORT_SCRIPT) {
      fetch();
      if (this.contents_ &&
          goog.global.CLOSURE_IMPORT_SCRIPT('', this.contents_)) {
        this.contents_ = null;
        controller.loaded();
      } else {
        controller.pause();
      }
      return;
    }


    var isEs6 = this.loadFlags['module'] == goog.ModuleType.ES6;

    if (!this.lazyFetch_) {
      fetch();
    }

    function load() {
      if (dep.lazyFetch_) {
        fetch();
      }

      if (!dep.contents_) {
        // loadFileSync_ or transform are responsible. Assume they logged an
        // error.
        return;
      }

      if (isEs6) {
        controller.setModuleState(goog.ModuleType.ES6);
      }

      var namespace;

      try {
        var contents = dep.contents_;
        dep.contents_ = null;
        goog.globalEval(contents);
        if (isEs6) {
          namespace = goog.moduleLoaderState_.moduleName;
        }
      } finally {
        if (isEs6) {
          controller.clearModuleState();
        }
      }

      if (isEs6) {
        // Due to circular dependencies this may not be available for require
        // right now.
        goog.global['$jscomp']['require']['ensure'](
            [dep.getPathName()], function() {
              controller.registerEs6ModuleExports(
                  dep.path,
                  goog.global['$jscomp']['require'](dep.getPathName()),
                  namespace);
            });
      }

      controller.loaded();
    }

    // Do not fetch now; in FireFox 47 the synchronous XHR doesn't block all
    // events. If we fetched now and then document.write'd the contents the
    // document.write would be an eval and would execute too soon! Instead write
    // a script tag to fetch and eval synchronously at the correct time.
    function fetchInOwnScriptThenLoad() {
      /** @type {!HTMLDocument} */
      var doc = goog.global.document;

      var key = goog.Dependency.registerCallback_(function() {
        goog.Dependency.unregisterCallback_(key);
        load();
      });

      var nonce = goog.getScriptNonce();
      var nonceAttr = nonce ? ' nonce="' + nonce + '"' : '';
      var script = '<script' + nonceAttr + '>' +
          goog.protectScriptTag_('goog.Dependency.callback_("' + key + '");') +
          '</' +
          'script>';
      doc.write(
          goog.TRUSTED_TYPES_POLICY_ ?
              goog.TRUSTED_TYPES_POLICY_.createHTML(script) :
              script);
    }

    // If one thing is pending it is this.
    var anythingElsePending = controller.pending().length > 1;

    // If anything else is loading we need to lazy load due to bugs in old IE.
    // Specifically script tags with src and script tags with contents could
    // execute out of order if document.write is used, so we cannot use
    // document.write. Do not pause here; it breaks old IE as well.
    var useOldIeWorkAround =
        anythingElsePending && goog.DebugLoader_.IS_OLD_IE_;

    // Additionally if we are meant to defer scripts but the page is still
    // loading (e.g. an ES6 module is loading) then also defer. Or if we are
    // meant to defer and anything else is pending then defer (those may be
    // scripts that did not need transformation and are just script tags with
    // defer set to true, and we need to evaluate after that deferred script).
    var needsAsyncLoading = goog.Dependency.defer_ &&
        (anythingElsePending || goog.isDocumentLoading_());

    if (useOldIeWorkAround || needsAsyncLoading) {
      // Note that we only defer when we have to rather than 100% of the time.
      // Always defering would work, but then in theory the order of
      // goog.require calls would then matter. We want to enforce that most of
      // the time the order of the require calls does not matter.
      controller.defer(function() {
        load();
      });
      return;
    }
    // TODO(johnplaisted): Externs are missing onreadystatechange for
    // HTMLDocument.
    /** @type {?} */
    var doc = goog.global.document;

    var isInternetExplorerOrEdge = goog.inHtmlDocument_() &&
        ('ActiveXObject' in goog.global || goog.isEdge_());

    // Don't delay in any version of IE or pre-Chromium Edge. There's a bug
    // around this that will cause out of order script execution. This means
    // that on older IE ES6 modules will load too early (while the document is
    // still loading + the dom is not available). The other option is to load
    // too late (when the document is complete and the onload even will never
    // fire). This seems to be the lesser of two evils as scripts already act
    // like the former.
    if (isEs6 && goog.inHtmlDocument_() && goog.isDocumentLoading_() &&
        !isInternetExplorerOrEdge) {
      goog.Dependency.defer_ = true;
      // Transpiled ES6 modules still need to load like regular ES6 modules,
      // aka only after the document is interactive.
      controller.pause();
      var oldCallback = doc.onreadystatechange;
      doc.onreadystatechange = function() {
        if (doc.readyState == 'interactive') {
          doc.onreadystatechange = oldCallback;
          load();
          controller.resume();
        }
        if (typeof oldCallback === 'function') {
          oldCallback.apply(undefined, arguments);
        }
      };
    } else {
      // Always eval on old IE.
      if (goog.DebugLoader_.IS_OLD_IE_ || !goog.inHtmlDocument_() ||
          !goog.isDocumentLoading_()) {
        load();
      } else {
        fetchInOwnScriptThenLoad();
      }
    }
  };


  /**
   * @param {string} contents
   * @return {string}
   * @abstract
   */
  goog.TransformedDependency.prototype.transform = function(contents) {};


  /**
   * Any non-goog.module dependency which needs to be transpiled before eval.
   *
   * @param {string} path Absolute path of this script.
   * @param {string} relativePath Path of this script relative to goog.basePath.
   * @param {!Array<string>} provides goog.provided or goog.module symbols
   *     in this file.
   * @param {!Array<string>} requires goog symbols or relative paths to Closure
   *     this depends on.
   * @param {!Object<string, string>} loadFlags
   * @param {!goog.Transpiler} transpiler
   * @struct @constructor
   * @extends {goog.TransformedDependency}
   */
  goog.TranspiledDependency = function(
      path, relativePath, provides, requires, loadFlags, transpiler) {
    goog.TranspiledDependency.base(
        this, 'constructor', path, relativePath, provides, requires, loadFlags);
    /** @protected @const*/
    this.transpiler = transpiler;
  };
  goog.inherits(goog.TranspiledDependency, goog.TransformedDependency);


  /**
   * @override
   * @param {string} contents
   * @return {string}
   */
  goog.TranspiledDependency.prototype.transform = function(contents) {
    // Transpile with the pathname so that ES6 modules are domain agnostic.
    return this.transpiler.transpile(contents, this.getPathName());
  };


  /**
   * An ES6 module dependency that was transpiled to a jscomp module outside
   * of the debug loader, e.g. server side.
   *
   * @param {string} path Absolute path of this script.
   * @param {string} relativePath Path of this script relative to goog.basePath.
   * @param {!Array<string>} provides goog.provided or goog.module symbols
   *     in this file.
   * @param {!Array<string>} requires goog symbols or relative paths to Closure
   *     this depends on.
   * @param {!Object<string, string>} loadFlags
   * @struct @constructor
   * @extends {goog.TransformedDependency}
   */
  goog.PreTranspiledEs6ModuleDependency = function(
      path, relativePath, provides, requires, loadFlags) {
    goog.PreTranspiledEs6ModuleDependency.base(
        this, 'constructor', path, relativePath, provides, requires, loadFlags);
  };
  goog.inherits(
      goog.PreTranspiledEs6ModuleDependency, goog.TransformedDependency);


  /**
   * @override
   * @param {string} contents
   * @return {string}
   */
  goog.PreTranspiledEs6ModuleDependency.prototype.transform = function(
      contents) {
    return contents;
  };


  /**
   * A goog.module, transpiled or not. Will always perform some minimal
   * transformation even when not transpiled to wrap in a goog.loadModule
   * statement.
   *
   * @param {string} path Absolute path of this script.
   * @param {string} relativePath Path of this script relative to goog.basePath.
   * @param {!Array<string>} provides goog.provided or goog.module symbols
   *     in this file.
   * @param {!Array<string>} requires goog symbols or relative paths to Closure
   *     this depends on.
   * @param {!Object<string, string>} loadFlags
   * @param {boolean} needsTranspile
   * @param {!goog.Transpiler} transpiler
   * @struct @constructor
   * @extends {goog.TransformedDependency}
   */
  goog.GoogModuleDependency = function(
      path, relativePath, provides, requires, loadFlags, needsTranspile,
      transpiler) {
    goog.GoogModuleDependency.base(
        this, 'constructor', path, relativePath, provides, requires, loadFlags);
    /** @private @const */
    this.needsTranspile_ = needsTranspile;
    /** @private @const */
    this.transpiler_ = transpiler;
  };
  goog.inherits(goog.GoogModuleDependency, goog.TransformedDependency);


  /**
   * @override
   * @param {string} contents
   * @return {string}
   */
  goog.GoogModuleDependency.prototype.transform = function(contents) {
    if (this.needsTranspile_) {
      contents = this.transpiler_.transpile(contents, this.getPathName());
    }

    if (!goog.LOAD_MODULE_USING_EVAL || goog.global.JSON === undefined) {
      return '' +
          'goog.loadModule(function(exports) {' +
          '"use strict";' + contents +
          '\n' +  // terminate any trailing single line comment.
          ';return exports' +
          '});' +
          '\n//# sourceURL=' + this.path + '\n';
    } else {
      return '' +
          'goog.loadModule(' +
          goog.global.JSON.stringify(
              contents + '\n//# sourceURL=' + this.path + '\n') +
          ');';
    }
  };


  /**
   * Whether the browser is IE9 or earlier, which needs special handling
   * for deferred modules.
   * @const @private {boolean}
   */
  goog.DebugLoader_.IS_OLD_IE_ = !!(
      !goog.global.atob && goog.global.document && goog.global.document['all']);


  /**
   * @param {string} relPath
   * @param {!Array<string>|undefined} provides
   * @param {!Array<string>} requires
   * @param {boolean|!Object<string>=} opt_loadFlags
   * @see goog.addDependency
   */
  goog.DebugLoader_.prototype.addDependency = function(
      relPath, provides, requires, opt_loadFlags) {
    provides = provides || [];
    relPath = relPath.replace(/\\/g, '/');
    var path = goog.normalizePath_(goog.basePath + relPath);
    if (!opt_loadFlags || typeof opt_loadFlags === 'boolean') {
      opt_loadFlags = opt_loadFlags ? {'module': goog.ModuleType.GOOG} : {};
    }
    var dep = this.factory_.createDependency(
        path, relPath, provides, requires, opt_loadFlags,
        goog.transpiler_.needsTranspile(
            opt_loadFlags['lang'] || 'es3', opt_loadFlags['module']));
    this.dependencies_[path] = dep;
    for (var i = 0; i < provides.length; i++) {
      this.idToPath_[provides[i]] = path;
    }
    this.idToPath_[relPath] = path;
  };


  /**
   * Creates goog.Dependency instances for the debug loader to load.
   *
   * Should be overridden to have the debug loader use custom subclasses of
   * goog.Dependency.
   *
   * @param {!goog.Transpiler} transpiler
   * @struct @constructor
   */
  goog.DependencyFactory = function(transpiler) {
    /** @protected @const */
    this.transpiler = transpiler;
  };


  /**
   * @param {string} path Absolute path of the file.
   * @param {string} relativePath Path relative to closure’s base.js.
   * @param {!Array<string>} provides Array of provided goog.provide/module ids.
   * @param {!Array<string>} requires Array of required goog.provide/module /
   *     relative ES6 module paths.
   * @param {!Object<string, string>} loadFlags
   * @param {boolean} needsTranspile True if the file needs to be transpiled
   *     per the goog.Transpiler.
   * @return {!goog.Dependency}
   */
  goog.DependencyFactory.prototype.createDependency = function(
      path, relativePath, provides, requires, loadFlags, needsTranspile) {
    // MOE:begin_strip
    var provide, require;
    for (var i = 0; provide = provides[i]; i++) {
      goog.dependencies_.nameToPath[provide] = relativePath;
      goog.dependencies_.loadFlags[relativePath] = loadFlags;
    }
    for (var j = 0; require = requires[j]; j++) {
      if (!(relativePath in goog.dependencies_.requires)) {
        goog.dependencies_.requires[relativePath] = {};
      }
      goog.dependencies_.requires[relativePath][require] = true;
    }
    // MOE:end_strip

    if (loadFlags['module'] == goog.ModuleType.GOOG) {
      return new goog.GoogModuleDependency(
          path, relativePath, provides, requires, loadFlags, needsTranspile,
          this.transpiler);
    } else if (needsTranspile) {
      return new goog.TranspiledDependency(
          path, relativePath, provides, requires, loadFlags, this.transpiler);
    } else {
      if (loadFlags['module'] == goog.ModuleType.ES6) {
        if (goog.TRANSPILE == 'never' && goog.ASSUME_ES_MODULES_TRANSPILED) {
          return new goog.PreTranspiledEs6ModuleDependency(
              path, relativePath, provides, requires, loadFlags);
        } else {
          return new goog.Es6ModuleDependency(
              path, relativePath, provides, requires, loadFlags);
        }
      } else {
        return new goog.Dependency(
            path, relativePath, provides, requires, loadFlags);
      }
    }
  };


  /** @private @const */
  goog.debugLoader_ = new goog.DebugLoader_();


  /**
   * Loads the Closure Dependency file.
   *
   * Exposed a public function so CLOSURE_NO_DEPS can be set to false, base
   * loaded, setDependencyFactory called, and then this called. i.e. allows
   * custom loading of the deps file.
   */
  goog.loadClosureDeps = function() {
    goog.debugLoader_.loadClosureDeps();
  };


  /**
   * Sets the dependency factory, which can be used to create custom
   * goog.Dependency implementations to control how dependencies are loaded.
   *
   * Note: if you wish to call this function and provide your own implemnetation
   * it is a wise idea to set CLOSURE_NO_DEPS to true, otherwise the dependency
   * file and all of its goog.addDependency calls will use the default factory.
   * You can call goog.loadClosureDeps to load the Closure dependency file
   * later, after your factory is injected.
   *
   * @param {!goog.DependencyFactory} factory
   */
  goog.setDependencyFactory = function(factory) {
    goog.debugLoader_.setDependencyFactory(factory);
  };


  /**
   * Trusted Types policy for the debug loader.
   * @private @const {?TrustedTypePolicy}
   */
  goog.TRUSTED_TYPES_POLICY_ = goog.TRUSTED_TYPES_POLICY_NAME ?
      goog.createTrustedTypesPolicy(goog.TRUSTED_TYPES_POLICY_NAME + '#base') :
      null;

  if (!goog.global.CLOSURE_NO_DEPS) {
    goog.debugLoader_.loadClosureDeps();
  }


  /**
   * Bootstraps the given namespaces and calls the callback once they are
   * available either via goog.require. This is a replacement for using
   * `goog.require` to bootstrap Closure JavaScript. Previously a `goog.require`
   * in an HTML file would guarantee that the require'd namespace was available
   * in the next immediate script tag. With ES6 modules this no longer a
   * guarantee.
   *
   * @param {!Array<string>} namespaces
   * @param {function(): ?} callback Function to call once all the namespaces
   *     have loaded. Always called asynchronously.
   */
  goog.bootstrap = function(namespaces, callback) {
    goog.debugLoader_.bootstrap(namespaces, callback);
  };
}


/**
 * @define {string} Trusted Types policy name. If non-empty then Closure will
 * use Trusted Types.
 */
goog.TRUSTED_TYPES_POLICY_NAME =
    goog.define('goog.TRUSTED_TYPES_POLICY_NAME', 'goog');


/**
 * Returns the parameter.
 * @param {string} s
 * @return {string}
 * @private
 */
goog.identity_ = function(s) {
  return s;
};


/**
 * Creates Trusted Types policy if Trusted Types are supported by the browser.
 * The policy just blesses any string as a Trusted Type. It is not visibility
 * restricted because anyone can also call trustedTypes.createPolicy directly.
 * However, the allowed names should be restricted by a HTTP header and the
 * reference to the created policy should be visibility restricted.
 * @param {string} name
 * @return {?TrustedTypePolicy}
 */
goog.createTrustedTypesPolicy = function(name) {
  var policy = null;
  var policyFactory = goog.global.trustedTypes;
  if (!policyFactory || !policyFactory.createPolicy) {
    return policy;
  }
  // trustedTypes.createPolicy throws if called with a name that is already
  // registered, even in report-only mode. Until the API changes, catch the
  // error not to break the applications functionally. In such case, the code
  // will fall back to using regular Safe Types.
  // TODO(koto): Remove catching once createPolicy API stops throwing.
  try {
    policy = policyFactory.createPolicy(name, {
      createHTML: goog.identity_,
      createScript: goog.identity_,
      createScriptURL: goog.identity_
    });
  } catch (e) {
    goog.logToConsole_(e.message);
  }
  return policy;
};

if (!COMPILED) {
  var isChrome87 = false;
  // Cannot run check for Chrome <87 bug in case of strict CSP environments.
  // TODO(aaronshim): Remove once Chrome <87 bug is no longer a problem.
  try {
    isChrome87 = eval(goog.global.trustedTypes.emptyScript) !==
        goog.global.trustedTypes.emptyScript;
  } catch (err) {
  }

  /**
   * Trusted Types for running dev servers.
   *
   * @private @const
   */
  goog.CLOSURE_EVAL_PREFILTER_ =
      // Detect Chrome <87 bug with TT and eval.
      goog.global.trustedTypes && isChrome87 &&
          goog.createTrustedTypesPolicy('goog#base#devonly#eval') ||
      {createScript: goog.identity_};
}

//third_party/javascript/tslib/tslib_closure.js
goog.loadModule(function(exports) {'use strict';/**
 * @fileoverview
 * Hand-modified Closure version of tslib.js.
 * These use the literal space optimized code from TypeScript for
 * compatibility.
 *
 * @suppress {undefinedVars}
 */

// Do not use @license

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

goog.module('google3.third_party.javascript.tslib.tslib');

/** @suppress {missingPolyfill} the code below intentionally feature-tests. */
var extendStatics = Object.setPrototypeOf ||
    ({__proto__: []} instanceof Array && function(d, b) {d.__proto__ = b;}) ||
    function(d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

/**
 * @param {?} d
 * @param {?} b
 */
exports.__extends = function(d, b) {
    extendStatics(d, b);
    // LOCAL MODIFICATION: Add jsdoc annotation here:
    /** @constructor */
    function __() { /** @type {?} */ (this).constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};

exports.__assign = Object.assign || /** @return {?} */ function (/** ? */ t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
};

/**
 * @param {?} s
 * @param {?} e
 * @return {?}
 */
exports.__rest = function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};

/**
 * @param {?} decorators
 * @param {T} target
 * @param {?=} key
 * @param {?=} desc
 * @return {T}
 * @template T
 */
exports.__decorate = function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    // google3 local modification: use quoted property access to work around
    // https://b.corp.google.com/issues/77140019.
    if (typeof Reflect === "object" && Reflect && typeof Reflect['decorate'] === "function") r = Reflect['decorate'](decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};

/**
 * @param {?} metadataKey
 * @param {?} metadataValue
 * @return {?}
 */
exports.__metadata = function (metadataKey, metadataValue) {
  // google3 local modification: use quoted property access to work around
  // https://b.corp.google.com/issues/77140019.
  if (typeof Reflect === "object" && Reflect && typeof Reflect['metadata'] === "function") return Reflect['metadata'](metadataKey, metadataValue);
};

/**
 * @param {?} paramIndex
 * @param {?} decorator
 * @return {?}
 */
exports.__param = function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); };
};

/**
 * @template T
 * @param {T} thisArg
 * @param {?} _arguments
 * @param {?} P
 * @param {function(this:T)} generator
 * @return {?}
 */
exports.__awaiter = function(thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function(resolve, reject) {
    // LOCAL MODIFICATION: Cannot express the function + keys pattern in
    // closure, so we escape generator.next with ? type.
    function fulfilled(value) {
      try {
        step((/** @type {?} */ (generator)).next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator['throw'](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : new P(function(resolve) {
                                              resolve(result.value);
                                            }).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments)).next());
  });
};

/**
 * @param {?} thisArg
 * @param {?} body
 * @return {?}
 */
exports.__generator = function(thisArg, body) {
  var _ = {
    label: 0,
    sent: function() {
      if (t[0] & 1) throw (/** @type {!Error} */ (t[1]));
      return t[1];
    },
    trys: [],
    ops: []
  },
      f, y, t, g;
  // LOCAL MODIFICATION: Originally iterator body was "return this", but it
  // doesn't compile as this is unknown. Changed to g, which is equivalent.
  return g = {next: verb(0), "throw": verb(1), "return": verb(2)},
         typeof Symbol === "function" && (g[Symbol.iterator] = function() {
           return g;
         }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (_) try {
        if (f = 1,
            y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) &&
                !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t) op = [0, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return {value: op[1], done: false};
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) &&
                (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2]) _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5) throw (/** @type {!Error} */ (op[1]));
    return {value: op[0] ? op[1] : void 0, done: true};
  }
};

/**
 * @param {?} m
 * @param {?} e
 */
exports.__exportStar = function (m, e) {
    for (var p in m) if (!e.hasOwnProperty(p)) e[p] = m[p];
};

/**
 * @param {?} o
 * @return {?}
 */
exports.__values = function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};

/**
 * @param {?} o
 * @param {?=} n
 * @return {?}
 */
exports.__read = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = {error: error};
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw (/** @type {!Error} */ (e.error));
    }
  }
  return ar;
};

/**
 * @return {!Array}
 * @deprecated since TypeScript 4.2
 */
exports.__spread = function() {
  for (var ar = [], i = 0; i < arguments.length; i++)
    ar = ar.concat(exports.__read(arguments[i]));
  return ar;
};

/**
 * @return {!Array<?>}
 * @deprecated since TypeScript 4.2
 */
exports.__spreadArrays = function() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++)
    s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
    for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
      r[k] = a[j];
  return r;
};

/**
 * @param {!Array<?>} to
 * @param {!Array<?>} from
 * @return {!Array<?>}
 */
exports.__spreadArray = function(to, from) {
  for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
    to[j] = from[i];
  return to;
};

/**
 * @constructor
 * LOCAL MODIFICATION: Originally used "this" in function body,
 * @this {?}
 * END LOCAL MODIFICATION
 * @param {?} v
 * @return {?}
 */
exports.__await = function(v) {
  return this instanceof exports.__await ? (this.v = v, this) :
                                           new exports.__await(v);
};

/**
 * @template T
 * @param {T} thisArg
 * @param {?} _arguments
 * @param {function(this:T)} generator
 * @return {?}
 */
exports.__asyncGenerator = function __asyncGenerator(
    thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator)
    throw new TypeError('Symbol.asyncIterator is not defined.');
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb('next'), verb('throw'), verb('return'),
         i[Symbol.asyncIterator] = function() {
           return (/** @type {?} */ (this));
         }, i;
  function verb(n) {
    if (g[n])
      i[n] = function(v) {
        return new Promise(function(a, b) {
          q.push([n, v, a, b]) > 1 || resume(n, v);
        });
      };
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof exports.__await ?
        Promise.resolve(/** @type {?} */ (r.value).v).then(fulfill, reject) :
        settle(q[0][2], r);
  }
  function fulfill(value) {
    resume('next', value);
  }
  function reject(value) {
    resume('throw', value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
};

/**
 * @param {?} o
 * @return {?}
 */
exports.__asyncDelegator = function(o) {
  var i, p;
  // LOCAL MODIFICATION: Originally iterator body was "return this", but it
  // doesn't compile in some builds, as this is unknown. Changed to i, which is
  // equivalent.
  return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return i; }, i;
  /**
   * @param {?} n
   * @param {?=} f
   * @return {?}
   */
  function verb(n, f) { if (o[n]) i[n] = function (v) { return (p = !p) ? { value: new exports.__await(o[n](v)), done: n === "return" } : f ? f(v) : v; }; }
};

/**
 * @param {?} o
 * @return {?}
 */
exports.__asyncValues = function(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator];
  return m ? m.call(o) : typeof __values === "function" ? __values(o) : o[Symbol.iterator]();
};

/**
 * @param {?=} cooked
 * @param {?=} raw
 * @return {?}
 */
exports.__makeTemplateObject = function(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};


/**
 * @param {?} receiver
 * @param {!WeakMap} privateMap
 * @return {?}
 */
exports.__classPrivateFieldGet = function (receiver, privateMap) {
  if (!privateMap.has(receiver)) {
      throw new TypeError("attempted to get private field on non-instance");
  }
  return privateMap.get(receiver);
};

/**
 * @param {?} receiver
 * @param {!WeakMap} privateMap
 * @param {?} value
 * @return {?}
 */
exports.__classPrivateFieldSet = function (receiver, privateMap, value) {
  if (!privateMap.has(receiver)) {
      throw new TypeError("attempted to set private field on non-instance");
  }
  privateMap.set(receiver, value);
  return value;
};

;return exports;});

//javascript/security/csp/csp_evaluator/finding.closure.js
goog.loadModule(function(exports) {'use strict';/**
 * @fileoverview added by tsickle
 * Generated from: javascript/security/csp/csp_evaluator/finding.ts
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author lwe@google.com (Lukas Weichselbaum)
 */
goog.module('google3.javascript.security.csp.csp_evaluator.finding');
var module = module || { id: 'javascript/security/csp/csp_evaluator/finding.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
/**
 * A CSP Finding is returned by a CSP check and can either reference a directive
 * value or a directive. If a directive value is referenced opt_index must be
 * provided.
 * @unrestricted
 */
class Finding {
    /**
     * @param {!Type} type Type of the finding.
     * @param {string} description Description of the finding.
     * @param {!Severity} severity Severity of the finding.
     * @param {string} directive The CSP directive in which the finding occurred.
     * @param {(undefined|string)=} value The directive value, if exists.
     */
    constructor(type, description, severity, directive, value) {
        this.type = type;
        this.description = description;
        this.severity = severity;
        this.directive = directive;
        this.value = value;
    }
    /**
     * Returns the highest severity of a list of findings.
     * @param {!Array<!Finding>} findings List of findings.
     * @return {!Severity} highest severity of a list of findings.
     */
    static getHighestSeverity(findings) {
        if (findings.length === 0) {
            return Severity.NONE;
        }
        /** @type {!Array<!Severity>} */
        const severities = findings.map((/**
         * @param {!Finding} finding
         * @return {!Severity}
         */
        (finding) => finding.severity));
        /** @type {function(!Severity, !Severity): !Severity} */
        const min = (/**
         * @param {!Severity} prev
         * @param {!Severity} cur
         * @return {!Severity}
         */
        (prev, cur) => prev < cur ? prev : cur);
        return severities.reduce(min, Severity.NONE);
    }
    /**
     * @param {*} obj
     * @return {boolean}
     */
    equals(obj) {
        if (!(obj instanceof Finding)) {
            return false;
        }
        return obj.type === this.type && obj.description === this.description &&
            obj.severity === this.severity && obj.directive === this.directive &&
            obj.value === this.value;
    }
}
exports.Finding = Finding;
/* istanbul ignore if */
if (false) {
    /** @type {!Type} */
    Finding.prototype.type;
    /** @type {string} */
    Finding.prototype.description;
    /** @type {!Severity} */
    Finding.prototype.severity;
    /** @type {string} */
    Finding.prototype.directive;
    /** @type {(undefined|string)} */
    Finding.prototype.value;
}
/** @enum {number} */
const Severity = {
    HIGH: 10,
    SYNTAX: 20,
    MEDIUM: 30,
    HIGH_MAYBE: 40,
    STRICT_CSP: 45,
    MEDIUM_MAYBE: 50,
    INFO: 60,
    NONE: 100,
};
exports.Severity = Severity;
Severity[Severity.HIGH] = 'HIGH';
Severity[Severity.SYNTAX] = 'SYNTAX';
Severity[Severity.MEDIUM] = 'MEDIUM';
Severity[Severity.HIGH_MAYBE] = 'HIGH_MAYBE';
Severity[Severity.STRICT_CSP] = 'STRICT_CSP';
Severity[Severity.MEDIUM_MAYBE] = 'MEDIUM_MAYBE';
Severity[Severity.INFO] = 'INFO';
Severity[Severity.NONE] = 'NONE';
/** @enum {number} */
const Type = {
    // Parser checks
    MISSING_SEMICOLON: 100,
    UNKNOWN_DIRECTIVE: 101,
    INVALID_KEYWORD: 102,
    // Security cheks
    MISSING_DIRECTIVES: 300,
    SCRIPT_UNSAFE_INLINE: 301,
    SCRIPT_UNSAFE_EVAL: 302,
    PLAIN_URL_SCHEMES: 303,
    PLAIN_WILDCARD: 304,
    SCRIPT_WHITELIST_BYPASS: 305,
    OBJECT_WHITELIST_BYPASS: 306,
    NONCE_LENGTH: 307,
    IP_SOURCE: 308,
    DEPRECATED_DIRECTIVE: 309,
    SRC_HTTP: 310,
    // Strict dynamic and backward compatibility checks
    STRICT_DYNAMIC: 400,
    STRICT_DYNAMIC_NOT_STANDALONE: 401,
    NONCE_HASH: 402,
    UNSAFE_INLINE_FALLBACK: 403,
    WHITELIST_FALLBACK: 404,
    IGNORED: 405,
    // Trusted Types checks
    REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS: 500,
    // Lighthouse checks
    REPORTING_DESTINATION_MISSING: 600,
    REPORT_TO_ONLY: 601,
};
exports.Type = Type;
Type[Type.MISSING_SEMICOLON] = 'MISSING_SEMICOLON';
Type[Type.UNKNOWN_DIRECTIVE] = 'UNKNOWN_DIRECTIVE';
Type[Type.INVALID_KEYWORD] = 'INVALID_KEYWORD';
Type[Type.MISSING_DIRECTIVES] = 'MISSING_DIRECTIVES';
Type[Type.SCRIPT_UNSAFE_INLINE] = 'SCRIPT_UNSAFE_INLINE';
Type[Type.SCRIPT_UNSAFE_EVAL] = 'SCRIPT_UNSAFE_EVAL';
Type[Type.PLAIN_URL_SCHEMES] = 'PLAIN_URL_SCHEMES';
Type[Type.PLAIN_WILDCARD] = 'PLAIN_WILDCARD';
Type[Type.SCRIPT_WHITELIST_BYPASS] = 'SCRIPT_WHITELIST_BYPASS';
Type[Type.OBJECT_WHITELIST_BYPASS] = 'OBJECT_WHITELIST_BYPASS';
Type[Type.NONCE_LENGTH] = 'NONCE_LENGTH';
Type[Type.IP_SOURCE] = 'IP_SOURCE';
Type[Type.DEPRECATED_DIRECTIVE] = 'DEPRECATED_DIRECTIVE';
Type[Type.SRC_HTTP] = 'SRC_HTTP';
Type[Type.STRICT_DYNAMIC] = 'STRICT_DYNAMIC';
Type[Type.STRICT_DYNAMIC_NOT_STANDALONE] = 'STRICT_DYNAMIC_NOT_STANDALONE';
Type[Type.NONCE_HASH] = 'NONCE_HASH';
Type[Type.UNSAFE_INLINE_FALLBACK] = 'UNSAFE_INLINE_FALLBACK';
Type[Type.WHITELIST_FALLBACK] = 'WHITELIST_FALLBACK';
Type[Type.IGNORED] = 'IGNORED';
Type[Type.REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS] = 'REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS';
Type[Type.REPORTING_DESTINATION_MISSING] = 'REPORTING_DESTINATION_MISSING';
Type[Type.REPORT_TO_ONLY] = 'REPORT_TO_ONLY';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL2phdmFzY3JpcHQvc2VjdXJpdHkvY3NwL2NzcF9ldmFsdWF0b3IvZmluZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBeUJBLE1BQWEsT0FBTzs7Ozs7Ozs7SUFRbEIsWUFDVyxJQUFVLEVBQVMsV0FBbUIsRUFBUyxRQUFrQixFQUNqRSxTQUFpQixFQUFTLEtBQWM7UUFEeEMsU0FBSSxHQUFKLElBQUksQ0FBTTtRQUFTLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVMsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNqRSxjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQVMsVUFBSyxHQUFMLEtBQUssQ0FBUztJQUFHLENBQUM7Ozs7OztJQU92RCxNQUFNLENBQUMsa0JBQWtCLENBQUMsUUFBbUI7UUFDM0MsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN6QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7U0FDdEI7O2NBRUssVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHOzs7O1FBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUM7O2NBQ3hELEdBQUc7Ozs7O1FBQUcsQ0FBQyxJQUFjLEVBQUUsR0FBYSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQTtRQUN0RSxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQyxDQUFDOzs7OztJQUVELE1BQU0sQ0FBQyxHQUFZO1FBQ2pCLElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSxPQUFPLENBQUMsRUFBRTtZQUM3QixPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLFdBQVcsS0FBSyxJQUFJLENBQUMsV0FBVztZQUNqRSxHQUFHLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxRQUFRLElBQUksR0FBRyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsU0FBUztZQUNsRSxHQUFHLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDL0IsQ0FBQztDQUNGO0FBbkNELDBCQW1DQzs7OztJQTFCSyx1QkFBaUI7O0lBQUUsOEJBQTBCOztJQUFFLDJCQUF5Qjs7SUFDeEUsNEJBQXdCOztJQUFFLHdCQUFxQjs7O0FBK0JyRCxNQUFZLFFBQVE7SUFDbEIsSUFBSSxJQUFLO0lBQ1QsTUFBTSxJQUFLO0lBQ1gsTUFBTSxJQUFLO0lBQ1gsVUFBVSxJQUFLO0lBQ2YsVUFBVSxJQUFLO0lBQ2YsWUFBWSxJQUFLO0lBQ2pCLElBQUksSUFBSztJQUNULElBQUksS0FBTTtFQUNYOzs7Ozs7Ozs7OztBQU9ELE1BQVksSUFBSTtJQUNkLGdCQUFnQjtJQUNoQixpQkFBaUIsS0FBTTtJQUN2QixpQkFBaUIsS0FBQTtJQUNqQixlQUFlLEtBQUE7SUFFZixpQkFBaUI7SUFDakIsa0JBQWtCLEtBQU07SUFDeEIsb0JBQW9CLEtBQUE7SUFDcEIsa0JBQWtCLEtBQUE7SUFDbEIsaUJBQWlCLEtBQUE7SUFDakIsY0FBYyxLQUFBO0lBQ2QsdUJBQXVCLEtBQUE7SUFDdkIsdUJBQXVCLEtBQUE7SUFDdkIsWUFBWSxLQUFBO0lBQ1osU0FBUyxLQUFBO0lBQ1Qsb0JBQW9CLEtBQUE7SUFDcEIsUUFBUSxLQUFBO0lBRVIsbURBQW1EO0lBQ25ELGNBQWMsS0FBTTtJQUNwQiw2QkFBNkIsS0FBQTtJQUM3QixVQUFVLEtBQUE7SUFDVixzQkFBc0IsS0FBQTtJQUN0QixrQkFBa0IsS0FBQTtJQUNsQixPQUFPLEtBQUE7SUFFUCx1QkFBdUI7SUFDdkIsaUNBQWlDLEtBQU07SUFFdkMsb0JBQW9CO0lBQ3BCLDZCQUE2QixLQUFNO0lBQ25DLGNBQWMsS0FBQTtFQUNmIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogQGF1dGhvciBsd2VAZ29vZ2xlLmNvbSAoTHVrYXMgV2VpY2hzZWxiYXVtKVxuICovXG5cblxuLyoqXG4gKiBBIENTUCBGaW5kaW5nIGlzIHJldHVybmVkIGJ5IGEgQ1NQIGNoZWNrIGFuZCBjYW4gZWl0aGVyIHJlZmVyZW5jZSBhIGRpcmVjdGl2ZVxuICogdmFsdWUgb3IgYSBkaXJlY3RpdmUuIElmIGEgZGlyZWN0aXZlIHZhbHVlIGlzIHJlZmVyZW5jZWQgb3B0X2luZGV4IG11c3QgYmVcbiAqIHByb3ZpZGVkLlxuICogQHVucmVzdHJpY3RlZFxuICovXG5leHBvcnQgY2xhc3MgRmluZGluZyB7XG4gIC8qKlxuICAgKiBAcGFyYW0gdHlwZSBUeXBlIG9mIHRoZSBmaW5kaW5nLlxuICAgKiBAcGFyYW0gZGVzY3JpcHRpb24gRGVzY3JpcHRpb24gb2YgdGhlIGZpbmRpbmcuXG4gICAqIEBwYXJhbSBzZXZlcml0eSBTZXZlcml0eSBvZiB0aGUgZmluZGluZy5cbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBUaGUgQ1NQIGRpcmVjdGl2ZSBpbiB3aGljaCB0aGUgZmluZGluZyBvY2N1cnJlZC5cbiAgICogQHBhcmFtIHZhbHVlIFRoZSBkaXJlY3RpdmUgdmFsdWUsIGlmIGV4aXN0cy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHVibGljIHR5cGU6IFR5cGUsIHB1YmxpYyBkZXNjcmlwdGlvbjogc3RyaW5nLCBwdWJsaWMgc2V2ZXJpdHk6IFNldmVyaXR5LFxuICAgICAgcHVibGljIGRpcmVjdGl2ZTogc3RyaW5nLCBwdWJsaWMgdmFsdWU/OiBzdHJpbmcpIHt9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGhpZ2hlc3Qgc2V2ZXJpdHkgb2YgYSBsaXN0IG9mIGZpbmRpbmdzLlxuICAgKiBAcGFyYW0gZmluZGluZ3MgTGlzdCBvZiBmaW5kaW5ncy5cbiAgICogQHJldHVybiBoaWdoZXN0IHNldmVyaXR5IG9mIGEgbGlzdCBvZiBmaW5kaW5ncy5cbiAgICovXG4gIHN0YXRpYyBnZXRIaWdoZXN0U2V2ZXJpdHkoZmluZGluZ3M6IEZpbmRpbmdbXSk6IFNldmVyaXR5IHtcbiAgICBpZiAoZmluZGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gU2V2ZXJpdHkuTk9ORTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXZlcml0aWVzID0gZmluZGluZ3MubWFwKChmaW5kaW5nKSA9PiBmaW5kaW5nLnNldmVyaXR5KTtcbiAgICBjb25zdCBtaW4gPSAocHJldjogU2V2ZXJpdHksIGN1cjogU2V2ZXJpdHkpID0+IHByZXYgPCBjdXIgPyBwcmV2IDogY3VyO1xuICAgIHJldHVybiBzZXZlcml0aWVzLnJlZHVjZShtaW4sIFNldmVyaXR5Lk5PTkUpO1xuICB9XG5cbiAgZXF1YWxzKG9iajogdW5rbm93bik6IGJvb2xlYW4ge1xuICAgIGlmICghKG9iaiBpbnN0YW5jZW9mIEZpbmRpbmcpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvYmoudHlwZSA9PT0gdGhpcy50eXBlICYmIG9iai5kZXNjcmlwdGlvbiA9PT0gdGhpcy5kZXNjcmlwdGlvbiAmJlxuICAgICAgICBvYmouc2V2ZXJpdHkgPT09IHRoaXMuc2V2ZXJpdHkgJiYgb2JqLmRpcmVjdGl2ZSA9PT0gdGhpcy5kaXJlY3RpdmUgJiZcbiAgICAgICAgb2JqLnZhbHVlID09PSB0aGlzLnZhbHVlO1xuICB9XG59XG5cblxuLyoqXG4gKiBGaW5kaW5nIHNldmVyaXRpZXMuXG4gKi9cbmV4cG9ydCBlbnVtIFNldmVyaXR5IHtcbiAgSElHSCA9IDEwLFxuICBTWU5UQVggPSAyMCxcbiAgTUVESVVNID0gMzAsXG4gIEhJR0hfTUFZQkUgPSA0MCxcbiAgU1RSSUNUX0NTUCA9IDQ1LFxuICBNRURJVU1fTUFZQkUgPSA1MCxcbiAgSU5GTyA9IDYwLFxuICBOT05FID0gMTAwXG59XG5cblxuLyoqXG4gKiBGaW5kaW5nIHR5cGVzIGZvciBldmx1YXRvciBjaGVja3MuXG4gKi9cbi8vIExJTlQuSWZDaGFuZ2VcbmV4cG9ydCBlbnVtIFR5cGUge1xuICAvLyBQYXJzZXIgY2hlY2tzXG4gIE1JU1NJTkdfU0VNSUNPTE9OID0gMTAwLFxuICBVTktOT1dOX0RJUkVDVElWRSxcbiAgSU5WQUxJRF9LRVlXT1JELFxuXG4gIC8vIFNlY3VyaXR5IGNoZWtzXG4gIE1JU1NJTkdfRElSRUNUSVZFUyA9IDMwMCxcbiAgU0NSSVBUX1VOU0FGRV9JTkxJTkUsXG4gIFNDUklQVF9VTlNBRkVfRVZBTCxcbiAgUExBSU5fVVJMX1NDSEVNRVMsXG4gIFBMQUlOX1dJTERDQVJELFxuICBTQ1JJUFRfV0hJVEVMSVNUX0JZUEFTUyxcbiAgT0JKRUNUX1dISVRFTElTVF9CWVBBU1MsXG4gIE5PTkNFX0xFTkdUSCxcbiAgSVBfU09VUkNFLFxuICBERVBSRUNBVEVEX0RJUkVDVElWRSxcbiAgU1JDX0hUVFAsXG5cbiAgLy8gU3RyaWN0IGR5bmFtaWMgYW5kIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgY2hlY2tzXG4gIFNUUklDVF9EWU5BTUlDID0gNDAwLFxuICBTVFJJQ1RfRFlOQU1JQ19OT1RfU1RBTkRBTE9ORSxcbiAgTk9OQ0VfSEFTSCxcbiAgVU5TQUZFX0lOTElORV9GQUxMQkFDSyxcbiAgV0hJVEVMSVNUX0ZBTExCQUNLLFxuICBJR05PUkVELFxuXG4gIC8vIFRydXN0ZWQgVHlwZXMgY2hlY2tzXG4gIFJFUVVJUkVfVFJVU1RFRF9UWVBFU19GT1JfU0NSSVBUUyA9IDUwMCxcblxuICAvLyBMaWdodGhvdXNlIGNoZWNrc1xuICBSRVBPUlRJTkdfREVTVElOQVRJT05fTUlTU0lORyA9IDYwMCxcbiAgUkVQT1JUX1RPX09OTFksXG59XG4vLyBMSU5ULlRoZW5DaGFuZ2UoLy9kZXBvdC9nb29nbGUzL3NlY3VyaXR5L2NzcC9ldmFsdWF0b3IvcHJvdG8vY3NwX3F1YWxpdHkucHJvdG8pXG4iXX0=
;return exports;});

//javascript/security/csp/csp_evaluator/csp.closure.js
goog.loadModule(function(exports) {'use strict';/**
 *
 * @fileoverview CSP definitions and helper functions.
 * Generated from: javascript/security/csp/csp_evaluator/csp.ts
 * @author lwe\@google.com (Lukas Weichselbaum)
 *
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
goog.module('google3.javascript.security.csp.csp_evaluator.csp');
var module = module || { id: 'javascript/security/csp/csp_evaluator/csp.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
const tsickle_finding_1 = goog.requireType("google3.javascript.security.csp.csp_evaluator.finding");
const finding_1 = goog.require('google3.javascript.security.csp.csp_evaluator.finding');
/**
 * Content Security Policy object.
 * List of valid CSP directives:
 *  - http://www.w3.org/TR/CSP2/#directives
 *  - https://www.w3.org/TR/upgrade-insecure-requests/
 */
class Csp {
    /**
     * Clones a CSP object.
     * @param {!Csp} parsedCsp CSP.
     * @return {!Csp} clone of parsedCsp.
     */
    static clone(parsedCsp) {
        /** @type {!Csp} */
        const clone = new Csp();
        for (const [directive, directiveValues] of Object.entries(parsedCsp)) {
            if (directiveValues) {
                clone[directive] = [...directiveValues];
            }
        }
        return clone;
    }
    /**
     * Converts a parsed CSP back into a string.
     * @param {!Csp} parsedCsp CSP.
     * @return {string} CSP string.
     */
    static convertToString(parsedCsp) {
        /** @type {string} */
        let cspString = '';
        for (const [directive, directiveValues] of Object.entries(parsedCsp)) {
            cspString += directive;
            if (directiveValues !== undefined) {
                for (let value, i = 0; value = directiveValues[i]; i++) {
                    cspString += ' ';
                    cspString += value;
                }
            }
            cspString += '; ';
        }
        return cspString;
    }
    /**
     * Returns CSP as it would be seen by a UA supporting a specific CSP version.
     * @param {!Csp} parsedCsp CSP.
     * @param {!Version} cspVersion CSP.
     * @param {(undefined|!Array<!tsickle_finding_1.Finding>)=} optFindings findings about ignored directive values will be added
     *     to this array, if passed. (e.g. CSP2 ignores 'unsafe-inline' in
     *     presence of a nonce or a hash)
     * @return {!Csp} The effective CSP.
     */
    static getEffectiveCsp(parsedCsp, cspVersion, optFindings) {
        /** @type {!Array<!tsickle_finding_1.Finding>} */
        const findings = optFindings || [];
        /** @type {!Csp} */
        const effectiveCsp = Csp.clone(parsedCsp);
        /** @type {string} */
        const directive = Csp.getEffectiveDirective(parsedCsp, Directive.SCRIPT_SRC);
        /** @type {!Array<string>} */
        const values = parsedCsp[directive] || [];
        /** @type {(undefined|!Array<string>)} */
        const effectiveCspValues = effectiveCsp[directive];
        if (effectiveCspValues &&
            (Csp.policyHasScriptNonces(effectiveCsp) ||
                Csp.policyHasScriptHashes(effectiveCsp))) {
            if (cspVersion >= Version.CSP2) {
                // Ignore 'unsafe-inline' in CSP >= v2, if a nonce or a hash is present.
                if (values.includes(Keyword.UNSAFE_INLINE)) {
                    arrayRemove(effectiveCspValues, Keyword.UNSAFE_INLINE);
                    findings.push(new finding_1.Finding(finding_1.Type.IGNORED, 'unsafe-inline is ignored if a nonce or a hash is present. ' +
                        '(CSP2 and above)', finding_1.Severity.NONE, directive, Keyword.UNSAFE_INLINE));
                }
            }
            else {
                // remove nonces and hashes (not supported in CSP < v2).
                for (const value of values) {
                    if (value.startsWith('\'nonce-') || value.startsWith('\'sha')) {
                        arrayRemove(effectiveCspValues, value);
                    }
                }
            }
        }
        if (effectiveCspValues && Csp.policyHasStrictDynamic(parsedCsp)) {
            // Ignore whitelist in CSP >= v3 in presence of 'strict-dynamic'.
            if (cspVersion >= Version.CSP3) {
                for (const value of values) {
                    // Because of 'strict-dynamic' all host-source and scheme-source
                    // expressions, as well as the "'unsafe-inline'" and "'self'
                    // keyword-sources will be ignored.
                    // https://w3c.github.io/webappsec-csp/#strict-dynamic-usage
                    if (!value.startsWith('\'') || value === Keyword.SELF ||
                        value === Keyword.UNSAFE_INLINE) {
                        arrayRemove(effectiveCspValues, value);
                        findings.push(new finding_1.Finding(finding_1.Type.IGNORED, 'Because of strict-dynamic this entry is ignored in CSP3 and above', finding_1.Severity.NONE, directive, value));
                    }
                }
            }
            else {
                // strict-dynamic not supported.
                arrayRemove(effectiveCspValues, Keyword.STRICT_DYNAMIC);
            }
        }
        if (cspVersion < Version.CSP3) {
            // Remove CSP3 directives from pre-CSP3 policies.
            // https://w3c.github.io/webappsec-csp/#changes-from-level-2
            delete effectiveCsp[Directive.REPORT_TO];
            delete effectiveCsp[Directive.WORKER_SRC];
            delete effectiveCsp[Directive.MANIFEST_SRC];
            delete effectiveCsp[Directive.TRUSTED_TYPES];
            delete effectiveCsp[Directive.REQUIRE_TRUSTED_TYPES_FOR];
        }
        return effectiveCsp;
    }
    /**
     * Returns default-src if directive is a fetch directive and is not present in
     * the provided CSP. Otherwise the provided directive is returned.
     * @param {!Csp} parsedCsp CSP.
     * @param {string} directive CSP.
     * @return {string} The effective directive.
     */
    static getEffectiveDirective(parsedCsp, directive) {
        // Only fetch directives default to default-src.
        if (!(directive in parsedCsp) &&
            exports.FETCH_DIRECTIVES.includes((/** @type {!Directive} */ (directive)))) {
            return Directive.DEFAULT_SRC;
        }
        return directive;
    }
    /**
     * Returns the passed directives if present in the CSP or default-src
     * otherwise.
     * @param {!Csp} parsedCsp CSP.
     * @param {!Array<string>} directives CSP.
     * @return {!Array<string>} The effective directives.
     */
    static getEffectiveDirectives(parsedCsp, directives) {
        /** @type {!Set<string>} */
        const effectiveDirectives = new Set(directives.map((/**
         * @param {string} val
         * @return {string}
         */
        (val) => Csp.getEffectiveDirective(parsedCsp, val))));
        return [...effectiveDirectives];
    }
    /**
     * Checks if the CSP is using nonces for scripts.
     * @param {!Csp} parsedCsp CSP.
     * @return {boolean} true, if the is using script nonces.
     */
    static policyHasScriptNonces(parsedCsp) {
        /** @type {string} */
        const directiveName = Csp.getEffectiveDirective(parsedCsp, Directive.SCRIPT_SRC);
        /** @type {!Array<string>} */
        const values = parsedCsp[directiveName] || [];
        return values.some((/**
         * @param {string} val
         * @return {boolean}
         */
        (val) => isNonce(val)));
    }
    /**
     * Checks if the CSP is using hashes for scripts.
     * @param {!Csp} parsedCsp CSP.
     * @return {boolean} true, if the CSP is using script hashes.
     */
    static policyHasScriptHashes(parsedCsp) {
        /** @type {string} */
        const directiveName = Csp.getEffectiveDirective(parsedCsp, Directive.SCRIPT_SRC);
        /** @type {!Array<string>} */
        const values = parsedCsp[directiveName] || [];
        return values.some((/**
         * @param {string} val
         * @return {boolean}
         */
        (val) => isHash(val)));
    }
    /**
     * Checks if the CSP is using strict-dynamic.
     * @param {!Csp} parsedCsp CSP.
     * @return {boolean} true, if the CSP is using CSP nonces.
     */
    static policyHasStrictDynamic(parsedCsp) {
        /** @type {string} */
        const directiveName = Csp.getEffectiveDirective(parsedCsp, Directive.SCRIPT_SRC);
        /** @type {!Array<string>} */
        const values = parsedCsp[directiveName] || [];
        return values.includes(Keyword.STRICT_DYNAMIC);
    }
}
exports.Csp = Csp;
/* istanbul ignore if */
if (false) {
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.childSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.connectSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.defaultSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.fontSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.frameSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.imgSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.mediaSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.objectSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.scriptSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.styleSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.manifestSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.workerSrc;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.baseUri;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.pluginTypes;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.sandbox;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.formAction;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.frameAncestors;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.reportTo;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.reportUri;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.blockAllMixedContent;
    /** @type {(undefined|!Array<string>)} */
    Csp.prototype.upgradeInsecureRequests;
    /* Skipping unhandled member: [key: string]: string[]|undefined;*/
}
/** @enum {string} */
const Keyword = {
    SELF: "'self'",
    NONE: "'none'",
    UNSAFE_INLINE: "'unsafe-inline'",
    UNSAFE_EVAL: "'unsafe-eval'",
    WASM_EVAL: "'wasm-eval'",
    WASM_UNSAFE_EVAL: "'wasm-unsafe-eval'",
    STRICT_DYNAMIC: "'strict-dynamic'",
    UNSAFE_HASHED_ATTRIBUTES: "'unsafe-hashed-attributes'",
    UNSAFE_HASHES: "'unsafe-hashes'",
    REPORT_SAMPLE: "'report-sample'",
};
exports.Keyword = Keyword;
/** @enum {string} */
const TrustedTypesSink = {
    SCRIPT: "'script'",
};
exports.TrustedTypesSink = TrustedTypesSink;
/** @enum {string} */
const Directive = {
    // Fetch directives
    CHILD_SRC: "child-src",
    CONNECT_SRC: "connect-src",
    DEFAULT_SRC: "default-src",
    FONT_SRC: "font-src",
    FRAME_SRC: "frame-src",
    IMG_SRC: "img-src",
    MEDIA_SRC: "media-src",
    OBJECT_SRC: "object-src",
    SCRIPT_SRC: "script-src",
    SCRIPT_SRC_ATTR: "script-src-attr",
    SCRIPT_SRC_ELEM: "script-src-elem",
    STYLE_SRC: "style-src",
    STYLE_SRC_ATTR: "style-src-attr",
    STYLE_SRC_ELEM: "style-src-elem",
    PREFETCH_SRC: "prefetch-src",
    MANIFEST_SRC: "manifest-src",
    WORKER_SRC: "worker-src",
    // Document directives
    BASE_URI: "base-uri",
    PLUGIN_TYPES: "plugin-types",
    SANDBOX: "sandbox",
    DISOWN_OPENER: "disown-opener",
    // Navigation directives
    FORM_ACTION: "form-action",
    FRAME_ANCESTORS: "frame-ancestors",
    // Reporting directives
    REPORT_TO: "report-to",
    REPORT_URI: "report-uri",
    // Other directives
    BLOCK_ALL_MIXED_CONTENT: "block-all-mixed-content",
    UPGRADE_INSECURE_REQUESTS: "upgrade-insecure-requests",
    REFLECTED_XSS: "reflected-xss",
    REFERRER: "referrer",
    REQUIRE_SRI_FOR: "require-sri-for",
    TRUSTED_TYPES: "trusted-types",
    // https://github.com/WICG/trusted-types
    REQUIRE_TRUSTED_TYPES_FOR: "require-trusted-types-for",
};
exports.Directive = Directive;
/**
 * CSP v3 fetch directives.
 * Fetch directives control the locations from which resources may be loaded.
 * https://w3c.github.io/webappsec-csp/#directives-fetch
 *
 * @type {!Array<!Directive>}
 */
exports.FETCH_DIRECTIVES = [
    Directive.CHILD_SRC, Directive.CONNECT_SRC, Directive.DEFAULT_SRC,
    Directive.FONT_SRC, Directive.FRAME_SRC, Directive.IMG_SRC,
    Directive.MANIFEST_SRC, Directive.MEDIA_SRC, Directive.OBJECT_SRC,
    Directive.SCRIPT_SRC, Directive.SCRIPT_SRC_ATTR, Directive.SCRIPT_SRC_ELEM,
    Directive.STYLE_SRC, Directive.STYLE_SRC_ATTR, Directive.STYLE_SRC_ELEM,
    Directive.WORKER_SRC
];
/** @enum {number} */
const Version = {
    CSP1: 1,
    CSP2: 2,
    CSP3: 3,
};
exports.Version = Version;
Version[Version.CSP1] = 'CSP1';
Version[Version.CSP2] = 'CSP2';
Version[Version.CSP3] = 'CSP3';
/**
 * Checks if a string is a valid CSP directive.
 * @param {string} directive value to check.
 * @return {boolean} True if directive is a valid CSP directive.
 */
function isDirective(directive) {
    return Object.values(Directive).includes((/** @type {!Directive} */ (directive)));
}
exports.isDirective = isDirective;
/**
 * Checks if a string is a valid CSP keyword.
 * @param {string} keyword value to check.
 * @return {boolean} True if keyword is a valid CSP keyword.
 */
function isKeyword(keyword) {
    return Object.values(Keyword).includes((/** @type {!Keyword} */ (keyword)));
}
exports.isKeyword = isKeyword;
/**
 * Checks if a string is a valid URL scheme.
 * Scheme part + ":"
 * For scheme part see https://tools.ietf.org/html/rfc3986#section-3.1
 * @param {string} urlScheme value to check.
 * @return {boolean} True if urlScheme has a valid scheme.
 */
function isUrlScheme(urlScheme) {
    /** @type {!RegExp} */
    const pattern = new RegExp('^[a-zA-Z][+a-zA-Z0-9.-]*:$');
    return pattern.test(urlScheme);
}
exports.isUrlScheme = isUrlScheme;
/**
 * A regex pattern to check nonce prefix and Base64 formatting of a nonce value.
 * @type {!RegExp}
 */
exports.STRICT_NONCE_PATTERN = new RegExp('^\'nonce-[a-zA-Z0-9+/_-]+[=]{0,2}\'$');
/**
 * A regex pattern for checking if nonce prefix.
 * @type {!RegExp}
 */
exports.NONCE_PATTERN = new RegExp('^\'nonce-(.+)\'$');
/**
 * Checks if a string is a valid CSP nonce.
 * See http://www.w3.org/TR/CSP2/#nonce_value
 * @param {string} nonce value to check.
 * @param {(undefined|boolean)=} strictCheck Check if the nonce uses the base64 charset.
 * @return {boolean} True if nonce is has a valid CSP nonce.
 */
function isNonce(nonce, strictCheck) {
    /** @type {!RegExp} */
    const pattern = strictCheck ? exports.STRICT_NONCE_PATTERN : exports.NONCE_PATTERN;
    return pattern.test(nonce);
}
exports.isNonce = isNonce;
/**
 * A regex pattern to check hash prefix and Base64 formatting of a hash value.
 * @type {!RegExp}
 */
exports.STRICT_HASH_PATTERN = new RegExp('^\'(sha256|sha384|sha512)-[a-zA-Z0-9+/]+[=]{0,2}\'$');
/**
 * A regex pattern to check hash prefix.
 * @type {!RegExp}
 */
exports.HASH_PATTERN = new RegExp('^\'(sha256|sha384|sha512)-(.+)\'$');
/**
 * Checks if a string is a valid CSP hash.
 * See http://www.w3.org/TR/CSP2/#hash_value
 * @param {string} hash value to check.
 * @param {(undefined|boolean)=} strictCheck Check if the hash uses the base64 charset.
 * @return {boolean} True if hash is has a valid CSP hash.
 */
function isHash(hash, strictCheck) {
    /** @type {!RegExp} */
    const pattern = strictCheck ? exports.STRICT_HASH_PATTERN : exports.HASH_PATTERN;
    return pattern.test(hash);
}
exports.isHash = isHash;
/**
 * Class to represent all generic CSP errors.
 * @extends {Error}
 */
class CspError extends Error {
    /**
     * @param {(undefined|string)=} message An optional error message.
     */
    constructor(message) {
        super(message);
    }
}
exports.CspError = CspError;
/**
 * Mutate the given array to remove the first instance of the given item
 * @template T
 * @param {!Array<T>} arr
 * @param {T} item
 * @return {void}
 */
function arrayRemove(arr, item) {
    if (arr.includes(item)) {
        /** @type {number} */
        const idx = arr.findIndex((/**
         * @param {T} elem
         * @return {boolean}
         */
        elem => item === elem));
        arr.splice(idx, 1);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vamF2YXNjcmlwdC9zZWN1cml0eS9jc3AvY3NwX2V2YWx1YXRvci9jc3AudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvQkEsd0ZBQWtEOzs7Ozs7O0FBUWxELE1BQWEsR0FBRzs7Ozs7O0lBd0NkLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBYzs7Y0FDbkIsS0FBSyxHQUFHLElBQUksR0FBRyxFQUFFO1FBQ3ZCLEtBQUssTUFBTSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3BFLElBQUksZUFBZSxFQUFFO2dCQUNuQixLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxDQUFDO2FBQ3pDO1NBQ0Y7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7Ozs7OztJQU9ELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBYzs7WUFDL0IsU0FBUyxHQUFHLEVBQUU7UUFFbEIsS0FBSyxNQUFNLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDcEUsU0FBUyxJQUFJLFNBQVMsQ0FBQztZQUN2QixJQUFJLGVBQWUsS0FBSyxTQUFTLEVBQUU7Z0JBQ2pDLEtBQUssSUFBSSxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUN0RCxTQUFTLElBQUksR0FBRyxDQUFDO29CQUNqQixTQUFTLElBQUksS0FBSyxDQUFDO2lCQUNwQjthQUNGO1lBQ0QsU0FBUyxJQUFJLElBQUksQ0FBQztTQUNuQjtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7Ozs7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Ozs7O0FBTVksUUFBQSxtQkFBbUIsR0FDNUIsSUFBSSxNQUFNLENBQUMscURBQXFELENBQUM7Ozs7O0FBSXhELFFBQUEsWUFBWSxHQUFHLElBQUksTUFBTSxDQUFDLG1DQUFtQyxDQUFDOzs7Ozs7OztBQVUzRSxTQUFnQixNQUFNLENBQUMsSUFBWSxFQUFFLFdBQXFCOztVQUNsRCxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQywyQkFBbUIsQ0FBQyxDQUFDLENBQUMsb0JBQVk7SUFDaEUsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVCLENBQUM7QUFIRCx3QkFHQzs7Ozs7QUFNRCxNQUFhLFFBQVMsU0FBUSxLQUFLOzs7O0lBSWpDLFlBQVksT0FBZ0I7UUFDMUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pCLENBQUM7Q0FDRjtBQVBELDRCQU9DOzs7Ozs7OztBQUtELFNBQVMsV0FBVyxDQUFJLEdBQVEsRUFBRSxJQUFPO0lBQ3ZDLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTs7Y0FDaEIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTOzs7O1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFDO1FBQ2hELEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ3BCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGVvdmVydmlldyBDU1AgZGVmaW5pdGlvbnMgYW5kIGhlbHBlciBmdW5jdGlvbnMuXG4gKiBAYXV0aG9yIGx3ZUBnb29nbGUuY29tIChMdWthcyBXZWljaHNlbGJhdW0pXG4gKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cblxuaW1wb3J0IHtGaW5kaW5nLCBTZXZlcml0eSwgVHlwZX0gZnJvbSAnLi9maW5kaW5nJztcblxuLyoqXG4gKiBDb250ZW50IFNlY3VyaXR5IFBvbGljeSBvYmplY3QuXG4gKiBMaXN0IG9mIHZhbGlkIENTUCBkaXJlY3RpdmVzOlxuICogIC0gaHR0cDovL3d3dy53My5vcmcvVFIvQ1NQMi8jZGlyZWN0aXZlc1xuICogIC0gaHR0cHM6Ly93d3cudzMub3JnL1RSL3VwZ3JhZGUtaW5zZWN1cmUtcmVxdWVzdHMvXG4gKi9cbmV4cG9ydCBjbGFzcyBDc3Age1xuICBba2V5OiBzdHJpbmddOiBzdHJpbmdbXXx1bmRlZmluZWQ7XG5cbiAgLy8gRmV0Y2ggZGlyZWN0aXZlc1xuICBjaGlsZFNyYz86IHN0cmluZ1tdO1xuICBjb25uZWN0U3JjPzogc3RyaW5nW107XG4gIGRlZmF1bHRTcmM/OiBzdHJpbmdbXTtcbiAgZm9udFNyYz86IHN0cmluZ1tdO1xuICBmcmFtZVNyYz86IHN0cmluZ1tdO1xuICBpbWdTcmM/OiBzdHJpbmdbXTtcbiAgbWVkaWFTcmM/OiBzdHJpbmdbXTtcbiAgb2JqZWN0U3JjPzogc3RyaW5nW107XG4gIHNjcmlwdFNyYz86IHN0cmluZ1tdO1xuICBzdHlsZVNyYz86IHN0cmluZ1tdO1xuXG4gIG1hbmlmZXN0U3JjPzogc3RyaW5nW107XG4gIHdvcmtlclNyYz86IHN0cmluZ1tdO1xuXG4gIC8vIERvY3VtZW50IGRpcmVjdGl2ZXNcbiAgYmFzZVVyaT86IHN0cmluZ1tdO1xuICBwbHVnaW5UeXBlcz86IHN0cmluZ1tdO1xuICBzYW5kYm94Pzogc3RyaW5nW107XG5cbiAgLy8gTmF2aWdhdGlvbiBkaXJlY3RpdmVzXG4gIGZvcm1BY3Rpb24/OiBzdHJpbmdbXTtcbiAgZnJhbWVBbmNlc3RvcnM/OiBzdHJpbmdbXTtcblxuICAvLyBSZXBvcnRpbmcgZGlyZWN0aXZlc1xuICByZXBvcnRUbz86IHN0cmluZ1tdO1xuICByZXBvcnRVcmk/OiBzdHJpbmdbXTtcblxuICAvLyBPdGhlciBkaXJlY3RpdmVzXG4gIGJsb2NrQWxsTWl4ZWRDb250ZW50Pzogc3RyaW5nW107XG4gIHVwZ3JhZGVJbnNlY3VyZVJlcXVlc3RzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIENsb25lcyBhIENTUCBvYmplY3QuXG4gICAqIEBwYXJhbSBwYXJzZWRDc3AgQ1NQLlxuICAgKiBAcmV0dXJuIGNsb25lIG9mIHBhcnNlZENzcC5cbiAgICovXG4gIHN0YXRpYyBjbG9uZShwYXJzZWRDc3A6IENzcCk6IENzcCB7XG4gICAgY29uc3QgY2xvbmUgPSBuZXcgQ3NwKCk7XG4gICAgZm9yIChjb25zdCBbZGlyZWN0aXZlLCBkaXJlY3RpdmVWYWx1ZXNdIG9mIE9iamVjdC5lbnRyaWVzKHBhcnNlZENzcCkpIHtcbiAgICAgIGlmIChkaXJlY3RpdmVWYWx1ZXMpIHtcbiAgICAgICAgY2xvbmVbZGlyZWN0aXZlXSA9IFsuLi5kaXJlY3RpdmVWYWx1ZXNdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydHMgYSBwYXJzZWQgQ1NQIGJhY2sgaW50byBhIHN0cmluZy5cbiAgICogQHBhcmFtIHBhcnNlZENzcCBDU1AuXG4gICAqIEByZXR1cm4gQ1NQIHN0cmluZy5cbiAgICovXG4gIHN0YXRpYyBjb252ZXJ0VG9TdHJpbmcocGFyc2VkQ3NwOiBDc3ApOiBzdHJpbmcge1xuICAgIGxldCBjc3BTdHJpbmcgPSAnJztcblxuICAgIGZvciAoY29uc3QgW2RpcmVjdGl2ZSwgZGlyZWN0aXZlVmFsdWVzXSBvZiBPYmplY3QuZW50cmllcyhwYXJzZWRDc3ApKSB7XG4gICAgICBjc3BTdHJpbmcgKz0gZGlyZWN0aXZlO1xuICAgICAgaWYgKGRpcmVjdGl2ZVZhbHVlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGZvciAobGV0IHZhbHVlLCBpID0gMDsgdmFsdWUgPSBkaXJlY3RpdmVWYWx1ZXNbaV07IGkrKykge1xuICAgICAgICAgIGNzcFN0cmluZyArPSAnICc7XG4gICAgICAgICAgY3NwU3RyaW5nICs9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjc3BTdHJpbmcgKz0gJzsgJztcbiAgICB9XG5cbiAgICByZXR1cm4gY3NwU3RyaW5nO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgQ1NQIGFzIGl0IHdvdWxkIGJlIHNlZW4gYnkgYSBVQSBzdXBwb3J0aW5nIGEgc3BlY2lmaWMgQ1NQIHZlcnNpb24uXG4gICAqIEBwYXJhbSBwYXJzZWRDc3AgQ1NQLlxuICAgKiBAcGFyYW0gY3NwVmVyc2lvbiBDU1AuXG4gICAqIEBwYXJhbSBvcHRGaW5kaW5ncyBmaW5kaW5ncyBhYm91dCBpZ25vcmVkIGRpcmVjdGl2ZSB2YWx1ZXMgd2lsbCBiZSBhZGRlZFxuICAgKiAgICAgdG8gdGhpcyBhcnJheSwgaWYgcGFzc2VkLiAoZS5nLiBDU1AyIGlnbm9yZXMgJ3Vuc2FmZS1pbmxpbmUnIGluXG4gICAqICAgICBwcmVzZW5jZSBvZiBhIG5vbmNlIG9yIGEgaGFzaClcbiAgICogQHJldHVybiBUaGUgZWZmZWN0aXZlIENTUC5cbiAgICovXG4gIHN0YXRpYyBnZXRFZmZlY3RpdmVDc3AoXG4gICAgICBwYXJzZWRDc3A6IENzcCwgY3NwVmVyc2lvbjogVmVyc2lvbiwgb3B0RmluZGluZ3M/OiBGaW5kaW5nW10pOiBDc3Age1xuICAgIGNvbnN0IGZpbmRpbmdzID0gb3B0RmluZGluZ3MgfHwgW107XG4gICAgY29uc3QgZWZmZWN0aXZlQ3NwID0gQ3NwLmNsb25lKHBhcnNlZENzcCk7XG4gICAgY29uc3QgZGlyZWN0aXZlID1cbiAgICAgICAgQ3NwLmdldEVmZmVjdGl2ZURpcmVjdGl2ZShwYXJzZWRDc3AsIERpcmVjdGl2ZS5TQ1JJUFRfU1JDKTtcbiAgICBjb25zdCB2YWx1ZXMgPSBwYXJzZWRDc3BbZGlyZWN0aXZlXSB8fCBbXTtcbiAgICBjb25zdCBlZmZlY3RpdmVDc3BWYWx1ZXMgPSBlZmZlY3RpdmVDc3BbZGlyZWN0aXZlXTtcblxuICAgIGlmIChlZmZlY3RpdmVDc3BWYWx1ZXMgJiZcbiAgICAgICAgKENzcC5wb2xpY3lIYXNTY3JpcHROb25jZXMoZWZmZWN0aXZlQ3NwKSB8fFxuICAgICAgICAgQ3NwLnBvbGljeUhhc1NjcmlwdEhhc2hlcyhlZmZlY3RpdmVDc3ApKSkge1xuICAgICAgaWYgKGNzcFZlcnNpb24gPj0gVmVyc2lvbi5DU1AyKSB7XG4gICAgICAgIC8vIElnbm9yZSAndW5zYWZlLWlubGluZScgaW4gQ1NQID49IHYyLCBpZiBhIG5vbmNlIG9yIGEgaGFzaCBpcyBwcmVzZW50LlxuICAgICAgICBpZiAodmFsdWVzLmluY2x1ZGVzKEtleXdvcmQuVU5TQUZFX0lOTElORSkpIHtcbiAgICAgICAgICBhcnJheVJlbW92ZShlZmZlY3RpdmVDc3BWYWx1ZXMsIEtleXdvcmQuVU5TQUZFX0lOTElORSk7XG4gICAgICAgICAgZmluZGluZ3MucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICAgICAgVHlwZS5JR05PUkVELFxuICAgICAgICAgICAgICAndW5zYWZlLWlubGluZSBpcyBpZ25vcmVkIGlmIGEgbm9uY2Ugb3IgYSBoYXNoIGlzIHByZXNlbnQuICcgK1xuICAgICAgICAgICAgICAgICAgJyhDU1AyIGFuZCBhYm92ZSknLFxuICAgICAgICAgICAgICBTZXZlcml0eS5OT05FLCBkaXJlY3RpdmUsIEtleXdvcmQuVU5TQUZFX0lOTElORSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZW1vdmUgbm9uY2VzIGFuZCBoYXNoZXMgKG5vdCBzdXBwb3J0ZWQgaW4gQ1NQIDwgdjIpLlxuICAgICAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcykge1xuICAgICAgICAgIGlmICh2YWx1ZS5zdGFydHNXaXRoKCdcXCdub25jZS0nKSB8fCB2YWx1ZS5zdGFydHNXaXRoKCdcXCdzaGEnKSkge1xuICAgICAgICAgICAgYXJyYXlSZW1vdmUoZWZmZWN0aXZlQ3NwVmFsdWVzLCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVmZmVjdGl2ZUNzcFZhbHVlcyAmJiBDc3AucG9saWN5SGFzU3RyaWN0RHluYW1pYyhwYXJzZWRDc3ApKSB7XG4gICAgICAvLyBJZ25vcmUgd2hpdGVsaXN0IGluIENTUCA+PSB2MyBpbiBwcmVzZW5jZSBvZiAnc3RyaWN0LWR5bmFtaWMnLlxuICAgICAgaWYgKGNzcFZlcnNpb24gPj0gVmVyc2lvbi5DU1AzKSB7XG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICAgICAgLy8gQmVjYXVzZSBvZiAnc3RyaWN0LWR5bmFtaWMnIGFsbCBob3N0LXNvdXJjZSBhbmQgc2NoZW1lLXNvdXJjZVxuICAgICAgICAgIC8vIGV4cHJlc3Npb25zLCBhcyB3ZWxsIGFzIHRoZSBcIid1bnNhZmUtaW5saW5lJ1wiIGFuZCBcIidzZWxmJ1xuICAgICAgICAgIC8vIGtleXdvcmQtc291cmNlcyB3aWxsIGJlIGlnbm9yZWQuXG4gICAgICAgICAgLy8gaHR0cHM6Ly93M2MuZ2l0aHViLmlvL3dlYmFwcHNlYy1jc3AvI3N0cmljdC1keW5hbWljLXVzYWdlXG4gICAgICAgICAgaWYgKCF2YWx1ZS5zdGFydHNXaXRoKCdcXCcnKSB8fCB2YWx1ZSA9PT0gS2V5d29yZC5TRUxGIHx8XG4gICAgICAgICAgICAgIHZhbHVlID09PSBLZXl3b3JkLlVOU0FGRV9JTkxJTkUpIHtcbiAgICAgICAgICAgIGFycmF5UmVtb3ZlKGVmZmVjdGl2ZUNzcFZhbHVlcywgdmFsdWUpO1xuICAgICAgICAgICAgZmluZGluZ3MucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICAgICAgICBUeXBlLklHTk9SRUQsXG4gICAgICAgICAgICAgICAgJ0JlY2F1c2Ugb2Ygc3RyaWN0LWR5bmFtaWMgdGhpcyBlbnRyeSBpcyBpZ25vcmVkIGluIENTUDMgYW5kIGFib3ZlJyxcbiAgICAgICAgICAgICAgICBTZXZlcml0eS5OT05FLCBkaXJlY3RpdmUsIHZhbHVlKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzdHJpY3QtZHluYW1pYyBub3Qgc3VwcG9ydGVkLlxuICAgICAgICBhcnJheVJlbW92ZShlZmZlY3RpdmVDc3BWYWx1ZXMsIEtleXdvcmQuU1RSSUNUX0RZTkFNSUMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjc3BWZXJzaW9uIDwgVmVyc2lvbi5DU1AzKSB7XG4gICAgICAvLyBSZW1vdmUgQ1NQMyBkaXJlY3RpdmVzIGZyb20gcHJlLUNTUDMgcG9saWNpZXMuXG4gICAgICAvLyBodHRwczovL3czYy5naXRodWIuaW8vd2ViYXBwc2VjLWNzcC8jY2hhbmdlcy1mcm9tLWxldmVsLTJcbiAgICAgIGRlbGV0ZSBlZmZlY3RpdmVDc3BbRGlyZWN0aXZlLlJFUE9SVF9UT107XG4gICAgICBkZWxldGUgZWZmZWN0aXZlQ3NwW0RpcmVjdGl2ZS5XT1JLRVJfU1JDXTtcbiAgICAgIGRlbGV0ZSBlZmZlY3RpdmVDc3BbRGlyZWN0aXZlLk1BTklGRVNUX1NSQ107XG4gICAgICBkZWxldGUgZWZmZWN0aXZlQ3NwW0RpcmVjdGl2ZS5UUlVTVEVEX1RZUEVTXTtcbiAgICAgIGRlbGV0ZSBlZmZlY3RpdmVDc3BbRGlyZWN0aXZlLlJFUVVJUkVfVFJVU1RFRF9UWVBFU19GT1JdO1xuICAgIH1cblxuICAgIHJldHVybiBlZmZlY3RpdmVDc3A7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBkZWZhdWx0LXNyYyBpZiBkaXJlY3RpdmUgaXMgYSBmZXRjaCBkaXJlY3RpdmUgYW5kIGlzIG5vdCBwcmVzZW50IGluXG4gICAqIHRoZSBwcm92aWRlZCBDU1AuIE90aGVyd2lzZSB0aGUgcHJvdmlkZWQgZGlyZWN0aXZlIGlzIHJldHVybmVkLlxuICAgKiBAcGFyYW0gcGFyc2VkQ3NwIENTUC5cbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBDU1AuXG4gICAqIEByZXR1cm4gVGhlIGVmZmVjdGl2ZSBkaXJlY3RpdmUuXG4gICAqL1xuICBzdGF0aWMgZ2V0RWZmZWN0aXZlRGlyZWN0aXZlKHBhcnNlZENzcDogQ3NwLCBkaXJlY3RpdmU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gT25seSBmZXRjaCBkaXJlY3RpdmVzIGRlZmF1bHQgdG8gZGVmYXVsdC1zcmMuXG4gICAgaWYgKCEoZGlyZWN0aXZlIGluIHBhcnNlZENzcCkgJiZcbiAgICAgICAgRkVUQ0hfRElSRUNUSVZFUy5pbmNsdWRlcyhkaXJlY3RpdmUgYXMgRGlyZWN0aXZlKSkge1xuICAgICAgcmV0dXJuIERpcmVjdGl2ZS5ERUZBVUxUX1NSQztcbiAgICB9XG5cbiAgICByZXR1cm4gZGlyZWN0aXZlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHBhc3NlZCBkaXJlY3RpdmVzIGlmIHByZXNlbnQgaW4gdGhlIENTUCBvciBkZWZhdWx0LXNyY1xuICAgKiBvdGhlcndpc2UuXG4gICAqIEBwYXJhbSBwYXJzZWRDc3AgQ1NQLlxuICAgKiBAcGFyYW0gZGlyZWN0aXZlcyBDU1AuXG4gICAqIEByZXR1cm4gVGhlIGVmZmVjdGl2ZSBkaXJlY3RpdmVzLlxuICAgKi9cbiAgc3RhdGljIGdldEVmZmVjdGl2ZURpcmVjdGl2ZXMocGFyc2VkQ3NwOiBDc3AsIGRpcmVjdGl2ZXM6IHN0cmluZ1tdKTpcbiAgICAgIHN0cmluZ1tdIHtcbiAgICBjb25zdCBlZmZlY3RpdmVEaXJlY3RpdmVzID0gbmV3IFNldChcbiAgICAgICAgZGlyZWN0aXZlcy5tYXAoKHZhbCkgPT4gQ3NwLmdldEVmZmVjdGl2ZURpcmVjdGl2ZShwYXJzZWRDc3AsIHZhbCkpKTtcbiAgICByZXR1cm4gWy4uLmVmZmVjdGl2ZURpcmVjdGl2ZXNdO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgQ1NQIGlzIHVzaW5nIG5vbmNlcyBmb3Igc2NyaXB0cy5cbiAgICogQHBhcmFtIHBhcnNlZENzcCBDU1AuXG4gICAqIEByZXR1cm4gdHJ1ZSwgaWYgdGhlIGlzIHVzaW5nIHNjcmlwdCBub25jZXMuXG4gICAqL1xuICBzdGF0aWMgcG9saWN5SGFzU2NyaXB0Tm9uY2VzKHBhcnNlZENzcDogQ3NwKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZGlyZWN0aXZlTmFtZSA9XG4gICAgICAgIENzcC5nZXRFZmZlY3RpdmVEaXJlY3RpdmUocGFyc2VkQ3NwLCBEaXJlY3RpdmUuU0NSSVBUX1NSQyk7XG4gICAgY29uc3QgdmFsdWVzID0gcGFyc2VkQ3NwW2RpcmVjdGl2ZU5hbWVdIHx8IFtdO1xuICAgIHJldHVybiB2YWx1ZXMuc29tZSgodmFsKSA9PiBpc05vbmNlKHZhbCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgQ1NQIGlzIHVzaW5nIGhhc2hlcyBmb3Igc2NyaXB0cy5cbiAgICogQHBhcmFtIHBhcnNlZENzcCBDU1AuXG4gICAqIEByZXR1cm4gdHJ1ZSwgaWYgdGhlIENTUCBpcyB1c2luZyBzY3JpcHQgaGFzaGVzLlxuICAgKi9cbiAgc3RhdGljIHBvbGljeUhhc1NjcmlwdEhhc2hlcyhwYXJzZWRDc3A6IENzcCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGRpcmVjdGl2ZU5hbWUgPVxuICAgICAgICBDc3AuZ2V0RWZmZWN0aXZlRGlyZWN0aXZlKHBhcnNlZENzcCwgRGlyZWN0aXZlLlNDUklQVF9TUkMpO1xuICAgIGNvbnN0IHZhbHVlcyA9IHBhcnNlZENzcFtkaXJlY3RpdmVOYW1lXSB8fCBbXTtcbiAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbCkgPT4gaXNIYXNoKHZhbCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgQ1NQIGlzIHVzaW5nIHN0cmljdC1keW5hbWljLlxuICAgKiBAcGFyYW0gcGFyc2VkQ3NwIENTUC5cbiAgICogQHJldHVybiB0cnVlLCBpZiB0aGUgQ1NQIGlzIHVzaW5nIENTUCBub25jZXMuXG4gICAqL1xuICBzdGF0aWMgcG9saWN5SGFzU3RyaWN0RHluYW1pYyhwYXJzZWRDc3A6IENzcCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGRpcmVjdGl2ZU5hbWUgPVxuICAgICAgICBDc3AuZ2V0RWZmZWN0aXZlRGlyZWN0aXZlKHBhcnNlZENzcCwgRGlyZWN0aXZlLlNDUklQVF9TUkMpO1xuICAgIGNvbnN0IHZhbHVlcyA9IHBhcnNlZENzcFtkaXJlY3RpdmVOYW1lXSB8fCBbXTtcbiAgICByZXR1cm4gdmFsdWVzLmluY2x1ZGVzKEtleXdvcmQuU1RSSUNUX0RZTkFNSUMpO1xuICB9XG59XG5cblxuLyoqXG4gKiBDU1AgZGlyZWN0aXZlIHNvdXJjZSBrZXl3b3Jkcy5cbiAqL1xuZXhwb3J0IGVudW0gS2V5d29yZCB7XG4gIFNFTEYgPSAnXFwnc2VsZlxcJycsXG4gIE5PTkUgPSAnXFwnbm9uZVxcJycsXG4gIFVOU0FGRV9JTkxJTkUgPSAnXFwndW5zYWZlLWlubGluZVxcJycsXG4gIFVOU0FGRV9FVkFMID0gJ1xcJ3Vuc2FmZS1ldmFsXFwnJyxcbiAgV0FTTV9FVkFMID0gJ1xcJ3dhc20tZXZhbFxcJycsXG4gIFdBU01fVU5TQUZFX0VWQUwgPSAnXFwnd2FzbS11bnNhZmUtZXZhbFxcJycsXG4gIFNUUklDVF9EWU5BTUlDID0gJ1xcJ3N0cmljdC1keW5hbWljXFwnJyxcbiAgVU5TQUZFX0hBU0hFRF9BVFRSSUJVVEVTID0gJ1xcJ3Vuc2FmZS1oYXNoZWQtYXR0cmlidXRlc1xcJycsXG4gIFVOU0FGRV9IQVNIRVMgPSAnXFwndW5zYWZlLWhhc2hlc1xcJycsXG4gIFJFUE9SVF9TQU1QTEUgPSAnXFwncmVwb3J0LXNhbXBsZVxcJydcbn1cblxuXG4vKipcbiAqIENTUCBkaXJlY3RpdmUgc291cmNlIGtleXdvcmRzLlxuICovXG5leHBvcnQgZW51bSBUcnVzdGVkVHlwZXNTaW5rIHtcbiAgU0NSSVBUID0gJ1xcJ3NjcmlwdFxcJydcbn1cblxuXG4vKipcbiAqIENTUCB2MyBkaXJlY3RpdmVzLlxuICogTGlzdCBvZiB2YWxpZCBDU1AgZGlyZWN0aXZlczpcbiAqICAtIGh0dHA6Ly93d3cudzMub3JnL1RSL0NTUDIvI2RpcmVjdGl2ZXNcbiAqICAtIGh0dHBzOi8vd3d3LnczLm9yZy9UUi91cGdyYWRlLWluc2VjdXJlLXJlcXVlc3RzL1xuICpcbiAqL1xuZXhwb3J0IGVudW0gRGlyZWN0aXZlIHtcbiAgLy8gRmV0Y2ggZGlyZWN0aXZlc1xuICBDSElMRF9TUkMgPSAnY2hpbGQtc3JjJyxcbiAgQ09OTkVDVF9TUkMgPSAnY29ubmVjdC1zcmMnLFxuICBERUZBVUxUX1NSQyA9ICdkZWZhdWx0LXNyYycsXG4gIEZPTlRfU1JDID0gJ2ZvbnQtc3JjJyxcbiAgRlJBTUVfU1JDID0gJ2ZyYW1lLXNyYycsXG4gIElNR19TUkMgPSAnaW1nLXNyYycsXG4gIE1FRElBX1NSQyA9ICdtZWRpYS1zcmMnLFxuICBPQkpFQ1RfU1JDID0gJ29iamVjdC1zcmMnLFxuICBTQ1JJUFRfU1JDID0gJ3NjcmlwdC1zcmMnLFxuICBTQ1JJUFRfU1JDX0FUVFIgPSAnc2NyaXB0LXNyYy1hdHRyJyxcbiAgU0NSSVBUX1NSQ19FTEVNID0gJ3NjcmlwdC1zcmMtZWxlbScsXG4gIFNUWUxFX1NSQyA9ICdzdHlsZS1zcmMnLFxuICBTVFlMRV9TUkNfQVRUUiA9ICdzdHlsZS1zcmMtYXR0cicsXG4gIFNUWUxFX1NSQ19FTEVNID0gJ3N0eWxlLXNyYy1lbGVtJyxcbiAgUFJFRkVUQ0hfU1JDID0gJ3ByZWZldGNoLXNyYycsXG5cbiAgTUFOSUZFU1RfU1JDID0gJ21hbmlmZXN0LXNyYycsXG4gIFdPUktFUl9TUkMgPSAnd29ya2VyLXNyYycsXG5cbiAgLy8gRG9jdW1lbnQgZGlyZWN0aXZlc1xuICBCQVNFX1VSSSA9ICdiYXNlLXVyaScsXG4gIFBMVUdJTl9UWVBFUyA9ICdwbHVnaW4tdHlwZXMnLFxuICBTQU5EQk9YID0gJ3NhbmRib3gnLFxuICBESVNPV05fT1BFTkVSID0gJ2Rpc293bi1vcGVuZXInLFxuXG4gIC8vIE5hdmlnYXRpb24gZGlyZWN0aXZlc1xuICBGT1JNX0FDVElPTiA9ICdmb3JtLWFjdGlvbicsXG4gIEZSQU1FX0FOQ0VTVE9SUyA9ICdmcmFtZS1hbmNlc3RvcnMnLFxuXG4gIC8vIFJlcG9ydGluZyBkaXJlY3RpdmVzXG4gIFJFUE9SVF9UTyA9ICdyZXBvcnQtdG8nLFxuICBSRVBPUlRfVVJJID0gJ3JlcG9ydC11cmknLFxuXG4gIC8vIE90aGVyIGRpcmVjdGl2ZXNcbiAgQkxPQ0tfQUxMX01JWEVEX0NPTlRFTlQgPSAnYmxvY2stYWxsLW1peGVkLWNvbnRlbnQnLFxuICBVUEdSQURFX0lOU0VDVVJFX1JFUVVFU1RTID0gJ3VwZ3JhZGUtaW5zZWN1cmUtcmVxdWVzdHMnLFxuICBSRUZMRUNURURfWFNTID0gJ3JlZmxlY3RlZC14c3MnLFxuICBSRUZFUlJFUiA9ICdyZWZlcnJlcicsXG4gIFJFUVVJUkVfU1JJX0ZPUiA9ICdyZXF1aXJlLXNyaS1mb3InLFxuICBUUlVTVEVEX1RZUEVTID0gJ3RydXN0ZWQtdHlwZXMnLFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vV0lDRy90cnVzdGVkLXR5cGVzXG4gIFJFUVVJUkVfVFJVU1RFRF9UWVBFU19GT1IgPSAncmVxdWlyZS10cnVzdGVkLXR5cGVzLWZvcidcbn1cblxuLyoqXG4gKiBDU1AgdjMgZmV0Y2ggZGlyZWN0aXZlcy5cbiAqIEZldGNoIGRpcmVjdGl2ZXMgY29udHJvbCB0aGUgbG9jYXRpb25zIGZyb20gd2hpY2ggcmVzb3VyY2VzIG1heSBiZSBsb2FkZWQuXG4gKiBodHRwczovL3czYy5naXRodWIuaW8vd2ViYXBwc2VjLWNzcC8jZGlyZWN0aXZlcy1mZXRjaFxuICpcbiAqL1xuZXhwb3J0IGNvbnN0IEZFVENIX0RJUkVDVElWRVM6IERpcmVjdGl2ZVtdID0gW1xuICBEaXJlY3RpdmUuQ0hJTERfU1JDLCBEaXJlY3RpdmUuQ09OTkVDVF9TUkMsIERpcmVjdGl2ZS5ERUZBVUxUX1NSQyxcbiAgRGlyZWN0aXZlLkZPTlRfU1JDLCBEaXJlY3RpdmUuRlJBTUVfU1JDLCBEaXJlY3RpdmUuSU1HX1NSQyxcbiAgRGlyZWN0aXZlLk1BTklGRVNUX1NSQywgRGlyZWN0aXZlLk1FRElBX1NSQywgRGlyZWN0aXZlLk9CSkVDVF9TUkMsXG4gIERpcmVjdGl2ZS5TQ1JJUFRfU1JDLCBEaXJlY3RpdmUuU0NSSVBUX1NSQ19BVFRSLCBEaXJlY3RpdmUuU0NSSVBUX1NSQ19FTEVNLFxuICBEaXJlY3RpdmUuU1RZTEVfU1JDLCBEaXJlY3RpdmUuU1RZTEVfU1JDX0FUVFIsIERpcmVjdGl2ZS5TVFlMRV9TUkNfRUxFTSxcbiAgRGlyZWN0aXZlLldPUktFUl9TUkNcbl07XG5cbi8qKlxuICogQ1NQIHZlcnNpb24uXG4gKi9cbmV4cG9ydCBlbnVtIFZlcnNpb24ge1xuICBDU1AxID0gMSxcbiAgQ1NQMixcbiAgQ1NQM1xufVxuXG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgc3RyaW5nIGlzIGEgdmFsaWQgQ1NQIGRpcmVjdGl2ZS5cbiAqIEBwYXJhbSBkaXJlY3RpdmUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJuIFRydWUgaWYgZGlyZWN0aXZlIGlzIGEgdmFsaWQgQ1NQIGRpcmVjdGl2ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGlyZWN0aXZlKGRpcmVjdGl2ZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBPYmplY3QudmFsdWVzKERpcmVjdGl2ZSkuaW5jbHVkZXMoZGlyZWN0aXZlIGFzIERpcmVjdGl2ZSk7XG59XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBzdHJpbmcgaXMgYSB2YWxpZCBDU1Aga2V5d29yZC5cbiAqIEBwYXJhbSBrZXl3b3JkIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybiBUcnVlIGlmIGtleXdvcmQgaXMgYSB2YWxpZCBDU1Aga2V5d29yZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzS2V5d29yZChrZXl3b3JkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoS2V5d29yZCkuaW5jbHVkZXMoa2V5d29yZCBhcyBLZXl3b3JkKTtcbn1cblxuXG4vKipcbiAqIENoZWNrcyBpZiBhIHN0cmluZyBpcyBhIHZhbGlkIFVSTCBzY2hlbWUuXG4gKiBTY2hlbWUgcGFydCArIFwiOlwiXG4gKiBGb3Igc2NoZW1lIHBhcnQgc2VlIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzOTg2I3NlY3Rpb24tMy4xXG4gKiBAcGFyYW0gdXJsU2NoZW1lIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybiBUcnVlIGlmIHVybFNjaGVtZSBoYXMgYSB2YWxpZCBzY2hlbWUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1VybFNjaGVtZSh1cmxTY2hlbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cCgnXlthLXpBLVpdWythLXpBLVowLTkuLV0qOiQnKTtcbiAgcmV0dXJuIHBhdHRlcm4udGVzdCh1cmxTY2hlbWUpO1xufVxuXG5cbi8qKlxuICogQSByZWdleCBwYXR0ZXJuIHRvIGNoZWNrIG5vbmNlIHByZWZpeCBhbmQgQmFzZTY0IGZvcm1hdHRpbmcgb2YgYSBub25jZSB2YWx1ZS5cbiAqL1xuZXhwb3J0IGNvbnN0IFNUUklDVF9OT05DRV9QQVRURVJOID1cbiAgICBuZXcgUmVnRXhwKCdeXFwnbm9uY2UtW2EtekEtWjAtOSsvXy1dK1s9XXswLDJ9XFwnJCcpO1xuXG5cbi8qKiBBIHJlZ2V4IHBhdHRlcm4gZm9yIGNoZWNraW5nIGlmIG5vbmNlIHByZWZpeC4gKi9cbmV4cG9ydCBjb25zdCBOT05DRV9QQVRURVJOID0gbmV3IFJlZ0V4cCgnXlxcJ25vbmNlLSguKylcXCckJyk7XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBzdHJpbmcgaXMgYSB2YWxpZCBDU1Agbm9uY2UuXG4gKiBTZWUgaHR0cDovL3d3dy53My5vcmcvVFIvQ1NQMi8jbm9uY2VfdmFsdWVcbiAqIEBwYXJhbSBub25jZSB2YWx1ZSB0byBjaGVjay5cbiAqIEBwYXJhbSBzdHJpY3RDaGVjayBDaGVjayBpZiB0aGUgbm9uY2UgdXNlcyB0aGUgYmFzZTY0IGNoYXJzZXQuXG4gKiBAcmV0dXJuIFRydWUgaWYgbm9uY2UgaXMgaGFzIGEgdmFsaWQgQ1NQIG5vbmNlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb25jZShub25jZTogc3RyaW5nLCBzdHJpY3RDaGVjaz86IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgY29uc3QgcGF0dGVybiA9IHN0cmljdENoZWNrID8gU1RSSUNUX05PTkNFX1BBVFRFUk4gOiBOT05DRV9QQVRURVJOO1xuICByZXR1cm4gcGF0dGVybi50ZXN0KG5vbmNlKTtcbn1cblxuXG4vKipcbiAqIEEgcmVnZXggcGF0dGVybiB0byBjaGVjayBoYXNoIHByZWZpeCBhbmQgQmFzZTY0IGZvcm1hdHRpbmcgb2YgYSBoYXNoIHZhbHVlLlxuICovXG5leHBvcnQgY29uc3QgU1RSSUNUX0hBU0hfUEFUVEVSTiA9XG4gICAgbmV3IFJlZ0V4cCgnXlxcJyhzaGEyNTZ8c2hhMzg0fHNoYTUxMiktW2EtekEtWjAtOSsvXStbPV17MCwyfVxcJyQnKTtcblxuXG4vKiogQSByZWdleCBwYXR0ZXJuIHRvIGNoZWNrIGhhc2ggcHJlZml4LiAqL1xuZXhwb3J0IGNvbnN0IEhBU0hfUEFUVEVSTiA9IG5ldyBSZWdFeHAoJ15cXCcoc2hhMjU2fHNoYTM4NHxzaGE1MTIpLSguKylcXCckJyk7XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBzdHJpbmcgaXMgYSB2YWxpZCBDU1AgaGFzaC5cbiAqIFNlZSBodHRwOi8vd3d3LnczLm9yZy9UUi9DU1AyLyNoYXNoX3ZhbHVlXG4gKiBAcGFyYW0gaGFzaCB2YWx1ZSB0byBjaGVjay5cbiAqIEBwYXJhbSBzdHJpY3RDaGVjayBDaGVjayBpZiB0aGUgaGFzaCB1c2VzIHRoZSBiYXNlNjQgY2hhcnNldC5cbiAqIEByZXR1cm4gVHJ1ZSBpZiBoYXNoIGlzIGhhcyBhIHZhbGlkIENTUCBoYXNoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNIYXNoKGhhc2g6IHN0cmluZywgc3RyaWN0Q2hlY2s/OiBib29sZWFuKTogYm9vbGVhbiB7XG4gIGNvbnN0IHBhdHRlcm4gPSBzdHJpY3RDaGVjayA/IFNUUklDVF9IQVNIX1BBVFRFUk4gOiBIQVNIX1BBVFRFUk47XG4gIHJldHVybiBwYXR0ZXJuLnRlc3QoaGFzaCk7XG59XG5cblxuLyoqXG4gKiBDbGFzcyB0byByZXByZXNlbnQgYWxsIGdlbmVyaWMgQ1NQIGVycm9ycy5cbiAqL1xuZXhwb3J0IGNsYXNzIENzcEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQHBhcmFtIG1lc3NhZ2UgQW4gb3B0aW9uYWwgZXJyb3IgbWVzc2FnZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgfVxufVxuXG4vKipcbiAqIE11dGF0ZSB0aGUgZ2l2ZW4gYXJyYXkgdG8gcmVtb3ZlIHRoZSBmaXJzdCBpbnN0YW5jZSBvZiB0aGUgZ2l2ZW4gaXRlbVxuICovXG5mdW5jdGlvbiBhcnJheVJlbW92ZTxUPihhcnI6IFRbXSwgaXRlbTogVCk6IHZvaWQge1xuICBpZiAoYXJyLmluY2x1ZGVzKGl0ZW0pKSB7XG4gICAgY29uc3QgaWR4ID0gYXJyLmZpbmRJbmRleChlbGVtID0+IGl0ZW0gPT09IGVsZW0pO1xuICAgIGFyci5zcGxpY2UoaWR4LCAxKTtcbiAgfVxufVxuIl19
;return exports;});

//javascript/security/csp/csp_evaluator/checks/parser_checks.closure.js
goog.loadModule(function(exports) {'use strict';/**
 *
 * @fileoverview Collection of CSP parser checks which can be used to find
 * common syntax mistakes like missing semicolons, invalid directives or
 * invalid keywords.
 * Generated from: javascript/security/csp/csp_evaluator/checks/parser_checks.ts
 * @author lwe\@google.com (Lukas Weichselbaum)
 *
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
goog.module('google3.javascript.security.csp.csp_evaluator.checks.parser_checks');
var module = module || { id: 'javascript/security/csp/csp_evaluator/checks/parser_checks.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
const tsickle_csp_1 = goog.requireType("google3.javascript.security.csp.csp_evaluator.csp");
const tsickle_finding_2 = goog.requireType("google3.javascript.security.csp.csp_evaluator.finding");
const csp = goog.require('google3.javascript.security.csp.csp_evaluator.csp');
const csp_1 = csp;
const finding_1 = goog.require('google3.javascript.security.csp.csp_evaluator.finding');
/**
 * Checks if the csp contains invalid directives.
 *
 * Example policy where this check would trigger:
 *  foobar-src foo.bar
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp A parsed csp.
 * @return {!Array<!tsickle_finding_2.Finding>}
 */
function checkUnknownDirective(parsedCsp) {
    /** @type {!Array<!tsickle_finding_2.Finding>} */
    const findings = [];
    for (const directive of Object.keys(parsedCsp)) {
        if (csp.isDirective(directive)) {
            // Directive is known.
            continue;
        }
        if (directive.endsWith(':')) {
            findings.push(new finding_1.Finding(finding_1.Type.UNKNOWN_DIRECTIVE, 'CSP directives don\'t end with a colon.', finding_1.Severity.SYNTAX, directive));
        }
        else {
            findings.push(new finding_1.Finding(finding_1.Type.UNKNOWN_DIRECTIVE, 'Directive "' + directive + '" is not a known CSP directive.', finding_1.Severity.SYNTAX, directive));
        }
    }
    return findings;
}
exports.checkUnknownDirective = checkUnknownDirective;
/**
 * Checks if semicolons are missing in the csp.
 *
 * Example policy where this check would trigger (missing semicolon before
 * start of object-src):
 *  script-src foo.bar object-src 'none'
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp A parsed csp.
 * @return {!Array<!tsickle_finding_2.Finding>}
 */
function checkMissingSemicolon(parsedCsp) {
    /** @type {!Array<!tsickle_finding_2.Finding>} */
    const findings = [];
    for (const directive of Object.keys(parsedCsp)) {
        /** @type {(undefined|!Array<string>)} */
        const directiveValues = parsedCsp[directive];
        if (directiveValues === undefined) {
            continue;
        }
        for (const value of directiveValues) {
            // If we find a known directive inside a directive value, it is very
            // likely that a semicolon was forgoten.
            if (csp.isDirective(value)) {
                findings.push(new finding_1.Finding(finding_1.Type.MISSING_SEMICOLON, 'Did you forget the semicolon? ' +
                    '"' + value + '" seems to be a directive, not a value.', finding_1.Severity.SYNTAX, directive, value));
            }
        }
    }
    return findings;
}
exports.checkMissingSemicolon = checkMissingSemicolon;
/**
 * Checks if csp contains invalid keywords.
 *
 * Example policy where this check would trigger:
 *  script-src 'notAkeyword'
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp A parsed csp.
 * @return {!Array<!tsickle_finding_2.Finding>}
 */
function checkInvalidKeyword(parsedCsp) {
    /** @type {!Array<!tsickle_finding_2.Finding>} */
    const findings = [];
    /** @type {!Array<string>} */
    const keywordsNoTicks = Object.values(csp_1.Keyword).map((/**
     * @param {!tsickle_csp_1.Keyword} k
     * @return {string}
     */
    (k) => k.replace(/'/g, '')));
    for (const directive of Object.keys(parsedCsp)) {
        /** @type {(undefined|!Array<string>)} */
        const directiveValues = parsedCsp[directive];
        if (directiveValues === undefined) {
            continue;
        }
        for (const value of directiveValues) {
            // Check if single ticks have been forgotten.
            if (keywordsNoTicks.some((/**
             * @param {string} k
             * @return {boolean}
             */
            (k) => k === value)) ||
                value.startsWith('nonce-') ||
                value.match(/^(sha256|sha384|sha512)-/)) {
                findings.push(new finding_1.Finding(finding_1.Type.INVALID_KEYWORD, 'Did you forget to surround "' + value + '" with single-ticks?', finding_1.Severity.SYNTAX, directive, value));
                continue;
            }
            // Continue, if the value doesn't start with single tick.
            // All CSP keywords start with a single tick.
            if (!value.startsWith('\'')) {
                continue;
            }
            if (directive === csp.Directive.REQUIRE_TRUSTED_TYPES_FOR) {
                // Continue, if it's an allowed Trusted Types sink.
                if (value === csp.TrustedTypesSink.SCRIPT) {
                    continue;
                }
            }
            else if (directive === csp.Directive.TRUSTED_TYPES) {
                // Continue, if it's an allowed Trusted Types keyword.
                if (value === '\'allow-duplicates\'') {
                    continue;
                }
            }
            else {
                // Continue, if it's a valid keyword.
                if (csp.isKeyword(value) || csp.isHash(value) || csp.isNonce(value)) {
                    continue;
                }
            }
            findings.push(new finding_1.Finding(finding_1.Type.INVALID_KEYWORD, value + ' seems to be an invalid CSP keyword.', finding_1.Severity.SYNTAX, directive, value));
        }
    }
    return findings;
}
exports.checkInvalidKeyword = checkInvalidKeyword;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyX2NoZWNrcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL2phdmFzY3JpcHQvc2VjdXJpdHkvY3NwL2NzcF9ldmFsdWF0b3IvY2hlY2tzL3BhcnNlcl9jaGVja3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxQkEsOEVBQXlFO0FBQ3pFLGtCQUErRTtBQUUvRSx3RkFBbUQ7Ozs7Ozs7Ozs7QUFXbkQsU0FBZ0IscUJBQXFCLENBQUMsU0FBYzs7VUFDNUMsUUFBUSxHQUFjLEVBQUU7SUFFOUIsS0FBSyxNQUFNLFNBQVMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQzlDLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM5QixzQkFBc0I7WUFDdEIsU0FBUztTQUNWO1FBRUQsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNCLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBTyxDQUNyQixjQUFJLENBQUMsaUJBQWlCLEVBQUUseUNBQXlDLEVBQ2pFLGtCQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDbEM7YUFBTTtZQUNMLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBTyxDQUNyQixjQUFJLENBQUMsaUJBQWlCLEVBQ3RCLGFBQWEsR0FBRyxTQUFTLEdBQUcsaUNBQWlDLEVBQzdELGtCQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDbEM7S0FDRjtJQUVELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUF0QkQsc0RBc0JDOzs7Ozs7Ozs7OztBQVlELFNBQWdCLHFCQUFxQixDQUFDLFNBQWM7O1VBQzVDLFFBQVEsR0FBYyxFQUFFO0lBRTlCLEtBQUssTUFBTSxTQUFTLElBQUksTUFB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SyxDQUFDLENBQUMsQ0FBQztTQUN6QztLQUNGO0lBRUQsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQXBERCxrREFvREMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQ29sbGVjdGlvbiBvZiBDU1AgcGFyc2VyIGNoZWNrcyB3aGljaCBjYW4gYmUgdXNlZCB0byBmaW5kXG4gKiBjb21tb24gc3ludGF4IG1pc3Rha2VzIGxpa2UgbWlzc2luZyBzZW1pY29sb25zLCBpbnZhbGlkIGRpcmVjdGl2ZXMgb3JcbiAqIGludmFsaWQga2V5d29yZHMuXG4gKiBAYXV0aG9yIGx3ZUBnb29nbGUuY29tIChMdWthcyBXZWljaHNlbGJhdW0pXG4gKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCAqIGFzIGNzcCBmcm9tICdnb29nbGUzL2phdmFzY3JpcHQvc2VjdXJpdHkvY3NwL2NzcF9ldmFsdWF0b3IvY3NwJztcbmltcG9ydCB7Q3NwLCBLZXl3b3JkfSBmcm9tICdnb29nbGUzL2phdmFzY3JpcHQvc2VjdXJpdHkvY3NwL2NzcF9ldmFsdWF0b3IvY3NwJztcblxuaW1wb3J0IHtGaW5kaW5nLCBTZXZlcml0eSwgVHlwZX0gZnJvbSAnLi4vZmluZGluZyc7XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGNzcCBjb250YWlucyBpbnZhbGlkIGRpcmVjdGl2ZXMuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyOlxuICogIGZvb2Jhci1zcmMgZm9vLmJhclxuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgQSBwYXJzZWQgY3NwLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tVbmtub3duRGlyZWN0aXZlKHBhcnNlZENzcDogQ3NwKTogRmluZGluZ1tdIHtcbiAgY29uc3QgZmluZGluZ3M6IEZpbmRpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIE9iamVjdC5rZXlzKHBhcnNlZENzcCkpIHtcbiAgICBpZiAoY3NwLmlzRGlyZWN0aXZlKGRpcmVjdGl2ZSkpIHtcbiAgICAgIC8vIERpcmVjdGl2ZSBpcyBrbm93bi5cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChkaXJlY3RpdmUuZW5kc1dpdGgoJzonKSkge1xuICAgICAgZmluZGluZ3MucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICBUeXBlLlVOS05PV05fRElSRUNUSVZFLCAnQ1NQIGRpcmVjdGl2ZXMgZG9uXFwndCBlbmQgd2l0aCBhIGNvbG9uLicsXG4gICAgICAgICAgU2V2ZXJpdHkuU1lOVEFYLCBkaXJlY3RpdmUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmluZGluZ3MucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICBUeXBlLlVOS05PV05fRElSRUNUSVZFLFxuICAgICAgICAgICdEaXJlY3RpdmUgXCInICsgZGlyZWN0aXZlICsgJ1wiIGlzIG5vdCBhIGtub3duIENTUCBkaXJlY3RpdmUuJyxcbiAgICAgICAgICBTZXZlcml0eS5TWU5UQVgsIGRpcmVjdGl2ZSkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmaW5kaW5ncztcbn1cblxuXG4vKipcbiAqIENoZWNrcyBpZiBzZW1pY29sb25zIGFyZSBtaXNzaW5nIGluIHRoZSBjc3AuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyIChtaXNzaW5nIHNlbWljb2xvbiBiZWZvcmVcbiAqIHN0YXJ0IG9mIG9iamVjdC1zcmMpOlxuICogIHNjcmlwdC1zcmMgZm9vLmJhciBvYmplY3Qtc3JjICdub25lJ1xuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgQSBwYXJzZWQgY3NwLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tNaXNzaW5nU2VtaWNvbG9uKHBhcnNlZENzcDogQ3NwKTogRmluZGluZ1tdIHtcbiAgY29uc3QgZmluZGluZ3M6IEZpbmRpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIE9iamVjdC5rZXlzKHBhcnNlZENzcCkpIHtcbiAgICBjb25zdCBkaXJlY3RpdmVWYWx1ZXMgPSBwYXJzZWRDc3BbZGlyZWN0aXZlXTtcbiAgICBpZiAoZGlyZWN0aXZlVmFsdWVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIGRpcmVjdGl2ZVZhbHVlcykge1xuICAgICAgLy8gSWYgd2UgZmluZCBhIGtub3duIGRpcmVjdGl2ZSBpbnNpZGUgYSBkaXJlY3RpdmUgdmFsdWUsIGl0IGlzIHZlcnlcbiAgICAgIC8vIGxpa2VseSB0aGF0IGEgc2VtaWNvbG9uIHdhcyBmb3Jnb3Rlbi5cbiAgICAgIGlmIChjc3AuaXNEaXJlY3RpdmUodmFsdWUpKSB7XG4gICAgICAgIGZpbmRpbmdzLnB1c2gobmV3IEZpbmRpbmcoXG4gICAgICAgICAgICBUeXBlLk1JU1NJTkdfU0VNSUNPTE9OLFxuICAgICAgICAgICAgJ0RpZCB5b3UgZm9yZ2V0IHRoZSBzZW1pY29sb24/ICcgK1xuICAgICAgICAgICAgICAgICdcIicgKyB2YWx1ZSArICdcIiBzZWVtcyB0byBiZSBhIGRpcmVjdGl2ZSwgbm90IGEgdmFsdWUuJyxcbiAgICAgICAgICAgIFNldmVyaXR5LlNZTlRBWCwgZGlyZWN0aXZlLCB2YWx1ZSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmaW5kaW5ncztcbn1cblxuXG4vKipcbiAqIENoZWNrcyBpZiBjc3AgY29udGFpbnMgaW52YWxpZCBrZXl3b3Jkcy5cbiAqXG4gKiBFeGFtcGxlIHBvbGljeSB3aGVyZSB0aGlzIGNoZWNrIHdvdWxkIHRyaWdnZXI6XG4gKiAgc2NyaXB0LXNyYyAnbm90QWtleXdvcmQnXG4gKlxuICogQHBhcmFtIHBhcnNlZENzcCBBIHBhcnNlZCBjc3AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0ludmFsaWRLZXl3b3JkKHBhcnNlZENzcDogQ3NwKTogRmluZGluZ1tdIHtcbiAgY29uc3QgZmluZGluZ3M6IEZpbmRpbmdbXSA9IFtdO1xuICBjb25zdCBrZXl3b3Jkc05vVGlja3MgPVxuICAgICAgT2JqZWN0LnZhbHVlcyhLZXl3b3JkKS5tYXAoKGspID0+IGsucmVwbGFjZSgvJy9nLCAnJykpO1xuXG4gIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIE9iamVjdC5rZXlzKHBhcnNlZENzcCkpIHtcbiAgICBjb25zdCBkaXJlY3RpdmVWYWx1ZXMgPSBwYXJzZWRDc3BbZGlyZWN0aXZlXTtcbiAgICBpZiAoZGlyZWN0aXZlVmFsdWVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIGRpcmVjdGl2ZVZhbHVlcykge1xuICAgICAgLy8gQ2hlY2sgaWYgc2luZ2xlIHRpY2tzIGhhdmUgYmVlbiBmb3Jnb3R0ZW4uXG4gICAgICBpZiAoa2V5d29yZHNOb1RpY2tzLnNvbWUoKGspID0+IGsgPT09IHZhbHVlKSB8fFxuICAgICAgICAgIHZhbHVlLnN0YXJ0c1dpdGgoJ25vbmNlLScpIHx8XG4gICAgICAgICAgdmFsdWUubWF0Y2goL14oc2hhMjU2fHNoYTM4NHxzaGE1MTIpLS8pKSB7XG4gICAgICAgIGZpbmRpbmdzLnB1c2gobmV3IEZpbmRpbmcoXG4gICAgICAgICAgICBUeXBlLklOVkFMSURfS0VZV09SRCxcbiAgICAgICAgICAgICdEaWQgeW91IGZvcmdldCB0byBzdXJyb3VuZCBcIicgKyB2YWx1ZSArICdcIiB3aXRoIHNpbmdsZS10aWNrcz8nLFxuICAgICAgICAgICAgU2V2ZXJpdHkuU1lOVEFYLCBkaXJlY3RpdmUsIHZhbHVlKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBDb250aW51ZSwgaWYgdGhlIHZhbHVlIGRvZXNuJ3Qgc3RhcnQgd2l0aCBzaW5nbGUgdGljay5cbiAgICAgIC8vIEFsbCBDU1Aga2V5d29yZHMgc3RhcnQgd2l0aCBhIHNpbmdsZSB0aWNrLlxuICAgICAgaWYgKCF2YWx1ZS5zdGFydHNXaXRoKCdcXCcnKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRpcmVjdGl2ZSA9PT0gY3NwLkRpcmVjdGl2ZS5SRVFVSVJFX1RSVVNURURfVFlQRVNfRk9SKSB7XG4gICAgICAgIC8vIENvbnRpbnVlLCBpZiBpdCdzIGFuIGFsbG93ZWQgVHJ1c3RlZCBUeXBlcyBzaW5rLlxuICAgICAgICBpZiAodmFsdWUgPT09IGNzcC5UcnVzdGVkVHlwZXNTaW5rLlNDUklQVCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGRpcmVjdGl2ZSA9PT0gY3NwLkRpcmVjdGl2ZS5UUlVTVEVEX1RZUEVTKSB7XG4gICAgICAgIC8vIENvbnRpbnVlLCBpZiBpdCdzIGFuIGFsbG93ZWQgVHJ1c3RlZCBUeXBlcyBrZXl3b3JkLlxuICAgICAgICBpZiAodmFsdWUgPT09ICdcXCdhbGxvdy1kdXBsaWNhdGVzXFwnJykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDb250aW51ZSwgaWYgaXQncyBhIHZhbGlkIGtleXdvcmQuXG4gICAgICAgIGlmIChjc3AuaXNLZXl3b3JkKHZhbHVlKSB8fCBjc3AuaXNIYXNoKHZhbHVlKSB8fCBjc3AuaXNOb25jZSh2YWx1ZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmaW5kaW5ncy5wdXNoKG5ldyBGaW5kaW5nKFxuICAgICAgICAgIFR5cGUuSU5WQUxJRF9LRVlXT1JELCB2YWx1ZSArICcgc2VlbXMgdG8gYmUgYW4gaW52YWxpZCBDU1Aga2V5d29yZC4nLFxuICAgICAgICAgIFNldmVyaXR5LlNZTlRBWCwgZGlyZWN0aXZlLCB2YWx1ZSkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmaW5kaW5ncztcbn1cblxuLy8gVE9ETyhsd2UpOiBBZGQgY2hlY2sgZm9yIE5PTl9BU0NJSV9DSEFSXG4iXX0=
;return exports;});

//javascript/security/csp/csp_evaluator/utils.closure.js
goog.loadModule(function(exports) {'use strict';/**
 *
 * @fileoverview Utils for CSP evaluator.
 * Generated from: javascript/security/csp/csp_evaluator/utils.ts
 * @author lwe\@google.com (Lukas Weichselbaum)
 *
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
goog.module('google3.javascript.security.csp.csp_evaluator.utils');
var module = module || { id: 'javascript/security/csp/csp_evaluator/utils.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
const tsickle_csp_1 = goog.requireType("google3.javascript.security.csp.csp_evaluator.csp");
/**
 * Removes scheme from url.
 * @param {string} url Url.
 * @return {string} url without scheme.
 */
function getSchemeFreeUrl(url) {
    url = url.replace(/^\w[+\w.-]*:\/\//i, '');
    // Remove URL scheme.
    url = url.replace(/^\/\//, '');
    // Remove protocol agnostic "//"
    return url;
}
exports.getSchemeFreeUrl = getSchemeFreeUrl;
/**
 * Get the hostname from the given url string in a way that supports schemeless
 * URLs and wildcards (aka `*`) in hostnames
 * @param {string} url
 * @return {string}
 */
function getHostname(url) {
    /** @type {string} */
    const hostname = new URL('https://' +
        getSchemeFreeUrl(url).replace('*', 'wildcard_placeholder'))
        .hostname.replace('wildcard_placeholder', '*');
    // Some browsers strip the brackets from IPv6 addresses when you access the
    // hostname. If the scheme free url starts with something that vaguely looks
    // like an IPv6 address and our parsed hostname doesn't have the brackets,
    // then we add them back to work around this
    /** @type {!RegExp} */
    const ipv6Regex = /^\[[\d:]+\]/;
    if (getSchemeFreeUrl(url).match(ipv6Regex) && !hostname.match(ipv6Regex)) {
        return '[' + hostname + ']';
    }
    return hostname;
}
exports.getHostname = getHostname;
/**
 * @param {string} u
 * @return {string}
 */
function setScheme(u) {
    if (u.startsWith('//')) {
        return u.replace('//', 'https://');
    }
    return u;
}
/**
 * Searches for whitelisted CSP origin (URL with wildcards) in list of urls.
 * @param {string} cspUrlString The whitelisted CSP origin. Can contain domain and
 *   path wildcards.
 * @param {!Array<string>} listOfUrlStrings List of urls to search in.
 * @return {(null|!URL)} First match found in url list, null otherwise.
 */
function matchWildcardUrls(cspUrlString, listOfUrlStrings) {
    // non-Chromium browsers don't support wildcards in domain names. We work
    // around this by replacing the wildcard with `wildcard_placeholder` before
    // parsing the domain and using that as a magic string. This magic string is
    // encapsulated in this function such that callers of this function do not
    // have to worry about this detail.
    /** @type {!URL} */
    const cspUrl = new URL(setScheme(cspUrlString.replace('*', 'wildcard_placeholder')));
    /** @type {!Array<!URL>} */
    const listOfUrls = listOfUrlStrings.map((/**
     * @param {string} u
     * @return {!URL}
     */
    u => new URL(setScheme(u))));
    /** @type {string} */
    const host = cspUrl.hostname.toLowerCase();
    /** @type {boolean} */
    const hostHasWildcard = host.startsWith('wildcard_placeholder.');
    /** @type {string} */
    const wildcardFreeHost = host.replace(/^\wildcard_placeholder/i, '');
    /** @type {string} */
    const path = cspUrl.pathname;
    /** @type {boolean} */
    const hasPath = path !== '/';
    for (const url of listOfUrls) {
        /** @type {string} */
        const domain = url.hostname;
        if (!domain.endsWith(wildcardFreeHost)) {
            // Domains don't match.
            continue;
        }
        // If the host has no subdomain wildcard and doesn't match, continue.
        if (!hostHasWildcard && host !== domain) {
            continue;
        }
        // If the whitelisted url has a path, check if on of the url paths
        // match.
        if (hasPath) {
            // https://www.w3.org/TR/CSP2/#source-list-path-patching
            if (path.endsWith('/')) {
                if (!url.pathname.startsWith(path)) {
                    continue;
                }
            }
            else {
                if (url.pathname !== path) {
                    // Path doesn't match.
                    continue;
                }
            }
        }
        // We found a match.
        return url;
    }
    // No match was found.
    return null;
}
exports.matchWildcardUrls = matchWildcardUrls;
/**
 * Applies a check to all directive values of a csp.
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @param {function(string, !Array<string>): void} check The check function that
 *   should get applied on directive values.
 * @return {void}
 */
function applyCheckFunktionToDirectives(parsedCsp, check) {
    /** @type {!Array<string>} */
    const directiveNames = Object.keys(parsedCsp);
    for (const directive of directiveNames) {
        /** @type {(undefined|!Array<string>)} */
        const directiveValues = parsedCsp[directive];
        if (directiveValues) {
            check(directive, directiveValues);
        }
    }
}
exports.applyCheckFunktionToDirectives = applyCheckFunktionToDirectives;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9qYXZhc2NyaXB0L3NlY3VyaXR5L2NzcC9jc3BfZXZhbHVhdG9yL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE0QkEsU0FBZ0IsZ0JBQWdCLENBQUMsR0FBVztJQUMxQyxHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMzQyxxQkFBcUI7SUFDckIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQy9CLGdDQUFnQztJQUNoQyxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFORCw0Q0FNQzs7Ozs7OztBQU1ELFNBQWdCLFdBQVcsQ0FBQyxHQUFXOztVQUMvQixRQUFRLEdBQ1YsSUFBSSxHQUFHLENBQ0gsVUFBVTtRQUNWLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztTQUMxRCxRQUFRLENBQUMsT0FBTyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQzs7Ozs7O1VBTWhELFNBQVMsR0FBRyxhQUFhO0lBQy9CLElBQUksZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUN4RSxPQUFPLEdBQUcsR0FBRyxRQUFRLEdBQUcsR0FBRyxDQUFDO0tBQzdCO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQWhCRCxrQ0FnQkM7Ozs7O0FBRUQsU0FBUyxTQUFTLENBQUMsQ0FBUztJQUMxQixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDdEIsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztLQUNwQztJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQzs7Ozs7Ozs7QUFTRCxTQUFnQixpQkFBaUIsQ0FDN0IsWUFBb0IsRUFBRSxnQkFBMEI7Ozs7Ozs7VUFNNUMsTUFBTSxHQUNSLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7O1VBQ25FLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHOzs7O0lBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQzs7VUFDN0QsSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFOztVQUNwQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQzs7VUFDMUQsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLENBQUM7O1VBQzlELElBQUksR0FBRyxNQUFNLENBQUMsUUFBUTs7VUFDdEIsT0FBTyxHQUFHLElBQUksS0FBSyxHQUFHO0lBRTVCLEtBQUssTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFOztjQUN0QixNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVE7UUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtZQUN0Qyx1QkFBdUI7WUFDdkIsU0FBUztTQUNWO1FBRUQscUVBQXFFO1FBQ3JFLElBQUksQ0FBQyxlQUFlLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRTtZQUN2QyxTQUFTO1NBQ1Y7UUFFRCxrRUFBa0U7UUFDbEUsU0FBUztRQUNULElBQUksT0FBTyxFQUFFO1lBQ1gsd0RBQXdEO1lBQ3hELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNsQyxTQUFTO2lCQUNWO2FBQ0Y7aUJBQU07Z0JBQ0wsSUFBSSxHQUFHLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtvQkFDekIsc0JBQXNCO29CQUN0QixTQUFTO2lCQUNWO2FBQ0Y7U0FDRjtRQUVELG9CQUFvQjtRQUNwQixPQUFPLEdBQUcsQ0FBQztLQUNaO0lBRUQsc0JBQXNCO0lBQ3RCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQWxERCw4Q0FrREM7Ozs7Ozs7O0FBU0QsU0FBZ0IsOEJBQThCLENBQzFDLFNBQWtCLEVBQ2xCLEtBQTZEOztVQUV6RCxjQUFjLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7SUFFN0MsS0FBSyxNQUFNLFNBQVMsSUFBSSxjQUFjLEVBQUU7O2NBQ2hDLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1FBQzVDLElBQUksZUFBZSxFQUFFO1lBQ25CLEtBQUssQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUM7U0FDbkM7S0FDRjtBQUNILENBQUM7QUFaRCx3RUFZQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGVvdmVydmlldyBVdGlscyBmb3IgQ1NQIGV2YWx1YXRvci5cbiAqIEBhdXRob3IgbHdlQGdvb2dsZS5jb20gKEx1a2FzIFdlaWNoc2VsYmF1bSlcbiAqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuXG5pbXBvcnQgKiBhcyBjc3AgZnJvbSAnLi9jc3AnO1xuXG5cbi8qKlxuICogUmVtb3ZlcyBzY2hlbWUgZnJvbSB1cmwuXG4gKiBAcGFyYW0gdXJsIFVybC5cbiAqIEByZXR1cm4gdXJsIHdpdGhvdXQgc2NoZW1lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2NoZW1lRnJlZVVybCh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG4gIHVybCA9IHVybC5yZXBsYWNlKC9eXFx3WytcXHcuLV0qOlxcL1xcLy9pLCAnJyk7XG4gIC8vIFJlbW92ZSBVUkwgc2NoZW1lLlxuICB1cmwgPSB1cmwucmVwbGFjZSgvXlxcL1xcLy8sICcnKTtcbiAgLy8gUmVtb3ZlIHByb3RvY29sIGFnbm9zdGljIFwiLy9cIlxuICByZXR1cm4gdXJsO1xufVxuXG4vKipcbiAqIEdldCB0aGUgaG9zdG5hbWUgZnJvbSB0aGUgZ2l2ZW4gdXJsIHN0cmluZyBpbiBhIHdheSB0aGF0IHN1cHBvcnRzIHNjaGVtZWxlc3NcbiAqIFVSTHMgYW5kIHdpbGRjYXJkcyAoYWthIGAqYCkgaW4gaG9zdG5hbWVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRIb3N0bmFtZSh1cmw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGhvc3RuYW1lID1cbiAgICAgIG5ldyBVUkwoXG4gICAgICAgICAgJ2h0dHBzOi8vJyArXG4gICAgICAgICAgZ2V0U2NoZW1lRnJlZVVybCh1cmwpLnJlcGxhY2UoJyonLCAnd2lsZGNhcmRfcGxhY2Vob2xkZXInKSlcbiAgICAgICAgICAuaG9zdG5hbWUucmVwbGFjZSgnd2lsZGNhcmRfcGxhY2Vob2xkZXInLCAnKicpO1xuXG4gIC8vIFNvbWUgYnJvd3NlcnMgc3RyaXAgdGhlIGJyYWNrZXRzIGZyb20gSVB2NiBhZGRyZXNzZXMgd2hlbiB5b3UgYWNjZXNzIHRoZVxuICAvLyBob3N0bmFtZS4gSWYgdGhlIHNjaGVtZSBmcmVlIHVybCBzdGFydHMgd2l0aCBzb21ldGhpbmcgdGhhdCB2YWd1ZWx5IGxvb2tzXG4gIC8vIGxpa2UgYW4gSVB2NiBhZGRyZXNzIGFuZCBvdXIgcGFyc2VkIGhvc3RuYW1lIGRvZXNuJ3QgaGF2ZSB0aGUgYnJhY2tldHMsXG4gIC8vIHRoZW4gd2UgYWRkIHRoZW0gYmFjayB0byB3b3JrIGFyb3VuZCB0aGlzXG4gIGNvbnN0IGlwdjZSZWdleCA9IC9eXFxbW1xcZDpdK1xcXS87XG4gIGlmIChnZXRTY2hlbWVGcmVlVXJsKHVybCkubWF0Y2goaXB2NlJlZ2V4KSAmJiAhaG9zdG5hbWUubWF0Y2goaXB2NlJlZ2V4KSkge1xuICAgIHJldHVybiAnWycgKyBob3N0bmFtZSArICddJztcbiAgfVxuICByZXR1cm4gaG9zdG5hbWU7XG59XG5cbmZ1bmN0aW9uIHNldFNjaGVtZSh1OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAodS5zdGFydHNXaXRoKCcvLycpKSB7XG4gICAgcmV0dXJuIHUucmVwbGFjZSgnLy8nLCAnaHR0cHM6Ly8nKTtcbiAgfVxuICByZXR1cm4gdTtcbn1cblxuLyoqXG4gKiBTZWFyY2hlcyBmb3Igd2hpdGVsaXN0ZWQgQ1NQIG9yaWdpbiAoVVJMIHdpdGggd2lsZGNhcmRzKSBpbiBsaXN0IG9mIHVybHMuXG4gKiBAcGFyYW0gY3NwVXJsU3RyaW5nIFRoZSB3aGl0ZWxpc3RlZCBDU1Agb3JpZ2luLiBDYW4gY29udGFpbiBkb21haW4gYW5kXG4gKiAgIHBhdGggd2lsZGNhcmRzLlxuICogQHBhcmFtIGxpc3RPZlVybFN0cmluZ3MgTGlzdCBvZiB1cmxzIHRvIHNlYXJjaCBpbi5cbiAqIEByZXR1cm4gRmlyc3QgbWF0Y2ggZm91bmQgaW4gdXJsIGxpc3QsIG51bGwgb3RoZXJ3aXNlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXaWxkY2FyZFVybHMoXG4gICAgY3NwVXJsU3RyaW5nOiBzdHJpbmcsIGxpc3RPZlVybFN0cmluZ3M6IHN0cmluZ1tdKTogVVJMfG51bGwge1xuICAvLyBub24tQ2hyb21pdW0gYnJvd3NlcnMgZG9uJ3Qgc3VwcG9ydCB3aWxkY2FyZHMgaW4gZG9tYWluIG5hbWVzLiBXZSB3b3JrXG4gIC8vIGFyb3VuZCB0aGlzIGJ5IHJlcGxhY2luZyB0aGUgd2lsZGNhcmQgd2l0aCBgd2lsZGNhcmRfcGxhY2Vob2xkZXJgIGJlZm9yZVxuICAvLyBwYXJzaW5nIHRoZSBkb21haW4gYW5kIHVzaW5nIHRoYXQgYXMgYSBtYWdpYyBzdHJpbmcuIFRoaXMgbWFnaWMgc3RyaW5nIGlzXG4gIC8vIGVuY2Fwc3VsYXRlZCBpbiB0aGlzIGZ1bmN0aW9uIHN1Y2ggdGhhdCBjYWxsZXJzIG9mIHRoaXMgZnVuY3Rpb24gZG8gbm90XG4gIC8vIGhhdmUgdG8gd29ycnkgYWJvdXQgdGhpcyBkZXRhaWwuXG4gIGNvbnN0IGNzcFVybCA9XG4gICAgICBuZXcgVVJMKHNldFNjaGVtZShjc3BVcmxTdHJpbmcucmVwbGFjZSgnKicsICd3aWxkY2FyZF9wbGFjZWhvbGRlcicpKSk7XG4gIGNvbnN0IGxpc3RPZlVybHMgPSBsaXN0T2ZVcmxTdHJpbmdzLm1hcCh1ID0+IG5ldyBVUkwoc2V0U2NoZW1lKHUpKSk7XG4gIGNvbnN0IGhvc3QgPSBjc3BVcmwuaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgY29uc3QgaG9zdEhhc1dpbGRjYXJkID0gaG9zdC5zdGFydHNXaXRoKCd3aWxkY2FyZF9wbGFjZWhvbGRlci4nKTtcbiAgY29uc3Qgd2lsZGNhcmRGcmVlSG9zdCA9IGhvc3QucmVwbGFjZSgvXlxcd2lsZGNhcmRfcGxhY2Vob2xkZXIvaSwgJycpO1xuICBjb25zdCBwYXRoID0gY3NwVXJsLnBhdGhuYW1lO1xuICBjb25zdCBoYXNQYXRoID0gcGF0aCAhPT0gJy8nO1xuXG4gIGZvciAoY29uc3QgdXJsIG9mIGxpc3RPZlVybHMpIHtcbiAgICBjb25zdCBkb21haW4gPSB1cmwuaG9zdG5hbWU7XG4gICAgaWYgKCFkb21haW4uZW5kc1dpdGgod2lsZGNhcmRGcmVlSG9zdCkpIHtcbiAgICAgIC8vIERvbWFpbnMgZG9uJ3QgbWF0Y2guXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgaG9zdCBoYXMgbm8gc3ViZG9tYWluIHdpbGRjYXJkIGFuZCBkb2Vzbid0IG1hdGNoLCBjb250aW51ZS5cbiAgICBpZiAoIWhvc3RIYXNXaWxkY2FyZCAmJiBob3N0ICE9PSBkb21haW4pIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSB3aGl0ZWxpc3RlZCB1cmwgaGFzIGEgcGF0aCwgY2hlY2sgaWYgb24gb2YgdGhlIHVybCBwYXRoc1xuICAgIC8vIG1hdGNoLlxuICAgIGlmIChoYXNQYXRoKSB7XG4gICAgICAvLyBodHRwczovL3d3dy53My5vcmcvVFIvQ1NQMi8jc291cmNlLWxpc3QtcGF0aC1wYXRjaGluZ1xuICAgICAgaWYgKHBhdGguZW5kc1dpdGgoJy8nKSkge1xuICAgICAgICBpZiAoIXVybC5wYXRobmFtZS5zdGFydHNXaXRoKHBhdGgpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh1cmwucGF0aG5hbWUgIT09IHBhdGgpIHtcbiAgICAgICAgICAvLyBQYXRoIGRvZXNuJ3QgbWF0Y2guXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXZSBmb3VuZCBhIG1hdGNoLlxuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICAvLyBObyBtYXRjaCB3YXMgZm91bmQuXG4gIHJldHVybiBudWxsO1xufVxuXG5cbi8qKlxuICogQXBwbGllcyBhIGNoZWNrIHRvIGFsbCBkaXJlY3RpdmUgdmFsdWVzIG9mIGEgY3NwLlxuICogQHBhcmFtIHBhcnNlZENzcCBQYXJzZWQgQ1NQLlxuICogQHBhcmFtIGNoZWNrIFRoZSBjaGVjayBmdW5jdGlvbiB0aGF0XG4gKiAgIHNob3VsZCBnZXQgYXBwbGllZCBvbiBkaXJlY3RpdmUgdmFsdWVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlDaGVja0Z1bmt0aW9uVG9EaXJlY3RpdmVzKFxuICAgIHBhcnNlZENzcDogY3NwLkNzcCxcbiAgICBjaGVjazogKGRpcmVjdGl2ZTogc3RyaW5nLCBkaXJlY3RpdmVWYWx1ZXM6IHN0cmluZ1tdKSA9PiB2b2lkLFxuKSB7XG4gIGNvbnN0IGRpcmVjdGl2ZU5hbWVzID0gT2JqZWN0LmtleXMocGFyc2VkQ3NwKTtcblxuICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBkaXJlY3RpdmVOYW1lcykge1xuICAgIGNvbnN0IGRpcmVjdGl2ZVZhbHVlcyA9IHBhcnNlZENzcFtkaXJlY3RpdmVdO1xuICAgIGlmIChkaXJlY3RpdmVWYWx1ZXMpIHtcbiAgICAgIGNoZWNrKGRpcmVjdGl2ZSwgZGlyZWN0aXZlVmFsdWVzKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==
;return exports;});

//javascript/security/csp/csp_evaluator/whitelist_bypasses/angular.closure.js
goog.loadModule(function(exports) {'use strict';/**
 *
 * @fileoverview Collection of popular sites/CDNs hosting Angular.
 * Generated from: javascript/security/csp/csp_evaluator/whitelist_bypasses/angular.ts
 * @author lwe\@google.com (Lukas Weichselbaum)
 *
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
goog.module('google3.javascript.security.csp.csp_evaluator.whitelist_bypasses.angular');
var module = module || { id: 'javascript/security/csp/csp_evaluator/whitelist_bypasses/angular.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
/**
 * Angular libraries on commonly whitelisted origins (e.g. CDNs) that would
 * allow a CSP bypass.
 * Only most common paths are listed here. Hence there might still be other
 * paths on these domains that would allow a bypass.
 * @type {!Array<string>}
 */
exports.URLS = [
    '//gstatic.com/fsn/angular_js-bundle1.js',
    '//www.gstatic.com/fsn/angular_js-bundle1.js',
    '//www.googleadservices.com/pageadimg/imgad',
    '//yandex.st/angularjs/1.2.16/angular-cookies.min.js',
    '//yastatic.net/angularjs/1.2.23/angular.min.js',
    '//yuedust.yuedu.126.net/js/components/angular/angular.js',
    '//art.jobs.netease.com/script/angular.js',
    '//csu-c45.kxcdn.com/angular/angular.js',
    '//elysiumwebsite.s3.amazonaws.com/uploads/blog-media/rockstar/angular.min.js',
    '//inno.blob.core.windows.net/new/libs/AngularJS/1.2.1/angular.min.js',
    '//gift-talk.kakao.com/public/javascripts/angular.min.js',
    '//ajax.googleapis.com/ajax/libs/angularjs/1.2.0rc1/angular-route.min.js',
    '//master-sumok.ru/vendors/angular/angular-cookies.js',
    '//ayicommon-a.akamaihd.net/static/vendor/angular-1.4.2.min.js',
    '//pangxiehaitao.com/framework/angular-1.3.9/angular-animate.min.js',
    '//cdnjs.cloudflare.com/ajax/libs/angular.js/1.2.16/angular.min.js',
    '//96fe3ee995e96e922b6b-d10c35bd0a0de2c718b252bc575fdb73.ssl.cf1.rackcdn.com/angular.js',
    '//oss.maxcdn.com/angularjs/1.2.20/angular.min.js',
    '//reports.zemanta.com/smedia/common/angularjs/1.2.11/angular.js',
    '//cdn.shopify.com/s/files/1/0225/6463/t/1/assets/angular-animate.min.js',
    '//parademanagement.com.s3-website-ap-southeast-1.amazonaws.com/js/angular.min.js',
    '//cdn.jsdelivr.net/angularjs/1.1.2/angular.min.js',
    '//eb2883ede55c53e09fd5-9c145fb03d93709ea57875d307e2d82e.ssl.cf3.rackcdn.com/components/angular-resource.min.js',
    '//andors-trail.googlecode.com/git/AndorsTrailEdit/lib/angular.min.js',
    '//cdn.walkme.com/General/EnvironmentTests/angular/angular.min.js',
    '//laundrymail.com/angular/angular.js',
    '//s3-eu-west-1.amazonaws.com/staticancpa/js/angular-cookies.min.js',
    '//collade.demo.stswp.com/js/vendor/angular.min.js',
    '//mrfishie.github.io/sailor/bower_components/angular/angular.min.js',
    '//askgithub.com/static/js/angular.min.js',
    '//services.amazon.com/solution-providers/assets/vendor/angular-cookies.min.js',
    '//raw.githubusercontent.com/angular/code.angularjs.org/master/1.0.7/angular-resource.js',
    '//prb-resume.appspot.com/bower_components/angular-animate/angular-animate.js',
    '//dl.dropboxusercontent.com/u/30877786/angular.min.js',
    '//static.tumblr.com/x5qdx0r/nPOnngtff/angular-resource.min_1_.js',
    '//storage.googleapis.com/assets-prod.urbansitter.net/us-sym/assets/vendor/angular-sanitize/angular-sanitize.min.js',
    '//twitter.github.io/labella.js/bower_components/angular/angular.min.js',
    '//cdn2-casinoroom.global.ssl.fastly.net/js/lib/angular-animate.min.js',
    '//www.adobe.com/devnet-apps/flashshowcase/lib/angular/angular.1.1.5.min.js',
    '//eternal-sunset.herokuapp.com/bower_components/angular/angular.js',
    '//cdn.bootcss.com/angular.js/1.2.0/angular.min.js'
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ndWxhci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL2phdmFzY3JpcHQvc2VjdXJpdHkvY3NwL2NzcF9ldmFsdWF0b3Ivd2hpdGVsaXN0X2J5cGFzc2VzL2FuZ3VsYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEwQmEsUUFBQSxJQUFJLEdBQWE7SUFDNUIseUNBQXlDO0lBQ3pDLDZDQUE2QztJQUM3Qyw0Q0FBNEM7SUFDNUMscURBQXFEO0lBQ3JELGdEQUFnRDtJQUNoRCwwREFBMEQ7SUFDMUQsMENBQTBDO0lBQzFDLHdDQUF3QztJQUN4Qyw4RUFBOEU7SUFDOUUsc0VBQXNFO0lBQ3RFLHlEQUF5RDtJQUN6RCx5RUFBeUU7SUFDekUsc0RBQXNEO0lBQ3RELCtEQUErRDtJQUMvRCxvRUFBb0U7SUFDcEUsbUVBQW1FO0lBQ25FLHdGQUF3RjtJQUN4RixrREFBa0Q7SUFDbEQsaUVBQWlFO0lBQ2pFLHlFQUF5RTtJQUN6RSxrRkFBa0Y7SUFDbEYsbURBQW1EO0lBQ25ELGdIQUFnSDtJQUNoSCxzRUFBc0U7SUFDdEUsa0VBQWtFO0lBQ2xFLHNDQUFzQztJQUN0QyxvRUFBb0U7SUFDcEUsbURBQW1EO0lBQ25ELHFFQUFxRTtJQUNyRSwwQ0FBMEM7SUFDMUMsK0VBQStFO0lBQy9FLHlGQUF5RjtJQUN6Riw4RUFBOEU7SUFDOUUsdURBQXVEO0lBQ3ZELGtFQUFrRTtJQUNsRSxvSEFBb0g7SUFDcEgsd0VBQXdFO0lBQ3hFLHVFQUF1RTtJQUN2RSw0RUFBNEU7SUFDNUUsb0VBQW9FO0lBQ3BFLG1EQUFtRDtDQUNwRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGZpbGVvdmVydmlldyBDb2xsZWN0aW9uIG9mIHBvcHVsYXIgc2l0ZXMvQ0ROcyBob3N0aW5nIEFuZ3VsYXIuXG4gKiBAYXV0aG9yIGx3ZUBnb29nbGUuY29tIChMdWthcyBXZWljaHNlbGJhdW0pXG4gKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cblxuLyoqXG4gKiBBbmd1bGFyIGxpYnJhcmllcyBvbiBjb21tb25seSB3aGl0ZWxpc3RlZCBvcmlnaW5zIChlLmcuIENETnMpIHRoYXQgd291bGRcbiAqIGFsbG93IGEgQ1NQIGJ5cGFzcy5cbiAqIE9ubHkgbW9zdCBjb21tb24gcGF0aHMgYXJlIGxpc3RlZCBoZXJlLiBIZW5jZSB0aGVyZSBtaWdodCBzdGlsbCBiZSBvdGhlclxuICogcGF0aHMgb24gdGhlc2UgZG9tYWlucyB0aGF0IHdvdWxkIGFsbG93IGEgYnlwYXNzLlxuICovXG5leHBvcnQgY29uc3QgVVJMUzogc3RyaW5nW10gPSBbXG4gICcvL2dzdGF0aWMuY29tL2Zzbi9hbmd1bGFyX2pzLWJ1bmRsZTEuanMnLFxuICAnLy93d3cuZ3N0YXRpYy5jb20vZnNuL2FuZ3VsYXJfanMtYnVuZGxlMS5qcycsXG4gICcvL3d3dy5nb29nbGVhZHNlcnZpY2VzLmNvbS9wYWdlYWRpbWcvaW1nYWQnLFxuICAnLy95YW5kZXguc3QvYW5ndWxhcmpzLzEuMi4xNi9hbmd1bGFyLWNvb2tpZXMubWluLmpzJyxcbiAgJy8veWFzdGF0aWMubmV0L2FuZ3VsYXJqcy8xLjIuMjMvYW5ndWxhci5taW4uanMnLFxuICAnLy95dWVkdXN0Lnl1ZWR1LjEyNi5uZXQvanMvY29tcG9uZW50cy9hbmd1bGFyL2FuZ3VsYXIuanMnLFxuICAnLy9hcnQuam9icy5uZXRlYXNlLmNvbS9zY3JpcHQvYW5ndWxhci5qcycsXG4gICcvL2NzdS1jNDUua3hjZG4uY29tL2FuZ3VsYXIvYW5ndWxhci5qcycsXG4gICcvL2VseXNpdW13ZWJzaXRlLnMzLmFtYXpvbmF3cy5jb20vdXBsb2Fkcy9ibG9nLW1lZGlhL3JvY2tzdGFyL2FuZ3VsYXIubWluLmpzJyxcbiAgJy8vaW5uby5ibG9iLmNvcmUud2luZG93cy5uZXQvbmV3L2xpYnMvQW5ndWxhckpTLzEuMi4xL2FuZ3VsYXIubWluLmpzJyxcbiAgJy8vZ2lmdC10YWxrLmtha2FvLmNvbS9wdWJsaWMvamF2YXNjcmlwdHMvYW5ndWxhci5taW4uanMnLFxuICAnLy9hamF4Lmdvb2dsZWFwaXMuY29tL2FqYXgvbGlicy9hbmd1bGFyanMvMS4yLjByYzEvYW5ndWxhci1yb3V0ZS5taW4uanMnLFxuICAnLy9tYXN0ZXItc3Vtb2sucnUvdmVuZG9ycy9hbmd1bGFyL2FuZ3VsYXItY29va2llcy5qcycsXG4gICcvL2F5aWNvbW1vbi1hLmFrYW1haWhkLm5ldC9zdGF0aWMvdmVuZG9yL2FuZ3VsYXItMS40LjIubWluLmpzJyxcbiAgJy8vcGFuZ3hpZWhhaXRhby5jb20vZnJhbWV3b3JrL2FuZ3VsYXItMS4zLjkvYW5ndWxhci1hbmltYXRlLm1pbi5qcycsXG4gICcvL2NkbmpzLmNsb3VkZmxhcmUuY29tL2FqYXgvbGlicy9hbmd1bGFyLmpzLzEuMi4xNi9hbmd1bGFyLm1pbi5qcycsXG4gICcvLzk2ZmUzZWU5OTVlOTZlOTIyYjZiLWQxMGMzNWJkMGEwZGUyYzcxOGIyNTJiYzU3NWZkYjczLnNzbC5jZjEucmFja2Nkbi5jb20vYW5ndWxhci5qcycsXG4gICcvL29zcy5tYXhjZG4uY29tL2FuZ3VsYXJqcy8xLjIuMjAvYW5ndWxhci5taW4uanMnLFxuICAnLy9yZXBvcnRzLnplbWFudGEuY29tL3NtZWRpYS9jb21tb24vYW5ndWxhcmpzLzEuMi4xMS9hbmd1bGFyLmpzJyxcbiAgJy8vY2RuLnNob3BpZnkuY29tL3MvZmlsZXMvMS8wMjI1LzY0NjMvdC8xL2Fzc2V0cy9hbmd1bGFyLWFuaW1hdGUubWluLmpzJyxcbiAgJy8vcGFyYWRlbWFuYWdlbWVudC5jb20uczMtd2Vic2l0ZS1hcC1zb3V0aGVhc3QtMS5hbWF6b25hd3MuY29tL2pzL2FuZ3VsYXIubWluLmpzJyxcbiAgJy8vY2RuLmpzZGVsaXZyLm5ldC9hbmd1bGFyanMvMS4xLjIvYW5ndWxhci5taW4uanMnLFxuICAnLy9lYjI4ODNlZGU1NWM1M2UwOWZkNS05YzE0NWZiMDNkOTM3MDllYTU3ODc1ZDMwN2UyZDgyZS5zc2wuY2YzLnJhY2tjZG4uY29tL2NvbXBvbmVudHMvYW5ndWxhci1yZXNvdXJjZS5taW4uanMnLFxuICAnLy9hbmRvcnMtdHJhaWwuZ29vZ2xlY29kZS5jb20vZ2l0L0FuZG9yc1RyYWlsRWRpdC9saWIvYW5ndWxhci5taW4uanMnLFxuICAnLy9jZG4ud2Fsa21lLmNvbS9HZW5lcmFsL0Vudmlyb25tZW50VGVzdHMvYW5ndWxhci9hbmd1bGFyLm1pbi5qcycsXG4gICcvL2xhdW5kcnltYWlsLmNvbS9hbmd1bGFyL2FuZ3VsYXIuanMnLFxuICAnLy9zMy1ldS13ZXN0LTEuYW1hem9uYXdzLmNvbS9zdGF0aWNhbmNwYS9qcy9hbmd1bGFyLWNvb2tpZXMubWluLmpzJyxcbiAgJy8vY29sbGFkZS5kZW1vLnN0c3dwLmNvbS9qcy92ZW5kb3IvYW5ndWxhci5taW4uanMnLFxuICAnLy9tcmZpc2hpZS5naXRodWIuaW8vc2FpbG9yL2Jvd2VyX2NvbXBvbmVudHMvYW5ndWxhci9hbmd1bGFyLm1pbi5qcycsXG4gICcvL2Fza2dpdGh1Yi5jb20vc3RhdGljL2pzL2FuZ3VsYXIubWluLmpzJyxcbiAgJy8vc2VydmljZXMuYW1hem9uLmNvbS9zb2x1dGlvbi1wcm92aWRlcnMvYXNzZXRzL3ZlbmRvci9hbmd1bGFyLWNvb2tpZXMubWluLmpzJyxcbiAgJy8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9hbmd1bGFyL2NvZGUuYW5ndWxhcmpzLm9yZy9tYXN0ZXIvMS4wLjcvYW5ndWxhci1yZXNvdXJjZS5qcycsXG4gICcvL3ByYi1yZXN1bWUuYXBwc3BvdC5jb20vYm93ZXJfY29tcG9uZW50cy9hbmd1bGFyLWFuaW1hdGUvYW5ndWxhci1hbmltYXRlLmpzJyxcbiAgJy8vZGwuZHJvcGJveHVzZXJjb250ZW50LmNvbS91LzMwODc3Nzg2L2FuZ3VsYXIubWluLmpzJyxcbiAgJy8vc3RhdGljLnR1bWJsci5jb20veDVxZHgwci9uUE9ubmd0ZmYvYW5ndWxhci1yZXNvdXJjZS5taW5fMV8uanMnLFxuICAnLy9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL2Fzc2V0cy1wcm9kLnVyYmFuc2l0dGVyLm5ldC91cy1zeW0vYXNzZXRzL3ZlbmRvci9hbmd1bGFyLXNhbml0aXplL2FuZ3VsYXItc2FuaXRpemUubWluLmpzJyxcbiAgJy8vdHdpdHRlci5naXRodWIuaW8vbGFiZWxsYS5qcy9ib3dlcl9jb21wb25lbnRzL2FuZ3VsYXIvYW5ndWxhci5taW4uanMnLFxuICAnLy9jZG4yLWNhc2lub3Jvb20uZ2xvYmFsLnNzbC5mYXN0bHkubmV0L2pzL2xpYi9hbmd1bGFyLWFuaW1hdGUubWluLmpzJyxcbiAgJy8vd3d3LmFkb2JlLmNvbS9kZXZuZXQtYXBwcy9mbGFzaHNob3djYXNlL2xpYi9hbmd1bGFyL2FuZ3VsYXIuMS4xLjUubWluLmpzJyxcbiAgJy8vZXRlcm5hbC1zdW5zZXQuaGVyb2t1YXBwLmNvbS9ib3dlcl9jb21wb25lbnRzL2FuZ3VsYXIvYW5ndWxhci5qcycsXG4gICcvL2Nkbi5ib290Y3NzLmNvbS9hbmd1bGFyLmpzLzEuMi4wL2FuZ3VsYXIubWluLmpzJ1xuXTtcbiJdfQ==
;return exports;});

//javascript/security/csp/csp_evaluator/whitelist_bypasses/flash.closure.js
goog.loadModule(function(exports) {'use strict';/**
 *
 * @fileoverview Collection of popular sites/CDNs hosting flash with user
 * provided JS.
 * Generated from: javascript/security/csp/csp_evaluator/whitelist_bypasses/flash.ts
 * @author lwe\@google.com (Lukas Weichselbaum)
 *
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
goog.module('google3.javascript.security.csp.csp_evaluator.whitelist_bypasses.flash');
var module = module || { id: 'javascript/security/csp/csp_evaluator/whitelist_bypasses/flash.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
/**
 * Domains that would allow a CSP bypass if whitelisted.
 * Only most common paths will be listed here. Hence there might still be other
 * paths on these domains that would allow a bypass.
 * @type {!Array<string>}
 */
exports.URLS = [
    '//vk.com/swf/video.swf',
    '//ajax.googleapis.com/ajax/libs/yui/2.8.0r4/build/charts/assets/charts.swf'
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhc2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9qYXZhc2NyaXB0L3NlY3VyaXR5L2NzcC9jc3BfZXZhbHVhdG9yL3doaXRlbGlzdF9ieXBhc3Nlcy9mbGFzaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTBCYSxRQUFBLElBQUksR0FBYTtJQUM1Qix3QkFBd0I7SUFDeEIsNEVBQTRFO0NBQzdFIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IENvbGxlY3Rpb24gb2YgcG9wdWxhciBzaXRlcy9DRE5zIGhvc3RpbmcgZmxhc2ggd2l0aCB1c2VyXG4gKiBwcm92aWRlZCBKUy5cbiAqIEBhdXRob3IgbHdlQGdvb2dsZS5jb20gKEx1a2FzIFdlaWNoc2VsYmF1bSlcbiAqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuXG4vKipcbiAqIERvbWFpbnMgdGhhdCB3b3VsZCBhbGxvdyBhIENTUCBieXBhc3MgaWYgd2hpdGVsaXN0ZWQuXG4gKiBPbmx5IG1vc3QgY29tbW9uIHBhdGhzIHdpbGwgYmUgbGlzdGVkIGhlcmUuIEhlbmNlIHRoZXJlIG1pZ2h0IHN0aWxsIGJlIG90aGVyXG4gKiBwYXRocyBvbiB0aGVzZSBkb21haW5zIHRoYXQgd291bGQgYWxsb3cgYSBieXBhc3MuXG4gKi9cbmV4cG9ydCBjb25zdCBVUkxTOiBzdHJpbmdbXSA9IFtcbiAgJy8vdmsuY29tL3N3Zi92aWRlby5zd2YnLFxuICAnLy9hamF4Lmdvb2dsZWFwaXMuY29tL2FqYXgvbGlicy95dWkvMi44LjByNC9idWlsZC9jaGFydHMvYXNzZXRzL2NoYXJ0cy5zd2YnXG5dO1xuIl19
;return exports;});

//javascript/security/csp/csp_evaluator/whitelist_bypasses/jsonp.closure.js
goog.loadModule(function(exports) {'use strict';/**
 *
 * @fileoverview Collection of popular sites/CDNs hosting JSONP-like endpoints.
 * Endpoints don't contain necessary parameters to trigger JSONP response
 * because parameters are ignored in CSP whitelists.
 * Usually per domain only one (popular) file path is listed to allow bypasses
 * of the most common path based whitelists. It's not practical to ship a list
 * for all possible paths/domains. Therefore the jsonp bypass check usually only
 * works efficient for domain based whitelists.
 * Generated from: javascript/security/csp/csp_evaluator/whitelist_bypasses/jsonp.ts
 * @author lwe\@google.com (Lukas Weichselbaum)
 *
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
goog.module('google3.javascript.security.csp.csp_evaluator.whitelist_bypasses.jsonp');
var module = module || { id: 'javascript/security/csp/csp_evaluator/whitelist_bypasses/jsonp.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
/**
 * Some JSONP-like bypasses only work if the CSP allows 'eval()'.
 * @type {!Array<string>}
 */
exports.NEEDS_EVAL = [
    'googletagmanager.com', 'www.googletagmanager.com',
    'www.googleadservices.com', 'google-analytics.com',
    'ssl.google-analytics.com', 'www.google-analytics.com'
];
/**
 * JSONP endpoints on commonly whitelisted origins (e.g. CDNs) that would allow
 * a CSP bypass.
 * Only most common paths are listed here. Hence there might still be other
 * paths on these domains that would allow a bypass.
 * @type {!Array<string>}
 */
exports.URLS = [
    '//bebezoo.1688.com/fragment/index.htm',
    '//www.google-analytics.com/gtm/js',
    '//googleads.g.doubleclick.net/pagead/conversion/1036918760/wcm',
    '//www.googleadservices.com/pagead/conversion/1070110417/wcm',
    '//www.google.com/tools/feedback/escalation-options',
    '//pin.aliyun.com/check_audio',
    '//offer.alibaba.com/market/CID100002954/5/fetchKeyword.do',
    '//ccrprod.alipay.com/ccr/arriveTime.json',
    '//group.aliexpress.com/ajaxAcquireGroupbuyProduct.do',
    '//detector.alicdn.com/2.7.3/index.php',
    '//suggest.taobao.com/sug',
    '//translate.google.com/translate_a/l',
    '//count.tbcdn.cn//counter3',
    '//wb.amap.com/channel.php',
    '//translate.googleapis.com/translate_a/l',
    '//afpeng.alimama.com/ex',
    '//accounts.google.com/o/oauth2/revoke',
    '//pagead2.googlesyndication.com/relatedsearch',
    '//yandex.ru/soft/browsers/check',
    '//api.facebook.com/restserver.php',
    '//mts0.googleapis.com/maps/vt',
    '//syndication.twitter.com/widgets/timelines/765840589183213568',
    '//www.youtube.com/profile_style',
    '//googletagmanager.com/gtm/js',
    '//mc.yandex.ru/watch/24306916/1',
    '//share.yandex.net/counter/gpp/',
    '//ok.go.mail.ru/lady_on_lady_recipes_r.json',
    '//d1f69o4buvlrj5.cloudfront.net/__efa_15_1_ornpba.xekq.arg/optout_check',
    '//www.googletagmanager.com/gtm/js',
    '//api.vk.com/method/wall.get',
    '//www.sharethis.com/get-publisher-info.php',
    '//google.ru/maps/vt',
    '//pro.netrox.sc/oapi/h_checksite.ashx',
    '//vimeo.com/api/oembed.json/',
    '//de.blog.newrelic.com/wp-admin/admin-ajax.php',
    '//ajax.googleapis.com/ajax/services/search/news',
    '//ssl.google-analytics.com/gtm/js',
    '//pubsub.pubnub.com/subscribe/demo/hello_world/',
    '//pass.yandex.ua/services',
    '//id.rambler.ru/script/topline_info.js',
    '//m.addthis.com/live/red_lojson/100eng.json',
    '//passport.ngs.ru/ajax/check',
    '//catalog.api.2gis.ru/ads/search',
    '//gum.criteo.com/sync',
    '//maps.google.com/maps/vt',
    '//ynuf.alipay.com/service/um.json',
    '//securepubads.g.doubleclick.net/gampad/ads',
    '//c.tiles.mapbox.com/v3/texastribune.tx-congress-cvap/6/15/26.grid.json',
    '//rexchange.begun.ru/banners',
    '//an.yandex.ru/page/147484',
    '//links.services.disqus.com/api/ping',
    '//api.map.baidu.com/',
    '//tj.gongchang.com/api/keywordrecomm/',
    '//data.gongchang.com/livegrail/',
    '//ulogin.ru/token.php',
    '//beta.gismeteo.ru/api/informer/layout.js/120x240-3/ru/',
    '//maps.googleapis.com/maps/api/js/GeoPhotoService.GetMetadata',
    '//a.config.skype.com/config/v1/Skype/908_1.33.0.111/SkypePersonalization',
    '//maps.beeline.ru/w',
    '//target.ukr.net/',
    '//www.meteoprog.ua/data/weather/informer/Poltava.js',
    '//cdn.syndication.twimg.com/widgets/timelines/599200054310604802',
    '//wslocker.ru/client/user.chk.php',
    '//community.adobe.com/CommunityPod/getJSON',
    '//maps.google.lv/maps/vt',
    '//dev.virtualearth.net/REST/V1/Imagery/Metadata/AerialWithLabels/26.318581',
    '//awaps.yandex.ru/10/8938/02400400.',
    '//a248.e.akamai.net/h5.hulu.com/h5.mp4',
    '//nominatim.openstreetmap.org/',
    '//plugins.mozilla.org/en-us/plugins_list.json',
    '//h.cackle.me/widget/32153/bootstrap',
    '//graph.facebook.com/1/',
    '//fellowes.ugc.bazaarvoice.com/data/reviews.json',
    '//widgets.pinterest.com/v3/pidgets/boards/ciciwin/hedgehog-squirrel-crafts/pins/',
    '//appcenter.intuit.com/Account/LogoutJSONP',
    '//www.linkedin.com/countserv/count/share',
    '//se.wikipedia.org/w/api.php',
    '//cse.google.com/api/007627024705277327428/cse/r3vs7b0fcli/queries/js',
    '//relap.io/api/v2/similar_pages_jsonp.js',
    '//c1n3.hypercomments.com/stream/subscribe',
    '//maps.google.de/maps/vt',
    '//books.google.com/books',
    '//connect.mail.ru/share_count',
    '//tr.indeed.com/m/newjobs',
    '//www-onepick-opensocial.googleusercontent.com/gadgets/proxy',
    '//www.panoramio.com/map/get_panoramas.php',
    '//client.siteheart.com/streamcli/client',
    '//www.facebook.com/restserver.php',
    '//autocomplete.travelpayouts.com/avia',
    '//www.googleapis.com/freebase/v1/topic/m/0344_',
    '//mts1.googleapis.com/mapslt/ft',
    '//api.twitter.com/1/statuses/oembed.json',
    '//fast.wistia.com/embed/medias/o75jtw7654.json',
    '//partner.googleadservices.com/gampad/ads',
    '//pass.yandex.ru/services',
    '//gupiao.baidu.com/stocks/stockbets',
    '//widget.admitad.com/widget/init',
    '//api.instagram.com/v1/tags/partykungen23328/media/recent',
    '//video.media.yql.yahoo.com/v1/video/sapi/streams/063fb76c-6c70-38c5-9bbc-04b7c384de2b',
    '//ib.adnxs.com/jpt',
    '//pass.yandex.com/services',
    '//www.google.de/maps/vt',
    '//clients1.google.com/complete/search',
    '//api.userlike.com/api/chat/slot/proactive/',
    '//www.youku.com/index_cookielist/s/jsonp',
    '//mt1.googleapis.com/mapslt/ft',
    '//api.mixpanel.com/track/',
    '//wpd.b.qq.com/cgi/get_sign.php',
    '//pipes.yahooapis.com/pipes/pipe.run',
    '//gdata.youtube.com/feeds/api/videos/WsJIHN1kNWc',
    '//9.chart.apis.google.com/chart',
    '//cdn.syndication.twitter.com/moments/709229296800440320',
    '//api.flickr.com/services/feeds/photos_friends.gne',
    '//cbks0.googleapis.com/cbk',
    '//www.blogger.com/feeds/5578653387562324002/posts/summary/4427562025302749269',
    '//query.yahooapis.com/v1/public/yql',
    '//kecngantang.blogspot.com/feeds/posts/default/-/Komik',
    '//www.travelpayouts.com/widgets/50f53ce9ada1b54bcc000031.json',
    '//i.cackle.me/widget/32586/bootstrap',
    '//translate.yandex.net/api/v1.5/tr.json/detect',
    '//a.tiles.mapbox.com/v3/zentralmedia.map-n2raeauc.jsonp',
    '//maps.google.ru/maps/vt',
    '//c1n2.hypercomments.com/stream/subscribe',
    '//rec.ydf.yandex.ru/cookie',
    '//cdn.jsdelivr.net'
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbnAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9qYXZhc2NyaXB0L3NlY3VyaXR5L2NzcC9jc3BfZXZhbHVhdG9yL3doaXRlbGlzdF9ieXBhc3Nlcy9qc29ucC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTZCYSxRQUFBLFVBQVUsR0FBYTtJQUNsQyxzQkFBc0IsRUFBRSwwQkFBMEI7SUFFbEQsMEJBQTBCLEVBQUUsc0JBQXNCO0lBQ2xELDBCQUEwQixFQUFFLDBCQUEwQjtDQUN2RDs7Ozs7Ozs7QUFVWSxRQUFBLElBQUksR0FBYTtJQUM1Qix1Q0FBdUM7SUFDdkMsbUNBQW1DO0lBQ25DLGdFQUFnRTtJQUNoRSw2REFBNkQ7SUFDN0Qsb0RBQW9EO0lBQ3BELDhCQUE4QjtJQUM5QiwyREFBMkQ7SUFDM0QsMENBQTBDO0lBQzFDLHNEQUFzRDtJQUN0RCx1Q0FBdUM7SUFDdkMsMEJBQTBCO0lBQzFCLHNDQUFzQztJQUN0Qyw0QkFBNEI7SUFDNUIsMkJBQTJCO0lBQzNCLDBDQUEwQztJQUMxQyx5QkFBeUI7SUFDekIsdUNBQXVDO0lBQ3ZDLCtDQUErQztJQUMvQyxpQ0FBaUM7SUFDakMsbUNBQW1DO0lBQ25DLCtCQUErQjtJQUMvQixnRUFBZ0U7SUFDaEUsaUNBQWlDO0lBQ2pDLCtCQUErQjtJQUMvQixpQ0FBaUM7SUFDakMsaUNBQWlDO0lBQ2pDLDZDQUE2QztJQUM3Qyx5RUFBeUU7SUFDekUsbUNBQW1DO0lBQ25DLDhCQUE4QjtJQUM5Qiw0Q0FBNEM7SUFDNUMscUJBQXFCO0lBQ3JCLHVDQUF1QztJQUN2Qyw4QkFBOEI7SUFDOUIsZ0RBQWdEO0lBQ2hELGlEQUFpRDtJQUNqRCxtQ0FBbUM7SUFDbkMsaURBQWlEO0lBQ2pELDJCQUEyQjtJQUMzQix3Q0FBd0M7SUFDeEMsNkNBQTZDO0lBQzdDLDhCQUE4QjtJQUM5QixrQ0FBa0M7SUFDbEMsdUJBQXVCO0lBQ3ZCLDJCQUEyQjtJQUMzQixtQ0FBbUM7SUFDbkMsNkNBQTZDO0lBQzdDLHlFQUF5RTtJQUN6RSw4QkFBOEI7SUFDOUIsNEJBQTRCO0lBQzVCLHNDQUFzQztJQUN0QyxzQkFBc0I7SUFDdEIsdUNBQXVDO0lBQ3ZDLGlDQUFpQztJQUNqQyx1QkFBdUI7SUFDdkIseURBQXlEO0lBQ3pELCtEQUErRDtJQUMvRCwwRUFBMEU7SUFDMUUscUJBQXFCO0lBQ3JCLG1CQUFtQjtJQUNuQixxREFBcUQ7SUFDckQsa0VBQWtFO0lBQ2xFLG1DQUFtQztJQUNuQyw0Q0FBNEM7SUFDNUMsMEJBQTBCO0lBQzFCLDRFQUE0RTtJQUM1RSxxQ0FBcUM7SUFDckMsd0NBQXdDO0lBQ3hDLGdDQUFnQztJQUNoQywrQ0FBK0M7SUFDL0Msc0NBQXNDO0lBQ3RDLHlCQUF5QjtJQUN6QixrREFBa0Q7SUFDbEQsa0ZBQWtGO0lBQ2xGLDRDQUE0QztJQUM1QywwQ0FBMEM7SUFDMUMsOEJBQThCO0lBQzlCLHVFQUF1RTtJQUN2RSwwQ0FBMEM7SUFDMUMsMkNBQTJDO0lBQzNDLDBCQUEwQjtJQUMxQiwwQkFBMEI7SUFDMUIsK0JBQStCO0lBQy9CLDJCQUEyQjtJQUMzQiw4REFBOEQ7SUFDOUQsMkNBQTJDO0lBQzNDLHlDQUF5QztJQUN6QyxtQ0FBbUM7SUFDbkMsdUNBQXVDO0lBQ3ZDLGdEQUFnRDtJQUNoRCxpQ0FBaUM7SUFDakMsMENBQTBDO0lBQzFDLGdEQUFnRDtJQUNoRCwyQ0FBMkM7SUFDM0MsMkJBQTJCO0lBQzNCLHFDQUFxQztJQUNyQyxrQ0FBa0M7SUFDbEMsMkRBQTJEO0lBQzNELHdGQUF3RjtJQUN4RixvQkFBb0I7SUFDcEIsNEJBQTRCO0lBQzVCLHlCQUF5QjtJQUN6Qix1Q0FBdUM7SUFDdkMsNkNBQTZDO0lBQzdDLDBDQUEwQztJQUMxQyxnQ0FBZ0M7SUFDaEMsMkJBQTJCO0lBQzNCLGlDQUFpQztJQUNqQyxzQ0FBc0M7SUFDdEMsa0RBQWtEO0lBQ2xELGlDQUFpQztJQUNqQywwREFBMEQ7SUFDMUQsb0RBQW9EO0lBQ3BELDRCQUE0QjtJQUM1QiwrRUFBK0U7SUFDL0UscUNBQXFDO0lBQ3JDLHdEQUF3RDtJQUN4RCwrREFBK0Q7SUFDL0Qsc0NBQXNDO0lBQ3RDLGdEQUFnRDtJQUNoRCx5REFBeUQ7SUFDekQsMEJBQTBCO0lBQzFCLDJDQUEyQztJQUMzQyw0QkFBNEI7SUFDNUIsb0JBQW9CO0NBQ3JCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IENvbGxlY3Rpb24gb2YgcG9wdWxhciBzaXRlcy9DRE5zIGhvc3RpbmcgSlNPTlAtbGlrZSBlbmRwb2ludHMuXG4gKiBFbmRwb2ludHMgZG9uJ3QgY29udGFpbiBuZWNlc3NhcnkgcGFyYW1ldGVycyB0byB0cmlnZ2VyIEpTT05QIHJlc3BvbnNlXG4gKiBiZWNhdXNlIHBhcmFtZXRlcnMgYXJlIGlnbm9yZWQgaW4gQ1NQIHdoaXRlbGlzdHMuXG4gKiBVc3VhbGx5IHBlciBkb21haW4gb25seSBvbmUgKHBvcHVsYXIpIGZpbGUgcGF0aCBpcyBsaXN0ZWQgdG8gYWxsb3cgYnlwYXNzZXNcbiAqIG9mIHRoZSBtb3N0IGNvbW1vbiBwYXRoIGJhc2VkIHdoaXRlbGlzdHMuIEl0J3Mgbm90IHByYWN0aWNhbCB0byBzaGlwIGEgbGlzdFxuICogZm9yIGFsbCBwb3NzaWJsZSBwYXRocy9kb21haW5zLiBUaGVyZWZvcmUgdGhlIGpzb25wIGJ5cGFzcyBjaGVjayB1c3VhbGx5IG9ubHlcbiAqIHdvcmtzIGVmZmljaWVudCBmb3IgZG9tYWluIGJhc2VkIHdoaXRlbGlzdHMuXG4gKiBAYXV0aG9yIGx3ZUBnb29nbGUuY29tIChMdWthcyBXZWljaHNlbGJhdW0pXG4gKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cblxuLyoqXG4gKiBTb21lIEpTT05QLWxpa2UgYnlwYXNzZXMgb25seSB3b3JrIGlmIHRoZSBDU1AgYWxsb3dzICdldmFsKCknLlxuICovXG5leHBvcnQgY29uc3QgTkVFRFNfRVZBTDogc3RyaW5nW10gPSBbXG4gICdnb29nbGV0YWdtYW5hZ2VyLmNvbScsICd3d3cuZ29vZ2xldGFnbWFuYWdlci5jb20nLFxuXG4gICd3d3cuZ29vZ2xlYWRzZXJ2aWNlcy5jb20nLCAnZ29vZ2xlLWFuYWx5dGljcy5jb20nLFxuICAnc3NsLmdvb2dsZS1hbmFseXRpY3MuY29tJywgJ3d3dy5nb29nbGUtYW5hbHl0aWNzLmNvbSdcbl07XG5cblxuXG4vKipcbiAqIEpTT05QIGVuZHBvaW50cyBvbiBjb21tb25seSB3aGl0ZWxpc3RlZCBvcmlnaW5zIChlLmcuIENETnMpIHRoYXQgd291bGQgYWxsb3dcbiAqIGEgQ1NQIGJ5cGFzcy5cbiAqIE9ubHkgbW9zdCBjb21tb24gcGF0aHMgYXJlIGxpc3RlZCBoZXJlLiBIZW5jZSB0aGVyZSBtaWdodCBzdGlsbCBiZSBvdGhlclxuICogcGF0aHMgb24gdGhlc2UgZG9tYWlucyB0aGF0IHdvdWxkIGFsbG93IGEgYnlwYXNzLlxuICovXG5leHBvcnQgY29uc3QgVVJMUzogc3RyaW5nW10gPSBbXG4gICcvL2JlYmV6b28uMTY4OC5jb20vZnJhZ21lbnQvaW5kZXguaHRtJyxcbiAgJy8vd3d3Lmdvb2dsZS1hbmFseXRpY3MuY29tL2d0bS9qcycsXG4gICcvL2dvb2dsZWFkcy5nLmRvdWJsZWNsaWNrLm5ldC9wYWdlYWQvY29udmVyc2lvbi8xMDM2OTE4NzYwL3djbScsXG4gICcvL3d3dy5nb29nbGVhZHNlcnZpY2VzLmNvbS9wYWdlYWQvY29udmVyc2lvbi8xMDcwMTEwNDE3L3djbScsXG4gICcvL3d3dy5nb29nbGUuY29tL3Rvb2xzL2ZlZWRiYWNrL2VzY2FsYXRpb24tb3B0aW9ucycsXG4gICcvL3Bpbi5hbGl5dW4uY29tL2NoZWNrX2F1ZGlvJyxcbiAgJy8vb2ZmZXIuYWxpYmFiYS5jb20vbWFya2V0L0NJRDEwMDAwMjk1NC81L2ZldGNoS2V5d29yZC5kbycsXG4gICcvL2NjcnByb2QuYWxpcGF5LmNvbS9jY3IvYXJyaXZlVGltZS5qc29uJyxcbiAgJy8vZ3JvdXAuYWxpZXhwcmVzcy5jb20vYWpheEFjcXVpcmVHcm91cGJ1eVByb2R1Y3QuZG8nLFxuICAnLy9kZXRlY3Rvci5hbGljZG4uY29tLzIuNy4zL2luZGV4LnBocCcsXG4gICcvL3N1Z2dlc3QudGFvYmFvLmNvbS9zdWcnLFxuICAnLy90cmFuc2xhdGUuZ29vZ2xlLmNvbS90cmFuc2xhdGVfYS9sJyxcbiAgJy8vY291bnQudGJjZG4uY24vL2NvdW50ZXIzJyxcbiAgJy8vd2IuYW1hcC5jb20vY2hhbm5lbC5waHAnLFxuICAnLy90cmFuc2xhdGUuZ29vZ2xlYXBpcy5jb20vdHJhbnNsYXRlX2EvbCcsXG4gICcvL2FmcGVuZy5hbGltYW1hLmNvbS9leCcsXG4gICcvL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvcmV2b2tlJyxcbiAgJy8vcGFnZWFkMi5nb29nbGVzeW5kaWNhdGlvbi5jb20vcmVsYXRlZHNlYXJjaCcsXG4gICcvL3lhbmRleC5ydS9zb2Z0L2Jyb3dzZXJzL2NoZWNrJyxcbiAgJy8vYXBpLmZhY2Vib29rLmNvbS9yZXN0c2VydmVyLnBocCcsXG4gICcvL210czAuZ29vZ2xlYXBpcy5jb20vbWFwcy92dCcsXG4gICcvL3N5bmRpY2F0aW9uLnR3aXR0ZXIuY29tL3dpZGdldHMvdGltZWxpbmVzLzc2NTg0MDU4OTE4MzIxMzU2OCcsXG4gICcvL3d3dy55b3V0dWJlLmNvbS9wcm9maWxlX3N0eWxlJyxcbiAgJy8vZ29vZ2xldGFnbWFuYWdlci5jb20vZ3RtL2pzJyxcbiAgJy8vbWMueWFuZGV4LnJ1L3dhdGNoLzI0MzA2OTE2LzEnLFxuICAnLy9zaGFyZS55YW5kZXgubmV0L2NvdW50ZXIvZ3BwLycsXG4gICcvL29rLmdvLm1haWwucnUvbGFkeV9vbl9sYWR5X3JlY2lwZXNfci5qc29uJyxcbiAgJy8vZDFmNjlvNGJ1dmxyajUuY2xvdWRmcm9udC5uZXQvX19lZmFfMTVfMV9vcm5wYmEueGVrcS5hcmcvb3B0b3V0X2NoZWNrJyxcbiAgJy8vd3d3Lmdvb2dsZXRhZ21hbmFnZXIuY29tL2d0bS9qcycsXG4gICcvL2FwaS52ay5jb20vbWV0aG9kL3dhbGwuZ2V0JyxcbiAgJy8vd3d3LnNoYXJldGhpcy5jb20vZ2V0LXB1Ymxpc2hlci1pbmZvLnBocCcsXG4gICcvL2dvb2dsZS5ydS9tYXBzL3Z0JyxcbiAgJy8vcHJvLm5ldHJveC5zYy9vYXBpL2hfY2hlY2tzaXRlLmFzaHgnLFxuICAnLy92aW1lby5jb20vYXBpL29lbWJlZC5qc29uLycsXG4gICcvL2RlLmJsb2cubmV3cmVsaWMuY29tL3dwLWFkbWluL2FkbWluLWFqYXgucGhwJyxcbiAgJy8vYWpheC5nb29nbGVhcGlzLmNvbS9hamF4L3NlcnZpY2VzL3NlYXJjaC9uZXdzJyxcbiAgJy8vc3NsLmdvb2dsZS1hbmFseXRpY3MuY29tL2d0bS9qcycsXG4gICcvL3B1YnN1Yi5wdWJudWIuY29tL3N1YnNjcmliZS9kZW1vL2hlbGxvX3dvcmxkLycsXG4gICcvL3Bhc3MueWFuZGV4LnVhL3NlcnZpY2VzJyxcbiAgJy8vaWQucmFtYmxlci5ydS9zY3JpcHQvdG9wbGluZV9pbmZvLmpzJyxcbiAgJy8vbS5hZGR0aGlzLmNvbS9saXZlL3JlZF9sb2pzb24vMTAwZW5nLmpzb24nLFxuICAnLy9wYXNzcG9ydC5uZ3MucnUvYWpheC9jaGVjaycsXG4gICcvL2NhdGFsb2cuYXBpLjJnaXMucnUvYWRzL3NlYXJjaCcsXG4gICcvL2d1bS5jcml0ZW8uY29tL3N5bmMnLFxuICAnLy9tYXBzLmdvb2dsZS5jb20vbWFwcy92dCcsXG4gICcvL3ludWYuYWxpcGF5LmNvbS9zZXJ2aWNlL3VtLmpzb24nLFxuICAnLy9zZWN1cmVwdWJhZHMuZy5kb3VibGVjbGljay5uZXQvZ2FtcGFkL2FkcycsXG4gICcvL2MudGlsZXMubWFwYm94LmNvbS92My90ZXhhc3RyaWJ1bmUudHgtY29uZ3Jlc3MtY3ZhcC82LzE1LzI2LmdyaWQuanNvbicsXG4gICcvL3JleGNoYW5nZS5iZWd1bi5ydS9iYW5uZXJzJyxcbiAgJy8vYW4ueWFuZGV4LnJ1L3BhZ2UvMTQ3NDg0JyxcbiAgJy8vbGlua3Muc2VydmljZXMuZGlzcXVzLmNvbS9hcGkvcGluZycsXG4gICcvL2FwaS5tYXAuYmFpZHUuY29tLycsXG4gICcvL3RqLmdvbmdjaGFuZy5jb20vYXBpL2tleXdvcmRyZWNvbW0vJyxcbiAgJy8vZGF0YS5nb25nY2hhbmcuY29tL2xpdmVncmFpbC8nLFxuICAnLy91bG9naW4ucnUvdG9rZW4ucGhwJyxcbiAgJy8vYmV0YS5naXNtZXRlby5ydS9hcGkvaW5mb3JtZXIvbGF5b3V0LmpzLzEyMHgyNDAtMy9ydS8nLFxuICAnLy9tYXBzLmdvb2dsZWFwaXMuY29tL21hcHMvYXBpL2pzL0dlb1Bob3RvU2VydmljZS5HZXRNZXRhZGF0YScsXG4gICcvL2EuY29uZmlnLnNreXBlLmNvbS9jb25maWcvdjEvU2t5cGUvOTA4XzEuMzMuMC4xMTEvU2t5cGVQZXJzb25hbGl6YXRpb24nLFxuICAnLy9tYXBzLmJlZWxpbmUucnUvdycsXG4gICcvL3RhcmdldC51a3IubmV0LycsXG4gICcvL3d3dy5tZXRlb3Byb2cudWEvZGF0YS93ZWF0aGVyL2luZm9ybWVyL1BvbHRhdmEuanMnLFxuICAnLy9jZG4uc3luZGljYXRpb24udHdpbWcuY29tL3dpZGdldHMvdGltZWxpbmVzLzU5OTIwMDA1NDMxMDYwNDgwMicsXG4gICcvL3dzbG9ja2VyLnJ1L2NsaWVudC91c2VyLmNoay5waHAnLFxuICAnLy9jb21tdW5pdHkuYWRvYmUuY29tL0NvbW11bml0eVBvZC9nZXRKU09OJyxcbiAgJy8vbWFwcy5nb29nbGUubHYvbWFwcy92dCcsXG4gICcvL2Rldi52aXJ0dWFsZWFydGgubmV0L1JFU1QvVjEvSW1hZ2VyeS9NZXRhZGF0YS9BZXJpYWxXaXRoTGFiZWxzLzI2LjMxODU4MScsXG4gICcvL2F3YXBzLnlhbmRleC5ydS8xMC84OTM4LzAyNDAwNDAwLicsXG4gICcvL2EyNDguZS5ha2FtYWkubmV0L2g1Lmh1bHUuY29tL2g1Lm1wNCcsXG4gICcvL25vbWluYXRpbS5vcGVuc3RyZWV0bWFwLm9yZy8nLFxuICAnLy9wbHVnaW5zLm1vemlsbGEub3JnL2VuLXVzL3BsdWdpbnNfbGlzdC5qc29uJyxcbiAgJy8vaC5jYWNrbGUubWUvd2lkZ2V0LzMyMTUzL2Jvb3RzdHJhcCcsXG4gICcvL2dyYXBoLmZhY2Vib29rLmNvbS8xLycsXG4gICcvL2ZlbGxvd2VzLnVnYy5iYXphYXJ2b2ljZS5jb20vZGF0YS9yZXZpZXdzLmpzb24nLFxuICAnLy93aWRnZXRzLnBpbnRlcmVzdC5jb20vdjMvcGlkZ2V0cy9ib2FyZHMvY2ljaXdpbi9oZWRnZWhvZy1zcXVpcnJlbC1jcmFmdHMvcGlucy8nLFxuICAnLy9hcHBjZW50ZXIuaW50dWl0LmNvbS9BY2NvdW50L0xvZ291dEpTT05QJyxcbiAgJy8vd3d3LmxpbmtlZGluLmNvbS9jb3VudHNlcnYvY291bnQvc2hhcmUnLFxuICAnLy9zZS53aWtpcGVkaWEub3JnL3cvYXBpLnBocCcsXG4gICcvL2NzZS5nb29nbGUuY29tL2FwaS8wMDc2MjcwMjQ3MDUyNzczMjc0MjgvY3NlL3IzdnM3YjBmY2xpL3F1ZXJpZXMvanMnLFxuICAnLy9yZWxhcC5pby9hcGkvdjIvc2ltaWxhcl9wYWdlc19qc29ucC5qcycsXG4gICcvL2MxbjMuaHlwZXJjb21tZW50cy5jb20vc3RyZWFtL3N1YnNjcmliZScsXG4gICcvL21hcHMuZ29vZ2xlLmRlL21hcHMvdnQnLFxuICAnLy9ib29rcy5nb29nbGUuY29tL2Jvb2tzJyxcbiAgJy8vY29ubmVjdC5tYWlsLnJ1L3NoYXJlX2NvdW50JyxcbiAgJy8vdHIuaW5kZWVkLmNvbS9tL25ld2pvYnMnLFxuICAnLy93d3ctb25lcGljay1vcGVuc29jaWFsLmdvb2dsZXVzZXJjb250ZW50LmNvbS9nYWRnZXRzL3Byb3h5JyxcbiAgJy8vd3d3LnBhbm9yYW1pby5jb20vbWFwL2dldF9wYW5vcmFtYXMucGhwJyxcbiAgJy8vY2xpZW50LnNpdGVoZWFydC5jb20vc3RyZWFtY2xpL2NsaWVudCcsXG4gICcvL3d3dy5mYWNlYm9vay5jb20vcmVzdHNlcnZlci5waHAnLFxuICAnLy9hdXRvY29tcGxldGUudHJhdmVscGF5b3V0cy5jb20vYXZpYScsXG4gICcvL3d3dy5nb29nbGVhcGlzLmNvbS9mcmVlYmFzZS92MS90b3BpYy9tLzAzNDRfJyxcbiAgJy8vbXRzMS5nb29nbGVhcGlzLmNvbS9tYXBzbHQvZnQnLFxuICAnLy9hcGkudHdpdHRlci5jb20vMS9zdGF0dXNlcy9vZW1iZWQuanNvbicsXG4gICcvL2Zhc3Qud2lzdGlhLmNvbS9lbWJlZC9tZWRpYXMvbzc1anR3NzY1NC5qc29uJyxcbiAgJy8vcGFydG5lci5nb29nbGVhZHNlcnZpY2VzLmNvbS9nYW1wYWQvYWRzJyxcbiAgJy8vcGFzcy55YW5kZXgucnUvc2VydmljZXMnLFxuICAnLy9ndXBpYW8uYmFpZHUuY29tL3N0b2Nrcy9zdG9ja2JldHMnLFxuICAnLy93aWRnZXQuYWRtaXRhZC5jb20vd2lkZ2V0L2luaXQnLFxuICAnLy9hcGkuaW5zdGFncmFtLmNvbS92MS90YWdzL3BhcnR5a3VuZ2VuMjMzMjgvbWVkaWEvcmVjZW50JyxcbiAgJy8vdmlkZW8ubWVkaWEueXFsLnlhaG9vLmNvbS92MS92aWRlby9zYXBpL3N0cmVhbXMvMDYzZmI3NmMtNmM3MC0zOGM1LTliYmMtMDRiN2MzODRkZTJiJyxcbiAgJy8vaWIuYWRueHMuY29tL2pwdCcsXG4gICcvL3Bhc3MueWFuZGV4LmNvbS9zZXJ2aWNlcycsXG4gICcvL3d3dy5nb29nbGUuZGUvbWFwcy92dCcsXG4gICcvL2NsaWVudHMxLmdvb2dsZS5jb20vY29tcGxldGUvc2VhcmNoJyxcbiAgJy8vYXBpLnVzZXJsaWtlLmNvbS9hcGkvY2hhdC9zbG90L3Byb2FjdGl2ZS8nLFxuICAnLy93d3cueW91a3UuY29tL2luZGV4X2Nvb2tpZWxpc3Qvcy9qc29ucCcsXG4gICcvL210MS5nb29nbGVhcGlzLmNvbS9tYXBzbHQvZnQnLFxuICAnLy9hcGkubWl4cGFuZWwuY29tL3RyYWNrLycsXG4gICcvL3dwZC5iLnFxLmNvbS9jZ2kvZ2V0X3NpZ24ucGhwJyxcbiAgJy8vcGlwZXMueWFob29hcGlzLmNvbS9waXBlcy9waXBlLnJ1bicsXG4gICcvL2dkYXRhLnlvdXR1YmUuY29tL2ZlZWRzL2FwaS92aWRlb3MvV3NKSUhOMWtOV2MnLFxuICAnLy85LmNoYXJ0LmFwaXMuZ29vZ2xlLmNvbS9jaGFydCcsXG4gICcvL2Nkbi5zeW5kaWNhdGlvbi50d2l0dGVyLmNvbS9tb21lbnRzLzcwOTIyOTI5NjgwMDQ0MDMyMCcsXG4gICcvL2FwaS5mbGlja3IuY29tL3NlcnZpY2VzL2ZlZWRzL3Bob3Rvc19mcmllbmRzLmduZScsXG4gICcvL2Nia3MwLmdvb2dsZWFwaXMuY29tL2NiaycsXG4gICcvL3d3dy5ibG9nZ2VyLmNvbS9mZWVkcy81NTc4NjUzMzg3NTYyMzI0MDAyL3Bvc3RzL3N1bW1hcnkvNDQyNzU2MjAyNTMwMjc0OTI2OScsXG4gICcvL3F1ZXJ5LnlhaG9vYXBpcy5jb20vdjEvcHVibGljL3lxbCcsXG4gICcvL2tlY25nYW50YW5nLmJsb2dzcG90LmNvbS9mZWVkcy9wb3N0cy9kZWZhdWx0Ly0vS29taWsnLFxuICAnLy93d3cudHJhdmVscGF5b3V0cy5jb20vd2lkZ2V0cy81MGY1M2NlOWFkYTFiNTRiY2MwMDAwMzEuanNvbicsXG4gICcvL2kuY2Fja2xlLm1lL3dpZGdldC8zMjU4Ni9ib290c3RyYXAnLFxuICAnLy90cmFuc2xhdGUueWFuZGV4Lm5ldC9hcGkvdjEuNS90ci5qc29uL2RldGVjdCcsXG4gICcvL2EudGlsZXMubWFwYm94LmNvbS92My96ZW50cmFsbWVkaWEubWFwLW4ycmFlYXVjLmpzb25wJyxcbiAgJy8vbWFwcy5nb29nbGUucnUvbWFwcy92dCcsXG4gICcvL2MxbjIuaHlwZXJjb21tZW50cy5jb20vc3RyZWFtL3N1YnNjcmliZScsXG4gICcvL3JlYy55ZGYueWFuZGV4LnJ1L2Nvb2tpZScsXG4gICcvL2Nkbi5qc2RlbGl2ci5uZXQnXG5dO1xuIl19
;return exports;});

//javascript/security/csp/csp_evaluator/checks/security_checks.closure.js
goog.loadModule(function(exports) {'use strict';/**
 *
 * @fileoverview Collection of CSP evaluation checks.
 * Generated from: javascript/security/csp/csp_evaluator/checks/security_checks.ts
 * @author lwe\@google.com (Lukas Weichselbaum)
 *
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
goog.module('google3.javascript.security.csp.csp_evaluator.checks.security_checks');
var module = module || { id: 'javascript/security/csp/csp_evaluator/checks/security_checks.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
const tsickle_csp_1 = goog.requireType("google3.javascript.security.csp.csp_evaluator.csp");
const tsickle_utils_2 = goog.requireType("google3.javascript.security.csp.csp_evaluator.utils");
const tsickle_finding_3 = goog.requireType("google3.javascript.security.csp.csp_evaluator.finding");
const tsickle_angular_4 = goog.requireType("google3.javascript.security.csp.csp_evaluator.whitelist_bypasses.angular");
const tsickle_flash_5 = goog.requireType("google3.javascript.security.csp.csp_evaluator.whitelist_bypasses.flash");
const tsickle_jsonp_6 = goog.requireType("google3.javascript.security.csp.csp_evaluator.whitelist_bypasses.jsonp");
const csp = goog.require('google3.javascript.security.csp.csp_evaluator.csp');
const csp_1 = csp;
const utils = goog.require('google3.javascript.security.csp.csp_evaluator.utils');
const finding_1 = goog.require('google3.javascript.security.csp.csp_evaluator.finding');
const angular = goog.require('google3.javascript.security.csp.csp_evaluator.whitelist_bypasses.angular');
const flash = goog.require('google3.javascript.security.csp.csp_evaluator.whitelist_bypasses.flash');
const jsonp = goog.require('google3.javascript.security.csp.csp_evaluator.whitelist_bypasses.jsonp');
/**
 * A list of CSP directives that can allow XSS vulnerabilities if they fail
 * validation.
 * @type {!Array<!tsickle_csp_1.Directive>}
 */
exports.DIRECTIVES_CAUSING_XSS = [csp_1.Directive.SCRIPT_SRC, csp_1.Directive.OBJECT_SRC, csp_1.Directive.BASE_URI];
/**
 * A list of URL schemes that can allow XSS vulnerabilities when requests to
 * them are made.
 * @type {!Array<string>}
 */
exports.URL_SCHEMES_CAUSING_XSS = ['data:', 'http:', 'https:'];
/**
 * Checks if passed csp allows inline scripts.
 * Findings of this check are critical and FP free.
 * unsafe-inline is ignored in the presence of a nonce or a hash. This check
 * does not account for this and therefore the effectiveCsp needs to be passed.
 *
 * Example policy where this check would trigger:
 *  script-src 'unsafe-inline'
 *
 * @param {!tsickle_csp_1.Csp} effectiveCsp A parsed csp that only contains values which
 *  are active in a certain version of CSP (e.g. no unsafe-inline if a nonce
 *  is present).
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkScriptUnsafeInline(effectiveCsp) {
    /** @type {string} */
    const directiveName = csp.Csp.getEffectiveDirective(effectiveCsp, csp_1.Directive.SCRIPT_SRC);
    /** @type {!Array<string>} */
    const values = effectiveCsp[directiveName] || [];
    // Check if unsafe-inline is present.
    if (values.includes(csp_1.Keyword.UNSAFE_INLINE)) {
        return [new finding_1.Finding(finding_1.Type.SCRIPT_UNSAFE_INLINE, `'unsafe-inline' allows the execution of unsafe in-page scripts ` +
                'and event handlers.', finding_1.Severity.HIGH, directiveName, csp_1.Keyword.UNSAFE_INLINE)];
    }
    return [];
}
exports.checkScriptUnsafeInline = checkScriptUnsafeInline;
/**
 * Checks if passed csp allows eval in scripts.
 * Findings of this check have a medium severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 'unsafe-eval'
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkScriptUnsafeEval(parsedCsp) {
    /** @type {string} */
    const directiveName = csp.Csp.getEffectiveDirective(parsedCsp, csp_1.Directive.SCRIPT_SRC);
    /** @type {!Array<string>} */
    const values = parsedCsp[directiveName] || [];
    // Check if unsafe-eval is present.
    if (values.includes(csp_1.Keyword.UNSAFE_EVAL)) {
        return [new finding_1.Finding(finding_1.Type.SCRIPT_UNSAFE_EVAL, `'unsafe-eval' allows the execution of code injected into DOM APIs ` +
                'such as eval().', finding_1.Severity.MEDIUM_MAYBE, directiveName, csp_1.Keyword.UNSAFE_EVAL)];
    }
    return [];
}
exports.checkScriptUnsafeEval = checkScriptUnsafeEval;
/**
 * Checks if plain URL schemes (e.g. http:) are allowed in sensitive directives.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src https: http: data:
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkPlainUrlSchemes(parsedCsp) {
    /** @type {!Array<!tsickle_finding_3.Finding>} */
    const violations = [];
    /** @type {!Array<string>} */
    const directivesToCheck = csp.Csp.getEffectiveDirectives(parsedCsp, exports.DIRECTIVES_CAUSING_XSS);
    for (const directive of directivesToCheck) {
        /** @type {!Array<string>} */
        const values = parsedCsp[directive] || [];
        for (const value of values) {
            if (exports.URL_SCHEMES_CAUSING_XSS.includes(value)) {
                violations.push(new finding_1.Finding(finding_1.Type.PLAIN_URL_SCHEMES, value + ' URI in ' + directive + ' allows the execution of ' +
                    'unsafe scripts.', finding_1.Severity.HIGH, directive, value));
            }
        }
    }
    return violations;
}
exports.checkPlainUrlSchemes = checkPlainUrlSchemes;
/**
 * Checks if csp contains wildcards in sensitive directives.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src *
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkWildcards(parsedCsp) {
    /** @type {!Array<!tsickle_finding_3.Finding>} */
    const violations = [];
    /** @type {!Array<string>} */
    const directivesToCheck = csp.Csp.getEffectiveDirectives(parsedCsp, exports.DIRECTIVES_CAUSING_XSS);
    for (const directive of directivesToCheck) {
        /** @type {!Array<string>} */
        const values = parsedCsp[directive] || [];
        for (const value of values) {
            /** @type {string} */
            const url = utils.getSchemeFreeUrl(value);
            if (url === '*') {
                violations.push(new finding_1.Finding(finding_1.Type.PLAIN_WILDCARD, directive + ` should not allow '*' as source`, finding_1.Severity.HIGH, directive, value));
                continue;
            }
        }
    }
    return violations;
}
exports.checkWildcards = checkWildcards;
/**
 * Checks if object-src is restricted to none either directly or via a
 * default-src.
 * @param {!tsickle_csp_1.Csp} parsedCsp
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkMissingObjectSrcDirective(parsedCsp) {
    /** @type {(undefined|!Array<string>)} */
    let objectRestrictions = [];
    if (csp_1.Directive.OBJECT_SRC in parsedCsp) {
        objectRestrictions = parsedCsp[csp_1.Directive.OBJECT_SRC];
    }
    else if (csp_1.Directive.DEFAULT_SRC in parsedCsp) {
        objectRestrictions = parsedCsp[csp_1.Directive.DEFAULT_SRC];
    }
    if (objectRestrictions !== undefined && objectRestrictions.length === 1 &&
        objectRestrictions[0] === csp_1.Keyword.NONE) {
        return [];
    }
    return [new finding_1.Finding(finding_1.Type.MISSING_DIRECTIVES, `Missing object-src allows the injection of plugins which can execute JavaScript. Can you set it to 'none'?`, finding_1.Severity.HIGH, csp_1.Directive.OBJECT_SRC)];
}
exports.checkMissingObjectSrcDirective = checkMissingObjectSrcDirective;
/**
 * Checks if script-src is restricted either directly or via a default-src.
 * @param {!tsickle_csp_1.Csp} parsedCsp
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkMissingScriptSrcDirective(parsedCsp) {
    if (csp_1.Directive.SCRIPT_SRC in parsedCsp || csp_1.Directive.DEFAULT_SRC in parsedCsp) {
        return [];
    }
    return [new finding_1.Finding(finding_1.Type.MISSING_DIRECTIVES, 'script-src directive is missing.', finding_1.Severity.HIGH, csp_1.Directive.SCRIPT_SRC)];
}
exports.checkMissingScriptSrcDirective = checkMissingScriptSrcDirective;
/**
 * Checks if the base-uri needs to be restricted and if so, whether it has been
 * restricted.
 * @param {!tsickle_csp_1.Csp} parsedCsp
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkMissingBaseUriDirective(parsedCsp) {
    return checkMultipleMissingBaseUriDirective([parsedCsp]);
}
exports.checkMissingBaseUriDirective = checkMissingBaseUriDirective;
/**
 * Checks if the base-uri needs to be restricted and if so, whether it has been
 * restricted.
 * @param {!Array<!tsickle_csp_1.Csp>} parsedCsps
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkMultipleMissingBaseUriDirective(parsedCsps) {
    // base-uri can be used to bypass nonce based CSPs and hash based CSPs that
    // use strict dynamic
    /** @type {function(!tsickle_csp_1.Csp): boolean} */
    const needsBaseUri = (/**
     * @param {!tsickle_csp_1.Csp} csp
     * @return {boolean}
     */
    (csp) => (csp_1.Csp.policyHasScriptNonces(csp) ||
        (csp_1.Csp.policyHasScriptHashes(csp) && csp_1.Csp.policyHasStrictDynamic(csp))));
    /** @type {function(!tsickle_csp_1.Csp): boolean} */
    const hasBaseUri = (/**
     * @param {!tsickle_csp_1.Csp} csp
     * @return {boolean}
     */
    (csp) => csp_1.Directive.BASE_URI in csp);
    if (parsedCsps.some(needsBaseUri) && !parsedCsps.some(hasBaseUri)) {
        /** @type {string} */
        const description = 'Missing base-uri allows the injection of base tags. ' +
            'They can be used to set the base URL for all relative (script) ' +
            'URLs to an attacker controlled domain. ' +
            `Can you set it to 'none' or 'self'?`;
        return [new finding_1.Finding(finding_1.Type.MISSING_DIRECTIVES, description, finding_1.Severity.HIGH, csp_1.Directive.BASE_URI)];
    }
    return [];
}
exports.checkMultipleMissingBaseUriDirective = checkMultipleMissingBaseUriDirective;
/**
 * Checks if all necessary directives for preventing XSS are set.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 'none'
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkMissingDirectives(parsedCsp) {
    return [
        ...checkMissingObjectSrcDirective(parsedCsp),
        ...checkMissingScriptSrcDirective(parsedCsp),
        ...checkMissingBaseUriDirective(parsedCsp),
    ];
}
exports.checkMissingDirectives = checkMissingDirectives;
/**
 * Checks if whitelisted origins are bypassable by JSONP/Angular endpoints.
 * High severity findings of this check are FP free.
 *
 * Example policy where this check would trigger:
 *  default-src 'none'; script-src www.google.com
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkScriptWhitelistBypass(parsedCsp) {
    /** @type {!Array<!tsickle_finding_3.Finding>} */
    const violations = [];
    /** @type {string} */
    const effectiveScriptSrcDirective = csp.Csp.getEffectiveDirective(parsedCsp, csp_1.Directive.SCRIPT_SRC);
    /** @type {!Array<string>} */
    const scriptSrcValues = parsedCsp[effectiveScriptSrcDirective] || [];
    if (scriptSrcValues.includes(csp_1.Keyword.NONE)) {
        return violations;
    }
    for (const value of scriptSrcValues) {
        if (value === csp_1.Keyword.SELF) {
            violations.push(new finding_1.Finding(finding_1.Type.SCRIPT_WHITELIST_BYPASS, `'self' can be problematic if you host JSONP, Angular or user ` +
                'uploaded files.', finding_1.Severity.MEDIUM_MAYBE, effectiveScriptSrcDirective, value));
            continue;
        }
        // Ignore keywords, nonces and hashes (they start with a single quote).
        if (value.startsWith('\'')) {
            continue;
        }
        // Ignore standalone schemes and things that don't look like URLs (no dot).
        if (csp.isUrlScheme(value) || value.indexOf('.') === -1) {
            continue;
        }
        /** @type {string} */
        const url = '//' + utils.getSchemeFreeUrl(value);
        /** @type {(null|!URL)} */
        const angularBypass = utils.matchWildcardUrls(url, angular.URLS);
        /** @type {(null|!URL)} */
        let jsonpBypass = utils.matchWildcardUrls(url, jsonp.URLS);
        // Some JSONP bypasses only work in presence of unsafe-eval.
        if (jsonpBypass) {
            /** @type {boolean} */
            const evalRequired = jsonp.NEEDS_EVAL.includes(jsonpBypass.hostname);
            /** @type {boolean} */
            const evalPresent = scriptSrcValues.includes(csp_1.Keyword.UNSAFE_EVAL);
            if (evalRequired && !evalPresent) {
                jsonpBypass = null;
            }
        }
        if (jsonpBypass || angularBypass) {
            /** @type {string} */
            let bypassDomain = '';
            /** @type {string} */
            let bypassTxt = '';
            if (jsonpBypass) {
                bypassDomain = jsonpBypass.hostname;
                bypassTxt = ' JSONP endpoints';
            }
            if (angularBypass) {
                bypassDomain = angularBypass.hostname;
                bypassTxt += (bypassTxt.trim() === '') ? '' : ' and';
                bypassTxt += ' Angular libraries';
            }
            violations.push(new finding_1.Finding(finding_1.Type.SCRIPT_WHITELIST_BYPASS, bypassDomain + ' is known to host' + bypassTxt +
                ' which allow to bypass this CSP.', finding_1.Severity.HIGH, effectiveScriptSrcDirective, value));
        }
        else {
            violations.push(new finding_1.Finding(finding_1.Type.SCRIPT_WHITELIST_BYPASS, `No bypass found; make sure that this URL doesn't serve JSONP ` +
                'replies or Angular libraries.', finding_1.Severity.MEDIUM_MAYBE, effectiveScriptSrcDirective, value));
        }
    }
    return violations;
}
exports.checkScriptWhitelistBypass = checkScriptWhitelistBypass;
/**
 * Checks if whitelisted object-src origins are bypassable.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  default-src 'none'; object-src ajax.googleapis.com
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkFlashObjectWhitelistBypass(parsedCsp) {
    /** @type {!Array<?>} */
    const violations = [];
    /** @type {string} */
    const effectiveObjectSrcDirective = csp.Csp.getEffectiveDirective(parsedCsp, csp_1.Directive.OBJECT_SRC);
    /** @type {!Array<string>} */
    const objectSrcValues = parsedCsp[effectiveObjectSrcDirective] || [];
    // If flash is not allowed in plugin-types, continue.
    /** @type {(undefined|!Array<string>)} */
    const pluginTypes = parsedCsp[csp_1.Directive.PLUGIN_TYPES];
    if (pluginTypes && !pluginTypes.includes('application/x-shockwave-flash')) {
        return [];
    }
    for (const value of objectSrcValues) {
        // Nothing to do here if 'none'.
        if (value === csp_1.Keyword.NONE) {
            return [];
        }
        /** @type {string} */
        const url = '//' + utils.getSchemeFreeUrl(value);
        /** @type {(null|!URL)} */
        const flashBypass = utils.matchWildcardUrls(url, flash.URLS);
        if (flashBypass) {
            violations.push(new finding_1.Finding(finding_1.Type.OBJECT_WHITELIST_BYPASS, flashBypass.hostname +
                ' is known to host Flash files which allow to bypass this CSP.', finding_1.Severity.HIGH, effectiveObjectSrcDirective, value));
        }
        else if (effectiveObjectSrcDirective === csp_1.Directive.OBJECT_SRC) {
            violations.push(new finding_1.Finding(finding_1.Type.OBJECT_WHITELIST_BYPASS, `Can you restrict object-src to 'none' only?`, finding_1.Severity.MEDIUM_MAYBE, effectiveObjectSrcDirective, value));
        }
    }
    return violations;
}
exports.checkFlashObjectWhitelistBypass = checkFlashObjectWhitelistBypass;
/**
 * Returns whether the given string "looks" like an IP address. This function
 * only uses basic heuristics and does not accept all valid IPs nor reject all
 * invalid IPs.
 * @param {string} maybeIp
 * @return {boolean}
 */
function looksLikeIpAddress(maybeIp) {
    if (maybeIp.startsWith('[') && maybeIp.endsWith(']')) {
        // Looks like an IPv6 address and not a hostname (though it may be some
        // nonsense like `[foo]`)
        return true;
    }
    if (/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(maybeIp)) {
        // Looks like an IPv4 address (though it may be something like
        // `500.600.700.800`
        return true;
    }
    // Won't match IP addresses encoded in other manners (eg octal or
    // decimal)
    return false;
}
exports.looksLikeIpAddress = looksLikeIpAddress;
/**
 * Checks if csp contains IP addresses.
 * Findings of this check are informal only and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 127.0.0.1
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkIpSource(parsedCsp) {
    /** @type {!Array<!tsickle_finding_3.Finding>} */
    const violations = [];
    // Function for checking if directive values contain IP addresses.
    /** @type {function(string, !Array<string>): void} */
    const checkIp = (/**
     * @param {string} directive
     * @param {!Array<string>} directiveValues
     * @return {void}
     */
    (directive, directiveValues) => {
        for (const value of directiveValues) {
            /** @type {string} */
            const host = utils.getHostname(value);
            if (looksLikeIpAddress(host)) {
                // Check if localhost.
                // See 4.8 in https://www.w3.org/TR/CSP2/#match-source-expression
                if (host === '127.0.0.1') {
                    violations.push(new finding_1.Finding(finding_1.Type.IP_SOURCE, directive + ' directive allows localhost as source. ' +
                        'Please make sure to remove this in production environments.', finding_1.Severity.INFO, directive, value));
                }
                else {
                    violations.push(new finding_1.Finding(finding_1.Type.IP_SOURCE, directive + ' directive has an IP-Address as source: ' + host +
                        ' (will be ignored by browsers!). ', finding_1.Severity.INFO, directive, value));
                }
            }
        }
    });
    // Apply check to values of all directives.
    utils.applyCheckFunktionToDirectives(parsedCsp, checkIp);
    return violations;
}
exports.checkIpSource = checkIpSource;
/**
 * Checks if csp contains directives that are deprecated in CSP3.
 * Findings of this check are informal only and are FP free.
 *
 * Example policy where this check would trigger:
 *  report-uri foo.bar/csp
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkDeprecatedDirective(parsedCsp) {
    /** @type {!Array<?>} */
    const violations = [];
    // More details: https://www.chromestatus.com/feature/5769374145183744
    if (csp_1.Directive.REFLECTED_XSS in parsedCsp) {
        violations.push(new finding_1.Finding(finding_1.Type.DEPRECATED_DIRECTIVE, 'reflected-xss is deprecated since CSP2. ' +
            'Please, use the X-XSS-Protection header instead.', finding_1.Severity.INFO, csp_1.Directive.REFLECTED_XSS));
    }
    // More details: https://www.chromestatus.com/feature/5680800376815616
    if (csp_1.Directive.REFERRER in parsedCsp) {
        violations.push(new finding_1.Finding(finding_1.Type.DEPRECATED_DIRECTIVE, 'referrer is deprecated since CSP2. ' +
            'Please, use the Referrer-Policy header instead.', finding_1.Severity.INFO, csp_1.Directive.REFERRER));
    }
    // More details: https://github.com/w3c/webappsec-csp/pull/327
    if (csp_1.Directive.DISOWN_OPENER in parsedCsp) {
        violations.push(new finding_1.Finding(finding_1.Type.DEPRECATED_DIRECTIVE, 'disown-opener is deprecated since CSP3. ' +
            'Please, use the Cross Origin Opener Policy header instead.', finding_1.Severity.INFO, csp_1.Directive.DISOWN_OPENER));
    }
    return violations;
}
exports.checkDeprecatedDirective = checkDeprecatedDirective;
/**
 * Checks if csp nonce is at least 8 characters long.
 * Findings of this check are of medium severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 'nonce-short'
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkNonceLength(parsedCsp) {
    /** @type {!RegExp} */
    const noncePattern = new RegExp('^\'nonce-(.+)\'$');
    /** @type {!Array<!tsickle_finding_3.Finding>} */
    const violations = [];
    utils.applyCheckFunktionToDirectives(parsedCsp, (/**
     * @param {string} directive
     * @param {!Array<string>} directiveValues
     * @return {void}
     */
    (directive, directiveValues) => {
        for (const value of directiveValues) {
            /** @type {(null|!RegExpMatchArray)} */
            const match = value.match(noncePattern);
            if (!match) {
                continue;
            }
            // Not a nonce.
            /** @type {string} */
            const nonceValue = match[1];
            if (nonceValue.length < 8) {
                violations.push(new finding_1.Finding(finding_1.Type.NONCE_LENGTH, 'Nonces should be at least 8 characters long.', finding_1.Severity.MEDIUM, directive, value));
            }
            if (!csp.isNonce(value, true)) {
                violations.push(new finding_1.Finding(finding_1.Type.NONCE_LENGTH, 'Nonces should only use the base64 charset.', finding_1.Severity.INFO, directive, value));
            }
        }
    }));
    return violations;
}
exports.checkNonceLength = checkNonceLength;
/**
 * Checks if CSP allows sourcing from http://
 * Findings of this check are of medium severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  report-uri http://foo.bar/csp
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp Parsed CSP.
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkSrcHttp(parsedCsp) {
    /** @type {!Array<!tsickle_finding_3.Finding>} */
    const violations = [];
    utils.applyCheckFunktionToDirectives(parsedCsp, (/**
     * @param {string} directive
     * @param {!Array<string>} directiveValues
     * @return {void}
     */
    (directive, directiveValues) => {
        for (const value of directiveValues) {
            /** @type {string} */
            const description = directive === csp_1.Directive.REPORT_URI ?
                'Use HTTPS to send violation reports securely.' :
                'Allow only resources downloaded over HTTPS.';
            if (value.startsWith('http://')) {
                violations.push(new finding_1.Finding(finding_1.Type.SRC_HTTP, description, finding_1.Severity.MEDIUM, directive, value));
            }
        }
    }));
    return violations;
}
exports.checkSrcHttp = checkSrcHttp;
/**
 * Checks if the policy has configured reporting in a robust manner.
 * @param {!tsickle_csp_1.Csp} parsedCsp
 * @return {!Array<!tsickle_finding_3.Finding>}
 */
function checkHasConfiguredReporting(parsedCsp) {
    /** @type {!Array<string>} */
    const reportUriValues = parsedCsp[csp_1.Directive.REPORT_URI] || [];
    if (reportUriValues.length > 0) {
        return [];
    }
    /** @type {!Array<string>} */
    const reportToValues = parsedCsp[csp_1.Directive.REPORT_TO] || [];
    if (reportToValues.length > 0) {
        return [new finding_1.Finding(finding_1.Type.REPORT_TO_ONLY, `This CSP policy only provides a reporting destination via the 'report-to' directive. This directive is only supported in Chromium-based browsers so it is recommended to also use a 'report-uri' directive.`, finding_1.Severity.INFO, csp_1.Directive.REPORT_TO)];
    }
    return [new finding_1.Finding(finding_1.Type.REPORTING_DESTINATION_MISSING, 'This CSP policy does not configure a reporting destination. This makes it difficult to maintain the CSP policy over time and monitor for any breakages.', finding_1.Severity.INFO, csp_1.Directive.REPORT_URI)];
}
exports.checkHasConfiguredReporting = checkHasConfiguredReporting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJpdHlfY2hlY2tzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vamF2YXNjcmlwdC9zZWN1cml0eS9jc3AvY3NwX2V2YWx1YXRvci9jaGVja3Mvc2VjdXJpdHlfY2hlY2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFtQkEsOEVBQXlFO0FBQ3pFLGtCQUEwRjtBQUMxRixrRkFBNkU7QUFFN0Usd0ZBQW1EO0FBQ25ELHlHQUF5RDtBQUN6RCxxR0FBcUQ7QUFDckQscUdBQXFEOzs7Ozs7QUFPeEMsUUFBQSxzQkFBc0IsR0FDL0IsQ0FBQyxlQUFTLENBQUMsVUFBVSxFQUFFLGVBQVMsQ0FBQyxVQUFVLEVBQUUsZUFBUyxDQUFDLFFBQVEsQ0FBQzs7Ozs7O0FBTXZELFFBQUEsdUJBQXVCLEdBQWEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0I3RSxTQUFnQix1QkFBdUIsQ0FBQyxZQUFpQjs7VUFDakQsYUFBYSxHQUNmLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLGVBQVMsQ0FBQyxVQUFVLENBQUM7O1VBQy9ELE1BQU0sR0FBYSxZQUFZLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRTtJQUUxRCxxQ0FBcUM7SUFDckMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQU8sQ0FBQyxhQUFhLENBQUMsRUFBRTtRQUMxQyxPQUFPLENBQUMsSUFBSSxpQkFBTyxDQUNmLGNBQUksQ0FBQyxvQkFBb0IsRUFDekIsaUVBQWlFO2dCQUM3RCxxQkFBcUIsRUFDekIsa0JBQVEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLGFBQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0tBQzNEO0lBRUQsT0FBTyxFQUFFLENBQUM7QUFDWixDQUFDO0FBZkQsMERBZUM7Ozs7Ozs7Ozs7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QUUsa0JBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDckU7U0FDRjtJQUNILENBQUMsRUFBQyxDQUFDO0lBRVAsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQWpCRCxvQ0FpQkM7Ozs7OztBQUtELFNBQWdCLDJCQUEyQixDQUFDLFNBQWM7O1VBQ2xELGVBQWUsR0FBYSxTQUFTLENBQUMsZUFBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUU7SUFDdkUsSUFBSSxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM5QixPQUFPLEVBQUUsQ0FBQztLQUNYOztVQUVLLGNBQWMsR0FBYSxTQUFTLENBQUMsZUFBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUU7SUFDckUsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUM3QixPQUFPLENBQUMsSUFBSSxpQkFBTyxDQUNmLGNBQUksQ0FBQyxjQUFjLEVBQ25CLDZNQUE2TSxFQUM3TSxrQkFBUSxDQUFDLElBQUksRUFBRSxlQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUMxQztJQUVELE9BQU8sQ0FBQyxJQUFJLGlCQUFPLENBQ2YsY0FBSSxDQUFDLDZCQUE2QixFQUNsQyx5SkFBeUosRUFDekosa0JBQVEsQ0FBQyxJQUFJLEVBQUUsZUFBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQWxCRCxrRUFrQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQ29sbGVjdGlvbiBvZiBDU1AgZXZhbHVhdGlvbiBjaGVja3MuXG4gKiBAYXV0aG9yIGx3ZUBnb29nbGUuY29tIChMdWthcyBXZWljaHNlbGJhdW0pXG4gKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCAqIGFzIGNzcCBmcm9tICdnb29nbGUzL2phdmFzY3JpcHQvc2VjdXJpdHkvY3NwL2NzcF9ldmFsdWF0b3IvY3NwJztcbmltcG9ydCB7Q3NwLCBEaXJlY3RpdmUsIEtleXdvcmR9IGZyb20gJ2dvb2dsZTMvamF2YXNjcmlwdC9zZWN1cml0eS9jc3AvY3NwX2V2YWx1YXRvci9jc3AnO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnZ29vZ2xlMy9qYXZhc2NyaXB0L3NlY3VyaXR5L2NzcC9jc3BfZXZhbHVhdG9yL3V0aWxzJztcblxuaW1wb3J0IHtGaW5kaW5nLCBTZXZlcml0eSwgVHlwZX0gZnJvbSAnLi4vZmluZGluZyc7XG5pbXBvcnQgKiBhcyBhbmd1bGFyIGZyb20gJy4uL3doaXRlbGlzdF9ieXBhc3Nlcy9hbmd1bGFyJztcbmltcG9ydCAqIGFzIGZsYXNoIGZyb20gJy4uL3doaXRlbGlzdF9ieXBhc3Nlcy9mbGFzaCc7XG5pbXBvcnQgKiBhcyBqc29ucCBmcm9tICcuLi93aGl0ZWxpc3RfYnlwYXNzZXMvanNvbnAnO1xuXG5cbi8qKlxuICogQSBsaXN0IG9mIENTUCBkaXJlY3RpdmVzIHRoYXQgY2FuIGFsbG93IFhTUyB2dWxuZXJhYmlsaXRpZXMgaWYgdGhleSBmYWlsXG4gKiB2YWxpZGF0aW9uLlxuICovXG5leHBvcnQgY29uc3QgRElSRUNUSVZFU19DQVVTSU5HX1hTUzogRGlyZWN0aXZlW10gPVxuICAgIFtEaXJlY3RpdmUuU0NSSVBUX1NSQywgRGlyZWN0aXZlLk9CSkVDVF9TUkMsIERpcmVjdGl2ZS5CQVNFX1VSSV07XG5cbi8qKlxuICogQSBsaXN0IG9mIFVSTCBzY2hlbWVzIHRoYXQgY2FuIGFsbG93IFhTUyB2dWxuZXJhYmlsaXRpZXMgd2hlbiByZXF1ZXN0cyB0b1xuICogdGhlbSBhcmUgbWFkZS5cbiAqL1xuZXhwb3J0IGNvbnN0IFVSTF9TQ0hFTUVTX0NBVVNJTkdfWFNTOiBzdHJpbmdbXSA9IFsnZGF0YTonLCAnaHR0cDonLCAnaHR0cHM6J107XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgcGFzc2VkIGNzcCBhbGxvd3MgaW5saW5lIHNjcmlwdHMuXG4gKiBGaW5kaW5ncyBvZiB0aGlzIGNoZWNrIGFyZSBjcml0aWNhbCBhbmQgRlAgZnJlZS5cbiAqIHVuc2FmZS1pbmxpbmUgaXMgaWdub3JlZCBpbiB0aGUgcHJlc2VuY2Ugb2YgYSBub25jZSBvciBhIGhhc2guIFRoaXMgY2hlY2tcbiAqIGRvZXMgbm90IGFjY291bnQgZm9yIHRoaXMgYW5kIHRoZXJlZm9yZSB0aGUgZWZmZWN0aXZlQ3NwIG5lZWRzIHRvIGJlIHBhc3NlZC5cbiAqXG4gKiBFeGFtcGxlIHBvbGljeSB3aGVyZSB0aGlzIGNoZWNrIHdvdWxkIHRyaWdnZXI6XG4gKiAgc2NyaXB0LXNyYyAndW5zYWZlLWlubGluZSdcbiAqXG4gKiBAcGFyYW0gZWZmZWN0aXZlQ3NwIEEgcGFyc2VkIGNzcCB0aGF0IG9ubHkgY29udGFpbnMgdmFsdWVzIHdoaWNoXG4gKiAgYXJlIGFjdGl2ZSBpbiBhIGNlcnRhaW4gdmVyc2lvbiBvZiBDU1AgKGUuZy4gbm8gdW5zYWZlLWlubGluZSBpZiBhIG5vbmNlXG4gKiAgaXMgcHJlc2VudCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja1NjcmlwdFVuc2FmZUlubGluZShlZmZlY3RpdmVDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIGNvbnN0IGRpcmVjdGl2ZU5hbWUgPVxuICAgICAgY3NwLkNzcC5nZXRFZmZlY3RpdmVEaXJlY3RpdmUoZWZmZWN0aXZlQ3NwLCBEaXJlY3RpdmUuU0NSSVBUX1NSQyk7XG4gIGNvbnN0IHZhbHVlczogc3RyaW5nW10gPSBlZmZlY3RpdmVDc3BbZGlyZWN0aXZlTmFtZV0gfHwgW107XG5cbiAgLy8gQ2hlY2sgaWYgdW5zYWZlLWlubGluZSBpcyBwcmVzZW50LlxuICBpZiAodmFsdWVzLmluY2x1ZGVzKEtleXdvcmQuVU5TQUZFX0lOTElORSkpIHtcbiAgICByZXR1cm4gW25ldyBGaW5kaW5nKFxuICAgICAgICBUeXBlLlNDUklQVF9VTlNBRkVfSU5MSU5FLFxuICAgICAgICBgJ3Vuc2FmZS1pbmxpbmUnIGFsbG93cyB0aGUgZXhlY3V0aW9uIG9mIHVuc2FmZSBpbi1wYWdlIHNjcmlwdHMgYCArXG4gICAgICAgICAgICAnYW5kIGV2ZW50IGhhbmRsZXJzLicsXG4gICAgICAgIFNldmVyaXR5LkhJR0gsIGRpcmVjdGl2ZU5hbWUsIEtleXdvcmQuVU5TQUZFX0lOTElORSldO1xuICB9XG5cbiAgcmV0dXJuIFtdO1xufVxuXG5cbi8qKlxuICogQ2hlY2tzIGlmIHBhc3NlZCBjc3AgYWxsb3dzIGV2YWwgaW4gc2NyaXB0cy5cbiAqIEZpbmRpbmdzIG9mIHRoaXMgY2hlY2sgaGF2ZSBhIG1lZGl1bSBzZXZlcml0eSBhbmQgYXJlIEZQIGZyZWUuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyOlxuICogIHNjcmlwdC1zcmMgJ3Vuc2FmZS1ldmFsJ1xuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgUGFyc2VkIENTUC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrU2NyaXB0VW5zYWZlRXZhbChwYXJzZWRDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIGNvbnN0IGRpcmVjdGl2ZU5hbWUgPVxuICAgICAgY3NwLkNzcC5nZXRFZmZlY3RpdmVEaXJlY3RpdmUocGFyc2VkQ3NwLCBEaXJlY3RpdmUuU0NSSVBUX1NSQyk7XG4gIGNvbnN0IHZhbHVlczogc3RyaW5nW10gPSBwYXJzZWRDc3BbZGlyZWN0aXZlTmFtZV0gfHwgW107XG5cbiAgLy8gQ2hlY2sgaWYgdW5zYWZlLWV2YWwgaXMgcHJlc2VudC5cbiAgaWYgKHZhbHVlcy5pbmNsdWRlcyhLZXl3b3JkLlVOU0FGRV9FVkFMKSkge1xuICAgIHJldHVybiBbbmV3IEZpbmRpbmcoXG4gICAgICAgIFR5cGUuU0NSSVBUX1VOU0FGRV9FVkFMLFxuICAgICAgICBgJ3Vuc2FmZS1ldmFsJyBhbGxvd3MgdGhlIGV4ZWN1dGlvbiBvZiBjb2RlIGluamVjdGVkIGludG8gRE9NIEFQSXMgYCArXG4gICAgICAgICAgICAnc3VjaCBhcyBldmFsKCkuJyxcbiAgICAgICAgU2V2ZXJpdHkuTUVESVVNX01BWUJFLCBkaXJlY3RpdmVOYW1lLCBLZXl3b3JkLlVOU0FGRV9FVkFMKV07XG4gIH1cblxuICByZXR1cm4gW107XG59XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgcGxhaW4gVVJMIHNjaGVtZXMgKGUuZy4gaHR0cDopIGFyZSBhbGxvd2VkIGluIHNlbnNpdGl2ZSBkaXJlY3RpdmVzLlxuICogRmluZGluZ3Mgb2YgdGhpcyBjaGVjayBoYXZlIGEgaGlnaCBzZXZlcml0eSBhbmQgYXJlIEZQIGZyZWUuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyOlxuICogIHNjcmlwdC1zcmMgaHR0cHM6IGh0dHA6IGRhdGE6XG4gKlxuICogQHBhcmFtIHBhcnNlZENzcCBQYXJzZWQgQ1NQLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tQbGFpblVybFNjaGVtZXMocGFyc2VkQ3NwOiBDc3ApOiBGaW5kaW5nW10ge1xuICBjb25zdCB2aW9sYXRpb25zOiBGaW5kaW5nW10gPSBbXTtcbiAgY29uc3QgZGlyZWN0aXZlc1RvQ2hlY2sgPVxuICAgICAgY3NwLkNzcC5nZXRFZmZlY3RpdmVEaXJlY3RpdmVzKHBhcnNlZENzcCwgRElSRUNUSVZFU19DQVVTSU5HX1hTUyk7XG5cbiAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgZGlyZWN0aXZlc1RvQ2hlY2spIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBwYXJzZWRDc3BbZGlyZWN0aXZlXSB8fCBbXTtcbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIHZhbHVlcykge1xuICAgICAgaWYgKFVSTF9TQ0hFTUVTX0NBVVNJTkdfWFNTLmluY2x1ZGVzKHZhbHVlKSkge1xuICAgICAgICB2aW9sYXRpb25zLnB1c2gobmV3IEZpbmRpbmcoXG4gICAgICAgICAgICBUeXBlLlBMQUlOX1VSTF9TQ0hFTUVTLFxuICAgICAgICAgICAgdmFsdWUgKyAnIFVSSSBpbiAnICsgZGlyZWN0aXZlICsgJyBhbGxvd3MgdGhlIGV4ZWN1dGlvbiBvZiAnICtcbiAgICAgICAgICAgICAgICAndW5zYWZlIHNjcmlwdHMuJyxcbiAgICAgICAgICAgIFNldmVyaXR5LkhJR0gsIGRpcmVjdGl2ZSwgdmFsdWUpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmlvbGF0aW9ucztcbn1cblxuXG4vKipcbiAqIENoZWNrcyBpZiBjc3AgY29udGFpbnMgd2lsZGNhcmRzIGluIHNlbnNpdGl2ZSBkaXJlY3RpdmVzLlxuICogRmluZGluZ3Mgb2YgdGhpcyBjaGVjayBoYXZlIGEgaGlnaCBzZXZlcml0eSBhbmQgYXJlIEZQIGZyZWUuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyOlxuICogIHNjcmlwdC1zcmMgKlxuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgUGFyc2VkIENTUC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrV2lsZGNhcmRzKHBhcnNlZENzcDogQ3NwKTogRmluZGluZ1tdIHtcbiAgY29uc3QgdmlvbGF0aW9uczogRmluZGluZ1tdID0gW107XG4gIGNvbnN0IGRpcmVjdGl2ZXNUb0NoZWNrID1cbiAgICAgIGNzcC5Dc3AuZ2V0RWZmZWN0aXZlRGlyZWN0aXZlcyhwYXJzZWRDc3AsIERJUkVDVElWRVNfQ0FVU0lOR19YU1MpO1xuXG4gIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGRpcmVjdGl2ZXNUb0NoZWNrKSB7XG4gICAgY29uc3QgdmFsdWVzID0gcGFyc2VkQ3NwW2RpcmVjdGl2ZV0gfHwgW107XG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiB2YWx1ZXMpIHtcbiAgICAgIGNvbnN0IHVybCA9IHV0aWxzLmdldFNjaGVtZUZyZWVVcmwodmFsdWUpO1xuICAgICAgaWYgKHVybCA9PT0gJyonKSB7XG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICAgIFR5cGUuUExBSU5fV0lMRENBUkQsIGRpcmVjdGl2ZSArIGAgc2hvdWxkIG5vdCBhbGxvdyAnKicgYXMgc291cmNlYCxcbiAgICAgICAgICAgIFNldmVyaXR5LkhJR0gsIGRpcmVjdGl2ZSwgdmFsdWUpKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZpb2xhdGlvbnM7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIG9iamVjdC1zcmMgaXMgcmVzdHJpY3RlZCB0byBub25lIGVpdGhlciBkaXJlY3RseSBvciB2aWEgYVxuICogZGVmYXVsdC1zcmMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja01pc3NpbmdPYmplY3RTcmNEaXJlY3RpdmUocGFyc2VkQ3NwOiBDc3ApOiBGaW5kaW5nW10ge1xuICBsZXQgb2JqZWN0UmVzdHJpY3Rpb25zOiBzdHJpbmdbXXx1bmRlZmluZWQgPSBbXTtcbiAgaWYgKERpcmVjdGl2ZS5PQkpFQ1RfU1JDIGluIHBhcnNlZENzcCkge1xuICAgIG9iamVjdFJlc3RyaWN0aW9ucyA9IHBhcnNlZENzcFtEaXJlY3RpdmUuT0JKRUNUX1NSQ107XG4gIH0gZWxzZSBpZiAoRGlyZWN0aXZlLkRFRkFVTFRfU1JDIGluIHBhcnNlZENzcCkge1xuICAgIG9iamVjdFJlc3RyaWN0aW9ucyA9IHBhcnNlZENzcFtEaXJlY3RpdmUuREVGQVVMVF9TUkNdO1xuICB9XG4gIGlmIChvYmplY3RSZXN0cmljdGlvbnMgIT09IHVuZGVmaW5lZCAmJiBvYmplY3RSZXN0cmljdGlvbnMubGVuZ3RoID09PSAxICYmXG4gICAgICBvYmplY3RSZXN0cmljdGlvbnNbMF0gPT09IEtleXdvcmQuTk9ORSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICByZXR1cm4gW25ldyBGaW5kaW5nKFxuICAgICAgVHlwZS5NSVNTSU5HX0RJUkVDVElWRVMsXG4gICAgICBgTWlzc2luZyBvYmplY3Qtc3JjIGFsbG93cyB0aGUgaW5qZWN0aW9uIG9mIHBsdWdpbnMgd2hpY2ggY2FuIGV4ZWN1dGUgSmF2YVNjcmlwdC4gQ2FuIHlvdSBzZXQgaXQgdG8gJ25vbmUnP2AsXG4gICAgICBTZXZlcml0eS5ISUdILCBEaXJlY3RpdmUuT0JKRUNUX1NSQyldO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBzY3JpcHQtc3JjIGlzIHJlc3RyaWN0ZWQgZWl0aGVyIGRpcmVjdGx5IG9yIHZpYSBhIGRlZmF1bHQtc3JjLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tNaXNzaW5nU2NyaXB0U3JjRGlyZWN0aXZlKHBhcnNlZENzcDogQ3NwKTogRmluZGluZ1tdIHtcbiAgaWYgKERpcmVjdGl2ZS5TQ1JJUFRfU1JDIGluIHBhcnNlZENzcCB8fCBEaXJlY3RpdmUuREVGQVVMVF9TUkMgaW4gcGFyc2VkQ3NwKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHJldHVybiBbbmV3IEZpbmRpbmcoXG4gICAgICBUeXBlLk1JU1NJTkdfRElSRUNUSVZFUywgJ3NjcmlwdC1zcmMgZGlyZWN0aXZlIGlzIG1pc3NpbmcuJyxcbiAgICAgIFNldmVyaXR5LkhJR0gsIERpcmVjdGl2ZS5TQ1JJUFRfU1JDKV07XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBiYXNlLXVyaSBuZWVkcyB0byBiZSByZXN0cmljdGVkIGFuZCBpZiBzbywgd2hldGhlciBpdCBoYXMgYmVlblxuICogcmVzdHJpY3RlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrTWlzc2luZ0Jhc2VVcmlEaXJlY3RpdmUocGFyc2VkQ3NwOiBDc3ApOiBGaW5kaW5nW10ge1xuICByZXR1cm4gY2hlY2tNdWx0aXBsZU1pc3NpbmdCYXNlVXJpRGlyZWN0aXZlKFtwYXJzZWRDc3BdKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGJhc2UtdXJpIG5lZWRzIHRvIGJlIHJlc3RyaWN0ZWQgYW5kIGlmIHNvLCB3aGV0aGVyIGl0IGhhcyBiZWVuXG4gKiByZXN0cmljdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tNdWx0aXBsZU1pc3NpbmdCYXNlVXJpRGlyZWN0aXZlKHBhcnNlZENzcHM6IENzcFtdKTpcbiAgICBGaW5kaW5nW10ge1xuICAvLyBiYXNlLXVyaSBjYW4gYmUgdXNlZCB0byBieXBhc3Mgbm9uY2UgYmFzZWQgQ1NQcyBhbmQgaGFzaCBiYXNlZCBDU1BzIHRoYXRcbiAgLy8gdXNlIHN0cmljdCBkeW5hbWljXG4gIGNvbnN0IG5lZWRzQmFzZVVyaSA9IChjc3A6IENzcCkgPT5cbiAgICAgIChDc3AucG9saWN5SGFzU2NyaXB0Tm9uY2VzKGNzcCkgfHxcbiAgICAgICAoQ3NwLnBvbGljeUhhc1NjcmlwdEhhc2hlcyhjc3ApICYmIENzcC5wb2xpY3lIYXNTdHJpY3REeW5hbWljKGNzcCkpKTtcbiAgY29uc3QgaGFzQmFzZVVyaSA9IChjc3A6IENzcCkgPT4gRGlyZWN0aXZlLkJBU0VfVVJJIGluIGNzcDtcblxuICBpZiAocGFyc2VkQ3Nwcy5zb21lKG5lZWRzQmFzZVVyaSkgJiYgIXBhcnNlZENzcHMuc29tZShoYXNCYXNlVXJpKSkge1xuICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gJ01pc3NpbmcgYmFzZS11cmkgYWxsb3dzIHRoZSBpbmplY3Rpb24gb2YgYmFzZSB0YWdzLiAnICtcbiAgICAgICAgJ1RoZXkgY2FuIGJlIHVzZWQgdG8gc2V0IHRoZSBiYXNlIFVSTCBmb3IgYWxsIHJlbGF0aXZlIChzY3JpcHQpICcgK1xuICAgICAgICAnVVJMcyB0byBhbiBhdHRhY2tlciBjb250cm9sbGVkIGRvbWFpbi4gJyArXG4gICAgICAgIGBDYW4geW91IHNldCBpdCB0byAnbm9uZScgb3IgJ3NlbGYnP2A7XG4gICAgcmV0dXJuIFtuZXcgRmluZGluZyhcbiAgICAgICAgVHlwZS5NSVNTSU5HX0RJUkVDVElWRVMsIGRlc2NyaXB0aW9uLCBTZXZlcml0eS5ISUdILFxuICAgICAgICBEaXJlY3RpdmUuQkFTRV9VUkkpXTtcbiAgfVxuICByZXR1cm4gW107XG59XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgYWxsIG5lY2Vzc2FyeSBkaXJlY3RpdmVzIGZvciBwcmV2ZW50aW5nIFhTUyBhcmUgc2V0LlxuICogRmluZGluZ3Mgb2YgdGhpcyBjaGVjayBoYXZlIGEgaGlnaCBzZXZlcml0eSBhbmQgYXJlIEZQIGZyZWUuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyOlxuICogIHNjcmlwdC1zcmMgJ25vbmUnXG4gKlxuICogQHBhcmFtIHBhcnNlZENzcCBQYXJzZWQgQ1NQLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tNaXNzaW5nRGlyZWN0aXZlcyhwYXJzZWRDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIHJldHVybiBbXG4gICAgLi4uY2hlY2tNaXNzaW5nT2JqZWN0U3JjRGlyZWN0aXZlKHBhcnNlZENzcCksXG4gICAgLi4uY2hlY2tNaXNzaW5nU2NyaXB0U3JjRGlyZWN0aXZlKHBhcnNlZENzcCksXG4gICAgLi4uY2hlY2tNaXNzaW5nQmFzZVVyaURpcmVjdGl2ZShwYXJzZWRDc3ApLFxuICBdO1xufVxuXG5cbi8qKlxuICogQ2hlY2tzIGlmIHdoaXRlbGlzdGVkIG9yaWdpbnMgYXJlIGJ5cGFzc2FibGUgYnkgSlNPTlAvQW5ndWxhciBlbmRwb2ludHMuXG4gKiBIaWdoIHNldmVyaXR5IGZpbmRpbmdzIG9mIHRoaXMgY2hlY2sgYXJlIEZQIGZyZWUuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyOlxuICogIGRlZmF1bHQtc3JjICdub25lJzsgc2NyaXB0LXNyYyB3d3cuZ29vZ2xlLmNvbVxuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgUGFyc2VkIENTUC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrU2NyaXB0V2hpdGVsaXN0QnlwYXNzKHBhcnNlZENzcDogQ3NwKTogRmluZGluZ1tdIHtcbiAgY29uc3QgdmlvbGF0aW9uczogRmluZGluZ1tdID0gW107XG4gIGNvbnN0IGVmZmVjdGl2ZVNjcmlwdFNyY0RpcmVjdGl2ZSA9XG4gICAgICBjc3AuQ3NwLmdldEVmZmVjdGl2ZURpcmVjdGl2ZShwYXJzZWRDc3AsIERpcmVjdGl2ZS5TQ1JJUFRfU1JDKTtcbiAgY29uc3Qgc2NyaXB0U3JjVmFsdWVzID0gcGFyc2VkQ3NwW2VmZmVjdGl2ZVNjcmlwdFNyY0RpcmVjdGl2ZV0gfHwgW107XG4gIGlmIChzY3JpcHRTcmNWYWx1ZXMuaW5jbHVkZXMoS2V5d29yZC5OT05FKSkge1xuICAgIHJldHVybiB2aW9sYXRpb25zO1xuICB9XG5cbiAgZm9yIChjb25zdCB2YWx1ZSBvZiBzY3JpcHRTcmNWYWx1ZXMpIHtcbiAgICBpZiAodmFsdWUgPT09IEtleXdvcmQuU0VMRikge1xuICAgICAgdmlvbGF0aW9ucy5wdXNoKG5ldyBGaW5kaW5nKFxuICAgICAgICAgIFR5cGUuU0NSSVBUX1dISVRFTElTVF9CWVBBU1MsXG4gICAgICAgICAgYCdzZWxmJyBjYW4gYmUgcHJvYmxlbWF0aWMgaWYgeW91IGhvc3QgSlNPTlAsIEFuZ3VsYXIgb3IgdXNlciBgICtcbiAgICAgICAgICAgICAgJ3VwbG9hZGVkIGZpbGVzLicsXG4gICAgICAgICAgU2V2ZXJpdHkuTUVESVVNX01BWUJFLCBlZmZlY3RpdmVTY3JpcHRTcmNEaXJlY3RpdmUsIHZhbHVlKSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBJZ25vcmUga2V5d29yZHMsIG5vbmNlcyBhbmQgaGFzaGVzICh0aGV5IHN0YXJ0IHdpdGggYSBzaW5nbGUgcXVvdGUpLlxuICAgIGlmICh2YWx1ZS5zdGFydHNXaXRoKCdcXCcnKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gSWdub3JlIHN0YW5kYWxvbmUgc2NoZW1lcyBhbmQgdGhpbmdzIHRoYXQgZG9uJ3QgbG9vayBsaWtlIFVSTHMgKG5vIGRvdCkuXG4gICAgaWYgKGNzcC5pc1VybFNjaGVtZSh2YWx1ZSkgfHwgdmFsdWUuaW5kZXhPZignLicpID09PSAtMSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgdXJsID0gJy8vJyArIHV0aWxzLmdldFNjaGVtZUZyZWVVcmwodmFsdWUpO1xuXG4gICAgY29uc3QgYW5ndWxhckJ5cGFzcyA9IHV0aWxzLm1hdGNoV2lsZGNhcmRVcmxzKHVybCwgYW5ndWxhci5VUkxTKTtcblxuICAgIGxldCBqc29ucEJ5cGFzcyA9IHV0aWxzLm1hdGNoV2lsZGNhcmRVcmxzKHVybCwganNvbnAuVVJMUyk7XG5cbiAgICAvLyBTb21lIEpTT05QIGJ5cGFzc2VzIG9ubHkgd29yayBpbiBwcmVzZW5jZSBvZiB1bnNhZmUtZXZhbC5cbiAgICBpZiAoanNvbnBCeXBhc3MpIHtcbiAgICAgIGNvbnN0IGV2YWxSZXF1aXJlZCA9IGpzb25wLk5FRURTX0VWQUwuaW5jbHVkZXMoanNvbnBCeXBhc3MuaG9zdG5hbWUpO1xuICAgICAgY29uc3QgZXZhbFByZXNlbnQgPSBzY3JpcHRTcmNWYWx1ZXMuaW5jbHVkZXMoS2V5d29yZC5VTlNBRkVfRVZBTCk7XG4gICAgICBpZiAoZXZhbFJlcXVpcmVkICYmICFldmFsUHJlc2VudCkge1xuICAgICAgICBqc29ucEJ5cGFzcyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGpzb25wQnlwYXNzIHx8IGFuZ3VsYXJCeXBhc3MpIHtcbiAgICAgIGxldCBieXBhc3NEb21haW4gPSAnJztcbiAgICAgIGxldCBieXBhc3NUeHQgPSAnJztcbiAgICAgIGlmIChqc29ucEJ5cGFzcykge1xuICAgICAgICBieXBhc3NEb21haW4gPSBqc29ucEJ5cGFzcy5ob3N0bmFtZTtcbiAgICAgICAgYnlwYXNzVHh0ID0gJyBKU09OUCBlbmRwb2ludHMnO1xuICAgICAgfVxuICAgICAgaWYgKGFuZ3VsYXJCeXBhc3MpIHtcbiAgICAgICAgYnlwYXNzRG9tYWluID0gYW5ndWxhckJ5cGFzcy5ob3N0bmFtZTtcbiAgICAgICAgYnlwYXNzVHh0ICs9IChieXBhc3NUeHQudHJpbSgpID09PSAnJykgPyAnJyA6ICcgYW5kJztcbiAgICAgICAgYnlwYXNzVHh0ICs9ICcgQW5ndWxhciBsaWJyYXJpZXMnO1xuICAgICAgfVxuXG4gICAgICB2aW9sYXRpb25zLnB1c2gobmV3IEZpbmRpbmcoXG4gICAgICAgICAgVHlwZS5TQ1JJUFRfV0hJVEVMSVNUX0JZUEFTUyxcbiAgICAgICAgICBieXBhc3NEb21haW4gKyAnIGlzIGtub3duIHRvIGhvc3QnICsgYnlwYXNzVHh0ICtcbiAgICAgICAgICAgICAgJyB3aGljaCBhbGxvdyB0byBieXBhc3MgdGhpcyBDU1AuJyxcbiAgICAgICAgICBTZXZlcml0eS5ISUdILCBlZmZlY3RpdmVTY3JpcHRTcmNEaXJlY3RpdmUsIHZhbHVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZpb2xhdGlvbnMucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICBUeXBlLlNDUklQVF9XSElURUxJU1RfQllQQVNTLFxuICAgICAgICAgIGBObyBieXBhc3MgZm91bmQ7IG1ha2Ugc3VyZSB0aGF0IHRoaXMgVVJMIGRvZXNuJ3Qgc2VydmUgSlNPTlAgYCArXG4gICAgICAgICAgICAgICdyZXBsaWVzIG9yIEFuZ3VsYXIgbGlicmFyaWVzLicsXG4gICAgICAgICAgU2V2ZXJpdHkuTUVESVVNX01BWUJFLCBlZmZlY3RpdmVTY3JpcHRTcmNEaXJlY3RpdmUsIHZhbHVlKSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZpb2xhdGlvbnM7XG59XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgd2hpdGVsaXN0ZWQgb2JqZWN0LXNyYyBvcmlnaW5zIGFyZSBieXBhc3NhYmxlLlxuICogRmluZGluZ3Mgb2YgdGhpcyBjaGVjayBoYXZlIGEgaGlnaCBzZXZlcml0eSBhbmQgYXJlIEZQIGZyZWUuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyOlxuICogIGRlZmF1bHQtc3JjICdub25lJzsgb2JqZWN0LXNyYyBhamF4Lmdvb2dsZWFwaXMuY29tXG4gKlxuICogQHBhcmFtIHBhcnNlZENzcCBQYXJzZWQgQ1NQLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tGbGFzaE9iamVjdFdoaXRlbGlzdEJ5cGFzcyhwYXJzZWRDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIGNvbnN0IHZpb2xhdGlvbnMgPSBbXTtcbiAgY29uc3QgZWZmZWN0aXZlT2JqZWN0U3JjRGlyZWN0aXZlID1cbiAgICAgIGNzcC5Dc3AuZ2V0RWZmZWN0aXZlRGlyZWN0aXZlKHBhcnNlZENzcCwgRGlyZWN0aXZlLk9CSkVDVF9TUkMpO1xuICBjb25zdCBvYmplY3RTcmNWYWx1ZXMgPSBwYXJzZWRDc3BbZWZmZWN0aXZlT2JqZWN0U3JjRGlyZWN0aXZlXSB8fCBbXTtcblxuICAvLyBJZiBmbGFzaCBpcyBub3QgYWxsb3dlZCBpbiBwbHVnaW4tdHlwZXMsIGNvbnRpbnVlLlxuICBjb25zdCBwbHVnaW5UeXBlcyA9IHBhcnNlZENzcFtEaXJlY3RpdmUuUExVR0lOX1RZUEVTXTtcbiAgaWYgKHBsdWdpblR5cGVzICYmICFwbHVnaW5UeXBlcy5pbmNsdWRlcygnYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2gnKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGZvciAoY29uc3QgdmFsdWUgb2Ygb2JqZWN0U3JjVmFsdWVzKSB7XG4gICAgLy8gTm90aGluZyB0byBkbyBoZXJlIGlmICdub25lJy5cbiAgICBpZiAodmFsdWUgPT09IEtleXdvcmQuTk9ORSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IHVybCA9ICcvLycgKyB1dGlscy5nZXRTY2hlbWVGcmVlVXJsKHZhbHVlKTtcbiAgICBjb25zdCBmbGFzaEJ5cGFzcyA9IHV0aWxzLm1hdGNoV2lsZGNhcmRVcmxzKHVybCwgZmxhc2guVVJMUyk7XG5cbiAgICBpZiAoZmxhc2hCeXBhc3MpIHtcbiAgICAgIHZpb2xhdGlvbnMucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICBUeXBlLk9CSkVDVF9XSElURUxJU1RfQllQQVNTLFxuICAgICAgICAgIGZsYXNoQnlwYXNzLmhvc3RuYW1lICtcbiAgICAgICAgICAgICAgJyBpcyBrbm93biB0byBob3N0IEZsYXNoIGZpbGVzIHdoaWNoIGFsbG93IHRvIGJ5cGFzcyB0aGlzIENTUC4nLFxuICAgICAgICAgIFNldmVyaXR5LkhJR0gsIGVmZmVjdGl2ZU9iamVjdFNyY0RpcmVjdGl2ZSwgdmFsdWUpKTtcbiAgICB9IGVsc2UgaWYgKGVmZmVjdGl2ZU9iamVjdFNyY0RpcmVjdGl2ZSA9PT0gRGlyZWN0aXZlLk9CSkVDVF9TUkMpIHtcbiAgICAgIHZpb2xhdGlvbnMucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICBUeXBlLk9CSkVDVF9XSElURUxJU1RfQllQQVNTLFxuICAgICAgICAgIGBDYW4geW91IHJlc3RyaWN0IG9iamVjdC1zcmMgdG8gJ25vbmUnIG9ubHk/YCwgU2V2ZXJpdHkuTUVESVVNX01BWUJFLFxuICAgICAgICAgIGVmZmVjdGl2ZU9iamVjdFNyY0RpcmVjdGl2ZSwgdmFsdWUpKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmlvbGF0aW9ucztcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIHN0cmluZyBcImxvb2tzXCIgbGlrZSBhbiBJUCBhZGRyZXNzLiBUaGlzIGZ1bmN0aW9uXG4gKiBvbmx5IHVzZXMgYmFzaWMgaGV1cmlzdGljcyBhbmQgZG9lcyBub3QgYWNjZXB0IGFsbCB2YWxpZCBJUHMgbm9yIHJlamVjdCBhbGxcbiAqIGludmFsaWQgSVBzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9va3NMaWtlSXBBZGRyZXNzKG1heWJlSXA6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAobWF5YmVJcC5zdGFydHNXaXRoKCdbJykgJiYgbWF5YmVJcC5lbmRzV2l0aCgnXScpKSB7XG4gICAgLy8gTG9va3MgbGlrZSBhbiBJUHY2IGFkZHJlc3MgYW5kIG5vdCBhIGhvc3RuYW1lICh0aG91Z2ggaXQgbWF5IGJlIHNvbWVcbiAgICAvLyBub25zZW5zZSBsaWtlIGBbZm9vXWApXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKC9eWzAtOV17MSwzfVxcLlswLTldezEsM31cXC5bMC05XXsxLDN9XFwuWzAtOV17MSwzfSQvLnRlc3QobWF5YmVJcCkpIHtcbiAgICAvLyBMb29rcyBsaWtlIGFuIElQdjQgYWRkcmVzcyAodGhvdWdoIGl0IG1heSBiZSBzb21ldGhpbmcgbGlrZVxuICAgIC8vIGA1MDAuNjAwLjcwMC44MDBgXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgLy8gV29uJ3QgbWF0Y2ggSVAgYWRkcmVzc2VzIGVuY29kZWQgaW4gb3RoZXIgbWFubmVycyAoZWcgb2N0YWwgb3JcbiAgLy8gZGVjaW1hbClcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBjc3AgY29udGFpbnMgSVAgYWRkcmVzc2VzLlxuICogRmluZGluZ3Mgb2YgdGhpcyBjaGVjayBhcmUgaW5mb3JtYWwgb25seSBhbmQgYXJlIEZQIGZyZWUuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyOlxuICogIHNjcmlwdC1zcmMgMTI3LjAuMC4xXG4gKlxuICogQHBhcmFtIHBhcnNlZENzcCBQYXJzZWQgQ1NQLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tJcFNvdXJjZShwYXJzZWRDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIGNvbnN0IHZpb2xhdGlvbnM6IEZpbmRpbmdbXSA9IFtdO1xuXG4gIC8vIEZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBkaXJlY3RpdmUgdmFsdWVzIGNvbnRhaW4gSVAgYWRkcmVzc2VzLlxuICBjb25zdCBjaGVja0lwID0gKGRpcmVjdGl2ZTogc3RyaW5nLCBkaXJlY3RpdmVWYWx1ZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiBkaXJlY3RpdmVWYWx1ZXMpIHtcbiAgICAgIGNvbnN0IGhvc3QgPSB1dGlscy5nZXRIb3N0bmFtZSh2YWx1ZSk7XG4gICAgICBpZiAobG9va3NMaWtlSXBBZGRyZXNzKGhvc3QpKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGxvY2FsaG9zdC5cbiAgICAgICAgLy8gU2VlIDQuOCBpbiBodHRwczovL3d3dy53My5vcmcvVFIvQ1NQMi8jbWF0Y2gtc291cmNlLWV4cHJlc3Npb25cbiAgICAgICAgaWYgKGhvc3QgPT09ICcxMjcuMC4wLjEnKSB7XG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKG5ldyBGaW5kaW5nKFxuICAgICAgICAgICAgICBUeXBlLklQX1NPVVJDRSxcbiAgICAgICAgICAgICAgZGlyZWN0aXZlICsgJyBkaXJlY3RpdmUgYWxsb3dzIGxvY2FsaG9zdCBhcyBzb3VyY2UuICcgK1xuICAgICAgICAgICAgICAgICAgJ1BsZWFzZSBtYWtlIHN1cmUgdG8gcmVtb3ZlIHRoaXMgaW4gcHJvZHVjdGlvbiBlbnZpcm9ubWVudHMuJyxcbiAgICAgICAgICAgICAgU2V2ZXJpdHkuSU5GTywgZGlyZWN0aXZlLCB2YWx1ZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICAgICAgVHlwZS5JUF9TT1VSQ0UsXG4gICAgICAgICAgICAgIGRpcmVjdGl2ZSArICcgZGlyZWN0aXZlIGhhcyBhbiBJUC1BZGRyZXNzIGFzIHNvdXJjZTogJyArIGhvc3QgK1xuICAgICAgICAgICAgICAgICAgJyAod2lsbCBiZSBpZ25vcmVkIGJ5IGJyb3dzZXJzISkuICcsXG4gICAgICAgICAgICAgIFNldmVyaXR5LklORk8sIGRpcmVjdGl2ZSwgdmFsdWUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBBcHBseSBjaGVjayB0byB2YWx1ZXMgb2YgYWxsIGRpcmVjdGl2ZXMuXG4gIHV0aWxzLmFwcGx5Q2hlY2tGdW5rdGlvblRvRGlyZWN0aXZlcyhwYXJzZWRDc3AsIGNoZWNrSXApO1xuICByZXR1cm4gdmlvbGF0aW9ucztcbn1cblxuXG4vKipcbiAqIENoZWNrcyBpZiBjc3AgY29udGFpbnMgZGlyZWN0aXZlcyB0aGF0IGFyZSBkZXByZWNhdGVkIGluIENTUDMuXG4gKiBGaW5kaW5ncyBvZiB0aGlzIGNoZWNrIGFyZSBpbmZvcm1hbCBvbmx5IGFuZCBhcmUgRlAgZnJlZS5cbiAqXG4gKiBFeGFtcGxlIHBvbGljeSB3aGVyZSB0aGlzIGNoZWNrIHdvdWxkIHRyaWdnZXI6XG4gKiAgcmVwb3J0LXVyaSBmb28uYmFyL2NzcFxuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgUGFyc2VkIENTUC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrRGVwcmVjYXRlZERpcmVjdGl2ZShwYXJzZWRDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIGNvbnN0IHZpb2xhdGlvbnMgPSBbXTtcblxuICAvLyBNb3JlIGRldGFpbHM6IGh0dHBzOi8vd3d3LmNocm9tZXN0YXR1cy5jb20vZmVhdHVyZS81NzY5Mzc0MTQ1MTgzNzQ0XG4gIGlmIChEaXJlY3RpdmUuUkVGTEVDVEVEX1hTUyBpbiBwYXJzZWRDc3ApIHtcbiAgICB2aW9sYXRpb25zLnB1c2gobmV3IEZpbmRpbmcoXG4gICAgICAgIFR5cGUuREVQUkVDQVRFRF9ESVJFQ1RJVkUsXG4gICAgICAgICdyZWZsZWN0ZWQteHNzIGlzIGRlcHJlY2F0ZWQgc2luY2UgQ1NQMi4gJyArXG4gICAgICAgICAgICAnUGxlYXNlLCB1c2UgdGhlIFgtWFNTLVByb3RlY3Rpb24gaGVhZGVyIGluc3RlYWQuJyxcbiAgICAgICAgU2V2ZXJpdHkuSU5GTywgRGlyZWN0aXZlLlJFRkxFQ1RFRF9YU1MpKTtcbiAgfVxuXG4gIC8vIE1vcmUgZGV0YWlsczogaHR0cHM6Ly93d3cuY2hyb21lc3RhdHVzLmNvbS9mZWF0dXJlLzU2ODA4MDAzNzY4MTU2MTZcbiAgaWYgKERpcmVjdGl2ZS5SRUZFUlJFUiBpbiBwYXJzZWRDc3ApIHtcbiAgICB2aW9sYXRpb25zLnB1c2gobmV3IEZpbmRpbmcoXG4gICAgICAgIFR5cGUuREVQUkVDQVRFRF9ESVJFQ1RJVkUsXG4gICAgICAgICdyZWZlcnJlciBpcyBkZXByZWNhdGVkIHNpbmNlIENTUDIuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSwgdXNlIHRoZSBSZWZlcnJlci1Qb2xpY3kgaGVhZGVyIGluc3RlYWQuJyxcbiAgICAgICAgU2V2ZXJpdHkuSU5GTywgRGlyZWN0aXZlLlJFRkVSUkVSKSk7XG4gIH1cblxuICAvLyBNb3JlIGRldGFpbHM6IGh0dHBzOi8vZ2l0aHViLmNvbS93M2Mvd2ViYXBwc2VjLWNzcC9wdWxsLzMyN1xuICBpZiAoRGlyZWN0aXZlLkRJU09XTl9PUEVORVIgaW4gcGFyc2VkQ3NwKSB7XG4gICAgdmlvbGF0aW9ucy5wdXNoKG5ldyBGaW5kaW5nKFxuICAgICAgICBUeXBlLkRFUFJFQ0FURURfRElSRUNUSVZFLFxuICAgICAgICAnZGlzb3duLW9wZW5lciBpcyBkZXByZWNhdGVkIHNpbmNlIENTUDMuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSwgdXNlIHRoZSBDcm9zcyBPcmlnaW4gT3BlbmVyIFBvbGljeSBoZWFkZXIgaW5zdGVhZC4nLFxuICAgICAgICBTZXZlcml0eS5JTkZPLCBEaXJlY3RpdmUuRElTT1dOX09QRU5FUikpO1xuICB9XG4gIHJldHVybiB2aW9sYXRpb25zO1xufVxuXG5cbi8qKlxuICogQ2hlY2tzIGlmIGNzcCBub25jZSBpcyBhdCBsZWFzdCA4IGNoYXJhY3RlcnMgbG9uZy5cbiAqIEZpbmRpbmdzIG9mIHRoaXMgY2hlY2sgYXJlIG9mIG1lZGl1bSBzZXZlcml0eSBhbmQgYXJlIEZQIGZyZWUuXG4gKlxuICogRXhhbXBsZSBwb2xpY3kgd2hlcmUgdGhpcyBjaGVjayB3b3VsZCB0cmlnZ2VyOlxuICogIHNjcmlwdC1zcmMgJ25vbmNlLXNob3J0J1xuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgUGFyc2VkIENTUC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrTm9uY2VMZW5ndGgocGFyc2VkQ3NwOiBDc3ApOiBGaW5kaW5nW10ge1xuICBjb25zdCBub25jZVBhdHRlcm4gPSBuZXcgUmVnRXhwKCdeXFwnbm9uY2UtKC4rKVxcJyQnKTtcbiAgY29uc3QgdmlvbGF0aW9uczogRmluZGluZ1tdID0gW107XG5cbiAgdXRpbHMuYXBwbHlDaGVja0Z1bmt0aW9uVG9EaXJlY3RpdmVzKFxuICAgICAgcGFyc2VkQ3NwLCAoZGlyZWN0aXZlLCBkaXJlY3RpdmVWYWx1ZXMpID0+IHtcbiAgICAgICAgZm9yIChjb25zdCB2YWx1ZSBvZiBkaXJlY3RpdmVWYWx1ZXMpIHtcbiAgICAgICAgICBjb25zdCBtYXRjaCA9IHZhbHVlLm1hdGNoKG5vbmNlUGF0dGVybik7XG4gICAgICAgICAgaWYgKCFtYXRjaCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE5vdCBhIG5vbmNlLlxuXG4gICAgICAgICAgY29uc3Qgbm9uY2VWYWx1ZSA9IG1hdGNoWzFdO1xuICAgICAgICAgIGlmIChub25jZVZhbHVlLmxlbmd0aCA8IDgpIHtcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChuZXcgRmluZGluZyhcbiAgICAgICAgICAgICAgICBUeXBlLk5PTkNFX0xFTkdUSCxcbiAgICAgICAgICAgICAgICAnTm9uY2VzIHNob3VsZCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMgbG9uZy4nLCBTZXZlcml0eS5NRURJVU0sXG4gICAgICAgICAgICAgICAgZGlyZWN0aXZlLCB2YWx1ZSkpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghY3NwLmlzTm9uY2UodmFsdWUsIHRydWUpKSB7XG4gICAgICAgICAgICB2aW9sYXRpb25zLnB1c2gobmV3IEZpbmRpbmcoXG4gICAgICAgICAgICAgICAgVHlwZS5OT05DRV9MRU5HVEgsICdOb25jZXMgc2hvdWxkIG9ubHkgdXNlIHRoZSBiYXNlNjQgY2hhcnNldC4nLFxuICAgICAgICAgICAgICAgIFNldmVyaXR5LklORk8sIGRpcmVjdGl2ZSwgdmFsdWUpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIHJldHVybiB2aW9sYXRpb25zO1xufVxuXG5cbi8qKlxuICogQ2hlY2tzIGlmIENTUCBhbGxvd3Mgc291cmNpbmcgZnJvbSBodHRwOi8vXG4gKiBGaW5kaW5ncyBvZiB0aGlzIGNoZWNrIGFyZSBvZiBtZWRpdW0gc2V2ZXJpdHkgYW5kIGFyZSBGUCBmcmVlLlxuICpcbiAqIEV4YW1wbGUgcG9saWN5IHdoZXJlIHRoaXMgY2hlY2sgd291bGQgdHJpZ2dlcjpcbiAqICByZXBvcnQtdXJpIGh0dHA6Ly9mb28uYmFyL2NzcFxuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgUGFyc2VkIENTUC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrU3JjSHR0cChwYXJzZWRDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIGNvbnN0IHZpb2xhdGlvbnM6IEZpbmRpbmdbXSA9IFtdO1xuXG4gIHV0aWxzLmFwcGx5Q2hlY2tGdW5rdGlvblRvRGlyZWN0aXZlcyhcbiAgICAgIHBhcnNlZENzcCwgKGRpcmVjdGl2ZSwgZGlyZWN0aXZlVmFsdWVzKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgZGlyZWN0aXZlVmFsdWVzKSB7XG4gICAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBkaXJlY3RpdmUgPT09IERpcmVjdGl2ZS5SRVBPUlRfVVJJID9cbiAgICAgICAgICAgICAgJ1VzZSBIVFRQUyB0byBzZW5kIHZpb2xhdGlvbiByZXBvcnRzIHNlY3VyZWx5LicgOlxuICAgICAgICAgICAgICAnQWxsb3cgb25seSByZXNvdXJjZXMgZG93bmxvYWRlZCBvdmVyIEhUVFBTLic7XG4gICAgICAgICAgaWYgKHZhbHVlLnN0YXJ0c1dpdGgoJ2h0dHA6Ly8nKSkge1xuICAgICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKG5ldyBGaW5kaW5nKFxuICAgICAgICAgICAgICAgIFR5cGUuU1JDX0hUVFAsIGRlc2NyaXB0aW9uLCBTZXZlcml0eS5NRURJVU0sIGRpcmVjdGl2ZSwgdmFsdWUpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIHJldHVybiB2aW9sYXRpb25zO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgcG9saWN5IGhhcyBjb25maWd1cmVkIHJlcG9ydGluZyBpbiBhIHJvYnVzdCBtYW5uZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0hhc0NvbmZpZ3VyZWRSZXBvcnRpbmcocGFyc2VkQ3NwOiBDc3ApOiBGaW5kaW5nW10ge1xuICBjb25zdCByZXBvcnRVcmlWYWx1ZXM6IHN0cmluZ1tdID0gcGFyc2VkQ3NwW0RpcmVjdGl2ZS5SRVBPUlRfVVJJXSB8fCBbXTtcbiAgaWYgKHJlcG9ydFVyaVZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgcmVwb3J0VG9WYWx1ZXM6IHN0cmluZ1tdID0gcGFyc2VkQ3NwW0RpcmVjdGl2ZS5SRVBPUlRfVE9dIHx8IFtdO1xuICBpZiAocmVwb3J0VG9WYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBbbmV3IEZpbmRpbmcoXG4gICAgICAgIFR5cGUuUkVQT1JUX1RPX09OTFksXG4gICAgICAgIGBUaGlzIENTUCBwb2xpY3kgb25seSBwcm92aWRlcyBhIHJlcG9ydGluZyBkZXN0aW5hdGlvbiB2aWEgdGhlICdyZXBvcnQtdG8nIGRpcmVjdGl2ZS4gVGhpcyBkaXJlY3RpdmUgaXMgb25seSBzdXBwb3J0ZWQgaW4gQ2hyb21pdW0tYmFzZWQgYnJvd3NlcnMgc28gaXQgaXMgcmVjb21tZW5kZWQgdG8gYWxzbyB1c2UgYSAncmVwb3J0LXVyaScgZGlyZWN0aXZlLmAsXG4gICAgICAgIFNldmVyaXR5LklORk8sIERpcmVjdGl2ZS5SRVBPUlRfVE8pXTtcbiAgfVxuXG4gIHJldHVybiBbbmV3IEZpbmRpbmcoXG4gICAgICBUeXBlLlJFUE9SVElOR19ERVNUSU5BVElPTl9NSVNTSU5HLFxuICAgICAgJ1RoaXMgQ1NQIHBvbGljeSBkb2VzIG5vdCBjb25maWd1cmUgYSByZXBvcnRpbmcgZGVzdGluYXRpb24uIFRoaXMgbWFrZXMgaXQgZGlmZmljdWx0IHRvIG1haW50YWluIHRoZSBDU1AgcG9saWN5IG92ZXIgdGltZSBhbmQgbW9uaXRvciBmb3IgYW55IGJyZWFrYWdlcy4nLFxuICAgICAgU2V2ZXJpdHkuSU5GTywgRGlyZWN0aXZlLlJFUE9SVF9VUkkpXTtcbn1cbiJdfQ==
;return exports;});

//javascript/security/csp/csp_evaluator/checks/strictcsp_checks.closure.js
goog.loadModule(function(exports) {'use strict';/**
 *
 * @fileoverview Collection of "strict" CSP and backward compatibility checks.
 * A "strict" CSP is based on nonces or hashes and drops the whitelist.
 * These checks ensure that 'strict-dynamic' and a CSP nonce/hash are present.
 * Due to 'strict-dynamic' any whitelist will get dropped in CSP3.
 * The backward compatibility checks ensure that the strict nonce/hash based CSP
 * will be a no-op in older browsers by checking for presence of 'unsafe-inline'
 * (will be dropped in newer browsers if a nonce or hash is present) and for
 * prsensence of http: and https: url schemes (will be droped in the presence of
 * 'strict-dynamic' in newer browsers).
 *
 * Generated from: javascript/security/csp/csp_evaluator/checks/strictcsp_checks.ts
 * @author lwe\@google.com (Lukas Weichselbaum)
 *
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
goog.module('google3.javascript.security.csp.csp_evaluator.checks.strictcsp_checks');
var module = module || { id: 'javascript/security/csp/csp_evaluator/checks/strictcsp_checks.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
const tsickle_csp_1 = goog.requireType("google3.javascript.security.csp.csp_evaluator.csp");
const tsickle_finding_2 = goog.requireType("google3.javascript.security.csp.csp_evaluator.finding");
const csp = goog.require('google3.javascript.security.csp.csp_evaluator.csp');
const csp_1 = csp;
const finding_1 = goog.require('google3.javascript.security.csp.csp_evaluator.finding');
/**
 * Checks if 'strict-dynamic' is present.
 *
 * Example policy where this check would trigger:
 *  script-src foo.bar
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp A parsed csp.
 * @return {!Array<!tsickle_finding_2.Finding>}
 */
function checkStrictDynamic(parsedCsp) {
    /** @type {string} */
    const directiveName = csp.Csp.getEffectiveDirective(parsedCsp, csp.Directive.SCRIPT_SRC);
    /** @type {!Array<string>} */
    const values = parsedCsp[directiveName] || [];
    /** @type {boolean} */
    const schemeOrHostPresent = values.some((/**
     * @param {string} v
     * @return {boolean}
     */
    (v) => !v.startsWith('\'')));
    // Check if strict-dynamic is present in case a host/scheme whitelist is used.
    if (schemeOrHostPresent && !values.includes(csp_1.Keyword.STRICT_DYNAMIC)) {
        return [new finding_1.Finding(finding_1.Type.STRICT_DYNAMIC, 'Host whitelists can frequently be bypassed. Consider using ' +
                '\'strict-dynamic\' in combination with CSP nonces or hashes.', finding_1.Severity.STRICT_CSP, directiveName)];
    }
    return [];
}
exports.checkStrictDynamic = checkStrictDynamic;
/**
 * Checks if 'strict-dynamic' is only used together with a nonce or a hash.
 *
 * Example policy where this check would trigger:
 *  script-src 'strict-dynamic'
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp A parsed csp.
 * @return {!Array<!tsickle_finding_2.Finding>}
 */
function checkStrictDynamicNotStandalone(parsedCsp) {
    /** @type {string} */
    const directiveName = csp.Csp.getEffectiveDirective(parsedCsp, csp.Directive.SCRIPT_SRC);
    /** @type {!Array<string>} */
    const values = parsedCsp[directiveName] || [];
    if (values.includes(csp_1.Keyword.STRICT_DYNAMIC) &&
        (!csp.Csp.policyHasScriptNonces(parsedCsp) &&
            !csp.Csp.policyHasScriptHashes(parsedCsp))) {
        return [new finding_1.Finding(finding_1.Type.STRICT_DYNAMIC_NOT_STANDALONE, '\'strict-dynamic\' without a CSP nonce/hash will block all scripts.', finding_1.Severity.INFO, directiveName)];
    }
    return [];
}
exports.checkStrictDynamicNotStandalone = checkStrictDynamicNotStandalone;
/**
 * Checks if the policy has 'unsafe-inline' when a nonce or hash are present.
 * This will ensure backward compatibility to browser that don't support
 * CSP nonces or hasehs.
 *
 * Example policy where this check would trigger:
 *  script-src 'nonce-test'
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp A parsed csp.
 * @return {!Array<!tsickle_finding_2.Finding>}
 */
function checkUnsafeInlineFallback(parsedCsp) {
    if (!csp.Csp.policyHasScriptNonces(parsedCsp) &&
        !csp.Csp.policyHasScriptHashes(parsedCsp)) {
        return [];
    }
    /** @type {string} */
    const directiveName = csp.Csp.getEffectiveDirective(parsedCsp, csp.Directive.SCRIPT_SRC);
    /** @type {!Array<string>} */
    const values = parsedCsp[directiveName] || [];
    if (!values.includes(csp_1.Keyword.UNSAFE_INLINE)) {
        return [new finding_1.Finding(finding_1.Type.UNSAFE_INLINE_FALLBACK, 'Consider adding \'unsafe-inline\' (ignored by browsers supporting ' +
                'nonces/hashes) to be backward compatible with older browsers.', finding_1.Severity.STRICT_CSP, directiveName)];
    }
    return [];
}
exports.checkUnsafeInlineFallback = checkUnsafeInlineFallback;
/**
 * Checks if the policy has whitelist fallback (* or http: and https:) when a
 * 'strict-dynamic' is present.
 * This will ensure backward compatibility to browser that don't support
 * 'strict-dynamic'.
 *
 * Example policy where this check would trigger:
 *  script-src 'nonce-test' 'strict-dynamic'
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp A parsed csp.
 * @return {!Array<!tsickle_finding_2.Finding>}
 */
function checkWhitelistFallback(parsedCsp) {
    /** @type {string} */
    const directiveName = csp.Csp.getEffectiveDirective(parsedCsp, csp.Directive.SCRIPT_SRC);
    /** @type {!Array<string>} */
    const values = parsedCsp[directiveName] || [];
    if (!values.includes(csp_1.Keyword.STRICT_DYNAMIC)) {
        return [];
    }
    // Check if there's already a whitelist (url scheme or url)
    if (!values.some((/**
     * @param {string} v
     * @return {boolean}
     */
    (v) => ['http:', 'https:', '*'].includes(v) || v.includes('.')))) {
        return [new finding_1.Finding(finding_1.Type.WHITELIST_FALLBACK, 'Consider adding https: and http: url schemes (ignored by browsers ' +
                'supporting \'strict-dynamic\') to be backward compatible with older ' +
                'browsers.', finding_1.Severity.STRICT_CSP, directiveName)];
    }
    return [];
}
exports.checkWhitelistFallback = checkWhitelistFallback;
/**
 * Checks if the policy requires Trusted Types for scripts.
 *
 * I.e. the policy should have the following dirctive:
 *  require-trusted-types-for 'script'
 *
 * @param {!tsickle_csp_1.Csp} parsedCsp A parsed csp.
 * @return {!Array<!tsickle_finding_2.Finding>}
 */
function checkRequiresTrustedTypesForScripts(parsedCsp) {
    /** @type {string} */
    const directiveName = csp.Csp.getEffectiveDirective(parsedCsp, csp.Directive.REQUIRE_TRUSTED_TYPES_FOR);
    /** @type {!Array<string>} */
    const values = parsedCsp[directiveName] || [];
    if (!values.includes(csp.TrustedTypesSink.SCRIPT)) {
        return [new finding_1.Finding(finding_1.Type.REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS, 'Consider requiring Trusted Types for scripts to lock down DOM XSS ' +
                'injection sinks. You can do this by adding ' +
                '"require-trusted-types-for \'script\'" to your policy.', finding_1.Severity.INFO, csp.Directive.REQUIRE_TRUSTED_TYPES_FOR)];
    }
    return [];
}
exports.checkRequiresTrustedTypesForScripts = checkRequiresTrustedTypesForScripts;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaWN0Y3NwX2NoZWNrcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL2phdmFzY3JpcHQvc2VjdXJpdHkvY3NwL2NzcF9ldmFsdWF0b3IvY2hlY2tzL3N0cmljdGNzcF9jaGVja3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBNEJBLDhFQUF5RTtBQUN6RSxrQkFBMEY7QUFFMUYsd0ZBQW1EOzs7Ozs7Ozs7O0FBV25ELFNBQWdCLGtCQUFrQixDQUFDLFNBQWM7O1VBQ3pDLGFBQWEsR0FDZixHQUFHLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQzs7VUFDaEUsTUFBTSxHQUFhLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFOztVQUVqRCxtQkFBbUIsR0FBRyxNQUFNLENBQUMsSUFBSTs7OztJQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUM7SUFFbkUsOEVBQThFO0lBQzlFLElBQUksbUJBQW1CLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQU8sQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUNuRSxPQUFPLENBQUMsSUFBSSxpQkFBTyxDQUNmLGNBQUksQ0FBQyxjQUFjLEVBQ25CLDZEQUE2RDtnQkFDekQsOERBQThELEVBQ2xFLGtCQUFRLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7S0FDMUM7SUFFRCxPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUM7QUFqQkQsZ0RBaUJDOzs7Ozs7Ozs7O0FBV0QsU0FBZ0IsK0JBQStCLENBQUMsU0FBYzs7VUFDdEQsYUFBYSxHQUNmLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FB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QixDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQ2pELE9BQU8sQ0FBQyxJQUFJLGlCQUFPLENBQ2YsY0FBSSxDQUFDLGlDQUFpQyxFQUN0QyxvRUFBb0U7Z0JBQ2hFLDZDQUE2QztnQkFDN0Msd0RBQXdELEVBQzVELGtCQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO0tBQzlEO0lBRUQsT0FBTyxFQUFFLENBQUM7QUFDWixDQUFDO0FBZkQsa0ZBZUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQ29sbGVjdGlvbiBvZiBcInN0cmljdFwiIENTUCBhbmQgYmFja3dhcmQgY29tcGF0aWJpbGl0eSBjaGVja3MuXG4gKiBBIFwic3RyaWN0XCIgQ1NQIGlzIGJhc2VkIG9uIG5vbmNlcyBvciBoYXNoZXMgYW5kIGRyb3BzIHRoZSB3aGl0ZWxpc3QuXG4gKiBUaGVzZSBjaGVja3MgZW5zdXJlIHRoYXQgJ3N0cmljdC1keW5hbWljJyBhbmQgYSBDU1Agbm9uY2UvaGFzaCBhcmUgcHJlc2VudC5cbiAqIER1ZSB0byAnc3RyaWN0LWR5bmFtaWMnIGFueSB3aGl0ZWxpc3Qgd2lsbCBnZXQgZHJvcHBlZCBpbiBDU1AzLlxuICogVGhlIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgY2hlY2tzIGVuc3VyZSB0aGF0IHRoZSBzdHJpY3Qgbm9uY2UvaGFzaCBiYXNlZCBDU1BcbiAqIHdpbGwgYmUgYSBuby1vcCBpbiBvbGRlciBicm93c2VycyBieSBjaGVja2luZyBmb3IgcHJlc2VuY2Ugb2YgJ3Vuc2FmZS1pbmxpbmUnXG4gKiAod2lsbCBiZSBkcm9wcGVkIGluIG5ld2VyIGJyb3dzZXJzIGlmIGEgbm9uY2Ugb3IgaGFzaCBpcyBwcmVzZW50KSBhbmQgZm9yXG4gKiBwcnNlbnNlbmNlIG9mIGh0dHA6IGFuZCBodHRwczogdXJsIHNjaGVtZXMgKHdpbGwgYmUgZHJvcGVkIGluIHRoZSBwcmVzZW5jZSBvZlxuICogJ3N0cmljdC1keW5hbWljJyBpbiBuZXdlciBicm93c2VycykuXG4gKlxuICogQGF1dGhvciBsd2VAZ29vZ2xlLmNvbSAoTHVrYXMgV2VpY2hzZWxiYXVtKVxuICpcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgKiBhcyBjc3AgZnJvbSAnZ29vZ2xlMy9qYXZhc2NyaXB0L3NlY3VyaXR5L2NzcC9jc3BfZXZhbHVhdG9yL2NzcCc7XG5pbXBvcnQge0NzcCwgRGlyZWN0aXZlLCBLZXl3b3JkfSBmcm9tICdnb29nbGUzL2phdmFzY3JpcHQvc2VjdXJpdHkvY3NwL2NzcF9ldmFsdWF0b3IvY3NwJztcblxuaW1wb3J0IHtGaW5kaW5nLCBTZXZlcml0eSwgVHlwZX0gZnJvbSAnLi4vZmluZGluZyc7XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgJ3N0cmljdC1keW5hbWljJyBpcyBwcmVzZW50LlxuICpcbiAqIEV4YW1wbGUgcG9saWN5IHdoZXJlIHRoaXMgY2hlY2sgd291bGQgdHJpZ2dlcjpcbiAqICBzY3JpcHQtc3JjIGZvby5iYXJcbiAqXG4gKiBAcGFyYW0gcGFyc2VkQ3NwIEEgcGFyc2VkIGNzcC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrU3RyaWN0RHluYW1pYyhwYXJzZWRDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIGNvbnN0IGRpcmVjdGl2ZU5hbWUgPVxuICAgICAgY3NwLkNzcC5nZXRFZmZlY3RpdmVEaXJlY3RpdmUocGFyc2VkQ3NwLCBjc3AuRGlyZWN0aXZlLlNDUklQVF9TUkMpO1xuICBjb25zdCB2YWx1ZXM6IHN0cmluZ1tdID0gcGFyc2VkQ3NwW2RpcmVjdGl2ZU5hbWVdIHx8IFtdO1xuXG4gIGNvbnN0IHNjaGVtZU9ySG9zdFByZXNlbnQgPSB2YWx1ZXMuc29tZSgodikgPT4gIXYuc3RhcnRzV2l0aCgnXFwnJykpO1xuXG4gIC8vIENoZWNrIGlmIHN0cmljdC1keW5hbWljIGlzIHByZXNlbnQgaW4gY2FzZSBhIGhvc3Qvc2NoZW1lIHdoaXRlbGlzdCBpcyB1c2VkLlxuICBpZiAoc2NoZW1lT3JIb3N0UHJlc2VudCAmJiAhdmFsdWVzLmluY2x1ZGVzKEtleXdvcmQuU1RSSUNUX0RZTkFNSUMpKSB7XG4gICAgcmV0dXJuIFtuZXcgRmluZGluZyhcbiAgICAgICAgVHlwZS5TVFJJQ1RfRFlOQU1JQyxcbiAgICAgICAgJ0hvc3Qgd2hpdGVsaXN0cyBjYW4gZnJlcXVlbnRseSBiZSBieXBhc3NlZC4gQ29uc2lkZXIgdXNpbmcgJyArXG4gICAgICAgICAgICAnXFwnc3RyaWN0LWR5bmFtaWNcXCcgaW4gY29tYmluYXRpb24gd2l0aCBDU1Agbm9uY2VzIG9yIGhhc2hlcy4nLFxuICAgICAgICBTZXZlcml0eS5TVFJJQ1RfQ1NQLCBkaXJlY3RpdmVOYW1lKV07XG4gIH1cblxuICByZXR1cm4gW107XG59XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgJ3N0cmljdC1keW5hbWljJyBpcyBvbmx5IHVzZWQgdG9nZXRoZXIgd2l0aCBhIG5vbmNlIG9yIGEgaGFzaC5cbiAqXG4gKiBFeGFtcGxlIHBvbGljeSB3aGVyZSB0aGlzIGNoZWNrIHdvdWxkIHRyaWdnZXI6XG4gKiAgc2NyaXB0LXNyYyAnc3RyaWN0LWR5bmFtaWMnXG4gKlxuICogQHBhcmFtIHBhcnNlZENzcCBBIHBhcnNlZCBjc3AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja1N0cmljdER5bmFtaWNOb3RTdGFuZGFsb25lKHBhcnNlZENzcDogQ3NwKTogRmluZGluZ1tdIHtcbiAgY29uc3QgZGlyZWN0aXZlTmFtZSA9XG4gICAgICBjc3AuQ3NwLmdldEVmZmVjdGl2ZURpcmVjdGl2ZShwYXJzZWRDc3AsIGNzcC5EaXJlY3RpdmUuU0NSSVBUX1NSQyk7XG4gIGNvbnN0IHZhbHVlczogc3RyaW5nW10gPSBwYXJzZWRDc3BbZGlyZWN0aXZlTmFtZV0gfHwgW107XG5cbiAgaWYgKHZhbHVlcy5pbmNsdWRlcyhLZXl3b3JkLlNUUklDVF9EWU5BTUlDKSAmJlxuICAgICAgKCFjc3AuQ3NwLnBvbGljeUhhc1NjcmlwdE5vbmNlcyhwYXJzZWRDc3ApICYmXG4gICAgICAgIWNzcC5Dc3AucG9saWN5SGFzU2NyaXB0SGFzaGVzKHBhcnNlZENzcCkpKSB7XG4gICAgcmV0dXJuIFtuZXcgRmluZGluZyhcbiAgICAgICAgVHlwZS5TVFJJQ1RfRFlOQU1JQ19OT1RfU1RBTkRBTE9ORSxcbiAgICAgICAgJ1xcJ3N0cmljdC1keW5hbWljXFwnIHdpdGhvdXQgYSBDU1Agbm9uY2UvaGFzaCB3aWxsIGJsb2NrIGFsbCBzY3JpcHRzLicsXG4gICAgICAgIFNldmVyaXR5LklORk8sIGRpcmVjdGl2ZU5hbWUpXTtcbiAgfVxuXG4gIHJldHVybiBbXTtcbn1cblxuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgcG9saWN5IGhhcyAndW5zYWZlLWlubGluZScgd2hlbiBhIG5vbmNlIG9yIGhhc2ggYXJlIHByZXNlbnQuXG4gKiBUaGlzIHdpbGwgZW5zdXJlIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgdG8gYnJvd3NlciB0aGF0IGRvbid0IHN1cHBvcnRcbiAqIENTUCBub25jZXMgb3IgaGFzZWhzLlxuICpcbiAqIEV4YW1wbGUgcG9saWN5IHdoZXJlIHRoaXMgY2hlY2sgd291bGQgdHJpZ2dlcjpcbiAqICBzY3JpcHQtc3JjICdub25jZS10ZXN0J1xuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgQSBwYXJzZWQgY3NwLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tVbnNhZmVJbmxpbmVGYWxsYmFjayhwYXJzZWRDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIGlmICghY3NwLkNzcC5wb2xpY3lIYXNTY3JpcHROb25jZXMocGFyc2VkQ3NwKSAmJlxuICAgICAgIWNzcC5Dc3AucG9saWN5SGFzU2NyaXB0SGFzaGVzKHBhcnNlZENzcCkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBkaXJlY3RpdmVOYW1lID1cbiAgICAgIGNzcC5Dc3AuZ2V0RWZmZWN0aXZlRGlyZWN0aXZlKHBhcnNlZENzcCwgY3NwLkRpcmVjdGl2ZS5TQ1JJUFRfU1JDKTtcbiAgY29uc3QgdmFsdWVzOiBzdHJpbmdbXSA9IHBhcnNlZENzcFtkaXJlY3RpdmVOYW1lXSB8fCBbXTtcblxuICBpZiAoIXZhbHVlcy5pbmNsdWRlcyhLZXl3b3JkLlVOU0FGRV9JTkxJTkUpKSB7XG4gICAgcmV0dXJuIFtuZXcgRmluZGluZyhcbiAgICAgICAgVHlwZS5VTlNBRkVfSU5MSU5FX0ZBTExCQUNLLFxuICAgICAgICAnQ29uc2lkZXIgYWRkaW5nIFxcJ3Vuc2FmZS1pbmxpbmVcXCcgKGlnbm9yZWQgYnkgYnJvd3NlcnMgc3VwcG9ydGluZyAnICtcbiAgICAgICAgICAgICdub25jZXMvaGFzaGVzKSB0byBiZSBiYWNrd2FyZCBjb21wYXRpYmxlIHdpdGggb2xkZXIgYnJvd3NlcnMuJyxcbiAgICAgICAgU2V2ZXJpdHkuU1RSSUNUX0NTUCwgZGlyZWN0aXZlTmFtZSldO1xuICB9XG5cbiAgcmV0dXJuIFtdO1xufVxuXG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBwb2xpY3kgaGFzIHdoaXRlbGlzdCBmYWxsYmFjayAoKiBvciBodHRwOiBhbmQgaHR0cHM6KSB3aGVuIGFcbiAqICdzdHJpY3QtZHluYW1pYycgaXMgcHJlc2VudC5cbiAqIFRoaXMgd2lsbCBlbnN1cmUgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB0byBicm93c2VyIHRoYXQgZG9uJ3Qgc3VwcG9ydFxuICogJ3N0cmljdC1keW5hbWljJy5cbiAqXG4gKiBFeGFtcGxlIHBvbGljeSB3aGVyZSB0aGlzIGNoZWNrIHdvdWxkIHRyaWdnZXI6XG4gKiAgc2NyaXB0LXNyYyAnbm9uY2UtdGVzdCcgJ3N0cmljdC1keW5hbWljJ1xuICpcbiAqIEBwYXJhbSBwYXJzZWRDc3AgQSBwYXJzZWQgY3NwLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tXaGl0ZWxpc3RGYWxsYmFjayhwYXJzZWRDc3A6IENzcCk6IEZpbmRpbmdbXSB7XG4gIGNvbnN0IGRpcmVjdGl2ZU5hbWUgPVxuICAgICAgY3NwLkNzcC5nZXRFZmZlY3RpdmVEaXJlY3RpdmUocGFyc2VkQ3NwLCBjc3AuRGlyZWN0aXZlLlNDUklQVF9TUkMpO1xuICBjb25zdCB2YWx1ZXM6IHN0cmluZ1tdID0gcGFyc2VkQ3NwW2RpcmVjdGl2ZU5hbWVdIHx8IFtdO1xuXG4gIGlmICghdmFsdWVzLmluY2x1ZGVzKEtleXdvcmQuU1RSSUNUX0RZTkFNSUMpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgLy8gQ2hlY2sgaWYgdGhlcmUncyBhbHJlYWR5IGEgd2hpdGVsaXN0ICh1cmwgc2NoZW1lIG9yIHVybClcbiAgaWYgKCF2YWx1ZXMuc29tZShcbiAgICAgICAgICAodikgPT4gWydodHRwOicsICdodHRwczonLCAnKiddLmluY2x1ZGVzKHYpIHx8IHYuaW5jbHVkZXMoJy4nKSkpIHtcbiAgICByZXR1cm4gW25ldyBGaW5kaW5nKFxuICAgICAgICBUeXBlLldISVRFTElTVF9GQUxMQkFDSyxcbiAgICAgICAgJ0NvbnNpZGVyIGFkZGluZyBodHRwczogYW5kIGh0dHA6IHVybCBzY2hlbWVzIChpZ25vcmVkIGJ5IGJyb3dzZXJzICcgK1xuICAgICAgICAgICAgJ3N1cHBvcnRpbmcgXFwnc3RyaWN0LWR5bmFtaWNcXCcpIHRvIGJlIGJhY2t3YXJkIGNvbXBhdGlibGUgd2l0aCBvbGRlciAnICtcbiAgICAgICAgICAgICdicm93c2Vycy4nLFxuICAgICAgICBTZXZlcml0eS5TVFJJQ1RfQ1NQLCBkaXJlY3RpdmVOYW1lKV07XG4gIH1cblxuICByZXR1cm4gW107XG59XG5cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIHBvbGljeSByZXF1aXJlcyBUcnVzdGVkIFR5cGVzIGZvciBzY3JpcHRzLlxuICpcbiAqIEkuZS4gdGhlIHBvbGljeSBzaG91bGQgaGF2ZSB0aGUgZm9sbG93aW5nIGRpcmN0aXZlOlxuICogIHJlcXVpcmUtdHJ1c3RlZC10eXBlcy1mb3IgJ3NjcmlwdCdcbiAqXG4gKiBAcGFyYW0gcGFyc2VkQ3NwIEEgcGFyc2VkIGNzcC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrUmVxdWlyZXNUcnVzdGVkVHlwZXNGb3JTY3JpcHRzKHBhcnNlZENzcDogQ3NwKTogRmluZGluZ1tdIHtcbiAgY29uc3QgZGlyZWN0aXZlTmFtZSA9IGNzcC5Dc3AuZ2V0RWZmZWN0aXZlRGlyZWN0aXZlKFxuICAgICAgcGFyc2VkQ3NwLCBjc3AuRGlyZWN0aXZlLlJFUVVJUkVfVFJVU1RFRF9UWVBFU19GT1IpO1xuICBjb25zdCB2YWx1ZXM6IHN0cmluZ1tdID0gcGFyc2VkQ3NwW2RpcmVjdGl2ZU5hbWVdIHx8IFtdO1xuXG4gIGlmICghdmFsdWVzLmluY2x1ZGVzKGNzcC5UcnVzdGVkVHlwZXNTaW5rLlNDUklQVCkpIHtcbiAgICByZXR1cm4gW25ldyBGaW5kaW5nKFxuICAgICAgICBUeXBlLlJFUVVJUkVfVFJVU1RFRF9UWVBFU19GT1JfU0NSSVBUUyxcbiAgICAgICAgJ0NvbnNpZGVyIHJlcXVpcmluZyBUcnVzdGVkIFR5cGVzIGZvciBzY3JpcHRzIHRvIGxvY2sgZG93biBET00gWFNTICcgK1xuICAgICAgICAgICAgJ2luamVjdGlvbiBzaW5rcy4gWW91IGNhbiBkbyB0aGlzIGJ5IGFkZGluZyAnICtcbiAgICAgICAgICAgICdcInJlcXVpcmUtdHJ1c3RlZC10eXBlcy1mb3IgXFwnc2NyaXB0XFwnXCIgdG8geW91ciBwb2xpY3kuJyxcbiAgICAgICAgU2V2ZXJpdHkuSU5GTywgY3NwLkRpcmVjdGl2ZS5SRVFVSVJFX1RSVVNURURfVFlQRVNfRk9SKV07XG4gIH1cblxuICByZXR1cm4gW107XG59XG4iXX0=
;return exports;});

//javascript/security/csp/csp_evaluator/evaluator.closure.js
goog.loadModule(function(exports) {'use strict';/**
 * @fileoverview added by tsickle
 * Generated from: javascript/security/csp/csp_evaluator/evaluator.ts
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
goog.module('google3.javascript.security.csp.csp_evaluator.evaluator');
var module = module || { id: 'javascript/security/csp/csp_evaluator/evaluator.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
const tsickle_csp_1 = goog.requireType("google3.javascript.security.csp.csp_evaluator.csp");
const tsickle_checker_2 = goog.requireType("google3.javascript.security.csp.csp_evaluator.checks.checker");
const tsickle_parser_checks_3 = goog.requireType("google3.javascript.security.csp.csp_evaluator.checks.parser_checks");
const tsickle_security_checks_4 = goog.requireType("google3.javascript.security.csp.csp_evaluator.checks.security_checks");
const tsickle_strictcsp_checks_5 = goog.requireType("google3.javascript.security.csp.csp_evaluator.checks.strictcsp_checks");
const tsickle_finding_6 = goog.requireType("google3.javascript.security.csp.csp_evaluator.finding");
/**
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const csp = goog.require('google3.javascript.security.csp.csp_evaluator.csp');
const parserChecks = goog.require('google3.javascript.security.csp.csp_evaluator.checks.parser_checks');
const securityChecks = goog.require('google3.javascript.security.csp.csp_evaluator.checks.security_checks');
const strictcspChecks = goog.require('google3.javascript.security.csp.csp_evaluator.checks.strictcsp_checks');
/**
 * A class to hold a CSP Evaluator.
 * Evaluates a parsed CSP and reports security findings.
 * @unrestricted
 */
class CspEvaluator {
    /**
     * @param {!tsickle_csp_1.Csp} parsedCsp A parsed Content Security Policy.
     * @param {(undefined|!tsickle_csp_1.Version)=} cspVersion CSP version to apply checks for.
     */
    constructor(parsedCsp, cspVersion) {
        /**
         * List of findings reported by checks.
         *
         */
        this.findings = [];
        /**
         * CSP version.
         */
        this.version = cspVersion || csp.Version.CSP3;
        /**
         * Parsed CSP.
         */
        this.csp = parsedCsp;
    }
    /**
     * Evaluates a parsed CSP against a set of checks
     * @export
     * @param {(undefined|!Array<function(!tsickle_csp_1.Csp): !Array<!tsickle_finding_6.Finding>>)=} parsedCspChecks list of checks to run on the parsed CSP (i.e.
     *     checks like backward compatibility checks, which are independent of the
     *     actual CSP version).
     * @param {(undefined|!Array<function(!tsickle_csp_1.Csp): !Array<!tsickle_finding_6.Finding>>)=} effectiveCspChecks list of checks to run on the effective CSP.
     * @return {!Array<!tsickle_finding_6.Finding>} List of Findings.
     */
    evaluate(parsedCspChecks, effectiveCspChecks) {
        this.findings = [];
        /** @type {!Array<function(!tsickle_csp_1.Csp): !Array<!tsickle_finding_6.Finding>>} */
        const checks = effectiveCspChecks || exports.DEFAULT_CHECKS;
        // We're applying checks on the policy as it would be seen by a browser
        // supporting a specific version of CSP.
        // For example a browser supporting only CSP1 will ignore nonces and
        // therefore 'unsafe-inline' would not get ignored if a policy has nonces.
        /** @type {!tsickle_csp_1.Csp} */
        const effectiveCsp = csp.Csp.getEffectiveCsp(this.csp, this.version, this.findings);
        // Checks independent of CSP version.
        if (parsedCspChecks) {
            for (const check of parsedCspChecks) {
                this.findings = this.findings.concat(check(this.csp));
            }
        }
        // Checks depenent on CSP version.
        for (const check of checks) {
            this.findings = this.findings.concat(check(effectiveCsp));
        }
        return this.findings;
    }
}
exports.CspEvaluator = CspEvaluator;
/* istanbul ignore if */
if (false) {
    /** @type {!tsickle_csp_1.Version} */
    CspEvaluator.prototype.version;
    /** @type {!tsickle_csp_1.Csp} */
    CspEvaluator.prototype.csp;
    /**
     * List of findings reported by checks.
     *
     * @type {!Array<!tsickle_finding_6.Finding>}
     */
    CspEvaluator.prototype.findings;
}
/**
 * Set of default checks to run.
 * @type {!Array<function(!tsickle_csp_1.Csp): !Array<!tsickle_finding_6.Finding>>}
 */
exports.DEFAULT_CHECKS = [
    securityChecks.checkScriptUnsafeInline, securityChecks.checkScriptUnsafeEval,
    securityChecks.checkPlainUrlSchemes, securityChecks.checkWildcards,
    securityChecks.checkMissingDirectives,
    securityChecks.checkScriptWhitelistBypass,
    securityChecks.checkFlashObjectWhitelistBypass, securityChecks.checkIpSource,
    securityChecks.checkNonceLength, securityChecks.checkSrcHttp,
    securityChecks.checkDeprecatedDirective, parserChecks.checkUnknownDirective,
    parserChecks.checkMissingSemicolon, parserChecks.checkInvalidKeyword
];
/**
 * Strict CSP and backward compatibility checks.
 * @type {!Array<function(!tsickle_csp_1.Csp): !Array<!tsickle_finding_6.Finding>>}
 */
exports.STRICTCSP_CHECKS = [
    strictcspChecks.checkStrictDynamic,
    strictcspChecks.checkStrictDynamicNotStandalone,
    strictcspChecks.checkUnsafeInlineFallback,
    strictcspChecks.checkWhitelistFallback,
    strictcspChecks.checkRequiresTrustedTypesForScripts
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZhbHVhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vamF2YXNjcmlwdC9zZWN1cml0eS9jc3AvY3NwX2V2YWx1YXRvci9ldmFsdWF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQSw4RUFBeUU7QUFJekUsd0dBQXVEO0FBQ3ZELDRHQUEyRDtBQUMzRCw4R0FBNkQ7Ozs7OztBQVU3RCxNQUFhLFlBQVk7Ozs7O0lBYXZCLFlBQVksU0FBYyxFQUFFLFVBQW9COzs7OztRQUxoRCxhQUFRLEdBQWMsRUFBRSxDQUFDO1FBTXZCOztXQUVHO1FBQ0gsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFFOUM7O1dBRUc7UUFDSCxJQUFJLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQztJQUN2QixDQUFDOzs7Ozs7Ozs7O0lBV0QsUUFBUSxDQUNKLGVBQW1DLEVBQ25DLGtCQUFzQztRQUN4QyxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQzs7Y0FDYixNQUFNLEdBQUcsa0JBQWtCLElBQUksc0JBQWM7Ozs7OztjQU03QyxZQUFZLEdBQ2QsR0FBRyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUM7UUFFbEUscUNBQXFDO1FBQ3JDLElBQUksZUFBZSxFQUFFO1lBQ25CLEtBQUssTUFBTSxLQUFLLElBQUksZUFBZSxFQUFFO2dCQUNuQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUN2RDtTQUNGO1FBRUQsa0NBQWtDO1FBQ2xDLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1lBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7U0FDM0Q7UUFFRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdkIsQ0FBQztDQUNGO0FBN0RELG9DQTZEQzs7OztJQTVEQywrQkFBaUI7O0lBQ2pCLDJCQUFTOzs7Ozs7SUFNVCxnQ0FBeUI7Ozs7OztBQTJEZCxRQUFBLGNBQWMsR0FBc0I7SUFDL0MsY0FBYyxDQUFDLHVCQUF1QixFQUFFLGNBQWMsQ0FBQyxxQkFBcUI7SUFDNUUsY0FBYyxDQUFDLG9CQUFvQixFQUFFLGNBQWMsQ0FBQyxjQUFjO0lBQ2xFLGNBQWMsQ0FBQyxzQkFBc0I7SUFDckMsY0FBYyxDQUFDLDBCQUEwQjtJQUN6QyxjQUFjLENBQUMsK0JBQStCLEVBQUUsY0FBYyxDQUFDLGFBQWE7SUFDNUUsY0FBYyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsQ0FBQyxZQUFZO0lBQzVELGNBQWMsQ0FBQyx3QkFBd0IsRUFBRSxZQUFZLENBQUMscUJBQXFCO0lBQzNFLFlBQVksQ0FBQyxxQkFBcUIsRUFBRSxZQUFZLENBQUMsbUJBQW1CO0NBQ3JFOzs7OztBQU1ZLFFBQUEsZ0JBQWdCLEdBQXNCO0lBQ2pELGVBQWUsQ0FBQyxrQkFBa0I7SUFDbEMsZUFBZSxDQUFDLCtCQUErQjtJQUMvQyxlQUFlLENBQUMseUJBQXlCO0lBQ3pDLGVBQWUsQ0FBQyxzQkFBc0I7SUFDdEMsZUFBZSxDQUFDLG1DQUFtQztDQUNwRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGF1dGhvciBsd2VAZ29vZ2xlLmNvbSAoTHVrYXMgV2VpY2hzZWxiYXVtKVxuICpcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgKiBhcyBjc3AgZnJvbSAnZ29vZ2xlMy9qYXZhc2NyaXB0L3NlY3VyaXR5L2NzcC9jc3BfZXZhbHVhdG9yL2NzcCc7XG5pbXBvcnQge0NzcCwgVmVyc2lvbn0gZnJvbSAnZ29vZ2xlMy9qYXZhc2NyaXB0L3NlY3VyaXR5L2NzcC9jc3BfZXZhbHVhdG9yL2NzcCc7XG5cbmltcG9ydCB7Q2hlY2tlckZ1bmN0aW9ufSBmcm9tICcuL2NoZWNrcy9jaGVja2VyJztcbmltcG9ydCAqIGFzIHBhcnNlckNoZWNrcyBmcm9tICcuL2NoZWNrcy9wYXJzZXJfY2hlY2tzJztcbmltcG9ydCAqIGFzIHNlY3VyaXR5Q2hlY2tzIGZyb20gJy4vY2hlY2tzL3NlY3VyaXR5X2NoZWNrcyc7XG5pbXBvcnQgKiBhcyBzdHJpY3Rjc3BDaGVja3MgZnJvbSAnLi9jaGVja3Mvc3RyaWN0Y3NwX2NoZWNrcyc7XG5pbXBvcnQge0ZpbmRpbmcsIFNldmVyaXR5LCBUeXBlfSBmcm9tICcuL2ZpbmRpbmcnO1xuXG5cblxuLyoqXG4gKiBBIGNsYXNzIHRvIGhvbGQgYSBDU1AgRXZhbHVhdG9yLlxuICogRXZhbHVhdGVzIGEgcGFyc2VkIENTUCBhbmQgcmVwb3J0cyBzZWN1cml0eSBmaW5kaW5ncy5cbiAqIEB1bnJlc3RyaWN0ZWRcbiAqL1xuZXhwb3J0IGNsYXNzIENzcEV2YWx1YXRvciB7XG4gIHZlcnNpb246IFZlcnNpb247XG4gIGNzcDogQ3NwO1xuXG4gIC8qKlxuICAgKiBMaXN0IG9mIGZpbmRpbmdzIHJlcG9ydGVkIGJ5IGNoZWNrcy5cbiAgICpcbiAgICovXG4gIGZpbmRpbmdzOiBGaW5kaW5nW10gPSBbXTtcbiAgLyoqXG4gICAqIEBwYXJhbSBwYXJzZWRDc3AgQSBwYXJzZWQgQ29udGVudCBTZWN1cml0eSBQb2xpY3kuXG4gICAqIEBwYXJhbSBjc3BWZXJzaW9uIENTUCB2ZXJzaW9uIHRvIGFwcGx5IGNoZWNrcyBmb3IuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihwYXJzZWRDc3A6IENzcCwgY3NwVmVyc2lvbj86IFZlcnNpb24pIHtcbiAgICAvKipcbiAgICAgKiBDU1AgdmVyc2lvbi5cbiAgICAgKi9cbiAgICB0aGlzLnZlcnNpb24gPSBjc3BWZXJzaW9uIHx8IGNzcC5WZXJzaW9uLkNTUDM7XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZWQgQ1NQLlxuICAgICAqL1xuICAgIHRoaXMuY3NwID0gcGFyc2VkQ3NwO1xuICB9XG5cbiAgLyoqXG4gICAqIEV2YWx1YXRlcyBhIHBhcnNlZCBDU1AgYWdhaW5zdCBhIHNldCBvZiBjaGVja3NcbiAgICogQHBhcmFtIHBhcnNlZENzcENoZWNrcyBsaXN0IG9mIGNoZWNrcyB0byBydW4gb24gdGhlIHBhcnNlZCBDU1AgKGkuZS5cbiAgICogICAgIGNoZWNrcyBsaWtlIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgY2hlY2tzLCB3aGljaCBhcmUgaW5kZXBlbmRlbnQgb2YgdGhlXG4gICAqICAgICBhY3R1YWwgQ1NQIHZlcnNpb24pLlxuICAgKiBAcGFyYW0gZWZmZWN0aXZlQ3NwQ2hlY2tzIGxpc3Qgb2YgY2hlY2tzIHRvIHJ1biBvbiB0aGUgZWZmZWN0aXZlIENTUC5cbiAgICogQHJldHVybiBMaXN0IG9mIEZpbmRpbmdzLlxuICAgKiBAZXhwb3J0XG4gICAqL1xuICBldmFsdWF0ZShcbiAgICAgIHBhcnNlZENzcENoZWNrcz86IENoZWNrZXJGdW5jdGlvbltdLFxuICAgICAgZWZmZWN0aXZlQ3NwQ2hlY2tzPzogQ2hlY2tlckZ1bmN0aW9uW10pOiBGaW5kaW5nW10ge1xuICAgIHRoaXMuZmluZGluZ3MgPSBbXTtcbiAgICBjb25zdCBjaGVja3MgPSBlZmZlY3RpdmVDc3BDaGVja3MgfHwgREVGQVVMVF9DSEVDS1M7XG5cbiAgICAvLyBXZSdyZSBhcHBseWluZyBjaGVja3Mgb24gdGhlIHBvbGljeSBhcyBpdCB3b3VsZCBiZSBzZWVuIGJ5IGEgYnJvd3NlclxuICAgIC8vIHN1cHBvcnRpbmcgYSBzcGVjaWZpYyB2ZXJzaW9uIG9mIENTUC5cbiAgICAvLyBGb3IgZXhhbXBsZSBhIGJyb3dzZXIgc3VwcG9ydGluZyBvbmx5IENTUDEgd2lsbCBpZ25vcmUgbm9uY2VzIGFuZFxuICAgIC8vIHRoZXJlZm9yZSAndW5zYWZlLWlubGluZScgd291bGQgbm90IGdldCBpZ25vcmVkIGlmIGEgcG9saWN5IGhhcyBub25jZXMuXG4gICAgY29uc3QgZWZmZWN0aXZlQ3NwID1cbiAgICAgICAgY3NwLkNzcC5nZXRFZmZlY3RpdmVDc3AodGhpcy5jc3AsIHRoaXMudmVyc2lvbiwgdGhpcy5maW5kaW5ncyk7XG5cbiAgICAvLyBDaGVja3MgaW5kZXBlbmRlbnQgb2YgQ1NQIHZlcnNpb24uXG4gICAgaWYgKHBhcnNlZENzcENoZWNrcykge1xuICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBwYXJzZWRDc3BDaGVja3MpIHtcbiAgICAgICAgdGhpcy5maW5kaW5ncyA9IHRoaXMuZmluZGluZ3MuY29uY2F0KGNoZWNrKHRoaXMuY3NwKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2tzIGRlcGVuZW50IG9uIENTUCB2ZXJzaW9uLlxuICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICB0aGlzLmZpbmRpbmdzID0gdGhpcy5maW5kaW5ncy5jb25jYXQoY2hlY2soZWZmZWN0aXZlQ3NwKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZmluZGluZ3M7XG4gIH1cbn1cblxuXG4vKipcbiAqIFNldCBvZiBkZWZhdWx0IGNoZWNrcyB0byBydW4uXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX0NIRUNLUzogQ2hlY2tlckZ1bmN0aW9uW10gPSBbXG4gIHNlY3VyaXR5Q2hlY2tzLmNoZWNrU2NyaXB0VW5zYWZlSW5saW5lLCBzZWN1cml0eUNoZWNrcy5jaGVja1NjcmlwdFVuc2FmZUV2YWwsXG4gIHNlY3VyaXR5Q2hlY2tzLmNoZWNrUGxhaW5VcmxTY2hlbWVzLCBzZWN1cml0eUNoZWNrcy5jaGVja1dpbGRjYXJkcyxcbiAgc2VjdXJpdHlDaGVja3MuY2hlY2tNaXNzaW5nRGlyZWN0aXZlcyxcbiAgc2VjdXJpdHlDaGVja3MuY2hlY2tTY3JpcHRXaGl0ZWxpc3RCeXBhc3MsXG4gIHNlY3VyaXR5Q2hlY2tzLmNoZWNrRmxhc2hPYmplY3RXaGl0ZWxpc3RCeXBhc3MsIHNlY3VyaXR5Q2hlY2tzLmNoZWNrSXBTb3VyY2UsXG4gIHNlY3VyaXR5Q2hlY2tzLmNoZWNrTm9uY2VMZW5ndGgsIHNlY3VyaXR5Q2hlY2tzLmNoZWNrU3JjSHR0cCxcbiAgc2VjdXJpdHlDaGVja3MuY2hlY2tEZXByZWNhdGVkRGlyZWN0aXZlLCBwYXJzZXJDaGVja3MuY2hlY2tVbmtub3duRGlyZWN0aXZlLFxuICBwYXJzZXJDaGVja3MuY2hlY2tNaXNzaW5nU2VtaWNvbG9uLCBwYXJzZXJDaGVja3MuY2hlY2tJbnZhbGlkS2V5d29yZFxuXTtcblxuXG4vKipcbiAqIFN0cmljdCBDU1AgYW5kIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgY2hlY2tzLlxuICovXG5leHBvcnQgY29uc3QgU1RSSUNUQ1NQX0NIRUNLUzogQ2hlY2tlckZ1bmN0aW9uW10gPSBbXG4gIHN0cmljdGNzcENoZWNrcy5jaGVja1N0cmljdER5bmFtaWMsXG4gIHN0cmljdGNzcENoZWNrcy5jaGVja1N0cmljdER5bmFtaWNOb3RTdGFuZGFsb25lLFxuICBzdHJpY3Rjc3BDaGVja3MuY2hlY2tVbnNhZmVJbmxpbmVGYWxsYmFjayxcbiAgc3RyaWN0Y3NwQ2hlY2tzLmNoZWNrV2hpdGVsaXN0RmFsbGJhY2ssXG4gIHN0cmljdGNzcENoZWNrcy5jaGVja1JlcXVpcmVzVHJ1c3RlZFR5cGVzRm9yU2NyaXB0c1xuXTtcbiJdfQ==
;return exports;});

//javascript/security/csp/csp_evaluator/lighthouse/lighthouse_checks.closure.js
goog.loadModule(function(exports) {'use strict';/**
 *
 * @fileoverview CSP checks as used by Lighthouse. These checks tend to be a
 * stricter subset of the other checks defined in this project.
 *
 * Generated from: javascript/security/csp/csp_evaluator/lighthouse/lighthouse_checks.ts
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
goog.module('google3.javascript.security.csp.csp_evaluator.lighthouse.lighthouse_checks');
var module = module || { id: 'javascript/security/csp/csp_evaluator/lighthouse/lighthouse_checks.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
const tsickle_checker_1 = goog.requireType("google3.javascript.security.csp.csp_evaluator.checks.checker");
const tsickle_parser_checks_2 = goog.requireType("google3.javascript.security.csp.csp_evaluator.checks.parser_checks");
const tsickle_security_checks_3 = goog.requireType("google3.javascript.security.csp.csp_evaluator.checks.security_checks");
const tsickle_strictcsp_checks_4 = goog.requireType("google3.javascript.security.csp.csp_evaluator.checks.strictcsp_checks");
const tsickle_csp_5 = goog.requireType("google3.javascript.security.csp.csp_evaluator.csp");
const tsickle_finding_6 = goog.requireType("google3.javascript.security.csp.csp_evaluator.finding");
const parser_checks_1 = goog.require('google3.javascript.security.csp.csp_evaluator.checks.parser_checks');
const security_checks_1 = goog.require('google3.javascript.security.csp.csp_evaluator.checks.security_checks');
const strictcsp_checks_1 = goog.require('google3.javascript.security.csp.csp_evaluator.checks.strictcsp_checks');
const csp_1 = goog.require('google3.javascript.security.csp.csp_evaluator.csp');
/**
 * @record
 */
function Equalable() { }
/* istanbul ignore if */
if (false) {
    /**
     * @param {*} a
     * @return {boolean}
     */
    Equalable.prototype.equals = function (a) { };
}
/**
 * @template T
 * @param {!Array<T>} arr
 * @param {T} elem
 * @return {boolean}
 */
function arrayContains(arr, elem) {
    return arr.some((/**
     * @param {T} e
     * @return {boolean}
     */
    e => e.equals(elem)));
}
/**
 * Computes the intersection of all of the given sets using the `equals(...)`
 * method to compare items.
 * @template T
 * @param {!Array<!Array<T>>} sets
 * @return {!Array<T>}
 */
function setIntersection(sets) {
    /** @type {!Array<T>} */
    const intersection = [];
    if (sets.length === 0) {
        return intersection;
    }
    /** @type {!Array<T>} */
    const firstSet = sets[0];
    for (const elem of firstSet) {
        if (sets.every((/**
         * @param {!Array<T>} set
         * @return {boolean}
         */
        set => arrayContains(set, elem)))) {
            intersection.push(elem);
        }
    }
    return intersection;
}
/**
 * Computes the union of all of the given sets using the `equals(...)` method to
 * compare items.
 * @template T
 * @param {!Array<!Array<T>>} sets
 * @return {!Array<T>}
 */
function setUnion(sets) {
    /** @type {!Array<T>} */
    const union = [];
    for (const set of sets) {
        for (const elem of set) {
            if (!arrayContains(union, elem)) {
                union.push(elem);
            }
        }
    }
    return union;
}
/**
 * Checks if *any* of the given policies pass the given checker. If at least one
 * passes, returns no findings. Otherwise, returns the list of findings from the
 * first one that had any findings.
 * @param {!Array<!tsickle_csp_5.Csp>} parsedCsps
 * @param {function(!tsickle_csp_5.Csp): !Array<!tsickle_finding_6.Finding>} checker
 * @return {!Array<!tsickle_finding_6.Finding>}
 */
function atLeastOnePasses(parsedCsps, checker) {
    /** @type {!Array<!Array<!tsickle_finding_6.Finding>>} */
    const findings = [];
    for (const parsedCsp of parsedCsps) {
        findings.push(checker(parsedCsp));
    }
    return setIntersection(findings);
}
/**
 * Checks if *any* of the given policies fail the given checker. Returns the
 * list of findings from the one that had the most findings.
 * @param {!Array<!tsickle_csp_5.Csp>} parsedCsps
 * @param {function(!tsickle_csp_5.Csp): !Array<!tsickle_finding_6.Finding>} checker
 * @return {!Array<!tsickle_finding_6.Finding>}
 */
function atLeastOneFails(parsedCsps, checker) {
    /** @type {!Array<!Array<!tsickle_finding_6.Finding>>} */
    const findings = [];
    for (const parsedCsp of parsedCsps) {
        findings.push(checker(parsedCsp));
    }
    return setUnion(findings);
}
/**
 * Evaluate the given list of CSPs for checks that should cause Lighthouse to
 * mark the CSP as failing. Returns only the first set of failures.
 * @param {!Array<!tsickle_csp_5.Csp>} parsedCsps
 * @return {!Array<!tsickle_finding_6.Finding>}
 */
function evaluateForFailure(parsedCsps) {
    // Check #1
    /** @type {!Array<!tsickle_finding_6.Finding>} */
    const targetsXssFindings = [
        ...atLeastOnePasses(parsedCsps, security_checks_1.checkMissingScriptSrcDirective),
        ...atLeastOnePasses(parsedCsps, security_checks_1.checkMissingObjectSrcDirective),
        ...security_checks_1.checkMultipleMissingBaseUriDirective(parsedCsps),
    ];
    if (targetsXssFindings.length > 0) {
        return targetsXssFindings;
    }
    // Check #2
    /** @type {!Array<!tsickle_csp_5.Csp>} */
    const effectiveCsps = parsedCsps.map((/**
     * @param {!tsickle_csp_5.Csp} csp
     * @return {!tsickle_csp_5.Csp}
     */
    csp => csp_1.Csp.getEffectiveCsp(csp, csp_1.Version.CSP3)));
    /** @type {!Array<!tsickle_finding_6.Finding>} */
    const robust = [
        ...atLeastOnePasses(effectiveCsps, strictcsp_checks_1.checkStrictDynamic),
        ...atLeastOnePasses(effectiveCsps, security_checks_1.checkScriptUnsafeInline),
    ];
    return robust;
}
exports.evaluateForFailure = evaluateForFailure;
/**
 * Evaluate the given list of CSPs for checks that should cause Lighthouse to
 * mark the CSP as OK, but present a warning. Returns only the first set of
 * failures.
 * @param {!Array<!tsickle_csp_5.Csp>} parsedCsps
 * @return {!Array<!tsickle_finding_6.Finding>}
 */
function evaluateForWarnings(parsedCsps) {
    // Check #1 is implemented by Lighthouse directly
    // Check #2
    /** @type {!Array<!tsickle_finding_6.Finding>} */
    const hasReportingFindings = atLeastOnePasses(parsedCsps, security_checks_1.checkHasConfiguredReporting);
    // Check #3
    /** @type {!Array<!tsickle_finding_6.Finding>} */
    const compatibleWithNonCompliantBrowsersFindings = [
        ...atLeastOneFails(parsedCsps, strictcsp_checks_1.checkUnsafeInlineFallback),
        ...atLeastOneFails(parsedCsps, strictcsp_checks_1.checkWhitelistFallback)
    ];
    return [
        ...hasReportingFindings, ...compatibleWithNonCompliantBrowsersFindings
    ];
}
exports.evaluateForWarnings = evaluateForWarnings;
/**
 * Evaluate the given list of CSPs for syntax errors. Returns a list of the same
 * length as parsedCsps where each item in the list is the findings for the
 * matching Csp.
 * @param {!Array<!tsickle_csp_5.Csp>} parsedCsps
 * @return {!Array<!Array<!tsickle_finding_6.Finding>>}
 */
function evaluateForSyntaxErrors(parsedCsps) {
    // Check #4
    /** @type {!Array<!Array<!tsickle_finding_6.Finding>>} */
    const allFindings = [];
    for (const csp of parsedCsps) {
        /** @type {!Array<!tsickle_finding_6.Finding>} */
        const findings = [
            ...security_checks_1.checkNonceLength(csp), ...parser_checks_1.checkUnknownDirective(csp),
            ...security_checks_1.checkDeprecatedDirective(csp), ...parser_checks_1.checkMissingSemicolon(csp),
            ...parser_checks_1.checkInvalidKeyword(csp)
        ];
        allFindings.push(findings);
    }
    return allFindings;
}
exports.evaluateForSyntaxErrors = evaluateForSyntaxErrors;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlnaHRob3VzZV9jaGVja3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9qYXZhc2NyaXB0L3NlY3VyaXR5L2NzcC9jc3BfZXZhbHVhdG9yL2xpZ2h0aG91c2UvbGlnaHRob3VzZV9jaGVja3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFNQSwyR0FBMEc7QUFDMUcsK0dBQWlQO0FBQ2pQLGlIQUFpSDtBQUNqSCxnRkFBb0M7Ozs7QUFHcEMsd0JBRUM7Ozs7Ozs7SUFEQyw4Q0FBNEI7Ozs7Ozs7O0FBRzlCLFNBQVMsYUFBYSxDQUFzQixHQUFRLEVBQUUsSUFBTztJQUMzRCxPQUFPLEdBQUcsQ0FBQyxJQUFJOzs7O0lBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFDLENBQUM7QUFDdkMsQ0FBQzs7Ozs7Ozs7QUFNRCxTQUFTLGVBQWUsQ0FBc0IsSUFBVzs7VUFDakQsWUFBWSxHQUFRLEVBQUU7SUFDNUIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUNyQixPQUFPLFlBQVksQ0FBQztLQUNyQjs7VUFDSyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN4QixLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsRUFBRTtRQUMzQixJQUFJLElBQUksQ0FBQyxLQUFLOzs7O1FBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFDLEVBQUU7WUFDL0MsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN6QjtLQUNGO0lBQ0QsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQzs7Ozs7Ozs7QUFNRCxTQUFTLFFBQVEsQ0FBc0IsSUFBVzs7VUFDMUMsS0FBSyxHQUFRLEVBQUU7SUFDckIsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVB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LyoqXG4gKiBAZmlsZW92ZXJ2aWV3IENTUCBjaGVja3MgYXMgdXNlZCBieSBMaWdodGhvdXNlLiBUaGVzZSBjaGVja3MgdGVuZCB0byBiZSBhXG4gKiBzdHJpY3RlciBzdWJzZXQgb2YgdGhlIG90aGVyIGNoZWNrcyBkZWZpbmVkIGluIHRoaXMgcHJvamVjdC5cbiAqL1xuXG5pbXBvcnQge0NoZWNrZXJGdW5jdGlvbn0gZnJvbSAnLi4vY2hlY2tzL2NoZWNrZXInO1xuaW1wb3J0IHtjaGVja0ludmFsaWRLZXl3b3JkLCBjaGVja01pc3NpbmdTZW1pY29sb24sIGNoZWNrVW5rbm93bkRpcmVjdGl2ZX0gZnJvbSAnLi4vY2hlY2tzL3BhcnNlcl9jaGVja3MnO1xuaW1wb3J0IHtjaGVja0RlcHJlY2F0ZWREaXJlY3RpdmUsIGNoZWNrSGFzQ29uZmlndXJlZFJlcG9ydGluZywgY2hlY2tNaXNzaW5nT2JqZWN0U3JjRGlyZWN0aXZlLCBjaGVja01pc3NpbmdTY3JpcHRTcmNEaXJlY3RpdmUsIGNoZWNrTXVsdGlwbGVNaXNzaW5nQmFzZVVyaURpcmVjdGl2ZSwgY2hlY2tOb25jZUxlbmd0aCwgY2hlY2tTY3JpcHRVbnNhZmVJbmxpbmV9IGZyb20gJy4uL2NoZWNrcy9zZWN1cml0eV9jaGVja3MnO1xuaW1wb3J0IHtjaGVja1N0cmljdER5bmFtaWMsIGNoZWNrVW5zYWZlSW5saW5lRmFsbGJhY2ssIGNoZWNrV2hpdGVsaXN0RmFsbGJhY2t9IGZyb20gJy4uL2NoZWNrcy9zdHJpY3Rjc3BfY2hlY2tzJztcbmltcG9ydCB7Q3NwLCBWZXJzaW9ufSBmcm9tICcuLi9jc3AnO1xuaW1wb3J0IHtGaW5kaW5nfSBmcm9tICcuLi9maW5kaW5nJztcblxuaW50ZXJmYWNlIEVxdWFsYWJsZSB7XG4gIGVxdWFscyhhOiB1bmtub3duKTogYm9vbGVhbjtcbn1cblxuZnVuY3Rpb24gYXJyYXlDb250YWluczxUIGV4dGVuZHMgRXF1YWxhYmxlPihhcnI6IFRbXSwgZWxlbTogVCkge1xuICByZXR1cm4gYXJyLnNvbWUoZSA9PiBlLmVxdWFscyhlbGVtKSk7XG59XG5cbi8qKlxuICogQ29tcHV0ZXMgdGhlIGludGVyc2VjdGlvbiBvZiBhbGwgb2YgdGhlIGdpdmVuIHNldHMgdXNpbmcgdGhlIGBlcXVhbHMoLi4uKWBcbiAqIG1ldGhvZCB0byBjb21wYXJlIGl0ZW1zLlxuICovXG5mdW5jdGlvbiBzZXRJbnRlcnNlY3Rpb248VCBleHRlbmRzIEVxdWFsYWJsZT4oc2V0czogVFtdW10pOiBUW10ge1xuICBjb25zdCBpbnRlcnNlY3Rpb246IFRbXSA9IFtdO1xuICBpZiAoc2V0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xuICB9XG4gIGNvbnN0IGZpcnN0U2V0ID0gc2V0c1swXTtcbiAgZm9yIChjb25zdCBlbGVtIG9mIGZpcnN0U2V0KSB7XG4gICAgaWYgKHNldHMuZXZlcnkoc2V0ID0+IGFycmF5Q29udGFpbnMoc2V0LCBlbGVtKSkpIHtcbiAgICAgIGludGVyc2VjdGlvbi5wdXNoKGVsZW0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaW50ZXJzZWN0aW9uO1xufVxuXG4vKipcbiAqIENvbXB1dGVzIHRoZSB1bmlvbiBvZiBhbGwgb2YgdGhlIGdpdmVuIHNldHMgdXNpbmcgdGhlIGBlcXVhbHMoLi4uKWAgbWV0aG9kIHRvXG4gKiBjb21wYXJlIGl0ZW1zLlxuICovXG5mdW5jdGlvbiBzZXRVbmlvbjxUIGV4dGVuZHMgRXF1YWxhYmxlPihzZXRzOiBUW11bXSk6IFRbXSB7XG4gIGNvbnN0IHVuaW9uOiBUW10gPSBbXTtcbiAgZm9yIChjb25zdCBzZXQgb2Ygc2V0cykge1xuICAgIGZvciAoY29uc3QgZWxlbSBvZiBzZXQpIHtcbiAgICAgIGlmICghYXJyYXlDb250YWlucyh1bmlvbiwgZWxlbSkpIHtcbiAgICAgICAgdW5pb24ucHVzaChlbGVtKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVuaW9uO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiAqYW55KiBvZiB0aGUgZ2l2ZW4gcG9saWNpZXMgcGFzcyB0aGUgZ2l2ZW4gY2hlY2tlci4gSWYgYXQgbGVhc3Qgb25lXG4gKiBwYXNzZXMsIHJldHVybnMgbm8gZmluZGluZ3MuIE90aGVyd2lzZSwgcmV0dXJucyB0aGUgbGlzdCBvZiBmaW5kaW5ncyBmcm9tIHRoZVxuICogZmlyc3Qgb25lIHRoYXQgaGFkIGFueSBmaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gYXRMZWFzdE9uZVBhc3NlcyhcbiAgICBwYXJzZWRDc3BzOiBDc3BbXSwgY2hlY2tlcjogQ2hlY2tlckZ1bmN0aW9uKTogRmluZGluZ1tdIHtcbiAgY29uc3QgZmluZGluZ3M6IEZpbmRpbmdbXVtdID0gW107XG4gIGZvciAoY29uc3QgcGFyc2VkQ3NwIG9mIHBhcnNlZENzcHMpIHtcbiAgICBmaW5kaW5ncy5wdXNoKGNoZWNrZXIocGFyc2VkQ3NwKSk7XG4gIH1cbiAgcmV0dXJuIHNldEludGVyc2VjdGlvbihmaW5kaW5ncyk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmICphbnkqIG9mIHRoZSBnaXZlbiBwb2xpY2llcyBmYWlsIHRoZSBnaXZlbiBjaGVja2VyLiBSZXR1cm5zIHRoZVxuICogbGlzdCBvZiBmaW5kaW5ncyBmcm9tIHRoZSBvbmUgdGhhdCBoYWQgdGhlIG1vc3QgZmluZGluZ3MuXG4gKi9cbmZ1bmN0aW9uIGF0TGVhc3RPbmVGYWlscyhcbiAgICBwYXJzZWRDc3BzOiBDc3BbXSwgY2hlY2tlcjogQ2hlY2tlckZ1bmN0aW9uKTogRmluZGluZ1tdIHtcbiAgY29uc3QgZmluZGluZ3M6IEZpbmRpbmdbXVtdID0gW107XG4gIGZvciAoY29uc3QgcGFyc2VkQ3NwIG9mIHBhcnNlZENzcHMpIHtcbiAgICBmaW5kaW5ncy5wdXNoKGNoZWNrZXIocGFyc2VkQ3NwKSk7XG4gIH1cbiAgcmV0dXJuIHNldFVuaW9uKGZpbmRpbmdzKTtcbn1cblxuLyoqXG4gKiBFdmFsdWF0ZSB0aGUgZ2l2ZW4gbGlzdCBvZiBDU1BzIGZvciBjaGVja3MgdGhhdCBzaG91bGQgY2F1c2UgTGlnaHRob3VzZSB0b1xuICogbWFyayB0aGUgQ1NQIGFzIGZhaWxpbmcuIFJldHVybnMgb25seSB0aGUgZmlyc3Qgc2V0IG9mIGZhaWx1cmVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGVGb3JGYWlsdXJlKHBhcnNlZENzcHM6IENzcFtdKTogRmluZGluZ1tdIHtcbiAgLy8gQ2hlY2sgIzFcbiAgY29uc3QgdGFyZ2V0c1hzc0ZpbmRpbmdzID0gW1xuICAgIC4uLmF0TGVhc3RPbmVQYXNzZXMocGFyc2VkQ3NwcywgY2hlY2tNaXNzaW5nU2NyaXB0U3JjRGlyZWN0aXZlKSxcbiAgICAuLi5hdExlYXN0T25lUGFzc2VzKHBhcnNlZENzcHMsIGNoZWNrTWlzc2luZ09iamVjdFNyY0RpcmVjdGl2ZSksXG4gICAgLi4uY2hlY2tNdWx0aXBsZU1pc3NpbmdCYXNlVXJpRGlyZWN0aXZlKHBhcnNlZENzcHMpLFxuICBdO1xuICBpZiAodGFyZ2V0c1hzc0ZpbmRpbmdzLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gdGFyZ2V0c1hzc0ZpbmRpbmdzO1xuICB9XG5cbiAgLy8gQ2hlY2sgIzJcbiAgY29uc3QgZWZmZWN0aXZlQ3NwcyA9XG4gICAgICBwYXJzZWRDc3BzLm1hcChjc3AgPT4gQ3NwLmdldEVmZmVjdGl2ZUNzcChjc3AsIFZlcnNpb24uQ1NQMykpO1xuICBjb25zdCByb2J1c3QgPSBbXG4gICAgLi4uYXRMZWFzdE9uZVBhc3NlcyhlZmZlY3RpdmVDc3BzLCBjaGVja1N0cmljdER5bmFtaWMpLFxuICAgIC4uLmF0TGVhc3RPbmVQYXNzZXMoZWZmZWN0aXZlQ3NwcywgY2hlY2tTY3JpcHRVbnNhZmVJbmxpbmUpLFxuICBdO1xuICByZXR1cm4gcm9idXN0O1xufVxuXG4vKipcbiAqIEV2YWx1YXRlIHRoZSBnaXZlbiBsaXN0IG9mIENTUHMgZm9yIGNoZWNrcyB0aGF0IHNob3VsZCBjYXVzZSBMaWdodGhvdXNlIHRvXG4gKiBtYXJrIHRoZSBDU1AgYXMgT0ssIGJ1dCBwcmVzZW50IGEgd2FybmluZy4gUmV0dXJucyBvbmx5IHRoZSBmaXJzdCBzZXQgb2ZcbiAqIGZhaWx1cmVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGVGb3JXYXJuaW5ncyhwYXJzZWRDc3BzOiBDc3BbXSk6IEZpbmRpbmdbXSB7XG4gIC8vIENoZWNrICMxIGlzIGltcGxlbWVudGVkIGJ5IExpZ2h0aG91c2UgZGlyZWN0bHlcbiAgLy8gQ2hlY2sgIzJcbiAgY29uc3QgaGFzUmVwb3J0aW5nRmluZGluZ3MgPVxuICAgICAgYXRMZWFzdE9uZVBhc3NlcyhwYXJzZWRDc3BzLCBjaGVja0hhc0NvbmZpZ3VyZWRSZXBvcnRpbmcpO1xuXG4gIC8vIENoZWNrICMzXG4gIGNvbnN0IGNvbXBhdGlibGVXaXRoTm9uQ29tcGxpYW50QnJvd3NlcnNGaW5kaW5ncyA9IFtcbiAgICAuLi5hdExlYXN0T25lRmFpbHMocGFyc2VkQ3NwcywgY2hlY2tVbnNhZmVJbmxpbmVGYWxsYmFjayksXG4gICAgLi4uYXRMZWFzdE9uZUZhaWxzKHBhcnNlZENzcHMsIGNoZWNrV2hpdGVsaXN0RmFsbGJhY2spXG4gIF07XG4gIHJldHVybiBbXG4gICAgLi4uaGFzUmVwb3J0aW5nRmluZGluZ3MsIC4uLmNvbXBhdGlibGVXaXRoTm9uQ29tcGxpYW50QnJvd3NlcnNGaW5kaW5nc1xuICBdO1xufVxuXG4vKipcbiAqIEV2YWx1YXRlIHRoZSBnaXZlbiBsaXN0IG9mIENTUHMgZm9yIHN5bnRheCBlcnJvcnMuIFJldHVybnMgYSBsaXN0IG9mIHRoZSBzYW1lXG4gKiBsZW5ndGggYXMgcGFyc2VkQ3NwcyB3aGVyZSBlYWNoIGl0ZW0gaW4gdGhlIGxpc3QgaXMgdGhlIGZpbmRpbmdzIGZvciB0aGVcbiAqIG1hdGNoaW5nIENzcC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlRm9yU3ludGF4RXJyb3JzKHBhcnNlZENzcHM6IENzcFtdKTogRmluZGluZ1tdW10ge1xuICAvLyBDaGVjayAjNFxuICBjb25zdCBhbGxGaW5kaW5nczogRmluZGluZ1tdW10gPSBbXTtcbiAgZm9yIChjb25zdCBjc3Agb2YgcGFyc2VkQ3Nwcykge1xuICAgIGNvbnN0IGZpbmRpbmdzID0gW1xuICAgICAgLi4uY2hlY2tOb25jZUxlbmd0aChjc3ApLCAuLi5jaGVja1Vua25vd25EaXJlY3RpdmUoY3NwKSxcbiAgICAgIC4uLmNoZWNrRGVwcmVjYXRlZERpcmVjdGl2ZShjc3ApLCAuLi5jaGVja01pc3NpbmdTZW1pY29sb24oY3NwKSxcbiAgICAgIC4uLmNoZWNrSW52YWxpZEtleXdvcmQoY3NwKVxuICAgIF07XG4gICAgYWxsRmluZGluZ3MucHVzaChmaW5kaW5ncyk7XG4gIH1cbiAgcmV0dXJuIGFsbEZpbmRpbmdzO1xufVxuIl19
;return exports;});

//javascript/security/csp/csp_evaluator/parser.closure.js
goog.loadModule(function(exports) {'use strict';/**
 * @fileoverview added by tsickle
 * Generated from: javascript/security/csp/csp_evaluator/parser.ts
 * @suppress {checkTypes,extraRequire,missingOverride,missingRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
goog.module('google3.javascript.security.csp.csp_evaluator.parser');
var module = module || { id: 'javascript/security/csp/csp_evaluator/parser.closure.js' };
goog.require('google3.third_party.javascript.tslib.tslib');
const tsickle_csp_1 = goog.requireType("google3.javascript.security.csp.csp_evaluator.csp");
/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author lwe@google.com (Lukas Weichselbaum)
 */
const csp = goog.require('google3.javascript.security.csp.csp_evaluator.csp');
/**
 * A class to hold a parser for CSP in string format.
 * TODO: Extend parser to detect common syntax and semantic errors in CSPs.
 * @unrestricted
 */
class CspParser {
    /**
     * @param {string} unparsedCsp A Content Security Policy as string.
     */
    constructor(unparsedCsp) {
        /**
         * Parsed CSP
         */
        this.csp = new csp.Csp();
        this.parse(unparsedCsp);
    }
    /**
     * Parses a CSP from a string.
     * @param {string} unparsedCsp CSP as string.
     * @return {!tsickle_csp_1.Csp}
     */
    parse(unparsedCsp) {
        // Reset the internal state:
        this.csp = new csp.Csp();
        // Split CSP into directive tokens.
        /** @type {!Array<string>} */
        const directiveTokens = unparsedCsp.split(';');
        for (let i = 0; i < directiveTokens.length; i++) {
            /** @type {string} */
            const directiveToken = directiveTokens[i].trim();
            // Split directive tokens into directive name and directive values.
            /** @type {(null|!RegExpMatchArray)} */
            const directiveParts = directiveToken.match(/\S+/g);
            if (Array.isArray(directiveParts)) {
                /** @type {string} */
                const directiveName = directiveParts[0].toLowerCase();
                // If the set of directives already contains a directive whose name is a
                // case insensitive match for directive name, ignore this instance of
                // the directive and continue to the next token.
                if (directiveName in this.csp) {
                    // TODO(lwe): propagate the duplicate directive warning to the UI.
                    continue;
                }
                if (!csp.isDirective(directiveName)) {
                    // TODO(lwe): propagate the invalid directive warning to the UI.
                }
                /** @type {!Array<string>} */
                const directiveValues = [];
                for (let directiveValue, j = 1; directiveValue = directiveParts[j]; j++) {
                    directiveValue = normalizeDirectiveValue(directiveValue);
                    if (!directiveValues.includes(directiveValue)) {
                        directiveValues.push(directiveValue);
                    }
                }
                this.csp[directiveName] = directiveValues;
            }
        }
        return this.csp;
    }
}
exports.CspParser = CspParser;
/* istanbul ignore if */
if (false) {
    /** @type {!tsickle_csp_1.Csp} */
    CspParser.prototype.csp;
}
/**
 * Remove whitespaces and turn to lower case if CSP keyword or protocol
 * handler.
 * @param {string} directiveValue directive value.
 * @return {string} normalized directive value.
 */
function normalizeDirectiveValue(directiveValue) {
    directiveValue = directiveValue.trim();
    /** @type {string} */
    const directiveValueLower = directiveValue.toLowerCase();
    if (csp.isKeyword(directiveValueLower) || csp.isUrlScheme(directiveValue)) {
        return directiveValueLower;
    }
    return directiveValue;
}
/** @type {{normalizeDirectiveValue: function(string): string}} */
exports.TEST_ONLY = { normalizeDirectiveValue };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vamF2YXNjcmlwdC9zZWN1cml0eS9jc3AvY3NwX2V2YWx1YXRvci9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkEsOEVBQTZCOzs7Ozs7QUFTN0IsTUFBYSxTQUFTOzs7O0lBS3BCLFlBQVksV0FBbUI7UUFDN0I7O1dBRUc7UUFDSCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRXpCLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUIsQ0FBQzs7Ozs7O0lBTUQsS0FBSyxDQUFDLFdBQW1CO1FBQ3ZCLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDOzs7Y0FHbkIsZUFBZSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1FBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFOztrQkFDekMsY0FBYyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7OztrQkFHMUMsY0FBYyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQ25ELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRTs7c0JBQzNCLGFBQWEsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFO2dCQUVyRCx3RUFBd0U7Z0JBQ3hFLHFFQUFxRTtnQkFDckUsZ0RBQWdEO2dCQUNoRCxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO29CQUM3QixrRUFBa0U7b0JBQ2xFLFNBQVM7aUJBQ1Y7Z0JBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEVBQUU7b0JBQ25DLGdFQUFnRTtpQkFDakU7O3NCQUVLLGVBQWUsR0FBYSxFQUFFO2dCQUNwQyxLQUFLLElBQUksY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsY0FBYyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFDN0QsQ0FBQyxFQUFFLEVBQUU7b0JBQ1IsY0FBYyxHQUFHLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRTt3QkFDN0MsZUFBZSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztxQkFDdEM7aUJBQ0Y7Z0JBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxlQUFlLENBQUM7YUFDM0M7U0FDRjtRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUExREQsOEJBMERDOzs7O0lBekRDLHdCQUFhOzs7Ozs7OztBQWlFZixTQUFTLHVCQUF1QixDQUFDLGNBQXNCO0lBQ3JELGNBQWMsR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7O1VBQ2pDLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxXQUFXLEVBQUU7SUFDeEQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUN6RSxPQUFPLG1CQUFtQixDQUFDO0tBQzVCO0lBQ0QsT0FBTyxjQUFjLENBQUM7QUFDeEIsQ0FBQzs7QUFFWSxRQUFBLFNBQVMsR0FBRyxFQUFDLHVCQUF1QixFQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogQGF1dGhvciBsd2VAZ29vZ2xlLmNvbSAoTHVrYXMgV2VpY2hzZWxiYXVtKVxuICovXG5cbmltcG9ydCAqIGFzIGNzcCBmcm9tICcuL2NzcCc7XG5cblxuXG4vKipcbiAqIEEgY2xhc3MgdG8gaG9sZCBhIHBhcnNlciBmb3IgQ1NQIGluIHN0cmluZyBmb3JtYXQuXG4gKiBUT0RPOiBFeHRlbmQgcGFyc2VyIHRvIGRldGVjdCBjb21tb24gc3ludGF4IGFuZCBzZW1hbnRpYyBlcnJvcnMgaW4gQ1NQcy5cbiAqIEB1bnJlc3RyaWN0ZWRcbiAqL1xuZXhwb3J0IGNsYXNzIENzcFBhcnNlciB7XG4gIGNzcDogY3NwLkNzcDtcbiAgLyoqXG4gICAqIEBwYXJhbSB1bnBhcnNlZENzcCBBIENvbnRlbnQgU2VjdXJpdHkgUG9saWN5IGFzIHN0cmluZy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHVucGFyc2VkQ3NwOiBzdHJpbmcpIHtcbiAgICAvKipcbiAgICAgKiBQYXJzZWQgQ1NQXG4gICAgICovXG4gICAgdGhpcy5jc3AgPSBuZXcgY3NwLkNzcCgpO1xuXG4gICAgdGhpcy5wYXJzZSh1bnBhcnNlZENzcCk7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIGEgQ1NQIGZyb20gYSBzdHJpbmcuXG4gICAqIEBwYXJhbSB1bnBhcnNlZENzcCBDU1AgYXMgc3RyaW5nLlxuICAgKi9cbiAgcGFyc2UodW5wYXJzZWRDc3A6IHN0cmluZyk6IGNzcC5Dc3Age1xuICAgIC8vIFJlc2V0IHRoZSBpbnRlcm5hbCBzdGF0ZTpcbiAgICB0aGlzLmNzcCA9IG5ldyBjc3AuQ3NwKCk7XG5cbiAgICAvLyBTcGxpdCBDU1AgaW50byBkaXJlY3RpdmUgdG9rZW5zLlxuICAgIGNvbnN0IGRpcmVjdGl2ZVRva2VucyA9IHVucGFyc2VkQ3NwLnNwbGl0KCc7Jyk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaXJlY3RpdmVUb2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZVRva2VuID0gZGlyZWN0aXZlVG9rZW5zW2ldLnRyaW0oKTtcblxuICAgICAgLy8gU3BsaXQgZGlyZWN0aXZlIHRva2VucyBpbnRvIGRpcmVjdGl2ZSBuYW1lIGFuZCBkaXJlY3RpdmUgdmFsdWVzLlxuICAgICAgY29uc3QgZGlyZWN0aXZlUGFydHMgPSBkaXJlY3RpdmVUb2tlbi5tYXRjaCgvXFxTKy9nKTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRpcmVjdGl2ZVBhcnRzKSkge1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVOYW1lID0gZGlyZWN0aXZlUGFydHNbMF0udG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAvLyBJZiB0aGUgc2V0IG9mIGRpcmVjdGl2ZXMgYWxyZWFkeSBjb250YWlucyBhIGRpcmVjdGl2ZSB3aG9zZSBuYW1lIGlzIGFcbiAgICAgICAgLy8gY2FzZSBpbnNlbnNpdGl2ZSBtYXRjaCBmb3IgZGlyZWN0aXZlIG5hbWUsIGlnbm9yZSB0aGlzIGluc3RhbmNlIG9mXG4gICAgICAgIC8vIHRoZSBkaXJlY3RpdmUgYW5kIGNvbnRpbnVlIHRvIHRoZSBuZXh0IHRva2VuLlxuICAgICAgICBpZiAoZGlyZWN0aXZlTmFtZSBpbiB0aGlzLmNzcCkge1xuICAgICAgICAgIC8vIFRPRE8obHdlKTogcHJvcGFnYXRlIHRoZSBkdXBsaWNhdGUgZGlyZWN0aXZlIHdhcm5pbmcgdG8gdGhlIFVJLlxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjc3AuaXNEaXJlY3RpdmUoZGlyZWN0aXZlTmFtZSkpIHtcbiAgICAgICAgICAvLyBUT0RPKGx3ZSk6IHByb3BhZ2F0ZSB0aGUgaW52YWxpZCBkaXJlY3RpdmUgd2FybmluZyB0byB0aGUgVUkuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkaXJlY3RpdmVWYWx1ZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGZvciAobGV0IGRpcmVjdGl2ZVZhbHVlLCBqID0gMTsgZGlyZWN0aXZlVmFsdWUgPSBkaXJlY3RpdmVQYXJ0c1tqXTtcbiAgICAgICAgICAgICBqKyspIHtcbiAgICAgICAgICBkaXJlY3RpdmVWYWx1ZSA9IG5vcm1hbGl6ZURpcmVjdGl2ZVZhbHVlKGRpcmVjdGl2ZVZhbHVlKTtcbiAgICAgICAgICBpZiAoIWRpcmVjdGl2ZVZhbHVlcy5pbmNsdWRlcyhkaXJlY3RpdmVWYWx1ZSkpIHtcbiAgICAgICAgICAgIGRpcmVjdGl2ZVZhbHVlcy5wdXNoKGRpcmVjdGl2ZVZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jc3BbZGlyZWN0aXZlTmFtZV0gPSBkaXJlY3RpdmVWYWx1ZXM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3NwO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlIHdoaXRlc3BhY2VzIGFuZCB0dXJuIHRvIGxvd2VyIGNhc2UgaWYgQ1NQIGtleXdvcmQgb3IgcHJvdG9jb2xcbiAqIGhhbmRsZXIuXG4gKiBAcGFyYW0gZGlyZWN0aXZlVmFsdWUgZGlyZWN0aXZlIHZhbHVlLlxuICogQHJldHVybiBub3JtYWxpemVkIGRpcmVjdGl2ZSB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplRGlyZWN0aXZlVmFsdWUoZGlyZWN0aXZlVmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGRpcmVjdGl2ZVZhbHVlID0gZGlyZWN0aXZlVmFsdWUudHJpbSgpO1xuICBjb25zdCBkaXJlY3RpdmVWYWx1ZUxvd2VyID0gZGlyZWN0aXZlVmFsdWUudG9Mb3dlckNhc2UoKTtcbiAgaWYgKGNzcC5pc0tleXdvcmQoZGlyZWN0aXZlVmFsdWVMb3dlcikgfHwgY3NwLmlzVXJsU2NoZW1lKGRpcmVjdGl2ZVZhbHVlKSkge1xuICAgIHJldHVybiBkaXJlY3RpdmVWYWx1ZUxvd2VyO1xuICB9XG4gIHJldHVybiBkaXJlY3RpdmVWYWx1ZTtcbn1cblxuZXhwb3J0IGNvbnN0IFRFU1RfT05MWSA9IHtub3JtYWxpemVEaXJlY3RpdmVWYWx1ZX07XG4iXX0=
;return exports;});

module.exports = goog;
