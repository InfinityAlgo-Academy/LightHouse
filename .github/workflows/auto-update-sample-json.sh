set +ex

yarn update:sample-json

git config --global user.email "nobody@example.com"
git config --global user.name "GitHub Action"

git remote add github "https://$GITHUB_ACTOR:$GITHUB_TOKEN@github.com/$GITHUB_REPOSITORY.git"
git pull github ${GITHUB_REF} --ff-only

git add \
	lighthouse-core/lib/i18n/locales/en-US.json \
	lighthouse-core/lib/i18n/locales/en-XL.json \
	lighthouse-core/test/results/sample_v2.json \
	proto/sample_v2_round_trip.json

git commit -m "Update sample json"
git push github HEAD:${GITHUB_REF}
