// TODO: How to ignore everything here in tsc?

global.cdt = {};

require('./generated/common/ParsedURL.js');

Object.defineProperty(Array.prototype, 'upperBound', {
  /**
   * Return index of the leftmost element that is greater
   * than the specimen object. If there's no such element (i.e. all
   * elements are smaller or equal to the specimen) returns right bound.
   * The function works for sorted array.
   * When specified, |left| (inclusive) and |right| (exclusive) indices
   * define the search window.
   *
   * @param {!T} object
   * @param {function(!T,!S):number=} comparator
   * @param {number=} left
   * @param {number=} right
   * @return {number}
   * @this {Array.<!S>}
   * @template T,S
   */
  value: function(object, comparator, left, right) {
    function defaultComparator(a, b) {
      return a < b ? -1 : (a > b ? 1 : 0);
    }
    comparator = comparator || defaultComparator;
    let l = left || 0;
    let r = right !== undefined ? right : this.length;
    while (l < r) {
      const m = (l + r) >> 1;
      if (comparator(object, this[m]) >= 0) {
        l = m + 1;
      } else {
        r = m;
      }
    }
    return r;
  },
});

module.exports = {
  ...require('./generated/sdk/SourceMap.js'),
};

// @ts-ignore
global.cdt.SDK.TextSourceMap.prototype.findExactEntry = function(line, column) {
  // findEntry takes compiled locations and returns original locations.
  const entry = this.findEntry(line, column);
  // without an exact hit, we return no match
  const hitMyBattleShip = entry && entry.lineNumber === line;
  if (!entry || !hitMyBattleShip) {
    return {
      sourceColumnNumber: null,
      sourceLineNumber: null,
      name: null,
      sourceURL: null,
    };
  }
  return entry;
};
