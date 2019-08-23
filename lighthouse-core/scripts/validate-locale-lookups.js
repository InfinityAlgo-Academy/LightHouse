const fs = require('fs');
const path = require('path');
const glob = require('glob');

const i18n = require('../lib/i18n/i18n.js');
const lookupClosestLocale = require('lookup-closest-locale');

const cldrAliasData = require('cldr-core/supplemental/aliases.json');
const cldrAliases = cldrAliasData.supplemental.metadata.alias.languageAlias;

const cldrParentsData = require('cldr-core/supplemental/parentLocales.json');
const cldrParentLocales = cldrParentsData.supplemental.parentLocales.parentLocale;


// const
// Object.entries(cldrAliases).forEach(([alias, entry]) => { if (locales[entry._replacement]) console.log(alias, entry) })

const lhLocales = glob
  .sync('./lighthouse-core/lib/i18n/locales/*.json')
  .filter(f => !f.includes('.ctc.json'))
  .map(filename => path.parse(filename).name);

//
// 1. Validate the locales we store are canonical and not an alias
//
const aliasExceptions = ['zh-HK', 'zh-TW']; // TC pipeline still uses these codes rather than the CLDR's preferred `zh-Hant-HK`, `zh-Hant-TW`

for (const localeCode of lhLocales) {
  if (Object.keys(cldrAliases).includes(localeCode) && !aliasExceptions.includes(localeCode)) {
    // TODO, assert/throw?
    console.error(localeCode, 'is considered an alias.', cldrAliases[localeCode]);
  }
}

//
// 2. generate subsetted list of aliases
//
const aliasesSubset = {};
Object.entries(cldrAliases).forEach(([alias, entry]) => {
  if (lhLocales.includes(entry._replacement)) {
    aliasesSubset[alias] = entry._replacement;
  }
});
console.log({aliasesSubset});
fs.writeFileSync(__dirname + '/../lib/i18n/cldrdata/aliases.json', JSON.stringify(aliasesSubset, null, 2));

//
// 3. generate subsetted list of parentLocales
//
const parentsSubset = {};
Object.entries(cldrParentLocales).forEach(([locale, parentLocale]) => {
//  debugger;
  const availableLocales = Object.fromEntries(lhLocales.map(loc => ([loc, 1])));
  const matchingLocale = lookupClosestLocale(parentLocale, availableLocales);
  if (matchingLocale) {
    parentsSubset[locale] = parentLocale;
  }
});

console.log({parentsSubset});
fs.writeFileSync(__dirname + '/../lib/i18n/cldrdata/parentLocales.json', JSON.stringify(parentsSubset, null, 2));


console.log('done', Date.now());
