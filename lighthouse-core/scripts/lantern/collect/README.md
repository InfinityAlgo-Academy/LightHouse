# Lantern Collect Traces

## Get a WPT key

http://www.webpagetest.org/getkey.php -> "Login with Google" -> fill form. Key will be emailed to you.

## Lighthouse Version

Check what version of Lighthouse WPT is using. You should use the same version of lighthouse for the desktop collection.

## Run

```sh
DEBUG=1 WPT_KEY=... node collect.js
```

Output will be in `dist/lantern-traces`. And archived at `dist/lantern-traces.zip`.
