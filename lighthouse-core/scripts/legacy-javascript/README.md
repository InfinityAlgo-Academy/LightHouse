Run:

```sh
yarn install
node run.js
```

Update sizes:

```sh
for d in variants/* ; do
  echo "$d"
  wc -c "$d"/*/main.bundle.js | sort -hr
  echo -e "\n"
done > summary-sizes.txt
```
