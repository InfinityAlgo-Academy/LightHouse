const fs = require('fs');
const glob = require('glob');
const { execFileSync } = require('child_process');
const LegacyJavascript = require('../../audits/legacy-javascript.js');
const networkRecordsToDevtoolsLog = require('../../test/network-records-to-devtools-log.js');
const VARIANT_DIR = `${__dirname}/variants`;

const mainCode = fs.readFileSync(`${__dirname}/main.js`, 'utf-8');

const plugins = [
  '@babel/plugin-transform-classes',
  '@babel/plugin-transform-regenerator',
  '@babel/plugin-transform-spread',
  // The rest are legacy, but `legacy-javascript` doesn't attempt to detect these.
  // '@babel/plugin-transform-arrow-functions',
  // '@babel/plugin-transform-block-scoped-functions',
  // '@babel/plugin-transform-computed-properties',
  // '@babel/plugin-transform-destructuring',
  // '@babel/plugin-transform-duplicate-keys',
  // '@babel/plugin-transform-exponentiation-operator',
  // '@babel/plugin-transform-for-of',
  // '@babel/plugin-transform-literals',
  // '@babel/plugin-transform-member-expression-literals',
  // '@babel/plugin-transform-new-target',
  // '@babel/plugin-transform-object-super',
  // '@babel/plugin-transform-property-literals',
  // '@babel/plugin-transform-reserved-words',
  // '@babel/plugin-transform-shorthand-properties',
  // '@babel/plugin-transform-sticky-regex',
  // '@babel/plugin-transform-typeof-symbol',
];

const polyfills = [
  'es6.array.copy-within',
  'es6.array.every',
  'es6.array.fill',
  'es6.array.filter',
  'es6.array.find-index',
  'es6.array.find',
  'es6.array.for-each',
  'es6.array.from',
  'es6.array.index-of',
  'es6.array.is-array',
  'es6.array.iterator',
  'es6.array.last-index-of',
  'es6.array.map',
  'es6.array.of',
  'es6.array.reduce-right',
  'es6.array.reduce',
  'es6.array.some',
  'es6.array.species',
  'es6.date.now',
  'es6.date.to-iso-string',
  'es6.date.to-json',
  'es6.date.to-primitive',
  'es6.date.to-string',
  'es6.function.bind',
  'es6.function.has-instance',
  'es6.function.name',
  'es6.map',
  'es6.math.acosh',
  'es6.math.asinh',
  'es6.math.atanh',
  'es6.math.cbrt',
  'es6.math.clz32',
  'es6.math.cosh',
  'es6.math.expm1',
  'es6.math.fround',
  'es6.math.hypot',
  'es6.math.imul',
  'es6.math.log10',
  'es6.math.log1p',
  'es6.math.log2',
  'es6.math.sign',
  'es6.math.sinh',
  'es6.math.tanh',
  'es6.math.trunc',
  'es6.number.constructor',
  'es6.number.epsilon',
  'es6.number.is-integer',
  'es6.number.is-safe-integer',
  'es6.number.max-safe-integer',
  'es6.number.min-safe-integer',
  'es6.number.parse-float',
  'es6.number.parse-int',
  'es6.object.assign',
  'es6.object.create',
  'es6.object.define-properties',
  'es6.object.define-property',
  'es6.object.freeze',
  'es6.object.get-own-property-descriptor',
  'es6.object.get-own-property-names',
  'es6.object.get-prototype-of',
  'es6.object.is-extensible',
  'es6.object.is-frozen',
  'es6.object.is-sealed',
  'es6.object.keys',
  'es6.object.prevent-extensions',
  'es6.object.seal',
  'es6.object.set-prototype-of',
  'es6.object.to-string',
  'es6.promise',
  'es6.reflect.apply',
  'es6.reflect.construct',
  'es6.reflect.define-property',
  'es6.reflect.delete-property',
  'es6.reflect.get-own-property-descriptor',
  'es6.reflect.get-prototype-of',
  'es6.reflect.get',
  'es6.reflect.has',
  'es6.reflect.is-extensible',
  'es6.reflect.own-keys',
  'es6.reflect.prevent-extensions',
  'es6.reflect.set-prototype-of',
  'es6.reflect.set',
  'es6.set',
  'es6.string.code-point-at',
  'es6.string.ends-with',
  'es6.string.from-code-point',
  'es6.string.includes',
  'es6.string.iterator',
  'es6.string.raw',
  'es6.string.repeat',
  'es6.string.starts-with',
  'es6.string.trim',
  'es6.typed.array-buffer',
  'es6.typed.data-view',
  'es6.typed.float32-array',
  'es6.typed.float64-array',
  'es6.typed.int16-array',
  'es6.typed.int32-array',
  'es6.typed.int8-array',
  'es6.typed.uint16-array',
  'es6.typed.uint32-array',
  'es6.typed.uint8-array',
  'es6.typed.uint8-clamped-array',
  'es6.weak-map',
  'es6.weak-set',
  'es7.array.includes',
  'es7.object.entries',
  'es7.object.get-own-property-descriptors',
  'es7.object.values',
  'es7.string.pad-end',
  'es7.string.pad-start',
];

/**
 * @param {{name: string, code: string, babelrc?: *}} options
 */
async function createVariant(options) {
  const { name, code, babelrc } = options;

  const dir = `${VARIANT_DIR}/${name.replace(/[^a-zA-Z0-9]+/g, '-')}`;
  if (fs.existsSync(dir)) return;

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/main.js`, code);
  fs.writeFileSync(`${dir}/.babelrc`, JSON.stringify(babelrc || {}, null, 2));
  // Not used in this script, but useful for running Lighthouse manually.
  // Just need to start a web server first.
  fs.writeFileSync(`${dir}/index.html`, `<title>${name}</title><script src=main.bundle.js>`);
  
  // Note: No babelrc will make babel a glorified `cp`.
  execFileSync('yarn', [
    'babel',
    `${dir}/main.js`,
    '--config-file', `${dir}/.babelrc`,
    '--ignore', 'node_modules/**/*.js',
    '-o', `${dir}/main.transpiled.js`,
  ]);

  // Transform any require statements (like for core-js) into a big bundle.
  execFileSync('yarn', [
    'browserify',
    `${dir}/main.transpiled.js`,
    '-o', `${dir}/main.bundle.js`,
  ]);

  // Instead of running Lighthouse, use LegacyJavascript directly. Requires some setup.
  // Much faster than running Lighthouse.
  const documentUrl = 'http://localhost/index.html';
  const scriptUrl = 'https://localhost/main.transpiled.js';
  const networkRecords = [
    { url: documentUrl },
    { url: scriptUrl },
  ];
  const devtoolsLogs = networkRecordsToDevtoolsLog(networkRecords);
  const jsRequestWillBeSentEvent = devtoolsLogs.find(e =>
    e.method === 'Network.requestWillBeSent' && e.params.request.url === scriptUrl);
  if (!jsRequestWillBeSentEvent) throw new Error('jsRequestWillBeSentEvent is undefined');
  // @ts-ignore
  const jsRequestId = jsRequestWillBeSentEvent.params.requestId;
  /** @type {Pick<LH.Artifacts, 'devtoolsLogs'|'URL'|'ScriptElements'>} */
  const artifacts = {
    URL: { finalUrl: documentUrl, requestedUrl: documentUrl },
    devtoolsLogs: {
      [LegacyJavascript.DEFAULT_PASS]: devtoolsLogs,
    },
    ScriptElements: [
      // @ts-ignore
      { requestId: jsRequestId, content: fs.readFileSync(`${dir}/main.bundle.js`, 'utf-8').toString() },
    ],
  };
  // @ts-ignore: partial Artifacts.
  const legacyJavascriptResults = await LegacyJavascript.audit(artifacts, {
    computedCache: new Map(),
  });
  fs.writeFileSync(`${dir}/legacy-javascript.json`,
    JSON.stringify(legacyJavascriptResults.details.items, null, 2));
}

function printSummary() {
  const table = [];
  for (const dir of glob.sync('*', {cwd: VARIANT_DIR})) {
    const legacyJavascript = require(`${VARIANT_DIR}/${dir}/legacy-javascript.json`);
    // @ts-ignore
    const signals = legacyJavascript.reduce((acc, cur) => {
      return acc.concat(cur.signals);
    }, []).join(', ');
    table.push({name: dir, signals});
  }
  console.table(table);
}

async function main() {
  for (const plugin of plugins) {
    await createVariant({
      name: `only-${plugin}`,
      code: mainCode,
      babelrc: {
        plugins: [plugin],
      },
    })
  }

  for (const esmodules of [true, false]) {
    await createVariant({
      name: `preset-env-esmodules-${esmodules}`,
      code: mainCode,
      babelrc: {
        presets: [
          [
            "@babel/preset-env",
            {
              targets: { esmodules },
              useBuiltIns: "entry"
            }
          ]
        ]
      },
    });
  }

  for (const polyfill of polyfills) {
    await createVariant({
      name: `core-js-${polyfill}`,
      code: `require("core-js/modules/${polyfill}")`,
    });
  }

  printSummary();
}

main();
