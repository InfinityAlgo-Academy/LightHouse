/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global logger */

/**
 * Manages drag and drop file input for the page.
 */
class DragAndDrop {
  /**
   * @param {function(string): void} fileHandlerCallback Invoked when the user chooses a new file.
   */
  constructor(fileHandlerCallback) {
    const dropZone = document.querySelector('.drop_zone');
    if (!dropZone) {
      throw new Error('Drag and drop `.drop_zone` element not found in page');
    }

    this._dropZone = dropZone;
    this._fileHandlerCallback = fileHandlerCallback;
    this._dragging = false;

    this._addListeners();
  }

  /**
   * Reads a file and returns its content as a string.
   * @param {File} file
   * @return {Promise<string>}
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const result = /** @type {?string} */ (e.target && e.target.result);
        if (!result) {
          reject('Could not read file');
          return;
        }
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  _addListeners() {
    // The mouseleave event is more reliable than dragleave when the user drops
    // the file outside the window.
    document.addEventListener('mouseleave', _ => {
      if (!this._dragging) {
        return;
      }
      this._resetDraggingUI();
    });

    document.addEventListener('dragover', e => {
      e.stopPropagation();
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'; // Explicitly show as copy action.
      }
    });

    document.addEventListener('dragenter', _ => {
      this._dropZone.classList.add('dropping');
      this._dragging = true;
    });

    document.addEventListener('drop', e => {
      e.stopPropagation();
      e.preventDefault();

      this._resetDraggingUI();

      // Note, this ignores multiple files in the drop, only taking the first.
      if (e.dataTransfer) {
        this.readFile(e.dataTransfer.files[0]).then((str) => {
          this._fileHandlerCallback(str);
        }).catch(e => logger.error(e));
      }
    });
  }

  _resetDraggingUI() {
    this._dropZone.classList.remove('dropping');
    this._dragging = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DragAndDrop;
}
