// https://buildtracker.dev/docs/installation/#upload-your-builds

'use strict';

const Comparator = require('@build-tracker/comparator').default;
const last = (xs) => xs[xs.length - 1];

const applicationUrl = 'https://lh-build-tracker.herokuapp.com';
module.exports = {
  applicationUrl,
  // Budgets for these are expressed in https://github.com/paulirish/lh-build-tracker/blob/master/build-tracker.config.js
  artifacts: [
    'dist/lightrider/lighthouse-lr-bundle.js',
    'dist/extension/scripts/lighthouse-ext-bundle.js',
    'dist/lighthouse-dt-bundle.js',
    'dist/gh-pages/viewer/src/bundled.js',
    'dist/gh-pages/treemap/src/bundled.js',
    'dist/lightrider/report-generator-bundle.js',
    'dist/dt-report-resources/report.js',
    'dist/dt-report-resources/report-generator.js',
  ],
  onCompare: async (data) => {
    const {comparatorData, summary} = data;
    // Reconstruct a comparator from the serialized data
    const comparator = Comparator.deserialize(comparatorData);

    const build = last(comparator.builds);

    const table = comparator.toMarkdown({artifactFilter});
    const revisions = `${build.getMetaValue('parentRevision')}/${build.getMetaValue('revision')}`;
    const output = `${summary.join('\n')}

${table}

See the full comparison at [${applicationUrl}/builds/${revisions}](${applicationUrl}/builds/${revisions})`;

    // Post the constructed markdown as a comment
    console.log(output);
  },
};


// Filter out any rows from the markdown table that are not failing or did not have a hash change
const artifactFilter = (row) => {
  return row.some((cell) => {
    if (cell.type === 'delta') {
      return cell.failingBudgets.length > 0 || cell.hashChanged;
    }
    return false;
  });
};
