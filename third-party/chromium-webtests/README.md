# Chromium Web Tests

These tests are rolled into the Chromium DevTools Frontend codebase. They "belong" to the devtools frontend, but are truly defined in this Lighthouse repo.

See `lighthouse-core/test/chromium-web-tests/README.md` for more.

## Sync

```sh
rsync -ahvz --exclude='OWNERS' ~/src/devtools/devtools-frontend/test/webtests/http/tests/devtools/lighthouse/ third-party/chromium-webtests/webtests/http/tests/devtools/lighthouse/
yarn && yarn build-devtools && yarn update:test-devtools
```
