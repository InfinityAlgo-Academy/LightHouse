const ConfigV2 = require('../../config/v2/config');

class ReportGeneratorV2 {
  _arithmeticMean(items) {
    const results = items.reduce((result, item) => {
      const score = Number(item.score) || 0;
      const weight = Number(item.weight) || 0;
      return {
        weight: result.weight + weight,
        sum: result.sum + score * weight,
      };
    }, {weight: 0, sum: 0});

    return (results.sum / results.weight) || 0;
  }

  _geometricMean(items) {
    const results = items.reduce((result, item) => {
      const score = Number(item.score) || 0;
      const weight = Number(item.weight) || 0;
      return {
        weight: result.weight + weight,
        product: result.product * Math.max(Math.pow(score, weight), 1),
      };
    }, {weight: 0, product: 1});

    return Math.pow(results.product, 1 / results.weight) || 0;
  }

  generateReportJson(config, resultsByAuditId) {
    const categories = ConfigV2.objectToList(config.report.categories).map(category => {
      const children = category.children.map(item => {
        const result = resultsByAuditId[item.id];
        let score = Number(result.score) || 0;
        if (typeof result.score === 'boolean') {
          score = result.score ? 100 : 0;
        }

        return Object.assign({}, item, {result, score});
      });

      const score = this._arithmeticMean(children);
      return Object.assign({}, category, {children, score});
    });

    const scoreByCategory = categories.reduce((scores, category) => {
      scores[category.id] = category.score;
      return scores;
    }, {});

    const score = this._geometricMean([
      {score: scoreByCategory.pwa, weight: 5},
      {score: scoreByCategory.performance, weight: 5},
      {score: scoreByCategory.accessibility, weight: 4},
    ]);
    return {score, categories};
  }
}

module.exports = ReportGeneratorV2;
