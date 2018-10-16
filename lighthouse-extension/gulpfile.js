// generated on 2016-03-19 using generator-chrome-extension 0.5.4

'use strict';

const fs = require('fs');
const path = require('path');
// HACK: patch astw before it's required to use acorn with ES2018
// We add the right acorn version to package.json deps, resolve the path to it here,
// and then inject the modified require statement into astw's code.
// see https://github.com/GoogleChrome/lighthouse/issues/5152
const acornPath = require.resolve('acorn');
const astwPath = require.resolve('astw/index.js');
const astwOriginalContent = fs.readFileSync(astwPath, 'utf8');
const astwPatchedContent = astwOriginalContent
  .replace('ecmaVersion: opts.ecmaVersion || 8', 'ecmaVersion: 2018')
  .replace(`require('acorn')`, `require(${JSON.stringify(acornPath)})`);
fs.writeFileSync(astwPath, astwPatchedContent);

const del = require('del');
const gutil = require('gulp-util');
const runSequence = require('run-sequence');
const gulp = require('gulp');
const browserify = require('browserify');
const debug = require('gulp-debug');
const eslint = require('gulp-eslint');
const livereload = require('gulp-livereload');
const babel = require('babel-core');
const tap = require('gulp-tap');
const zip = require('gulp-zip');
const gulpReplace = require('gulp-replace');
const header = require('gulp-header');
const LighthouseRunner = require('../lighthouse-core/runner');
const pkg = require('../package.json');

const distDir = 'dist';

// list of all consumers we build for (easier to understand which file is used for which)
const CONSUMERS = {
  DEVTOOLS: {
    src: 'devtools-entry.js',
    dist: 'lighthouse-dt-bundle.js',
  },
  EXTENSION: {
    src: 'extension-entry.js',
    dist: 'lighthouse-ext-bundle.js',
  },
  LIGHTRIDER: {
    src: 'lightrider-entry.js',
    dist: 'lighthouse-lr-bundle.js',
  },
};

const VERSION = pkg.version;
const COMMIT_HASH = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim();

const BANNER = `// lighthouse, browserified. ${VERSION} (${COMMIT_HASH})\n`;

const audits = LighthouseRunner.getAuditList()
    .map(f => '../lighthouse-core/audits/' + f.replace(/\.js$/, ''));

const gatherers = LighthouseRunner.getGathererList()
    .map(f => '../lighthouse-core/gather/gatherers/' + f.replace(/\.js$/, ''));

const locales = fs.readdirSync('../lighthouse-core/lib/i18n/locales/')
    .map(f => require.resolve(`../lighthouse-core/lib/i18n/locales/${f}`));

const isDevtools = file =>
  file.endsWith(CONSUMERS.DEVTOOLS.src);
const isExtension = file =>
  file.endsWith(CONSUMERS.EXTENSION.src);

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    'app/_locales/**',
    'app/pages/**',
    '!app/src',
    '!app/.DS_Store',
    '!app/*.json',
    '!app/*.html',
  ], {
    base: 'app',
    dot: true,
  })
  .pipe(debug({title: 'copying to dist:'}))
  .pipe(gulp.dest(distDir));
});

gulp.task('lint', () => {
  return gulp.src([
    'app/src/**/*.js',
    'gulpfile.js',
  ])
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe(gulp.dest(`${distDir}/images`));
});

gulp.task('css', () => {
  return gulp.src('app/styles/**/*.css')
  .pipe(gulp.dest(`${distDir}/styles`));
});

gulp.task('html', () => {
  return gulp.src('app/*.html')
  .pipe(gulp.dest(distDir));
});

gulp.task('chromeManifest', () => {
  return gulp.src('app/manifest.json')
  .pipe(gulp.dest(distDir));
});

function applyBrowserifyTransforms(bundle) {
  // Transform the fs.readFile etc into inline strings.
  return bundle.transform('brfs', {global: true, parserOpts: {ecmaVersion: 9}})
  // Strip everything out of package.json includes except for the version.
  .transform('package-json-versionify');
}

gulp.task('browserify', () => {
  const consumerSources = Object.values(CONSUMERS).map(consumer => `app/src/${consumer.src}`);
  return gulp.src(consumerSources, {read: false})
    .pipe(tap(file => {
      let bundle = browserify(file.path); // , {debug: true}); // for sourcemaps
      bundle = applyBrowserifyTransforms(bundle);

      // scripts will need some additional transforms, ignores and requires…
      bundle.ignore('source-map')
      .ignore('debug/node')
      .ignore('intl')
      .ignore('raven')
      .ignore('mkdirp')
      .ignore('rimraf')
      .ignore('pako/lib/zlib/inflate.js');

      // Don't include the desktop protocol connection.
      bundle.ignore(require.resolve('../lighthouse-core/gather/connections/cri.js'));

      // Prevent the DevTools background script from getting the stringified HTML.
      if (isDevtools(file.path)) {
        bundle.ignore(require.resolve('../lighthouse-core/report/html/html-report-assets.js'));
      }

      if (isDevtools(file.path) || isExtension(file.path)) {
        bundle.ignore(locales);
      }

      // Expose the audits, gatherers, and computed artifacts so they can be dynamically loaded.
      const corePath = '../lighthouse-core/';
      const driverPath = `${corePath}gather/`;
      audits.forEach(audit => {
        bundle = bundle.require(audit, {expose: audit.replace(corePath, '../')});
      });
      gatherers.forEach(gatherer => {
        bundle = bundle.require(gatherer, {expose: gatherer.replace(driverPath, '../gather/')});
      });

      // browerify's url shim doesn't work with .URL in node_modules,
      // and within robots-parser, it does `var URL = require('url').URL`, so we expose our own.
      // @see https://github.com/GoogleChrome/lighthouse/issues/5273
      const pathToURLShim = require.resolve('../lighthouse-core/lib/url-shim.js');
      bundle = bundle.require(pathToURLShim, {expose: 'url'});

      // Inject the new browserified contents back into our gulp pipeline
      file.contents = bundle.bundle();
    }))
    .pipe(debug({title: ''}))
    .pipe(tap(file => {
      // rename our bundles
      const basename = path.basename(file.path);

      // find the dist file of the given file
      const consumer = Object.values(CONSUMERS)
        .find(consumer => consumer.src === basename);

      file.path = file.path.replace(consumer.src, consumer.dist);
    }))
    .pipe(debug({title: 'renamed into:'}))
    .pipe(gulp.dest('app/scripts'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('js-other', () => {
  return gulp.src([
    'app/src/popup.js',
  ])
    .pipe(gulpReplace('__COMMITHASH__', COMMIT_HASH))
    .pipe(gulp.dest('app/scripts'))
    .pipe(gulp.dest(`${distDir}/scripts`));
});

gulp.task('compilejs', () => {
  const opts = {
    compact: true, // Do not include superfluous whitespace characters and line terminators.
    retainLines: true, // Keep things on the same line (looks wonky but helps with stacktraces)
    comments: false, // Don't output comments
    shouldPrintComment: _ => false, // Don't include @license or @preserve comments either
    plugins: [
      'syntax-object-rest-spread',
    ],
    // sourceMaps: 'both'
  };

  const compiledSources = Object.values(CONSUMERS).map(consumer => `dist/scripts/${consumer.dist}`);
  return gulp.src(compiledSources)
    .pipe(tap(file => {
      const minified = babel.transform(file.contents.toString(), opts).code;
      file.contents = new Buffer(minified);
      return file;
    }))
    .pipe(header(BANNER))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('clean', () => {
  return del(['.tmp', distDir, 'app/scripts']).then(paths =>
    paths.forEach(path => gutil.log('deleted:', gutil.colors.blue(path)))
  );
});

gulp.task('watch', ['browserify', 'other-js', 'html'], () => {
  livereload.listen();

  gulp.watch([
    'app/*.html',
    'app/scripts/**/*.js',
    'app/images/**/*',
    'app/styles/**/*',
    'app/_locales/**/*.json',
    'node_modules/lighthouse-core/**/*.js',
  ]).on('change', livereload.reload);

  gulp.watch([
    '*.js',
    'app/src/**/*.js',
    '../lighthouse-core/**/*.js',
  ], ['browserify']);
});

gulp.task('package', function() {
  const manifest = require(`./${distDir}/manifest.json`);

  return del([
    `${distDir}/scripts/${CONSUMERS.DEVTOOLS.dist}`,
    `${distDir}/scripts/${CONSUMERS.LIGHTRIDER.dist}`,
  ])
    .then(paths =>
      paths.forEach(path => gutil.log('deleted:', gutil.colors.blue(path))))
    .then(() =>
      gulp.src(`${distDir}/**`)
          .pipe(zip(`lighthouse-${manifest.version}.zip`))
          .pipe(gulp.dest('package'))
    );
});

gulp.task('build', cb => {
  runSequence(
    'lint', 'browserify', 'chromeManifest',
    ['html', 'images', 'css', 'extras', 'js-other'], cb);
});

gulp.task('build:production', cb => {
  runSequence('build', 'compilejs', cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
