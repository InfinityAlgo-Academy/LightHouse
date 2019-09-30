# Lantern Collect Traces

Collects many traces using a local machine and mobile devices via WPT.

There are 9 runs for each URL in the big zip. The golden zip contains just the median runs (by performance score), along with a dump of the `metrics` collected by Lighthouse.

[Download all](https://drive.google.com/file/d/1vowczOByYoLFPcCON1wOUMVyD6IX_K0P/view?usp=sharing) traces (3.2GB zipped, 19GB unzipped).
[Download golden](https://drive.google.com/file/d/1WZ0hxoMfpKNQ6zwDLiirBspWwHlSHLNv/view?usp=sharing) traces (363MB zipped, 2.1GB unzipped).

## Get a WPT key

http://www.webpagetest.org/getkey.php -> "Login with Google" -> fill form. Key will be emailed to you.

## Lighthouse Version

Check what version of Lighthouse WPT is using. You should use the same version of lighthouse for the desktop collection.

## Verify URLs

```sh
node -e "console.log(require('./urls.js').join('\n'))" |\
  xargs -P 10 -I{} curl -o /dev/null -s --write-out '%{http_code} {} (if redirect: %{redirect_url})\n' {} |\
  sort
```

Note: some good URLs will 4xx b/c the site blocks such usages of `curl`.

## Run

```sh
DEBUG=1 WPT_KEY=... NUM_SAMPLES=9 node collect.js
```

Output will be in `dist/collect-lantern-traces`, and zipped at `dist/collect-lantern-traces.zip`.

```sh
node golden.js
```

Output will be in `dist/golden-lantern-traces`, and zipped at `dist/golden-lantern-traces.zip`.

Update the zips on Google Drive and `download-traces.sh`.
