'use strict';

class DriverV2 {
  /** @param {import('puppeteer').Page} page */
  constructor(page) {
    this._page = page;
  }

  async connect() {
    this._session = await this._page.target().createCDPSession();
  }

  on(...params) {
    this._session.on(...params);
  }
  off(...params) {
    this._session.off(...params);
  }
  once(...params) {
    this._session.once(...params);
  }
  sendCommand(...params) {
    return this._session.send(...params);
  }
  evaluateAsync(s) {
    return this._page.evaluate(s);
  }
}

module.exports = DriverV2;
