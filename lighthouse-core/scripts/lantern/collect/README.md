# Lantern Collect Traces

[Download all](https://drive.google.com/file/d/1OJz1y5sBZQpRWLiCLbyourDTjuq9bOW3/view?usp=sharing) traces (3.5GB zipped, 20GB unzipped).
[Download golden](https://drive.google.com/file/d/1wj6mik7AIiOG30Fwd3zpWwl6i9f7Zr2B/view?usp=sharing) traces (362MB zipped, 2.1GB unzipped).

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
