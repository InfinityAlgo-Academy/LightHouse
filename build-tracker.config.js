// https://buildtracker.dev/docs/installation/#upload-your-builds

'use strict';

const Comparator = require('@build-tracker/comparator').default;
const ArtifactDelta = require('@build-tracker/comparator/dist/ArtifactDelta').default;
const {formatBytes} = require('@build-tracker/formatting');
const fetch = require('node-fetch');

const applicationUrl = 'https://lh-build-tracker.herokuapp.com';
const buildTrackerGithubToken = 'TODO SET THIS';


const createBuildComparisonUrl = (a, b) => `${applicationUrl}/builds/${a}/${b}`;

const postStatus = ({sha, state, targetUrl, description}, {buildTrackerGithubToken}) =>
  // https://developer.github.com/v3/repos/statuses/#create-a-status
  fetch(`https://api.github.com/repos/GoogleChrome/lighthouse/statuses/${sha}`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${buildTrackerGithubToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state,
      target_url: targetUrl,
      description,
      context: 'Build Tracker',
    }),
  }).then(response =>
    response.ok === false
      ? response.json().then(json => {
        throw new Error(
            `Response was not ok. Status: ${response.status}. Body: ${JSON.stringify(json)}`
        );
      })
      : Promise.resolve()
  );

const SIZE_KEY = 'stat';

// Copied from
// https://github.com/paularmstrong/build-tracker/blob/51b0a32d914c8c0cf11515eb2075923ffb42b399/src/comparator/src/index.ts#L136
const formatDelta = allArtifactDelta =>
  `${formatBytes(allArtifactDelta.sizes[SIZE_KEY])} (${(
    allArtifactDelta.percents[SIZE_KEY] * 100
  ).toFixed(1)}%)`;

const getDescriptionStats = (parentBuild, build) => {
  debugger;
  const parentBuildSum = parentBuild.getSum(parentBuild.artifactNames);
  const buildSum = build.getSum(build.artifactNames);
  const allArtifactDelta = new ArtifactDelta('All', [], buildSum, parentBuildSum, false);
  const formattedDelta = formatDelta(allArtifactDelta);
  const formattedTotalSize = formatBytes(buildSum[SIZE_KEY]);
  const descriptionStats = [`Change: ${formattedDelta}`, `Total: ${formattedTotalSize}`].join(' ');
  return descriptionStats;
};

// Based off of example at
// https://github.com/paularmstrong/build-tracker/blob/8f1df8ca248f5f96619c9b2ff14cd21c7f304522/docs/docs/guides/ci.md
const onCompare = data => {
  const {comparatorData} = data;
  const comparator = Comparator.deserialize(comparatorData);

  if (comparator.builds.length === 1) {
    // We need 2 builds to provide a useful comparison, so if there is only one build, we exit early.
    return Promise.reject(
      new Error(
        `Expected comparator to have exactly 2 builds, but it only has 1. This most likely means the base branch hasn't finished building yet. Retry this build when the base branch has finished building. Note you will need to push a new commit.`
      )
    );
  } else {
    const parentBuild = comparator.builds[0];
    const build = comparator.builds[1];
    const url = createBuildComparisonUrl(
      build.getMetaValue('parentRevision'),
      build.getMetaValue('revision')
    );

    const isSuccess = comparator.errors.length === 0;

    const descriptionStats = getDescriptionStats(parentBuild, build);

    const hasWarnings =
      comparator.unexpectedHashChanges.length > 1 || comparator.warnings.length > 1;

    const description = [hasWarnings ? '⚠️ See report.' : undefined, descriptionStats]
      .filter(s => s !== undefined)
      .join(' ');
    console.log({description});
    return postStatus(
      {
        // Note: we don't use the `build` revision because—in a pull request build—this will
        // represent a merge commit "between the source branch and the upstream branch". This commit
        // doesn't actually exist in the PR.
        // https://docs.travis-ci.com/user/pull-requests/#how-pull-requests-are-built
        sha: build.meta.revision,
        state: isSuccess ? 'success' : 'failure',
        targetUrl: url,
        description,
      },
      {
        buildTrackerGithubToken,
      }
    );
  }
};

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
  onCompare,
};

const tdata = {
  comparatorData:
    '{"artifactBudgets":{"*":[{"level":"error","sizeKey":"stat","type":"percentDelta","maximum":0.05}],"dist/extension-chrome/scripts/popup-bundle.js":[{"level":"warn","sizeKey":"gzip","type":"size","maximum":15000}],"dist/lightrider/lighthouse-lr-bundle.js":[{"level":"warn","sizeKey":"gzip","type":"size","maximum":1500000}],"dist/viewer/src/viewer.js":[{"level":"warn","sizeKey":"gzip","type":"size","maximum":65000}],"dist/lighthouse-dt-bundle.js":[{"level":"warn","sizeKey":"gzip","type":"size","maximum":470000}],"dist/lightrider/report-generator-bundle.js":[{"level":"warn","sizeKey":"gzip","type":"size","maximum":50000}]},"artifactFilters":[],"builds":[{"meta":{"author":"Paul Irish","branch":"master","subject":"core(config): keep full-page-screenshot in skipAudits case (#12645)\\n","revision":"4aea3d7fff23da289f8f811612b3a57dc14287e0","timestamp":1629149330,"parentRevision":"98eebdaf6daa82957cadd057b16ce680af226bc3"},"artifacts":[{"hash":"5700d053974c0e02c6016115b7fd41ae","name":"dist/lightrider/lighthouse-lr-bundle.js","sizes":{"gzip":2013148,"stat":10815684,"brotli":1322694}},{"hash":"7adad8898c358656fa7274f670830458","name":"dist/lighthouse-dt-bundle.js","sizes":{"gzip":2012559,"stat":10813538,"brotli":1321628}},{"hash":"e9c17c6110abc4dcad1a3843da6d5c33","name":"dist/gh-pages/viewer/src/bundled.js","sizes":{"gzip":82306,"stat":323571,"brotli":48806}},{"hash":"dcf456b446b25f3307574f0d88bc4db4","name":"dist/gh-pages/treemap/src/bundled.js","sizes":{"gzip":67098,"stat":281817,"brotli":56362}},{"hash":"0912bc88c5c7619997b2baf521327b91","name":"dist/lightrider/report-generator-bundle.js","sizes":{"gzip":44678,"stat":180560,"brotli":37020}},{"hash":"6fd36003cbd1159419b64968b9fafab5","name":"dist/dt-report-resources/report.js","sizes":{"gzip":28299,"stat":115108,"brotli":23926}},{"hash":"34f28f962afe8aff5810d944bfccb029","name":"dist/dt-report-resources/report-generator.js","sizes":{"gzip":2935,"stat":8185,"brotli":2428}}]},{"meta":{"author":"Paul Irish","branch":"btudpates","parentRevision":"4aea3d7fff23da289f8f811612b3a57dc14287e0","revision":"b5b93148ec68a0b08d0f28983d4f425f253915aa","subject":"log desc\\n","timestamp":1629219820},"artifacts":[{"name":"dist/lighthouse-dt-bundle.js","hash":"55f524540b1e44195ce8b5e85cd5eee4","sizes":{"stat":10813537,"gzip":2012402,"brotli":1322677}},{"name":"dist/dt-report-resources/report.js","hash":"6fd36003cbd1159419b64968b9fafab5","sizes":{"stat":115108,"gzip":28299,"brotli":23926}},{"name":"dist/dt-report-resources/report-generator.js","hash":"34f28f962afe8aff5810d944bfccb029","sizes":{"stat":8185,"gzip":2935,"brotli":2428}}]}],"groups":[]}',
  summary: [
    '⚠️: *dist/lighthouse-dt-bundle.js* failed the gzip budget size limit of 458.98 KiB by 1,506.25 KiB',
  ],
};

onCompare(tdata);
