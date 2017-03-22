'use strict';

class MyAudit {
  static get meta() {
    return {
      name: 'my-audit',
      requiredArtifacts: ['MyGatherer']
    };
  }

  static audit() {

  }
}

module.exports = MyAudit;
