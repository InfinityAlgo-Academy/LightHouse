const fs = require('fs');
const {execFileSync} = require('child_process');
const glob = require('glob');

const files = [
  'node_modules/chrome-devtools-frontend/front_end/sdk/SourceMap.js',
  'node_modules/chrome-devtools-frontend/front_end/common/ParsedURL.js',
];
const outDir = 'lighthouse-core/lib/cdt/generated';

execFileSync('node_modules/.bin/tsc', [
  '--allowJs',
  '--outDir',
  outDir,
  ...files,
]);

console.log('making modifications ...');

/** @type {[RegExp, string][]} */
const patterns = [
  [/self./g, ''],
  [/(SDK|Common)/g, 'globalThis.cdt.$1'],
];
for (const file of glob.sync(`${outDir}/**/*.js`)) {
  const code = fs.readFileSync(file, 'utf-8');
  const lines = code.match(/^.*(\r?\n|$)/mg) || [];
  const modifiedLines = lines.map((line, i) => {
    // don't modify jsdocs.
    if (/^\s*[/*]/.test(line)) {
      return line;
    }

    let newLine = line;
    let changed = false;
    for (const pattern of patterns) {
      if (!pattern[0].test(newLine)) continue;
      changed = true;
      newLine = newLine.replace(pattern[0], pattern[1]);
    }
    if (changed) {
      console.log(`${file}:${i}: ${line.trim()}`);
    }
    return newLine;
  });
  fs.writeFileSync(file, modifiedLines.join(''));
}
