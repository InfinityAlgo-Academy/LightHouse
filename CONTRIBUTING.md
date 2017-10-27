# For Contributors

We'd love your help! This doc covers how to become a contributor and submit code to the project.

## Follow the coding style

The `.eslintrc` file defines all. We use [JSDoc](http://usejsdoc.org/) along with [closure annotations](https://developers.google.com/closure/compiler/docs/js-for-compiler). Annotations are encouraged for all contributions.

## Pull request titles

We're using [conventional-commit](https://conventionalcommits.org/) for our commit messages. Since all PRs are squashed, we enforce this format for PR titles rather than individual git commits. A [`commitlint` bot](https://github.com/paulirish/commitlintbot) will update the status of your PR based on the title's conformance. The expected format is:

> type(scope): message subject

* The `type` must be one of: `new_audit` `core` `tests` `docs` `deps` `report` `cli` `extension` `misc`. (See [`.cz-config`](https://github.com/GoogleChrome/lighthouse/blob/master/.cz-config.js#L13))
* The `scope` is optional, but recommended. Any string is allowed; it should indicate what the change affects.
* The `message subject` should be pithy and direct.

The [commitizen CLI](https://github.com/commitizen/cz-cli) can help to construct these commit messages.

## Learn about the architecture

See [Lighthouse Architecture](./docs/architecture.md), our overview and tour of the codebase.

## Sign the Contributor License Agreement

We'd love to accept your sample apps and patches! Before we can take them, we have to jump a couple of legal hurdles.

Please fill out either the individual or corporate Contributor License Agreement (CLA).

* If you are an individual writing original source code and you're sure you own the intellectual property, then you'll need to sign an [individual CLA](https://developers.google.com/open-source/cla/individual).
* If you work for a company that wants to allow you to contribute your work, then you'll need to sign a [corporate CLA](https://developers.google.com/open-source/cla/corporate).

Follow either of the two links above to access the appropriate CLA and instructions for how to sign and return it. Once we receive it, we'll be able to
accept your pull requests.

## Contributing a patch

If you have a contribution for our [documentation](https://developers.google.com/web/tools/lighthouse/), please submit it in the [WebFundamentals repo](https://github.com/google/WebFundamentals/tree/master/src/content/en/tools/lighthouse).

1. Submit an issue describing your proposed change to the repo in question.
1. The repo owner will respond to your issue promptly.
1. If your proposed change is accepted, and you haven't already done so, sign a Contributor License Agreement (see details above).
1. Fork the repo, develop and test your code changes.
1. Ensure that your code adheres to the existing style in the sample to which you are contributing.
1. Submit a pull request.

## helpText guidelines

Keep the `helpText` of an audit as short as possible. When a reference doc for the audit exists on
developers.google.com/web, the `helpText` should only explain *why* the user should care
about the audit, not *how* to fix it.

Do:

    Serve images that are smaller than the user's viewport to save cellular data and
    improve load time. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/oversized-images).

Don't:

    Serve images that are smaller than the user's viewport to save cellular data and
    improve load time. Consider using responsive images and client hints.

If no reference doc exists yet, then you can use the `helpText` as a stopgap for explaining
both why the audit is important and how to fix it.

## Tracking Errors

We track our errors in the wild with Sentry. In general, do not worry about wrapping your audits or gatherers in try/catch blocks and reporting every error that could possibly occur; `lighthouse-core/runner.js` and `lighthouse-core/gather/gather-runner.js` already catch and report any errors that occur while running a gatherer or audit, including errors fatal to the entire run. However, there are some situations when you might want to expliticly handle an error and report it to Sentry or wrap it to avoid reporting. Generally, you can interact with Sentry simply by requiring the `lighthouse-core/lib/sentry.js` file and call its methods. The module exports a delegate that will correctly handle the error reporting based on the user's opt-in preference and will simply no-op if they haven't so you don't need to check.


#### If you have an expected error that is recoverable but want to track how frequently it happens, *use Sentry.captureException*.

```js
const Sentry = require('./lighthouse-core/lib/sentry');

try {
  doRiskyThing();
} catch (err) {
  Sentry.captureException(err, {
    tags: {audit: 'audit-name'},
    level: 'warning',
  });
  doFallbackThing();
}
```

#### If you need to track a code path that doesn't necessarily mean an error occurred, *use Sentry.captureMessage*.

NOTE: If the message you're capturing is dynamic/based on user data or you need a stack trace, then create a fake error instead and use `Sentry.captureException` so that the instances will be grouped together in Sentry.

```js
const Sentry = require('./lighthouse-core/lib/sentry');

if (networkRecords.length === 1) {
  Sentry.captureMessage('Site only had 1 network request');
  return null;
} else {
  // do your thang
}
```

# For Maintainers

## Release guide

```sh
# * Install the latest. This also builds the cli, extension, and viewer *
yarn
yarn install-all

# * Bump it *
yarn version --no-git-tag-version
# then manually bump extension v in extension/app/manifest.json

# * Build it *
yarn build-all

# * Test err'thing *
echo "Test the CLI."
lighthouse --perf "chrome://version"
yarn smoke

echo "Test the extension"
# ...

echo "Test a fresh local install"
# (starting from lighthouse root...)
# npm pack
# cd ..; trash tmp; mkdir tmp; cd tmp
# npm init -y
# npm install ../lighthouse/lighthouse-<version>.tgz
# npm explore lighthouse -- npm run smoke
# npm explore lighthouse -- npm run smokehouse
# npm explore lighthouse -- npm run chrome # try the manual launcher
# npm explore lighthouse -- npm run fast -- http://example.com
# cd ..; rm -rf ./tmp;

echo "Test the lighthouse-viewer build"
# Manual test for now:
# Start a server in lighthouse-viewer/dist/ and open the page in a tab. You should see the viewer.
# Drop in a results.json or paste an existing gist url (e.g. https://gist.github.com/ebidel/b9fd478b5f40bf5fab174439dc18f83a).
# Check for errors!

# * Put up the PR *
echo "Branch and commit the version bump."
git co -b bumpv240
git c "2.4.0"
git tag -a v2.4.0 -m "v2.4.0"
echo "Generate a PR and get it merged."

# * Deploy-time *
cd lighthouse-extension; gulp package; cd ..
echo "Upload the package zip to CWS dev dashboard"

echo "Verify the npm package won't include unncessary files"
yarn global add irish-pub pkgfiles
irish-pub; pkgfiles;

echo "ship it"
npm publish
yarn deploy-viewer

echo "Use the GitHub web interface to tag the release"
echo "Generate the release notes, and update the release page"

# * Tell the world!!! *
echo "Inform various peoples"
```

### Canary release

```sh
# Pull latest in a clean non-dev clone.

yarn install-all

# Update manifest_canary.json w/ version bumps.

# branch and commit
git commmit -m "bump extension canary to 2.0.0.X"

npm version prerelease # this will commit


# overwrite extension's manifest w/ manifest_canary.

yarn build-all

cd lighthouse-extension/
gulp package
# upload zip to CWS and publish

# verify you build-all'd for the typescript compile
# ...

# publish to canary tag!
npm publish --tag canary
```
