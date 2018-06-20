/*
 * Copyright (C) 2012 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// ADAPTED FROM https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/common/ResourceType.js

/* eslint-disable */

class ResourceType {
  /**
   * @param {string} name
   * @param {string} title
   * @param {string} category
   * @param {boolean} isTextType
   */
  constructor(name, title, category, isTextType) {
    this._name = name;
    this._title = title;
    this._category = category;
    this._isTextType = isTextType;
  }

  /**
   * @return {boolean}
   */
  isTextType() {
    return this._isTextType;
  }
};

/** @type {Record<LH.Crdp.Page.ResourceType, ResourceType>} */
ResourceType.TYPES = {
  XHR: new ResourceType('xhr', 'XHR', 'XHR', true),
  Fetch: new ResourceType('fetch', 'Fetch', 'XHR', true),
  EventSource: new ResourceType('eventsource', 'EventSource', 'XHR', true),
  Script: new ResourceType('script', 'Script', 'Script', true),
  Stylesheet: new ResourceType('stylesheet', 'Stylesheet', 'Stylesheet', true),
  Image: new ResourceType('image', 'Image', 'Image', false),
  Media: new ResourceType('media', 'Media', 'Media', false),
  Font: new ResourceType('font', 'Font', 'Font', false),
  Document: new ResourceType('document', 'Document', 'Document', true),
  TextTrack: new ResourceType('texttrack', 'TextTrack', 'Other', true),
  WebSocket: new ResourceType('websocket', 'WebSocket', 'WebSocket', false),
  Other: new ResourceType('other', 'Other', 'Other', false),
  Manifest: new ResourceType('manifest', 'Manifest', 'Manifest', true),
};

module.exports = ResourceType;
