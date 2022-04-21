'use strict';

import pwaTrace from './traces/progressive-app-m60.json';
import pwaDevtoolsLog from './traces/progressive-app-m60.devtools.log.json';
import iframeTrace from './traces/iframe-m79.trace.json';
import iframeDevtoolsLog from './traces/iframe-m79.devtoolslog.json';
import {getURLArtifactFromDevtoolsLog} from '../test-utils.js';

/**
 * @param {any} trace
 * @param {any} devtoolsLog
 */
function fixture(trace, devtoolsLog) {
  return {
    trace: /** @type {LH.Trace} */ (trace),
    devtoolsLog: /** @type {LH.DevtoolsLog} */ (devtoolsLog),
    URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
  };
}

export const pwa = fixture(pwaTrace, pwaDevtoolsLog);
export const iframe = fixture(iframeTrace, iframeDevtoolsLog);
