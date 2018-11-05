/*
Details Element Polyfill 2.0.4
Copyright © 2018 Javan Makhmali
 */

// COMPAT: Remove when Edge supports <details>/<summary>

(function() {
  var addAttributesForSummary, eventIsSignificant, findClosestElementWithTagName, findElementsWithTagName, onTogglingTrigger, polyfillFocusAndARIA, polyfillProperties, polyfillStyles, polyfillToggle, polyfillToggleEvent, support, triggerToggle, triggerToggleIfToggled;

  // Exit early if we're not in a page
  // This line added by Lighthouse
  if (typeof document === 'undefined' || !('createElement' in document)) return;

  support = {
    element: (function() {
      var closedHeight, element, openedHeight, parent, ref;
      element = document.createElement("details");
      if (!("open" in element)) {
        return false;
      }
      element.innerHTML = "<summary>a</summary>b";
      element.setAttribute("style", "position: absolute; left: -9999px");
      parent = (ref = document.body) != null ? ref : document.documentElement;
      parent.appendChild(element);
      closedHeight = element.offsetHeight;
      element.open = true;
      openedHeight = element.offsetHeight;
      parent.removeChild(element);
      return closedHeight !== openedHeight;
    })(),
    toggleEvent: (function() {
      var element;
      element = document.createElement("details");
      return "ontoggle" in element;
    })()
  };

  if (support.element && support.toggleEvent) {
    return;
  }

  polyfillStyles = function() {
    return document.head.insertAdjacentHTML("afterbegin", "<style>@charset\"UTF-8\";details:not([open])>*:not(summary){display:none;}details>summary{display:block;}details>summary::before{content:\"►\";padding-right:0.3rem;font-size:0.6rem;cursor:default;}details[open]>summary::before{content:\"▼\";}</style>");
  };

  polyfillProperties = function() {
    var open, prototype, removeAttribute, setAttribute;
    prototype = document.createElement("details").constructor.prototype;
    setAttribute = prototype.setAttribute, removeAttribute = prototype.removeAttribute;
    open = Object.getOwnPropertyDescriptor(prototype, "open");
    return Object.defineProperties(prototype, {
      open: {
        get: function() {
          var ref;
          if (this.tagName === "DETAILS") {
            return this.hasAttribute("open");
          } else {
            return open != null ? (ref = open.get) != null ? ref.call(this) : void 0 : void 0;
          }
        },
        set: function(value) {
          var ref;
          if (this.tagName === "DETAILS") {
            if (value) {
              this.setAttribute("open", "");
            } else {
              this.removeAttribute("open");
            }
            return value;
          } else {
            return open != null ? (ref = open.set) != null ? ref.call(this, value) : void 0 : void 0;
          }
        }
      },
      setAttribute: {
        value: function(name, value) {
          return triggerToggleIfToggled(this, (function(_this) {
            return function() {
              return setAttribute.call(_this, name, value);
            };
          })(this));
        }
      },
      removeAttribute: {
        value: function(name) {
          return triggerToggleIfToggled(this, (function(_this) {
            return function() {
              return removeAttribute.call(_this, name);
            };
          })(this));
        }
      }
    });
  };

  polyfillToggle = function() {
    return onTogglingTrigger(function(element) {
      var summary;
      summary = element.querySelector("summary");
      if (element.hasAttribute("open")) {
        element.removeAttribute("open");
        return summary.setAttribute("aria-expanded", false);
      } else {
        element.setAttribute("open", "");
        return summary.setAttribute("aria-expanded", true);
      }
    });
  };

  polyfillFocusAndARIA = function() {
    var i, len, observer, ref, summary;
    ref = findElementsWithTagName(document.documentElement, "SUMMARY");
    for (i = 0, len = ref.length; i < len; i++) {
      summary = ref[i];
      addAttributesForSummary(summary);
    }
    if (typeof MutationObserver !== "undefined" && MutationObserver !== null) {
      observer = new MutationObserver(function(mutations) {
        var addedNodes, j, len1, results, target;
        results = [];
        for (j = 0, len1 = mutations.length; j < len1; j++) {
          addedNodes = mutations[j].addedNodes;
          results.push((function() {
            var k, len2, results1;
            results1 = [];
            for (k = 0, len2 = addedNodes.length; k < len2; k++) {
              target = addedNodes[k];
              results1.push((function() {
                var l, len3, ref1, results2;
                ref1 = findElementsWithTagName(target, "SUMMARY");
                results2 = [];
                for (l = 0, len3 = ref1.length; l < len3; l++) {
                  summary = ref1[l];
                  results2.push(addAttributesForSummary(summary));
                }
                return results2;
              })());
            }
            return results1;
          })());
        }
        return results;
      });
      return observer.observe(document.documentElement, {
        subtree: true,
        childList: true
      });
    } else {
      return document.addEventListener("DOMNodeInserted", function(event) {
        var j, len1, ref1, results;
        ref1 = findElementsWithTagName(event.target, "SUMMARY");
        results = [];
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          summary = ref1[j];
          results.push(addAttributesForSummary(summary));
        }
        return results;
      });
    }
  };

  addAttributesForSummary = function(summary, details) {
    if (details == null) {
      details = findClosestElementWithTagName(summary, "DETAILS");
    }
    summary.setAttribute("aria-expanded", details.hasAttribute("open"));
    if (!summary.hasAttribute("tabindex")) {
      summary.setAttribute("tabindex", "0");
    }
    if (!summary.hasAttribute("role")) {
      return summary.setAttribute("role", "button");
    }
  };

  polyfillToggleEvent = function() {
    var observer;
    if (typeof MutationObserver !== "undefined" && MutationObserver !== null) {
      observer = new MutationObserver(function(mutations) {
        var attributeName, i, len, ref, results, target;
        results = [];
        for (i = 0, len = mutations.length; i < len; i++) {
          ref = mutations[i], target = ref.target, attributeName = ref.attributeName;
          if (target.tagName === "DETAILS" && attributeName === "open") {
            results.push(triggerToggle(target));
          } else {
            results.push(void 0);
          }
        }
        return results;
      });
      return observer.observe(document.documentElement, {
        attributes: true,
        subtree: true
      });
    } else {
      return onTogglingTrigger(function(element) {
        var open;
        open = element.getAttribute("open");
        return setTimeout(function() {
          if (element.getAttribute("open") !== open) {
            return triggerToggle(element);
          }
        }, 1);
      });
    }
  };

  eventIsSignificant = function(event) {
    return !(event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.target.isContentEditable);
  };

  onTogglingTrigger = function(callback) {
    addEventListener("click", function(event) {
      var element, ref;
      if (eventIsSignificant(event) && event.which <= 1) {
        if (element = findClosestElementWithTagName(event.target, "SUMMARY")) {
          if (((ref = element.parentElement) != null ? ref.tagName : void 0) === "DETAILS") {
            return callback(element.parentElement);
          }
        }
      }
    }, false);
    return addEventListener("keydown", function(event) {
      var element, ref, ref1;
      if (eventIsSignificant(event) && ((ref = event.keyCode) === 13 || ref === 32)) {
        if (element = findClosestElementWithTagName(event.target, "SUMMARY")) {
          if (((ref1 = element.parentElement) != null ? ref1.tagName : void 0) === "DETAILS") {
            callback(element.parentElement);
            return event.preventDefault();
          }
        }
      }
    }, false);
  };

  findElementsWithTagName = function(root, tagName) {
    var elements;
    elements = [];
    if (root.nodeType === Node.ELEMENT_NODE) {
      if (root.tagName === tagName) {
        elements.push(root);
      }
      elements.push.apply(elements, root.getElementsByTagName(tagName));
    }
    return elements;
  };

  findClosestElementWithTagName = (function() {
    if (typeof Element.prototype.closest === "function") {
      return function(element, tagName) {
        return element.closest(tagName);
      };
    } else {
      return function(element, tagName) {
        while (element) {
          if (element.tagName === tagName) {
            return element;
          } else {
            element = element.parentNode;
          }
        }
      };
    }
  })();

  triggerToggle = function(element) {
    var event;
    event = document.createEvent("Events");
    event.initEvent("toggle", true, false);
    return element.dispatchEvent(event);
  };

  triggerToggleIfToggled = function(element, fn) {
    var open, result;
    open = element.getAttribute("open");
    result = fn();
    if (element.getAttribute("open") !== open) {
      triggerToggle(element);
    }
    return result;
  };

  if (!support.element) {
    polyfillStyles();
    polyfillProperties();
    polyfillToggle();
    polyfillFocusAndARIA();
  }

  if (support.element && !support.toggleEvent) {
    polyfillToggleEvent();
  }

}).call(this);
