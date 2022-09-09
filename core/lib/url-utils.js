/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {LighthouseError} from './lh-error.js';

const ELLIPSIS = '\u2026';

const allowedProtocols = [
  'https:', 'http:', 'chrome:', 'chrome-extension:',
];

const SECURE_SCHEMES = ['data', 'https', 'wss', 'blob', 'chrome', 'chrome-extension', 'about',
  'filesystem'];
const SECURE_LOCALHOST_DOMAINS = ['localhost', '127.0.0.1'];
const NON_NETWORK_SCHEMES = [
  'blob', // @see https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
  'data', // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
  'intent', // @see https://developer.chrome.com/docs/multidevice/android/intents/
  'file', // @see https://en.wikipedia.org/wiki/File_URI_scheme
  'filesystem', // @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystem
];

// 25 most used tld plus one domains (aka public suffixes) from http archive.
// @see https://github.com/GoogleChrome/lighthouse/pull/5065#discussion_r191926212
// The canonical list is https://publicsuffix.org/learn/ but we're only using subset to conserve bytes
const listOfTlds = [
  'com', 'co', 'gov', 'edu', 'ac', 'org', 'go', 'gob', 'or', 'net', 'in', 'ne', 'nic', 'gouv',
  'web', 'spb', 'blog', 'jus', 'kiev', 'mil', 'wi', 'qc', 'ca', 'bel', 'on',
];

/**
 * There is fancy URL rewriting logic for the chrome://settings page that we need to work around.
 * Why? Special handling was added by Chrome team to allow a pushState transition between chrome:// pages.
 * As a result, the network URL (chrome://chrome/settings/) doesn't match the final document URL (chrome://settings/).
 * @param {string} url
 * @return {string}
 */
function rewriteChromeInternalUrl(url) {
  if (!url || !url.startsWith('chrome://')) return url;
  // Chrome adds a trailing slash to `chrome://` URLs, but the spec does not.
  //   https://github.com/GoogleChrome/lighthouse/pull/3941#discussion_r154026009
  if (url.endsWith('/')) url = url.replace(/\/$/, '');
  return url.replace(/^chrome:\/\/chrome\//, 'chrome://');
}

class UrlUtils {
  /**
   * @param {string} url
   * @return {boolean}
   */
  static isValid(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} urlA
   * @param {string} urlB
   * @return {boolean}
   */
  static hostsMatch(urlA, urlB) {
    try {
      return new URL(urlA).host === new URL(urlB).host;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} urlA
   * @param {string} urlB
   * @return {boolean}
   */
  static originsMatch(urlA, urlB) {
    try {
      return new URL(urlA).origin === new URL(urlB).origin;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} url
   * @return {?string}
   */
  static getOrigin(url) {
    try {
      const urlInfo = new URL(url);
      // check for both host and origin since some URLs schemes like data and file set origin to the
      // string "null" instead of the object
      return (urlInfo.host && urlInfo.origin) || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if rootDomains matches
   *
   * @param {string|URL} urlA
   * @param {string|URL} urlB
   */
  static rootDomainsMatch(urlA, urlB) {
    let urlAInfo;
    let urlBInfo;
    try {
      urlAInfo = UrlUtils.createOrReturnURL(urlA);
      urlBInfo = UrlUtils.createOrReturnURL(urlB);
    } catch (err) {
      return false;
    }

    if (!urlAInfo.hostname || !urlBInfo.hostname) {
      return false;
    }

    // get the string before the tld
    const urlARootDomain = UrlUtils.getRootDomain(urlAInfo);
    const urlBRootDomain = UrlUtils.getRootDomain(urlBInfo);

    return urlARootDomain === urlBRootDomain;
  }

  /**
   * @param {string|URL} url
   * @param {{numPathParts?: number, preserveQuery?: boolean, preserveHost?: boolean}=} options
   * @return {string}
   */
  static getURLDisplayName(url, options) {
    const parsedUrl = url instanceof URL ? url : new URL(url);

    // Closure optional properties aren't optional in tsc, so fallback needs undefined  values.
    options = options || {numPathParts: undefined, preserveQuery: undefined,
      preserveHost: undefined};
    const numPathParts = options.numPathParts !== undefined ? options.numPathParts : 2;
    const preserveQuery = options.preserveQuery !== undefined ? options.preserveQuery : true;
    const preserveHost = options.preserveHost || false;

    let name;

    if (parsedUrl.protocol === 'about:' || parsedUrl.protocol === 'data:') {
      // Handle 'about:*' and 'data:*' URLs specially since they have no path.
      name = parsedUrl.href;
    } else {
      name = parsedUrl.pathname;
      const parts = name.split('/').filter(part => part.length);
      if (numPathParts && parts.length > numPathParts) {
        name = ELLIPSIS + parts.slice(-1 * numPathParts).join('/');
      }

      if (preserveHost) {
        name = `${parsedUrl.host}/${name.replace(/^\//, '')}`;
      }
      if (preserveQuery) {
        name = `${name}${parsedUrl.search}`;
      }
    }

    const MAX_LENGTH = 64;
    if (parsedUrl.protocol !== 'data:') {
      // Always elide hexadecimal hash
      name = name.replace(/([a-f0-9]{7})[a-f0-9]{13}[a-f0-9]*/g, `$1${ELLIPSIS}`);
      // Also elide other hash-like mixed-case strings
      name = name.replace(/([a-zA-Z0-9-_]{9})(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9-_]{10,}/g,
        `$1${ELLIPSIS}`);
      // Also elide long number sequences
      name = name.replace(/(\d{3})\d{6,}/g, `$1${ELLIPSIS}`);
      // Merge any adjacent ellipses
      name = name.replace(/\u2026+/g, ELLIPSIS);

      // Elide query params first
      if (name.length > MAX_LENGTH && name.includes('?')) {
        // Try to leave the first query parameter intact
        name = name.replace(/\?([^=]*)(=)?.*/, `?$1$2${ELLIPSIS}`);

        // Remove it all if it's still too long
        if (name.length > MAX_LENGTH) {
          name = name.replace(/\?.*/, `?${ELLIPSIS}`);
        }
      }
    }

    // Elide too long names next
    if (name.length > MAX_LENGTH) {
      const dotIndex = name.lastIndexOf('.');
      if (dotIndex >= 0) {
        name = name.slice(0, MAX_LENGTH - 1 - (name.length - dotIndex)) +
          // Show file extension
          `${ELLIPSIS}${name.slice(dotIndex)}`;
      } else {
        name = name.slice(0, MAX_LENGTH - 1) + ELLIPSIS;
      }
    }

    return name;
  }

  /**
   * Limits data URIs to 100 characters, returns all other strings untouched.
   * @param {string} url
   * @return {string}
   */
  static elideDataURI(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'data:' ? url.slice(0, 100) : url;
    } catch (e) {
      return url;
    }
  }

  /**
   * Determine if url1 equals url2, ignoring URL fragments.
   * @param {string} url1
   * @param {string} url2
   * @return {boolean}
   */
  static equalWithExcludedFragments(url1, url2) {
    [url1, url2] = [url1, url2].map(rewriteChromeInternalUrl);
    try {
      const urla = new URL(url1);
      urla.hash = '';

      const urlb = new URL(url2);
      urlb.hash = '';

      return urla.href === urlb.href;
    } catch (e) {
      return false;
    }
  }

  /**
   * Determine if the url has a protocol that we're able to test
   * @param {string} url
   * @return {boolean}
   */
  static isProtocolAllowed(url) {
    try {
      const parsed = new URL(url);
      return allowedProtocols.includes(parsed.protocol);
    } catch (e) {
      return false;
    }
  }

  /**
   * Is the host localhost-enough to satisfy the "secure context" definition
   * https://github.com/GoogleChrome/lighthouse/pull/11766#discussion_r582340683
   * @param {string} hostname Either a `new URL(url).hostname` or a `networkRequest.parsedUrl.host`
   * @return {boolean}
   */
  static isLikeLocalhost(hostname) {
    // Any hostname terminating in `.localhost` is considered to be local.
    // https://w3c.github.io/webappsec-secure-contexts/#localhost
    // This method doesn't consider IPs that resolve to loopback, IPv6 or other loopback edgecases
    return SECURE_LOCALHOST_DOMAINS.includes(hostname) || hostname.endsWith('.localhost');
  }

  /**
   * @param {string} scheme
   * @return {boolean}
   */
  static isSecureScheme(scheme) {
    return SECURE_SCHEMES.includes(scheme);
  }

  /**
   * Use `NetworkRequest.isNonNetworkRequest(req)` if working with a request.
   * Note: the `protocol` field from CDP can be 'h2', 'http', (not 'https'!) or it'll be url's scheme.
   *   https://source.chromium.org/chromium/chromium/src/+/main:content/browser/devtools/protocol/network_handler.cc;l=598-611;drc=56d4a9a9deb30be73adcee8737c73bcb2a5ab64f
   * However, a `new URL(href).protocol` has a colon suffix.
   *   https://url.spec.whatwg.org/#dom-url-protocol
   * A URL's `scheme` is specced as the `protocol` sans-colon, but isn't exposed on a URL object.
   * This method can take all 3 of these string types as a parameter.
   * @param {string} protocol Either a networkRequest's `protocol` per CDP or a `new URL(href).protocol`
   * @return {boolean}
   */
  static isNonNetworkProtocol(protocol) {
    // Strip off any colon
    const urlScheme = protocol.includes(':') ? protocol.slice(0, protocol.indexOf(':')) : protocol;
    return NON_NETWORK_SCHEMES.includes(urlScheme);
  }

  /**
   * @param {string} src
   * @return {string|undefined}
   */
  static guessMimeType(src) {
    let url;
    try {
      url = new URL(src);
    } catch {
      return undefined;
    }

    if (url.protocol === 'data:') {
      const match = url.pathname.match(/^(image\/(png|jpeg|svg\+xml|webp|gif|avif))[;,]/);
      if (!match) return undefined;
      return match[1];
    }

    const match = url.pathname.toLowerCase().match(/\.(png|jpeg|jpg|svg|webp|gif|avif)$/);
    if (!match) return undefined;

    const ext = match[1];
    if (ext === 'svg') return 'image/svg+xml';
    if (ext === 'jpg') return 'image/jpeg';
    return `image/${ext}`;
  }

  /**
   * @param {string|undefined} url
   * @return {string}
   */
  static normalizeUrl(url) {
    // Verify the url is valid and that protocol is allowed
    if (url && this.isValid(url) && this.isProtocolAllowed(url)) {
      // Use canonicalized URL (with trailing slashes and such)
      return new URL(url).href;
    } else {
      throw new LighthouseError(LighthouseError.errors.INVALID_URL);
    }
  }

  /**
   * Split a URL into a file, hostname and origin for easy display.
   * @param {string} url
   * @return {{file: string, hostname: string, origin: string}}
   */
  static parseURL(url) {
    const parsedUrl = new URL(url);
    return {
      file: UrlUtils.getURLDisplayName(parsedUrl),
      hostname: parsedUrl.hostname,
      origin: parsedUrl.origin,
    };
  }

  /**
   * @param {string|URL} value
   * @return {!URL}
   */
  static createOrReturnURL(value) {
    if (value instanceof URL) {
      return value;
    }

    return new URL(value);
  }

  /**
   * Gets the tld of a domain
   *
   * @param {string} hostname
   * @return {string} tld
   */
  static getTld(hostname) {
    const tlds = hostname.split('.').slice(-2);

    if (!listOfTlds.includes(tlds[0])) {
      return `.${tlds[tlds.length - 1]}`;
    }

    return `.${tlds.join('.')}`;
  }

  /**
   * Returns a primary domain for provided hostname (e.g. www.example.com -> example.com).
   * @param {string|URL} url hostname or URL object
   * @return {string}
   */
  static getRootDomain(url) {
    const hostname = UrlUtils.createOrReturnURL(url).hostname;
    const tld = UrlUtils.getTld(hostname);

    // tld is .com or .co.uk which means we means that length is 1 to big
    // .com => 2 & .co.uk => 3
    const splitTld = tld.split('.');

    // get TLD + root domain
    return hostname.split('.').slice(-splitTld.length).join('.');
  }
}

UrlUtils.INVALID_URL_DEBUG_STRING =
    'Lighthouse was unable to determine the URL of some script executions. ' +
    'It\'s possible a Chrome extension or other eval\'d code is the source.';

export default UrlUtils;
