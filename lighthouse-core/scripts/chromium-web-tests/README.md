# Chromium Web Tests

This runs the Chromium webtests using the devtools integration tester.

`webtests/` contains all of our Lighthouse webtests.

## Run

```sh
yarn build-devtools
node lighthouse-core/scripts/chromium-web-tests/test.sh

# Reset the results.
node lighthouse-core/scripts/chromium-web-tests/test.sh --reset-results
```

## How it works

Normally, running these webtests requires a full Chromium checkout. However, that takes much too long, so it wouldn't be feasible for daily development or CI. Instead, we:

1) Grab just the source files we need from the Chromium repos

`download-blink-tools.sh` downloads just the code needed to run `third_party/blink/tools/run_web_tests.py`. This includes

* `third_party/blink/tools`.
* `third_party/blink/web_tests/fast/harness`
* [`third_party/catapult/third_party/typ`](https://source.chromium.org/chromium/chromium/src/+/master:third_party/catapult/third_party/typ/)–necessary third party Python library

`run_web_tests.py` normally uses Apache to host the webtest resources while the tests run. However, Apache is a very heavy dependency, and doesn't work well in GitHub actions. The majority of how Apache is configured is unnecessary for our layout tests, so instead `npx http-server` is used. How the web server is launched is not configurable in `run_web_tests.py`, so instead we apply a small patch to skip its usage.

`run_web_tests.py` also verifies that `image_diff` has been built from the Chromium checkout. We don't need that in our tests, so we skip that check. It's only for screenshot tests.

`run_web_tests.py` requires a content shell binary. Instead of building it, we download it.

2) Download a prebuilt content shell (barebones Chromium that is used by webtests)

DevTools had a script for this, but it was removed. `download-content-shell.js` is from the old script, but with only the content shell downloading code and with a couple of minor changes.

3) Checkout DevTools frontend, roll Lighthouse, build, and extract inspector resources

To run the devtools webtests, `run_web_tests.py` requires the inspector resources (the output of the frontend build process). These files are actually included in the content shell download from before, but instead we want to build the currently checked out Lighthouse, roll to DevTools, build DevTools, and use the newly created inspector files.

`run_web_tests.py` normally serves these files by mounting the Chromium build folder for the DevTools output to the path `/inspector-sources` [1](https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/tools/blinkpy/web_tests/port/base.py;l=1280;drc=e8e4dcd1d1684251c33cda9b9fc93d7ea808e4bd) [2](https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/tools/blinkpy/web_tests/servers/apache_http.py;l=118;drc=32408e19204a7ffceebfe774d7e99f2041cf4338). Instead, we fetch the DevTools frontend, roll Lighthouse, build it, then copy the build output to the `inspector-sources` at the root of our `npx http-server` web server.

## TODO

* Keep LighthouseTestRunner here too.
* Implement `findMostRecentChromiumCommit` in `download-content-shell.js`
* Run smoke tests (started awhile ago [here](https://chromium-review.googlesource.com/c/chromium/src/+/1739566/3/third_party/blink/web_tests/http/tests/devtools/audits/audits-smoke-run.js)).

### FAQ

#### How to modify blink-tools.patch?

Simply make your changes in $BLINK_TOOLS_PATH, run `git diff | pbcopy` (copies to clipboard), and save the new patch as `blink-tools.patch`.

#### How does the python module `typ` get added to python sys path?

Via a [hack](https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/tools/blinkpy/web_tests/models/typ_types.py;l=7?q=add_typ_dir_to_sys_path).
