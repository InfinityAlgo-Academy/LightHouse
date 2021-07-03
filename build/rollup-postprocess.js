const MagicString = require('magic-string');

let currentToken;
const replacer = (str, index) => currentToken[index];

module.exports = function postprocess(allReplacements) {
  return {
    name: 'postprocess',
    renderChunk(code, {sourceMap, format}) {
      const str = new MagicString(code);
      const replacements = typeof allReplacements === 'function' ? allReplacements({code, sourceMap, format}) : allReplacements;

      for (let i = 0; i < replacements.length; i++) {
        let [find, replace = ''] = replacements[i];
        if (typeof find === 'string') find = new RegExp(find);
        if (!find.global) {
          find = new RegExp(find.source, 'g' + String(find).split('/').pop());
        }

        let token;
        while (token = find.exec(code)) {
          let value;
          if (typeof replace === 'function') {
            value = replace.apply(null, token);
            if (value == null) value = '';
          } else {
            currentToken = token;
            value = replace.replace(/\$(\d+)/, replacer);
          }
          str.overwrite(token.index, token.index + token[0].length, value);
        }
      }

      return {
        code: str.toString(),
        map: sourceMap === false ? null : str.generateMap({hires: true}),
      };
    },
  };
};
