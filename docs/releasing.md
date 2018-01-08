## Release guide for maintainers

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
lighthouse --perf "https://example.com"
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

# * Update changelog *
git fetch --tags
yarn changelog
# add new contributors, e.g. from
# git shortlog -s -e -n v2.3.0..HEAD

# * Put up the PR *
echo "Branch and commit the version bump."
git checkout -b bumpv240
git commit -am "2.4.0"
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
echo "Copy changelog to release notes and update the release page"

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
