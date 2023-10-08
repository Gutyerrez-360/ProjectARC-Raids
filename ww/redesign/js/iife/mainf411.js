var seagate = (function (exports) {
  'use strict';

  /* eslint-disable */
  // NOTE: Polyfill from https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
  (function () {
    if (typeof window.CustomEvent === 'function') return false;

    function CustomEvent(event, params) {
      params = params || {
        bubbles: false,
        cancelable: false,
        detail: null
      };
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    }

    window.CustomEvent = CustomEvent;
  })();

  function _typeof(obj) {
    "@babel/helpers - typeof";

    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  /**
   * Copyright 2016 Google Inc. All Rights Reserved.
   *
   * Licensed under the W3C SOFTWARE AND DOCUMENT NOTICE AND LICENSE.
   *
   *  https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
   *
   */
  (function () {

    if ((typeof window === "undefined" ? "undefined" : _typeof(window)) !== 'object') {
      return;
    } // Exit early if all IntersectionObserver and IntersectionObserverEntry
    // features are natively supported.


    if ('IntersectionObserver' in window && 'IntersectionObserverEntry' in window && 'intersectionRatio' in window.IntersectionObserverEntry.prototype) {
      // Minimal polyfill for Edge 15's lack of `isIntersecting`
      // See: https://github.com/w3c/IntersectionObserver/issues/211
      if (!('isIntersecting' in window.IntersectionObserverEntry.prototype)) {
        Object.defineProperty(window.IntersectionObserverEntry.prototype, 'isIntersecting', {
          get: function get() {
            return this.intersectionRatio > 0;
          }
        });
      }

      return;
    }
    /**
     * Returns the embedding frame element, if any.
     * @param {!Document} doc
     * @return {!Element}
     */


    function getFrameElement(doc) {
      try {
        return doc.defaultView && doc.defaultView.frameElement || null;
      } catch (e) {
        // Ignore the error.
        return null;
      }
    }
    /**
     * A local reference to the root document.
     */


    var document = function (startDoc) {
      var doc = startDoc;
      var frame = getFrameElement(doc);

      while (frame) {
        doc = frame.ownerDocument;
        frame = getFrameElement(doc);
      }

      return doc;
    }(window.document);
    /**
     * An IntersectionObserver registry. This registry exists to hold a strong
     * reference to IntersectionObserver instances currently observing a target
     * element. Without this registry, instances without another reference may be
     * garbage collected.
     */


    var registry = [];
    /**
     * The signal updater for cross-origin intersection. When not null, it means
     * that the polyfill is configured to work in a cross-origin mode.
     * @type {function(DOMRect|ClientRect, DOMRect|ClientRect)}
     */

    var crossOriginUpdater = null;
    /**
     * The current cross-origin intersection. Only used in the cross-origin mode.
     * @type {DOMRect|ClientRect}
     */

    var crossOriginRect = null;
    /**
     * Creates the global IntersectionObserverEntry constructor.
     * https://w3c.github.io/IntersectionObserver/#intersection-observer-entry
     * @param {Object} entry A dictionary of instance properties.
     * @constructor
     */

    function IntersectionObserverEntry(entry) {
      this.time = entry.time;
      this.target = entry.target;
      this.rootBounds = ensureDOMRect(entry.rootBounds);
      this.boundingClientRect = ensureDOMRect(entry.boundingClientRect);
      this.intersectionRect = ensureDOMRect(entry.intersectionRect || getEmptyRect());
      this.isIntersecting = !!entry.intersectionRect; // Calculates the intersection ratio.

      var targetRect = this.boundingClientRect;
      var targetArea = targetRect.width * targetRect.height;
      var intersectionRect = this.intersectionRect;
      var intersectionArea = intersectionRect.width * intersectionRect.height; // Sets intersection ratio.

      if (targetArea) {
        // Round the intersection ratio to avoid floating point math issues:
        // https://github.com/w3c/IntersectionObserver/issues/324
        this.intersectionRatio = Number((intersectionArea / targetArea).toFixed(4));
      } else {
        // If area is zero and is intersecting, sets to 1, otherwise to 0
        this.intersectionRatio = this.isIntersecting ? 1 : 0;
      }
    }
    /**
     * Creates the global IntersectionObserver constructor.
     * https://w3c.github.io/IntersectionObserver/#intersection-observer-interface
     * @param {Function} callback The function to be invoked after intersection
     *     changes have queued. The function is not invoked if the queue has
     *     been emptied by calling the `takeRecords` method.
     * @param {Object=} opt_options Optional configuration options.
     * @constructor
     */


    function IntersectionObserver(callback, opt_options) {
      var options = opt_options || {};

      if (typeof callback != 'function') {
        throw new Error('callback must be a function');
      }

      if (options.root && options.root.nodeType != 1) {
        throw new Error('root must be an Element');
      } // Binds and throttles `this._checkForIntersections`.


      this._checkForIntersections = throttle(this._checkForIntersections.bind(this), this.THROTTLE_TIMEOUT); // Private properties.

      this._callback = callback;
      this._observationTargets = [];
      this._queuedEntries = [];
      this._rootMarginValues = this._parseRootMargin(options.rootMargin); // Public properties.

      this.thresholds = this._initThresholds(options.threshold);
      this.root = options.root || null;
      this.rootMargin = this._rootMarginValues.map(function (margin) {
        return margin.value + margin.unit;
      }).join(' ');
      /** @private @const {!Array<!Document>} */

      this._monitoringDocuments = [];
      /** @private @const {!Array<function()>} */

      this._monitoringUnsubscribes = [];
    }
    /**
     * The minimum interval within which the document will be checked for
     * intersection changes.
     */


    IntersectionObserver.prototype.THROTTLE_TIMEOUT = 100;
    /**
     * The frequency in which the polyfill polls for intersection changes.
     * this can be updated on a per instance basis and must be set prior to
     * calling `observe` on the first target.
     */

    IntersectionObserver.prototype.POLL_INTERVAL = null;
    /**
     * Use a mutation observer on the root element
     * to detect intersection changes.
     */

    IntersectionObserver.prototype.USE_MUTATION_OBSERVER = true;
    /**
     * Sets up the polyfill in the cross-origin mode. The result is the
     * updater function that accepts two arguments: `boundingClientRect` and
     * `intersectionRect` - just as these fields would be available to the
     * parent via `IntersectionObserverEntry`. This function should be called
     * each time the iframe receives intersection information from the parent
     * window, e.g. via messaging.
     * @return {function(DOMRect|ClientRect, DOMRect|ClientRect)}
     */

    IntersectionObserver._setupCrossOriginUpdater = function () {
      if (!crossOriginUpdater) {
        /**
         * @param {DOMRect|ClientRect} boundingClientRect
         * @param {DOMRect|ClientRect} intersectionRect
         */
        crossOriginUpdater = function crossOriginUpdater(boundingClientRect, intersectionRect) {
          if (!boundingClientRect || !intersectionRect) {
            crossOriginRect = getEmptyRect();
          } else {
            crossOriginRect = convertFromParentRect(boundingClientRect, intersectionRect);
          }

          registry.forEach(function (observer) {
            observer._checkForIntersections();
          });
        };
      }

      return crossOriginUpdater;
    };
    /**
     * Resets the cross-origin mode.
     */


    IntersectionObserver._resetCrossOriginUpdater = function () {
      crossOriginUpdater = null;
      crossOriginRect = null;
    };
    /**
     * Starts observing a target element for intersection changes based on
     * the thresholds values.
     * @param {Element} target The DOM element to observe.
     */


    IntersectionObserver.prototype.observe = function (target) {
      var isTargetAlreadyObserved = this._observationTargets.some(function (item) {
        return item.element == target;
      });

      if (isTargetAlreadyObserved) {
        return;
      }

      if (!(target && target.nodeType == 1)) {
        throw new Error('target must be an Element');
      }

      this._registerInstance();

      this._observationTargets.push({
        element: target,
        entry: null
      });

      this._monitorIntersections(target.ownerDocument);

      this._checkForIntersections();
    };
    /**
     * Stops observing a target element for intersection changes.
     * @param {Element} target The DOM element to observe.
     */


    IntersectionObserver.prototype.unobserve = function (target) {
      this._observationTargets = this._observationTargets.filter(function (item) {
        return item.element != target;
      });

      this._unmonitorIntersections(target.ownerDocument);

      if (this._observationTargets.length == 0) {
        this._unregisterInstance();
      }
    };
    /**
     * Stops observing all target elements for intersection changes.
     */


    IntersectionObserver.prototype.disconnect = function () {
      this._observationTargets = [];

      this._unmonitorAllIntersections();

      this._unregisterInstance();
    };
    /**
     * Returns any queue entries that have not yet been reported to the
     * callback and clears the queue. This can be used in conjunction with the
     * callback to obtain the absolute most up-to-date intersection information.
     * @return {Array} The currently queued entries.
     */


    IntersectionObserver.prototype.takeRecords = function () {
      var records = this._queuedEntries.slice();

      this._queuedEntries = [];
      return records;
    };
    /**
     * Accepts the threshold value from the user configuration object and
     * returns a sorted array of unique threshold values. If a value is not
     * between 0 and 1 and error is thrown.
     * @private
     * @param {Array|number=} opt_threshold An optional threshold value or
     *     a list of threshold values, defaulting to [0].
     * @return {Array} A sorted list of unique and valid threshold values.
     */


    IntersectionObserver.prototype._initThresholds = function (opt_threshold) {
      var threshold = opt_threshold || [0];
      if (!Array.isArray(threshold)) threshold = [threshold];
      return threshold.sort().filter(function (t, i, a) {
        if (typeof t != 'number' || isNaN(t) || t < 0 || t > 1) {
          throw new Error('threshold must be a number between 0 and 1 inclusively');
        }

        return t !== a[i - 1];
      });
    };
    /**
     * Accepts the rootMargin value from the user configuration object
     * and returns an array of the four margin values as an object containing
     * the value and unit properties. If any of the values are not properly
     * formatted or use a unit other than px or %, and error is thrown.
     * @private
     * @param {string=} opt_rootMargin An optional rootMargin value,
     *     defaulting to '0px'.
     * @return {Array<Object>} An array of margin objects with the keys
     *     value and unit.
     */


    IntersectionObserver.prototype._parseRootMargin = function (opt_rootMargin) {
      var marginString = opt_rootMargin || '0px';
      var margins = marginString.split(/\s+/).map(function (margin) {
        var parts = /^(-?\d*\.?\d+)(px|%)$/.exec(margin);

        if (!parts) {
          throw new Error('rootMargin must be specified in pixels or percent');
        }

        return {
          value: parseFloat(parts[1]),
          unit: parts[2]
        };
      }); // Handles shorthand.

      margins[1] = margins[1] || margins[0];
      margins[2] = margins[2] || margins[0];
      margins[3] = margins[3] || margins[1];
      return margins;
    };
    /**
     * Starts polling for intersection changes if the polling is not already
     * happening, and if the page's visibility state is visible.
     * @param {!Document} doc
     * @private
     */


    IntersectionObserver.prototype._monitorIntersections = function (doc) {
      var win = doc.defaultView;

      if (!win) {
        // Already destroyed.
        return;
      }

      if (this._monitoringDocuments.indexOf(doc) != -1) {
        // Already monitoring.
        return;
      } // Private state for monitoring.


      var callback = this._checkForIntersections;
      var monitoringInterval = null;
      var domObserver = null; // If a poll interval is set, use polling instead of listening to
      // resize and scroll events or DOM mutations.

      if (this.POLL_INTERVAL) {
        monitoringInterval = win.setInterval(callback, this.POLL_INTERVAL);
      } else {
        addEvent(win, 'resize', callback, true);
        addEvent(doc, 'scroll', callback, true);

        if (this.USE_MUTATION_OBSERVER && 'MutationObserver' in win) {
          domObserver = new win.MutationObserver(callback);
          domObserver.observe(doc, {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true
          });
        }
      }

      this._monitoringDocuments.push(doc);

      this._monitoringUnsubscribes.push(function () {
        // Get the window object again. When a friendly iframe is destroyed, it
        // will be null.
        var win = doc.defaultView;

        if (win) {
          if (monitoringInterval) {
            win.clearInterval(monitoringInterval);
          }

          removeEvent(win, 'resize', callback, true);
        }

        removeEvent(doc, 'scroll', callback, true);

        if (domObserver) {
          domObserver.disconnect();
        }
      }); // Also monitor the parent.


      if (doc != (this.root && this.root.ownerDocument || document)) {
        var frame = getFrameElement(doc);

        if (frame) {
          this._monitorIntersections(frame.ownerDocument);
        }
      }
    };
    /**
     * Stops polling for intersection changes.
     * @param {!Document} doc
     * @private
     */


    IntersectionObserver.prototype._unmonitorIntersections = function (doc) {
      var index = this._monitoringDocuments.indexOf(doc);

      if (index == -1) {
        return;
      }

      var rootDoc = this.root && this.root.ownerDocument || document; // Check if any dependent targets are still remaining.

      var hasDependentTargets = this._observationTargets.some(function (item) {
        var itemDoc = item.element.ownerDocument; // Target is in this context.

        if (itemDoc == doc) {
          return true;
        } // Target is nested in this context.


        while (itemDoc && itemDoc != rootDoc) {
          var frame = getFrameElement(itemDoc);
          itemDoc = frame && frame.ownerDocument;

          if (itemDoc == doc) {
            return true;
          }
        }

        return false;
      });

      if (hasDependentTargets) {
        return;
      } // Unsubscribe.


      var unsubscribe = this._monitoringUnsubscribes[index];

      this._monitoringDocuments.splice(index, 1);

      this._monitoringUnsubscribes.splice(index, 1);

      unsubscribe(); // Also unmonitor the parent.

      if (doc != rootDoc) {
        var frame = getFrameElement(doc);

        if (frame) {
          this._unmonitorIntersections(frame.ownerDocument);
        }
      }
    };
    /**
     * Stops polling for intersection changes.
     * @param {!Document} doc
     * @private
     */


    IntersectionObserver.prototype._unmonitorAllIntersections = function () {
      var unsubscribes = this._monitoringUnsubscribes.slice(0);

      this._monitoringDocuments.length = 0;
      this._monitoringUnsubscribes.length = 0;

      for (var i = 0; i < unsubscribes.length; i++) {
        unsubscribes[i]();
      }
    };
    /**
     * Scans each observation target for intersection changes and adds them
     * to the internal entries queue. If new entries are found, it
     * schedules the callback to be invoked.
     * @private
     */


    IntersectionObserver.prototype._checkForIntersections = function () {
      if (!this.root && crossOriginUpdater && !crossOriginRect) {
        // Cross origin monitoring, but no initial data available yet.
        return;
      }

      var rootIsInDom = this._rootIsInDom();

      var rootRect = rootIsInDom ? this._getRootRect() : getEmptyRect();

      this._observationTargets.forEach(function (item) {
        var target = item.element;
        var targetRect = getBoundingClientRect(target);

        var rootContainsTarget = this._rootContainsTarget(target);

        var oldEntry = item.entry;

        var intersectionRect = rootIsInDom && rootContainsTarget && this._computeTargetAndRootIntersection(target, targetRect, rootRect);

        var newEntry = item.entry = new IntersectionObserverEntry({
          time: now(),
          target: target,
          boundingClientRect: targetRect,
          rootBounds: crossOriginUpdater && !this.root ? null : rootRect,
          intersectionRect: intersectionRect
        });

        if (!oldEntry) {
          this._queuedEntries.push(newEntry);
        } else if (rootIsInDom && rootContainsTarget) {
          // If the new entry intersection ratio has crossed any of the
          // thresholds, add a new entry.
          if (this._hasCrossedThreshold(oldEntry, newEntry)) {
            this._queuedEntries.push(newEntry);
          }
        } else {
          // If the root is not in the DOM or target is not contained within
          // root but the previous entry for this target had an intersection,
          // add a new record indicating removal.
          if (oldEntry && oldEntry.isIntersecting) {
            this._queuedEntries.push(newEntry);
          }
        }
      }, this);

      if (this._queuedEntries.length) {
        this._callback(this.takeRecords(), this);
      }
    };
    /**
     * Accepts a target and root rect computes the intersection between then
     * following the algorithm in the spec.
     * TODO(philipwalton): at this time clip-path is not considered.
     * https://w3c.github.io/IntersectionObserver/#calculate-intersection-rect-algo
     * @param {Element} target The target DOM element
     * @param {Object} targetRect The bounding rect of the target.
     * @param {Object} rootRect The bounding rect of the root after being
     *     expanded by the rootMargin value.
     * @return {?Object} The final intersection rect object or undefined if no
     *     intersection is found.
     * @private
     */


    IntersectionObserver.prototype._computeTargetAndRootIntersection = function (target, targetRect, rootRect) {
      // If the element isn't displayed, an intersection can't happen.
      if (window.getComputedStyle(target).display == 'none') return;
      var intersectionRect = targetRect;
      var parent = getParentNode(target);
      var atRoot = false;

      while (!atRoot && parent) {
        var parentRect = null;
        var parentComputedStyle = parent.nodeType == 1 ? window.getComputedStyle(parent) : {}; // If the parent isn't displayed, an intersection can't happen.

        if (parentComputedStyle.display == 'none') return null;

        if (parent == this.root || parent.nodeType ==
        /* DOCUMENT */
        9) {
          atRoot = true;

          if (parent == this.root || parent == document) {
            if (crossOriginUpdater && !this.root) {
              if (!crossOriginRect || crossOriginRect.width == 0 && crossOriginRect.height == 0) {
                // A 0-size cross-origin intersection means no-intersection.
                parent = null;
                parentRect = null;
                intersectionRect = null;
              } else {
                parentRect = crossOriginRect;
              }
            } else {
              parentRect = rootRect;
            }
          } else {
            // Check if there's a frame that can be navigated to.
            var frame = getParentNode(parent);
            var frameRect = frame && getBoundingClientRect(frame);

            var frameIntersect = frame && this._computeTargetAndRootIntersection(frame, frameRect, rootRect);

            if (frameRect && frameIntersect) {
              parent = frame;
              parentRect = convertFromParentRect(frameRect, frameIntersect);
            } else {
              parent = null;
              intersectionRect = null;
            }
          }
        } else {
          // If the element has a non-visible overflow, and it's not the <body>
          // or <html> element, update the intersection rect.
          // Note: <body> and <html> cannot be clipped to a rect that's not also
          // the document rect, so no need to compute a new intersection.
          var doc = parent.ownerDocument;

          if (parent != doc.body && parent != doc.documentElement && parentComputedStyle.overflow != 'visible') {
            parentRect = getBoundingClientRect(parent);
          }
        } // If either of the above conditionals set a new parentRect,
        // calculate new intersection data.


        if (parentRect) {
          intersectionRect = computeRectIntersection(parentRect, intersectionRect);
        }

        if (!intersectionRect) break;
        parent = parent && getParentNode(parent);
      }

      return intersectionRect;
    };
    /**
     * Returns the root rect after being expanded by the rootMargin value.
     * @return {ClientRect} The expanded root rect.
     * @private
     */


    IntersectionObserver.prototype._getRootRect = function () {
      var rootRect;

      if (this.root) {
        rootRect = getBoundingClientRect(this.root);
      } else {
        // Use <html>/<body> instead of window since scroll bars affect size.
        var html = document.documentElement;
        var body = document.body;
        rootRect = {
          top: 0,
          left: 0,
          right: html.clientWidth || body.clientWidth,
          width: html.clientWidth || body.clientWidth,
          bottom: html.clientHeight || body.clientHeight,
          height: html.clientHeight || body.clientHeight
        };
      }

      return this._expandRectByRootMargin(rootRect);
    };
    /**
     * Accepts a rect and expands it by the rootMargin value.
     * @param {DOMRect|ClientRect} rect The rect object to expand.
     * @return {ClientRect} The expanded rect.
     * @private
     */


    IntersectionObserver.prototype._expandRectByRootMargin = function (rect) {
      var margins = this._rootMarginValues.map(function (margin, i) {
        return margin.unit == 'px' ? margin.value : margin.value * (i % 2 ? rect.width : rect.height) / 100;
      });

      var newRect = {
        top: rect.top - margins[0],
        right: rect.right + margins[1],
        bottom: rect.bottom + margins[2],
        left: rect.left - margins[3]
      };
      newRect.width = newRect.right - newRect.left;
      newRect.height = newRect.bottom - newRect.top;
      return newRect;
    };
    /**
     * Accepts an old and new entry and returns true if at least one of the
     * threshold values has been crossed.
     * @param {?IntersectionObserverEntry} oldEntry The previous entry for a
     *    particular target element or null if no previous entry exists.
     * @param {IntersectionObserverEntry} newEntry The current entry for a
     *    particular target element.
     * @return {boolean} Returns true if a any threshold has been crossed.
     * @private
     */


    IntersectionObserver.prototype._hasCrossedThreshold = function (oldEntry, newEntry) {
      // To make comparing easier, an entry that has a ratio of 0
      // but does not actually intersect is given a value of -1
      var oldRatio = oldEntry && oldEntry.isIntersecting ? oldEntry.intersectionRatio || 0 : -1;
      var newRatio = newEntry.isIntersecting ? newEntry.intersectionRatio || 0 : -1; // Ignore unchanged ratios

      if (oldRatio === newRatio) return;

      for (var i = 0; i < this.thresholds.length; i++) {
        var threshold = this.thresholds[i]; // Return true if an entry matches a threshold or if the new ratio
        // and the old ratio are on the opposite sides of a threshold.

        if (threshold == oldRatio || threshold == newRatio || threshold < oldRatio !== threshold < newRatio) {
          return true;
        }
      }
    };
    /**
     * Returns whether or not the root element is an element and is in the DOM.
     * @return {boolean} True if the root element is an element and is in the DOM.
     * @private
     */


    IntersectionObserver.prototype._rootIsInDom = function () {
      return !this.root || containsDeep(document, this.root);
    };
    /**
     * Returns whether or not the target element is a child of root.
     * @param {Element} target The target element to check.
     * @return {boolean} True if the target element is a child of root.
     * @private
     */


    IntersectionObserver.prototype._rootContainsTarget = function (target) {
      return containsDeep(this.root || document, target) && (!this.root || this.root.ownerDocument == target.ownerDocument);
    };
    /**
     * Adds the instance to the global IntersectionObserver registry if it isn't
     * already present.
     * @private
     */


    IntersectionObserver.prototype._registerInstance = function () {
      if (registry.indexOf(this) < 0) {
        registry.push(this);
      }
    };
    /**
     * Removes the instance from the global IntersectionObserver registry.
     * @private
     */


    IntersectionObserver.prototype._unregisterInstance = function () {
      var index = registry.indexOf(this);
      if (index != -1) registry.splice(index, 1);
    };
    /**
     * Returns the result of the performance.now() method or null in browsers
     * that don't support the API.
     * @return {number} The elapsed time since the page was requested.
     */


    function now() {
      return window.performance && performance.now && performance.now();
    }
    /**
     * Throttles a function and delays its execution, so it's only called at most
     * once within a given time period.
     * @param {Function} fn The function to throttle.
     * @param {number} timeout The amount of time that must pass before the
     *     function can be called again.
     * @return {Function} The throttled function.
     */


    function throttle(fn, timeout) {
      var timer = null;
      return function () {
        if (!timer) {
          timer = setTimeout(function () {
            fn();
            timer = null;
          }, timeout);
        }
      };
    }
    /**
     * Adds an event handler to a DOM node ensuring cross-browser compatibility.
     * @param {Node} node The DOM node to add the event handler to.
     * @param {string} event The event name.
     * @param {Function} fn The event handler to add.
     * @param {boolean} opt_useCapture Optionally adds the even to the capture
     *     phase. Note: this only works in modern browsers.
     */


    function addEvent(node, event, fn, opt_useCapture) {
      if (typeof node.addEventListener == 'function') {
        node.addEventListener(event, fn, opt_useCapture || false);
      } else if (typeof node.attachEvent == 'function') {
        node.attachEvent('on' + event, fn);
      }
    }
    /**
     * Removes a previously added event handler from a DOM node.
     * @param {Node} node The DOM node to remove the event handler from.
     * @param {string} event The event name.
     * @param {Function} fn The event handler to remove.
     * @param {boolean} opt_useCapture If the event handler was added with this
     *     flag set to true, it should be set to true here in order to remove it.
     */


    function removeEvent(node, event, fn, opt_useCapture) {
      if (typeof node.removeEventListener == 'function') {
        node.removeEventListener(event, fn, opt_useCapture || false);
      } else if (typeof node.detatchEvent == 'function') {
        node.detatchEvent('on' + event, fn);
      }
    }
    /**
     * Returns the intersection between two rect objects.
     * @param {Object} rect1 The first rect.
     * @param {Object} rect2 The second rect.
     * @return {?Object|?ClientRect} The intersection rect or undefined if no
     *     intersection is found.
     */


    function computeRectIntersection(rect1, rect2) {
      var top = Math.max(rect1.top, rect2.top);
      var bottom = Math.min(rect1.bottom, rect2.bottom);
      var left = Math.max(rect1.left, rect2.left);
      var right = Math.min(rect1.right, rect2.right);
      var width = right - left;
      var height = bottom - top;
      return width >= 0 && height >= 0 && {
        top: top,
        bottom: bottom,
        left: left,
        right: right,
        width: width,
        height: height
      } || null;
    }
    /**
     * Shims the native getBoundingClientRect for compatibility with older IE.
     * @param {Element} el The element whose bounding rect to get.
     * @return {DOMRect|ClientRect} The (possibly shimmed) rect of the element.
     */


    function getBoundingClientRect(el) {
      var rect;

      try {
        rect = el.getBoundingClientRect();
      } catch (err) {// Ignore Windows 7 IE11 "Unspecified error"
        // https://github.com/w3c/IntersectionObserver/pull/205
      }

      if (!rect) return getEmptyRect(); // Older IE

      if (!(rect.width && rect.height)) {
        rect = {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.right - rect.left,
          height: rect.bottom - rect.top
        };
      }

      return rect;
    }
    /**
     * Returns an empty rect object. An empty rect is returned when an element
     * is not in the DOM.
     * @return {ClientRect} The empty rect.
     */


    function getEmptyRect() {
      return {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0
      };
    }
    /**
     * Ensure that the result has all of the necessary fields of the DOMRect.
     * Specifically this ensures that `x` and `y` fields are set.
     *
     * @param {?DOMRect|?ClientRect} rect
     * @return {?DOMRect}
     */


    function ensureDOMRect(rect) {
      // A `DOMRect` object has `x` and `y` fields.
      if (!rect || 'x' in rect) {
        return rect;
      } // A IE's `ClientRect` type does not have `x` and `y`. The same is the case
      // for internally calculated Rect objects. For the purposes of
      // `IntersectionObserver`, it's sufficient to simply mirror `left` and `top`
      // for these fields.


      return {
        top: rect.top,
        y: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        x: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height
      };
    }
    /**
     * Inverts the intersection and bounding rect from the parent (frame) BCR to
     * the local BCR space.
     * @param {DOMRect|ClientRect} parentBoundingRect The parent's bound client rect.
     * @param {DOMRect|ClientRect} parentIntersectionRect The parent's own intersection rect.
     * @return {ClientRect} The local root bounding rect for the parent's children.
     */


    function convertFromParentRect(parentBoundingRect, parentIntersectionRect) {
      var top = parentIntersectionRect.top - parentBoundingRect.top;
      var left = parentIntersectionRect.left - parentBoundingRect.left;
      return {
        top: top,
        left: left,
        height: parentIntersectionRect.height,
        width: parentIntersectionRect.width,
        bottom: top + parentIntersectionRect.height,
        right: left + parentIntersectionRect.width
      };
    }
    /**
     * Checks to see if a parent element contains a child element (including inside
     * shadow DOM).
     * @param {Node} parent The parent element.
     * @param {Node} child The child element.
     * @return {boolean} True if the parent node contains the child node.
     */


    function containsDeep(parent, child) {
      var node = child;

      while (node) {
        if (node == parent) return true;
        node = getParentNode(node);
      }

      return false;
    }
    /**
     * Gets the parent node of an element or its host element if the parent node
     * is a shadow root.
     * @param {Node} node The node whose parent to get.
     * @return {Node|null} The parent node or null if no parent exists.
     */


    function getParentNode(node) {
      var parent = node.parentNode;

      if (node.nodeType ==
      /* DOCUMENT */
      9 && node != document) {
        // If this node is a document node, look for the embedding frame.
        return getFrameElement(node);
      }

      if (parent && parent.nodeType == 11 && parent.host) {
        // If the parent is a shadow root, return the host element.
        return parent.host;
      }

      if (parent && parent.assignedSlot) {
        // If the parent is distributed in a <slot>, return the parent of a slot.
        return parent.assignedSlot.parentNode;
      }

      return parent;
    } // Exposes the constructors globally.


    window.IntersectionObserver = IntersectionObserver;
    window.IntersectionObserverEntry = IntersectionObserverEntry;
  })();

  if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
  }

  if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
      var el = this;

      do {
        if (Element.prototype.matches.call(el, s)) return el;
        el = el.parentElement || el.parentNode;
      } while (el !== null && el.nodeType === 1);

      return null;
    };
  }

  /**
   * @this {Promise}
   */
  function finallyConstructor(callback) {
    var constructor = this.constructor;
    return this.then(
      function(value) {
        // @ts-ignore
        return constructor.resolve(callback()).then(function() {
          return value;
        });
      },
      function(reason) {
        // @ts-ignore
        return constructor.resolve(callback()).then(function() {
          // @ts-ignore
          return constructor.reject(reason);
        });
      }
    );
  }

  function allSettled(arr) {
    var P = this;
    return new P(function(resolve, reject) {
      if (!(arr && typeof arr.length !== 'undefined')) {
        return reject(
          new TypeError(
            typeof arr +
              ' ' +
              arr +
              ' is not iterable(cannot read property Symbol(Symbol.iterator))'
          )
        );
      }
      var args = Array.prototype.slice.call(arr);
      if (args.length === 0) return resolve([]);
      var remaining = args.length;

      function res(i, val) {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then;
          if (typeof then === 'function') {
            then.call(
              val,
              function(val) {
                res(i, val);
              },
              function(e) {
                args[i] = { status: 'rejected', reason: e };
                if (--remaining === 0) {
                  resolve(args);
                }
              }
            );
            return;
          }
        }
        args[i] = { status: 'fulfilled', value: val };
        if (--remaining === 0) {
          resolve(args);
        }
      }

      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  }

  // Store setTimeout reference so promise-polyfill will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var setTimeoutFunc = setTimeout;

  function isArray(x) {
    return Boolean(x && typeof x.length !== 'undefined');
  }

  function noop() {}

  // Polyfill for Function.prototype.bind
  function bind(fn, thisArg) {
    return function() {
      fn.apply(thisArg, arguments);
    };
  }

  /**
   * @constructor
   * @param {Function} fn
   */
  function Promise$1(fn) {
    if (!(this instanceof Promise$1))
      throw new TypeError('Promises must be constructed via new');
    if (typeof fn !== 'function') throw new TypeError('not a function');
    /** @type {!number} */
    this._state = 0;
    /** @type {!boolean} */
    this._handled = false;
    /** @type {Promise|undefined} */
    this._value = undefined;
    /** @type {!Array<!Function>} */
    this._deferreds = [];

    doResolve(fn, this);
  }

  function handle(self, deferred) {
    while (self._state === 3) {
      self = self._value;
    }
    if (self._state === 0) {
      self._deferreds.push(deferred);
      return;
    }
    self._handled = true;
    Promise$1._immediateFn(function() {
      var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
        return;
      }
      var ret;
      try {
        ret = cb(self._value);
      } catch (e) {
        reject(deferred.promise, e);
        return;
      }
      resolve(deferred.promise, ret);
    });
  }

  function resolve(self, newValue) {
    try {
      // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self)
        throw new TypeError('A promise cannot be resolved with itself.');
      if (
        newValue &&
        (typeof newValue === 'object' || typeof newValue === 'function')
      ) {
        var then = newValue.then;
        if (newValue instanceof Promise$1) {
          self._state = 3;
          self._value = newValue;
          finale(self);
          return;
        } else if (typeof then === 'function') {
          doResolve(bind(then, newValue), self);
          return;
        }
      }
      self._state = 1;
      self._value = newValue;
      finale(self);
    } catch (e) {
      reject(self, e);
    }
  }

  function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
  }

  function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
      Promise$1._immediateFn(function() {
        if (!self._handled) {
          Promise$1._unhandledRejectionFn(self._value);
        }
      });
    }

    for (var i = 0, len = self._deferreds.length; i < len; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }

  /**
   * @constructor
   */
  function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, self) {
    var done = false;
    try {
      fn(
        function(value) {
          if (done) return;
          done = true;
          resolve(self, value);
        },
        function(reason) {
          if (done) return;
          done = true;
          reject(self, reason);
        }
      );
    } catch (ex) {
      if (done) return;
      done = true;
      reject(self, ex);
    }
  }

  Promise$1.prototype['catch'] = function(onRejected) {
    return this.then(null, onRejected);
  };

  Promise$1.prototype.then = function(onFulfilled, onRejected) {
    // @ts-ignore
    var prom = new this.constructor(noop);

    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
  };

  Promise$1.prototype['finally'] = finallyConstructor;

  Promise$1.all = function(arr) {
    return new Promise$1(function(resolve, reject) {
      if (!isArray(arr)) {
        return reject(new TypeError('Promise.all accepts an array'));
      }

      var args = Array.prototype.slice.call(arr);
      if (args.length === 0) return resolve([]);
      var remaining = args.length;

      function res(i, val) {
        try {
          if (val && (typeof val === 'object' || typeof val === 'function')) {
            var then = val.then;
            if (typeof then === 'function') {
              then.call(
                val,
                function(val) {
                  res(i, val);
                },
                reject
              );
              return;
            }
          }
          args[i] = val;
          if (--remaining === 0) {
            resolve(args);
          }
        } catch (ex) {
          reject(ex);
        }
      }

      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };

  Promise$1.allSettled = allSettled;

  Promise$1.resolve = function(value) {
    if (value && typeof value === 'object' && value.constructor === Promise$1) {
      return value;
    }

    return new Promise$1(function(resolve) {
      resolve(value);
    });
  };

  Promise$1.reject = function(value) {
    return new Promise$1(function(resolve, reject) {
      reject(value);
    });
  };

  Promise$1.race = function(arr) {
    return new Promise$1(function(resolve, reject) {
      if (!isArray(arr)) {
        return reject(new TypeError('Promise.race accepts an array'));
      }

      for (var i = 0, len = arr.length; i < len; i++) {
        Promise$1.resolve(arr[i]).then(resolve, reject);
      }
    });
  };

  // Use polyfill for setImmediate for performance gains
  Promise$1._immediateFn =
    // @ts-ignore
    (typeof setImmediate === 'function' &&
      function(fn) {
        // @ts-ignore
        setImmediate(fn);
      }) ||
    function(fn) {
      setTimeoutFunc(fn, 0);
    };

  Promise$1._unhandledRejectionFn = function _unhandledRejectionFn(err) {
    if (typeof console !== 'undefined' && console) {
      console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
    }
  };

  /** @suppress {undefinedVars} */
  var globalNS = (function() {
    // the only reliable means to get the global object is
    // `Function('return this')()`
    // However, this causes CSP violations in Chrome apps.
    if (typeof self !== 'undefined') {
      return self;
    }
    if (typeof window !== 'undefined') {
      return window;
    }
    if (typeof global !== 'undefined') {
      return global;
    }
    throw new Error('unable to locate global object');
  })();

  // Expose the polyfill if Promise is undefined or set to a
  // non-function value. The latter can be due to a named HTMLElement
  // being exposed by browsers for legacy reasons.
  // https://github.com/taylorhakes/promise-polyfill/issues/114
  if (typeof globalNS['Promise'] !== 'function') {
    globalNS['Promise'] = Promise$1;
  } else {
    if (!globalNS.Promise.prototype['finally']) {
      globalNS.Promise.prototype['finally'] = finallyConstructor;
    } 
    if (!globalNS.Promise.allSettled) {
      globalNS.Promise.allSettled = allSettled;
    }
  }

  var global$1 =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof self !== 'undefined' && self) ||
    (typeof global$1 !== 'undefined' && global$1);

  var support = {
    searchParams: 'URLSearchParams' in global$1,
    iterable: 'Symbol' in global$1 && 'iterator' in Symbol,
    blob:
      'FileReader' in global$1 &&
      'Blob' in global$1 &&
      (function() {
        try {
          new Blob();
          return true
        } catch (e) {
          return false
        }
      })(),
    formData: 'FormData' in global$1,
    arrayBuffer: 'ArrayBuffer' in global$1
  };

  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj)
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
      };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === '') {
      throw new TypeError('Invalid character in header field name: "' + name + '"')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ', ' + value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      /*
        fetch-mock wraps the Response object in an ES6 Proxy to
        provide useful test harness features such as flush. However, on
        ES5 browsers without fetch or Proxy support pollyfills must be used;
        the proxy-pollyfill is unable to proxy an attribute unless it exists
        on the object before the Proxy is created. This change ensures
        Response.bodyUsed exists on the instance, while maintaining the
        semantic of setting Request.bodyUsed in the constructor before
        _initBody is called.
      */
      this.bodyUsed = this.bodyUsed;
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        this._bodyText = body = Object.prototype.toString.call(body);
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          var isConsumed = consumed(this);
          if (isConsumed) {
            return isConsumed
          }
          if (ArrayBuffer.isView(this._bodyArrayBuffer)) {
            return Promise.resolve(
              this._bodyArrayBuffer.buffer.slice(
                this._bodyArrayBuffer.byteOffset,
                this._bodyArrayBuffer.byteOffset + this._bodyArrayBuffer.byteLength
              )
            )
          } else {
            return Promise.resolve(this._bodyArrayBuffer)
          }
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method
  }

  function Request(input, options) {
    if (!(this instanceof Request)) {
      throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
    }

    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'same-origin';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);

    if (this.method === 'GET' || this.method === 'HEAD') {
      if (options.cache === 'no-store' || options.cache === 'no-cache') {
        // Search for a '_' parameter in the query string
        var reParamSearch = /([?&])_=[^&]*/;
        if (reParamSearch.test(this.url)) {
          // If it already exists then set the value with the current time
          this.url = this.url.replace(reParamSearch, '$1_=' + new Date().getTime());
        } else {
          // Otherwise add a new '_' parameter to the end with the current time
          var reQueryString = /\?/;
          this.url += (reQueryString.test(this.url) ? '&' : '?') + '_=' + new Date().getTime();
        }
      }
    }
  }

  Request.prototype.clone = function() {
    return new Request(this, {body: this._bodyInit})
  };

  function decode(body) {
    var form = new FormData();
    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    // Avoiding split via regex to work around a common IE11 bug with the core-js 3.6.0 regex polyfill
    // https://github.com/github/fetch/issues/748
    // https://github.com/zloirock/core-js/issues/751
    preProcessedHeaders
      .split('\r')
      .map(function(header) {
        return header.indexOf('\n') === 0 ? header.substr(1, header.length) : header
      })
      .forEach(function(line) {
        var parts = line.split(':');
        var key = parts.shift().trim();
        if (key) {
          var value = parts.join(':').trim();
          headers.append(key, value);
        }
      });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!(this instanceof Response)) {
      throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
    }
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = options.statusText === undefined ? '' : '' + options.statusText;
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  var DOMException = global$1.DOMException;
  try {
    new DOMException();
  } catch (err) {
    DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    DOMException.prototype = Object.create(Error.prototype);
    DOMException.prototype.constructor = DOMException;
  }

  function fetch$1(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);

      if (request.signal && request.signal.aborted) {
        return reject(new DOMException('Aborted', 'AbortError'))
      }

      var xhr = new XMLHttpRequest();

      function abortXhr() {
        xhr.abort();
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        setTimeout(function() {
          resolve(new Response(body, options));
        }, 0);
      };

      xhr.onerror = function() {
        setTimeout(function() {
          reject(new TypeError('Network request failed'));
        }, 0);
      };

      xhr.ontimeout = function() {
        setTimeout(function() {
          reject(new TypeError('Network request failed'));
        }, 0);
      };

      xhr.onabort = function() {
        setTimeout(function() {
          reject(new DOMException('Aborted', 'AbortError'));
        }, 0);
      };

      function fixUrl(url) {
        try {
          return url === '' && global$1.location.href ? global$1.location.href : url
        } catch (e) {
          return url
        }
      }

      xhr.open(request.method, fixUrl(request.url), true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false;
      }

      if ('responseType' in xhr) {
        if (support.blob) {
          xhr.responseType = 'blob';
        } else if (
          support.arrayBuffer &&
          request.headers.get('Content-Type') &&
          request.headers.get('Content-Type').indexOf('application/octet-stream') !== -1
        ) {
          xhr.responseType = 'arraybuffer';
        }
      }

      if (init && typeof init.headers === 'object' && !(init.headers instanceof Headers)) {
        Object.getOwnPropertyNames(init.headers).forEach(function(name) {
          xhr.setRequestHeader(name, normalizeValue(init.headers[name]));
        });
      } else {
        request.headers.forEach(function(value, name) {
          xhr.setRequestHeader(name, value);
        });
      }

      if (request.signal) {
        request.signal.addEventListener('abort', abortXhr);

        xhr.onreadystatechange = function() {
          // DONE (success or failure)
          if (xhr.readyState === 4) {
            request.signal.removeEventListener('abort', abortXhr);
          }
        };
      }

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  }

  fetch$1.polyfill = true;

  if (!global$1.fetch) {
    global$1.fetch = fetch$1;
    global$1.Headers = Headers;
    global$1.Request = Request;
    global$1.Response = Response;
  }

  function revealElements() {
    var revealEls = document.querySelectorAll('[data-reveal]');
    var revealEvent = new CustomEvent('isRevealed', {
      detail: {
        isRevealed: true
      }
    });
    var observerConfig = {
      rootMargin: '0px 0px -9% 0px',
      threshold: 0
    };
    var observer = new IntersectionObserver(function (elements, self) {
      elements.forEach(function (element) {
        if (element.isIntersecting) {
          // Add class and stop watching
          element.target.classList.add('is-revealed');
          element.target.dispatchEvent(revealEvent);
          self.unobserve(element.target);
        }
      });
    }, observerConfig);
    revealEls.forEach(function (element) {
      var delay = parseInt(element.dataset.reveal, 10) || 0;
      element.style.transitionDelay = "".concat(0.0625 * delay, "s");
      observer.observe(element);
    });
  }

  function Button() {
    var NAME = "button-".concat(Math.random());
    console.log(NAME);
  }

  function Eyebrow() {
    console.log('Eyebrow');
  }

  function Card() {
    var NAME = "card-".concat(Math.random());
    console.log(NAME);
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _toConsumableArray$1(arr) {
    return _arrayWithoutHoles$1(arr) || _iterableToArray$1(arr) || _unsupportedIterableToArray$1(arr) || _nonIterableSpread$1();
  }

  function _arrayWithoutHoles$1(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray$1(arr);
  }

  function _iterableToArray$1(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _unsupportedIterableToArray$1(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray$1(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen);
  }

  function _arrayLikeToArray$1(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread$1() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  var MicroModal = function () {

    var FOCUSABLE_ELEMENTS = ['a[href]', 'area[href]', 'input:not([disabled]):not([type="hidden"]):not([aria-hidden])', 'select:not([disabled]):not([aria-hidden])', 'textarea:not([disabled]):not([aria-hidden])', 'button:not([disabled]):not([aria-hidden])', 'iframe', 'object', 'embed', '[contenteditable]', '[tabindex]:not([tabindex^="-"])'];

    var Modal = /*#__PURE__*/function () {
      function Modal(_ref) {
        var targetModal = _ref.targetModal,
            _ref$triggers = _ref.triggers,
            triggers = _ref$triggers === void 0 ? [] : _ref$triggers,
            _ref$onShow = _ref.onShow,
            onShow = _ref$onShow === void 0 ? function () {} : _ref$onShow,
            _ref$onClose = _ref.onClose,
            onClose = _ref$onClose === void 0 ? function () {} : _ref$onClose,
            _ref$openTrigger = _ref.openTrigger,
            openTrigger = _ref$openTrigger === void 0 ? 'data-micromodal-trigger' : _ref$openTrigger,
            _ref$closeTrigger = _ref.closeTrigger,
            closeTrigger = _ref$closeTrigger === void 0 ? 'data-micromodal-close' : _ref$closeTrigger,
            _ref$openClass = _ref.openClass,
            openClass = _ref$openClass === void 0 ? 'is-open' : _ref$openClass,
            _ref$disableScroll = _ref.disableScroll,
            disableScroll = _ref$disableScroll === void 0 ? false : _ref$disableScroll,
            _ref$disableFocus = _ref.disableFocus,
            disableFocus = _ref$disableFocus === void 0 ? false : _ref$disableFocus,
            _ref$awaitCloseAnimat = _ref.awaitCloseAnimation,
            awaitCloseAnimation = _ref$awaitCloseAnimat === void 0 ? false : _ref$awaitCloseAnimat,
            _ref$awaitOpenAnimati = _ref.awaitOpenAnimation,
            awaitOpenAnimation = _ref$awaitOpenAnimati === void 0 ? false : _ref$awaitOpenAnimati,
            _ref$debugMode = _ref.debugMode,
            debugMode = _ref$debugMode === void 0 ? false : _ref$debugMode;

        _classCallCheck(this, Modal);

        // Save a reference of the modal
        this.modal = document.getElementById(targetModal); // Save a reference to the passed config

        this.config = {
          debugMode: debugMode,
          disableScroll: disableScroll,
          openTrigger: openTrigger,
          closeTrigger: closeTrigger,
          openClass: openClass,
          onShow: onShow,
          onClose: onClose,
          awaitCloseAnimation: awaitCloseAnimation,
          awaitOpenAnimation: awaitOpenAnimation,
          disableFocus: disableFocus
        }; // Register click events only if pre binding eventListeners

        if (triggers.length > 0) this.registerTriggers.apply(this, _toConsumableArray$1(triggers)); // pre bind functions for event listeners

        this.onClick = this.onClick.bind(this);
        this.onKeydown = this.onKeydown.bind(this);
      }
      /**
       * Loops through all openTriggers and binds click event
       * @param  {array} triggers [Array of node elements]
       * @return {void}
       */


      _createClass(Modal, [{
        key: "registerTriggers",
        value: function registerTriggers() {
          var _this = this;

          for (var _len = arguments.length, triggers = new Array(_len), _key = 0; _key < _len; _key++) {
            triggers[_key] = arguments[_key];
          }

          triggers.filter(Boolean).forEach(function (trigger) {
            trigger.addEventListener('click', function (event) {
              return _this.showModal(event);
            });
          });
        }
      }, {
        key: "showModal",
        value: function showModal() {
          var _this2 = this;

          var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
          this.activeElement = document.activeElement;
          this.modal.setAttribute('aria-hidden', 'false');
          this.modal.classList.add(this.config.openClass);
          this.scrollBehaviour('disable');
          this.addEventListeners();

          if (this.config.awaitOpenAnimation) {
            var handler = function handler() {
              _this2.modal.removeEventListener('animationend', handler, false);

              _this2.setFocusToFirstNode();
            };

            this.modal.addEventListener('animationend', handler, false);
          } else {
            this.setFocusToFirstNode();
          }

          this.config.onShow(this.modal, this.activeElement, event);
        }
      }, {
        key: "closeModal",
        value: function closeModal() {
          var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
          var modal = this.modal;
          this.modal.setAttribute('aria-hidden', 'true');
          this.removeEventListeners();
          this.scrollBehaviour('enable');

          if (this.activeElement && this.activeElement.focus) {
            this.activeElement.focus();
          }

          this.config.onClose(this.modal, this.activeElement, event);

          if (this.config.awaitCloseAnimation) {
            var openClass = this.config.openClass; // <- old school ftw

            this.modal.addEventListener('animationend', function handler() {
              modal.classList.remove(openClass);
              modal.removeEventListener('animationend', handler, false);
            }, false);
          } else {
            modal.classList.remove(this.config.openClass);
          }
        }
      }, {
        key: "closeModalById",
        value: function closeModalById(targetModal) {
          this.modal = document.getElementById(targetModal);
          if (this.modal) this.closeModal();
        }
      }, {
        key: "scrollBehaviour",
        value: function scrollBehaviour(toggle) {
          if (!this.config.disableScroll) return;
          var body = document.querySelector('body');

          switch (toggle) {
            case 'enable':
              Object.assign(body.style, {
                overflow: ''
              });
              break;

            case 'disable':
              Object.assign(body.style, {
                overflow: 'hidden'
              });
              break;
          }
        }
      }, {
        key: "addEventListeners",
        value: function addEventListeners() {
          this.modal.addEventListener('touchstart', this.onClick);
          this.modal.addEventListener('click', this.onClick);
          document.addEventListener('keydown', this.onKeydown);
        }
      }, {
        key: "removeEventListeners",
        value: function removeEventListeners() {
          this.modal.removeEventListener('touchstart', this.onClick);
          this.modal.removeEventListener('click', this.onClick);
          document.removeEventListener('keydown', this.onKeydown);
        }
      }, {
        key: "onClick",
        value: function onClick(event) {
          if (event.target.hasAttribute(this.config.closeTrigger)) {
            this.closeModal(event);
          }
        }
      }, {
        key: "onKeydown",
        value: function onKeydown(event) {
          if (event.keyCode === 27) this.closeModal(event); // esc

          if (event.keyCode === 9) this.retainFocus(event); // tab
        }
      }, {
        key: "getFocusableNodes",
        value: function getFocusableNodes() {
          var nodes = this.modal.querySelectorAll(FOCUSABLE_ELEMENTS);
          return Array.apply(void 0, _toConsumableArray$1(nodes));
        }
        /**
         * Tries to set focus on a node which is not a close trigger
         * if no other nodes exist then focuses on first close trigger
         */

      }, {
        key: "setFocusToFirstNode",
        value: function setFocusToFirstNode() {
          var _this3 = this;

          if (this.config.disableFocus) return;
          var focusableNodes = this.getFocusableNodes(); // no focusable nodes

          if (focusableNodes.length === 0) return; // remove nodes on whose click, the modal closes
          // could not think of a better name :(

          var nodesWhichAreNotCloseTargets = focusableNodes.filter(function (node) {
            return !node.hasAttribute(_this3.config.closeTrigger);
          });
          if (nodesWhichAreNotCloseTargets.length > 0) nodesWhichAreNotCloseTargets[0].focus();
          if (nodesWhichAreNotCloseTargets.length === 0) focusableNodes[0].focus();
        }
      }, {
        key: "retainFocus",
        value: function retainFocus(event) {
          var focusableNodes = this.getFocusableNodes(); // no focusable nodes

          if (focusableNodes.length === 0) return;
          /**
           * Filters nodes which are hidden to prevent
           * focus leak outside modal
           */

          focusableNodes = focusableNodes.filter(function (node) {
            return node.offsetParent !== null;
          }); // if disableFocus is true

          if (!this.modal.contains(document.activeElement)) {
            focusableNodes[0].focus();
          } else {
            var focusedItemIndex = focusableNodes.indexOf(document.activeElement);

            if (event.shiftKey && focusedItemIndex === 0) {
              focusableNodes[focusableNodes.length - 1].focus();
              event.preventDefault();
            }

            if (!event.shiftKey && focusableNodes.length > 0 && focusedItemIndex === focusableNodes.length - 1) {
              focusableNodes[0].focus();
              event.preventDefault();
            }
          }
        }
      }]);

      return Modal;
    }();
    /**
     * Modal prototype ends.
     * Here on code is responsible for detecting and
     * auto binding event handlers on modal triggers
     */
    // Keep a reference to the opened modal


    var activeModal = null;
    /**
     * Generates an associative array of modals and it's
     * respective triggers
     * @param  {array} triggers     An array of all triggers
     * @param  {string} triggerAttr The data-attribute which triggers the module
     * @return {array}
     */

    var generateTriggerMap = function generateTriggerMap(triggers, triggerAttr) {
      var triggerMap = [];
      triggers.forEach(function (trigger) {
        var targetModal = trigger.attributes[triggerAttr].value;
        if (triggerMap[targetModal] === undefined) triggerMap[targetModal] = [];
        triggerMap[targetModal].push(trigger);
      });
      return triggerMap;
    };
    /**
     * Validates whether a modal of the given id exists
     * in the DOM
     * @param  {number} id  The id of the modal
     * @return {boolean}
     */


    var validateModalPresence = function validateModalPresence(id) {
      if (!document.getElementById(id)) {
        console.warn("MicroModal: \u2757Seems like you have missed %c'".concat(id, "'"), 'background-color: #f8f9fa;color: #50596c;font-weight: bold;', 'ID somewhere in your code. Refer example below to resolve it.');
        console.warn("%cExample:", 'background-color: #f8f9fa;color: #50596c;font-weight: bold;', "<div class=\"modal\" id=\"".concat(id, "\"></div>"));
        return false;
      }
    };
    /**
     * Validates if there are modal triggers present
     * in the DOM
     * @param  {array} triggers An array of data-triggers
     * @return {boolean}
     */


    var validateTriggerPresence = function validateTriggerPresence(triggers) {
      if (triggers.length <= 0) {
        console.warn("MicroModal: \u2757Please specify at least one %c'micromodal-trigger'", 'background-color: #f8f9fa;color: #50596c;font-weight: bold;', 'data attribute.');
        console.warn("%cExample:", 'background-color: #f8f9fa;color: #50596c;font-weight: bold;', "<a href=\"#\" data-micromodal-trigger=\"my-modal\"></a>");
        return false;
      }
    };
    /**
     * Checks if triggers and their corresponding modals
     * are present in the DOM
     * @param  {array} triggers   Array of DOM nodes which have data-triggers
     * @param  {array} triggerMap Associative array of modals and their triggers
     * @return {boolean}
     */


    var validateArgs = function validateArgs(triggers, triggerMap) {
      validateTriggerPresence(triggers);
      if (!triggerMap) return true;

      for (var id in triggerMap) {
        validateModalPresence(id);
      }

      return true;
    };
    /**
     * Binds click handlers to all modal triggers
     * @param  {object} config [description]
     * @return void
     */


    var init = function init(config) {
      // Create an config object with default openTrigger
      var options = Object.assign({}, {
        openTrigger: 'data-micromodal-trigger'
      }, config); // Collects all the nodes with the trigger

      var triggers = _toConsumableArray$1(document.querySelectorAll("[".concat(options.openTrigger, "]"))); // Makes a mappings of modals with their trigger nodes


      var triggerMap = generateTriggerMap(triggers, options.openTrigger); // Checks if modals and triggers exist in dom

      if (options.debugMode === true && validateArgs(triggers, triggerMap) === false) return; // For every target modal creates a new instance

      for (var key in triggerMap) {
        var value = triggerMap[key];
        options.targetModal = key;
        options.triggers = _toConsumableArray$1(value);
        activeModal = new Modal(options); // eslint-disable-line no-new
      }
    };
    /**
     * Shows a particular modal
     * @param  {string} targetModal [The id of the modal to display]
     * @param  {object} config [The configuration object to pass]
     * @return {void}
     */


    var show = function show(targetModal, config) {
      var options = config || {};
      options.targetModal = targetModal; // Checks if modals and triggers exist in dom

      if (options.debugMode === true && validateModalPresence(targetModal) === false) return; // clear events in case previous modal wasn't close

      if (activeModal) activeModal.removeEventListeners(); // stores reference to active modal

      activeModal = new Modal(options); // eslint-disable-line no-new

      activeModal.showModal();
    };
    /**
     * Closes the active modal
     * @param  {string} targetModal [The id of the modal to close]
     * @return {void}
     */


    var close = function close(targetModal) {
      targetModal ? activeModal.closeModalById(targetModal) : activeModal.closeModal();
    };

    return {
      init: init,
      show: show,
      close: close
    };
  }();
  window.MicroModal = MicroModal;

  var CustomUtil = {
    settings: {
      headerFixed: false,
      headerFixedFlag: '.ShyNav',
      headerStaticHeight: 0,
      headerFixedHeight: 0,
      headerTop: 0,
      headerStatus: 2 // 0 = hide, 1 = show part, 2 = show all

    },
    screenIs: 'isLaptop',
    isNavFixed: function isNavFixed() {
      var fixedNav = document.querySelector(this.settings.headerFixedFlag);
      return fixedNav != null && (fixedNav.style.position == 'fixed' || getComputedStyle(fixedNav).position == 'fixed');
    },
    updateSettings: function updateSettings() {
      var header = document.querySelector(this.settings.headerFixedFlag);

      if (this.isNavFixed()) {
        this.settings.headerFixed = true;
        this.settings.headerFixedHeight = header.clientHeight;
        this.settings.headerTop = parseInt(header.style.top.slice(0, header.style.top.length - 2));
      } else {
        this.settings.headerFixedHeight = 0;
      }
    },
    getAllStickyTop: function getAllStickyTop() {
      var in_sticky = document.querySelectorAll('.with-sticky.in-sticky');
      var sticky_top = 0;

      for (var i = 0; i < in_sticky.length; i++) {
        sticky_top += parseInt(in_sticky[i].clientHeight);
      }

      return sticky_top;
    },
    getInStickyTop: function getInStickyTop(ele) {
      var with_sticky = document.querySelectorAll('.with-sticky');
      var in_sticky = document.querySelectorAll('.with-sticky.in-sticky');
      var index = [].indexOf.call(with_sticky, ele);
      var eleTop = 0;

      for (var i = 0; i < in_sticky.length; i++) {
        var in_index = [].indexOf.call(with_sticky, in_sticky[i]);

        if (in_index < index) {
          if (in_sticky[i].querySelector('.with-drop')) {
            var drop = in_sticky[i].querySelector('.with-drop');

            if (this.screenIs == 'isMobile') {
              eleTop += parseInt(in_sticky[i].clientHeight + drop.clientHeight);
            } else {
              eleTop += parseInt(in_sticky[i].clientHeight);
            }
          } else {
            eleTop += parseInt(in_sticky[i].clientHeight);
          }
        }
      }

      return eleTop;
    },
    bindStickyEvent: function bindStickyEvent(condition, ele) {
      var eleTop = this.getInStickyTop(ele);

      if (condition) {
        ele.classList.add('sticky-fixed');
        this.setStickyElementTop(ele, eleTop); //ele.classList.add('has-fixed');
      } else {
        ele.classList.remove('sticky-fixed');
        ele.style.top = '0';
      }
    },
    updateStickyElements: function updateStickyElements() {
      var _this = this;

      var with_sticky = document.querySelectorAll('.with-sticky');
      with_sticky.forEach(function (item) {
        var eleTop = _this.getInStickyTop(item);

        if (item.classList.contains('sticky-fixed')) {
          _this.setStickyElementTop(item, eleTop);
        }
      });
    },
    setStickyElementTop: function setStickyElementTop(ele, eleTop) {
      if (this.settings.headerStatus == 2) {
        ele.style.top = this.settings.headerFixedHeight + eleTop + 'px';
      } else if (this.settings.headerStatus == 1) {
        ele.style.top = this.settings.headerFixedHeight + this.settings.headerTop + eleTop + 'px';
      } else {
        ele.style.top = eleTop + 0 + 'px';
      }
    },
    getEvent: function getEvent(event) {
      return event ? event : window.event;
    },
    getTarget: function getTarget(event) {
      return event.target || event.srcElement;
    },
    preventDefault: function preventDefault(event) {
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        event.returnValue = false;
      }
    },
    stopPropagation: function stopPropagation(event) {
      if (event.stopPropagation) {
        event.stopPropagation();
      } else {
        event.cacelBubble = true;
      }
    },
    addHandler: function addHandler(element, type, handler) {
      if (element.addEventListener) {
        element.addEventListener(type, handler, false);
      } else if (element.attachEvent) {
        element.attachEvent('on' + type, handler);
      } else {
        element['on' + type] = handler;
      }
    },
    removeHandler: function removeHandler(element, type, handler) {
      if (element.removeEventListener) {
        element.removeEventListener(type, handler, false);
      } else if (element.detachEvent) {
        element.detachEvent('on' + type, handler);
      } else {
        element['on' + type] = null;
      }
    },
    isLocalhost: function isLocalhost() {
      if (document.domain == 'localhost') {
        return true;
      } else {
        return false;
      }
    },
    initCheckScreen: function initCheckScreen() {
      var check = document.querySelector('.check-screen');

      if (check == null) {
        var node = document.createElement('div');
        node.className = 'check-screen';
        var body = document.querySelector('body');
        body.appendChild(node);
      }

      check = document.querySelector('.check-screen');
      var checkStyle = window.getComputedStyle(check, null);
      var sNav = document.querySelector('.SecondaryNav');

      if (checkStyle.content == '"laptop"') {
        this.screenIs = 'isLaptop';
      } else if (checkStyle.content == '"tablet"') {
        this.screenIs = 'isTablet';
      } else if (checkStyle.content == '"mobile"') {
        this.screenIs = 'isMobile';
      } else {
        if (sNav && window.getComputedStyle(sNav, null).display == 'none') {
          this.screenIs = 'isMobile';
        } else {
          this.screenIs = 'isLaptop';
        }
      }
    },
    setSameBoxElementHeight: function setSameBoxElementHeight(box, ele) {
      var tallest = 0;
      var boxes = document.querySelectorAll(box);

      if (boxes && boxes.length > 0) {
        boxes.forEach(function (item) {
          var element = item.querySelector(ele);

          if (element) {
            element.style.height = 'auto'; // reset height in case an empty div has been populated

            if (element.clientHeight > tallest) {
              tallest = element.clientHeight;
            }
          }
        });
      }

      var items = document.querySelectorAll(box + ' ' + ele);

      if (items && items.length > 0) {
        items.forEach(function (item) {
          item.style.height = tallest + 'px';
        });
      }
    },
    setSameRowElementHeight: function setSameRowElementHeight(row, box, ele) {
      var rows = document.querySelectorAll(row);

      if (rows && rows.length > 0) {
        rows.forEach(function (rowItem) {
          var tallest = 0;
          var boxes = rowItem.querySelectorAll(box);

          if (boxes && boxes.length > 0) {
            boxes.forEach(function (item) {
              var element = item.querySelector(ele);

              if (element) {
                element.style.height = 'auto'; // reset height in case an empty div has been populated

                if (element.clientHeight > tallest) {
                  tallest = element.clientHeight;
                }
              }
            });
          }

          var items = rowItem.querySelectorAll(box + ' ' + ele);

          if (items && items.length > 0) {
            items.forEach(function (item) {
              item.style.height = tallest + 'px';
            });
          }
        });
      }
    },
    setSameRowBoxHeight: function setSameRowBoxHeight(row, box) {
      document.querySelectorAll(row).forEach(function (rowItem) {
        var tallest = 0;
        rowItem.querySelectorAll(box).forEach(function (item) {
          var element = item;
          element.style.height = 'auto'; // reset height in case an empty div has been populated

          if (element.clientHeight > tallest) {
            tallest = element.clientHeight;
          }
        });
        rowItem.querySelectorAll(box).forEach(function (item) {
          item.style.height = tallest + 'px';
        });
      });
    },
    setColumnCellHeight: function setColumnCellHeight(column, row, ele) {
      if (column && column.length > 0) {
        var length = column[0].querySelectorAll(row).length;
        var eleLength = 1;

        if (ele && column[0].querySelectorAll(ele).length > 0) {
          eleLength = column[0].querySelectorAll(ele).length;
        }

        for (var s = 0; s < eleLength; s++) {
          var e_tallest = 0;

          for (var i = 0; i < length; i++) {
            var c_tallest = 0;

            for (var j = 0; j < column.length; j++) {
              var element;

              if (ele) {
                element = column[j].querySelectorAll(row)[i].querySelectorAll(ele)[s];

                if (element != null) {
                  element.style.height = 'auto';

                  if (element.clientHeight > e_tallest) {
                    e_tallest = element.clientHeight;
                  }
                }
              }

              var cell = column[j].querySelectorAll(row)[i];
              cell.style.height = 'auto';

              if (cell.clientHeight > c_tallest) {
                c_tallest = cell.clientHeight;
              }
            }

            for (var k = 0; k < column.length; k++) {
              var element;

              if (ele) {
                element = column[k].querySelectorAll(row)[i].querySelectorAll(ele)[s];

                if (element != null) {
                  element.style.height = e_tallest + 'px';
                }
              }

              var cell = column[k].querySelectorAll(row)[i];
              cell.style.height = c_tallest + 'px';
            }
          }
        }
      }
    }
  };

  function FindRetailerModal() {
    console.log('Micromodal FindRetailerModal');
  }

  FindRetailerModal.prototype.init = function (modal, tiggerObj) {
    if (tiggerObj.currentTarget.dataset.micromodalTrigger.indexOf('whereToBuy') != -1) {
      var sku = tiggerObj.currentTarget.dataset.model;
      var country = tiggerObj.currentTarget.dataset.country;
      var category = tiggerObj.currentTarget.dataset.category;
      var isexternal = tiggerObj.currentTarget.dataset.isexternal;
      var site = tiggerObj.currentTarget.dataset.site;
      var locale = tiggerObj.currentTarget.dataset.locale;
      var buynowlabel = tiggerObj.currentTarget.dataset.buynowlabel;

      if (buynowlabel === undefined) {
        buynowlabel = 'Buy Now';
      }

      if (!CustomUtil.isLocalhost()) {
        resetCountry(country);
        getProductInfo(sku, locale.toLowerCase(), site);
        buildBlueBoard(sku, locale, country, category, isexternal, site, buynowlabel);

        if (wheretobuypopup != undefined && !wheretobuypopup) {
          countryChange(sku, locale, category, isexternal, site, buynowlabel);
          wheretobuypopup = true;
        }
      }
    }
  };

  var getWwwDomain = function getWwwDomain() {
    var wwwHost = document.location.host;
    var wwwDomain = 'www.seagate.com';

    if (wwwHost.indexOf('wwwedit') != -1) {
      wwwDomain = 'wwwedit.seagate.com';
    } else if (wwwHost.indexOf('wwwstgedit') != -1) {
      wwwDomain = 'wwwstgedit.seagate.com';
    } else if (wwwHost.indexOf('wwwstg') != -1) {
      wwwDomain = 'wwwstg.seagate.com';
    }

    return wwwDomain;
  };

  var resetCountry = function resetCountry(country) {
    document.querySelector('#wheretobuycontent').innerHTML = '';
    document.querySelector('#wheretobuyloading').classList.remove('hide');
    var countryselector = document.querySelector('#wheretobuycountriesoptions');
    countryselector.value = country;
  };

  var getProductInfo = function getProductInfo(sku, locale, brand) {
    var productInfoDiv = document.querySelector('.product-info.wheretobuy');
    var skuName = "skuName_".concat(locale.split('_')[0]);
    var wwwDomain = getWwwDomain();
    var productQuery = "https://".concat(wwwDomain, "/ww/solrQueryResponseRetrieval?q=*&collection=product&wt=json&indent=true&start=0&rows=1&omitHeader=true&fq=seaLocale:").concat(locale, "&fq=brand:").concat(brand, "&fq=modelNumber:").concat(sku, "&fl=modelNumber,imagePath,").concat(skuName);
    console.log(productQuery);
    var html = '';
    productInfoDiv.innerHTML = html;
    fetch(productQuery).then(function (response) {
      return response.json();
    }).then(function (data) {
      var docs = data.response.docs;
      docs.forEach(function (item) {
        html = "\n\t\t\t\t\t<img src=\"".concat(item.imagePath, "\">\n\t\t\t\t\t<h3 class=\"product-title\">").concat(item[skuName], "</h3> \n\t\t\t\t\t<p class=\"copy product-description\"></p>\n                    <p class=\"copy product-model\">").concat(productInfoDiv.dataset.modellabel).concat(item.modelNumber, "</p>\n                    <a class=\"product-change\" data-micromodal-close>").concat(productInfoDiv.dataset.changeproduct, "</a>\n\t\t\t\t");
        productInfoDiv.innerHTML = html;
      });
    });
  };

  var countryChange = function countryChange(sku, locale, category, isexternal, site, buynowlabel) {
    var countryselector = document.querySelector('#wheretobuycountriesoptions');
    countryselector.addEventListener('change', function (event) {
      var selectedCountry = event.target.selectedOptions[0].value;
      document.querySelector('#wheretobuycontent').innerHTML = '';
      document.querySelector('#wheretobuyloading').classList.remove('hide');
      getBlueBoardRetailers(sku, locale, selectedCountry, category, isexternal, site, buynowlabel);
    });
  };

  var showPriceInBlueboard = function showPriceInBlueboard(is_blueboard_emea_country, is_blueboard_locale, country, rcLocaleJS) {
    var showPrice = false;
    var isEmeaCountry = false;
    var isBlueBoardEmeaCountry = is_blueboard_emea_country.split(',');
    var isBlueBoardLocales = is_blueboard_locale.split(',');

    for (var i = 0; i < isBlueBoardEmeaCountry.length; i++) {
      if (country == isBlueBoardEmeaCountry[i]) {
        isEmeaCountry = true;
        break;
      }
    }

    if (!isEmeaCountry) {
      for (var _i = 0; _i < isBlueBoardLocales.length; _i++) {
        if (rcLocaleJS == isBlueBoardLocales[_i]) {
          showPrice = true;
          break;
        }
      }
    }

    return showPrice;
  };

  var buildBlueBoard = function buildBlueBoard(sku, locale, country, categories, isexternal, site, buynowlabel) {
    getBlueBoardRetailers(sku, locale, country, categories, isexternal, site, buynowlabel);
  };

  var getBlueBoardRetailers = function getBlueBoardRetailers(sku, locale, country, categories, isexternal, site, buynowlabel) {
    var wwwDomain = getWwwDomain();
    var bbQueryBase = 'https://' + wwwDomain + '/ww/solrQueryResponseRetrieval?q=*&collection=blueboard&wt=json&indent=true&start=0&rows=1000&omitHeader=true&fl=is_seagate,is_lacie,is_pdp,is_pdp_lacie,logo_url_pdp,is_blueboard,country,url,product_url,product_sku,current_price,currency_code,retailer_name&sort=current_price+asc';
    var bbQuery = bbQueryBase + '&fq=country:' + country;
    bbQuery = bbQuery + '&fq=product_sku:' + sku;

    if ('lacie' == site) {
      bbQuery = bbQuery + '&fq=((is_lacie:true AND is_pdp_lacie:true AND is_blueboard:lacie) OR is_blueboard:both)';
    } else {
      bbQuery = bbQuery + '&fq=((is_seagate:true AND is_pdp:true AND is_blueboard:seagate) OR is_blueboard:both)';
    }

    console.log('bbQuery ' + bbQuery);
    var isBlueBoardEmeaCountry = 'AT,RO,DE,DZ,BH,CY,EG,IQ,JO,KW,LB,MA,OM,PS,QA,SA,AE,YE,LI,CH,GH,GR,IR,IL,KE,NG,SD,SY,AF,AX,AO,BQ,BA,BW,BV,IO,BG,HR,CW,CZ,DK,em,ER,EE,ET,FO,FK,FI,GM,GE,GI,GB,GL,GD,GG,HU,IS,IE,IM,JE,LV,LS,LR,LT,MK,MW,MT,YT,MD,ME,MS,MZ,NA,NL,AN,NO,PT,RS,SL,SK,SI,SO,ZA,GS,SS,SR,SJ,SZ,SE,TZ,TM,UG,UA,GB,UZ,VG,WF,EH,ZM,ZW,GQ,ES,AL,AD,BE,BJ,BF,BI,CM,CF,TD,KM,CG,CD,CI,DJ,FR,GF,PF,TF,GA,GP,GN,LU,MG,ML,MR,MU,MC,NC,NE,RE,RW,BL,MF,ST,SN,SC,TG,TN,IT,LY,SM,VA,PL,AM,AZ,BY,KZ,KG,RU,TJ,TR';
    var isBlueBoardLocales = 'en_US,en_CA,fr_CA';
    var rcLocaleJS = locale;
    var showPrice = showPriceInBlueboard(isBlueBoardEmeaCountry, isBlueBoardLocales, country, rcLocaleJS);
    fetch(bbQuery).then(function (response) {
      return response.json();
    }).then(function (data) {
      console.log(data);
      var docs = data.response.docs;
      console.log(docs);
      var content = '';
      var hasContent = false;
      docs.forEach(function (item) {
        var product_url = item.product_url;
        var current_price = item.current_price;
        var currency_code = item.currency_code;
        var retailer_name = item.retailer_name;
        var img = item.logo_url_pdp;
        var country = item.country;
        var price = new Intl.NumberFormat(country, {
          style: 'currency',
          currency: currency_code
        }).format(current_price);

        if (showPrice && current_price > 0) {
          hasContent = true;
          content += "\n\t\t\t\t\t\t<div class=\"row align-items-center\">\n                            <div class=\"col-md d-flex justify-content-center\">\n                                <a href=\"".concat(product_url, "\" title=\"").concat(retailer_name, "\" data-reseller=\"").concat(retailer_name, "\" target=\"_blank\" class=\"gtm-wtb-bb\">\n                                <img src=\"").concat(img, "\" alt=\"").concat(retailer_name, "\">\n                                </a>\n                            </div>\n                            <div class=\"col-md d-flex justify-content-center\">\n                                <a href=\"").concat(product_url, "\" class=\"Button Button-tertiary gtm-wtb-bb\" data-reseller=\"").concat(retailer_name, "\" target=\"_blank\">\n                                <span>").concat(price, " <i class=\"Button-arrow\"></i></span>\n                                </a>\n                            </div>\n                        </div>\n\t\t\t\t\t");
        } else {
          hasContent = true;
          content += "\n\t\t\t\t\t\t<div class=\"row align-items-center\">\n                            <div class=\"col-md d-flex justify-content-center\">\n                                <a href=\"".concat(product_url, "\" title=\"").concat(retailer_name, "\" data-reseller=\"").concat(retailer_name, "\" target=\"_blank\" class=\"gtm-wtb-bb\">\n                                <img src=\"").concat(img, "\" alt=\"").concat(retailer_name, "\">\n                                </a>\n                            </div>\n                            <div class=\"col-md d-flex justify-content-center\">\n                                <a href=\"").concat(product_url, "\" class=\"Button Button-tertiary gtm-wtb-bb\" data-reseller=\"").concat(retailer_name, "\" target=\"_blank\">\n                                <span>").concat(buynowlabel, " <i class=\"Button-arrow\"></i></span>\n                                </a>\n                            </div>\n                        </div>\n\t\t\t\t\t");
        }
      });
      var findRetailerModal = document.querySelector('#wheretobuycontent');
      findRetailerModal.innerHTML = '';

      if (hasContent) {
        document.querySelector('#wheretobuyloading').classList.add('hide');
        findRetailerModal.classList.remove('no-content');
        findRetailerModal.innerHTML = content;
      } else {
        getWTBResellers(sku, country, categories, isexternal, site, buynowlabel);
      }
    });
  };

  var getWTBResellers = function getWTBResellers(sku, country, categories, isexternal, site, buynowlabel) {
    var wwwDomain = getWwwDomain();
    var wtbQueryBase = 'https://' + wwwDomain + '/ww/solrQueryResponseRetrieval?q=*&collection=wtb&wt=json&indent=true&start=0&rows=1000&omitHeader=true&fl=is_wtblogo_available,is_pdplogo_available,phone,name,logo_url_pdp,logo_url,website,lacie_website,is_external,is_internal,external_drives,internal_drives,lacie_external_drives&sort=wtbnewsortingweigth+asc';
    var wtbQuerySeagatePdp = '&fq=partner_type:Reseller&fq=is_active:true&fq=is_pdp:true&fq=is_seagate:true&fq=!website:%22%22&fq=!account:%22%22';
    var wtbQueryLaCiePdp = '&fq=partner_type:Reseller&fq=is_active:true&fq=is_pdp_lacie:true&fq=is_lacie:true&fq=!lacie_website:%22%22&fq=!account:%22%22';
    var wtbQuery = '';
    var wtbCategories = categories;
    var isExternal = isexternal == 'true' ? true : false;

    if ('lacie' == site) {
      wtbQuery = wtbQueryBase + wtbQueryLaCiePdp + '&fq=country:' + country;
    } else {
      wtbQuery = wtbQueryBase + wtbQuerySeagatePdp + '&fq=country:' + country;
    }

    if (wtbCategories != '') {
      var wtbCategoriesArray = wtbCategories.split(',');
      var wtbCategoriesNewArray = [];

      if (isExternal && 'seagate' == site) {
        for (var i = 0; i < wtbCategoriesArray.length; i++) {
          wtbCategoriesNewArray[i] = 'external_drives:"' + wtbCategoriesArray[i] + '"';
        }

        wtbCategories = '(' + wtbCategoriesNewArray.join(' OR ') + ')';
        wtbQuery = wtbQuery + '&fq=' + wtbCategories;
      } else if (!isExternal && 'seagate' == site) {
        for (var _i2 = 0; _i2 < wtbCategoriesArray.length; _i2++) {
          wtbCategoriesNewArray[_i2] = 'internal_drives:"' + wtbCategoriesArray[_i2] + '"';
        }

        wtbCategories = '(' + wtbCategoriesNewArray.join(' OR ') + ')';
        wtbQuery = wtbQuery + '&fq=' + wtbCategories;
      } else if ('lacie' == site) {
        for (var _i3 = 0; _i3 < wtbCategoriesArray.length; _i3++) {
          wtbCategoriesNewArray[_i3] = 'lacie_external_drives:"' + wtbCategoriesArray[_i3] + '"';
        }

        wtbCategories = '(' + wtbCategoriesNewArray.join(' OR ') + ')';
        wtbQuery = wtbQuery + '&fq=' + wtbCategories;
      }
    }

    console.log('wtbQuery ' + wtbQuery);
    fetch(wtbQuery).then(function (response) {
      return response.json();
    }).then(function (data) {
      console.log(data);
      var docs = data.response.docs;
      console.log(docs);
      var content = '';
      var hasContent = false;
      docs.forEach(function (item) {
        var website = item.website.indexOf('http') == 0 ? item.website : 'http://' + item.website;
        var lacie_website = item.lacie_website.indexOf('http') == 0 ? item.lacie_website : 'http://' + item.lacie_website;
        var company_name = item.is_wtblogo_available ? '' : '<span class="wtb-name">' + item.name + '</span>';

        if ('lacie' == site) {
          content += "\n\t\t\t\t\t\t<div class=\"row align-items-center\">\n                            <div class=\"col-md d-flex justify-content-center\">\n                                <a href=\"".concat(lacie_website, "\" title=\"").concat(item.name, "\" data-reseller=\"").concat(item.name, "\" target=\"_blank\" class=\"gtm-wtb\">\n                                <img src=\"").concat(item.logo_url_pdp, "\" alt=\"").concat(item.name, "\">\n                                </a>\n                            </div>\n                            <div class=\"col-md d-flex justify-content-center\">\n                                <a href=\"").concat(lacie_website, "\" class=\"Button Button-tertiary gtm-wtb\" data-reseller=\"").concat(item.name, "\" target=\"_blank\">\n                                <span>").concat(buynowlabel, " <i class=\"Button-arrow\"></i></span>\n                                </a>\n                            </div>\n                        </div>\n\t\t\t\t\t");
          hasContent = true;
        } else if ('seagate' == site) {
          content += "\n\t\t\t\t\t\t<div class=\"row align-items-center\">\n                            <div class=\"col-md d-flex justify-content-center\">\n                                <a href=\"".concat(website, "\" title=\"").concat(item.name, "\" data-reseller=\"").concat(item.name, "\" target=\"_blank\" class=\"gtm-wtb\">\n                                <img src=\"").concat(item.logo_url_pdp, "\" alt=\"").concat(item.name, "\">\n                                </a>\n                            </div>\n                            <div class=\"col-md d-flex justify-content-center\">\n                                <a href=\"").concat(website, "\" class=\"Button Button-tertiary gtm-wtb\" data-reseller=\"").concat(item.name, "\" target=\"_blank\">\n                                <span>").concat(buynowlabel, " <i class=\"Button-arrow\"></i></span>\n                                </a>\n                            </div>\n                        </div>\n\t\t\t\t\t");
          hasContent = true;
        }
      });
      var findRetailerModal = document.querySelector('#wheretobuycontent');
      findRetailerModal.innerHTML = '';

      if (hasContent) {
        document.querySelector('#wheretobuyloading').classList.add('hide');
        findRetailerModal.classList.remove('no-content');
        findRetailerModal.innerHTML = content;
      } else {
        document.querySelector('#wheretobuyloading').classList.add('hide');
        var nocontent = document.querySelector('#nowheretobuycontent');

        if (nocontent === null) {
          nocontent = '<p>Reseller List not Available</p>';
        } else {
          nocontent = nocontent.innerHTML;
        }

        findRetailerModal.innerHTML = nocontent;
        findRetailerModal.classList.add('no-content');
      }
    });
  };

  function init() {
    console.log('Micromodal'); // Videos

    var firstScriptTag = document.getElementsByTagName('script')[0];
    var youtubeTag, vimeoTag;
    var videoLinks = document.querySelectorAll("[data-micromodal-trigger]");
    videoLinks.forEach(function (videoLink) {
      var modalId = videoLink.getAttribute("data-micromodal-trigger");

      if (!document.getElementById(modalId)) {
        var videoUrl = videoLink.getAttribute("href");

        if (videoUrl) {
          var videoEmbedUrl = "";
          var videoType = "";
          var videoId = videoLink.getAttribute("data-video-id");

          if (/^https?:\/\/www\.youtube\.com\/.+/.test(videoUrl)) {
            videoType = "youtube";
            videoEmbedUrl = "https://www.youtube.com/embed/";

            if (youtubeTag == undefined) {
              youtubeTag = document.createElement('script');
              youtubeTag.src = "https://www.youtube.com/iframe_api";
              firstScriptTag.parentNode.insertBefore(youtubeTag, firstScriptTag);
            }
          } else if (/^https?:\/\/(www\.)?vimeo\.com\/.+/.test(videoUrl)) {
            videoType = "vimeo";
            videoEmbedUrl = "https://player.vimeo.com/video/";

            if (vimeoTag == undefined) {
              vimeoTag = document.createElement('script');
              vimeoTag.src = "https://player.vimeo.com/api/player.js";
              firstScriptTag.parentNode.insertBefore(vimeoTag, firstScriptTag);
            }
          } else if (/^https?:\/\/v\.qq\.com\/.+/.test(videoUrl)) {
            videoType = "tencent";
            videoEmbedUrl = "https://v.qq.com/txp/iframe/player.html?vid=";
          } else {
            videoType = "file";
            videoEmbedUrl = videoUrl;
          }

          if (videoEmbedUrl != "") {
            videoEmbedUrl += videoId;

            if (videoType == "youtube") {
              videoEmbedUrl += "?enablejsapi=1";
            }

            var modalHTML = "<div class='Modal Modal--video micromodal-slide' id='" + modalId + "' aria-hidden='true' data-video-type='" + videoType + "' data-video-id='" + videoId + "'>" + "<div class='modal__overlay' tabindex='-1' data-micromodal-close>" + "<div class='modal__container u-btlbr-small' role='dialog' aria-modal='true' aria-labelledby='" + modalId + "'>" + "<div class='modal__content'>" + "<div class='modal_body'>" + "<div class='modal-video'>" + "<div><button class='modal__close' aria-label='Close modal' data-micromodal-close></button></div>" + "<div class='modal-video-box'>" + "<iframe id='player-" + modalId + "-" + videoId + "' type='text/html' width='640' height='360' src='" + videoEmbedUrl + "' frameborder='0' allow='autoplay; fullscreen; picture-in-picture'></iframe>" + "</div>" + "</div>" + "</div>" + "</div>" + "</div>" + "</div>" + "</div>";
            document.body.insertAdjacentHTML("beforeend", modalHTML);
          }
        }
      }
    });
    MicroModal.init({
      awaitCloseAnimation: true,
      onClose: function onClose(modal, targetObj) {
        if (modal.classList.contains('Modal--video')) {
          try {
            var videoId = modal.getAttribute("data-video-id");
            var videoType = modal.getAttribute("data-video-type");
            var iframe = modal.querySelector("iframe");

            if (videoType == "youtube") {
              var player = YT.get(iframe.getAttribute("id"));
              player.stopVideo();
            } else if (videoType == "tencent") {
              iframe.src = iframe.src.replace("&autoplay=true", "");
            } else if (videoType == "vimeo") {
              var player = new Vimeo.Player(iframe);
              player.unload();
            }
          } catch (e) {}
        }
      },
      onShow: function onShow(modal, tiggerObj, eventObj) {
        console.info(''.concat(modal.id, ' is shown'));

        if (modal.classList.contains('Modal--video')) {
          try {
            var videoId = modal.getAttribute("data-video-id");
            var videoType = modal.getAttribute("data-video-type");
            var iframe = modal.querySelector("iframe");

            if (videoType == "youtube") {
              var player = YT.get(iframe.getAttribute("id"));

              if (player) {
                player.playVideo();
              } else {
                new YT.Player(iframe.getAttribute("id"), {
                  events: {
                    'onReady': function onReady(event) {
                      event.target.playVideo();
                    }
                  }
                });
              }
            } else if (videoType == "tencent") {
              iframe.src += "&autoplay=true";
            } else if (videoType == "vimeo") {
              var player = new Vimeo.Player(iframe);
              player.play();
            }
          } catch (e) {}
        } else {
          var findRetailerModal = new FindRetailerModal();
          findRetailerModal.init(modal, eventObj);
        }
      }
    });
    var modallinks = document.querySelectorAll('[data-micromodal-trigger]');
    modallinks.forEach(function (element) {
      element.addEventListener('click', function (event) {
        event.preventDefault();
      });
    });
  }

  function CardLayout() {}

  function styleInject(css, ref) {
    if ( ref === void 0 ) ref = {};
    var insertAt = ref.insertAt;

    if (!css || typeof document === 'undefined') { return; }

    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';

    if (insertAt === 'top') {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  }

  var css_248z = "/**\n * Swiper 6.1.1\n * Most modern mobile touch slider and framework with hardware accelerated transitions\n * http://swiperjs.com\n *\n * Copyright 2014-2020 Vladimir Kharlampidi\n *\n * Released under the MIT License\n *\n * Released on: July 31, 2020\n */\n\n@font-face {\n  font-family: 'swiper-icons';\n  src: url('data:application/font-woff;charset=utf-8;base64, d09GRgABAAAAAAZgABAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGRlRNAAAGRAAAABoAAAAci6qHkUdERUYAAAWgAAAAIwAAACQAYABXR1BPUwAABhQAAAAuAAAANuAY7+xHU1VCAAAFxAAAAFAAAABm2fPczU9TLzIAAAHcAAAASgAAAGBP9V5RY21hcAAAAkQAAACIAAABYt6F0cBjdnQgAAACzAAAAAQAAAAEABEBRGdhc3AAAAWYAAAACAAAAAj//wADZ2x5ZgAAAywAAADMAAAD2MHtryVoZWFkAAABbAAAADAAAAA2E2+eoWhoZWEAAAGcAAAAHwAAACQC9gDzaG10eAAAAigAAAAZAAAArgJkABFsb2NhAAAC0AAAAFoAAABaFQAUGG1heHAAAAG8AAAAHwAAACAAcABAbmFtZQAAA/gAAAE5AAACXvFdBwlwb3N0AAAFNAAAAGIAAACE5s74hXjaY2BkYGAAYpf5Hu/j+W2+MnAzMYDAzaX6QjD6/4//Bxj5GA8AuRwMYGkAPywL13jaY2BkYGA88P8Agx4j+/8fQDYfA1AEBWgDAIB2BOoAeNpjYGRgYNBh4GdgYgABEMnIABJzYNADCQAACWgAsQB42mNgYfzCOIGBlYGB0YcxjYGBwR1Kf2WQZGhhYGBiYGVmgAFGBiQQkOaawtDAoMBQxXjg/wEGPcYDDA4wNUA2CCgwsAAAO4EL6gAAeNpj2M0gyAACqxgGNWBkZ2D4/wMA+xkDdgAAAHjaY2BgYGaAYBkGRgYQiAHyGMF8FgYHIM3DwMHABGQrMOgyWDLEM1T9/w8UBfEMgLzE////P/5//f/V/xv+r4eaAAeMbAxwIUYmIMHEgKYAYjUcsDAwsLKxc3BycfPw8jEQA/gZBASFhEVExcQlJKWkZWTl5BUUlZRVVNXUNTQZBgMAAMR+E+gAEQFEAAAAKgAqACoANAA+AEgAUgBcAGYAcAB6AIQAjgCYAKIArAC2AMAAygDUAN4A6ADyAPwBBgEQARoBJAEuATgBQgFMAVYBYAFqAXQBfgGIAZIBnAGmAbIBzgHsAAB42u2NMQ6CUAyGW568x9AneYYgm4MJbhKFaExIOAVX8ApewSt4Bic4AfeAid3VOBixDxfPYEza5O+Xfi04YADggiUIULCuEJK8VhO4bSvpdnktHI5QCYtdi2sl8ZnXaHlqUrNKzdKcT8cjlq+rwZSvIVczNiezsfnP/uznmfPFBNODM2K7MTQ45YEAZqGP81AmGGcF3iPqOop0r1SPTaTbVkfUe4HXj97wYE+yNwWYxwWu4v1ugWHgo3S1XdZEVqWM7ET0cfnLGxWfkgR42o2PvWrDMBSFj/IHLaF0zKjRgdiVMwScNRAoWUoH78Y2icB/yIY09An6AH2Bdu/UB+yxopYshQiEvnvu0dURgDt8QeC8PDw7Fpji3fEA4z/PEJ6YOB5hKh4dj3EvXhxPqH/SKUY3rJ7srZ4FZnh1PMAtPhwP6fl2PMJMPDgeQ4rY8YT6Gzao0eAEA409DuggmTnFnOcSCiEiLMgxCiTI6Cq5DZUd3Qmp10vO0LaLTd2cjN4fOumlc7lUYbSQcZFkutRG7g6JKZKy0RmdLY680CDnEJ+UMkpFFe1RN7nxdVpXrC4aTtnaurOnYercZg2YVmLN/d/gczfEimrE/fs/bOuq29Zmn8tloORaXgZgGa78yO9/cnXm2BpaGvq25Dv9S4E9+5SIc9PqupJKhYFSSl47+Qcr1mYNAAAAeNptw0cKwkAAAMDZJA8Q7OUJvkLsPfZ6zFVERPy8qHh2YER+3i/BP83vIBLLySsoKimrqKqpa2hp6+jq6RsYGhmbmJqZSy0sraxtbO3sHRydnEMU4uR6yx7JJXveP7WrDycAAAAAAAH//wACeNpjYGRgYOABYhkgZgJCZgZNBkYGLQZtIJsFLMYAAAw3ALgAeNolizEKgDAQBCchRbC2sFER0YD6qVQiBCv/H9ezGI6Z5XBAw8CBK/m5iQQVauVbXLnOrMZv2oLdKFa8Pjuru2hJzGabmOSLzNMzvutpB3N42mNgZGBg4GKQYzBhYMxJLMlj4GBgAYow/P/PAJJhLM6sSoWKfWCAAwDAjgbRAAB42mNgYGBkAIIbCZo5IPrmUn0hGA0AO8EFTQAA') format('woff');\n  font-weight: 400;\n  font-style: normal;\n}\n:root {\n  --swiper-theme-color: #007aff;\n}\n.swiper-container {\n  margin-left: auto;\n  margin-right: auto;\n  position: relative;\n  overflow: hidden;\n  list-style: none;\n  padding: 0;\n  /* Fix of Webkit flickering */\n  z-index: 1;\n}\n.swiper-container-vertical > .swiper-wrapper {\n  flex-direction: column;\n}\n.swiper-wrapper {\n  position: relative;\n  width: 100%;\n  height: 100%;\n  z-index: 1;\n  display: flex;\n  transition-property: transform;\n  box-sizing: content-box;\n}\n.swiper-container-android .swiper-slide,\n.swiper-wrapper {\n  transform: translate3d(0px, 0, 0);\n}\n.swiper-container-multirow > .swiper-wrapper {\n  flex-wrap: wrap;\n}\n.swiper-container-multirow-column > .swiper-wrapper {\n  flex-wrap: wrap;\n  flex-direction: column;\n}\n.swiper-container-free-mode > .swiper-wrapper {\n  transition-timing-function: ease-out;\n  margin: 0 auto;\n}\n.swiper-slide {\n  flex-shrink: 0;\n  width: 100%;\n  height: 100%;\n  position: relative;\n  transition-property: transform;\n}\n.swiper-slide-invisible-blank {\n  visibility: hidden;\n}\n/* Auto Height */\n.swiper-container-autoheight,\n.swiper-container-autoheight .swiper-slide {\n  height: auto;\n}\n.swiper-container-autoheight .swiper-wrapper {\n  align-items: flex-start;\n  transition-property: transform, height;\n}\n/* 3D Effects */\n.swiper-container-3d {\n  perspective: 1200px;\n}\n.swiper-container-3d .swiper-wrapper,\n.swiper-container-3d .swiper-slide,\n.swiper-container-3d .swiper-slide-shadow-left,\n.swiper-container-3d .swiper-slide-shadow-right,\n.swiper-container-3d .swiper-slide-shadow-top,\n.swiper-container-3d .swiper-slide-shadow-bottom,\n.swiper-container-3d .swiper-cube-shadow {\n  transform-style: preserve-3d;\n}\n.swiper-container-3d .swiper-slide-shadow-left,\n.swiper-container-3d .swiper-slide-shadow-right,\n.swiper-container-3d .swiper-slide-shadow-top,\n.swiper-container-3d .swiper-slide-shadow-bottom {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  z-index: 10;\n}\n.swiper-container-3d .swiper-slide-shadow-left {\n  background-image: linear-gradient(to left, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0));\n}\n.swiper-container-3d .swiper-slide-shadow-right {\n  background-image: linear-gradient(to right, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0));\n}\n.swiper-container-3d .swiper-slide-shadow-top {\n  background-image: linear-gradient(to top, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0));\n}\n.swiper-container-3d .swiper-slide-shadow-bottom {\n  background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0));\n}\n/* CSS Mode */\n.swiper-container-css-mode > .swiper-wrapper {\n  overflow: auto;\n  scrollbar-width: none;\n  /* For Firefox */\n  -ms-overflow-style: none;\n  /* For Internet Explorer and Edge */\n}\n.swiper-container-css-mode > .swiper-wrapper::-webkit-scrollbar {\n  display: none;\n}\n.swiper-container-css-mode > .swiper-wrapper > .swiper-slide {\n  scroll-snap-align: start start;\n}\n.swiper-container-horizontal.swiper-container-css-mode > .swiper-wrapper {\n  -ms-scroll-snap-type: x mandatory;\n      scroll-snap-type: x mandatory;\n}\n.swiper-container-vertical.swiper-container-css-mode > .swiper-wrapper {\n  -ms-scroll-snap-type: y mandatory;\n      scroll-snap-type: y mandatory;\n}\n:root {\n  --swiper-navigation-size: 44px;\n  /*\n  --swiper-navigation-color: var(--swiper-theme-color);\n  */\n}\n.swiper-button-prev,\n.swiper-button-next {\n  position: absolute;\n  top: 50%;\n  width: calc(var(--swiper-navigation-size) / 44 * 27);\n  height: var(--swiper-navigation-size);\n  margin-top: calc(-1 * var(--swiper-navigation-size) / 2);\n  z-index: 10;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--swiper-navigation-color, var(--swiper-theme-color));\n}\n.swiper-button-prev.swiper-button-disabled,\n.swiper-button-next.swiper-button-disabled {\n  opacity: 0.35;\n  cursor: auto;\n  pointer-events: none;\n}\n.swiper-button-prev:after,\n.swiper-button-next:after {\n  font-family: swiper-icons;\n  font-size: var(--swiper-navigation-size);\n  text-transform: none !important;\n  letter-spacing: 0;\n  text-transform: none;\n  font-variant: initial;\n  line-height: 1;\n}\n.swiper-button-prev,\n.swiper-container-rtl .swiper-button-next {\n  left: 10px;\n  right: auto;\n}\n.swiper-button-prev:after,\n.swiper-container-rtl .swiper-button-next:after {\n  content: 'prev';\n}\n.swiper-button-next,\n.swiper-container-rtl .swiper-button-prev {\n  right: 10px;\n  left: auto;\n}\n.swiper-button-next:after,\n.swiper-container-rtl .swiper-button-prev:after {\n  content: 'next';\n}\n.swiper-button-prev.swiper-button-white,\n.swiper-button-next.swiper-button-white {\n  --swiper-navigation-color: #ffffff;\n}\n.swiper-button-prev.swiper-button-black,\n.swiper-button-next.swiper-button-black {\n  --swiper-navigation-color: #000000;\n}\n.swiper-button-lock {\n  display: none;\n}\n:root {\n  /*\n  --swiper-pagination-color: var(--swiper-theme-color);\n  */\n}\n.swiper-pagination {\n  position: absolute;\n  text-align: center;\n  transition: 300ms opacity;\n  transform: translate3d(0, 0, 0);\n  z-index: 10;\n}\n.swiper-pagination.swiper-pagination-hidden {\n  opacity: 0;\n}\n/* Common Styles */\n.swiper-pagination-fraction,\n.swiper-pagination-custom,\n.swiper-container-horizontal > .swiper-pagination-bullets {\n  bottom: 10px;\n  left: 0;\n  width: 100%;\n}\n/* Bullets */\n.swiper-pagination-bullets-dynamic {\n  overflow: hidden;\n  font-size: 0;\n}\n.swiper-pagination-bullets-dynamic .swiper-pagination-bullet {\n  transform: scale(0.33);\n  position: relative;\n}\n.swiper-pagination-bullets-dynamic .swiper-pagination-bullet-active {\n  transform: scale(1);\n}\n.swiper-pagination-bullets-dynamic .swiper-pagination-bullet-active-main {\n  transform: scale(1);\n}\n.swiper-pagination-bullets-dynamic .swiper-pagination-bullet-active-prev {\n  transform: scale(0.66);\n}\n.swiper-pagination-bullets-dynamic .swiper-pagination-bullet-active-prev-prev {\n  transform: scale(0.33);\n}\n.swiper-pagination-bullets-dynamic .swiper-pagination-bullet-active-next {\n  transform: scale(0.66);\n}\n.swiper-pagination-bullets-dynamic .swiper-pagination-bullet-active-next-next {\n  transform: scale(0.33);\n}\n.swiper-pagination-bullet {\n  width: 8px;\n  height: 8px;\n  display: inline-block;\n  border-radius: 100%;\n  background: #000;\n  opacity: 0.2;\n}\nbutton.swiper-pagination-bullet {\n  border: none;\n  margin: 0;\n  padding: 0;\n  box-shadow: none;\n  appearance: none;\n}\n.swiper-pagination-clickable .swiper-pagination-bullet {\n  cursor: pointer;\n}\n.swiper-pagination-bullet-active {\n  opacity: 1;\n  background: var(--swiper-pagination-color, var(--swiper-theme-color));\n}\n.swiper-container-vertical > .swiper-pagination-bullets {\n  right: 10px;\n  top: 50%;\n  transform: translate3d(0px, -50%, 0);\n}\n.swiper-container-vertical > .swiper-pagination-bullets .swiper-pagination-bullet {\n  margin: 6px 0;\n  display: block;\n}\n.swiper-container-vertical > .swiper-pagination-bullets.swiper-pagination-bullets-dynamic {\n  top: 50%;\n  transform: translateY(-50%);\n  width: 8px;\n}\n.swiper-container-vertical > .swiper-pagination-bullets.swiper-pagination-bullets-dynamic .swiper-pagination-bullet {\n  display: inline-block;\n  transition: 200ms transform, 200ms top;\n}\n.swiper-container-horizontal > .swiper-pagination-bullets .swiper-pagination-bullet {\n  margin: 0 4px;\n}\n.swiper-container-horizontal > .swiper-pagination-bullets.swiper-pagination-bullets-dynamic {\n  left: 50%;\n  transform: translateX(-50%);\n  white-space: nowrap;\n}\n.swiper-container-horizontal > .swiper-pagination-bullets.swiper-pagination-bullets-dynamic .swiper-pagination-bullet {\n  transition: 200ms transform, 200ms left;\n}\n.swiper-container-horizontal.swiper-container-rtl > .swiper-pagination-bullets-dynamic .swiper-pagination-bullet {\n  transition: 200ms transform, 200ms right;\n}\n/* Progress */\n.swiper-pagination-progressbar {\n  background: rgba(0, 0, 0, 0.25);\n  position: absolute;\n}\n.swiper-pagination-progressbar .swiper-pagination-progressbar-fill {\n  background: var(--swiper-pagination-color, var(--swiper-theme-color));\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100%;\n  height: 100%;\n  transform: scale(0);\n  transform-origin: left top;\n}\n.swiper-container-rtl .swiper-pagination-progressbar .swiper-pagination-progressbar-fill {\n  transform-origin: right top;\n}\n.swiper-container-horizontal > .swiper-pagination-progressbar,\n.swiper-container-vertical > .swiper-pagination-progressbar.swiper-pagination-progressbar-opposite {\n  width: 100%;\n  height: 4px;\n  left: 0;\n  top: 0;\n}\n.swiper-container-vertical > .swiper-pagination-progressbar,\n.swiper-container-horizontal > .swiper-pagination-progressbar.swiper-pagination-progressbar-opposite {\n  width: 4px;\n  height: 100%;\n  left: 0;\n  top: 0;\n}\n.swiper-pagination-white {\n  --swiper-pagination-color: #ffffff;\n}\n.swiper-pagination-black {\n  --swiper-pagination-color: #000000;\n}\n.swiper-pagination-lock {\n  display: none;\n}\n/* Scrollbar */\n.swiper-scrollbar {\n  border-radius: 10px;\n  position: relative;\n  -ms-touch-action: none;\n  background: rgba(0, 0, 0, 0.1);\n}\n.swiper-container-horizontal > .swiper-scrollbar {\n  position: absolute;\n  left: 1%;\n  bottom: 3px;\n  z-index: 50;\n  height: 5px;\n  width: 98%;\n}\n.swiper-container-vertical > .swiper-scrollbar {\n  position: absolute;\n  right: 3px;\n  top: 1%;\n  z-index: 50;\n  width: 5px;\n  height: 98%;\n}\n.swiper-scrollbar-drag {\n  height: 100%;\n  width: 100%;\n  position: relative;\n  background: rgba(0, 0, 0, 0.5);\n  border-radius: 10px;\n  left: 0;\n  top: 0;\n}\n.swiper-scrollbar-cursor-drag {\n  cursor: move;\n}\n.swiper-scrollbar-lock {\n  display: none;\n}\n.swiper-zoom-container {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  text-align: center;\n}\n.swiper-zoom-container > img,\n.swiper-zoom-container > svg,\n.swiper-zoom-container > canvas {\n  max-width: 100%;\n  max-height: 100%;\n  object-fit: contain;\n}\n.swiper-slide-zoomed {\n  cursor: move;\n}\n/* Preloader */\n:root {\n  /*\n  --swiper-preloader-color: var(--swiper-theme-color);\n  */\n}\n.swiper-lazy-preloader {\n  width: 42px;\n  height: 42px;\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  margin-left: -21px;\n  margin-top: -21px;\n  z-index: 10;\n  transform-origin: 50%;\n  animation: swiper-preloader-spin 1s infinite linear;\n  box-sizing: border-box;\n  border: 4px solid var(--swiper-preloader-color, var(--swiper-theme-color));\n  border-radius: 50%;\n  border-top-color: transparent;\n}\n.swiper-lazy-preloader-white {\n  --swiper-preloader-color: #fff;\n}\n.swiper-lazy-preloader-black {\n  --swiper-preloader-color: #000;\n}\n@keyframes swiper-preloader-spin {\n  100% {\n    transform: rotate(360deg);\n  }\n}\n/* a11y */\n.swiper-container .swiper-notification {\n  position: absolute;\n  left: 0;\n  top: 0;\n  pointer-events: none;\n  opacity: 0;\n  z-index: -1000;\n}\n.swiper-container-fade.swiper-container-free-mode .swiper-slide {\n  transition-timing-function: ease-out;\n}\n.swiper-container-fade .swiper-slide {\n  pointer-events: none;\n  transition-property: opacity;\n}\n.swiper-container-fade .swiper-slide .swiper-slide {\n  pointer-events: none;\n}\n.swiper-container-fade .swiper-slide-active,\n.swiper-container-fade .swiper-slide-active .swiper-slide-active {\n  pointer-events: auto;\n}\n.swiper-container-cube {\n  overflow: visible;\n}\n.swiper-container-cube .swiper-slide {\n  pointer-events: none;\n  backface-visibility: hidden;\n  z-index: 1;\n  visibility: hidden;\n  transform-origin: 0 0;\n  width: 100%;\n  height: 100%;\n}\n.swiper-container-cube .swiper-slide .swiper-slide {\n  pointer-events: none;\n}\n.swiper-container-cube.swiper-container-rtl .swiper-slide {\n  transform-origin: 100% 0;\n}\n.swiper-container-cube .swiper-slide-active,\n.swiper-container-cube .swiper-slide-active .swiper-slide-active {\n  pointer-events: auto;\n}\n.swiper-container-cube .swiper-slide-active,\n.swiper-container-cube .swiper-slide-next,\n.swiper-container-cube .swiper-slide-prev,\n.swiper-container-cube .swiper-slide-next + .swiper-slide {\n  pointer-events: auto;\n  visibility: visible;\n}\n.swiper-container-cube .swiper-slide-shadow-top,\n.swiper-container-cube .swiper-slide-shadow-bottom,\n.swiper-container-cube .swiper-slide-shadow-left,\n.swiper-container-cube .swiper-slide-shadow-right {\n  z-index: 0;\n  backface-visibility: hidden;\n}\n.swiper-container-cube .swiper-cube-shadow {\n  position: absolute;\n  left: 0;\n  bottom: 0px;\n  width: 100%;\n  height: 100%;\n  background: #000;\n  opacity: 0.6;\n  filter: blur(50px);\n  z-index: 0;\n}\n.swiper-container-flip {\n  overflow: visible;\n}\n.swiper-container-flip .swiper-slide {\n  pointer-events: none;\n  backface-visibility: hidden;\n  z-index: 1;\n}\n.swiper-container-flip .swiper-slide .swiper-slide {\n  pointer-events: none;\n}\n.swiper-container-flip .swiper-slide-active,\n.swiper-container-flip .swiper-slide-active .swiper-slide-active {\n  pointer-events: auto;\n}\n.swiper-container-flip .swiper-slide-shadow-top,\n.swiper-container-flip .swiper-slide-shadow-bottom,\n.swiper-container-flip .swiper-slide-shadow-left,\n.swiper-container-flip .swiper-slide-shadow-right {\n  z-index: 0;\n  backface-visibility: hidden;\n}\n";
  styleInject(css_248z);

  /**
   * SSR Window 3.0.0-alpha.4
   * Better handling for window object in SSR environment
   * https://github.com/nolimits4web/ssr-window
   *
   * Copyright 2020, Vladimir Kharlampidi
   *
   * Licensed under MIT
   *
   * Released on: May 20, 2020
   */
  /* eslint-disable no-param-reassign */
  function isObject(obj) {
      return (obj !== null &&
          typeof obj === 'object' &&
          'constructor' in obj &&
          obj.constructor === Object);
  }
  function extend(target, src) {
      if (target === void 0) { target = {}; }
      if (src === void 0) { src = {}; }
      Object.keys(src).forEach(function (key) {
          if (typeof target[key] === 'undefined')
              target[key] = src[key];
          else if (isObject(src[key]) &&
              isObject(target[key]) &&
              Object.keys(src[key]).length > 0) {
              extend(target[key], src[key]);
          }
      });
  }

  var ssrDocument = {
      body: {},
      addEventListener: function () { },
      removeEventListener: function () { },
      activeElement: {
          blur: function () { },
          nodeName: '',
      },
      querySelector: function () {
          return null;
      },
      querySelectorAll: function () {
          return [];
      },
      getElementById: function () {
          return null;
      },
      createEvent: function () {
          return {
              initEvent: function () { },
          };
      },
      createElement: function () {
          return {
              children: [],
              childNodes: [],
              style: {},
              setAttribute: function () { },
              getElementsByTagName: function () {
                  return [];
              },
          };
      },
      createElementNS: function () {
          return {};
      },
      importNode: function () {
          return null;
      },
      location: {
          hash: '',
          host: '',
          hostname: '',
          href: '',
          origin: '',
          pathname: '',
          protocol: '',
          search: '',
      },
  };
  function getDocument() {
      var doc = typeof document !== 'undefined' ? document : {};
      extend(doc, ssrDocument);
      return doc;
  }

  var ssrWindow = {
      document: ssrDocument,
      navigator: {
          userAgent: '',
      },
      location: {
          hash: '',
          host: '',
          hostname: '',
          href: '',
          origin: '',
          pathname: '',
          protocol: '',
          search: '',
      },
      history: {
          replaceState: function () { },
          pushState: function () { },
          go: function () { },
          back: function () { },
      },
      CustomEvent: function CustomEvent() {
          return this;
      },
      addEventListener: function () { },
      removeEventListener: function () { },
      getComputedStyle: function () {
          return {
              getPropertyValue: function () {
                  return '';
              },
          };
      },
      Image: function () { },
      Date: function () { },
      screen: {},
      setTimeout: function () { },
      clearTimeout: function () { },
      matchMedia: function () {
          return {};
      },
      requestAnimationFrame: function (callback) {
          if (typeof setTimeout === 'undefined') {
              callback();
              return null;
          }
          return setTimeout(callback, 0);
      },
      cancelAnimationFrame: function (id) {
          if (typeof setTimeout === 'undefined') {
              return;
          }
          clearTimeout(id);
      },
  };
  function getWindow() {
      var win = typeof window !== 'undefined' ? window : {};
      extend(win, ssrWindow);
      return win;
  }

  /**
   * Dom7 3.0.0-alpha.7
   * Minimalistic JavaScript library for DOM manipulation, with a jQuery-compatible API
   * https://framework7.io/docs/dom7.html
   *
   * Copyright 2020, Vladimir Kharlampidi
   *
   * Licensed under MIT
   *
   * Released on: July 14, 2020
   */

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct(Parent, args, Class) {
    if (_isNativeReflectConstruct()) {
      _construct = Reflect.construct;
    } else {
      _construct = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    }

    return _construct.apply(null, arguments);
  }

  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }

  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;

    _wrapNativeSuper = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction(Class)) return Class;

      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }

      if (typeof _cache !== "undefined") {
        if (_cache.has(Class)) return _cache.get(Class);

        _cache.set(Class, Wrapper);
      }

      function Wrapper() {
        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
      }

      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf(Wrapper, Class);
    };

    return _wrapNativeSuper(Class);
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  /* eslint-disable no-proto */
  function makeReactive(obj) {
    var proto = obj.__proto__;
    Object.defineProperty(obj, '__proto__', {
      get: function get() {
        return proto;
      },
      set: function set(value) {
        proto.__proto__ = value;
      }
    });
  }

  var Dom7 = /*#__PURE__*/function (_Array) {
    _inheritsLoose(Dom7, _Array);

    function Dom7(items) {
      var _this;

      _this = _Array.call.apply(_Array, [this].concat(items)) || this;
      makeReactive(_assertThisInitialized(_this));
      return _this;
    }

    return Dom7;
  }( /*#__PURE__*/_wrapNativeSuper(Array));

  function arrayFlat(arr) {
    if (arr === void 0) {
      arr = [];
    }

    var res = [];
    arr.forEach(function (el) {
      if (Array.isArray(el)) {
        res.push.apply(res, arrayFlat(el));
      } else {
        res.push(el);
      }
    });
    return res;
  }
  function arrayFilter(arr, callback) {
    return Array.prototype.filter.call(arr, callback);
  }
  function arrayUnique(arr) {
    var uniqueArray = [];

    for (var i = 0; i < arr.length; i += 1) {
      if (uniqueArray.indexOf(arr[i]) === -1) uniqueArray.push(arr[i]);
    }

    return uniqueArray;
  }

  function qsa(selector, context) {
    if (typeof selector !== 'string') {
      return [selector];
    }

    var a = [];
    var res = context.querySelectorAll(selector);

    for (var i = 0; i < res.length; i += 1) {
      a.push(res[i]);
    }

    return a;
  }

  function $(selector, context) {
    var window = getWindow();
    var document = getDocument();
    var arr = [];

    if (!context && selector instanceof Dom7) {
      return selector;
    }

    if (!selector) {
      return new Dom7(arr);
    }

    if (typeof selector === 'string') {
      var html = selector.trim();

      if (html.indexOf('<') >= 0 && html.indexOf('>') >= 0) {
        var toCreate = 'div';
        if (html.indexOf('<li') === 0) toCreate = 'ul';
        if (html.indexOf('<tr') === 0) toCreate = 'tbody';
        if (html.indexOf('<td') === 0 || html.indexOf('<th') === 0) toCreate = 'tr';
        if (html.indexOf('<tbody') === 0) toCreate = 'table';
        if (html.indexOf('<option') === 0) toCreate = 'select';
        var tempParent = document.createElement(toCreate);
        tempParent.innerHTML = html;

        for (var i = 0; i < tempParent.childNodes.length; i += 1) {
          arr.push(tempParent.childNodes[i]);
        }
      } else {
        arr = qsa(selector.trim(), context || document);
      } // arr = qsa(selector, document);

    } else if (selector.nodeType || selector === window || selector === document) {
      arr.push(selector);
    } else if (Array.isArray(selector)) {
      if (selector instanceof Dom7) return selector;
      arr = selector;
    }

    return new Dom7(arrayUnique(arr));
  }

  $.fn = Dom7.prototype;

  function addClass() {
    for (var _len = arguments.length, classes = new Array(_len), _key = 0; _key < _len; _key++) {
      classes[_key] = arguments[_key];
    }

    var classNames = arrayFlat(classes.map(function (c) {
      return c.split(' ');
    }));
    this.forEach(function (el) {
      var _el$classList;

      (_el$classList = el.classList).add.apply(_el$classList, classNames);
    });
    return this;
  }

  function removeClass() {
    for (var _len2 = arguments.length, classes = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      classes[_key2] = arguments[_key2];
    }

    var classNames = arrayFlat(classes.map(function (c) {
      return c.split(' ');
    }));
    this.forEach(function (el) {
      var _el$classList2;

      (_el$classList2 = el.classList).remove.apply(_el$classList2, classNames);
    });
    return this;
  }

  function toggleClass() {
    for (var _len3 = arguments.length, classes = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      classes[_key3] = arguments[_key3];
    }

    var classNames = arrayFlat(classes.map(function (c) {
      return c.split(' ');
    }));
    this.forEach(function (el) {
      classNames.forEach(function (className) {
        el.classList.toggle(className);
      });
    });
  }

  function hasClass() {
    for (var _len4 = arguments.length, classes = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      classes[_key4] = arguments[_key4];
    }

    var classNames = arrayFlat(classes.map(function (c) {
      return c.split(' ');
    }));
    return arrayFilter(this, function (el) {
      return classNames.filter(function (className) {
        return el.classList.contains(className);
      }).length > 0;
    }).length > 0;
  }

  function attr(attrs, value) {
    if (arguments.length === 1 && typeof attrs === 'string') {
      // Get attr
      if (this[0]) return this[0].getAttribute(attrs);
      return undefined;
    } // Set attrs


    for (var i = 0; i < this.length; i += 1) {
      if (arguments.length === 2) {
        // String
        this[i].setAttribute(attrs, value);
      } else {
        // Object
        for (var attrName in attrs) {
          this[i][attrName] = attrs[attrName];
          this[i].setAttribute(attrName, attrs[attrName]);
        }
      }
    }

    return this;
  }

  function removeAttr(attr) {
    for (var i = 0; i < this.length; i += 1) {
      this[i].removeAttribute(attr);
    }

    return this;
  }

  function transform(transform) {
    for (var i = 0; i < this.length; i += 1) {
      this[i].style.transform = transform;
    }

    return this;
  }

  function transition(duration) {
    for (var i = 0; i < this.length; i += 1) {
      this[i].style.transition = typeof duration !== 'string' ? duration + "ms" : duration;
    }

    return this;
  }

  function on() {
    for (var _len5 = arguments.length, args = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    var eventType = args[0],
        targetSelector = args[1],
        listener = args[2],
        capture = args[3];

    if (typeof args[1] === 'function') {
      eventType = args[0];
      listener = args[1];
      capture = args[2];
      targetSelector = undefined;
    }

    if (!capture) capture = false;

    function handleLiveEvent(e) {
      var target = e.target;
      if (!target) return;
      var eventData = e.target.dom7EventData || [];

      if (eventData.indexOf(e) < 0) {
        eventData.unshift(e);
      }

      if ($(target).is(targetSelector)) listener.apply(target, eventData);else {
        var _parents = $(target).parents(); // eslint-disable-line


        for (var k = 0; k < _parents.length; k += 1) {
          if ($(_parents[k]).is(targetSelector)) listener.apply(_parents[k], eventData);
        }
      }
    }

    function handleEvent(e) {
      var eventData = e && e.target ? e.target.dom7EventData || [] : [];

      if (eventData.indexOf(e) < 0) {
        eventData.unshift(e);
      }

      listener.apply(this, eventData);
    }

    var events = eventType.split(' ');
    var j;

    for (var i = 0; i < this.length; i += 1) {
      var el = this[i];

      if (!targetSelector) {
        for (j = 0; j < events.length; j += 1) {
          var event = events[j];
          if (!el.dom7Listeners) el.dom7Listeners = {};
          if (!el.dom7Listeners[event]) el.dom7Listeners[event] = [];
          el.dom7Listeners[event].push({
            listener: listener,
            proxyListener: handleEvent
          });
          el.addEventListener(event, handleEvent, capture);
        }
      } else {
        // Live events
        for (j = 0; j < events.length; j += 1) {
          var _event = events[j];
          if (!el.dom7LiveListeners) el.dom7LiveListeners = {};
          if (!el.dom7LiveListeners[_event]) el.dom7LiveListeners[_event] = [];

          el.dom7LiveListeners[_event].push({
            listener: listener,
            proxyListener: handleLiveEvent
          });

          el.addEventListener(_event, handleLiveEvent, capture);
        }
      }
    }

    return this;
  }

  function off() {
    for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    var eventType = args[0],
        targetSelector = args[1],
        listener = args[2],
        capture = args[3];

    if (typeof args[1] === 'function') {
      eventType = args[0];
      listener = args[1];
      capture = args[2];
      targetSelector = undefined;
    }

    if (!capture) capture = false;
    var events = eventType.split(' ');

    for (var i = 0; i < events.length; i += 1) {
      var event = events[i];

      for (var j = 0; j < this.length; j += 1) {
        var el = this[j];
        var handlers = void 0;

        if (!targetSelector && el.dom7Listeners) {
          handlers = el.dom7Listeners[event];
        } else if (targetSelector && el.dom7LiveListeners) {
          handlers = el.dom7LiveListeners[event];
        }

        if (handlers && handlers.length) {
          for (var k = handlers.length - 1; k >= 0; k -= 1) {
            var handler = handlers[k];

            if (listener && handler.listener === listener) {
              el.removeEventListener(event, handler.proxyListener, capture);
              handlers.splice(k, 1);
            } else if (listener && handler.listener && handler.listener.dom7proxy && handler.listener.dom7proxy === listener) {
              el.removeEventListener(event, handler.proxyListener, capture);
              handlers.splice(k, 1);
            } else if (!listener) {
              el.removeEventListener(event, handler.proxyListener, capture);
              handlers.splice(k, 1);
            }
          }
        }
      }
    }

    return this;
  }

  function trigger() {
    var window = getWindow();

    for (var _len9 = arguments.length, args = new Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
      args[_key9] = arguments[_key9];
    }

    var events = args[0].split(' ');
    var eventData = args[1];

    for (var i = 0; i < events.length; i += 1) {
      var event = events[i];

      for (var j = 0; j < this.length; j += 1) {
        var el = this[j];

        if (window.CustomEvent) {
          var evt = new window.CustomEvent(event, {
            detail: eventData,
            bubbles: true,
            cancelable: true
          });
          el.dom7EventData = args.filter(function (data, dataIndex) {
            return dataIndex > 0;
          });
          el.dispatchEvent(evt);
          el.dom7EventData = [];
          delete el.dom7EventData;
        }
      }
    }

    return this;
  }

  function transitionEnd(callback) {
    var dom = this;

    function fireCallBack(e) {
      if (e.target !== this) return;
      callback.call(this, e);
      dom.off('transitionend', fireCallBack);
    }

    if (callback) {
      dom.on('transitionend', fireCallBack);
    }

    return this;
  }

  function outerWidth(includeMargins) {
    if (this.length > 0) {
      if (includeMargins) {
        var _styles = this.styles();

        return this[0].offsetWidth + parseFloat(_styles.getPropertyValue('margin-right')) + parseFloat(_styles.getPropertyValue('margin-left'));
      }

      return this[0].offsetWidth;
    }

    return null;
  }

  function outerHeight(includeMargins) {
    if (this.length > 0) {
      if (includeMargins) {
        var _styles2 = this.styles();

        return this[0].offsetHeight + parseFloat(_styles2.getPropertyValue('margin-top')) + parseFloat(_styles2.getPropertyValue('margin-bottom'));
      }

      return this[0].offsetHeight;
    }

    return null;
  }

  function offset() {
    if (this.length > 0) {
      var window = getWindow();
      var document = getDocument();
      var el = this[0];
      var box = el.getBoundingClientRect();
      var body = document.body;
      var clientTop = el.clientTop || body.clientTop || 0;
      var clientLeft = el.clientLeft || body.clientLeft || 0;
      var scrollTop = el === window ? window.scrollY : el.scrollTop;
      var scrollLeft = el === window ? window.scrollX : el.scrollLeft;
      return {
        top: box.top + scrollTop - clientTop,
        left: box.left + scrollLeft - clientLeft
      };
    }

    return null;
  }

  function styles() {
    var window = getWindow();
    if (this[0]) return window.getComputedStyle(this[0], null);
    return {};
  }

  function css(props, value) {
    var window = getWindow();
    var i;

    if (arguments.length === 1) {
      if (typeof props === 'string') {
        // .css('width')
        if (this[0]) return window.getComputedStyle(this[0], null).getPropertyValue(props);
      } else {
        // .css({ width: '100px' })
        for (i = 0; i < this.length; i += 1) {
          for (var _prop in props) {
            this[i].style[_prop] = props[_prop];
          }
        }

        return this;
      }
    }

    if (arguments.length === 2 && typeof props === 'string') {
      // .css('width', '100px')
      for (i = 0; i < this.length; i += 1) {
        this[i].style[props] = value;
      }

      return this;
    }

    return this;
  }

  function each(callback) {
    if (!callback) return this;
    this.forEach(function (el, index) {
      callback.apply(el, [el, index]);
    });
    return this;
  }

  function filter(callback) {
    var result = arrayFilter(this, callback);
    return $(result);
  }

  function html(html) {
    if (typeof html === 'undefined') {
      return this[0] ? this[0].innerHTML : null;
    }

    for (var i = 0; i < this.length; i += 1) {
      this[i].innerHTML = html;
    }

    return this;
  }

  function text(text) {
    if (typeof text === 'undefined') {
      return this[0] ? this[0].textContent.trim() : null;
    }

    for (var i = 0; i < this.length; i += 1) {
      this[i].textContent = text;
    }

    return this;
  }

  function is(selector) {
    var window = getWindow();
    var document = getDocument();
    var el = this[0];
    var compareWith;
    var i;
    if (!el || typeof selector === 'undefined') return false;

    if (typeof selector === 'string') {
      if (el.matches) return el.matches(selector);
      if (el.webkitMatchesSelector) return el.webkitMatchesSelector(selector);
      if (el.msMatchesSelector) return el.msMatchesSelector(selector);
      compareWith = $(selector);

      for (i = 0; i < compareWith.length; i += 1) {
        if (compareWith[i] === el) return true;
      }

      return false;
    }

    if (selector === document) {
      return el === document;
    }

    if (selector === window) {
      return el === window;
    }

    if (selector.nodeType || selector instanceof Dom7) {
      compareWith = selector.nodeType ? [selector] : selector;

      for (i = 0; i < compareWith.length; i += 1) {
        if (compareWith[i] === el) return true;
      }

      return false;
    }

    return false;
  }

  function index() {
    var child = this[0];
    var i;

    if (child) {
      i = 0; // eslint-disable-next-line

      while ((child = child.previousSibling) !== null) {
        if (child.nodeType === 1) i += 1;
      }

      return i;
    }

    return undefined;
  }

  function eq(index) {
    if (typeof index === 'undefined') return this;
    var length = this.length;

    if (index > length - 1) {
      return $([]);
    }

    if (index < 0) {
      var returnIndex = length + index;
      if (returnIndex < 0) return $([]);
      return $([this[returnIndex]]);
    }

    return $([this[index]]);
  }

  function append() {
    var newChild;
    var document = getDocument();

    for (var k = 0; k < arguments.length; k += 1) {
      newChild = k < 0 || arguments.length <= k ? undefined : arguments[k];

      for (var i = 0; i < this.length; i += 1) {
        if (typeof newChild === 'string') {
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = newChild;

          while (tempDiv.firstChild) {
            this[i].appendChild(tempDiv.firstChild);
          }
        } else if (newChild instanceof Dom7) {
          for (var j = 0; j < newChild.length; j += 1) {
            this[i].appendChild(newChild[j]);
          }
        } else {
          this[i].appendChild(newChild);
        }
      }
    }

    return this;
  }

  function prepend(newChild) {
    var document = getDocument();
    var i;
    var j;

    for (i = 0; i < this.length; i += 1) {
      if (typeof newChild === 'string') {
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = newChild;

        for (j = tempDiv.childNodes.length - 1; j >= 0; j -= 1) {
          this[i].insertBefore(tempDiv.childNodes[j], this[i].childNodes[0]);
        }
      } else if (newChild instanceof Dom7) {
        for (j = 0; j < newChild.length; j += 1) {
          this[i].insertBefore(newChild[j], this[i].childNodes[0]);
        }
      } else {
        this[i].insertBefore(newChild, this[i].childNodes[0]);
      }
    }

    return this;
  }

  function next(selector) {
    if (this.length > 0) {
      if (selector) {
        if (this[0].nextElementSibling && $(this[0].nextElementSibling).is(selector)) {
          return $([this[0].nextElementSibling]);
        }

        return $([]);
      }

      if (this[0].nextElementSibling) return $([this[0].nextElementSibling]);
      return $([]);
    }

    return $([]);
  }

  function nextAll(selector) {
    var nextEls = [];
    var el = this[0];
    if (!el) return $([]);

    while (el.nextElementSibling) {
      var _next = el.nextElementSibling; // eslint-disable-line

      if (selector) {
        if ($(_next).is(selector)) nextEls.push(_next);
      } else nextEls.push(_next);

      el = _next;
    }

    return $(nextEls);
  }

  function prev(selector) {
    if (this.length > 0) {
      var el = this[0];

      if (selector) {
        if (el.previousElementSibling && $(el.previousElementSibling).is(selector)) {
          return $([el.previousElementSibling]);
        }

        return $([]);
      }

      if (el.previousElementSibling) return $([el.previousElementSibling]);
      return $([]);
    }

    return $([]);
  }

  function prevAll(selector) {
    var prevEls = [];
    var el = this[0];
    if (!el) return $([]);

    while (el.previousElementSibling) {
      var _prev = el.previousElementSibling; // eslint-disable-line

      if (selector) {
        if ($(_prev).is(selector)) prevEls.push(_prev);
      } else prevEls.push(_prev);

      el = _prev;
    }

    return $(prevEls);
  }

  function parent(selector) {
    var parents = []; // eslint-disable-line

    for (var i = 0; i < this.length; i += 1) {
      if (this[i].parentNode !== null) {
        if (selector) {
          if ($(this[i].parentNode).is(selector)) parents.push(this[i].parentNode);
        } else {
          parents.push(this[i].parentNode);
        }
      }
    }

    return $(parents);
  }

  function parents(selector) {
    var parents = []; // eslint-disable-line

    for (var i = 0; i < this.length; i += 1) {
      var _parent = this[i].parentNode; // eslint-disable-line

      while (_parent) {
        if (selector) {
          if ($(_parent).is(selector)) parents.push(_parent);
        } else {
          parents.push(_parent);
        }

        _parent = _parent.parentNode;
      }
    }

    return $(parents);
  }

  function closest(selector) {
    var closest = this; // eslint-disable-line

    if (typeof selector === 'undefined') {
      return $([]);
    }

    if (!closest.is(selector)) {
      closest = closest.parents(selector).eq(0);
    }

    return closest;
  }

  function find(selector) {
    var foundElements = [];

    for (var i = 0; i < this.length; i += 1) {
      var found = this[i].querySelectorAll(selector);

      for (var j = 0; j < found.length; j += 1) {
        foundElements.push(found[j]);
      }
    }

    return $(foundElements);
  }

  function children(selector) {
    var children = []; // eslint-disable-line

    for (var i = 0; i < this.length; i += 1) {
      var childNodes = this[i].children;

      for (var j = 0; j < childNodes.length; j += 1) {
        if (!selector || $(childNodes[j]).is(selector)) {
          children.push(childNodes[j]);
        }
      }
    }

    return $(children);
  }

  function remove() {
    for (var i = 0; i < this.length; i += 1) {
      if (this[i].parentNode) this[i].parentNode.removeChild(this[i]);
    }

    return this;
  }

  var Methods = {
    addClass: addClass,
    removeClass: removeClass,
    hasClass: hasClass,
    toggleClass: toggleClass,
    attr: attr,
    removeAttr: removeAttr,
    transform: transform,
    transition: transition,
    on: on,
    off: off,
    trigger: trigger,
    transitionEnd: transitionEnd,
    outerWidth: outerWidth,
    outerHeight: outerHeight,
    styles: styles,
    offset: offset,
    css: css,
    each: each,
    html: html,
    text: text,
    is: is,
    index: index,
    eq: eq,
    append: append,
    prepend: prepend,
    next: next,
    nextAll: nextAll,
    prev: prev,
    prevAll: prevAll,
    parent: parent,
    parents: parents,
    closest: closest,
    find: find,
    children: children,
    filter: filter,
    remove: remove
  };
  Object.keys(Methods).forEach(function (methodName) {
    $.fn[methodName] = Methods[methodName];
  });

  function deleteProps(obj) {
    var object = obj;
    Object.keys(object).forEach(function (key) {
      try {
        object[key] = null;
      } catch (e) {// no getter for object
      }

      try {
        delete object[key];
      } catch (e) {// something got wrong
      }
    });
  }

  function nextTick(callback, delay) {
    if (delay === void 0) {
      delay = 0;
    }

    return setTimeout(callback, delay);
  }

  function now() {
    return Date.now();
  }

  function getTranslate(el, axis) {
    if (axis === void 0) {
      axis = 'x';
    }

    var window = getWindow();
    var matrix;
    var curTransform;
    var transformMatrix;
    var curStyle = window.getComputedStyle(el, null);

    if (window.WebKitCSSMatrix) {
      curTransform = curStyle.transform || curStyle.webkitTransform;

      if (curTransform.split(',').length > 6) {
        curTransform = curTransform.split(', ').map(function (a) {
          return a.replace(',', '.');
        }).join(', ');
      } // Some old versions of Webkit choke when 'none' is passed; pass
      // empty string instead in this case


      transformMatrix = new window.WebKitCSSMatrix(curTransform === 'none' ? '' : curTransform);
    } else {
      transformMatrix = curStyle.MozTransform || curStyle.OTransform || curStyle.MsTransform || curStyle.msTransform || curStyle.transform || curStyle.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,');
      matrix = transformMatrix.toString().split(',');
    }

    if (axis === 'x') {
      // Latest Chrome and webkits Fix
      if (window.WebKitCSSMatrix) curTransform = transformMatrix.m41; // Crazy IE10 Matrix
      else if (matrix.length === 16) curTransform = parseFloat(matrix[12]); // Normal Browsers
        else curTransform = parseFloat(matrix[4]);
    }

    if (axis === 'y') {
      // Latest Chrome and webkits Fix
      if (window.WebKitCSSMatrix) curTransform = transformMatrix.m42; // Crazy IE10 Matrix
      else if (matrix.length === 16) curTransform = parseFloat(matrix[13]); // Normal Browsers
        else curTransform = parseFloat(matrix[5]);
    }

    return curTransform || 0;
  }

  function isObject$1(o) {
    return typeof o === 'object' && o !== null && o.constructor && o.constructor === Object;
  }

  function extend$1() {
    var to = Object(arguments.length <= 0 ? undefined : arguments[0]);

    for (var i = 1; i < arguments.length; i += 1) {
      var nextSource = i < 0 || arguments.length <= i ? undefined : arguments[i];

      if (nextSource !== undefined && nextSource !== null) {
        var keysArray = Object.keys(Object(nextSource));

        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex += 1) {
          var nextKey = keysArray[nextIndex];
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);

          if (desc !== undefined && desc.enumerable) {
            if (isObject$1(to[nextKey]) && isObject$1(nextSource[nextKey])) {
              extend$1(to[nextKey], nextSource[nextKey]);
            } else if (!isObject$1(to[nextKey]) && isObject$1(nextSource[nextKey])) {
              to[nextKey] = {};
              extend$1(to[nextKey], nextSource[nextKey]);
            } else {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
    }

    return to;
  }

  function bindModuleMethods(instance, obj) {
    Object.keys(obj).forEach(function (key) {
      if (isObject$1(obj[key])) {
        Object.keys(obj[key]).forEach(function (subKey) {
          if (typeof obj[key][subKey] === 'function') {
            obj[key][subKey] = obj[key][subKey].bind(instance);
          }
        });
      }

      instance[key] = obj[key];
    });
  }

  var support$1;

  function calcSupport() {
    var window = getWindow();
    var document = getDocument();
    return {
      touch: !!('ontouchstart' in window || window.DocumentTouch && document instanceof window.DocumentTouch),
      pointerEvents: !!window.PointerEvent && 'maxTouchPoints' in window.navigator && window.navigator.maxTouchPoints >= 0,
      observer: function checkObserver() {
        return 'MutationObserver' in window || 'WebkitMutationObserver' in window;
      }(),
      passiveListener: function checkPassiveListener() {
        var supportsPassive = false;

        try {
          var opts = Object.defineProperty({}, 'passive', {
            // eslint-disable-next-line
            get: function get() {
              supportsPassive = true;
            }
          });
          window.addEventListener('testPassiveListener', null, opts);
        } catch (e) {// No support
        }

        return supportsPassive;
      }(),
      gestures: function checkGestures() {
        return 'ongesturestart' in window;
      }()
    };
  }

  function getSupport() {
    if (!support$1) {
      support$1 = calcSupport();
    }

    return support$1;
  }

  var device;

  function calcDevice(_temp) {
    var _ref = _temp === void 0 ? {} : _temp,
        userAgent = _ref.userAgent;

    var support = getSupport();
    var window = getWindow();
    var platform = window.navigator.platform;
    var ua = userAgent || window.navigator.userAgent;
    var device = {
      ios: false,
      android: false
    };
    var screenWidth = window.screen.width;
    var screenHeight = window.screen.height;
    var android = ua.match(/(Android);?[\s\/]+([\d.]+)?/); // eslint-disable-line

    var ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
    var ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
    var iphone = !ipad && ua.match(/(iPhone\sOS|iOS)\s([\d_]+)/);
    var windows = platform === 'Win32';
    var macos = platform === 'MacIntel'; // iPadOs 13 fix

    var iPadScreens = ['1024x1366', '1366x1024', '834x1194', '1194x834', '834x1112', '1112x834', '768x1024', '1024x768'];

    if (!ipad && macos && support.touch && iPadScreens.indexOf(screenWidth + "x" + screenHeight) >= 0) {
      ipad = ua.match(/(Version)\/([\d.]+)/);
      if (!ipad) ipad = [0, 1, '13_0_0'];
      macos = false;
    } // Android


    if (android && !windows) {
      device.os = 'android';
      device.android = true;
    }

    if (ipad || iphone || ipod) {
      device.os = 'ios';
      device.ios = true;
    } // Export object


    return device;
  }

  function getDevice(overrides) {
    if (overrides === void 0) {
      overrides = {};
    }

    if (!device) {
      device = calcDevice(overrides);
    }

    return device;
  }

  var browser;

  function calcBrowser() {
    var window = getWindow();

    function isSafari() {
      var ua = window.navigator.userAgent.toLowerCase();
      return ua.indexOf('safari') >= 0 && ua.indexOf('chrome') < 0 && ua.indexOf('android') < 0;
    }

    return {
      isEdge: !!window.navigator.userAgent.match(/Edge/g),
      isSafari: isSafari(),
      isWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(window.navigator.userAgent)
    };
  }

  function getBrowser() {
    if (!browser) {
      browser = calcBrowser();
    }

    return browser;
  }

  var Resize = {
    name: 'resize',
    create: function create() {
      var swiper = this;
      extend$1(swiper, {
        resize: {
          resizeHandler: function resizeHandler() {
            if (!swiper || swiper.destroyed || !swiper.initialized) return;
            swiper.emit('beforeResize');
            swiper.emit('resize');
          },
          orientationChangeHandler: function orientationChangeHandler() {
            if (!swiper || swiper.destroyed || !swiper.initialized) return;
            swiper.emit('orientationchange');
          }
        }
      });
    },
    on: {
      init: function init(swiper) {
        var window = getWindow(); // Emit resize

        window.addEventListener('resize', swiper.resize.resizeHandler); // Emit orientationchange

        window.addEventListener('orientationchange', swiper.resize.orientationChangeHandler);
      },
      destroy: function destroy(swiper) {
        var window = getWindow();
        window.removeEventListener('resize', swiper.resize.resizeHandler);
        window.removeEventListener('orientationchange', swiper.resize.orientationChangeHandler);
      }
    }
  };

  function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
  var Observer = {
    attach: function attach(target, options) {
      if (options === void 0) {
        options = {};
      }

      var window = getWindow();
      var swiper = this;
      var ObserverFunc = window.MutationObserver || window.WebkitMutationObserver;
      var observer = new ObserverFunc(function (mutations) {
        // The observerUpdate event should only be triggered
        // once despite the number of mutations.  Additional
        // triggers are redundant and are very costly
        if (mutations.length === 1) {
          swiper.emit('observerUpdate', mutations[0]);
          return;
        }

        var observerUpdate = function observerUpdate() {
          swiper.emit('observerUpdate', mutations[0]);
        };

        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(observerUpdate);
        } else {
          window.setTimeout(observerUpdate, 0);
        }
      });
      observer.observe(target, {
        attributes: typeof options.attributes === 'undefined' ? true : options.attributes,
        childList: typeof options.childList === 'undefined' ? true : options.childList,
        characterData: typeof options.characterData === 'undefined' ? true : options.characterData
      });
      swiper.observer.observers.push(observer);
    },
    init: function init() {
      var swiper = this;
      if (!swiper.support.observer || !swiper.params.observer) return;

      if (swiper.params.observeParents) {
        var containerParents = swiper.$el.parents();

        for (var i = 0; i < containerParents.length; i += 1) {
          swiper.observer.attach(containerParents[i]);
        }
      } // Observe container


      swiper.observer.attach(swiper.$el[0], {
        childList: swiper.params.observeSlideChildren
      }); // Observe wrapper

      swiper.observer.attach(swiper.$wrapperEl[0], {
        attributes: false
      });
    },
    destroy: function destroy() {
      var swiper = this;
      swiper.observer.observers.forEach(function (observer) {
        observer.disconnect();
      });
      swiper.observer.observers = [];
    }
  };
  var Observer$1 = {
    name: 'observer',
    params: {
      observer: false,
      observeParents: false,
      observeSlideChildren: false
    },
    create: function create() {
      var swiper = this;
      bindModuleMethods(swiper, {
        observer: _extends(_extends({}, Observer), {}, {
          observers: []
        })
      });
    },
    on: {
      init: function init(swiper) {
        swiper.observer.init();
      },
      destroy: function destroy(swiper) {
        swiper.observer.destroy();
      }
    }
  };

  var modular = {
    useParams: function useParams(instanceParams) {
      var instance = this;
      if (!instance.modules) return;
      Object.keys(instance.modules).forEach(function (moduleName) {
        var module = instance.modules[moduleName]; // Extend params

        if (module.params) {
          extend$1(instanceParams, module.params);
        }
      });
    },
    useModules: function useModules(modulesParams) {
      if (modulesParams === void 0) {
        modulesParams = {};
      }

      var instance = this;
      if (!instance.modules) return;
      Object.keys(instance.modules).forEach(function (moduleName) {
        var module = instance.modules[moduleName];
        var moduleParams = modulesParams[moduleName] || {}; // Add event listeners

        if (module.on && instance.on) {
          Object.keys(module.on).forEach(function (moduleEventName) {
            instance.on(moduleEventName, module.on[moduleEventName]);
          });
        } // Module create callback


        if (module.create) {
          module.create.bind(instance)(moduleParams);
        }
      });
    }
  };

  /* eslint-disable no-underscore-dangle */
  var eventsEmitter = {
    on: function on(events, handler, priority) {
      var self = this;
      if (typeof handler !== 'function') return self;
      var method = priority ? 'unshift' : 'push';
      events.split(' ').forEach(function (event) {
        if (!self.eventsListeners[event]) self.eventsListeners[event] = [];
        self.eventsListeners[event][method](handler);
      });
      return self;
    },
    once: function once(events, handler, priority) {
      var self = this;
      if (typeof handler !== 'function') return self;

      function onceHandler() {
        self.off(events, onceHandler);

        if (onceHandler.__emitterProxy) {
          delete onceHandler.__emitterProxy;
        }

        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        handler.apply(self, args);
      }

      onceHandler.__emitterProxy = handler;
      return self.on(events, onceHandler, priority);
    },
    onAny: function onAny(handler, priority) {
      var self = this;
      if (typeof handler !== 'function') return self;
      var method = priority ? 'unshift' : 'push';

      if (self.eventsAnyListeners.indexOf(handler) < 0) {
        self.eventsAnyListeners[method](handler);
      }

      return self;
    },
    offAny: function offAny(handler) {
      var self = this;
      if (!self.eventsAnyListeners) return self;
      var index = self.eventsAnyListeners.indexOf(handler);

      if (index >= 0) {
        self.eventsAnyListeners.splice(index, 1);
      }

      return self;
    },
    off: function off(events, handler) {
      var self = this;
      if (!self.eventsListeners) return self;
      events.split(' ').forEach(function (event) {
        if (typeof handler === 'undefined') {
          self.eventsListeners[event] = [];
        } else if (self.eventsListeners[event]) {
          self.eventsListeners[event].forEach(function (eventHandler, index) {
            if (eventHandler === handler || eventHandler.__emitterProxy && eventHandler.__emitterProxy === handler) {
              self.eventsListeners[event].splice(index, 1);
            }
          });
        }
      });
      return self;
    },
    emit: function emit() {
      var self = this;
      if (!self.eventsListeners) return self;
      var events;
      var data;
      var context;

      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      if (typeof args[0] === 'string' || Array.isArray(args[0])) {
        events = args[0];
        data = args.slice(1, args.length);
        context = self;
      } else {
        events = args[0].events;
        data = args[0].data;
        context = args[0].context || self;
      }

      data.unshift(context);
      var eventsArray = Array.isArray(events) ? events : events.split(' ');
      eventsArray.forEach(function (event) {
        if (self.eventsListeners && self.eventsListeners[event]) {
          var handlers = [];
          self.eventsListeners[event].forEach(function (eventHandler) {
            handlers.push(eventHandler);
          });
          handlers.forEach(function (eventHandler) {
            eventHandler.apply(context, data);
          });
        }
      });
      return self;
    }
  };

  function updateSize() {
    var swiper = this;
    var width;
    var height;
    var $el = swiper.$el;

    if (typeof swiper.params.width !== 'undefined' && swiper.params.width !== null) {
      width = swiper.params.width;
    } else {
      width = $el[0].clientWidth;
    }

    if (typeof swiper.params.height !== 'undefined' && swiper.params.width !== null) {
      height = swiper.params.height;
    } else {
      height = $el[0].clientHeight;
    }

    if (width === 0 && swiper.isHorizontal() || height === 0 && swiper.isVertical()) {
      return;
    } // Subtract paddings


    width = width - parseInt($el.css('padding-left') || 0, 10) - parseInt($el.css('padding-right') || 0, 10);
    height = height - parseInt($el.css('padding-top') || 0, 10) - parseInt($el.css('padding-bottom') || 0, 10);
    if (Number.isNaN(width)) width = 0;
    if (Number.isNaN(height)) height = 0;
    extend$1(swiper, {
      width: width,
      height: height,
      size: swiper.isHorizontal() ? width : height
    });
  }

  function updateSlides() {
    var swiper = this;
    var window = getWindow();
    var params = swiper.params;
    var $wrapperEl = swiper.$wrapperEl,
        swiperSize = swiper.size,
        rtl = swiper.rtlTranslate,
        wrongRTL = swiper.wrongRTL;
    var isVirtual = swiper.virtual && params.virtual.enabled;
    var previousSlidesLength = isVirtual ? swiper.virtual.slides.length : swiper.slides.length;
    var slides = $wrapperEl.children("." + swiper.params.slideClass);
    var slidesLength = isVirtual ? swiper.virtual.slides.length : slides.length;
    var snapGrid = [];
    var slidesGrid = [];
    var slidesSizesGrid = [];

    function slidesForMargin(slideEl, slideIndex) {
      if (!params.cssMode) return true;

      if (slideIndex === slides.length - 1) {
        return false;
      }

      return true;
    }

    var offsetBefore = params.slidesOffsetBefore;

    if (typeof offsetBefore === 'function') {
      offsetBefore = params.slidesOffsetBefore.call(swiper);
    }

    var offsetAfter = params.slidesOffsetAfter;

    if (typeof offsetAfter === 'function') {
      offsetAfter = params.slidesOffsetAfter.call(swiper);
    }

    var previousSnapGridLength = swiper.snapGrid.length;
    var previousSlidesGridLength = swiper.snapGrid.length;
    var spaceBetween = params.spaceBetween;
    var slidePosition = -offsetBefore;
    var prevSlideSize = 0;
    var index = 0;

    if (typeof swiperSize === 'undefined') {
      return;
    }

    if (typeof spaceBetween === 'string' && spaceBetween.indexOf('%') >= 0) {
      spaceBetween = parseFloat(spaceBetween.replace('%', '')) / 100 * swiperSize;
    }

    swiper.virtualSize = -spaceBetween; // reset margins

    if (rtl) slides.css({
      marginLeft: '',
      marginTop: ''
    });else slides.css({
      marginRight: '',
      marginBottom: ''
    });
    var slidesNumberEvenToRows;

    if (params.slidesPerColumn > 1) {
      if (Math.floor(slidesLength / params.slidesPerColumn) === slidesLength / swiper.params.slidesPerColumn) {
        slidesNumberEvenToRows = slidesLength;
      } else {
        slidesNumberEvenToRows = Math.ceil(slidesLength / params.slidesPerColumn) * params.slidesPerColumn;
      }

      if (params.slidesPerView !== 'auto' && params.slidesPerColumnFill === 'row') {
        slidesNumberEvenToRows = Math.max(slidesNumberEvenToRows, params.slidesPerView * params.slidesPerColumn);
      }
    } // Calc slides


    var slideSize;
    var slidesPerColumn = params.slidesPerColumn;
    var slidesPerRow = slidesNumberEvenToRows / slidesPerColumn;
    var numFullColumns = Math.floor(slidesLength / params.slidesPerColumn);

    for (var i = 0; i < slidesLength; i += 1) {
      slideSize = 0;
      var slide = slides.eq(i);

      if (params.slidesPerColumn > 1) {
        // Set slides order
        var newSlideOrderIndex = void 0;
        var column = void 0;
        var row = void 0;

        if (params.slidesPerColumnFill === 'row' && params.slidesPerGroup > 1) {
          var groupIndex = Math.floor(i / (params.slidesPerGroup * params.slidesPerColumn));
          var slideIndexInGroup = i - params.slidesPerColumn * params.slidesPerGroup * groupIndex;
          var columnsInGroup = groupIndex === 0 ? params.slidesPerGroup : Math.min(Math.ceil((slidesLength - groupIndex * slidesPerColumn * params.slidesPerGroup) / slidesPerColumn), params.slidesPerGroup);
          row = Math.floor(slideIndexInGroup / columnsInGroup);
          column = slideIndexInGroup - row * columnsInGroup + groupIndex * params.slidesPerGroup;
          newSlideOrderIndex = column + row * slidesNumberEvenToRows / slidesPerColumn;
          slide.css({
            '-webkit-box-ordinal-group': newSlideOrderIndex,
            '-moz-box-ordinal-group': newSlideOrderIndex,
            '-ms-flex-order': newSlideOrderIndex,
            '-webkit-order': newSlideOrderIndex,
            order: newSlideOrderIndex
          });
        } else if (params.slidesPerColumnFill === 'column') {
          column = Math.floor(i / slidesPerColumn);
          row = i - column * slidesPerColumn;

          if (column > numFullColumns || column === numFullColumns && row === slidesPerColumn - 1) {
            row += 1;

            if (row >= slidesPerColumn) {
              row = 0;
              column += 1;
            }
          }
        } else {
          row = Math.floor(i / slidesPerRow);
          column = i - row * slidesPerRow;
        }

        slide.css("margin-" + (swiper.isHorizontal() ? 'top' : 'left'), row !== 0 && params.spaceBetween && params.spaceBetween + "px");
      }

      if (slide.css('display') === 'none') continue; // eslint-disable-line

      if (params.slidesPerView === 'auto') {
        var slideStyles = window.getComputedStyle(slide[0], null);
        var currentTransform = slide[0].style.transform;
        var currentWebKitTransform = slide[0].style.webkitTransform;

        if (currentTransform) {
          slide[0].style.transform = 'none';
        }

        if (currentWebKitTransform) {
          slide[0].style.webkitTransform = 'none';
        }

        if (params.roundLengths) {
          slideSize = swiper.isHorizontal() ? slide.outerWidth(true) : slide.outerHeight(true);
        } else {
          // eslint-disable-next-line
          if (swiper.isHorizontal()) {
            var width = parseFloat(slideStyles.getPropertyValue('width') || 0);
            var paddingLeft = parseFloat(slideStyles.getPropertyValue('padding-left') || 0);
            var paddingRight = parseFloat(slideStyles.getPropertyValue('padding-right') || 0);
            var marginLeft = parseFloat(slideStyles.getPropertyValue('margin-left') || 0);
            var marginRight = parseFloat(slideStyles.getPropertyValue('margin-right') || 0);
            var boxSizing = slideStyles.getPropertyValue('box-sizing');

            if (boxSizing && boxSizing === 'border-box') {
              slideSize = width + marginLeft + marginRight;
            } else {
              slideSize = width + paddingLeft + paddingRight + marginLeft + marginRight;
            }
          } else {
            var height = parseFloat(slideStyles.getPropertyValue('height') || 0);
            var paddingTop = parseFloat(slideStyles.getPropertyValue('padding-top') || 0);
            var paddingBottom = parseFloat(slideStyles.getPropertyValue('padding-bottom') || 0);
            var marginTop = parseFloat(slideStyles.getPropertyValue('margin-top') || 0);
            var marginBottom = parseFloat(slideStyles.getPropertyValue('margin-bottom') || 0);

            var _boxSizing = slideStyles.getPropertyValue('box-sizing');

            if (_boxSizing && _boxSizing === 'border-box') {
              slideSize = height + marginTop + marginBottom;
            } else {
              slideSize = height + paddingTop + paddingBottom + marginTop + marginBottom;
            }
          }
        }

        if (currentTransform) {
          slide[0].style.transform = currentTransform;
        }

        if (currentWebKitTransform) {
          slide[0].style.webkitTransform = currentWebKitTransform;
        }

        if (params.roundLengths) slideSize = Math.floor(slideSize);
      } else {
        slideSize = (swiperSize - (params.slidesPerView - 1) * spaceBetween) / params.slidesPerView;
        if (params.roundLengths) slideSize = Math.floor(slideSize);

        if (slides[i]) {
          if (swiper.isHorizontal()) {
            slides[i].style.width = slideSize + "px";
          } else {
            slides[i].style.height = slideSize + "px";
          }
        }
      }

      if (slides[i]) {
        slides[i].swiperSlideSize = slideSize;
      }

      slidesSizesGrid.push(slideSize);

      if (params.centeredSlides) {
        slidePosition = slidePosition + slideSize / 2 + prevSlideSize / 2 + spaceBetween;
        if (prevSlideSize === 0 && i !== 0) slidePosition = slidePosition - swiperSize / 2 - spaceBetween;
        if (i === 0) slidePosition = slidePosition - swiperSize / 2 - spaceBetween;
        if (Math.abs(slidePosition) < 1 / 1000) slidePosition = 0;
        if (params.roundLengths) slidePosition = Math.floor(slidePosition);
        if (index % params.slidesPerGroup === 0) snapGrid.push(slidePosition);
        slidesGrid.push(slidePosition);
      } else {
        if (params.roundLengths) slidePosition = Math.floor(slidePosition);
        if ((index - Math.min(swiper.params.slidesPerGroupSkip, index)) % swiper.params.slidesPerGroup === 0) snapGrid.push(slidePosition);
        slidesGrid.push(slidePosition);
        slidePosition = slidePosition + slideSize + spaceBetween;
      }

      swiper.virtualSize += slideSize + spaceBetween;
      prevSlideSize = slideSize;
      index += 1;
    }

    swiper.virtualSize = Math.max(swiper.virtualSize, swiperSize) + offsetAfter;
    var newSlidesGrid;

    if (rtl && wrongRTL && (params.effect === 'slide' || params.effect === 'coverflow')) {
      $wrapperEl.css({
        width: swiper.virtualSize + params.spaceBetween + "px"
      });
    }

    if (params.setWrapperSize) {
      if (swiper.isHorizontal()) $wrapperEl.css({
        width: swiper.virtualSize + params.spaceBetween + "px"
      });else $wrapperEl.css({
        height: swiper.virtualSize + params.spaceBetween + "px"
      });
    }

    if (params.slidesPerColumn > 1) {
      swiper.virtualSize = (slideSize + params.spaceBetween) * slidesNumberEvenToRows;
      swiper.virtualSize = Math.ceil(swiper.virtualSize / params.slidesPerColumn) - params.spaceBetween;
      if (swiper.isHorizontal()) $wrapperEl.css({
        width: swiper.virtualSize + params.spaceBetween + "px"
      });else $wrapperEl.css({
        height: swiper.virtualSize + params.spaceBetween + "px"
      });

      if (params.centeredSlides) {
        newSlidesGrid = [];

        for (var _i = 0; _i < snapGrid.length; _i += 1) {
          var slidesGridItem = snapGrid[_i];
          if (params.roundLengths) slidesGridItem = Math.floor(slidesGridItem);
          if (snapGrid[_i] < swiper.virtualSize + snapGrid[0]) newSlidesGrid.push(slidesGridItem);
        }

        snapGrid = newSlidesGrid;
      }
    } // Remove last grid elements depending on width


    if (!params.centeredSlides) {
      newSlidesGrid = [];

      for (var _i2 = 0; _i2 < snapGrid.length; _i2 += 1) {
        var _slidesGridItem = snapGrid[_i2];
        if (params.roundLengths) _slidesGridItem = Math.floor(_slidesGridItem);

        if (snapGrid[_i2] <= swiper.virtualSize - swiperSize) {
          newSlidesGrid.push(_slidesGridItem);
        }
      }

      snapGrid = newSlidesGrid;

      if (Math.floor(swiper.virtualSize - swiperSize) - Math.floor(snapGrid[snapGrid.length - 1]) > 1) {
        snapGrid.push(swiper.virtualSize - swiperSize);
      }
    }

    if (snapGrid.length === 0) snapGrid = [0];

    if (params.spaceBetween !== 0) {
      if (swiper.isHorizontal()) {
        if (rtl) slides.filter(slidesForMargin).css({
          marginLeft: spaceBetween + "px"
        });else slides.filter(slidesForMargin).css({
          marginRight: spaceBetween + "px"
        });
      } else slides.filter(slidesForMargin).css({
        marginBottom: spaceBetween + "px"
      });
    }

    if (params.centeredSlides && params.centeredSlidesBounds) {
      var allSlidesSize = 0;
      slidesSizesGrid.forEach(function (slideSizeValue) {
        allSlidesSize += slideSizeValue + (params.spaceBetween ? params.spaceBetween : 0);
      });
      allSlidesSize -= params.spaceBetween;
      var maxSnap = allSlidesSize - swiperSize;
      snapGrid = snapGrid.map(function (snap) {
        if (snap < 0) return -offsetBefore;
        if (snap > maxSnap) return maxSnap + offsetAfter;
        return snap;
      });
    }

    if (params.centerInsufficientSlides) {
      var _allSlidesSize = 0;
      slidesSizesGrid.forEach(function (slideSizeValue) {
        _allSlidesSize += slideSizeValue + (params.spaceBetween ? params.spaceBetween : 0);
      });
      _allSlidesSize -= params.spaceBetween;

      if (_allSlidesSize < swiperSize) {
        var allSlidesOffset = (swiperSize - _allSlidesSize) / 2;
        snapGrid.forEach(function (snap, snapIndex) {
          snapGrid[snapIndex] = snap - allSlidesOffset;
        });
        slidesGrid.forEach(function (snap, snapIndex) {
          slidesGrid[snapIndex] = snap + allSlidesOffset;
        });
      }
    }

    extend$1(swiper, {
      slides: slides,
      snapGrid: snapGrid,
      slidesGrid: slidesGrid,
      slidesSizesGrid: slidesSizesGrid
    });

    if (slidesLength !== previousSlidesLength) {
      swiper.emit('slidesLengthChange');
    }

    if (snapGrid.length !== previousSnapGridLength) {
      if (swiper.params.watchOverflow) swiper.checkOverflow();
      swiper.emit('snapGridLengthChange');
    }

    if (slidesGrid.length !== previousSlidesGridLength) {
      swiper.emit('slidesGridLengthChange');
    }

    if (params.watchSlidesProgress || params.watchSlidesVisibility) {
      swiper.updateSlidesOffset();
    }
  }

  function updateAutoHeight(speed) {
    var swiper = this;
    var activeSlides = [];
    var newHeight = 0;
    var i;

    if (typeof speed === 'number') {
      swiper.setTransition(speed);
    } else if (speed === true) {
      swiper.setTransition(swiper.params.speed);
    } // Find slides currently in view


    if (swiper.params.slidesPerView !== 'auto' && swiper.params.slidesPerView > 1) {
      if (swiper.params.centeredSlides) {
        swiper.visibleSlides.each(function (slide) {
          activeSlides.push(slide);
        });
      } else {
        for (i = 0; i < Math.ceil(swiper.params.slidesPerView); i += 1) {
          var index = swiper.activeIndex + i;
          if (index > swiper.slides.length) break;
          activeSlides.push(swiper.slides.eq(index)[0]);
        }
      }
    } else {
      activeSlides.push(swiper.slides.eq(swiper.activeIndex)[0]);
    } // Find new height from highest slide in view


    for (i = 0; i < activeSlides.length; i += 1) {
      if (typeof activeSlides[i] !== 'undefined') {
        var height = activeSlides[i].offsetHeight;
        newHeight = height > newHeight ? height : newHeight;
      }
    } // Update Height


    if (newHeight) swiper.$wrapperEl.css('height', newHeight + "px");
  }

  function updateSlidesOffset() {
    var swiper = this;
    var slides = swiper.slides;

    for (var i = 0; i < slides.length; i += 1) {
      slides[i].swiperSlideOffset = swiper.isHorizontal() ? slides[i].offsetLeft : slides[i].offsetTop;
    }
  }

  function updateSlidesProgress(translate) {
    if (translate === void 0) {
      translate = this && this.translate || 0;
    }

    var swiper = this;
    var params = swiper.params;
    var slides = swiper.slides,
        rtl = swiper.rtlTranslate;
    if (slides.length === 0) return;
    if (typeof slides[0].swiperSlideOffset === 'undefined') swiper.updateSlidesOffset();
    var offsetCenter = -translate;
    if (rtl) offsetCenter = translate; // Visible Slides

    slides.removeClass(params.slideVisibleClass);
    swiper.visibleSlidesIndexes = [];
    swiper.visibleSlides = [];

    for (var i = 0; i < slides.length; i += 1) {
      var slide = slides[i];
      var slideProgress = (offsetCenter + (params.centeredSlides ? swiper.minTranslate() : 0) - slide.swiperSlideOffset) / (slide.swiperSlideSize + params.spaceBetween);

      if (params.watchSlidesVisibility || params.centeredSlides && params.autoHeight) {
        var slideBefore = -(offsetCenter - slide.swiperSlideOffset);
        var slideAfter = slideBefore + swiper.slidesSizesGrid[i];
        var isVisible = slideBefore >= 0 && slideBefore < swiper.size - 1 || slideAfter > 1 && slideAfter <= swiper.size || slideBefore <= 0 && slideAfter >= swiper.size;

        if (isVisible) {
          swiper.visibleSlides.push(slide);
          swiper.visibleSlidesIndexes.push(i);
          slides.eq(i).addClass(params.slideVisibleClass);
        }
      }

      slide.progress = rtl ? -slideProgress : slideProgress;
    }

    swiper.visibleSlides = $(swiper.visibleSlides);
  }

  function updateProgress(translate) {
    var swiper = this;

    if (typeof translate === 'undefined') {
      var multiplier = swiper.rtlTranslate ? -1 : 1; // eslint-disable-next-line

      translate = swiper && swiper.translate && swiper.translate * multiplier || 0;
    }

    var params = swiper.params;
    var translatesDiff = swiper.maxTranslate() - swiper.minTranslate();
    var progress = swiper.progress,
        isBeginning = swiper.isBeginning,
        isEnd = swiper.isEnd;
    var wasBeginning = isBeginning;
    var wasEnd = isEnd;

    if (translatesDiff === 0) {
      progress = 0;
      isBeginning = true;
      isEnd = true;
    } else {
      progress = (translate - swiper.minTranslate()) / translatesDiff;
      isBeginning = progress <= 0;
      isEnd = progress >= 1;
    }

    extend$1(swiper, {
      progress: progress,
      isBeginning: isBeginning,
      isEnd: isEnd
    });
    if (params.watchSlidesProgress || params.watchSlidesVisibility || params.centeredSlides && params.autoHeight) swiper.updateSlidesProgress(translate);

    if (isBeginning && !wasBeginning) {
      swiper.emit('reachBeginning toEdge');
    }

    if (isEnd && !wasEnd) {
      swiper.emit('reachEnd toEdge');
    }

    if (wasBeginning && !isBeginning || wasEnd && !isEnd) {
      swiper.emit('fromEdge');
    }

    swiper.emit('progress', progress);
  }

  function updateSlidesClasses() {
    var swiper = this;
    var slides = swiper.slides,
        params = swiper.params,
        $wrapperEl = swiper.$wrapperEl,
        activeIndex = swiper.activeIndex,
        realIndex = swiper.realIndex;
    var isVirtual = swiper.virtual && params.virtual.enabled;
    slides.removeClass(params.slideActiveClass + " " + params.slideNextClass + " " + params.slidePrevClass + " " + params.slideDuplicateActiveClass + " " + params.slideDuplicateNextClass + " " + params.slideDuplicatePrevClass);
    var activeSlide;

    if (isVirtual) {
      activeSlide = swiper.$wrapperEl.find("." + params.slideClass + "[data-swiper-slide-index=\"" + activeIndex + "\"]");
    } else {
      activeSlide = slides.eq(activeIndex);
    } // Active classes


    activeSlide.addClass(params.slideActiveClass);

    if (params.loop) {
      // Duplicate to all looped slides
      if (activeSlide.hasClass(params.slideDuplicateClass)) {
        $wrapperEl.children("." + params.slideClass + ":not(." + params.slideDuplicateClass + ")[data-swiper-slide-index=\"" + realIndex + "\"]").addClass(params.slideDuplicateActiveClass);
      } else {
        $wrapperEl.children("." + params.slideClass + "." + params.slideDuplicateClass + "[data-swiper-slide-index=\"" + realIndex + "\"]").addClass(params.slideDuplicateActiveClass);
      }
    } // Next Slide


    var nextSlide = activeSlide.nextAll("." + params.slideClass).eq(0).addClass(params.slideNextClass);

    if (params.loop && nextSlide.length === 0) {
      nextSlide = slides.eq(0);
      nextSlide.addClass(params.slideNextClass);
    } // Prev Slide


    var prevSlide = activeSlide.prevAll("." + params.slideClass).eq(0).addClass(params.slidePrevClass);

    if (params.loop && prevSlide.length === 0) {
      prevSlide = slides.eq(-1);
      prevSlide.addClass(params.slidePrevClass);
    }

    if (params.loop) {
      // Duplicate to all looped slides
      if (nextSlide.hasClass(params.slideDuplicateClass)) {
        $wrapperEl.children("." + params.slideClass + ":not(." + params.slideDuplicateClass + ")[data-swiper-slide-index=\"" + nextSlide.attr('data-swiper-slide-index') + "\"]").addClass(params.slideDuplicateNextClass);
      } else {
        $wrapperEl.children("." + params.slideClass + "." + params.slideDuplicateClass + "[data-swiper-slide-index=\"" + nextSlide.attr('data-swiper-slide-index') + "\"]").addClass(params.slideDuplicateNextClass);
      }

      if (prevSlide.hasClass(params.slideDuplicateClass)) {
        $wrapperEl.children("." + params.slideClass + ":not(." + params.slideDuplicateClass + ")[data-swiper-slide-index=\"" + prevSlide.attr('data-swiper-slide-index') + "\"]").addClass(params.slideDuplicatePrevClass);
      } else {
        $wrapperEl.children("." + params.slideClass + "." + params.slideDuplicateClass + "[data-swiper-slide-index=\"" + prevSlide.attr('data-swiper-slide-index') + "\"]").addClass(params.slideDuplicatePrevClass);
      }
    }

    swiper.emitSlidesClasses();
  }

  function updateActiveIndex(newActiveIndex) {
    var swiper = this;
    var translate = swiper.rtlTranslate ? swiper.translate : -swiper.translate;
    var slidesGrid = swiper.slidesGrid,
        snapGrid = swiper.snapGrid,
        params = swiper.params,
        previousIndex = swiper.activeIndex,
        previousRealIndex = swiper.realIndex,
        previousSnapIndex = swiper.snapIndex;
    var activeIndex = newActiveIndex;
    var snapIndex;

    if (typeof activeIndex === 'undefined') {
      for (var i = 0; i < slidesGrid.length; i += 1) {
        if (typeof slidesGrid[i + 1] !== 'undefined') {
          if (translate >= slidesGrid[i] && translate < slidesGrid[i + 1] - (slidesGrid[i + 1] - slidesGrid[i]) / 2) {
            activeIndex = i;
          } else if (translate >= slidesGrid[i] && translate < slidesGrid[i + 1]) {
            activeIndex = i + 1;
          }
        } else if (translate >= slidesGrid[i]) {
          activeIndex = i;
        }
      } // Normalize slideIndex


      if (params.normalizeSlideIndex) {
        if (activeIndex < 0 || typeof activeIndex === 'undefined') activeIndex = 0;
      }
    }

    if (snapGrid.indexOf(translate) >= 0) {
      snapIndex = snapGrid.indexOf(translate);
    } else {
      var skip = Math.min(params.slidesPerGroupSkip, activeIndex);
      snapIndex = skip + Math.floor((activeIndex - skip) / params.slidesPerGroup);
    }

    if (snapIndex >= snapGrid.length) snapIndex = snapGrid.length - 1;

    if (activeIndex === previousIndex) {
      if (snapIndex !== previousSnapIndex) {
        swiper.snapIndex = snapIndex;
        swiper.emit('snapIndexChange');
      }

      return;
    } // Get real index


    var realIndex = parseInt(swiper.slides.eq(activeIndex).attr('data-swiper-slide-index') || activeIndex, 10);
    extend$1(swiper, {
      snapIndex: snapIndex,
      realIndex: realIndex,
      previousIndex: previousIndex,
      activeIndex: activeIndex
    });
    swiper.emit('activeIndexChange');
    swiper.emit('snapIndexChange');

    if (previousRealIndex !== realIndex) {
      swiper.emit('realIndexChange');
    }

    if (swiper.initialized || swiper.params.runCallbacksOnInit) {
      swiper.emit('slideChange');
    }
  }

  function updateClickedSlide(e) {
    var swiper = this;
    var params = swiper.params;
    var slide = $(e.target).closest("." + params.slideClass)[0];
    var slideFound = false;

    if (slide) {
      for (var i = 0; i < swiper.slides.length; i += 1) {
        if (swiper.slides[i] === slide) slideFound = true;
      }
    }

    if (slide && slideFound) {
      swiper.clickedSlide = slide;

      if (swiper.virtual && swiper.params.virtual.enabled) {
        swiper.clickedIndex = parseInt($(slide).attr('data-swiper-slide-index'), 10);
      } else {
        swiper.clickedIndex = $(slide).index();
      }
    } else {
      swiper.clickedSlide = undefined;
      swiper.clickedIndex = undefined;
      return;
    }

    if (params.slideToClickedSlide && swiper.clickedIndex !== undefined && swiper.clickedIndex !== swiper.activeIndex) {
      swiper.slideToClickedSlide();
    }
  }

  var update = {
    updateSize: updateSize,
    updateSlides: updateSlides,
    updateAutoHeight: updateAutoHeight,
    updateSlidesOffset: updateSlidesOffset,
    updateSlidesProgress: updateSlidesProgress,
    updateProgress: updateProgress,
    updateSlidesClasses: updateSlidesClasses,
    updateActiveIndex: updateActiveIndex,
    updateClickedSlide: updateClickedSlide
  };

  function getSwiperTranslate(axis) {
    if (axis === void 0) {
      axis = this.isHorizontal() ? 'x' : 'y';
    }

    var swiper = this;
    var params = swiper.params,
        rtl = swiper.rtlTranslate,
        translate = swiper.translate,
        $wrapperEl = swiper.$wrapperEl;

    if (params.virtualTranslate) {
      return rtl ? -translate : translate;
    }

    if (params.cssMode) {
      return translate;
    }

    var currentTranslate = getTranslate($wrapperEl[0], axis);
    if (rtl) currentTranslate = -currentTranslate;
    return currentTranslate || 0;
  }

  function setTranslate(translate, byController) {
    var swiper = this;
    var rtl = swiper.rtlTranslate,
        params = swiper.params,
        $wrapperEl = swiper.$wrapperEl,
        wrapperEl = swiper.wrapperEl,
        progress = swiper.progress;
    var x = 0;
    var y = 0;
    var z = 0;

    if (swiper.isHorizontal()) {
      x = rtl ? -translate : translate;
    } else {
      y = translate;
    }

    if (params.roundLengths) {
      x = Math.floor(x);
      y = Math.floor(y);
    }

    if (params.cssMode) {
      wrapperEl[swiper.isHorizontal() ? 'scrollLeft' : 'scrollTop'] = swiper.isHorizontal() ? -x : -y;
    } else if (!params.virtualTranslate) {
      $wrapperEl.transform("translate3d(" + x + "px, " + y + "px, " + z + "px)");
    }

    swiper.previousTranslate = swiper.translate;
    swiper.translate = swiper.isHorizontal() ? x : y; // Check if we need to update progress

    var newProgress;
    var translatesDiff = swiper.maxTranslate() - swiper.minTranslate();

    if (translatesDiff === 0) {
      newProgress = 0;
    } else {
      newProgress = (translate - swiper.minTranslate()) / translatesDiff;
    }

    if (newProgress !== progress) {
      swiper.updateProgress(translate);
    }

    swiper.emit('setTranslate', swiper.translate, byController);
  }

  function minTranslate() {
    return -this.snapGrid[0];
  }

  function maxTranslate() {
    return -this.snapGrid[this.snapGrid.length - 1];
  }

  function translateTo(translate, speed, runCallbacks, translateBounds, internal) {
    if (translate === void 0) {
      translate = 0;
    }

    if (speed === void 0) {
      speed = this.params.speed;
    }

    if (runCallbacks === void 0) {
      runCallbacks = true;
    }

    if (translateBounds === void 0) {
      translateBounds = true;
    }

    var swiper = this;
    var params = swiper.params,
        wrapperEl = swiper.wrapperEl;

    if (swiper.animating && params.preventInteractionOnTransition) {
      return false;
    }

    var minTranslate = swiper.minTranslate();
    var maxTranslate = swiper.maxTranslate();
    var newTranslate;
    if (translateBounds && translate > minTranslate) newTranslate = minTranslate;else if (translateBounds && translate < maxTranslate) newTranslate = maxTranslate;else newTranslate = translate; // Update progress

    swiper.updateProgress(newTranslate);

    if (params.cssMode) {
      var isH = swiper.isHorizontal();

      if (speed === 0) {
        wrapperEl[isH ? 'scrollLeft' : 'scrollTop'] = -newTranslate;
      } else {
        // eslint-disable-next-line
        if (wrapperEl.scrollTo) {
          var _wrapperEl$scrollTo;

          wrapperEl.scrollTo((_wrapperEl$scrollTo = {}, _wrapperEl$scrollTo[isH ? 'left' : 'top'] = -newTranslate, _wrapperEl$scrollTo.behavior = 'smooth', _wrapperEl$scrollTo));
        } else {
          wrapperEl[isH ? 'scrollLeft' : 'scrollTop'] = -newTranslate;
        }
      }

      return true;
    }

    if (speed === 0) {
      swiper.setTransition(0);
      swiper.setTranslate(newTranslate);

      if (runCallbacks) {
        swiper.emit('beforeTransitionStart', speed, internal);
        swiper.emit('transitionEnd');
      }
    } else {
      swiper.setTransition(speed);
      swiper.setTranslate(newTranslate);

      if (runCallbacks) {
        swiper.emit('beforeTransitionStart', speed, internal);
        swiper.emit('transitionStart');
      }

      if (!swiper.animating) {
        swiper.animating = true;

        if (!swiper.onTranslateToWrapperTransitionEnd) {
          swiper.onTranslateToWrapperTransitionEnd = function transitionEnd(e) {
            if (!swiper || swiper.destroyed) return;
            if (e.target !== this) return;
            swiper.$wrapperEl[0].removeEventListener('transitionend', swiper.onTranslateToWrapperTransitionEnd);
            swiper.$wrapperEl[0].removeEventListener('webkitTransitionEnd', swiper.onTranslateToWrapperTransitionEnd);
            swiper.onTranslateToWrapperTransitionEnd = null;
            delete swiper.onTranslateToWrapperTransitionEnd;

            if (runCallbacks) {
              swiper.emit('transitionEnd');
            }
          };
        }

        swiper.$wrapperEl[0].addEventListener('transitionend', swiper.onTranslateToWrapperTransitionEnd);
        swiper.$wrapperEl[0].addEventListener('webkitTransitionEnd', swiper.onTranslateToWrapperTransitionEnd);
      }
    }

    return true;
  }

  var translate = {
    getTranslate: getSwiperTranslate,
    setTranslate: setTranslate,
    minTranslate: minTranslate,
    maxTranslate: maxTranslate,
    translateTo: translateTo
  };

  function setTransition(duration, byController) {
    var swiper = this;

    if (!swiper.params.cssMode) {
      swiper.$wrapperEl.transition(duration);
    }

    swiper.emit('setTransition', duration, byController);
  }

  function transitionStart(runCallbacks, direction) {
    if (runCallbacks === void 0) {
      runCallbacks = true;
    }

    var swiper = this;
    var activeIndex = swiper.activeIndex,
        params = swiper.params,
        previousIndex = swiper.previousIndex;
    if (params.cssMode) return;

    if (params.autoHeight) {
      swiper.updateAutoHeight();
    }

    var dir = direction;

    if (!dir) {
      if (activeIndex > previousIndex) dir = 'next';else if (activeIndex < previousIndex) dir = 'prev';else dir = 'reset';
    }

    swiper.emit('transitionStart');

    if (runCallbacks && activeIndex !== previousIndex) {
      if (dir === 'reset') {
        swiper.emit('slideResetTransitionStart');
        return;
      }

      swiper.emit('slideChangeTransitionStart');

      if (dir === 'next') {
        swiper.emit('slideNextTransitionStart');
      } else {
        swiper.emit('slidePrevTransitionStart');
      }
    }
  }

  function transitionEnd$1(runCallbacks, direction) {
    if (runCallbacks === void 0) {
      runCallbacks = true;
    }

    var swiper = this;
    var activeIndex = swiper.activeIndex,
        previousIndex = swiper.previousIndex,
        params = swiper.params;
    swiper.animating = false;
    if (params.cssMode) return;
    swiper.setTransition(0);
    var dir = direction;

    if (!dir) {
      if (activeIndex > previousIndex) dir = 'next';else if (activeIndex < previousIndex) dir = 'prev';else dir = 'reset';
    }

    swiper.emit('transitionEnd');

    if (runCallbacks && activeIndex !== previousIndex) {
      if (dir === 'reset') {
        swiper.emit('slideResetTransitionEnd');
        return;
      }

      swiper.emit('slideChangeTransitionEnd');

      if (dir === 'next') {
        swiper.emit('slideNextTransitionEnd');
      } else {
        swiper.emit('slidePrevTransitionEnd');
      }
    }
  }

  var transition$1 = {
    setTransition: setTransition,
    transitionStart: transitionStart,
    transitionEnd: transitionEnd$1
  };

  function slideTo(index, speed, runCallbacks, internal) {
    if (index === void 0) {
      index = 0;
    }

    if (speed === void 0) {
      speed = this.params.speed;
    }

    if (runCallbacks === void 0) {
      runCallbacks = true;
    }

    var swiper = this;
    var slideIndex = index;
    if (slideIndex < 0) slideIndex = 0;
    var params = swiper.params,
        snapGrid = swiper.snapGrid,
        slidesGrid = swiper.slidesGrid,
        previousIndex = swiper.previousIndex,
        activeIndex = swiper.activeIndex,
        rtl = swiper.rtlTranslate,
        wrapperEl = swiper.wrapperEl;

    if (swiper.animating && params.preventInteractionOnTransition) {
      return false;
    }

    var skip = Math.min(swiper.params.slidesPerGroupSkip, slideIndex);
    var snapIndex = skip + Math.floor((slideIndex - skip) / swiper.params.slidesPerGroup);
    if (snapIndex >= snapGrid.length) snapIndex = snapGrid.length - 1;

    if ((activeIndex || params.initialSlide || 0) === (previousIndex || 0) && runCallbacks) {
      swiper.emit('beforeSlideChangeStart');
    }

    var translate = -snapGrid[snapIndex]; // Update progress

    swiper.updateProgress(translate); // Normalize slideIndex

    if (params.normalizeSlideIndex) {
      for (var i = 0; i < slidesGrid.length; i += 1) {
        if (-Math.floor(translate * 100) >= Math.floor(slidesGrid[i] * 100)) {
          slideIndex = i;
        }
      }
    } // Directions locks


    if (swiper.initialized && slideIndex !== activeIndex) {
      if (!swiper.allowSlideNext && translate < swiper.translate && translate < swiper.minTranslate()) {
        return false;
      }

      if (!swiper.allowSlidePrev && translate > swiper.translate && translate > swiper.maxTranslate()) {
        if ((activeIndex || 0) !== slideIndex) return false;
      }
    }

    var direction;
    if (slideIndex > activeIndex) direction = 'next';else if (slideIndex < activeIndex) direction = 'prev';else direction = 'reset'; // Update Index

    if (rtl && -translate === swiper.translate || !rtl && translate === swiper.translate) {
      swiper.updateActiveIndex(slideIndex); // Update Height

      if (params.autoHeight) {
        swiper.updateAutoHeight();
      }

      swiper.updateSlidesClasses();

      if (params.effect !== 'slide') {
        swiper.setTranslate(translate);
      }

      if (direction !== 'reset') {
        swiper.transitionStart(runCallbacks, direction);
        swiper.transitionEnd(runCallbacks, direction);
      }

      return false;
    }

    if (params.cssMode) {
      var isH = swiper.isHorizontal();
      var t = -translate;

      if (rtl) {
        t = wrapperEl.scrollWidth - wrapperEl.offsetWidth - t;
      }

      if (speed === 0) {
        wrapperEl[isH ? 'scrollLeft' : 'scrollTop'] = t;
      } else {
        // eslint-disable-next-line
        if (wrapperEl.scrollTo) {
          var _wrapperEl$scrollTo;

          wrapperEl.scrollTo((_wrapperEl$scrollTo = {}, _wrapperEl$scrollTo[isH ? 'left' : 'top'] = t, _wrapperEl$scrollTo.behavior = 'smooth', _wrapperEl$scrollTo));
        } else {
          wrapperEl[isH ? 'scrollLeft' : 'scrollTop'] = t;
        }
      }

      return true;
    }

    if (speed === 0) {
      swiper.setTransition(0);
      swiper.setTranslate(translate);
      swiper.updateActiveIndex(slideIndex);
      swiper.updateSlidesClasses();
      swiper.emit('beforeTransitionStart', speed, internal);
      swiper.transitionStart(runCallbacks, direction);
      swiper.transitionEnd(runCallbacks, direction);
    } else {
      swiper.setTransition(speed);
      swiper.setTranslate(translate);
      swiper.updateActiveIndex(slideIndex);
      swiper.updateSlidesClasses();
      swiper.emit('beforeTransitionStart', speed, internal);
      swiper.transitionStart(runCallbacks, direction);

      if (!swiper.animating) {
        swiper.animating = true;

        if (!swiper.onSlideToWrapperTransitionEnd) {
          swiper.onSlideToWrapperTransitionEnd = function transitionEnd(e) {
            if (!swiper || swiper.destroyed) return;
            if (e.target !== this) return;
            swiper.$wrapperEl[0].removeEventListener('transitionend', swiper.onSlideToWrapperTransitionEnd);
            swiper.$wrapperEl[0].removeEventListener('webkitTransitionEnd', swiper.onSlideToWrapperTransitionEnd);
            swiper.onSlideToWrapperTransitionEnd = null;
            delete swiper.onSlideToWrapperTransitionEnd;
            swiper.transitionEnd(runCallbacks, direction);
          };
        }

        swiper.$wrapperEl[0].addEventListener('transitionend', swiper.onSlideToWrapperTransitionEnd);
        swiper.$wrapperEl[0].addEventListener('webkitTransitionEnd', swiper.onSlideToWrapperTransitionEnd);
      }
    }

    return true;
  }

  function slideToLoop(index, speed, runCallbacks, internal) {
    if (index === void 0) {
      index = 0;
    }

    if (speed === void 0) {
      speed = this.params.speed;
    }

    if (runCallbacks === void 0) {
      runCallbacks = true;
    }

    var swiper = this;
    var newIndex = index;

    if (swiper.params.loop) {
      newIndex += swiper.loopedSlides;
    }

    return swiper.slideTo(newIndex, speed, runCallbacks, internal);
  }

  /* eslint no-unused-vars: "off" */
  function slideNext(speed, runCallbacks, internal) {
    if (speed === void 0) {
      speed = this.params.speed;
    }

    if (runCallbacks === void 0) {
      runCallbacks = true;
    }

    var swiper = this;
    var params = swiper.params,
        animating = swiper.animating;
    var increment = swiper.activeIndex < params.slidesPerGroupSkip ? 1 : params.slidesPerGroup;

    if (params.loop) {
      if (animating && params.loopPreventsSlide) return false;
      swiper.loopFix(); // eslint-disable-next-line

      swiper._clientLeft = swiper.$wrapperEl[0].clientLeft;
    }

    return swiper.slideTo(swiper.activeIndex + increment, speed, runCallbacks, internal);
  }

  /* eslint no-unused-vars: "off" */
  function slidePrev(speed, runCallbacks, internal) {
    if (speed === void 0) {
      speed = this.params.speed;
    }

    if (runCallbacks === void 0) {
      runCallbacks = true;
    }

    var swiper = this;
    var params = swiper.params,
        animating = swiper.animating,
        snapGrid = swiper.snapGrid,
        slidesGrid = swiper.slidesGrid,
        rtlTranslate = swiper.rtlTranslate;

    if (params.loop) {
      if (animating && params.loopPreventsSlide) return false;
      swiper.loopFix(); // eslint-disable-next-line

      swiper._clientLeft = swiper.$wrapperEl[0].clientLeft;
    }

    var translate = rtlTranslate ? swiper.translate : -swiper.translate;

    function normalize(val) {
      if (val < 0) return -Math.floor(Math.abs(val));
      return Math.floor(val);
    }

    var normalizedTranslate = normalize(translate);
    var normalizedSnapGrid = snapGrid.map(function (val) {
      return normalize(val);
    });
    var currentSnap = snapGrid[normalizedSnapGrid.indexOf(normalizedTranslate)];
    var prevSnap = snapGrid[normalizedSnapGrid.indexOf(normalizedTranslate) - 1];

    if (typeof prevSnap === 'undefined' && params.cssMode) {
      snapGrid.forEach(function (snap) {
        if (!prevSnap && normalizedTranslate >= snap) prevSnap = snap;
      });
    }

    var prevIndex;

    if (typeof prevSnap !== 'undefined') {
      prevIndex = slidesGrid.indexOf(prevSnap);
      if (prevIndex < 0) prevIndex = swiper.activeIndex - 1;
    }

    return swiper.slideTo(prevIndex, speed, runCallbacks, internal);
  }

  /* eslint no-unused-vars: "off" */
  function slideReset(speed, runCallbacks, internal) {
    if (speed === void 0) {
      speed = this.params.speed;
    }

    if (runCallbacks === void 0) {
      runCallbacks = true;
    }

    var swiper = this;
    return swiper.slideTo(swiper.activeIndex, speed, runCallbacks, internal);
  }

  /* eslint no-unused-vars: "off" */
  function slideToClosest(speed, runCallbacks, internal, threshold) {
    if (speed === void 0) {
      speed = this.params.speed;
    }

    if (runCallbacks === void 0) {
      runCallbacks = true;
    }

    if (threshold === void 0) {
      threshold = 0.5;
    }

    var swiper = this;
    var index = swiper.activeIndex;
    var skip = Math.min(swiper.params.slidesPerGroupSkip, index);
    var snapIndex = skip + Math.floor((index - skip) / swiper.params.slidesPerGroup);
    var translate = swiper.rtlTranslate ? swiper.translate : -swiper.translate;

    if (translate >= swiper.snapGrid[snapIndex]) {
      // The current translate is on or after the current snap index, so the choice
      // is between the current index and the one after it.
      var currentSnap = swiper.snapGrid[snapIndex];
      var nextSnap = swiper.snapGrid[snapIndex + 1];

      if (translate - currentSnap > (nextSnap - currentSnap) * threshold) {
        index += swiper.params.slidesPerGroup;
      }
    } else {
      // The current translate is before the current snap index, so the choice
      // is between the current index and the one before it.
      var prevSnap = swiper.snapGrid[snapIndex - 1];
      var _currentSnap = swiper.snapGrid[snapIndex];

      if (translate - prevSnap <= (_currentSnap - prevSnap) * threshold) {
        index -= swiper.params.slidesPerGroup;
      }
    }

    index = Math.max(index, 0);
    index = Math.min(index, swiper.slidesGrid.length - 1);
    return swiper.slideTo(index, speed, runCallbacks, internal);
  }

  function slideToClickedSlide() {
    var swiper = this;
    var params = swiper.params,
        $wrapperEl = swiper.$wrapperEl;
    var slidesPerView = params.slidesPerView === 'auto' ? swiper.slidesPerViewDynamic() : params.slidesPerView;
    var slideToIndex = swiper.clickedIndex;
    var realIndex;

    if (params.loop) {
      if (swiper.animating) return;
      realIndex = parseInt($(swiper.clickedSlide).attr('data-swiper-slide-index'), 10);

      if (params.centeredSlides) {
        if (slideToIndex < swiper.loopedSlides - slidesPerView / 2 || slideToIndex > swiper.slides.length - swiper.loopedSlides + slidesPerView / 2) {
          swiper.loopFix();
          slideToIndex = $wrapperEl.children("." + params.slideClass + "[data-swiper-slide-index=\"" + realIndex + "\"]:not(." + params.slideDuplicateClass + ")").eq(0).index();
          nextTick(function () {
            swiper.slideTo(slideToIndex);
          });
        } else {
          swiper.slideTo(slideToIndex);
        }
      } else if (slideToIndex > swiper.slides.length - slidesPerView) {
        swiper.loopFix();
        slideToIndex = $wrapperEl.children("." + params.slideClass + "[data-swiper-slide-index=\"" + realIndex + "\"]:not(." + params.slideDuplicateClass + ")").eq(0).index();
        nextTick(function () {
          swiper.slideTo(slideToIndex);
        });
      } else {
        swiper.slideTo(slideToIndex);
      }
    } else {
      swiper.slideTo(slideToIndex);
    }
  }

  var slide = {
    slideTo: slideTo,
    slideToLoop: slideToLoop,
    slideNext: slideNext,
    slidePrev: slidePrev,
    slideReset: slideReset,
    slideToClosest: slideToClosest,
    slideToClickedSlide: slideToClickedSlide
  };

  function loopCreate() {
    var swiper = this;
    var document = getDocument();
    var params = swiper.params,
        $wrapperEl = swiper.$wrapperEl; // Remove duplicated slides

    $wrapperEl.children("." + params.slideClass + "." + params.slideDuplicateClass).remove();
    var slides = $wrapperEl.children("." + params.slideClass);

    if (params.loopFillGroupWithBlank) {
      var blankSlidesNum = params.slidesPerGroup - slides.length % params.slidesPerGroup;

      if (blankSlidesNum !== params.slidesPerGroup) {
        for (var i = 0; i < blankSlidesNum; i += 1) {
          var blankNode = $(document.createElement('div')).addClass(params.slideClass + " " + params.slideBlankClass);
          $wrapperEl.append(blankNode);
        }

        slides = $wrapperEl.children("." + params.slideClass);
      }
    }

    if (params.slidesPerView === 'auto' && !params.loopedSlides) params.loopedSlides = slides.length;
    swiper.loopedSlides = Math.ceil(parseFloat(params.loopedSlides || params.slidesPerView, 10));
    swiper.loopedSlides += params.loopAdditionalSlides;

    if (swiper.loopedSlides > slides.length) {
      swiper.loopedSlides = slides.length;
    }

    var prependSlides = [];
    var appendSlides = [];
    slides.each(function (el, index) {
      var slide = $(el);

      if (index < swiper.loopedSlides) {
        appendSlides.push(el);
      }

      if (index < slides.length && index >= slides.length - swiper.loopedSlides) {
        prependSlides.push(el);
      }

      slide.attr('data-swiper-slide-index', index);
    });

    for (var _i = 0; _i < appendSlides.length; _i += 1) {
      $wrapperEl.append($(appendSlides[_i].cloneNode(true)).addClass(params.slideDuplicateClass));
    }

    for (var _i2 = prependSlides.length - 1; _i2 >= 0; _i2 -= 1) {
      $wrapperEl.prepend($(prependSlides[_i2].cloneNode(true)).addClass(params.slideDuplicateClass));
    }
  }

  function loopFix() {
    var swiper = this;
    swiper.emit('beforeLoopFix');
    var activeIndex = swiper.activeIndex,
        slides = swiper.slides,
        loopedSlides = swiper.loopedSlides,
        allowSlidePrev = swiper.allowSlidePrev,
        allowSlideNext = swiper.allowSlideNext,
        snapGrid = swiper.snapGrid,
        rtl = swiper.rtlTranslate;
    var newIndex;
    swiper.allowSlidePrev = true;
    swiper.allowSlideNext = true;
    var snapTranslate = -snapGrid[activeIndex];
    var diff = snapTranslate - swiper.getTranslate(); // Fix For Negative Oversliding

    if (activeIndex < loopedSlides) {
      newIndex = slides.length - loopedSlides * 3 + activeIndex;
      newIndex += loopedSlides;
      var slideChanged = swiper.slideTo(newIndex, 0, false, true);

      if (slideChanged && diff !== 0) {
        swiper.setTranslate((rtl ? -swiper.translate : swiper.translate) - diff);
      }
    } else if (activeIndex >= slides.length - loopedSlides) {
      // Fix For Positive Oversliding
      newIndex = -slides.length + activeIndex + loopedSlides;
      newIndex += loopedSlides;

      var _slideChanged = swiper.slideTo(newIndex, 0, false, true);

      if (_slideChanged && diff !== 0) {
        swiper.setTranslate((rtl ? -swiper.translate : swiper.translate) - diff);
      }
    }

    swiper.allowSlidePrev = allowSlidePrev;
    swiper.allowSlideNext = allowSlideNext;
    swiper.emit('loopFix');
  }

  function loopDestroy() {
    var swiper = this;
    var $wrapperEl = swiper.$wrapperEl,
        params = swiper.params,
        slides = swiper.slides;
    $wrapperEl.children("." + params.slideClass + "." + params.slideDuplicateClass + ",." + params.slideClass + "." + params.slideBlankClass).remove();
    slides.removeAttr('data-swiper-slide-index');
  }

  var loop = {
    loopCreate: loopCreate,
    loopFix: loopFix,
    loopDestroy: loopDestroy
  };

  function setGrabCursor(moving) {
    var swiper = this;
    if (swiper.support.touch || !swiper.params.simulateTouch || swiper.params.watchOverflow && swiper.isLocked || swiper.params.cssMode) return;
    var el = swiper.el;
    el.style.cursor = 'move';
    el.style.cursor = moving ? '-webkit-grabbing' : '-webkit-grab';
    el.style.cursor = moving ? '-moz-grabbin' : '-moz-grab';
    el.style.cursor = moving ? 'grabbing' : 'grab';
  }

  function unsetGrabCursor() {
    var swiper = this;

    if (swiper.support.touch || swiper.params.watchOverflow && swiper.isLocked || swiper.params.cssMode) {
      return;
    }

    swiper.el.style.cursor = '';
  }

  var grabCursor = {
    setGrabCursor: setGrabCursor,
    unsetGrabCursor: unsetGrabCursor
  };

  function appendSlide(slides) {
    var swiper = this;
    var $wrapperEl = swiper.$wrapperEl,
        params = swiper.params;

    if (params.loop) {
      swiper.loopDestroy();
    }

    if (typeof slides === 'object' && 'length' in slides) {
      for (var i = 0; i < slides.length; i += 1) {
        if (slides[i]) $wrapperEl.append(slides[i]);
      }
    } else {
      $wrapperEl.append(slides);
    }

    if (params.loop) {
      swiper.loopCreate();
    }

    if (!(params.observer && swiper.support.observer)) {
      swiper.update();
    }
  }

  function prependSlide(slides) {
    var swiper = this;
    var params = swiper.params,
        $wrapperEl = swiper.$wrapperEl,
        activeIndex = swiper.activeIndex;

    if (params.loop) {
      swiper.loopDestroy();
    }

    var newActiveIndex = activeIndex + 1;

    if (typeof slides === 'object' && 'length' in slides) {
      for (var i = 0; i < slides.length; i += 1) {
        if (slides[i]) $wrapperEl.prepend(slides[i]);
      }

      newActiveIndex = activeIndex + slides.length;
    } else {
      $wrapperEl.prepend(slides);
    }

    if (params.loop) {
      swiper.loopCreate();
    }

    if (!(params.observer && swiper.support.observer)) {
      swiper.update();
    }

    swiper.slideTo(newActiveIndex, 0, false);
  }

  function addSlide(index, slides) {
    var swiper = this;
    var $wrapperEl = swiper.$wrapperEl,
        params = swiper.params,
        activeIndex = swiper.activeIndex;
    var activeIndexBuffer = activeIndex;

    if (params.loop) {
      activeIndexBuffer -= swiper.loopedSlides;
      swiper.loopDestroy();
      swiper.slides = $wrapperEl.children("." + params.slideClass);
    }

    var baseLength = swiper.slides.length;

    if (index <= 0) {
      swiper.prependSlide(slides);
      return;
    }

    if (index >= baseLength) {
      swiper.appendSlide(slides);
      return;
    }

    var newActiveIndex = activeIndexBuffer > index ? activeIndexBuffer + 1 : activeIndexBuffer;
    var slidesBuffer = [];

    for (var i = baseLength - 1; i >= index; i -= 1) {
      var currentSlide = swiper.slides.eq(i);
      currentSlide.remove();
      slidesBuffer.unshift(currentSlide);
    }

    if (typeof slides === 'object' && 'length' in slides) {
      for (var _i = 0; _i < slides.length; _i += 1) {
        if (slides[_i]) $wrapperEl.append(slides[_i]);
      }

      newActiveIndex = activeIndexBuffer > index ? activeIndexBuffer + slides.length : activeIndexBuffer;
    } else {
      $wrapperEl.append(slides);
    }

    for (var _i2 = 0; _i2 < slidesBuffer.length; _i2 += 1) {
      $wrapperEl.append(slidesBuffer[_i2]);
    }

    if (params.loop) {
      swiper.loopCreate();
    }

    if (!(params.observer && swiper.support.observer)) {
      swiper.update();
    }

    if (params.loop) {
      swiper.slideTo(newActiveIndex + swiper.loopedSlides, 0, false);
    } else {
      swiper.slideTo(newActiveIndex, 0, false);
    }
  }

  function removeSlide(slidesIndexes) {
    var swiper = this;
    var params = swiper.params,
        $wrapperEl = swiper.$wrapperEl,
        activeIndex = swiper.activeIndex;
    var activeIndexBuffer = activeIndex;

    if (params.loop) {
      activeIndexBuffer -= swiper.loopedSlides;
      swiper.loopDestroy();
      swiper.slides = $wrapperEl.children("." + params.slideClass);
    }

    var newActiveIndex = activeIndexBuffer;
    var indexToRemove;

    if (typeof slidesIndexes === 'object' && 'length' in slidesIndexes) {
      for (var i = 0; i < slidesIndexes.length; i += 1) {
        indexToRemove = slidesIndexes[i];
        if (swiper.slides[indexToRemove]) swiper.slides.eq(indexToRemove).remove();
        if (indexToRemove < newActiveIndex) newActiveIndex -= 1;
      }

      newActiveIndex = Math.max(newActiveIndex, 0);
    } else {
      indexToRemove = slidesIndexes;
      if (swiper.slides[indexToRemove]) swiper.slides.eq(indexToRemove).remove();
      if (indexToRemove < newActiveIndex) newActiveIndex -= 1;
      newActiveIndex = Math.max(newActiveIndex, 0);
    }

    if (params.loop) {
      swiper.loopCreate();
    }

    if (!(params.observer && swiper.support.observer)) {
      swiper.update();
    }

    if (params.loop) {
      swiper.slideTo(newActiveIndex + swiper.loopedSlides, 0, false);
    } else {
      swiper.slideTo(newActiveIndex, 0, false);
    }
  }

  function removeAllSlides() {
    var swiper = this;
    var slidesIndexes = [];

    for (var i = 0; i < swiper.slides.length; i += 1) {
      slidesIndexes.push(i);
    }

    swiper.removeSlide(slidesIndexes);
  }

  var manipulation = {
    appendSlide: appendSlide,
    prependSlide: prependSlide,
    addSlide: addSlide,
    removeSlide: removeSlide,
    removeAllSlides: removeAllSlides
  };

  function onTouchStart(event) {
    var swiper = this;
    var document = getDocument();
    var window = getWindow();
    var data = swiper.touchEventsData;
    var params = swiper.params,
        touches = swiper.touches;

    if (swiper.animating && params.preventInteractionOnTransition) {
      return;
    }

    var e = event;
    if (e.originalEvent) e = e.originalEvent;
    var $targetEl = $(e.target);

    if (params.touchEventsTarget === 'wrapper') {
      if (!$targetEl.closest(swiper.wrapperEl).length) return;
    }

    data.isTouchEvent = e.type === 'touchstart';
    if (!data.isTouchEvent && 'which' in e && e.which === 3) return;
    if (!data.isTouchEvent && 'button' in e && e.button > 0) return;
    if (data.isTouched && data.isMoved) return;

    if (params.noSwiping && $targetEl.closest(params.noSwipingSelector ? params.noSwipingSelector : "." + params.noSwipingClass)[0]) {
      swiper.allowClick = true;
      return;
    }

    if (params.swipeHandler) {
      if (!$targetEl.closest(params.swipeHandler)[0]) return;
    }

    touches.currentX = e.type === 'touchstart' ? e.targetTouches[0].pageX : e.pageX;
    touches.currentY = e.type === 'touchstart' ? e.targetTouches[0].pageY : e.pageY;
    var startX = touches.currentX;
    var startY = touches.currentY; // Do NOT start if iOS edge swipe is detected. Otherwise iOS app cannot swipe-to-go-back anymore

    var edgeSwipeDetection = params.edgeSwipeDetection || params.iOSEdgeSwipeDetection;
    var edgeSwipeThreshold = params.edgeSwipeThreshold || params.iOSEdgeSwipeThreshold;

    if (edgeSwipeDetection && (startX <= edgeSwipeThreshold || startX >= window.screen.width - edgeSwipeThreshold)) {
      return;
    }

    extend$1(data, {
      isTouched: true,
      isMoved: false,
      allowTouchCallbacks: true,
      isScrolling: undefined,
      startMoving: undefined
    });
    touches.startX = startX;
    touches.startY = startY;
    data.touchStartTime = now();
    swiper.allowClick = true;
    swiper.updateSize();
    swiper.swipeDirection = undefined;
    if (params.threshold > 0) data.allowThresholdMove = false;

    if (e.type !== 'touchstart') {
      var preventDefault = true;
      if ($targetEl.is(data.formElements)) preventDefault = false;

      if (document.activeElement && $(document.activeElement).is(data.formElements) && document.activeElement !== $targetEl[0]) {
        document.activeElement.blur();
      }

      var shouldPreventDefault = preventDefault && swiper.allowTouchMove && params.touchStartPreventDefault;

      if (params.touchStartForcePreventDefault || shouldPreventDefault) {
        e.preventDefault();
      }
    }

    swiper.emit('touchStart', e);
  }

  function onTouchMove(event) {
    var document = getDocument();
    var swiper = this;
    var data = swiper.touchEventsData;
    var params = swiper.params,
        touches = swiper.touches,
        rtl = swiper.rtlTranslate;
    var e = event;
    if (e.originalEvent) e = e.originalEvent;

    if (!data.isTouched) {
      if (data.startMoving && data.isScrolling) {
        swiper.emit('touchMoveOpposite', e);
      }

      return;
    }

    if (data.isTouchEvent && e.type !== 'touchmove') return;
    var targetTouch = e.type === 'touchmove' && e.targetTouches && (e.targetTouches[0] || e.changedTouches[0]);
    var pageX = e.type === 'touchmove' ? targetTouch.pageX : e.pageX;
    var pageY = e.type === 'touchmove' ? targetTouch.pageY : e.pageY;

    if (e.preventedByNestedSwiper) {
      touches.startX = pageX;
      touches.startY = pageY;
      return;
    }

    if (!swiper.allowTouchMove) {
      // isMoved = true;
      swiper.allowClick = false;

      if (data.isTouched) {
        extend$1(touches, {
          startX: pageX,
          startY: pageY,
          currentX: pageX,
          currentY: pageY
        });
        data.touchStartTime = now();
      }

      return;
    }

    if (data.isTouchEvent && params.touchReleaseOnEdges && !params.loop) {
      if (swiper.isVertical()) {
        // Vertical
        if (pageY < touches.startY && swiper.translate <= swiper.maxTranslate() || pageY > touches.startY && swiper.translate >= swiper.minTranslate()) {
          data.isTouched = false;
          data.isMoved = false;
          return;
        }
      } else if (pageX < touches.startX && swiper.translate <= swiper.maxTranslate() || pageX > touches.startX && swiper.translate >= swiper.minTranslate()) {
        return;
      }
    }

    if (data.isTouchEvent && document.activeElement) {
      if (e.target === document.activeElement && $(e.target).is(data.formElements)) {
        data.isMoved = true;
        swiper.allowClick = false;
        return;
      }
    }

    if (data.allowTouchCallbacks) {
      swiper.emit('touchMove', e);
    }

    if (e.targetTouches && e.targetTouches.length > 1) return;
    touches.currentX = pageX;
    touches.currentY = pageY;
    var diffX = touches.currentX - touches.startX;
    var diffY = touches.currentY - touches.startY;
    if (swiper.params.threshold && Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2)) < swiper.params.threshold) return;

    if (typeof data.isScrolling === 'undefined') {
      var touchAngle;

      if (swiper.isHorizontal() && touches.currentY === touches.startY || swiper.isVertical() && touches.currentX === touches.startX) {
        data.isScrolling = false;
      } else {
        // eslint-disable-next-line
        if (diffX * diffX + diffY * diffY >= 25) {
          touchAngle = Math.atan2(Math.abs(diffY), Math.abs(diffX)) * 180 / Math.PI;
          data.isScrolling = swiper.isHorizontal() ? touchAngle > params.touchAngle : 90 - touchAngle > params.touchAngle;
        }
      }
    }

    if (data.isScrolling) {
      swiper.emit('touchMoveOpposite', e);
    }

    if (typeof data.startMoving === 'undefined') {
      if (touches.currentX !== touches.startX || touches.currentY !== touches.startY) {
        data.startMoving = true;
      }
    }

    if (data.isScrolling) {
      data.isTouched = false;
      return;
    }

    if (!data.startMoving) {
      return;
    }

    swiper.allowClick = false;

    if (!params.cssMode && e.cancelable) {
      e.preventDefault();
    }

    if (params.touchMoveStopPropagation && !params.nested) {
      e.stopPropagation();
    }

    if (!data.isMoved) {
      if (params.loop) {
        swiper.loopFix();
      }

      data.startTranslate = swiper.getTranslate();
      swiper.setTransition(0);

      if (swiper.animating) {
        swiper.$wrapperEl.trigger('webkitTransitionEnd transitionend');
      }

      data.allowMomentumBounce = false; // Grab Cursor

      if (params.grabCursor && (swiper.allowSlideNext === true || swiper.allowSlidePrev === true)) {
        swiper.setGrabCursor(true);
      }

      swiper.emit('sliderFirstMove', e);
    }

    swiper.emit('sliderMove', e);
    data.isMoved = true;
    var diff = swiper.isHorizontal() ? diffX : diffY;
    touches.diff = diff;
    diff *= params.touchRatio;
    if (rtl) diff = -diff;
    swiper.swipeDirection = diff > 0 ? 'prev' : 'next';
    data.currentTranslate = diff + data.startTranslate;
    var disableParentSwiper = true;
    var resistanceRatio = params.resistanceRatio;

    if (params.touchReleaseOnEdges) {
      resistanceRatio = 0;
    }

    if (diff > 0 && data.currentTranslate > swiper.minTranslate()) {
      disableParentSwiper = false;
      if (params.resistance) data.currentTranslate = swiper.minTranslate() - 1 + Math.pow(-swiper.minTranslate() + data.startTranslate + diff, resistanceRatio);
    } else if (diff < 0 && data.currentTranslate < swiper.maxTranslate()) {
      disableParentSwiper = false;
      if (params.resistance) data.currentTranslate = swiper.maxTranslate() + 1 - Math.pow(swiper.maxTranslate() - data.startTranslate - diff, resistanceRatio);
    }

    if (disableParentSwiper) {
      e.preventedByNestedSwiper = true;
    } // Directions locks


    if (!swiper.allowSlideNext && swiper.swipeDirection === 'next' && data.currentTranslate < data.startTranslate) {
      data.currentTranslate = data.startTranslate;
    }

    if (!swiper.allowSlidePrev && swiper.swipeDirection === 'prev' && data.currentTranslate > data.startTranslate) {
      data.currentTranslate = data.startTranslate;
    } // Threshold


    if (params.threshold > 0) {
      if (Math.abs(diff) > params.threshold || data.allowThresholdMove) {
        if (!data.allowThresholdMove) {
          data.allowThresholdMove = true;
          touches.startX = touches.currentX;
          touches.startY = touches.currentY;
          data.currentTranslate = data.startTranslate;
          touches.diff = swiper.isHorizontal() ? touches.currentX - touches.startX : touches.currentY - touches.startY;
          return;
        }
      } else {
        data.currentTranslate = data.startTranslate;
        return;
      }
    }

    if (!params.followFinger || params.cssMode) return; // Update active index in free mode

    if (params.freeMode || params.watchSlidesProgress || params.watchSlidesVisibility) {
      swiper.updateActiveIndex();
      swiper.updateSlidesClasses();
    }

    if (params.freeMode) {
      // Velocity
      if (data.velocities.length === 0) {
        data.velocities.push({
          position: touches[swiper.isHorizontal() ? 'startX' : 'startY'],
          time: data.touchStartTime
        });
      }

      data.velocities.push({
        position: touches[swiper.isHorizontal() ? 'currentX' : 'currentY'],
        time: now()
      });
    } // Update progress


    swiper.updateProgress(data.currentTranslate); // Update translate

    swiper.setTranslate(data.currentTranslate);
  }

  function onTouchEnd(event) {
    var swiper = this;
    var data = swiper.touchEventsData;
    var params = swiper.params,
        touches = swiper.touches,
        rtl = swiper.rtlTranslate,
        $wrapperEl = swiper.$wrapperEl,
        slidesGrid = swiper.slidesGrid,
        snapGrid = swiper.snapGrid;
    var e = event;
    if (e.originalEvent) e = e.originalEvent;

    if (data.allowTouchCallbacks) {
      swiper.emit('touchEnd', e);
    }

    data.allowTouchCallbacks = false;

    if (!data.isTouched) {
      if (data.isMoved && params.grabCursor) {
        swiper.setGrabCursor(false);
      }

      data.isMoved = false;
      data.startMoving = false;
      return;
    } // Return Grab Cursor


    if (params.grabCursor && data.isMoved && data.isTouched && (swiper.allowSlideNext === true || swiper.allowSlidePrev === true)) {
      swiper.setGrabCursor(false);
    } // Time diff


    var touchEndTime = now();
    var timeDiff = touchEndTime - data.touchStartTime; // Tap, doubleTap, Click

    if (swiper.allowClick) {
      swiper.updateClickedSlide(e);
      swiper.emit('tap click', e);

      if (timeDiff < 300 && touchEndTime - data.lastClickTime < 300) {
        swiper.emit('doubleTap doubleClick', e);
      }
    }

    data.lastClickTime = now();
    nextTick(function () {
      if (!swiper.destroyed) swiper.allowClick = true;
    });

    if (!data.isTouched || !data.isMoved || !swiper.swipeDirection || touches.diff === 0 || data.currentTranslate === data.startTranslate) {
      data.isTouched = false;
      data.isMoved = false;
      data.startMoving = false;
      return;
    }

    data.isTouched = false;
    data.isMoved = false;
    data.startMoving = false;
    var currentPos;

    if (params.followFinger) {
      currentPos = rtl ? swiper.translate : -swiper.translate;
    } else {
      currentPos = -data.currentTranslate;
    }

    if (params.cssMode) {
      return;
    }

    if (params.freeMode) {
      if (currentPos < -swiper.minTranslate()) {
        swiper.slideTo(swiper.activeIndex);
        return;
      }

      if (currentPos > -swiper.maxTranslate()) {
        if (swiper.slides.length < snapGrid.length) {
          swiper.slideTo(snapGrid.length - 1);
        } else {
          swiper.slideTo(swiper.slides.length - 1);
        }

        return;
      }

      if (params.freeModeMomentum) {
        if (data.velocities.length > 1) {
          var lastMoveEvent = data.velocities.pop();
          var velocityEvent = data.velocities.pop();
          var distance = lastMoveEvent.position - velocityEvent.position;
          var time = lastMoveEvent.time - velocityEvent.time;
          swiper.velocity = distance / time;
          swiper.velocity /= 2;

          if (Math.abs(swiper.velocity) < params.freeModeMinimumVelocity) {
            swiper.velocity = 0;
          } // this implies that the user stopped moving a finger then released.
          // There would be no events with distance zero, so the last event is stale.


          if (time > 150 || now() - lastMoveEvent.time > 300) {
            swiper.velocity = 0;
          }
        } else {
          swiper.velocity = 0;
        }

        swiper.velocity *= params.freeModeMomentumVelocityRatio;
        data.velocities.length = 0;
        var momentumDuration = 1000 * params.freeModeMomentumRatio;
        var momentumDistance = swiper.velocity * momentumDuration;
        var newPosition = swiper.translate + momentumDistance;
        if (rtl) newPosition = -newPosition;
        var doBounce = false;
        var afterBouncePosition;
        var bounceAmount = Math.abs(swiper.velocity) * 20 * params.freeModeMomentumBounceRatio;
        var needsLoopFix;

        if (newPosition < swiper.maxTranslate()) {
          if (params.freeModeMomentumBounce) {
            if (newPosition + swiper.maxTranslate() < -bounceAmount) {
              newPosition = swiper.maxTranslate() - bounceAmount;
            }

            afterBouncePosition = swiper.maxTranslate();
            doBounce = true;
            data.allowMomentumBounce = true;
          } else {
            newPosition = swiper.maxTranslate();
          }

          if (params.loop && params.centeredSlides) needsLoopFix = true;
        } else if (newPosition > swiper.minTranslate()) {
          if (params.freeModeMomentumBounce) {
            if (newPosition - swiper.minTranslate() > bounceAmount) {
              newPosition = swiper.minTranslate() + bounceAmount;
            }

            afterBouncePosition = swiper.minTranslate();
            doBounce = true;
            data.allowMomentumBounce = true;
          } else {
            newPosition = swiper.minTranslate();
          }

          if (params.loop && params.centeredSlides) needsLoopFix = true;
        } else if (params.freeModeSticky) {
          var nextSlide;

          for (var j = 0; j < snapGrid.length; j += 1) {
            if (snapGrid[j] > -newPosition) {
              nextSlide = j;
              break;
            }
          }

          if (Math.abs(snapGrid[nextSlide] - newPosition) < Math.abs(snapGrid[nextSlide - 1] - newPosition) || swiper.swipeDirection === 'next') {
            newPosition = snapGrid[nextSlide];
          } else {
            newPosition = snapGrid[nextSlide - 1];
          }

          newPosition = -newPosition;
        }

        if (needsLoopFix) {
          swiper.once('transitionEnd', function () {
            swiper.loopFix();
          });
        } // Fix duration


        if (swiper.velocity !== 0) {
          if (rtl) {
            momentumDuration = Math.abs((-newPosition - swiper.translate) / swiper.velocity);
          } else {
            momentumDuration = Math.abs((newPosition - swiper.translate) / swiper.velocity);
          }

          if (params.freeModeSticky) {
            // If freeModeSticky is active and the user ends a swipe with a slow-velocity
            // event, then durations can be 20+ seconds to slide one (or zero!) slides.
            // It's easy to see this when simulating touch with mouse events. To fix this,
            // limit single-slide swipes to the default slide duration. This also has the
            // nice side effect of matching slide speed if the user stopped moving before
            // lifting finger or mouse vs. moving slowly before lifting the finger/mouse.
            // For faster swipes, also apply limits (albeit higher ones).
            var moveDistance = Math.abs((rtl ? -newPosition : newPosition) - swiper.translate);
            var currentSlideSize = swiper.slidesSizesGrid[swiper.activeIndex];

            if (moveDistance < currentSlideSize) {
              momentumDuration = params.speed;
            } else if (moveDistance < 2 * currentSlideSize) {
              momentumDuration = params.speed * 1.5;
            } else {
              momentumDuration = params.speed * 2.5;
            }
          }
        } else if (params.freeModeSticky) {
          swiper.slideToClosest();
          return;
        }

        if (params.freeModeMomentumBounce && doBounce) {
          swiper.updateProgress(afterBouncePosition);
          swiper.setTransition(momentumDuration);
          swiper.setTranslate(newPosition);
          swiper.transitionStart(true, swiper.swipeDirection);
          swiper.animating = true;
          $wrapperEl.transitionEnd(function () {
            if (!swiper || swiper.destroyed || !data.allowMomentumBounce) return;
            swiper.emit('momentumBounce');
            swiper.setTransition(params.speed);
            setTimeout(function () {
              swiper.setTranslate(afterBouncePosition);
              $wrapperEl.transitionEnd(function () {
                if (!swiper || swiper.destroyed) return;
                swiper.transitionEnd();
              });
            }, 0);
          });
        } else if (swiper.velocity) {
          swiper.updateProgress(newPosition);
          swiper.setTransition(momentumDuration);
          swiper.setTranslate(newPosition);
          swiper.transitionStart(true, swiper.swipeDirection);

          if (!swiper.animating) {
            swiper.animating = true;
            $wrapperEl.transitionEnd(function () {
              if (!swiper || swiper.destroyed) return;
              swiper.transitionEnd();
            });
          }
        } else {
          swiper.updateProgress(newPosition);
        }

        swiper.updateActiveIndex();
        swiper.updateSlidesClasses();
      } else if (params.freeModeSticky) {
        swiper.slideToClosest();
        return;
      }

      if (!params.freeModeMomentum || timeDiff >= params.longSwipesMs) {
        swiper.updateProgress();
        swiper.updateActiveIndex();
        swiper.updateSlidesClasses();
      }

      return;
    } // Find current slide


    var stopIndex = 0;
    var groupSize = swiper.slidesSizesGrid[0];

    for (var i = 0; i < slidesGrid.length; i += i < params.slidesPerGroupSkip ? 1 : params.slidesPerGroup) {
      var _increment = i < params.slidesPerGroupSkip - 1 ? 1 : params.slidesPerGroup;

      if (typeof slidesGrid[i + _increment] !== 'undefined') {
        if (currentPos >= slidesGrid[i] && currentPos < slidesGrid[i + _increment]) {
          stopIndex = i;
          groupSize = slidesGrid[i + _increment] - slidesGrid[i];
        }
      } else if (currentPos >= slidesGrid[i]) {
        stopIndex = i;
        groupSize = slidesGrid[slidesGrid.length - 1] - slidesGrid[slidesGrid.length - 2];
      }
    } // Find current slide size


    var ratio = (currentPos - slidesGrid[stopIndex]) / groupSize;
    var increment = stopIndex < params.slidesPerGroupSkip - 1 ? 1 : params.slidesPerGroup;

    if (timeDiff > params.longSwipesMs) {
      // Long touches
      if (!params.longSwipes) {
        swiper.slideTo(swiper.activeIndex);
        return;
      }

      if (swiper.swipeDirection === 'next') {
        if (ratio >= params.longSwipesRatio) swiper.slideTo(stopIndex + increment);else swiper.slideTo(stopIndex);
      }

      if (swiper.swipeDirection === 'prev') {
        if (ratio > 1 - params.longSwipesRatio) swiper.slideTo(stopIndex + increment);else swiper.slideTo(stopIndex);
      }
    } else {
      // Short swipes
      if (!params.shortSwipes) {
        swiper.slideTo(swiper.activeIndex);
        return;
      }

      var isNavButtonTarget = swiper.navigation && (e.target === swiper.navigation.nextEl || e.target === swiper.navigation.prevEl);

      if (!isNavButtonTarget) {
        if (swiper.swipeDirection === 'next') {
          swiper.slideTo(stopIndex + increment);
        }

        if (swiper.swipeDirection === 'prev') {
          swiper.slideTo(stopIndex);
        }
      } else if (e.target === swiper.navigation.nextEl) {
        swiper.slideTo(stopIndex + increment);
      } else {
        swiper.slideTo(stopIndex);
      }
    }
  }

  function onResize() {
    var swiper = this;
    var params = swiper.params,
        el = swiper.el;
    if (el && el.offsetWidth === 0) return; // Breakpoints

    if (params.breakpoints) {
      swiper.setBreakpoint();
    } // Save locks


    var allowSlideNext = swiper.allowSlideNext,
        allowSlidePrev = swiper.allowSlidePrev,
        snapGrid = swiper.snapGrid; // Disable locks on resize

    swiper.allowSlideNext = true;
    swiper.allowSlidePrev = true;
    swiper.updateSize();
    swiper.updateSlides();
    swiper.updateSlidesClasses();

    if ((params.slidesPerView === 'auto' || params.slidesPerView > 1) && swiper.isEnd && !swiper.isBeginning && !swiper.params.centeredSlides) {
      swiper.slideTo(swiper.slides.length - 1, 0, false, true);
    } else {
      swiper.slideTo(swiper.activeIndex, 0, false, true);
    }

    if (swiper.autoplay && swiper.autoplay.running && swiper.autoplay.paused) {
      swiper.autoplay.run();
    } // Return locks after resize


    swiper.allowSlidePrev = allowSlidePrev;
    swiper.allowSlideNext = allowSlideNext;

    if (swiper.params.watchOverflow && snapGrid !== swiper.snapGrid) {
      swiper.checkOverflow();
    }
  }

  function onClick(e) {
    var swiper = this;

    if (!swiper.allowClick) {
      if (swiper.params.preventClicks) e.preventDefault();

      if (swiper.params.preventClicksPropagation && swiper.animating) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }
  }

  function onScroll() {
    var swiper = this;
    var wrapperEl = swiper.wrapperEl,
        rtlTranslate = swiper.rtlTranslate;
    swiper.previousTranslate = swiper.translate;

    if (swiper.isHorizontal()) {
      if (rtlTranslate) {
        swiper.translate = wrapperEl.scrollWidth - wrapperEl.offsetWidth - wrapperEl.scrollLeft;
      } else {
        swiper.translate = -wrapperEl.scrollLeft;
      }
    } else {
      swiper.translate = -wrapperEl.scrollTop;
    } // eslint-disable-next-line


    if (swiper.translate === -0) swiper.translate = 0;
    swiper.updateActiveIndex();
    swiper.updateSlidesClasses();
    var newProgress;
    var translatesDiff = swiper.maxTranslate() - swiper.minTranslate();

    if (translatesDiff === 0) {
      newProgress = 0;
    } else {
      newProgress = (swiper.translate - swiper.minTranslate()) / translatesDiff;
    }

    if (newProgress !== swiper.progress) {
      swiper.updateProgress(rtlTranslate ? -swiper.translate : swiper.translate);
    }

    swiper.emit('setTranslate', swiper.translate, false);
  }

  var dummyEventAttached = false;

  function dummyEventListener() {}

  function attachEvents() {
    var swiper = this;
    var document = getDocument();
    var params = swiper.params,
        touchEvents = swiper.touchEvents,
        el = swiper.el,
        wrapperEl = swiper.wrapperEl,
        device = swiper.device,
        support = swiper.support;
    swiper.onTouchStart = onTouchStart.bind(swiper);
    swiper.onTouchMove = onTouchMove.bind(swiper);
    swiper.onTouchEnd = onTouchEnd.bind(swiper);

    if (params.cssMode) {
      swiper.onScroll = onScroll.bind(swiper);
    }

    swiper.onClick = onClick.bind(swiper);
    var capture = !!params.nested; // Touch Events

    if (!support.touch && support.pointerEvents) {
      el.addEventListener(touchEvents.start, swiper.onTouchStart, false);
      document.addEventListener(touchEvents.move, swiper.onTouchMove, capture);
      document.addEventListener(touchEvents.end, swiper.onTouchEnd, false);
    } else {
      if (support.touch) {
        var passiveListener = touchEvents.start === 'touchstart' && support.passiveListener && params.passiveListeners ? {
          passive: true,
          capture: false
        } : false;
        el.addEventListener(touchEvents.start, swiper.onTouchStart, passiveListener);
        el.addEventListener(touchEvents.move, swiper.onTouchMove, support.passiveListener ? {
          passive: false,
          capture: capture
        } : capture);
        el.addEventListener(touchEvents.end, swiper.onTouchEnd, passiveListener);

        if (touchEvents.cancel) {
          el.addEventListener(touchEvents.cancel, swiper.onTouchEnd, passiveListener);
        }

        if (!dummyEventAttached) {
          document.addEventListener('touchstart', dummyEventListener);
          dummyEventAttached = true;
        }
      }

      if (params.simulateTouch && !device.ios && !device.android || params.simulateTouch && !support.touch && device.ios) {
        el.addEventListener('mousedown', swiper.onTouchStart, false);
        document.addEventListener('mousemove', swiper.onTouchMove, capture);
        document.addEventListener('mouseup', swiper.onTouchEnd, false);
      }
    } // Prevent Links Clicks


    if (params.preventClicks || params.preventClicksPropagation) {
      el.addEventListener('click', swiper.onClick, true);
    }

    if (params.cssMode) {
      wrapperEl.addEventListener('scroll', swiper.onScroll);
    } // Resize handler


    if (params.updateOnWindowResize) {
      swiper.on(device.ios || device.android ? 'resize orientationchange observerUpdate' : 'resize observerUpdate', onResize, true);
    } else {
      swiper.on('observerUpdate', onResize, true);
    }
  }

  function detachEvents() {
    var swiper = this;
    var document = getDocument();
    var params = swiper.params,
        touchEvents = swiper.touchEvents,
        el = swiper.el,
        wrapperEl = swiper.wrapperEl,
        device = swiper.device,
        support = swiper.support;
    var capture = !!params.nested; // Touch Events

    if (!support.touch && support.pointerEvents) {
      el.removeEventListener(touchEvents.start, swiper.onTouchStart, false);
      document.removeEventListener(touchEvents.move, swiper.onTouchMove, capture);
      document.removeEventListener(touchEvents.end, swiper.onTouchEnd, false);
    } else {
      if (support.touch) {
        var passiveListener = touchEvents.start === 'onTouchStart' && support.passiveListener && params.passiveListeners ? {
          passive: true,
          capture: false
        } : false;
        el.removeEventListener(touchEvents.start, swiper.onTouchStart, passiveListener);
        el.removeEventListener(touchEvents.move, swiper.onTouchMove, capture);
        el.removeEventListener(touchEvents.end, swiper.onTouchEnd, passiveListener);

        if (touchEvents.cancel) {
          el.removeEventListener(touchEvents.cancel, swiper.onTouchEnd, passiveListener);
        }
      }

      if (params.simulateTouch && !device.ios && !device.android || params.simulateTouch && !support.touch && device.ios) {
        el.removeEventListener('mousedown', swiper.onTouchStart, false);
        document.removeEventListener('mousemove', swiper.onTouchMove, capture);
        document.removeEventListener('mouseup', swiper.onTouchEnd, false);
      }
    } // Prevent Links Clicks


    if (params.preventClicks || params.preventClicksPropagation) {
      el.removeEventListener('click', swiper.onClick, true);
    }

    if (params.cssMode) {
      wrapperEl.removeEventListener('scroll', swiper.onScroll);
    } // Resize handler


    swiper.off(device.ios || device.android ? 'resize orientationchange observerUpdate' : 'resize observerUpdate', onResize);
  }

  var events = {
    attachEvents: attachEvents,
    detachEvents: detachEvents
  };

  function setBreakpoint() {
    var swiper = this;
    var activeIndex = swiper.activeIndex,
        initialized = swiper.initialized,
        _swiper$loopedSlides = swiper.loopedSlides,
        loopedSlides = _swiper$loopedSlides === void 0 ? 0 : _swiper$loopedSlides,
        params = swiper.params,
        $el = swiper.$el;
    var breakpoints = params.breakpoints;
    if (!breakpoints || breakpoints && Object.keys(breakpoints).length === 0) return; // Get breakpoint for window width and update parameters

    var breakpoint = swiper.getBreakpoint(breakpoints);

    if (breakpoint && swiper.currentBreakpoint !== breakpoint) {
      var breakpointOnlyParams = breakpoint in breakpoints ? breakpoints[breakpoint] : undefined;

      if (breakpointOnlyParams) {
        ['slidesPerView', 'spaceBetween', 'slidesPerGroup', 'slidesPerGroupSkip', 'slidesPerColumn'].forEach(function (param) {
          var paramValue = breakpointOnlyParams[param];
          if (typeof paramValue === 'undefined') return;

          if (param === 'slidesPerView' && (paramValue === 'AUTO' || paramValue === 'auto')) {
            breakpointOnlyParams[param] = 'auto';
          } else if (param === 'slidesPerView') {
            breakpointOnlyParams[param] = parseFloat(paramValue);
          } else {
            breakpointOnlyParams[param] = parseInt(paramValue, 10);
          }
        });
      }

      var breakpointParams = breakpointOnlyParams || swiper.originalParams;
      var wasMultiRow = params.slidesPerColumn > 1;
      var isMultiRow = breakpointParams.slidesPerColumn > 1;

      if (wasMultiRow && !isMultiRow) {
        $el.removeClass(params.containerModifierClass + "multirow " + params.containerModifierClass + "multirow-column");
        swiper.emitContainerClasses();
      } else if (!wasMultiRow && isMultiRow) {
        $el.addClass(params.containerModifierClass + "multirow");

        if (breakpointParams.slidesPerColumnFill === 'column') {
          $el.addClass(params.containerModifierClass + "multirow-column");
        }

        swiper.emitContainerClasses();
      }

      var directionChanged = breakpointParams.direction && breakpointParams.direction !== params.direction;
      var needsReLoop = params.loop && (breakpointParams.slidesPerView !== params.slidesPerView || directionChanged);

      if (directionChanged && initialized) {
        swiper.changeDirection();
      }

      extend$1(swiper.params, breakpointParams);
      extend$1(swiper, {
        allowTouchMove: swiper.params.allowTouchMove,
        allowSlideNext: swiper.params.allowSlideNext,
        allowSlidePrev: swiper.params.allowSlidePrev
      });
      swiper.currentBreakpoint = breakpoint;

      if (needsReLoop && initialized) {
        swiper.loopDestroy();
        swiper.loopCreate();
        swiper.updateSlides();
        swiper.slideTo(activeIndex - loopedSlides + swiper.loopedSlides, 0, false);
      }

      swiper.emit('breakpoint', breakpointParams);
    }
  }

  function getBreakpoints(breakpoints) {
    var window = getWindow(); // Get breakpoint for window width

    if (!breakpoints) return undefined;
    var breakpoint = false;
    var points = Object.keys(breakpoints).map(function (point) {
      if (typeof point === 'string' && point.indexOf('@') === 0) {
        var minRatio = parseFloat(point.substr(1));
        var value = window.innerHeight * minRatio;
        return {
          value: value,
          point: point
        };
      }

      return {
        value: point,
        point: point
      };
    });
    points.sort(function (a, b) {
      return parseInt(a.value, 10) - parseInt(b.value, 10);
    });

    for (var i = 0; i < points.length; i += 1) {
      var _points$i = points[i],
          point = _points$i.point,
          value = _points$i.value;

      if (value <= window.innerWidth) {
        breakpoint = point;
      }
    }

    return breakpoint || 'max';
  }

  var breakpoints = {
    setBreakpoint: setBreakpoint,
    getBreakpoint: getBreakpoints
  };

  function addClasses() {
    var swiper = this;
    var classNames = swiper.classNames,
        params = swiper.params,
        rtl = swiper.rtl,
        $el = swiper.$el,
        device = swiper.device;
    var suffixes = [];
    suffixes.push('initialized');
    suffixes.push(params.direction);

    if (params.freeMode) {
      suffixes.push('free-mode');
    }

    if (params.autoHeight) {
      suffixes.push('autoheight');
    }

    if (rtl) {
      suffixes.push('rtl');
    }

    if (params.slidesPerColumn > 1) {
      suffixes.push('multirow');

      if (params.slidesPerColumnFill === 'column') {
        suffixes.push('multirow-column');
      }
    }

    if (device.android) {
      suffixes.push('android');
    }

    if (device.ios) {
      suffixes.push('ios');
    }

    if (params.cssMode) {
      suffixes.push('css-mode');
    }

    suffixes.forEach(function (suffix) {
      classNames.push(params.containerModifierClass + suffix);
    });
    $el.addClass(classNames.join(' '));
    swiper.emitContainerClasses();
  }

  function removeClasses() {
    var swiper = this;
    var $el = swiper.$el,
        classNames = swiper.classNames;
    $el.removeClass(classNames.join(' '));
    swiper.emitContainerClasses();
  }

  var classes = {
    addClasses: addClasses,
    removeClasses: removeClasses
  };

  function loadImage(imageEl, src, srcset, sizes, checkForComplete, callback) {
    var window = getWindow();
    var image;

    function onReady() {
      if (callback) callback();
    }

    var isPicture = $(imageEl).parent('picture')[0];

    if (!isPicture && (!imageEl.complete || !checkForComplete)) {
      if (src) {
        image = new window.Image();
        image.onload = onReady;
        image.onerror = onReady;

        if (sizes) {
          image.sizes = sizes;
        }

        if (srcset) {
          image.srcset = srcset;
        }

        if (src) {
          image.src = src;
        }
      } else {
        onReady();
      }
    } else {
      // image already loaded...
      onReady();
    }
  }

  function preloadImages() {
    var swiper = this;
    swiper.imagesToLoad = swiper.$el.find('img');

    function onReady() {
      if (typeof swiper === 'undefined' || swiper === null || !swiper || swiper.destroyed) return;
      if (swiper.imagesLoaded !== undefined) swiper.imagesLoaded += 1;

      if (swiper.imagesLoaded === swiper.imagesToLoad.length) {
        if (swiper.params.updateOnImagesReady) swiper.update();
        swiper.emit('imagesReady');
      }
    }

    for (var i = 0; i < swiper.imagesToLoad.length; i += 1) {
      var imageEl = swiper.imagesToLoad[i];
      swiper.loadImage(imageEl, imageEl.currentSrc || imageEl.getAttribute('src'), imageEl.srcset || imageEl.getAttribute('srcset'), imageEl.sizes || imageEl.getAttribute('sizes'), true, onReady);
    }
  }

  var images = {
    loadImage: loadImage,
    preloadImages: preloadImages
  };

  function checkOverflow() {
    var swiper = this;
    var params = swiper.params;
    var wasLocked = swiper.isLocked;
    var lastSlidePosition = swiper.slides.length > 0 && params.slidesOffsetBefore + params.spaceBetween * (swiper.slides.length - 1) + swiper.slides[0].offsetWidth * swiper.slides.length;

    if (params.slidesOffsetBefore && params.slidesOffsetAfter && lastSlidePosition) {
      swiper.isLocked = lastSlidePosition <= swiper.size;
    } else {
      swiper.isLocked = swiper.snapGrid.length === 1;
    }

    swiper.allowSlideNext = !swiper.isLocked;
    swiper.allowSlidePrev = !swiper.isLocked; // events

    if (wasLocked !== swiper.isLocked) swiper.emit(swiper.isLocked ? 'lock' : 'unlock');

    if (wasLocked && wasLocked !== swiper.isLocked) {
      swiper.isEnd = false;
      if (swiper.navigation) swiper.navigation.update();
    }
  }

  var checkOverflow$1 = {
    checkOverflow: checkOverflow
  };

  var defaults = {
    init: true,
    direction: 'horizontal',
    touchEventsTarget: 'container',
    initialSlide: 0,
    speed: 300,
    cssMode: false,
    updateOnWindowResize: true,
    // Overrides
    width: null,
    height: null,
    //
    preventInteractionOnTransition: false,
    // ssr
    userAgent: null,
    url: null,
    // To support iOS's swipe-to-go-back gesture (when being used in-app).
    edgeSwipeDetection: false,
    edgeSwipeThreshold: 20,
    // Free mode
    freeMode: false,
    freeModeMomentum: true,
    freeModeMomentumRatio: 1,
    freeModeMomentumBounce: true,
    freeModeMomentumBounceRatio: 1,
    freeModeMomentumVelocityRatio: 1,
    freeModeSticky: false,
    freeModeMinimumVelocity: 0.02,
    // Autoheight
    autoHeight: false,
    // Set wrapper width
    setWrapperSize: false,
    // Virtual Translate
    virtualTranslate: false,
    // Effects
    effect: 'slide',
    // 'slide' or 'fade' or 'cube' or 'coverflow' or 'flip'
    // Breakpoints
    breakpoints: undefined,
    // Slides grid
    spaceBetween: 0,
    slidesPerView: 1,
    slidesPerColumn: 1,
    slidesPerColumnFill: 'column',
    slidesPerGroup: 1,
    slidesPerGroupSkip: 0,
    centeredSlides: false,
    centeredSlidesBounds: false,
    slidesOffsetBefore: 0,
    // in px
    slidesOffsetAfter: 0,
    // in px
    normalizeSlideIndex: true,
    centerInsufficientSlides: false,
    // Disable swiper and hide navigation when container not overflow
    watchOverflow: false,
    // Round length
    roundLengths: false,
    // Touches
    touchRatio: 1,
    touchAngle: 45,
    simulateTouch: true,
    shortSwipes: true,
    longSwipes: true,
    longSwipesRatio: 0.5,
    longSwipesMs: 300,
    followFinger: true,
    allowTouchMove: true,
    threshold: 0,
    touchMoveStopPropagation: false,
    touchStartPreventDefault: true,
    touchStartForcePreventDefault: false,
    touchReleaseOnEdges: false,
    // Unique Navigation Elements
    uniqueNavElements: true,
    // Resistance
    resistance: true,
    resistanceRatio: 0.85,
    // Progress
    watchSlidesProgress: false,
    watchSlidesVisibility: false,
    // Cursor
    grabCursor: false,
    // Clicks
    preventClicks: true,
    preventClicksPropagation: true,
    slideToClickedSlide: false,
    // Images
    preloadImages: true,
    updateOnImagesReady: true,
    // loop
    loop: false,
    loopAdditionalSlides: 0,
    loopedSlides: null,
    loopFillGroupWithBlank: false,
    loopPreventsSlide: true,
    // Swiping/no swiping
    allowSlidePrev: true,
    allowSlideNext: true,
    swipeHandler: null,
    // '.swipe-handler',
    noSwiping: true,
    noSwipingClass: 'swiper-no-swiping',
    noSwipingSelector: null,
    // Passive Listeners
    passiveListeners: true,
    // NS
    containerModifierClass: 'swiper-container-',
    // NEW
    slideClass: 'swiper-slide',
    slideBlankClass: 'swiper-slide-invisible-blank',
    slideActiveClass: 'swiper-slide-active',
    slideDuplicateActiveClass: 'swiper-slide-duplicate-active',
    slideVisibleClass: 'swiper-slide-visible',
    slideDuplicateClass: 'swiper-slide-duplicate',
    slideNextClass: 'swiper-slide-next',
    slideDuplicateNextClass: 'swiper-slide-duplicate-next',
    slidePrevClass: 'swiper-slide-prev',
    slideDuplicatePrevClass: 'swiper-slide-duplicate-prev',
    wrapperClass: 'swiper-wrapper',
    // Callbacks
    runCallbacksOnInit: true,
    // Internals
    _emitClasses: false
  };

  function _defineProperties$1(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass$1(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$1(Constructor.prototype, protoProps); if (staticProps) _defineProperties$1(Constructor, staticProps); return Constructor; }
  var prototypes = {
    modular: modular,
    eventsEmitter: eventsEmitter,
    update: update,
    translate: translate,
    transition: transition$1,
    slide: slide,
    loop: loop,
    grabCursor: grabCursor,
    manipulation: manipulation,
    events: events,
    breakpoints: breakpoints,
    checkOverflow: checkOverflow$1,
    classes: classes,
    images: images
  };
  var extendedDefaults = {};

  var Swiper = /*#__PURE__*/function () {
    function Swiper() {
      var el;
      var params;

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (args.length === 1 && args[0].constructor && args[0].constructor === Object) {
        params = args[0];
      } else {
        el = args[0];
        params = args[1];
      }

      if (!params) params = {};
      params = extend$1({}, params);
      if (el && !params.el) params.el = el; // Swiper Instance

      var swiper = this;
      swiper.support = getSupport();
      swiper.device = getDevice({
        userAgent: params.userAgent
      });
      swiper.browser = getBrowser();
      swiper.eventsListeners = {};
      swiper.eventsAnyListeners = [];
      Object.keys(prototypes).forEach(function (prototypeGroup) {
        Object.keys(prototypes[prototypeGroup]).forEach(function (protoMethod) {
          if (!Swiper.prototype[protoMethod]) {
            Swiper.prototype[protoMethod] = prototypes[prototypeGroup][protoMethod];
          }
        });
      });

      if (typeof swiper.modules === 'undefined') {
        swiper.modules = {};
      }

      Object.keys(swiper.modules).forEach(function (moduleName) {
        var module = swiper.modules[moduleName];

        if (module.params) {
          var moduleParamName = Object.keys(module.params)[0];
          var moduleParams = module.params[moduleParamName];
          if (typeof moduleParams !== 'object' || moduleParams === null) return;
          if (!(moduleParamName in params && 'enabled' in moduleParams)) return;

          if (params[moduleParamName] === true) {
            params[moduleParamName] = {
              enabled: true
            };
          }

          if (typeof params[moduleParamName] === 'object' && !('enabled' in params[moduleParamName])) {
            params[moduleParamName].enabled = true;
          }

          if (!params[moduleParamName]) params[moduleParamName] = {
            enabled: false
          };
        }
      }); // Extend defaults with modules params

      var swiperParams = extend$1({}, defaults);
      swiper.useParams(swiperParams); // Extend defaults with passed params

      swiper.params = extend$1({}, swiperParams, extendedDefaults, params);
      swiper.originalParams = extend$1({}, swiper.params);
      swiper.passedParams = extend$1({}, params); // add event listeners

      if (swiper.params && swiper.params.on) {
        Object.keys(swiper.params.on).forEach(function (eventName) {
          swiper.on(eventName, swiper.params.on[eventName]);
        });
      } // Save Dom lib


      swiper.$ = $; // Find el

      var $el = $(swiper.params.el);
      el = $el[0];

      if (!el) {
        return undefined;
      }

      if ($el.length > 1) {
        var swipers = [];
        $el.each(function (containerEl) {
          var newParams = extend$1({}, params, {
            el: containerEl
          });
          swipers.push(new Swiper(newParams));
        });
        return swipers;
      }

      el.swiper = swiper; // Find Wrapper

      var $wrapperEl;

      if (el && el.shadowRoot && el.shadowRoot.querySelector) {
        $wrapperEl = $(el.shadowRoot.querySelector("." + swiper.params.wrapperClass)); // Children needs to return slot items

        $wrapperEl.children = function (options) {
          return $el.children(options);
        };
      } else {
        $wrapperEl = $el.children("." + swiper.params.wrapperClass);
      } // Extend Swiper


      extend$1(swiper, {
        $el: $el,
        el: el,
        $wrapperEl: $wrapperEl,
        wrapperEl: $wrapperEl[0],
        // Classes
        classNames: [],
        // Slides
        slides: $(),
        slidesGrid: [],
        snapGrid: [],
        slidesSizesGrid: [],
        // isDirection
        isHorizontal: function isHorizontal() {
          return swiper.params.direction === 'horizontal';
        },
        isVertical: function isVertical() {
          return swiper.params.direction === 'vertical';
        },
        // RTL
        rtl: el.dir.toLowerCase() === 'rtl' || $el.css('direction') === 'rtl',
        rtlTranslate: swiper.params.direction === 'horizontal' && (el.dir.toLowerCase() === 'rtl' || $el.css('direction') === 'rtl'),
        wrongRTL: $wrapperEl.css('display') === '-webkit-box',
        // Indexes
        activeIndex: 0,
        realIndex: 0,
        //
        isBeginning: true,
        isEnd: false,
        // Props
        translate: 0,
        previousTranslate: 0,
        progress: 0,
        velocity: 0,
        animating: false,
        // Locks
        allowSlideNext: swiper.params.allowSlideNext,
        allowSlidePrev: swiper.params.allowSlidePrev,
        // Touch Events
        touchEvents: function touchEvents() {
          var touch = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
          var desktop = ['mousedown', 'mousemove', 'mouseup'];

          if (swiper.support.pointerEvents) {
            desktop = ['pointerdown', 'pointermove', 'pointerup'];
          }

          swiper.touchEventsTouch = {
            start: touch[0],
            move: touch[1],
            end: touch[2],
            cancel: touch[3]
          };
          swiper.touchEventsDesktop = {
            start: desktop[0],
            move: desktop[1],
            end: desktop[2]
          };
          return swiper.support.touch || !swiper.params.simulateTouch ? swiper.touchEventsTouch : swiper.touchEventsDesktop;
        }(),
        touchEventsData: {
          isTouched: undefined,
          isMoved: undefined,
          allowTouchCallbacks: undefined,
          touchStartTime: undefined,
          isScrolling: undefined,
          currentTranslate: undefined,
          startTranslate: undefined,
          allowThresholdMove: undefined,
          // Form elements to match
          formElements: 'input, select, option, textarea, button, video, label',
          // Last click time
          lastClickTime: now(),
          clickTimeout: undefined,
          // Velocities
          velocities: [],
          allowMomentumBounce: undefined,
          isTouchEvent: undefined,
          startMoving: undefined
        },
        // Clicks
        allowClick: true,
        // Touches
        allowTouchMove: swiper.params.allowTouchMove,
        touches: {
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0,
          diff: 0
        },
        // Images
        imagesToLoad: [],
        imagesLoaded: 0
      }); // Install Modules

      swiper.useModules();
      swiper.emit('_swiper'); // Init

      if (swiper.params.init) {
        swiper.init();
      } // Return app instance


      return swiper;
    }

    var _proto = Swiper.prototype;

    _proto.emitContainerClasses = function emitContainerClasses() {
      var swiper = this;
      if (!swiper.params._emitClasses || !swiper.el) return;
      var classes = swiper.el.className.split(' ').filter(function (className) {
        return className.indexOf('swiper-container') === 0 || className.indexOf(swiper.params.containerModifierClass) === 0;
      });
      swiper.emit('_containerClasses', classes.join(' '));
    };

    _proto.emitSlidesClasses = function emitSlidesClasses() {
      var swiper = this;
      if (!swiper.params._emitClasses || !swiper.el) return;
      swiper.slides.each(function (slideEl) {
        var classes = slideEl.className.split(' ').filter(function (className) {
          return className.indexOf('swiper-slide') === 0 || className.indexOf(swiper.params.slideClass) === 0;
        });
        swiper.emit('_slideClass', slideEl, classes.join(' '));
      });
    };

    _proto.slidesPerViewDynamic = function slidesPerViewDynamic() {
      var swiper = this;
      var params = swiper.params,
          slides = swiper.slides,
          slidesGrid = swiper.slidesGrid,
          swiperSize = swiper.size,
          activeIndex = swiper.activeIndex;
      var spv = 1;

      if (params.centeredSlides) {
        var slideSize = slides[activeIndex].swiperSlideSize;
        var breakLoop;

        for (var i = activeIndex + 1; i < slides.length; i += 1) {
          if (slides[i] && !breakLoop) {
            slideSize += slides[i].swiperSlideSize;
            spv += 1;
            if (slideSize > swiperSize) breakLoop = true;
          }
        }

        for (var _i = activeIndex - 1; _i >= 0; _i -= 1) {
          if (slides[_i] && !breakLoop) {
            slideSize += slides[_i].swiperSlideSize;
            spv += 1;
            if (slideSize > swiperSize) breakLoop = true;
          }
        }
      } else {
        for (var _i2 = activeIndex + 1; _i2 < slides.length; _i2 += 1) {
          if (slidesGrid[_i2] - slidesGrid[activeIndex] < swiperSize) {
            spv += 1;
          }
        }
      }

      return spv;
    };

    _proto.update = function update() {
      var swiper = this;
      if (!swiper || swiper.destroyed) return;
      var snapGrid = swiper.snapGrid,
          params = swiper.params; // Breakpoints

      if (params.breakpoints) {
        swiper.setBreakpoint();
      }

      swiper.updateSize();
      swiper.updateSlides();
      swiper.updateProgress();
      swiper.updateSlidesClasses();

      function setTranslate() {
        var translateValue = swiper.rtlTranslate ? swiper.translate * -1 : swiper.translate;
        var newTranslate = Math.min(Math.max(translateValue, swiper.maxTranslate()), swiper.minTranslate());
        swiper.setTranslate(newTranslate);
        swiper.updateActiveIndex();
        swiper.updateSlidesClasses();
      }

      var translated;

      if (swiper.params.freeMode) {
        setTranslate();

        if (swiper.params.autoHeight) {
          swiper.updateAutoHeight();
        }
      } else {
        if ((swiper.params.slidesPerView === 'auto' || swiper.params.slidesPerView > 1) && swiper.isEnd && !swiper.params.centeredSlides) {
          translated = swiper.slideTo(swiper.slides.length - 1, 0, false, true);
        } else {
          translated = swiper.slideTo(swiper.activeIndex, 0, false, true);
        }

        if (!translated) {
          setTranslate();
        }
      }

      if (params.watchOverflow && snapGrid !== swiper.snapGrid) {
        swiper.checkOverflow();
      }

      swiper.emit('update');
    };

    _proto.changeDirection = function changeDirection(newDirection, needUpdate) {
      if (needUpdate === void 0) {
        needUpdate = true;
      }

      var swiper = this;
      var currentDirection = swiper.params.direction;

      if (!newDirection) {
        // eslint-disable-next-line
        newDirection = currentDirection === 'horizontal' ? 'vertical' : 'horizontal';
      }

      if (newDirection === currentDirection || newDirection !== 'horizontal' && newDirection !== 'vertical') {
        return swiper;
      }

      swiper.$el.removeClass("" + swiper.params.containerModifierClass + currentDirection).addClass("" + swiper.params.containerModifierClass + newDirection);
      swiper.emitContainerClasses();
      swiper.params.direction = newDirection;
      swiper.slides.each(function (slideEl) {
        if (newDirection === 'vertical') {
          slideEl.style.width = '';
        } else {
          slideEl.style.height = '';
        }
      });
      swiper.emit('changeDirection');
      if (needUpdate) swiper.update();
      return swiper;
    };

    _proto.init = function init() {
      var swiper = this;
      if (swiper.initialized) return;
      swiper.emit('beforeInit'); // Set breakpoint

      if (swiper.params.breakpoints) {
        swiper.setBreakpoint();
      } // Add Classes


      swiper.addClasses(); // Create loop

      if (swiper.params.loop) {
        swiper.loopCreate();
      } // Update size


      swiper.updateSize(); // Update slides

      swiper.updateSlides();

      if (swiper.params.watchOverflow) {
        swiper.checkOverflow();
      } // Set Grab Cursor


      if (swiper.params.grabCursor) {
        swiper.setGrabCursor();
      }

      if (swiper.params.preloadImages) {
        swiper.preloadImages();
      } // Slide To Initial Slide


      if (swiper.params.loop) {
        swiper.slideTo(swiper.params.initialSlide + swiper.loopedSlides, 0, swiper.params.runCallbacksOnInit);
      } else {
        swiper.slideTo(swiper.params.initialSlide, 0, swiper.params.runCallbacksOnInit);
      } // Attach events


      swiper.attachEvents(); // Init Flag

      swiper.initialized = true; // Emit

      swiper.emit('init');
    };

    _proto.destroy = function destroy(deleteInstance, cleanStyles) {
      if (deleteInstance === void 0) {
        deleteInstance = true;
      }

      if (cleanStyles === void 0) {
        cleanStyles = true;
      }

      var swiper = this;
      var params = swiper.params,
          $el = swiper.$el,
          $wrapperEl = swiper.$wrapperEl,
          slides = swiper.slides;

      if (typeof swiper.params === 'undefined' || swiper.destroyed) {
        return null;
      }

      swiper.emit('beforeDestroy'); // Init Flag

      swiper.initialized = false; // Detach events

      swiper.detachEvents(); // Destroy loop

      if (params.loop) {
        swiper.loopDestroy();
      } // Cleanup styles


      if (cleanStyles) {
        swiper.removeClasses();
        $el.removeAttr('style');
        $wrapperEl.removeAttr('style');

        if (slides && slides.length) {
          slides.removeClass([params.slideVisibleClass, params.slideActiveClass, params.slideNextClass, params.slidePrevClass].join(' ')).removeAttr('style').removeAttr('data-swiper-slide-index');
        }
      }

      swiper.emit('destroy'); // Detach emitter events

      Object.keys(swiper.eventsListeners).forEach(function (eventName) {
        swiper.off(eventName);
      });

      if (deleteInstance !== false) {
        swiper.$el[0].swiper = null;
        deleteProps(swiper);
      }

      swiper.destroyed = true;
      return null;
    };

    Swiper.extendDefaults = function extendDefaults(newDefaults) {
      extend$1(extendedDefaults, newDefaults);
    };

    Swiper.installModule = function installModule(module) {
      if (!Swiper.prototype.modules) Swiper.prototype.modules = {};
      var name = module.name || Object.keys(Swiper.prototype.modules).length + "_" + now();
      Swiper.prototype.modules[name] = module;
    };

    Swiper.use = function use(module) {
      if (Array.isArray(module)) {
        module.forEach(function (m) {
          return Swiper.installModule(m);
        });
        return Swiper;
      }

      Swiper.installModule(module);
      return Swiper;
    };

    _createClass$1(Swiper, null, [{
      key: "extendedDefaults",
      get: function get() {
        return extendedDefaults;
      }
    }, {
      key: "defaults",
      get: function get() {
        return defaults;
      }
    }]);

    return Swiper;
  }();

  Swiper.use([Resize, Observer$1]);

  function _extends$1() { _extends$1 = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$1.apply(this, arguments); }
  var Navigation = {
    update: function update() {
      // Update Navigation Buttons
      var swiper = this;
      var params = swiper.params.navigation;
      if (swiper.params.loop) return;
      var _swiper$navigation = swiper.navigation,
          $nextEl = _swiper$navigation.$nextEl,
          $prevEl = _swiper$navigation.$prevEl;

      if ($prevEl && $prevEl.length > 0) {
        if (swiper.isBeginning) {
          $prevEl.addClass(params.disabledClass);
        } else {
          $prevEl.removeClass(params.disabledClass);
        }

        $prevEl[swiper.params.watchOverflow && swiper.isLocked ? 'addClass' : 'removeClass'](params.lockClass);
      }

      if ($nextEl && $nextEl.length > 0) {
        if (swiper.isEnd) {
          $nextEl.addClass(params.disabledClass);
        } else {
          $nextEl.removeClass(params.disabledClass);
        }

        $nextEl[swiper.params.watchOverflow && swiper.isLocked ? 'addClass' : 'removeClass'](params.lockClass);
      }
    },
    onPrevClick: function onPrevClick(e) {
      var swiper = this;
      e.preventDefault();
      if (swiper.isBeginning && !swiper.params.loop) return;
      swiper.slidePrev();
    },
    onNextClick: function onNextClick(e) {
      var swiper = this;
      e.preventDefault();
      if (swiper.isEnd && !swiper.params.loop) return;
      swiper.slideNext();
    },
    init: function init() {
      var swiper = this;
      var params = swiper.params.navigation;
      if (!(params.nextEl || params.prevEl)) return;
      var $nextEl;
      var $prevEl;

      if (params.nextEl) {
        $nextEl = $(params.nextEl);

        if (swiper.params.uniqueNavElements && typeof params.nextEl === 'string' && $nextEl.length > 1 && swiper.$el.find(params.nextEl).length === 1) {
          $nextEl = swiper.$el.find(params.nextEl);
        }
      }

      if (params.prevEl) {
        $prevEl = $(params.prevEl);

        if (swiper.params.uniqueNavElements && typeof params.prevEl === 'string' && $prevEl.length > 1 && swiper.$el.find(params.prevEl).length === 1) {
          $prevEl = swiper.$el.find(params.prevEl);
        }
      }

      if ($nextEl && $nextEl.length > 0) {
        $nextEl.on('click', swiper.navigation.onNextClick);
      }

      if ($prevEl && $prevEl.length > 0) {
        $prevEl.on('click', swiper.navigation.onPrevClick);
      }

      extend$1(swiper.navigation, {
        $nextEl: $nextEl,
        nextEl: $nextEl && $nextEl[0],
        $prevEl: $prevEl,
        prevEl: $prevEl && $prevEl[0]
      });
    },
    destroy: function destroy() {
      var swiper = this;
      var _swiper$navigation2 = swiper.navigation,
          $nextEl = _swiper$navigation2.$nextEl,
          $prevEl = _swiper$navigation2.$prevEl;

      if ($nextEl && $nextEl.length) {
        $nextEl.off('click', swiper.navigation.onNextClick);
        $nextEl.removeClass(swiper.params.navigation.disabledClass);
      }

      if ($prevEl && $prevEl.length) {
        $prevEl.off('click', swiper.navigation.onPrevClick);
        $prevEl.removeClass(swiper.params.navigation.disabledClass);
      }
    }
  };
  var Navigation$1 = {
    name: 'navigation',
    params: {
      navigation: {
        nextEl: null,
        prevEl: null,
        hideOnClick: false,
        disabledClass: 'swiper-button-disabled',
        hiddenClass: 'swiper-button-hidden',
        lockClass: 'swiper-button-lock'
      }
    },
    create: function create() {
      var swiper = this;
      bindModuleMethods(swiper, {
        navigation: _extends$1({}, Navigation)
      });
    },
    on: {
      init: function init(swiper) {
        swiper.navigation.init();
        swiper.navigation.update();
      },
      toEdge: function toEdge(swiper) {
        swiper.navigation.update();
      },
      fromEdge: function fromEdge(swiper) {
        swiper.navigation.update();
      },
      destroy: function destroy(swiper) {
        swiper.navigation.destroy();
      },
      click: function click(swiper, e) {
        var _swiper$navigation3 = swiper.navigation,
            $nextEl = _swiper$navigation3.$nextEl,
            $prevEl = _swiper$navigation3.$prevEl;

        if (swiper.params.navigation.hideOnClick && !$(e.target).is($prevEl) && !$(e.target).is($nextEl)) {
          var isHidden;

          if ($nextEl) {
            isHidden = $nextEl.hasClass(swiper.params.navigation.hiddenClass);
          } else if ($prevEl) {
            isHidden = $prevEl.hasClass(swiper.params.navigation.hiddenClass);
          }

          if (isHidden === true) {
            swiper.emit('navigationShow');
          } else {
            swiper.emit('navigationHide');
          }

          if ($nextEl) {
            $nextEl.toggleClass(swiper.params.navigation.hiddenClass);
          }

          if ($prevEl) {
            $prevEl.toggleClass(swiper.params.navigation.hiddenClass);
          }
        }
      }
    }
  };

  function _extends$2() { _extends$2 = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$2.apply(this, arguments); }
  var Pagination = {
    update: function update() {
      // Render || Update Pagination bullets/items
      var swiper = this;
      var rtl = swiper.rtl;
      var params = swiper.params.pagination;
      if (!params.el || !swiper.pagination.el || !swiper.pagination.$el || swiper.pagination.$el.length === 0) return;
      var slidesLength = swiper.virtual && swiper.params.virtual.enabled ? swiper.virtual.slides.length : swiper.slides.length;
      var $el = swiper.pagination.$el; // Current/Total

      var current;
      var total = swiper.params.loop ? Math.ceil((slidesLength - swiper.loopedSlides * 2) / swiper.params.slidesPerGroup) : swiper.snapGrid.length;

      if (swiper.params.loop) {
        current = Math.ceil((swiper.activeIndex - swiper.loopedSlides) / swiper.params.slidesPerGroup);

        if (current > slidesLength - 1 - swiper.loopedSlides * 2) {
          current -= slidesLength - swiper.loopedSlides * 2;
        }

        if (current > total - 1) current -= total;
        if (current < 0 && swiper.params.paginationType !== 'bullets') current = total + current;
      } else if (typeof swiper.snapIndex !== 'undefined') {
        current = swiper.snapIndex;
      } else {
        current = swiper.activeIndex || 0;
      } // Types


      if (params.type === 'bullets' && swiper.pagination.bullets && swiper.pagination.bullets.length > 0) {
        var bullets = swiper.pagination.bullets;
        var firstIndex;
        var lastIndex;
        var midIndex;

        if (params.dynamicBullets) {
          swiper.pagination.bulletSize = bullets.eq(0)[swiper.isHorizontal() ? 'outerWidth' : 'outerHeight'](true);
          $el.css(swiper.isHorizontal() ? 'width' : 'height', swiper.pagination.bulletSize * (params.dynamicMainBullets + 4) + "px");

          if (params.dynamicMainBullets > 1 && swiper.previousIndex !== undefined) {
            swiper.pagination.dynamicBulletIndex += current - swiper.previousIndex;

            if (swiper.pagination.dynamicBulletIndex > params.dynamicMainBullets - 1) {
              swiper.pagination.dynamicBulletIndex = params.dynamicMainBullets - 1;
            } else if (swiper.pagination.dynamicBulletIndex < 0) {
              swiper.pagination.dynamicBulletIndex = 0;
            }
          }

          firstIndex = current - swiper.pagination.dynamicBulletIndex;
          lastIndex = firstIndex + (Math.min(bullets.length, params.dynamicMainBullets) - 1);
          midIndex = (lastIndex + firstIndex) / 2;
        }

        bullets.removeClass(params.bulletActiveClass + " " + params.bulletActiveClass + "-next " + params.bulletActiveClass + "-next-next " + params.bulletActiveClass + "-prev " + params.bulletActiveClass + "-prev-prev " + params.bulletActiveClass + "-main");

        if ($el.length > 1) {
          bullets.each(function (bullet) {
            var $bullet = $(bullet);
            var bulletIndex = $bullet.index();

            if (bulletIndex === current) {
              $bullet.addClass(params.bulletActiveClass);
            }

            if (params.dynamicBullets) {
              if (bulletIndex >= firstIndex && bulletIndex <= lastIndex) {
                $bullet.addClass(params.bulletActiveClass + "-main");
              }

              if (bulletIndex === firstIndex) {
                $bullet.prev().addClass(params.bulletActiveClass + "-prev").prev().addClass(params.bulletActiveClass + "-prev-prev");
              }

              if (bulletIndex === lastIndex) {
                $bullet.next().addClass(params.bulletActiveClass + "-next").next().addClass(params.bulletActiveClass + "-next-next");
              }
            }
          });
        } else {
          var $bullet = bullets.eq(current);
          var bulletIndex = $bullet.index();
          $bullet.addClass(params.bulletActiveClass);

          if (params.dynamicBullets) {
            var $firstDisplayedBullet = bullets.eq(firstIndex);
            var $lastDisplayedBullet = bullets.eq(lastIndex);

            for (var i = firstIndex; i <= lastIndex; i += 1) {
              bullets.eq(i).addClass(params.bulletActiveClass + "-main");
            }

            if (swiper.params.loop) {
              if (bulletIndex >= bullets.length - params.dynamicMainBullets) {
                for (var _i = params.dynamicMainBullets; _i >= 0; _i -= 1) {
                  bullets.eq(bullets.length - _i).addClass(params.bulletActiveClass + "-main");
                }

                bullets.eq(bullets.length - params.dynamicMainBullets - 1).addClass(params.bulletActiveClass + "-prev");
              } else {
                $firstDisplayedBullet.prev().addClass(params.bulletActiveClass + "-prev").prev().addClass(params.bulletActiveClass + "-prev-prev");
                $lastDisplayedBullet.next().addClass(params.bulletActiveClass + "-next").next().addClass(params.bulletActiveClass + "-next-next");
              }
            } else {
              $firstDisplayedBullet.prev().addClass(params.bulletActiveClass + "-prev").prev().addClass(params.bulletActiveClass + "-prev-prev");
              $lastDisplayedBullet.next().addClass(params.bulletActiveClass + "-next").next().addClass(params.bulletActiveClass + "-next-next");
            }
          }
        }

        if (params.dynamicBullets) {
          var dynamicBulletsLength = Math.min(bullets.length, params.dynamicMainBullets + 4);
          var bulletsOffset = (swiper.pagination.bulletSize * dynamicBulletsLength - swiper.pagination.bulletSize) / 2 - midIndex * swiper.pagination.bulletSize;
          var offsetProp = rtl ? 'right' : 'left';
          bullets.css(swiper.isHorizontal() ? offsetProp : 'top', bulletsOffset + "px");
        }
      }

      if (params.type === 'fraction') {
        $el.find("." + params.currentClass).text(params.formatFractionCurrent(current + 1));
        $el.find("." + params.totalClass).text(params.formatFractionTotal(total));
      }

      if (params.type === 'progressbar') {
        var progressbarDirection;

        if (params.progressbarOpposite) {
          progressbarDirection = swiper.isHorizontal() ? 'vertical' : 'horizontal';
        } else {
          progressbarDirection = swiper.isHorizontal() ? 'horizontal' : 'vertical';
        }

        var scale = (current + 1) / total;
        var scaleX = 1;
        var scaleY = 1;

        if (progressbarDirection === 'horizontal') {
          scaleX = scale;
        } else {
          scaleY = scale;
        }

        $el.find("." + params.progressbarFillClass).transform("translate3d(0,0,0) scaleX(" + scaleX + ") scaleY(" + scaleY + ")").transition(swiper.params.speed);
      }

      if (params.type === 'custom' && params.renderCustom) {
        $el.html(params.renderCustom(swiper, current + 1, total));
        swiper.emit('paginationRender', $el[0]);
      } else {
        swiper.emit('paginationUpdate', $el[0]);
      }

      $el[swiper.params.watchOverflow && swiper.isLocked ? 'addClass' : 'removeClass'](params.lockClass);
    },
    render: function render() {
      // Render Container
      var swiper = this;
      var params = swiper.params.pagination;
      if (!params.el || !swiper.pagination.el || !swiper.pagination.$el || swiper.pagination.$el.length === 0) return;
      var slidesLength = swiper.virtual && swiper.params.virtual.enabled ? swiper.virtual.slides.length : swiper.slides.length;
      var $el = swiper.pagination.$el;
      var paginationHTML = '';

      if (params.type === 'bullets') {
        var numberOfBullets = swiper.params.loop ? Math.ceil((slidesLength - swiper.loopedSlides * 2) / swiper.params.slidesPerGroup) : swiper.snapGrid.length;

        for (var i = 0; i < numberOfBullets; i += 1) {
          if (params.renderBullet) {
            paginationHTML += params.renderBullet.call(swiper, i, params.bulletClass);
          } else {
            paginationHTML += "<" + params.bulletElement + " class=\"" + params.bulletClass + "\"></" + params.bulletElement + ">";
          }
        }

        $el.html(paginationHTML);
        swiper.pagination.bullets = $el.find("." + params.bulletClass);
      }

      if (params.type === 'fraction') {
        if (params.renderFraction) {
          paginationHTML = params.renderFraction.call(swiper, params.currentClass, params.totalClass);
        } else {
          paginationHTML = "<span class=\"" + params.currentClass + "\"></span>" + ' / ' + ("<span class=\"" + params.totalClass + "\"></span>");
        }

        $el.html(paginationHTML);
      }

      if (params.type === 'progressbar') {
        if (params.renderProgressbar) {
          paginationHTML = params.renderProgressbar.call(swiper, params.progressbarFillClass);
        } else {
          paginationHTML = "<span class=\"" + params.progressbarFillClass + "\"></span>";
        }

        $el.html(paginationHTML);
      }

      if (params.type !== 'custom') {
        swiper.emit('paginationRender', swiper.pagination.$el[0]);
      }
    },
    init: function init() {
      var swiper = this;
      var params = swiper.params.pagination;
      if (!params.el) return;
      var $el = $(params.el);
      if ($el.length === 0) return;

      if (swiper.params.uniqueNavElements && typeof params.el === 'string' && $el.length > 1) {
        $el = swiper.$el.find(params.el);
      }

      if (params.type === 'bullets' && params.clickable) {
        $el.addClass(params.clickableClass);
      }

      $el.addClass(params.modifierClass + params.type);

      if (params.type === 'bullets' && params.dynamicBullets) {
        $el.addClass("" + params.modifierClass + params.type + "-dynamic");
        swiper.pagination.dynamicBulletIndex = 0;

        if (params.dynamicMainBullets < 1) {
          params.dynamicMainBullets = 1;
        }
      }

      if (params.type === 'progressbar' && params.progressbarOpposite) {
        $el.addClass(params.progressbarOppositeClass);
      }

      if (params.clickable) {
        $el.on('click', "." + params.bulletClass, function onClick(e) {
          e.preventDefault();
          var index = $(this).index() * swiper.params.slidesPerGroup;
          if (swiper.params.loop) index += swiper.loopedSlides;
          swiper.slideTo(index);
        });
      }

      extend$1(swiper.pagination, {
        $el: $el,
        el: $el[0]
      });
    },
    destroy: function destroy() {
      var swiper = this;
      var params = swiper.params.pagination;
      if (!params.el || !swiper.pagination.el || !swiper.pagination.$el || swiper.pagination.$el.length === 0) return;
      var $el = swiper.pagination.$el;
      $el.removeClass(params.hiddenClass);
      $el.removeClass(params.modifierClass + params.type);
      if (swiper.pagination.bullets) swiper.pagination.bullets.removeClass(params.bulletActiveClass);

      if (params.clickable) {
        $el.off('click', "." + params.bulletClass);
      }
    }
  };
  var Pagination$1 = {
    name: 'pagination',
    params: {
      pagination: {
        el: null,
        bulletElement: 'span',
        clickable: false,
        hideOnClick: false,
        renderBullet: null,
        renderProgressbar: null,
        renderFraction: null,
        renderCustom: null,
        progressbarOpposite: false,
        type: 'bullets',
        // 'bullets' or 'progressbar' or 'fraction' or 'custom'
        dynamicBullets: false,
        dynamicMainBullets: 1,
        formatFractionCurrent: function formatFractionCurrent(number) {
          return number;
        },
        formatFractionTotal: function formatFractionTotal(number) {
          return number;
        },
        bulletClass: 'swiper-pagination-bullet',
        bulletActiveClass: 'swiper-pagination-bullet-active',
        modifierClass: 'swiper-pagination-',
        // NEW
        currentClass: 'swiper-pagination-current',
        totalClass: 'swiper-pagination-total',
        hiddenClass: 'swiper-pagination-hidden',
        progressbarFillClass: 'swiper-pagination-progressbar-fill',
        progressbarOppositeClass: 'swiper-pagination-progressbar-opposite',
        clickableClass: 'swiper-pagination-clickable',
        // NEW
        lockClass: 'swiper-pagination-lock'
      }
    },
    create: function create() {
      var swiper = this;
      bindModuleMethods(swiper, {
        pagination: _extends$2({
          dynamicBulletIndex: 0
        }, Pagination)
      });
    },
    on: {
      init: function init(swiper) {
        swiper.pagination.init();
        swiper.pagination.render();
        swiper.pagination.update();
      },
      activeIndexChange: function activeIndexChange(swiper) {
        if (swiper.params.loop) {
          swiper.pagination.update();
        } else if (typeof swiper.snapIndex === 'undefined') {
          swiper.pagination.update();
        }
      },
      snapIndexChange: function snapIndexChange(swiper) {
        if (!swiper.params.loop) {
          swiper.pagination.update();
        }
      },
      slidesLengthChange: function slidesLengthChange(swiper) {
        if (swiper.params.loop) {
          swiper.pagination.render();
          swiper.pagination.update();
        }
      },
      snapGridLengthChange: function snapGridLengthChange(swiper) {
        if (!swiper.params.loop) {
          swiper.pagination.render();
          swiper.pagination.update();
        }
      },
      destroy: function destroy(swiper) {
        swiper.pagination.destroy();
      },
      click: function click(swiper, e) {
        if (swiper.params.pagination.el && swiper.params.pagination.hideOnClick && swiper.pagination.$el.length > 0 && !$(e.target).hasClass(swiper.params.pagination.bulletClass)) {
          var isHidden = swiper.pagination.$el.hasClass(swiper.params.pagination.hiddenClass);

          if (isHidden === true) {
            swiper.emit('paginationShow');
          } else {
            swiper.emit('paginationHide');
          }

          swiper.pagination.$el.toggleClass(swiper.params.pagination.hiddenClass);
        }
      }
    }
  };

  function _extends$3() { _extends$3 = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$3.apply(this, arguments); }
  var Autoplay = {
    run: function run() {
      var swiper = this;
      var $activeSlideEl = swiper.slides.eq(swiper.activeIndex);
      var delay = swiper.params.autoplay.delay;

      if ($activeSlideEl.attr('data-swiper-autoplay')) {
        delay = $activeSlideEl.attr('data-swiper-autoplay') || swiper.params.autoplay.delay;
      }

      clearTimeout(swiper.autoplay.timeout);
      swiper.autoplay.timeout = nextTick(function () {
        if (swiper.params.autoplay.reverseDirection) {
          if (swiper.params.loop) {
            swiper.loopFix();
            swiper.slidePrev(swiper.params.speed, true, true);
            swiper.emit('autoplay');
          } else if (!swiper.isBeginning) {
            swiper.slidePrev(swiper.params.speed, true, true);
            swiper.emit('autoplay');
          } else if (!swiper.params.autoplay.stopOnLastSlide) {
            swiper.slideTo(swiper.slides.length - 1, swiper.params.speed, true, true);
            swiper.emit('autoplay');
          } else {
            swiper.autoplay.stop();
          }
        } else if (swiper.params.loop) {
          swiper.loopFix();
          swiper.slideNext(swiper.params.speed, true, true);
          swiper.emit('autoplay');
        } else if (!swiper.isEnd) {
          swiper.slideNext(swiper.params.speed, true, true);
          swiper.emit('autoplay');
        } else if (!swiper.params.autoplay.stopOnLastSlide) {
          swiper.slideTo(0, swiper.params.speed, true, true);
          swiper.emit('autoplay');
        } else {
          swiper.autoplay.stop();
        }

        if (swiper.params.cssMode && swiper.autoplay.running) swiper.autoplay.run();
      }, delay);
    },
    start: function start() {
      var swiper = this;
      if (typeof swiper.autoplay.timeout !== 'undefined') return false;
      if (swiper.autoplay.running) return false;
      swiper.autoplay.running = true;
      swiper.emit('autoplayStart');
      swiper.autoplay.run();
      return true;
    },
    stop: function stop() {
      var swiper = this;
      if (!swiper.autoplay.running) return false;
      if (typeof swiper.autoplay.timeout === 'undefined') return false;

      if (swiper.autoplay.timeout) {
        clearTimeout(swiper.autoplay.timeout);
        swiper.autoplay.timeout = undefined;
      }

      swiper.autoplay.running = false;
      swiper.emit('autoplayStop');
      return true;
    },
    pause: function pause(speed) {
      var swiper = this;
      if (!swiper.autoplay.running) return;
      if (swiper.autoplay.paused) return;
      if (swiper.autoplay.timeout) clearTimeout(swiper.autoplay.timeout);
      swiper.autoplay.paused = true;

      if (speed === 0 || !swiper.params.autoplay.waitForTransition) {
        swiper.autoplay.paused = false;
        swiper.autoplay.run();
      } else {
        swiper.$wrapperEl[0].addEventListener('transitionend', swiper.autoplay.onTransitionEnd);
        swiper.$wrapperEl[0].addEventListener('webkitTransitionEnd', swiper.autoplay.onTransitionEnd);
      }
    },
    onVisibilityChange: function onVisibilityChange() {
      var swiper = this;
      var document = getDocument();

      if (document.visibilityState === 'hidden' && swiper.autoplay.running) {
        swiper.autoplay.pause();
      }

      if (document.visibilityState === 'visible' && swiper.autoplay.paused) {
        swiper.autoplay.run();
        swiper.autoplay.paused = false;
      }
    },
    onTransitionEnd: function onTransitionEnd(e) {
      var swiper = this;
      if (!swiper || swiper.destroyed || !swiper.$wrapperEl) return;
      if (e.target !== swiper.$wrapperEl[0]) return;
      swiper.$wrapperEl[0].removeEventListener('transitionend', swiper.autoplay.onTransitionEnd);
      swiper.$wrapperEl[0].removeEventListener('webkitTransitionEnd', swiper.autoplay.onTransitionEnd);
      swiper.autoplay.paused = false;

      if (!swiper.autoplay.running) {
        swiper.autoplay.stop();
      } else {
        swiper.autoplay.run();
      }
    }
  };
  var Autoplay$1 = {
    name: 'autoplay',
    params: {
      autoplay: {
        enabled: false,
        delay: 3000,
        waitForTransition: true,
        disableOnInteraction: true,
        stopOnLastSlide: false,
        reverseDirection: false
      }
    },
    create: function create() {
      var swiper = this;
      bindModuleMethods(swiper, {
        autoplay: _extends$3(_extends$3({}, Autoplay), {}, {
          running: false,
          paused: false
        })
      });
    },
    on: {
      init: function init(swiper) {
        if (swiper.params.autoplay.enabled) {
          swiper.autoplay.start();
          var document = getDocument();
          document.addEventListener('visibilitychange', swiper.autoplay.onVisibilityChange);
        }
      },
      beforeTransitionStart: function beforeTransitionStart(swiper, speed, internal) {
        if (swiper.autoplay.running) {
          if (internal || !swiper.params.autoplay.disableOnInteraction) {
            swiper.autoplay.pause(speed);
          } else {
            swiper.autoplay.stop();
          }
        }
      },
      sliderFirstMove: function sliderFirstMove(swiper) {
        if (swiper.autoplay.running) {
          if (swiper.params.autoplay.disableOnInteraction) {
            swiper.autoplay.stop();
          } else {
            swiper.autoplay.pause();
          }
        }
      },
      touchEnd: function touchEnd(swiper) {
        if (swiper.params.cssMode && swiper.autoplay.paused && !swiper.params.autoplay.disableOnInteraction) {
          swiper.autoplay.run();
        }
      },
      destroy: function destroy(swiper) {
        if (swiper.autoplay.running) {
          swiper.autoplay.stop();
        }

        var document = getDocument();
        document.removeEventListener('visibilitychange', swiper.autoplay.onVisibilityChange);
      }
    }
  };

  function _extends$4() { _extends$4 = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$4.apply(this, arguments); }
  var Fade = {
    setTranslate: function setTranslate() {
      var swiper = this;
      var slides = swiper.slides;

      for (var i = 0; i < slides.length; i += 1) {
        var $slideEl = swiper.slides.eq(i);
        var offset = $slideEl[0].swiperSlideOffset;
        var tx = -offset;
        if (!swiper.params.virtualTranslate) tx -= swiper.translate;
        var ty = 0;

        if (!swiper.isHorizontal()) {
          ty = tx;
          tx = 0;
        }

        var slideOpacity = swiper.params.fadeEffect.crossFade ? Math.max(1 - Math.abs($slideEl[0].progress), 0) : 1 + Math.min(Math.max($slideEl[0].progress, -1), 0);
        $slideEl.css({
          opacity: slideOpacity
        }).transform("translate3d(" + tx + "px, " + ty + "px, 0px)");
      }
    },
    setTransition: function setTransition(duration) {
      var swiper = this;
      var slides = swiper.slides,
          $wrapperEl = swiper.$wrapperEl;
      slides.transition(duration);

      if (swiper.params.virtualTranslate && duration !== 0) {
        var eventTriggered = false;
        slides.transitionEnd(function () {
          if (eventTriggered) return;
          if (!swiper || swiper.destroyed) return;
          eventTriggered = true;
          swiper.animating = false;
          var triggerEvents = ['webkitTransitionEnd', 'transitionend'];

          for (var i = 0; i < triggerEvents.length; i += 1) {
            $wrapperEl.trigger(triggerEvents[i]);
          }
        });
      }
    }
  };
  var EffectFade = {
    name: 'effect-fade',
    params: {
      fadeEffect: {
        crossFade: false
      }
    },
    create: function create() {
      var swiper = this;
      bindModuleMethods(swiper, {
        fadeEffect: _extends$4({}, Fade)
      });
    },
    on: {
      beforeInit: function beforeInit(swiper) {
        if (swiper.params.effect !== 'fade') return;
        swiper.classNames.push(swiper.params.containerModifierClass + "fade");
        var overwriteParams = {
          slidesPerView: 1,
          slidesPerColumn: 1,
          slidesPerGroup: 1,
          watchSlidesProgress: true,
          spaceBetween: 0,
          virtualTranslate: true
        };
        extend$1(swiper.params, overwriteParams);
        extend$1(swiper.originalParams, overwriteParams);
      },
      setTranslate: function setTranslate(swiper) {
        if (swiper.params.effect !== 'fade') return;
        swiper.fadeEffect.setTranslate();
      },
      setTransition: function setTransition(swiper, duration) {
        if (swiper.params.effect !== 'fade') return;
        swiper.fadeEffect.setTransition(duration);
      }
    }
  };

  Swiper.use([Navigation$1]);

  function CardLayoutCarousel() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      /*selector: '.CardLayoutCarousel-contentPanel'*/
    },
        el = _ref.el;

    var transitionSpeed = 300;
    var swiperTarget = el.getAttribute('id');
    var leftButtonEl = document.getElementById('control-left-' + swiperTarget);
    var rightButtonEl = document.getElementById('control-right-' + swiperTarget);
    var cardsSwiper = new Swiper(el, {
      effect: 'slide',
      speed: transitionSpeed,
      slidesPerView: 'auto',
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      watchOverflow: true,
      loop: false,
      navigation: {
        nextEl: rightButtonEl,
        prevEl: leftButtonEl
      }
    });
    revealElements();
    rightButtonEl.addEventListener('click', function (e) {
      var container = e.currentTarget.parentElement.parentElement;

      if (e.currentTarget.classList.contains('swiper-button-disabled')) {
        container.querySelectorAll('.swiper-slide-visible').forEach(function (element) {
          element.classList.add('last-visible');
        });
      } else {
        container.querySelectorAll('.swiper-slide-visible').forEach(function (element) {
          element.classList.remove('last-visible');
        });
      }
    });
    leftButtonEl.addEventListener('click', function (e) {
      var container = e.currentTarget.parentElement.parentElement;
      var lastVisibles = container.querySelectorAll('.last-visible');

      if (lastVisibles) {
        lastVisibles.forEach(function (element) {
          element.classList.remove('last-visible');
        });
      }
    });
    return {
      destroy: function destroy() {
        cardsSwiper.detachEvents();
        cardsSwiper.destroy();
      }
    };
  }

  CardLayoutCarousel.defaultSelector = '.CardLayoutCarousel .swiper-container';

  CardLayoutCarousel.initAll = function () {
    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref2$selector = _ref2.selector,
        selector = _ref2$selector === void 0 ? CardLayoutCarousel.defaultSelector : _ref2$selector;

    return _toConsumableArray(document.querySelectorAll(selector)).map(function (el) {
      return CardLayoutCarousel({
        el: el
      });
    });
  };

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, basedir, module) {
  	return module = {
  	  path: basedir,
  	  exports: {},
  	  require: function (path, base) {
        return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
      }
  	}, fn(module, module.exports), module.exports;
  }

  function commonjsRequire () {
  	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
  }

  var evEmitter = createCommonjsModule(function (module) {
  /**
   * EvEmitter v1.1.0
   * Lil' event emitter
   * MIT License
   */

  /* jshint unused: true, undef: true, strict: true */

  ( function( global, factory ) {
    // universal module definition
    /* jshint strict: false */ /* globals define, module, window */
    if (  module.exports ) {
      // CommonJS - Browserify, Webpack
      module.exports = factory();
    } else {
      // Browser globals
      global.EvEmitter = factory();
    }

  }( typeof window != 'undefined' ? window : commonjsGlobal, function() {

  function EvEmitter() {}

  var proto = EvEmitter.prototype;

  proto.on = function( eventName, listener ) {
    if ( !eventName || !listener ) {
      return;
    }
    // set events hash
    var events = this._events = this._events || {};
    // set listeners array
    var listeners = events[ eventName ] = events[ eventName ] || [];
    // only add once
    if ( listeners.indexOf( listener ) == -1 ) {
      listeners.push( listener );
    }

    return this;
  };

  proto.once = function( eventName, listener ) {
    if ( !eventName || !listener ) {
      return;
    }
    // add event
    this.on( eventName, listener );
    // set once flag
    // set onceEvents hash
    var onceEvents = this._onceEvents = this._onceEvents || {};
    // set onceListeners object
    var onceListeners = onceEvents[ eventName ] = onceEvents[ eventName ] || {};
    // set flag
    onceListeners[ listener ] = true;

    return this;
  };

  proto.off = function( eventName, listener ) {
    var listeners = this._events && this._events[ eventName ];
    if ( !listeners || !listeners.length ) {
      return;
    }
    var index = listeners.indexOf( listener );
    if ( index != -1 ) {
      listeners.splice( index, 1 );
    }

    return this;
  };

  proto.emitEvent = function( eventName, args ) {
    var listeners = this._events && this._events[ eventName ];
    if ( !listeners || !listeners.length ) {
      return;
    }
    // copy over to avoid interference if .off() in listener
    listeners = listeners.slice(0);
    args = args || [];
    // once stuff
    var onceListeners = this._onceEvents && this._onceEvents[ eventName ];

    for ( var i=0; i < listeners.length; i++ ) {
      var listener = listeners[i];
      var isOnce = onceListeners && onceListeners[ listener ];
      if ( isOnce ) {
        // remove listener
        // remove before trigger to prevent recursion
        this.off( eventName, listener );
        // unset once flag
        delete onceListeners[ listener ];
      }
      // trigger listener
      listener.apply( this, args );
    }

    return this;
  };

  proto.allOff = function() {
    delete this._events;
    delete this._onceEvents;
  };

  return EvEmitter;

  }));
  });

  var getSize = createCommonjsModule(function (module) {
  /*!
   * getSize v2.0.3
   * measure size of elements
   * MIT license
   */

  /* jshint browser: true, strict: true, undef: true, unused: true */
  /* globals console: false */

  ( function( window, factory ) {
    /* jshint strict: false */ /* globals define, module */
    if (  module.exports ) {
      // CommonJS
      module.exports = factory();
    } else {
      // browser global
      window.getSize = factory();
    }

  })( window, function factory() {

  // -------------------------- helpers -------------------------- //

  // get a number from a string, not a percentage
  function getStyleSize( value ) {
    var num = parseFloat( value );
    // not a percent like '100%', and a number
    var isValid = value.indexOf('%') == -1 && !isNaN( num );
    return isValid && num;
  }

  function noop() {}

  var logError = typeof console == 'undefined' ? noop :
    function( message ) {
      console.error( message );
    };

  // -------------------------- measurements -------------------------- //

  var measurements = [
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'paddingBottom',
    'marginLeft',
    'marginRight',
    'marginTop',
    'marginBottom',
    'borderLeftWidth',
    'borderRightWidth',
    'borderTopWidth',
    'borderBottomWidth'
  ];

  var measurementsLength = measurements.length;

  function getZeroSize() {
    var size = {
      width: 0,
      height: 0,
      innerWidth: 0,
      innerHeight: 0,
      outerWidth: 0,
      outerHeight: 0
    };
    for ( var i=0; i < measurementsLength; i++ ) {
      var measurement = measurements[i];
      size[ measurement ] = 0;
    }
    return size;
  }

  // -------------------------- getStyle -------------------------- //

  /**
   * getStyle, get style of element, check for Firefox bug
   * https://bugzilla.mozilla.org/show_bug.cgi?id=548397
   */
  function getStyle( elem ) {
    var style = getComputedStyle( elem );
    if ( !style ) {
      logError( 'Style returned ' + style +
        '. Are you running this code in a hidden iframe on Firefox? ' +
        'See https://bit.ly/getsizebug1' );
    }
    return style;
  }

  // -------------------------- setup -------------------------- //

  var isSetup = false;

  var isBoxSizeOuter;

  /**
   * setup
   * check isBoxSizerOuter
   * do on first getSize() rather than on page load for Firefox bug
   */
  function setup() {
    // setup once
    if ( isSetup ) {
      return;
    }
    isSetup = true;

    // -------------------------- box sizing -------------------------- //

    /**
     * Chrome & Safari measure the outer-width on style.width on border-box elems
     * IE11 & Firefox<29 measures the inner-width
     */
    var div = document.createElement('div');
    div.style.width = '200px';
    div.style.padding = '1px 2px 3px 4px';
    div.style.borderStyle = 'solid';
    div.style.borderWidth = '1px 2px 3px 4px';
    div.style.boxSizing = 'border-box';

    var body = document.body || document.documentElement;
    body.appendChild( div );
    var style = getStyle( div );
    // round value for browser zoom. desandro/masonry#928
    isBoxSizeOuter = Math.round( getStyleSize( style.width ) ) == 200;
    getSize.isBoxSizeOuter = isBoxSizeOuter;

    body.removeChild( div );
  }

  // -------------------------- getSize -------------------------- //

  function getSize( elem ) {
    setup();

    // use querySeletor if elem is string
    if ( typeof elem == 'string' ) {
      elem = document.querySelector( elem );
    }

    // do not proceed on non-objects
    if ( !elem || typeof elem != 'object' || !elem.nodeType ) {
      return;
    }

    var style = getStyle( elem );

    // if hidden, everything is 0
    if ( style.display == 'none' ) {
      return getZeroSize();
    }

    var size = {};
    size.width = elem.offsetWidth;
    size.height = elem.offsetHeight;

    var isBorderBox = size.isBorderBox = style.boxSizing == 'border-box';

    // get all measurements
    for ( var i=0; i < measurementsLength; i++ ) {
      var measurement = measurements[i];
      var value = style[ measurement ];
      var num = parseFloat( value );
      // any 'auto', 'medium' value will be 0
      size[ measurement ] = !isNaN( num ) ? num : 0;
    }

    var paddingWidth = size.paddingLeft + size.paddingRight;
    var paddingHeight = size.paddingTop + size.paddingBottom;
    var marginWidth = size.marginLeft + size.marginRight;
    var marginHeight = size.marginTop + size.marginBottom;
    var borderWidth = size.borderLeftWidth + size.borderRightWidth;
    var borderHeight = size.borderTopWidth + size.borderBottomWidth;

    var isBorderBoxSizeOuter = isBorderBox && isBoxSizeOuter;

    // overwrite width and height if we can get it from style
    var styleWidth = getStyleSize( style.width );
    if ( styleWidth !== false ) {
      size.width = styleWidth +
        // add padding and border unless it's already including it
        ( isBorderBoxSizeOuter ? 0 : paddingWidth + borderWidth );
    }

    var styleHeight = getStyleSize( style.height );
    if ( styleHeight !== false ) {
      size.height = styleHeight +
        // add padding and border unless it's already including it
        ( isBorderBoxSizeOuter ? 0 : paddingHeight + borderHeight );
    }

    size.innerWidth = size.width - ( paddingWidth + borderWidth );
    size.innerHeight = size.height - ( paddingHeight + borderHeight );

    size.outerWidth = size.width + marginWidth;
    size.outerHeight = size.height + marginHeight;

    return size;
  }

  return getSize;

  });
  });

  var matchesSelector = createCommonjsModule(function (module) {
  /**
   * matchesSelector v2.0.2
   * matchesSelector( element, '.selector' )
   * MIT license
   */

  /*jshint browser: true, strict: true, undef: true, unused: true */

  ( function( window, factory ) {
    // universal module definition
    if (  module.exports ) {
      // CommonJS
      module.exports = factory();
    } else {
      // browser global
      window.matchesSelector = factory();
    }

  }( window, function factory() {

    var matchesMethod = ( function() {
      var ElemProto = window.Element.prototype;
      // check for the standard method name first
      if ( ElemProto.matches ) {
        return 'matches';
      }
      // check un-prefixed
      if ( ElemProto.matchesSelector ) {
        return 'matchesSelector';
      }
      // check vendor prefixes
      var prefixes = [ 'webkit', 'moz', 'ms', 'o' ];

      for ( var i=0; i < prefixes.length; i++ ) {
        var prefix = prefixes[i];
        var method = prefix + 'MatchesSelector';
        if ( ElemProto[ method ] ) {
          return method;
        }
      }
    })();

    return function matchesSelector( elem, selector ) {
      return elem[ matchesMethod ]( selector );
    };

  }));
  });

  var utils = createCommonjsModule(function (module) {
  /**
   * Fizzy UI utils v2.0.7
   * MIT license
   */

  /*jshint browser: true, undef: true, unused: true, strict: true */

  ( function( window, factory ) {
    // universal module definition
    /*jshint strict: false */ /*globals define, module, require */

    if (  module.exports ) {
      // CommonJS
      module.exports = factory(
        window,
        matchesSelector
      );
    } else {
      // browser global
      window.fizzyUIUtils = factory(
        window,
        window.matchesSelector
      );
    }

  }( window, function factory( window, matchesSelector ) {

  var utils = {};

  // ----- extend ----- //

  // extends objects
  utils.extend = function( a, b ) {
    for ( var prop in b ) {
      a[ prop ] = b[ prop ];
    }
    return a;
  };

  // ----- modulo ----- //

  utils.modulo = function( num, div ) {
    return ( ( num % div ) + div ) % div;
  };

  // ----- makeArray ----- //

  var arraySlice = Array.prototype.slice;

  // turn element or nodeList into an array
  utils.makeArray = function( obj ) {
    if ( Array.isArray( obj ) ) {
      // use object if already an array
      return obj;
    }
    // return empty array if undefined or null. #6
    if ( obj === null || obj === undefined ) {
      return [];
    }

    var isArrayLike = typeof obj == 'object' && typeof obj.length == 'number';
    if ( isArrayLike ) {
      // convert nodeList to array
      return arraySlice.call( obj );
    }

    // array of single index
    return [ obj ];
  };

  // ----- removeFrom ----- //

  utils.removeFrom = function( ary, obj ) {
    var index = ary.indexOf( obj );
    if ( index != -1 ) {
      ary.splice( index, 1 );
    }
  };

  // ----- getParent ----- //

  utils.getParent = function( elem, selector ) {
    while ( elem.parentNode && elem != document.body ) {
      elem = elem.parentNode;
      if ( matchesSelector( elem, selector ) ) {
        return elem;
      }
    }
  };

  // ----- getQueryElement ----- //

  // use element as selector string
  utils.getQueryElement = function( elem ) {
    if ( typeof elem == 'string' ) {
      return document.querySelector( elem );
    }
    return elem;
  };

  // ----- handleEvent ----- //

  // enable .ontype to trigger from .addEventListener( elem, 'type' )
  utils.handleEvent = function( event ) {
    var method = 'on' + event.type;
    if ( this[ method ] ) {
      this[ method ]( event );
    }
  };

  // ----- filterFindElements ----- //

  utils.filterFindElements = function( elems, selector ) {
    // make array of elems
    elems = utils.makeArray( elems );
    var ffElems = [];

    elems.forEach( function( elem ) {
      // check that elem is an actual element
      if ( !( elem instanceof HTMLElement ) ) {
        return;
      }
      // add elem if no selector
      if ( !selector ) {
        ffElems.push( elem );
        return;
      }
      // filter & find items if we have a selector
      // filter
      if ( matchesSelector( elem, selector ) ) {
        ffElems.push( elem );
      }
      // find children
      var childElems = elem.querySelectorAll( selector );
      // concat childElems to filterFound array
      for ( var i=0; i < childElems.length; i++ ) {
        ffElems.push( childElems[i] );
      }
    });

    return ffElems;
  };

  // ----- debounceMethod ----- //

  utils.debounceMethod = function( _class, methodName, threshold ) {
    threshold = threshold || 100;
    // original method
    var method = _class.prototype[ methodName ];
    var timeoutName = methodName + 'Timeout';

    _class.prototype[ methodName ] = function() {
      var timeout = this[ timeoutName ];
      clearTimeout( timeout );

      var args = arguments;
      var _this = this;
      this[ timeoutName ] = setTimeout( function() {
        method.apply( _this, args );
        delete _this[ timeoutName ];
      }, threshold );
    };
  };

  // ----- docReady ----- //

  utils.docReady = function( callback ) {
    var readyState = document.readyState;
    if ( readyState == 'complete' || readyState == 'interactive' ) {
      // do async to allow for other scripts to run. metafizzy/flickity#441
      setTimeout( callback );
    } else {
      document.addEventListener( 'DOMContentLoaded', callback );
    }
  };

  // ----- htmlInit ----- //

  // http://jamesroberts.name/blog/2010/02/22/string-functions-for-javascript-trim-to-camel-case-to-dashed-and-to-underscore/
  utils.toDashed = function( str ) {
    return str.replace( /(.)([A-Z])/g, function( match, $1, $2 ) {
      return $1 + '-' + $2;
    }).toLowerCase();
  };

  var console = window.console;
  /**
   * allow user to initialize classes via [data-namespace] or .js-namespace class
   * htmlInit( Widget, 'widgetName' )
   * options are parsed from data-namespace-options
   */
  utils.htmlInit = function( WidgetClass, namespace ) {
    utils.docReady( function() {
      var dashedNamespace = utils.toDashed( namespace );
      var dataAttr = 'data-' + dashedNamespace;
      var dataAttrElems = document.querySelectorAll( '[' + dataAttr + ']' );
      var jsDashElems = document.querySelectorAll( '.js-' + dashedNamespace );
      var elems = utils.makeArray( dataAttrElems )
        .concat( utils.makeArray( jsDashElems ) );
      var dataOptionsAttr = dataAttr + '-options';
      var jQuery = window.jQuery;

      elems.forEach( function( elem ) {
        var attr = elem.getAttribute( dataAttr ) ||
          elem.getAttribute( dataOptionsAttr );
        var options;
        try {
          options = attr && JSON.parse( attr );
        } catch ( error ) {
          // log error, do not initialize
          if ( console ) {
            console.error( 'Error parsing ' + dataAttr + ' on ' + elem.className +
            ': ' + error );
          }
          return;
        }
        // initialize
        var instance = new WidgetClass( elem, options );
        // make available via $().data('namespace')
        if ( jQuery ) {
          jQuery.data( elem, namespace, instance );
        }
      });

    });
  };

  // -----  ----- //

  return utils;

  }));
  });

  var item = createCommonjsModule(function (module) {
  /**
   * Outlayer Item
   */

  ( function( window, factory ) {
    // universal module definition
    /* jshint strict: false */ /* globals define, module, require */
    if (  module.exports ) {
      // CommonJS - Browserify, Webpack
      module.exports = factory(
        evEmitter,
        getSize
      );
    } else {
      // browser global
      window.Outlayer = {};
      window.Outlayer.Item = factory(
        window.EvEmitter,
        window.getSize
      );
    }

  }( window, function factory( EvEmitter, getSize ) {

  // ----- helpers ----- //

  function isEmptyObj( obj ) {
    for ( var prop in obj ) {
      return false;
    }
    prop = null;
    return true;
  }

  // -------------------------- CSS3 support -------------------------- //


  var docElemStyle = document.documentElement.style;

  var transitionProperty = typeof docElemStyle.transition == 'string' ?
    'transition' : 'WebkitTransition';
  var transformProperty = typeof docElemStyle.transform == 'string' ?
    'transform' : 'WebkitTransform';

  var transitionEndEvent = {
    WebkitTransition: 'webkitTransitionEnd',
    transition: 'transitionend'
  }[ transitionProperty ];

  // cache all vendor properties that could have vendor prefix
  var vendorProperties = {
    transform: transformProperty,
    transition: transitionProperty,
    transitionDuration: transitionProperty + 'Duration',
    transitionProperty: transitionProperty + 'Property',
    transitionDelay: transitionProperty + 'Delay'
  };

  // -------------------------- Item -------------------------- //

  function Item( element, layout ) {
    if ( !element ) {
      return;
    }

    this.element = element;
    // parent layout class, i.e. Masonry, Isotope, or Packery
    this.layout = layout;
    this.position = {
      x: 0,
      y: 0
    };

    this._create();
  }

  // inherit EvEmitter
  var proto = Item.prototype = Object.create( EvEmitter.prototype );
  proto.constructor = Item;

  proto._create = function() {
    // transition objects
    this._transn = {
      ingProperties: {},
      clean: {},
      onEnd: {}
    };

    this.css({
      position: 'absolute'
    });
  };

  // trigger specified handler for event type
  proto.handleEvent = function( event ) {
    var method = 'on' + event.type;
    if ( this[ method ] ) {
      this[ method ]( event );
    }
  };

  proto.getSize = function() {
    this.size = getSize( this.element );
  };

  /**
   * apply CSS styles to element
   * @param {Object} style
   */
  proto.css = function( style ) {
    var elemStyle = this.element.style;

    for ( var prop in style ) {
      // use vendor property if available
      var supportedProp = vendorProperties[ prop ] || prop;
      elemStyle[ supportedProp ] = style[ prop ];
    }
  };

   // measure position, and sets it
  proto.getPosition = function() {
    var style = getComputedStyle( this.element );
    var isOriginLeft = this.layout._getOption('originLeft');
    var isOriginTop = this.layout._getOption('originTop');
    var xValue = style[ isOriginLeft ? 'left' : 'right' ];
    var yValue = style[ isOriginTop ? 'top' : 'bottom' ];
    var x = parseFloat( xValue );
    var y = parseFloat( yValue );
    // convert percent to pixels
    var layoutSize = this.layout.size;
    if ( xValue.indexOf('%') != -1 ) {
      x = ( x / 100 ) * layoutSize.width;
    }
    if ( yValue.indexOf('%') != -1 ) {
      y = ( y / 100 ) * layoutSize.height;
    }
    // clean up 'auto' or other non-integer values
    x = isNaN( x ) ? 0 : x;
    y = isNaN( y ) ? 0 : y;
    // remove padding from measurement
    x -= isOriginLeft ? layoutSize.paddingLeft : layoutSize.paddingRight;
    y -= isOriginTop ? layoutSize.paddingTop : layoutSize.paddingBottom;

    this.position.x = x;
    this.position.y = y;
  };

  // set settled position, apply padding
  proto.layoutPosition = function() {
    var layoutSize = this.layout.size;
    var style = {};
    var isOriginLeft = this.layout._getOption('originLeft');
    var isOriginTop = this.layout._getOption('originTop');

    // x
    var xPadding = isOriginLeft ? 'paddingLeft' : 'paddingRight';
    var xProperty = isOriginLeft ? 'left' : 'right';
    var xResetProperty = isOriginLeft ? 'right' : 'left';

    var x = this.position.x + layoutSize[ xPadding ];
    // set in percentage or pixels
    style[ xProperty ] = this.getXValue( x );
    // reset other property
    style[ xResetProperty ] = '';

    // y
    var yPadding = isOriginTop ? 'paddingTop' : 'paddingBottom';
    var yProperty = isOriginTop ? 'top' : 'bottom';
    var yResetProperty = isOriginTop ? 'bottom' : 'top';

    var y = this.position.y + layoutSize[ yPadding ];
    // set in percentage or pixels
    style[ yProperty ] = this.getYValue( y );
    // reset other property
    style[ yResetProperty ] = '';

    this.css( style );
    this.emitEvent( 'layout', [ this ] );
  };

  proto.getXValue = function( x ) {
    var isHorizontal = this.layout._getOption('horizontal');
    return this.layout.options.percentPosition && !isHorizontal ?
      ( ( x / this.layout.size.width ) * 100 ) + '%' : x + 'px';
  };

  proto.getYValue = function( y ) {
    var isHorizontal = this.layout._getOption('horizontal');
    return this.layout.options.percentPosition && isHorizontal ?
      ( ( y / this.layout.size.height ) * 100 ) + '%' : y + 'px';
  };

  proto._transitionTo = function( x, y ) {
    this.getPosition();
    // get current x & y from top/left
    var curX = this.position.x;
    var curY = this.position.y;

    var didNotMove = x == this.position.x && y == this.position.y;

    // save end position
    this.setPosition( x, y );

    // if did not move and not transitioning, just go to layout
    if ( didNotMove && !this.isTransitioning ) {
      this.layoutPosition();
      return;
    }

    var transX = x - curX;
    var transY = y - curY;
    var transitionStyle = {};
    transitionStyle.transform = this.getTranslate( transX, transY );

    this.transition({
      to: transitionStyle,
      onTransitionEnd: {
        transform: this.layoutPosition
      },
      isCleaning: true
    });
  };

  proto.getTranslate = function( x, y ) {
    // flip cooridinates if origin on right or bottom
    var isOriginLeft = this.layout._getOption('originLeft');
    var isOriginTop = this.layout._getOption('originTop');
    x = isOriginLeft ? x : -x;
    y = isOriginTop ? y : -y;
    return 'translate3d(' + x + 'px, ' + y + 'px, 0)';
  };

  // non transition + transform support
  proto.goTo = function( x, y ) {
    this.setPosition( x, y );
    this.layoutPosition();
  };

  proto.moveTo = proto._transitionTo;

  proto.setPosition = function( x, y ) {
    this.position.x = parseFloat( x );
    this.position.y = parseFloat( y );
  };

  // ----- transition ----- //

  /**
   * @param {Object} style - CSS
   * @param {Function} onTransitionEnd
   */

  // non transition, just trigger callback
  proto._nonTransition = function( args ) {
    this.css( args.to );
    if ( args.isCleaning ) {
      this._removeStyles( args.to );
    }
    for ( var prop in args.onTransitionEnd ) {
      args.onTransitionEnd[ prop ].call( this );
    }
  };

  /**
   * proper transition
   * @param {Object} args - arguments
   *   @param {Object} to - style to transition to
   *   @param {Object} from - style to start transition from
   *   @param {Boolean} isCleaning - removes transition styles after transition
   *   @param {Function} onTransitionEnd - callback
   */
  proto.transition = function( args ) {
    // redirect to nonTransition if no transition duration
    if ( !parseFloat( this.layout.options.transitionDuration ) ) {
      this._nonTransition( args );
      return;
    }

    var _transition = this._transn;
    // keep track of onTransitionEnd callback by css property
    for ( var prop in args.onTransitionEnd ) {
      _transition.onEnd[ prop ] = args.onTransitionEnd[ prop ];
    }
    // keep track of properties that are transitioning
    for ( prop in args.to ) {
      _transition.ingProperties[ prop ] = true;
      // keep track of properties to clean up when transition is done
      if ( args.isCleaning ) {
        _transition.clean[ prop ] = true;
      }
    }

    // set from styles
    if ( args.from ) {
      this.css( args.from );
      // force redraw. http://blog.alexmaccaw.com/css-transitions
      var h = this.element.offsetHeight;
      // hack for JSHint to hush about unused var
      h = null;
    }
    // enable transition
    this.enableTransition( args.to );
    // set styles that are transitioning
    this.css( args.to );

    this.isTransitioning = true;

  };

  // dash before all cap letters, including first for
  // WebkitTransform => -webkit-transform
  function toDashedAll( str ) {
    return str.replace( /([A-Z])/g, function( $1 ) {
      return '-' + $1.toLowerCase();
    });
  }

  var transitionProps = 'opacity,' + toDashedAll( transformProperty );

  proto.enableTransition = function(/* style */) {
    // HACK changing transitionProperty during a transition
    // will cause transition to jump
    if ( this.isTransitioning ) {
      return;
    }

    // make `transition: foo, bar, baz` from style object
    // HACK un-comment this when enableTransition can work
    // while a transition is happening
    // var transitionValues = [];
    // for ( var prop in style ) {
    //   // dash-ify camelCased properties like WebkitTransition
    //   prop = vendorProperties[ prop ] || prop;
    //   transitionValues.push( toDashedAll( prop ) );
    // }
    // munge number to millisecond, to match stagger
    var duration = this.layout.options.transitionDuration;
    duration = typeof duration == 'number' ? duration + 'ms' : duration;
    // enable transition styles
    this.css({
      transitionProperty: transitionProps,
      transitionDuration: duration,
      transitionDelay: this.staggerDelay || 0
    });
    // listen for transition end event
    this.element.addEventListener( transitionEndEvent, this, false );
  };

  // ----- events ----- //

  proto.onwebkitTransitionEnd = function( event ) {
    this.ontransitionend( event );
  };

  proto.onotransitionend = function( event ) {
    this.ontransitionend( event );
  };

  // properties that I munge to make my life easier
  var dashedVendorProperties = {
    '-webkit-transform': 'transform'
  };

  proto.ontransitionend = function( event ) {
    // disregard bubbled events from children
    if ( event.target !== this.element ) {
      return;
    }
    var _transition = this._transn;
    // get property name of transitioned property, convert to prefix-free
    var propertyName = dashedVendorProperties[ event.propertyName ] || event.propertyName;

    // remove property that has completed transitioning
    delete _transition.ingProperties[ propertyName ];
    // check if any properties are still transitioning
    if ( isEmptyObj( _transition.ingProperties ) ) {
      // all properties have completed transitioning
      this.disableTransition();
    }
    // clean style
    if ( propertyName in _transition.clean ) {
      // clean up style
      this.element.style[ event.propertyName ] = '';
      delete _transition.clean[ propertyName ];
    }
    // trigger onTransitionEnd callback
    if ( propertyName in _transition.onEnd ) {
      var onTransitionEnd = _transition.onEnd[ propertyName ];
      onTransitionEnd.call( this );
      delete _transition.onEnd[ propertyName ];
    }

    this.emitEvent( 'transitionEnd', [ this ] );
  };

  proto.disableTransition = function() {
    this.removeTransitionStyles();
    this.element.removeEventListener( transitionEndEvent, this, false );
    this.isTransitioning = false;
  };

  /**
   * removes style property from element
   * @param {Object} style
  **/
  proto._removeStyles = function( style ) {
    // clean up transition styles
    var cleanStyle = {};
    for ( var prop in style ) {
      cleanStyle[ prop ] = '';
    }
    this.css( cleanStyle );
  };

  var cleanTransitionStyle = {
    transitionProperty: '',
    transitionDuration: '',
    transitionDelay: ''
  };

  proto.removeTransitionStyles = function() {
    // remove transition
    this.css( cleanTransitionStyle );
  };

  // ----- stagger ----- //

  proto.stagger = function( delay ) {
    delay = isNaN( delay ) ? 0 : delay;
    this.staggerDelay = delay + 'ms';
  };

  // ----- show/hide/remove ----- //

  // remove element from DOM
  proto.removeElem = function() {
    this.element.parentNode.removeChild( this.element );
    // remove display: none
    this.css({ display: '' });
    this.emitEvent( 'remove', [ this ] );
  };

  proto.remove = function() {
    // just remove element if no transition support or no transition
    if ( !transitionProperty || !parseFloat( this.layout.options.transitionDuration ) ) {
      this.removeElem();
      return;
    }

    // start transition
    this.once( 'transitionEnd', function() {
      this.removeElem();
    });
    this.hide();
  };

  proto.reveal = function() {
    delete this.isHidden;
    // remove display: none
    this.css({ display: '' });

    var options = this.layout.options;

    var onTransitionEnd = {};
    var transitionEndProperty = this.getHideRevealTransitionEndProperty('visibleStyle');
    onTransitionEnd[ transitionEndProperty ] = this.onRevealTransitionEnd;

    this.transition({
      from: options.hiddenStyle,
      to: options.visibleStyle,
      isCleaning: true,
      onTransitionEnd: onTransitionEnd
    });
  };

  proto.onRevealTransitionEnd = function() {
    // check if still visible
    // during transition, item may have been hidden
    if ( !this.isHidden ) {
      this.emitEvent('reveal');
    }
  };

  /**
   * get style property use for hide/reveal transition end
   * @param {String} styleProperty - hiddenStyle/visibleStyle
   * @returns {String}
   */
  proto.getHideRevealTransitionEndProperty = function( styleProperty ) {
    var optionStyle = this.layout.options[ styleProperty ];
    // use opacity
    if ( optionStyle.opacity ) {
      return 'opacity';
    }
    // get first property
    for ( var prop in optionStyle ) {
      return prop;
    }
  };

  proto.hide = function() {
    // set flag
    this.isHidden = true;
    // remove display: none
    this.css({ display: '' });

    var options = this.layout.options;

    var onTransitionEnd = {};
    var transitionEndProperty = this.getHideRevealTransitionEndProperty('hiddenStyle');
    onTransitionEnd[ transitionEndProperty ] = this.onHideTransitionEnd;

    this.transition({
      from: options.visibleStyle,
      to: options.hiddenStyle,
      // keep hidden stuff hidden
      isCleaning: true,
      onTransitionEnd: onTransitionEnd
    });
  };

  proto.onHideTransitionEnd = function() {
    // check if still hidden
    // during transition, item may have been un-hidden
    if ( this.isHidden ) {
      this.css({ display: 'none' });
      this.emitEvent('hide');
    }
  };

  proto.destroy = function() {
    this.css({
      position: '',
      left: '',
      right: '',
      top: '',
      bottom: '',
      transition: '',
      transform: ''
    });
  };

  return Item;

  }));
  });

  var outlayer = createCommonjsModule(function (module) {
  /*!
   * Outlayer v2.1.1
   * the brains and guts of a layout library
   * MIT license
   */

  ( function( window, factory ) {
    // universal module definition
    /* jshint strict: false */ /* globals define, module, require */
    if (  module.exports ) {
      // CommonJS - Browserify, Webpack
      module.exports = factory(
        window,
        evEmitter,
        getSize,
        utils,
        item
      );
    } else {
      // browser global
      window.Outlayer = factory(
        window,
        window.EvEmitter,
        window.getSize,
        window.fizzyUIUtils,
        window.Outlayer.Item
      );
    }

  }( window, function factory( window, EvEmitter, getSize, utils, Item ) {

  // ----- vars ----- //

  var console = window.console;
  var jQuery = window.jQuery;
  var noop = function() {};

  // -------------------------- Outlayer -------------------------- //

  // globally unique identifiers
  var GUID = 0;
  // internal store of all Outlayer intances
  var instances = {};


  /**
   * @param {Element, String} element
   * @param {Object} options
   * @constructor
   */
  function Outlayer( element, options ) {
    var queryElement = utils.getQueryElement( element );
    if ( !queryElement ) {
      if ( console ) {
        console.error( 'Bad element for ' + this.constructor.namespace +
          ': ' + ( queryElement || element ) );
      }
      return;
    }
    this.element = queryElement;
    // add jQuery
    if ( jQuery ) {
      this.$element = jQuery( this.element );
    }

    // options
    this.options = utils.extend( {}, this.constructor.defaults );
    this.option( options );

    // add id for Outlayer.getFromElement
    var id = ++GUID;
    this.element.outlayerGUID = id; // expando
    instances[ id ] = this; // associate via id

    // kick it off
    this._create();

    var isInitLayout = this._getOption('initLayout');
    if ( isInitLayout ) {
      this.layout();
    }
  }

  // settings are for internal use only
  Outlayer.namespace = 'outlayer';
  Outlayer.Item = Item;

  // default options
  Outlayer.defaults = {
    containerStyle: {
      position: 'relative'
    },
    initLayout: true,
    originLeft: true,
    originTop: true,
    resize: true,
    resizeContainer: true,
    // item options
    transitionDuration: '0.4s',
    hiddenStyle: {
      opacity: 0,
      transform: 'scale(0.001)'
    },
    visibleStyle: {
      opacity: 1,
      transform: 'scale(1)'
    }
  };

  var proto = Outlayer.prototype;
  // inherit EvEmitter
  utils.extend( proto, EvEmitter.prototype );

  /**
   * set options
   * @param {Object} opts
   */
  proto.option = function( opts ) {
    utils.extend( this.options, opts );
  };

  /**
   * get backwards compatible option value, check old name
   */
  proto._getOption = function( option ) {
    var oldOption = this.constructor.compatOptions[ option ];
    return oldOption && this.options[ oldOption ] !== undefined ?
      this.options[ oldOption ] : this.options[ option ];
  };

  Outlayer.compatOptions = {
    // currentName: oldName
    initLayout: 'isInitLayout',
    horizontal: 'isHorizontal',
    layoutInstant: 'isLayoutInstant',
    originLeft: 'isOriginLeft',
    originTop: 'isOriginTop',
    resize: 'isResizeBound',
    resizeContainer: 'isResizingContainer'
  };

  proto._create = function() {
    // get items from children
    this.reloadItems();
    // elements that affect layout, but are not laid out
    this.stamps = [];
    this.stamp( this.options.stamp );
    // set container style
    utils.extend( this.element.style, this.options.containerStyle );

    // bind resize method
    var canBindResize = this._getOption('resize');
    if ( canBindResize ) {
      this.bindResize();
    }
  };

  // goes through all children again and gets bricks in proper order
  proto.reloadItems = function() {
    // collection of item elements
    this.items = this._itemize( this.element.children );
  };


  /**
   * turn elements into Outlayer.Items to be used in layout
   * @param {Array or NodeList or HTMLElement} elems
   * @returns {Array} items - collection of new Outlayer Items
   */
  proto._itemize = function( elems ) {

    var itemElems = this._filterFindItemElements( elems );
    var Item = this.constructor.Item;

    // create new Outlayer Items for collection
    var items = [];
    for ( var i=0; i < itemElems.length; i++ ) {
      var elem = itemElems[i];
      var item = new Item( elem, this );
      items.push( item );
    }

    return items;
  };

  /**
   * get item elements to be used in layout
   * @param {Array or NodeList or HTMLElement} elems
   * @returns {Array} items - item elements
   */
  proto._filterFindItemElements = function( elems ) {
    return utils.filterFindElements( elems, this.options.itemSelector );
  };

  /**
   * getter method for getting item elements
   * @returns {Array} elems - collection of item elements
   */
  proto.getItemElements = function() {
    return this.items.map( function( item ) {
      return item.element;
    });
  };

  // ----- init & layout ----- //

  /**
   * lays out all items
   */
  proto.layout = function() {
    this._resetLayout();
    this._manageStamps();

    // don't animate first layout
    var layoutInstant = this._getOption('layoutInstant');
    var isInstant = layoutInstant !== undefined ?
      layoutInstant : !this._isLayoutInited;
    this.layoutItems( this.items, isInstant );

    // flag for initalized
    this._isLayoutInited = true;
  };

  // _init is alias for layout
  proto._init = proto.layout;

  /**
   * logic before any new layout
   */
  proto._resetLayout = function() {
    this.getSize();
  };


  proto.getSize = function() {
    this.size = getSize( this.element );
  };

  /**
   * get measurement from option, for columnWidth, rowHeight, gutter
   * if option is String -> get element from selector string, & get size of element
   * if option is Element -> get size of element
   * else use option as a number
   *
   * @param {String} measurement
   * @param {String} size - width or height
   * @private
   */
  proto._getMeasurement = function( measurement, size ) {
    var option = this.options[ measurement ];
    var elem;
    if ( !option ) {
      // default to 0
      this[ measurement ] = 0;
    } else {
      // use option as an element
      if ( typeof option == 'string' ) {
        elem = this.element.querySelector( option );
      } else if ( option instanceof HTMLElement ) {
        elem = option;
      }
      // use size of element, if element
      this[ measurement ] = elem ? getSize( elem )[ size ] : option;
    }
  };

  /**
   * layout a collection of item elements
   * @api public
   */
  proto.layoutItems = function( items, isInstant ) {
    items = this._getItemsForLayout( items );

    this._layoutItems( items, isInstant );

    this._postLayout();
  };

  /**
   * get the items to be laid out
   * you may want to skip over some items
   * @param {Array} items
   * @returns {Array} items
   */
  proto._getItemsForLayout = function( items ) {
    return items.filter( function( item ) {
      return !item.isIgnored;
    });
  };

  /**
   * layout items
   * @param {Array} items
   * @param {Boolean} isInstant
   */
  proto._layoutItems = function( items, isInstant ) {
    this._emitCompleteOnItems( 'layout', items );

    if ( !items || !items.length ) {
      // no items, emit event with empty array
      return;
    }

    var queue = [];

    items.forEach( function( item ) {
      // get x/y object from method
      var position = this._getItemLayoutPosition( item );
      // enqueue
      position.item = item;
      position.isInstant = isInstant || item.isLayoutInstant;
      queue.push( position );
    }, this );

    this._processLayoutQueue( queue );
  };

  /**
   * get item layout position
   * @param {Outlayer.Item} item
   * @returns {Object} x and y position
   */
  proto._getItemLayoutPosition = function( /* item */ ) {
    return {
      x: 0,
      y: 0
    };
  };

  /**
   * iterate over array and position each item
   * Reason being - separating this logic prevents 'layout invalidation'
   * thx @paul_irish
   * @param {Array} queue
   */
  proto._processLayoutQueue = function( queue ) {
    this.updateStagger();
    queue.forEach( function( obj, i ) {
      this._positionItem( obj.item, obj.x, obj.y, obj.isInstant, i );
    }, this );
  };

  // set stagger from option in milliseconds number
  proto.updateStagger = function() {
    var stagger = this.options.stagger;
    if ( stagger === null || stagger === undefined ) {
      this.stagger = 0;
      return;
    }
    this.stagger = getMilliseconds( stagger );
    return this.stagger;
  };

  /**
   * Sets position of item in DOM
   * @param {Outlayer.Item} item
   * @param {Number} x - horizontal position
   * @param {Number} y - vertical position
   * @param {Boolean} isInstant - disables transitions
   */
  proto._positionItem = function( item, x, y, isInstant, i ) {
    if ( isInstant ) {
      // if not transition, just set CSS
      item.goTo( x, y );
    } else {
      item.stagger( i * this.stagger );
      item.moveTo( x, y );
    }
  };

  /**
   * Any logic you want to do after each layout,
   * i.e. size the container
   */
  proto._postLayout = function() {
    this.resizeContainer();
  };

  proto.resizeContainer = function() {
    var isResizingContainer = this._getOption('resizeContainer');
    if ( !isResizingContainer ) {
      return;
    }
    var size = this._getContainerSize();
    if ( size ) {
      this._setContainerMeasure( size.width, true );
      this._setContainerMeasure( size.height, false );
    }
  };

  /**
   * Sets width or height of container if returned
   * @returns {Object} size
   *   @param {Number} width
   *   @param {Number} height
   */
  proto._getContainerSize = noop;

  /**
   * @param {Number} measure - size of width or height
   * @param {Boolean} isWidth
   */
  proto._setContainerMeasure = function( measure, isWidth ) {
    if ( measure === undefined ) {
      return;
    }

    var elemSize = this.size;
    // add padding and border width if border box
    if ( elemSize.isBorderBox ) {
      measure += isWidth ? elemSize.paddingLeft + elemSize.paddingRight +
        elemSize.borderLeftWidth + elemSize.borderRightWidth :
        elemSize.paddingBottom + elemSize.paddingTop +
        elemSize.borderTopWidth + elemSize.borderBottomWidth;
    }

    measure = Math.max( measure, 0 );
    this.element.style[ isWidth ? 'width' : 'height' ] = measure + 'px';
  };

  /**
   * emit eventComplete on a collection of items events
   * @param {String} eventName
   * @param {Array} items - Outlayer.Items
   */
  proto._emitCompleteOnItems = function( eventName, items ) {
    var _this = this;
    function onComplete() {
      _this.dispatchEvent( eventName + 'Complete', null, [ items ] );
    }

    var count = items.length;
    if ( !items || !count ) {
      onComplete();
      return;
    }

    var doneCount = 0;
    function tick() {
      doneCount++;
      if ( doneCount == count ) {
        onComplete();
      }
    }

    // bind callback
    items.forEach( function( item ) {
      item.once( eventName, tick );
    });
  };

  /**
   * emits events via EvEmitter and jQuery events
   * @param {String} type - name of event
   * @param {Event} event - original event
   * @param {Array} args - extra arguments
   */
  proto.dispatchEvent = function( type, event, args ) {
    // add original event to arguments
    var emitArgs = event ? [ event ].concat( args ) : args;
    this.emitEvent( type, emitArgs );

    if ( jQuery ) {
      // set this.$element
      this.$element = this.$element || jQuery( this.element );
      if ( event ) {
        // create jQuery event
        var $event = jQuery.Event( event );
        $event.type = type;
        this.$element.trigger( $event, args );
      } else {
        // just trigger with type if no event available
        this.$element.trigger( type, args );
      }
    }
  };

  // -------------------------- ignore & stamps -------------------------- //


  /**
   * keep item in collection, but do not lay it out
   * ignored items do not get skipped in layout
   * @param {Element} elem
   */
  proto.ignore = function( elem ) {
    var item = this.getItem( elem );
    if ( item ) {
      item.isIgnored = true;
    }
  };

  /**
   * return item to layout collection
   * @param {Element} elem
   */
  proto.unignore = function( elem ) {
    var item = this.getItem( elem );
    if ( item ) {
      delete item.isIgnored;
    }
  };

  /**
   * adds elements to stamps
   * @param {NodeList, Array, Element, or String} elems
   */
  proto.stamp = function( elems ) {
    elems = this._find( elems );
    if ( !elems ) {
      return;
    }

    this.stamps = this.stamps.concat( elems );
    // ignore
    elems.forEach( this.ignore, this );
  };

  /**
   * removes elements to stamps
   * @param {NodeList, Array, or Element} elems
   */
  proto.unstamp = function( elems ) {
    elems = this._find( elems );
    if ( !elems ){
      return;
    }

    elems.forEach( function( elem ) {
      // filter out removed stamp elements
      utils.removeFrom( this.stamps, elem );
      this.unignore( elem );
    }, this );
  };

  /**
   * finds child elements
   * @param {NodeList, Array, Element, or String} elems
   * @returns {Array} elems
   */
  proto._find = function( elems ) {
    if ( !elems ) {
      return;
    }
    // if string, use argument as selector string
    if ( typeof elems == 'string' ) {
      elems = this.element.querySelectorAll( elems );
    }
    elems = utils.makeArray( elems );
    return elems;
  };

  proto._manageStamps = function() {
    if ( !this.stamps || !this.stamps.length ) {
      return;
    }

    this._getBoundingRect();

    this.stamps.forEach( this._manageStamp, this );
  };

  // update boundingLeft / Top
  proto._getBoundingRect = function() {
    // get bounding rect for container element
    var boundingRect = this.element.getBoundingClientRect();
    var size = this.size;
    this._boundingRect = {
      left: boundingRect.left + size.paddingLeft + size.borderLeftWidth,
      top: boundingRect.top + size.paddingTop + size.borderTopWidth,
      right: boundingRect.right - ( size.paddingRight + size.borderRightWidth ),
      bottom: boundingRect.bottom - ( size.paddingBottom + size.borderBottomWidth )
    };
  };

  /**
   * @param {Element} stamp
  **/
  proto._manageStamp = noop;

  /**
   * get x/y position of element relative to container element
   * @param {Element} elem
   * @returns {Object} offset - has left, top, right, bottom
   */
  proto._getElementOffset = function( elem ) {
    var boundingRect = elem.getBoundingClientRect();
    var thisRect = this._boundingRect;
    var size = getSize( elem );
    var offset = {
      left: boundingRect.left - thisRect.left - size.marginLeft,
      top: boundingRect.top - thisRect.top - size.marginTop,
      right: thisRect.right - boundingRect.right - size.marginRight,
      bottom: thisRect.bottom - boundingRect.bottom - size.marginBottom
    };
    return offset;
  };

  // -------------------------- resize -------------------------- //

  // enable event handlers for listeners
  // i.e. resize -> onresize
  proto.handleEvent = utils.handleEvent;

  /**
   * Bind layout to window resizing
   */
  proto.bindResize = function() {
    window.addEventListener( 'resize', this );
    this.isResizeBound = true;
  };

  /**
   * Unbind layout to window resizing
   */
  proto.unbindResize = function() {
    window.removeEventListener( 'resize', this );
    this.isResizeBound = false;
  };

  proto.onresize = function() {
    this.resize();
  };

  utils.debounceMethod( Outlayer, 'onresize', 100 );

  proto.resize = function() {
    // don't trigger if size did not change
    // or if resize was unbound. See #9
    if ( !this.isResizeBound || !this.needsResizeLayout() ) {
      return;
    }

    this.layout();
  };

  /**
   * check if layout is needed post layout
   * @returns Boolean
   */
  proto.needsResizeLayout = function() {
    var size = getSize( this.element );
    // check that this.size and size are there
    // IE8 triggers resize on body size change, so they might not be
    var hasSizes = this.size && size;
    return hasSizes && size.innerWidth !== this.size.innerWidth;
  };

  // -------------------------- methods -------------------------- //

  /**
   * add items to Outlayer instance
   * @param {Array or NodeList or Element} elems
   * @returns {Array} items - Outlayer.Items
  **/
  proto.addItems = function( elems ) {
    var items = this._itemize( elems );
    // add items to collection
    if ( items.length ) {
      this.items = this.items.concat( items );
    }
    return items;
  };

  /**
   * Layout newly-appended item elements
   * @param {Array or NodeList or Element} elems
   */
  proto.appended = function( elems ) {
    var items = this.addItems( elems );
    if ( !items.length ) {
      return;
    }
    // layout and reveal just the new items
    this.layoutItems( items, true );
    this.reveal( items );
  };

  /**
   * Layout prepended elements
   * @param {Array or NodeList or Element} elems
   */
  proto.prepended = function( elems ) {
    var items = this._itemize( elems );
    if ( !items.length ) {
      return;
    }
    // add items to beginning of collection
    var previousItems = this.items.slice(0);
    this.items = items.concat( previousItems );
    // start new layout
    this._resetLayout();
    this._manageStamps();
    // layout new stuff without transition
    this.layoutItems( items, true );
    this.reveal( items );
    // layout previous items
    this.layoutItems( previousItems );
  };

  /**
   * reveal a collection of items
   * @param {Array of Outlayer.Items} items
   */
  proto.reveal = function( items ) {
    this._emitCompleteOnItems( 'reveal', items );
    if ( !items || !items.length ) {
      return;
    }
    var stagger = this.updateStagger();
    items.forEach( function( item, i ) {
      item.stagger( i * stagger );
      item.reveal();
    });
  };

  /**
   * hide a collection of items
   * @param {Array of Outlayer.Items} items
   */
  proto.hide = function( items ) {
    this._emitCompleteOnItems( 'hide', items );
    if ( !items || !items.length ) {
      return;
    }
    var stagger = this.updateStagger();
    items.forEach( function( item, i ) {
      item.stagger( i * stagger );
      item.hide();
    });
  };

  /**
   * reveal item elements
   * @param {Array}, {Element}, {NodeList} items
   */
  proto.revealItemElements = function( elems ) {
    var items = this.getItems( elems );
    this.reveal( items );
  };

  /**
   * hide item elements
   * @param {Array}, {Element}, {NodeList} items
   */
  proto.hideItemElements = function( elems ) {
    var items = this.getItems( elems );
    this.hide( items );
  };

  /**
   * get Outlayer.Item, given an Element
   * @param {Element} elem
   * @param {Function} callback
   * @returns {Outlayer.Item} item
   */
  proto.getItem = function( elem ) {
    // loop through items to get the one that matches
    for ( var i=0; i < this.items.length; i++ ) {
      var item = this.items[i];
      if ( item.element == elem ) {
        // return item
        return item;
      }
    }
  };

  /**
   * get collection of Outlayer.Items, given Elements
   * @param {Array} elems
   * @returns {Array} items - Outlayer.Items
   */
  proto.getItems = function( elems ) {
    elems = utils.makeArray( elems );
    var items = [];
    elems.forEach( function( elem ) {
      var item = this.getItem( elem );
      if ( item ) {
        items.push( item );
      }
    }, this );

    return items;
  };

  /**
   * remove element(s) from instance and DOM
   * @param {Array or NodeList or Element} elems
   */
  proto.remove = function( elems ) {
    var removeItems = this.getItems( elems );

    this._emitCompleteOnItems( 'remove', removeItems );

    // bail if no items to remove
    if ( !removeItems || !removeItems.length ) {
      return;
    }

    removeItems.forEach( function( item ) {
      item.remove();
      // remove item from collection
      utils.removeFrom( this.items, item );
    }, this );
  };

  // ----- destroy ----- //

  // remove and disable Outlayer instance
  proto.destroy = function() {
    // clean up dynamic styles
    var style = this.element.style;
    style.height = '';
    style.position = '';
    style.width = '';
    // destroy items
    this.items.forEach( function( item ) {
      item.destroy();
    });

    this.unbindResize();

    var id = this.element.outlayerGUID;
    delete instances[ id ]; // remove reference to instance by id
    delete this.element.outlayerGUID;
    // remove data for jQuery
    if ( jQuery ) {
      jQuery.removeData( this.element, this.constructor.namespace );
    }

  };

  // -------------------------- data -------------------------- //

  /**
   * get Outlayer instance from element
   * @param {Element} elem
   * @returns {Outlayer}
   */
  Outlayer.data = function( elem ) {
    elem = utils.getQueryElement( elem );
    var id = elem && elem.outlayerGUID;
    return id && instances[ id ];
  };


  // -------------------------- create Outlayer class -------------------------- //

  /**
   * create a layout class
   * @param {String} namespace
   */
  Outlayer.create = function( namespace, options ) {
    // sub-class Outlayer
    var Layout = subclass( Outlayer );
    // apply new options and compatOptions
    Layout.defaults = utils.extend( {}, Outlayer.defaults );
    utils.extend( Layout.defaults, options );
    Layout.compatOptions = utils.extend( {}, Outlayer.compatOptions  );

    Layout.namespace = namespace;

    Layout.data = Outlayer.data;

    // sub-class Item
    Layout.Item = subclass( Item );

    // -------------------------- declarative -------------------------- //

    utils.htmlInit( Layout, namespace );

    // -------------------------- jQuery bridge -------------------------- //

    // make into jQuery plugin
    if ( jQuery && jQuery.bridget ) {
      jQuery.bridget( namespace, Layout );
    }

    return Layout;
  };

  function subclass( Parent ) {
    function SubClass() {
      Parent.apply( this, arguments );
    }

    SubClass.prototype = Object.create( Parent.prototype );
    SubClass.prototype.constructor = SubClass;

    return SubClass;
  }

  // ----- helpers ----- //

  // how many milliseconds are in each unit
  var msUnits = {
    ms: 1,
    s: 1000
  };

  // munge time-like parameter into millisecond number
  // '0.4s' -> 40
  function getMilliseconds( time ) {
    if ( typeof time == 'number' ) {
      return time;
    }
    var matches = time.match( /(^\d*\.?\d*)(\w*)/ );
    var num = matches && matches[1];
    var unit = matches && matches[2];
    if ( !num.length ) {
      return 0;
    }
    num = parseFloat( num );
    var mult = msUnits[ unit ] || 1;
    return num * mult;
  }

  // ----- fin ----- //

  // back in global
  Outlayer.Item = Item;

  return Outlayer;

  }));
  });

  var masonry = createCommonjsModule(function (module) {
  /*!
   * Masonry v4.2.2
   * Cascading grid layout library
   * https://masonry.desandro.com
   * MIT License
   * by David DeSandro
   */

  ( function( window, factory ) {
    // universal module definition
    /* jshint strict: false */ /*globals define, module, require */
    if (  module.exports ) {
      // CommonJS
      module.exports = factory(
        outlayer,
        getSize
      );
    } else {
      // browser global
      window.Masonry = factory(
        window.Outlayer,
        window.getSize
      );
    }

  }( window, function factory( Outlayer, getSize ) {

  // -------------------------- masonryDefinition -------------------------- //

    // create an Outlayer layout class
    var Masonry = Outlayer.create('masonry');
    // isFitWidth -> fitWidth
    Masonry.compatOptions.fitWidth = 'isFitWidth';

    var proto = Masonry.prototype;

    proto._resetLayout = function() {
      this.getSize();
      this._getMeasurement( 'columnWidth', 'outerWidth' );
      this._getMeasurement( 'gutter', 'outerWidth' );
      this.measureColumns();

      // reset column Y
      this.colYs = [];
      for ( var i=0; i < this.cols; i++ ) {
        this.colYs.push( 0 );
      }

      this.maxY = 0;
      this.horizontalColIndex = 0;
    };

    proto.measureColumns = function() {
      this.getContainerWidth();
      // if columnWidth is 0, default to outerWidth of first item
      if ( !this.columnWidth ) {
        var firstItem = this.items[0];
        var firstItemElem = firstItem && firstItem.element;
        // columnWidth fall back to item of first element
        this.columnWidth = firstItemElem && getSize( firstItemElem ).outerWidth ||
          // if first elem has no width, default to size of container
          this.containerWidth;
      }

      var columnWidth = this.columnWidth += this.gutter;

      // calculate columns
      var containerWidth = this.containerWidth + this.gutter;
      var cols = containerWidth / columnWidth;
      // fix rounding errors, typically with gutters
      var excess = columnWidth - containerWidth % columnWidth;
      // if overshoot is less than a pixel, round up, otherwise floor it
      var mathMethod = excess && excess < 1 ? 'round' : 'floor';
      cols = Math[ mathMethod ]( cols );
      this.cols = Math.max( cols, 1 );
    };

    proto.getContainerWidth = function() {
      // container is parent if fit width
      var isFitWidth = this._getOption('fitWidth');
      var container = isFitWidth ? this.element.parentNode : this.element;
      // check that this.size and size are there
      // IE8 triggers resize on body size change, so they might not be
      var size = getSize( container );
      this.containerWidth = size && size.innerWidth;
    };

    proto._getItemLayoutPosition = function( item ) {
      item.getSize();
      // how many columns does this brick span
      var remainder = item.size.outerWidth % this.columnWidth;
      var mathMethod = remainder && remainder < 1 ? 'round' : 'ceil';
      // round if off by 1 pixel, otherwise use ceil
      var colSpan = Math[ mathMethod ]( item.size.outerWidth / this.columnWidth );
      colSpan = Math.min( colSpan, this.cols );
      // use horizontal or top column position
      var colPosMethod = this.options.horizontalOrder ?
        '_getHorizontalColPosition' : '_getTopColPosition';
      var colPosition = this[ colPosMethod ]( colSpan, item );
      // position the brick
      var position = {
        x: this.columnWidth * colPosition.col,
        y: colPosition.y
      };
      // apply setHeight to necessary columns
      var setHeight = colPosition.y + item.size.outerHeight;
      var setMax = colSpan + colPosition.col;
      for ( var i = colPosition.col; i < setMax; i++ ) {
        this.colYs[i] = setHeight;
      }

      return position;
    };

    proto._getTopColPosition = function( colSpan ) {
      var colGroup = this._getTopColGroup( colSpan );
      // get the minimum Y value from the columns
      var minimumY = Math.min.apply( Math, colGroup );

      return {
        col: colGroup.indexOf( minimumY ),
        y: minimumY,
      };
    };

    /**
     * @param {Number} colSpan - number of columns the element spans
     * @returns {Array} colGroup
     */
    proto._getTopColGroup = function( colSpan ) {
      if ( colSpan < 2 ) {
        // if brick spans only one column, use all the column Ys
        return this.colYs;
      }

      var colGroup = [];
      // how many different places could this brick fit horizontally
      var groupCount = this.cols + 1 - colSpan;
      // for each group potential horizontal position
      for ( var i = 0; i < groupCount; i++ ) {
        colGroup[i] = this._getColGroupY( i, colSpan );
      }
      return colGroup;
    };

    proto._getColGroupY = function( col, colSpan ) {
      if ( colSpan < 2 ) {
        return this.colYs[ col ];
      }
      // make an array of colY values for that one group
      var groupColYs = this.colYs.slice( col, col + colSpan );
      // and get the max value of the array
      return Math.max.apply( Math, groupColYs );
    };

    // get column position based on horizontal index. #873
    proto._getHorizontalColPosition = function( colSpan, item ) {
      var col = this.horizontalColIndex % this.cols;
      var isOver = colSpan > 1 && col + colSpan > this.cols;
      // shift to next row if item can't fit on current row
      col = isOver ? 0 : col;
      // don't let zero-size items take up space
      var hasSize = item.size.outerWidth && item.size.outerHeight;
      this.horizontalColIndex = hasSize ? col + colSpan : this.horizontalColIndex;

      return {
        col: col,
        y: this._getColGroupY( col, colSpan ),
      };
    };

    proto._manageStamp = function( stamp ) {
      var stampSize = getSize( stamp );
      var offset = this._getElementOffset( stamp );
      // get the columns that this stamp affects
      var isOriginLeft = this._getOption('originLeft');
      var firstX = isOriginLeft ? offset.left : offset.right;
      var lastX = firstX + stampSize.outerWidth;
      var firstCol = Math.floor( firstX / this.columnWidth );
      firstCol = Math.max( 0, firstCol );
      var lastCol = Math.floor( lastX / this.columnWidth );
      // lastCol should not go over if multiple of columnWidth #425
      lastCol -= lastX % this.columnWidth ? 0 : 1;
      lastCol = Math.min( this.cols - 1, lastCol );
      // set colYs to bottom of the stamp

      var isOriginTop = this._getOption('originTop');
      var stampMaxY = ( isOriginTop ? offset.top : offset.bottom ) +
        stampSize.outerHeight;
      for ( var i = firstCol; i <= lastCol; i++ ) {
        this.colYs[i] = Math.max( stampMaxY, this.colYs[i] );
      }
    };

    proto._getContainerSize = function() {
      this.maxY = Math.max.apply( Math, this.colYs );
      var size = {
        height: this.maxY
      };

      if ( this._getOption('fitWidth') ) {
        size.width = this._getContainerFitWidth();
      }

      return size;
    };

    proto._getContainerFitWidth = function() {
      var unusedCols = 0;
      // count unused columns
      var i = this.cols;
      while ( --i ) {
        if ( this.colYs[i] !== 0 ) {
          break;
        }
        unusedCols++;
      }
      // fit container to columns that have been used
      return ( this.cols - unusedCols ) * this.columnWidth - this.gutter;
    };

    proto.needsResizeLayout = function() {
      var previousWidth = this.containerWidth;
      this.getContainerWidth();
      return previousWidth != this.containerWidth;
    };

    return Masonry;

  }));
  });

  function CardLayoutMasonry() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      selector: '.CardLayoutMasonry'
    },
        el = _ref.el;

    var msnry = new masonry(el, {
      // options
      itemSelector: '.CardLayoutMasonry-card',
      columnWidth: '.CardLayoutMasonry-card--grid-sizer',
      gutter: '.CardLayoutMasonry-card--gutter-sizer',
      percentPosition: true,
      initLayout: false
    });
    msnry.layout();
    revealElements();
  }

  function CardLayoutProducts() {
    revealElements();
  }

  Swiper.use([Pagination$1]);

  function CardLayoutProductDetailsSlider() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      selector: '.CardLayoutProductDetailsSlider'
    },
        el = _ref.el;

    var transitionSpeed = 300;
    var swiperTarget = el.getAttribute('id');
    var leftButtonEl = document.getElementById('control-left-' + swiperTarget);
    var rightButtonEl = document.getElementById('control-right-' + swiperTarget);
    var contentSwiper = new Swiper(el, {
      effect: 'slide',
      speed: transitionSpeed,
      slidesPerView: 'auto',
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      pagination: {
        el: '#pagination-' + swiperTarget,
        type: 'progressbar'
      },
      navigation: {
        nextEl: rightButtonEl,
        prevEl: leftButtonEl
      }
    });
    revealElements();
    return {
      destroy: function destroy() {
        contentSwiper.detachEvents();
        contentSwiper.destroy();
      }
    };
  }

  function ContentCards() {
    revealElements();
  }

  function FeatureContentLayout() {}

  function FeaturedContent() {
    revealElements();
  }

  var uaParser = createCommonjsModule(function (module, exports) {
  /*!
   * UAParser.js v0.7.21
   * Lightweight JavaScript-based User-Agent string parser
   * https://github.com/faisalman/ua-parser-js
   *
   * Copyright © 2012-2019 Faisal Salman <f@faisalman.com>
   * Licensed under MIT License
   */

  (function (window, undefined$1) {

      //////////////
      // Constants
      /////////////


      var LIBVERSION  = '0.7.21',
          EMPTY       = '',
          UNKNOWN     = '?',
          FUNC_TYPE   = 'function',
          OBJ_TYPE    = 'object',
          STR_TYPE    = 'string',
          MAJOR       = 'major', // deprecated
          MODEL       = 'model',
          NAME        = 'name',
          TYPE        = 'type',
          VENDOR      = 'vendor',
          VERSION     = 'version',
          ARCHITECTURE= 'architecture',
          CONSOLE     = 'console',
          MOBILE      = 'mobile',
          TABLET      = 'tablet',
          SMARTTV     = 'smarttv',
          WEARABLE    = 'wearable',
          EMBEDDED    = 'embedded';


      ///////////
      // Helper
      //////////


      var util = {
          extend : function (regexes, extensions) {
              var mergedRegexes = {};
              for (var i in regexes) {
                  if (extensions[i] && extensions[i].length % 2 === 0) {
                      mergedRegexes[i] = extensions[i].concat(regexes[i]);
                  } else {
                      mergedRegexes[i] = regexes[i];
                  }
              }
              return mergedRegexes;
          },
          has : function (str1, str2) {
            if (typeof str1 === "string") {
              return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
            } else {
              return false;
            }
          },
          lowerize : function (str) {
              return str.toLowerCase();
          },
          major : function (version) {
              return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g,'').split(".")[0] : undefined$1;
          },
          trim : function (str) {
            return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
          }
      };


      ///////////////
      // Map helper
      //////////////


      var mapper = {

          rgx : function (ua, arrays) {

              var i = 0, j, k, p, q, matches, match;

              // loop through all regexes maps
              while (i < arrays.length && !matches) {

                  var regex = arrays[i],       // even sequence (0,2,4,..)
                      props = arrays[i + 1];   // odd sequence (1,3,5,..)
                  j = k = 0;

                  // try matching uastring with regexes
                  while (j < regex.length && !matches) {

                      matches = regex[j++].exec(ua);

                      if (!!matches) {
                          for (p = 0; p < props.length; p++) {
                              match = matches[++k];
                              q = props[p];
                              // check if given property is actually array
                              if (typeof q === OBJ_TYPE && q.length > 0) {
                                  if (q.length == 2) {
                                      if (typeof q[1] == FUNC_TYPE) {
                                          // assign modified match
                                          this[q[0]] = q[1].call(this, match);
                                      } else {
                                          // assign given value, ignore regex match
                                          this[q[0]] = q[1];
                                      }
                                  } else if (q.length == 3) {
                                      // check whether function or regex
                                      if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                          // call function (usually string mapper)
                                          this[q[0]] = match ? q[1].call(this, match, q[2]) : undefined$1;
                                      } else {
                                          // sanitize match using given regex
                                          this[q[0]] = match ? match.replace(q[1], q[2]) : undefined$1;
                                      }
                                  } else if (q.length == 4) {
                                          this[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined$1;
                                  }
                              } else {
                                  this[q] = match ? match : undefined$1;
                              }
                          }
                      }
                  }
                  i += 2;
              }
          },

          str : function (str, map) {

              for (var i in map) {
                  // check if array
                  if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                      for (var j = 0; j < map[i].length; j++) {
                          if (util.has(map[i][j], str)) {
                              return (i === UNKNOWN) ? undefined$1 : i;
                          }
                      }
                  } else if (util.has(map[i], str)) {
                      return (i === UNKNOWN) ? undefined$1 : i;
                  }
              }
              return str;
          }
      };


      ///////////////
      // String map
      //////////////


      var maps = {

          browser : {
              oldsafari : {
                  version : {
                      '1.0'   : '/8',
                      '1.2'   : '/1',
                      '1.3'   : '/3',
                      '2.0'   : '/412',
                      '2.0.2' : '/416',
                      '2.0.3' : '/417',
                      '2.0.4' : '/419',
                      '?'     : '/'
                  }
              }
          },

          device : {
              amazon : {
                  model : {
                      'Fire Phone' : ['SD', 'KF']
                  }
              },
              sprint : {
                  model : {
                      'Evo Shift 4G' : '7373KT'
                  },
                  vendor : {
                      'HTC'       : 'APA',
                      'Sprint'    : 'Sprint'
                  }
              }
          },

          os : {
              windows : {
                  version : {
                      'ME'        : '4.90',
                      'NT 3.11'   : 'NT3.51',
                      'NT 4.0'    : 'NT4.0',
                      '2000'      : 'NT 5.0',
                      'XP'        : ['NT 5.1', 'NT 5.2'],
                      'Vista'     : 'NT 6.0',
                      '7'         : 'NT 6.1',
                      '8'         : 'NT 6.2',
                      '8.1'       : 'NT 6.3',
                      '10'        : ['NT 6.4', 'NT 10.0'],
                      'RT'        : 'ARM'
                  }
              }
          }
      };


      //////////////
      // Regex map
      /////////////


      var regexes = {

          browser : [[

              // Presto based
              /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
              /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
              /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
              /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80
              ], [NAME, VERSION], [

              /(opios)[\/\s]+([\w\.]+)/i                                          // Opera mini on iphone >= 8.0
              ], [[NAME, 'Opera Mini'], VERSION], [

              /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
              ], [[NAME, 'Opera'], VERSION], [

              // Mixed
              /(kindle)\/([\w\.]+)/i,                                             // Kindle
              /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]*)/i,
                                                                                  // Lunascape/Maxthon/Netfront/Jasmine/Blazer
              // Trident based
              /(avant\s|iemobile|slim)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                  // Avant/IEMobile/SlimBrowser
              /(bidubrowser|baidubrowser)[\/\s]?([\w\.]+)/i,                      // Baidu Browser
              /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

              // Webkit/KHTML based
              /(rekonq)\/([\w\.]*)/i,                                             // Rekonq
              /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon)\/([\w\.-]+)/i
                                                                                  // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser/QupZilla/Falkon
              ], [NAME, VERSION], [

              /(konqueror)\/([\w\.]+)/i                                           // Konqueror
              ], [[NAME, 'Konqueror'], VERSION], [

              /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
              ], [[NAME, 'IE'], VERSION], [

              /(edge|edgios|edga|edg)\/((\d+)?[\w\.]+)/i                          // Microsoft Edge
              ], [[NAME, 'Edge'], VERSION], [

              /(yabrowser)\/([\w\.]+)/i                                           // Yandex
              ], [[NAME, 'Yandex'], VERSION], [

              /(Avast)\/([\w\.]+)/i                                               // Avast Secure Browser
              ], [[NAME, 'Avast Secure Browser'], VERSION], [

              /(AVG)\/([\w\.]+)/i                                                 // AVG Secure Browser
              ], [[NAME, 'AVG Secure Browser'], VERSION], [

              /(puffin)\/([\w\.]+)/i                                              // Puffin
              ], [[NAME, 'Puffin'], VERSION], [

              /(focus)\/([\w\.]+)/i                                               // Firefox Focus
              ], [[NAME, 'Firefox Focus'], VERSION], [

              /(opt)\/([\w\.]+)/i                                                 // Opera Touch
              ], [[NAME, 'Opera Touch'], VERSION], [

              /((?:[\s\/])uc?\s?browser|(?:juc.+)ucweb)[\/\s]?([\w\.]+)/i         // UCBrowser
              ], [[NAME, 'UCBrowser'], VERSION], [

              /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
              ], [[NAME, /_/g, ' '], VERSION], [

              /(windowswechat qbcore)\/([\w\.]+)/i                                // WeChat Desktop for Windows Built-in Browser
              ], [[NAME, 'WeChat(Win) Desktop'], VERSION], [

              /(micromessenger)\/([\w\.]+)/i                                      // WeChat
              ], [[NAME, 'WeChat'], VERSION], [

              /(brave)\/([\w\.]+)/i                                               // Brave browser
              ], [[NAME, 'Brave'], VERSION], [

              /(qqbrowserlite)\/([\w\.]+)/i                                       // QQBrowserLite
              ], [NAME, VERSION], [

              /(QQ)\/([\d\.]+)/i                                                  // QQ, aka ShouQ
              ], [NAME, VERSION], [

              /m?(qqbrowser)[\/\s]?([\w\.]+)/i                                    // QQBrowser
              ], [NAME, VERSION], [

              /(baiduboxapp)[\/\s]?([\w\.]+)/i                                    // Baidu App
              ], [NAME, VERSION], [

              /(2345Explorer)[\/\s]?([\w\.]+)/i                                   // 2345 Browser
              ], [NAME, VERSION], [

              /(MetaSr)[\/\s]?([\w\.]+)/i                                         // SouGouBrowser
              ], [NAME], [

              /(LBBROWSER)/i                                                      // LieBao Browser
              ], [NAME], [

              /xiaomi\/miuibrowser\/([\w\.]+)/i                                   // MIUI Browser
              ], [VERSION, [NAME, 'MIUI Browser']], [

              /;fbav\/([\w\.]+);/i                                                // Facebook App for iOS & Android
              ], [VERSION, [NAME, 'Facebook']], [

              /safari\s(line)\/([\w\.]+)/i,                                       // Line App for iOS
              /android.+(line)\/([\w\.]+)\/iab/i                                  // Line App for Android
              ], [NAME, VERSION], [

              /headlesschrome(?:\/([\w\.]+)|\s)/i                                 // Chrome Headless
              ], [VERSION, [NAME, 'Chrome Headless']], [

              /\swv\).+(chrome)\/([\w\.]+)/i                                      // Chrome WebView
              ], [[NAME, /(.+)/, '$1 WebView'], VERSION], [

              /((?:oculus|samsung)browser)\/([\w\.]+)/i
              ], [[NAME, /(.+(?:g|us))(.+)/, '$1 $2'], VERSION], [                // Oculus / Samsung Browser

              /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i        // Android Browser
              ], [VERSION, [NAME, 'Android Browser']], [

              /(sailfishbrowser)\/([\w\.]+)/i                                     // Sailfish Browser
              ], [[NAME, 'Sailfish Browser'], VERSION], [

              /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i
                                                                                  // Chrome/OmniWeb/Arora/Tizen/Nokia
              ], [NAME, VERSION], [

              /(dolfin)\/([\w\.]+)/i                                              // Dolphin
              ], [[NAME, 'Dolphin'], VERSION], [

              /(qihu|qhbrowser|qihoobrowser|360browser)/i                         // 360
              ], [[NAME, '360 Browser']], [

              /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
              ], [[NAME, 'Chrome'], VERSION], [

              /(coast)\/([\w\.]+)/i                                               // Opera Coast
              ], [[NAME, 'Opera Coast'], VERSION], [

              /fxios\/([\w\.-]+)/i                                                // Firefox for iOS
              ], [VERSION, [NAME, 'Firefox']], [

              /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
              ], [VERSION, [NAME, 'Mobile Safari']], [

              /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
              ], [VERSION, NAME], [

              /webkit.+?(gsa)\/([\w\.]+).+?(mobile\s?safari|safari)(\/[\w\.]+)/i  // Google Search Appliance on iOS
              ], [[NAME, 'GSA'], VERSION], [

              /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
              ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

              /(webkit|khtml)\/([\w\.]+)/i
              ], [NAME, VERSION], [

              // Gecko based
              /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
              ], [[NAME, 'Netscape'], VERSION], [
              /(swiftfox)/i,                                                      // Swiftfox
              /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                  // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
              /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([\w\.-]+)$/i,

                                                                                  // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
              /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

              // Other
              /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,
                                                                                  // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir
              /(links)\s\(([\w\.]+)/i,                                            // Links
              /(gobrowser)\/?([\w\.]*)/i,                                         // GoBrowser
              /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
              /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
              ], [NAME, VERSION]
          ],

          cpu : [[

              /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
              ], [[ARCHITECTURE, 'amd64']], [

              /(ia32(?=;))/i                                                      // IA32 (quicktime)
              ], [[ARCHITECTURE, util.lowerize]], [

              /((?:i[346]|x)86)[;\)]/i                                            // IA32
              ], [[ARCHITECTURE, 'ia32']], [

              // PocketPC mistakenly identified as PowerPC
              /windows\s(ce|mobile);\sppc;/i
              ], [[ARCHITECTURE, 'arm']], [

              /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
              ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

              /(sun4\w)[;\)]/i                                                    // SPARC
              ], [[ARCHITECTURE, 'sparc']], [

              /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+[;l]))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                  // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
              ], [[ARCHITECTURE, util.lowerize]]
          ],

          device : [[

              /\((ipad|playbook);[\w\s\),;-]+(rim|apple)/i                        // iPad/PlayBook
              ], [MODEL, VENDOR, [TYPE, TABLET]], [

              /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
              ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

              /(apple\s{0,1}tv)/i                                                 // Apple TV
              ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple'], [TYPE, SMARTTV]], [

              /(archos)\s(gamepad2?)/i,                                           // Archos
              /(hp).+(touchpad)/i,                                                // HP TouchPad
              /(hp).+(tablet)/i,                                                  // HP Tablet
              /(kindle)\/([\w\.]+)/i,                                             // Kindle
              /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
              /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
              ], [VENDOR, MODEL, [TYPE, TABLET]], [

              /(kf[A-z]+)\sbuild\/.+silk\//i                                      // Kindle Fire HD
              ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
              /(sd|kf)[0349hijorstuw]+\sbuild\/.+silk\//i                         // Fire Phone
              ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [
              /android.+aft([bms])\sbuild/i                                       // Fire TV
              ], [MODEL, [VENDOR, 'Amazon'], [TYPE, SMARTTV]], [

              /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
              ], [MODEL, VENDOR, [TYPE, MOBILE]], [
              /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
              ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

              /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
              /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[\s_-]?([\w-]*)/i,
                                                                                  // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron
              /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
              /(asus)-?(\w+)/i                                                    // Asus
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [
              /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
              ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                  // Asus Tablets
              /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone|p00c)/i
              ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

              /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
              /(sony)?(?:sgp.+)\sbuild\//i
              ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
              /android.+\s([c-g]\d{4}|so[-l]\w+)(?=\sbuild\/|\).+chrome\/(?![1-6]{0,1}\d\.))/i
              ], [MODEL, [VENDOR, 'Sony'], [TYPE, MOBILE]], [

              /\s(ouya)\s/i,                                                      // Ouya
              /(nintendo)\s([wids3u]+)/i                                          // Nintendo
              ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

              /android.+;\s(shield)\sbuild/i                                      // Nvidia
              ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

              /(playstation\s[34portablevi]+)/i                                   // Playstation
              ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

              /(sprint\s(\w+))/i                                                  // Sprint Phones
              ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

              /(htc)[;_\s-]+([\w\s]+(?=\)|\sbuild)|\w+)/i,                        // HTC
              /(zte)-(\w*)/i,                                                     // ZTE
              /(alcatel|geeksphone|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]*)/i
                                                                                  // Alcatel/GeeksPhone/Nexian/Panasonic/Sony
              ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

              /(nexus\s9)/i                                                       // HTC Nexus 9
              ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

              /d\/huawei([\w\s-]+)[;\)]/i,
              /(nexus\s6p|vog-l29|ane-lx1|eml-l29)/i                              // Huawei
              ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]], [

              /android.+(bah2?-a?[lw]\d{2})/i                                     // Huawei MediaPad
              ], [MODEL, [VENDOR, 'Huawei'], [TYPE, TABLET]], [

              /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [

              /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
              ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
              /(kin\.[onetw]{3})/i                                                // Microsoft Kin
              ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                  // Motorola
              /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?:?(\s4g)?)[\w\s]+build\//i,
              /mot[\s-]?(\w*)/i,
              /(XT\d{3,4}) build\//i,
              /(nexus\s6)/i
              ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
              /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
              ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

              /hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i            // HbbTV devices
              ], [[VENDOR, util.trim], [MODEL, util.trim], [TYPE, SMARTTV]], [

              /hbbtv.+maple;(\d+)/i
              ], [[MODEL, /^/, 'SmartTV'], [VENDOR, 'Samsung'], [TYPE, SMARTTV]], [

              /\(dtv[\);].+(aquos)/i                                              // Sharp
              ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [

              /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
              /((SM-T\w+))/i
              ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
              /smart-tv.+(samsung)/i
              ], [VENDOR, [TYPE, SMARTTV], MODEL], [
              /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
              /(sam[sung]*)[\s-]*(\w+-?[\w-]*)/i,
              /sec-((sgh\w+))/i
              ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [

              /sie-(\w*)/i                                                        // Siemens
              ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

              /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
              /(nokia)[\s_-]?([\w-]*)/i
              ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

              /android[x\d\.\s;]+\s([ab][1-7]\-?[0178a]\d\d?)/i                   // Acer
              ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

              /android.+([vl]k\-?\d{3})\s+build/i                                 // LG Tablet
              ], [MODEL, [VENDOR, 'LG'], [TYPE, TABLET]], [
              /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
              ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
              /(lg) netcast\.tv/i                                                 // LG SmartTV
              ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
              /(nexus\s[45])/i,                                                   // LG
              /lg[e;\s\/-]+(\w*)/i,
              /android.+lg(\-?[\d\w]+)\s+build/i
              ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

              /(lenovo)\s?(s(?:5000|6000)(?:[\w-]+)|tab(?:[\s\w]+))/i             // Lenovo tablets
              ], [VENDOR, MODEL, [TYPE, TABLET]], [
              /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
              ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [
              /(lenovo)[_\s-]?([\w-]+)/i
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [

              /linux;.+((jolla));/i                                               // Jolla
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [

              /((pebble))app\/[\d\.]+\s/i                                         // Pebble
              ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

              /android.+;\s(oppo)\s?([\w\s]+)\sbuild/i                            // OPPO
              ], [VENDOR, MODEL, [TYPE, MOBILE]], [

              /crkey/i                                                            // Google Chromecast
              ], [[MODEL, 'Chromecast'], [VENDOR, 'Google'], [TYPE, SMARTTV]], [

              /android.+;\s(glass)\s\d/i                                          // Google Glass
              ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

              /android.+;\s(pixel c)[\s)]/i                                       // Google Pixel C
              ], [MODEL, [VENDOR, 'Google'], [TYPE, TABLET]], [

              /android.+;\s(pixel( [23])?( xl)?)[\s)]/i                              // Google Pixel
              ], [MODEL, [VENDOR, 'Google'], [TYPE, MOBILE]], [

              /android.+;\s(\w+)\s+build\/hm\1/i,                                 // Xiaomi Hongmi 'numeric' models
              /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
              /android.+(mi[\s\-_]*(?:a\d|one|one[\s_]plus|note lte)?[\s_]*(?:\d?\w?)[\s_]*(?:plus)?)\s+build/i,    
                                                                                  // Xiaomi Mi
              /android.+(redmi[\s\-_]*(?:note)?(?:[\s_]*[\w\s]+))\s+build/i       // Redmi Phones
              ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [
              /android.+(mi[\s\-_]*(?:pad)(?:[\s_]*[\w\s]+))\s+build/i            // Mi Pad tablets
              ],[[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, TABLET]], [
              /android.+;\s(m[1-5]\snote)\sbuild/i                                // Meizu
              ], [MODEL, [VENDOR, 'Meizu'], [TYPE, MOBILE]], [
              /(mz)-([\w-]{2,})/i
              ], [[VENDOR, 'Meizu'], MODEL, [TYPE, MOBILE]], [

              /android.+a000(1)\s+build/i,                                        // OnePlus
              /android.+oneplus\s(a\d{4})[\s)]/i
              ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

              /android.+[;\/]\s*(RCT[\d\w]+)\s+build/i                            // RCA Tablets
              ], [MODEL, [VENDOR, 'RCA'], [TYPE, TABLET]], [

              /android.+[;\/\s]+(Venue[\d\s]{2,7})\s+build/i                      // Dell Venue Tablets
              ], [MODEL, [VENDOR, 'Dell'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(Q[T|M][\d\w]+)\s+build/i                         // Verizon Tablet
              ], [MODEL, [VENDOR, 'Verizon'], [TYPE, TABLET]], [

              /android.+[;\/]\s+(Barnes[&\s]+Noble\s+|BN[RT])(V?.*)\s+build/i     // Barnes & Noble Tablet
              ], [[VENDOR, 'Barnes & Noble'], MODEL, [TYPE, TABLET]], [

              /android.+[;\/]\s+(TM\d{3}.*\b)\s+build/i                           // Barnes & Noble Tablet
              ], [MODEL, [VENDOR, 'NuVision'], [TYPE, TABLET]], [

              /android.+;\s(k88)\sbuild/i                                         // ZTE K Series Tablet
              ], [MODEL, [VENDOR, 'ZTE'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(gen\d{3})\s+build.*49h/i                         // Swiss GEN Mobile
              ], [MODEL, [VENDOR, 'Swiss'], [TYPE, MOBILE]], [

              /android.+[;\/]\s*(zur\d{3})\s+build/i                              // Swiss ZUR Tablet
              ], [MODEL, [VENDOR, 'Swiss'], [TYPE, TABLET]], [

              /android.+[;\/]\s*((Zeki)?TB.*\b)\s+build/i                         // Zeki Tablets
              ], [MODEL, [VENDOR, 'Zeki'], [TYPE, TABLET]], [

              /(android).+[;\/]\s+([YR]\d{2})\s+build/i,
              /android.+[;\/]\s+(Dragon[\-\s]+Touch\s+|DT)(\w{5})\sbuild/i        // Dragon Touch Tablet
              ], [[VENDOR, 'Dragon Touch'], MODEL, [TYPE, TABLET]], [

              /android.+[;\/]\s*(NS-?\w{0,9})\sbuild/i                            // Insignia Tablets
              ], [MODEL, [VENDOR, 'Insignia'], [TYPE, TABLET]], [

              /android.+[;\/]\s*((NX|Next)-?\w{0,9})\s+build/i                    // NextBook Tablets
              ], [MODEL, [VENDOR, 'NextBook'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(Xtreme\_)?(V(1[045]|2[015]|30|40|60|7[05]|90))\s+build/i
              ], [[VENDOR, 'Voice'], MODEL, [TYPE, MOBILE]], [                    // Voice Xtreme Phones

              /android.+[;\/]\s*(LVTEL\-)?(V1[12])\s+build/i                     // LvTel Phones
              ], [[VENDOR, 'LvTel'], MODEL, [TYPE, MOBILE]], [

              /android.+;\s(PH-1)\s/i
              ], [MODEL, [VENDOR, 'Essential'], [TYPE, MOBILE]], [                // Essential PH-1

              /android.+[;\/]\s*(V(100MD|700NA|7011|917G).*\b)\s+build/i          // Envizen Tablets
              ], [MODEL, [VENDOR, 'Envizen'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(Le[\s\-]+Pan)[\s\-]+(\w{1,9})\s+build/i          // Le Pan Tablets
              ], [VENDOR, MODEL, [TYPE, TABLET]], [

              /android.+[;\/]\s*(Trio[\s\-]*.*)\s+build/i                         // MachSpeed Tablets
              ], [MODEL, [VENDOR, 'MachSpeed'], [TYPE, TABLET]], [

              /android.+[;\/]\s*(Trinity)[\-\s]*(T\d{3})\s+build/i                // Trinity Tablets
              ], [VENDOR, MODEL, [TYPE, TABLET]], [

              /android.+[;\/]\s*TU_(1491)\s+build/i                               // Rotor Tablets
              ], [MODEL, [VENDOR, 'Rotor'], [TYPE, TABLET]], [

              /android.+(KS(.+))\s+build/i                                        // Amazon Kindle Tablets
              ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [

              /android.+(Gigaset)[\s\-]+(Q\w{1,9})\s+build/i                      // Gigaset Tablets
              ], [VENDOR, MODEL, [TYPE, TABLET]], [

              /\s(tablet|tab)[;\/]/i,                                             // Unidentifiable Tablet
              /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
              ], [[TYPE, util.lowerize], VENDOR, MODEL], [

              /[\s\/\(](smart-?tv)[;\)]/i                                         // SmartTV
              ], [[TYPE, SMARTTV]], [

              /(android[\w\.\s\-]{0,9});.+build/i                                 // Generic Android Device
              ], [MODEL, [VENDOR, 'Generic']]
          ],

          engine : [[

              /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
              ], [VERSION, [NAME, 'EdgeHTML']], [

              /webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i                         // Blink
              ], [VERSION, [NAME, 'Blink']], [

              /(presto)\/([\w\.]+)/i,                                             // Presto
              /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i,     
                                                                                  // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m/Goanna
              /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
              /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
              ], [NAME, VERSION], [

              /rv\:([\w\.]{1,9}).+(gecko)/i                                       // Gecko
              ], [VERSION, NAME]
          ],

          os : [[

              // Windows based
              /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
              ], [NAME, VERSION], [
              /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
              /(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s\w]*)/i,                   // Windows Phone
              /(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
              ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
              /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
              ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

              // Mobile/Embedded OS
              /\((bb)(10);/i                                                      // BlackBerry 10
              ], [[NAME, 'BlackBerry'], VERSION], [
              /(blackberry)\w*\/?([\w\.]*)/i,                                     // Blackberry
              /(tizen|kaios)[\/\s]([\w\.]+)/i,                                    // Tizen/KaiOS
              /(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|sailfish|contiki)[\/\s-]?([\w\.]*)/i
                                                                                  // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki/Sailfish OS
              ], [NAME, VERSION], [
              /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]*)/i                  // Symbian
              ], [[NAME, 'Symbian'], VERSION], [
              /\((series40);/i                                                    // Series 40
              ], [NAME], [
              /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
              ], [[NAME, 'Firefox OS'], VERSION], [

              // Console
              /(nintendo|playstation)\s([wids34portablevu]+)/i,                   // Nintendo/Playstation

              // GNU/Linux based
              /(mint)[\/\s\(]?(\w*)/i,                                            // Mint
              /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
              /(joli|[kxln]?ubuntu|debian|suse|opensuse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]*)/i,
                                                                                  // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                  // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
              /(hurd|linux)\s?([\w\.]*)/i,                                        // Hurd/Linux
              /(gnu)\s?([\w\.]*)/i                                                // GNU
              ], [NAME, VERSION], [

              /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
              ], [[NAME, 'Chromium OS'], VERSION],[

              // Solaris
              /(sunos)\s?([\w\.\d]*)/i                                            // Solaris
              ], [[NAME, 'Solaris'], VERSION], [

              // BSD based
              /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]*)/i                    // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
              ], [NAME, VERSION],[

              /(haiku)\s(\w+)/i                                                   // Haiku
              ], [NAME, VERSION],[

              /cfnetwork\/.+darwin/i,
              /ip[honead]{2,4}(?:.*os\s([\w]+)\slike\smac|;\sopera)/i             // iOS
              ], [[VERSION, /_/g, '.'], [NAME, 'iOS']], [

              /(mac\sos\sx)\s?([\w\s\.]*)/i,
              /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
              ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

              // Other
              /((?:open)?solaris)[\/\s-]?([\w\.]*)/i,                             // Solaris
              /(aix)\s((\d)(?=\.|\)|\s)[\w\.])*/i,                                // AIX
              /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms|fuchsia)/i,
                                                                                  // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS/Fuchsia
              /(unix)\s?([\w\.]*)/i                                               // UNIX
              ], [NAME, VERSION]
          ]
      };


      /////////////////
      // Constructor
      ////////////////
      var UAParser = function (uastring, extensions) {

          if (typeof uastring === 'object') {
              extensions = uastring;
              uastring = undefined$1;
          }

          if (!(this instanceof UAParser)) {
              return new UAParser(uastring, extensions).getResult();
          }

          var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
          var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;

          this.getBrowser = function () {
              var browser = { name: undefined$1, version: undefined$1 };
              mapper.rgx.call(browser, ua, rgxmap.browser);
              browser.major = util.major(browser.version); // deprecated
              return browser;
          };
          this.getCPU = function () {
              var cpu = { architecture: undefined$1 };
              mapper.rgx.call(cpu, ua, rgxmap.cpu);
              return cpu;
          };
          this.getDevice = function () {
              var device = { vendor: undefined$1, model: undefined$1, type: undefined$1 };
              mapper.rgx.call(device, ua, rgxmap.device);
              return device;
          };
          this.getEngine = function () {
              var engine = { name: undefined$1, version: undefined$1 };
              mapper.rgx.call(engine, ua, rgxmap.engine);
              return engine;
          };
          this.getOS = function () {
              var os = { name: undefined$1, version: undefined$1 };
              mapper.rgx.call(os, ua, rgxmap.os);
              return os;
          };
          this.getResult = function () {
              return {
                  ua      : this.getUA(),
                  browser : this.getBrowser(),
                  engine  : this.getEngine(),
                  os      : this.getOS(),
                  device  : this.getDevice(),
                  cpu     : this.getCPU()
              };
          };
          this.getUA = function () {
              return ua;
          };
          this.setUA = function (uastring) {
              ua = uastring;
              return this;
          };
          return this;
      };

      UAParser.VERSION = LIBVERSION;
      UAParser.BROWSER = {
          NAME    : NAME,
          MAJOR   : MAJOR, // deprecated
          VERSION : VERSION
      };
      UAParser.CPU = {
          ARCHITECTURE : ARCHITECTURE
      };
      UAParser.DEVICE = {
          MODEL   : MODEL,
          VENDOR  : VENDOR,
          TYPE    : TYPE,
          CONSOLE : CONSOLE,
          MOBILE  : MOBILE,
          SMARTTV : SMARTTV,
          TABLET  : TABLET,
          WEARABLE: WEARABLE,
          EMBEDDED: EMBEDDED
      };
      UAParser.ENGINE = {
          NAME    : NAME,
          VERSION : VERSION
      };
      UAParser.OS = {
          NAME    : NAME,
          VERSION : VERSION
      };

      ///////////
      // Export
      //////////


      // check js environment
      {
          // nodejs env
          if ( module.exports) {
              exports = module.exports = UAParser;
          }
          exports.UAParser = UAParser;
      }

      // jQuery/Zepto specific (optional)
      // Note:
      //   In AMD env the global scope should be kept clean, but jQuery is an exception.
      //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
      //   and we should catch that.
      var $ = window && (window.jQuery || window.Zepto);
      if ($ && !$.ua) {
          var parser = new UAParser();
          $.ua = parser.getResult();
          $.ua.get = function () {
              return parser.getUA();
          };
          $.ua.set = function (uastring) {
              parser.setUA(uastring);
              var result = parser.getResult();
              for (var prop in result) {
                  $.ua[prop] = result[prop];
              }
          };
      }

  })(typeof window === 'object' ? window : commonjsGlobal);
  });

  Swiper.use([Autoplay$1, EffectFade]);

  var ContentLayoutCarousel = function ContentLayoutCarousel() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        el = _ref.el;

    var autoplayDelay = 5000;
    var transitionSpeed = 300;
    var singleSlideClass = 'ContentLayoutCarousel--singleSlide';
    var bgSwiperEl = el.querySelector('.ContentLayoutCarousel-backgroundContainer .swiper-container');
    var contentSwiperEl = el.querySelector('.ContentLayoutCarousel-contentPanel .swiper-container');
    var SliderSwiperEl = el.querySelector('.ContentLayoutCarousel-contentPanel .swiper-wrapper');
    var SliderActiveEl = el.querySelector('.ContentLayoutCarousel-contentPanel .swiper-slide-active');
    var leftButtonEl = el.querySelector('.ContentLayoutCarousel-navArrowButton-left');
    var paginationContainerEl = el.querySelector('.ContentLayoutCarousel-paginationContainer');
    var rightButtonEl = el.querySelector('.ContentLayoutCarousel-navArrowButton-right');
    var browserInfo = new uaParser().getBrowser();
    var isAutoplayRunning = true;

    var isSingleSlide = function () {
      if (el.classList.contains(singleSlideClass) || contentSwiperEl.querySelector('.swiper-wrapper').children.length < 2) {
        el.classList.add(singleSlideClass);
        return true;
      }
    }();

    var bgSwiper = new Swiper(bgSwiperEl, {
      effect: 'fade',
      fadeEffect: {
        crossFade: true
      }
    });
    var contentSwiper = new Swiper(contentSwiperEl, {
      // NOTE: Auto height does not work on IE11.
      allowTouchMove: !isSingleSlide,
      autoHeight: !(browserInfo.name === 'IE' && /^11/.test(browserInfo.version)),
      autoplay: isSingleSlide ? false : {
        delay: autoplayDelay
      },
      effect: 'fade',
      fadeEffect: {
        crossFade: true
      },
      loop: true,
      speed: transitionSpeed
    });

    var updateProgressBars = function updateProgressBars() {
      paginationContainerEl.querySelectorAll('.ContentLayoutCarousel-paginationButton-progressBar').forEach(function (barEl, i) {
        var isActiveIndex = i === contentSwiper.realIndex;
        barEl.style.transition = isActiveIndex && isAutoplayRunning ? "width ".concat(autoplayDelay + transitionSpeed, "ms linear") : 'none';
        barEl.style.width = isActiveIndex ? '100%' : 0;
      });
    };

    var old = 0;

    var setSwiperHeightForIE = function setSwiperHeightForIE() {
      if (browserInfo.name === 'IE' && /^11/.test(browserInfo.version) && !isSingleSlide) {
        SliderActiveEl = contentSwiperEl.querySelector('.swiper-slide-active');

        if (SliderActiveEl) {
          SliderActiveEl.style.height = 'auto';
          SliderSwiperEl.style.height = 'auto';

          if (old != contentSwiper.realIndex) {
            SliderSwiperEl.style.height = SliderActiveEl.clientHeight + 'px';
            old = contentSwiper.realIndex;
          }
        }
      }
    };

    leftButtonEl.addEventListener('click', leftButtonEl.handleClick = function () {
      contentSwiper.autoplay.stop();
      contentSwiper.slidePrev();
    });
    rightButtonEl.addEventListener('click', rightButtonEl.handleClick = function () {
      contentSwiper.autoplay.stop();
      contentSwiper.slideNext();
    });
    contentSwiper.on('slideChange', function () {
      bgSwiper.slideTo(contentSwiper.realIndex);
      updateProgressBars();
    });
    contentSwiper.on('transitionEnd', function () {
      //console.log('*** contentSwiper.realIndex', contentSwiper.realIndex);
      setSwiperHeightForIE();
    });
    contentSwiper.on('autoplayStop', function () {
      return isAutoplayRunning = false;
    });
    paginationContainerEl.children.forEach(function (child, i) {
      return child.addEventListener('click', child.handleClick = function () {
        contentSwiper.autoplay.stop();
        contentSwiper.slideToLoop(i);
      });
    });
    setSwiperHeightForIE();
    updateProgressBars();
    return {
      destroy: function destroy() {
        bgSwiper.destroy();
        contentSwiper.detachEvents();
        contentSwiper.destroy();
        leftButtonEl.removeEventListener('click', leftButtonEl.handleClick);
        rightButtonEl.removeEventListener('click', rightButtonEl.handleClick);
        paginationContainerEl.children.forEach(function (child) {
          return child.removeEventListener('click', child.handleClick);
        });
      }
    };
  };

  ContentLayoutCarousel.defaultSelector = '.ContentLayoutCarousel';

  ContentLayoutCarousel.initAll = function () {
    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref2$selector = _ref2.selector,
        selector = _ref2$selector === void 0 ? ContentLayoutCarousel.defaultSelector : _ref2$selector;

    return _toConsumableArray(document.querySelectorAll(selector)).map(function (el) {
      return ContentLayoutCarousel({
        el: el
      });
    });
  };

  var choices = createCommonjsModule(function (module, exports) {
  /*! choices.js v9.0.1 | © 2019 Josh Johnson | https://github.com/jshjohnson/Choices#readme */
  (function webpackUniversalModuleDefinition(root, factory) {
  	module.exports = factory();
  })(window, function() {
  return /******/ (function(modules) { // webpackBootstrap
  /******/ 	// The module cache
  /******/ 	var installedModules = {};
  /******/
  /******/ 	// The require function
  /******/ 	function __webpack_require__(moduleId) {
  /******/
  /******/ 		// Check if module is in cache
  /******/ 		if(installedModules[moduleId]) {
  /******/ 			return installedModules[moduleId].exports;
  /******/ 		}
  /******/ 		// Create a new module (and put it into the cache)
  /******/ 		var module = installedModules[moduleId] = {
  /******/ 			i: moduleId,
  /******/ 			l: false,
  /******/ 			exports: {}
  /******/ 		};
  /******/
  /******/ 		// Execute the module function
  /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
  /******/
  /******/ 		// Flag the module as loaded
  /******/ 		module.l = true;
  /******/
  /******/ 		// Return the exports of the module
  /******/ 		return module.exports;
  /******/ 	}
  /******/
  /******/
  /******/ 	// expose the modules object (__webpack_modules__)
  /******/ 	__webpack_require__.m = modules;
  /******/
  /******/ 	// expose the module cache
  /******/ 	__webpack_require__.c = installedModules;
  /******/
  /******/ 	// define getter function for harmony exports
  /******/ 	__webpack_require__.d = function(exports, name, getter) {
  /******/ 		if(!__webpack_require__.o(exports, name)) {
  /******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
  /******/ 		}
  /******/ 	};
  /******/
  /******/ 	// define __esModule on exports
  /******/ 	__webpack_require__.r = function(exports) {
  /******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
  /******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
  /******/ 		}
  /******/ 		Object.defineProperty(exports, '__esModule', { value: true });
  /******/ 	};
  /******/
  /******/ 	// create a fake namespace object
  /******/ 	// mode & 1: value is a module id, require it
  /******/ 	// mode & 2: merge all properties of value into the ns
  /******/ 	// mode & 4: return value when already ns object
  /******/ 	// mode & 8|1: behave like require
  /******/ 	__webpack_require__.t = function(value, mode) {
  /******/ 		if(mode & 1) value = __webpack_require__(value);
  /******/ 		if(mode & 8) return value;
  /******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
  /******/ 		var ns = Object.create(null);
  /******/ 		__webpack_require__.r(ns);
  /******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
  /******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
  /******/ 		return ns;
  /******/ 	};
  /******/
  /******/ 	// getDefaultExport function for compatibility with non-harmony modules
  /******/ 	__webpack_require__.n = function(module) {
  /******/ 		var getter = module && module.__esModule ?
  /******/ 			function getDefault() { return module['default']; } :
  /******/ 			function getModuleExports() { return module; };
  /******/ 		__webpack_require__.d(getter, 'a', getter);
  /******/ 		return getter;
  /******/ 	};
  /******/
  /******/ 	// Object.prototype.hasOwnProperty.call
  /******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
  /******/
  /******/ 	// __webpack_public_path__
  /******/ 	__webpack_require__.p = "/public/assets/scripts/";
  /******/
  /******/
  /******/ 	// Load entry module and return exports
  /******/ 	return __webpack_require__(__webpack_require__.s = 4);
  /******/ })
  /************************************************************************/
  /******/ ([
  /* 0 */
  /***/ (function(module, exports, __webpack_require__) {


  var isMergeableObject = function isMergeableObject(value) {
  	return isNonNullObject(value)
  		&& !isSpecial(value)
  };

  function isNonNullObject(value) {
  	return !!value && typeof value === 'object'
  }

  function isSpecial(value) {
  	var stringValue = Object.prototype.toString.call(value);

  	return stringValue === '[object RegExp]'
  		|| stringValue === '[object Date]'
  		|| isReactElement(value)
  }

  // see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
  var canUseSymbol = typeof Symbol === 'function' && Symbol.for;
  var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7;

  function isReactElement(value) {
  	return value.$$typeof === REACT_ELEMENT_TYPE
  }

  function emptyTarget(val) {
  	return Array.isArray(val) ? [] : {}
  }

  function cloneUnlessOtherwiseSpecified(value, options) {
  	return (options.clone !== false && options.isMergeableObject(value))
  		? deepmerge(emptyTarget(value), value, options)
  		: value
  }

  function defaultArrayMerge(target, source, options) {
  	return target.concat(source).map(function(element) {
  		return cloneUnlessOtherwiseSpecified(element, options)
  	})
  }

  function getMergeFunction(key, options) {
  	if (!options.customMerge) {
  		return deepmerge
  	}
  	var customMerge = options.customMerge(key);
  	return typeof customMerge === 'function' ? customMerge : deepmerge
  }

  function getEnumerableOwnPropertySymbols(target) {
  	return Object.getOwnPropertySymbols
  		? Object.getOwnPropertySymbols(target).filter(function(symbol) {
  			return target.propertyIsEnumerable(symbol)
  		})
  		: []
  }

  function getKeys(target) {
  	return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target))
  }

  // Protects from prototype poisoning and unexpected merging up the prototype chain.
  function propertyIsUnsafe(target, key) {
  	try {
  		return (key in target) // Properties are safe to merge if they don't exist in the target yet,
  			&& !(Object.hasOwnProperty.call(target, key) // unsafe if they exist up the prototype chain,
  				&& Object.propertyIsEnumerable.call(target, key)) // and also unsafe if they're nonenumerable.
  	} catch (unused) {
  		// Counterintuitively, it's safe to merge any property on a target that causes the `in` operator to throw.
  		// This happens when trying to copy an object in the source over a plain string in the target.
  		return false
  	}
  }

  function mergeObject(target, source, options) {
  	var destination = {};
  	if (options.isMergeableObject(target)) {
  		getKeys(target).forEach(function(key) {
  			destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
  		});
  	}
  	getKeys(source).forEach(function(key) {
  		if (propertyIsUnsafe(target, key)) {
  			return
  		}

  		if (!options.isMergeableObject(source[key]) || !target[key]) {
  			destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
  		} else {
  			destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
  		}
  	});
  	return destination
  }

  function deepmerge(target, source, options) {
  	options = options || {};
  	options.arrayMerge = options.arrayMerge || defaultArrayMerge;
  	options.isMergeableObject = options.isMergeableObject || isMergeableObject;
  	// cloneUnlessOtherwiseSpecified is added to `options` so that custom arrayMerge()
  	// implementations can use it. The caller may not replace it.
  	options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;

  	var sourceIsArray = Array.isArray(source);
  	var targetIsArray = Array.isArray(target);
  	var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

  	if (!sourceAndTargetTypesMatch) {
  		return cloneUnlessOtherwiseSpecified(source, options)
  	} else if (sourceIsArray) {
  		return options.arrayMerge(target, source, options)
  	} else {
  		return mergeObject(target, source, options)
  	}
  }

  deepmerge.all = function deepmergeAll(array, options) {
  	if (!Array.isArray(array)) {
  		throw new Error('first argument should be an array')
  	}

  	return array.reduce(function(prev, next) {
  		return deepmerge(prev, next, options)
  	}, {})
  };

  var deepmerge_1 = deepmerge;

  module.exports = deepmerge_1;


  /***/ }),
  /* 1 */
  /***/ (function(module, __webpack_exports__, __webpack_require__) {
  /* WEBPACK VAR INJECTION */(function(global, module) {/* harmony import */ var _ponyfill_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
  /* global window */


  var root;

  if (typeof self !== 'undefined') {
    root = self;
  } else if (typeof window !== 'undefined') {
    root = window;
  } else if (typeof global !== 'undefined') {
    root = global;
  } else {
    root = module;
  }

  var result = Object(_ponyfill_js__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"])(root);
  /* harmony default export */ __webpack_exports__["a"] = (result);

  /* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(5), __webpack_require__(6)(module)));

  /***/ }),
  /* 2 */
  /***/ (function(module, exports, __webpack_require__) {

  /*!
   * Fuse.js v3.4.5 - Lightweight fuzzy-search (http://fusejs.io)
   * 
   * Copyright (c) 2012-2017 Kirollos Risk (http://kiro.me)
   * All Rights Reserved. Apache Software License 2.0
   * 
   * http://www.apache.org/licenses/LICENSE-2.0
   */
  !function(e,t){ module.exports=t();}(this,function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=1)}([function(e,t){e.exports=function(e){return Array.isArray?Array.isArray(e):"[object Array]"===Object.prototype.toString.call(e)};},function(e,t,n){function r(e){return (r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function o(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r);}}var i=n(2),a=n(8),s=n(0),c=function(){function e(t,n){var r=n.location,o=void 0===r?0:r,i=n.distance,s=void 0===i?100:i,c=n.threshold,h=void 0===c?.6:c,l=n.maxPatternLength,u=void 0===l?32:l,f=n.caseSensitive,d=void 0!==f&&f,v=n.tokenSeparator,p=void 0===v?/ +/g:v,g=n.findAllMatches,y=void 0!==g&&g,m=n.minMatchCharLength,k=void 0===m?1:m,S=n.id,x=void 0===S?null:S,b=n.keys,M=void 0===b?[]:b,_=n.shouldSort,L=void 0===_||_,w=n.getFn,A=void 0===w?a:w,C=n.sortFn,I=void 0===C?function(e,t){return e.score-t.score}:C,O=n.tokenize,j=void 0!==O&&O,P=n.matchAllTokens,F=void 0!==P&&P,T=n.includeMatches,z=void 0!==T&&T,E=n.includeScore,K=void 0!==E&&E,$=n.verbose,J=void 0!==$&&$;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.options={location:o,distance:s,threshold:h,maxPatternLength:u,isCaseSensitive:d,tokenSeparator:p,findAllMatches:y,minMatchCharLength:k,id:x,keys:M,includeMatches:z,includeScore:K,shouldSort:L,getFn:A,sortFn:I,verbose:J,tokenize:j,matchAllTokens:F},this.setCollection(t);}var t,n;return t=e,(n=[{key:"setCollection",value:function(e){return this.list=e,e}},{key:"search",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{limit:!1};this._log('---------\nSearch pattern: "'.concat(e,'"'));var n=this._prepareSearchers(e),r=n.tokenSearchers,o=n.fullSearcher,i=this._search(r,o),a=i.weights,s=i.results;return this._computeScore(a,s),this.options.shouldSort&&this._sort(s),t.limit&&"number"==typeof t.limit&&(s=s.slice(0,t.limit)),this._format(s)}},{key:"_prepareSearchers",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=[];if(this.options.tokenize)for(var n=e.split(this.options.tokenSeparator),r=0,o=n.length;r<o;r+=1)t.push(new i(n[r],this.options));return {tokenSearchers:t,fullSearcher:new i(e,this.options)}}},{key:"_search",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[],t=arguments.length>1?arguments[1]:void 0,n=this.list,r={},o=[];if("string"==typeof n[0]){for(var i=0,a=n.length;i<a;i+=1)this._analyze({key:"",value:n[i],record:i,index:i},{resultMap:r,results:o,tokenSearchers:e,fullSearcher:t});return {weights:null,results:o}}for(var s={},c=0,h=n.length;c<h;c+=1)for(var l=n[c],u=0,f=this.options.keys.length;u<f;u+=1){var d=this.options.keys[u];if("string"!=typeof d){if(s[d.name]={weight:1-d.weight||1},d.weight<=0||d.weight>1)throw new Error("Key weight has to be > 0 and <= 1");d=d.name;}else s[d]={weight:1};this._analyze({key:d,value:this.options.getFn(l,d),record:l,index:c},{resultMap:r,results:o,tokenSearchers:e,fullSearcher:t});}return {weights:s,results:o}}},{key:"_analyze",value:function(e,t){var n=e.key,r=e.arrayIndex,o=void 0===r?-1:r,i=e.value,a=e.record,c=e.index,h=t.tokenSearchers,l=void 0===h?[]:h,u=t.fullSearcher,f=void 0===u?[]:u,d=t.resultMap,v=void 0===d?{}:d,p=t.results,g=void 0===p?[]:p;if(null!=i){var y=!1,m=-1,k=0;if("string"==typeof i){this._log("\nKey: ".concat(""===n?"-":n));var S=f.search(i);if(this._log('Full text: "'.concat(i,'", score: ').concat(S.score)),this.options.tokenize){for(var x=i.split(this.options.tokenSeparator),b=[],M=0;M<l.length;M+=1){var _=l[M];this._log('\nPattern: "'.concat(_.pattern,'"'));for(var L=!1,w=0;w<x.length;w+=1){var A=x[w],C=_.search(A),I={};C.isMatch?(I[A]=C.score,y=!0,L=!0,b.push(C.score)):(I[A]=1,this.options.matchAllTokens||b.push(1)),this._log('Token: "'.concat(A,'", score: ').concat(I[A]));}L&&(k+=1);}m=b[0];for(var O=b.length,j=1;j<O;j+=1)m+=b[j];m/=O,this._log("Token score average:",m);}var P=S.score;m>-1&&(P=(P+m)/2),this._log("Score average:",P);var F=!this.options.tokenize||!this.options.matchAllTokens||k>=l.length;if(this._log("\nCheck Matches: ".concat(F)),(y||S.isMatch)&&F){var T=v[c];T?T.output.push({key:n,arrayIndex:o,value:i,score:P,matchedIndices:S.matchedIndices}):(v[c]={item:a,output:[{key:n,arrayIndex:o,value:i,score:P,matchedIndices:S.matchedIndices}]},g.push(v[c]));}}else if(s(i))for(var z=0,E=i.length;z<E;z+=1)this._analyze({key:n,arrayIndex:z,value:i[z],record:a,index:c},{resultMap:v,results:g,tokenSearchers:l,fullSearcher:f});}}},{key:"_computeScore",value:function(e,t){this._log("\n\nComputing score:\n");for(var n=0,r=t.length;n<r;n+=1){for(var o=t[n].output,i=o.length,a=1,s=1,c=0;c<i;c+=1){var h=e?e[o[c].key].weight:1,l=(1===h?o[c].score:o[c].score||.001)*h;1!==h?s=Math.min(s,l):(o[c].nScore=l,a*=l);}t[n].score=1===s?a:s,this._log(t[n]);}}},{key:"_sort",value:function(e){this._log("\n\nSorting...."),e.sort(this.options.sortFn);}},{key:"_format",value:function(e){var t=[];if(this.options.verbose){var n=[];this._log("\n\nOutput:\n\n",JSON.stringify(e,function(e,t){if("object"===r(t)&&null!==t){if(-1!==n.indexOf(t))return;n.push(t);}return t})),n=null;}var o=[];this.options.includeMatches&&o.push(function(e,t){var n=e.output;t.matches=[];for(var r=0,o=n.length;r<o;r+=1){var i=n[r];if(0!==i.matchedIndices.length){var a={indices:i.matchedIndices,value:i.value};i.key&&(a.key=i.key),i.hasOwnProperty("arrayIndex")&&i.arrayIndex>-1&&(a.arrayIndex=i.arrayIndex),t.matches.push(a);}}}),this.options.includeScore&&o.push(function(e,t){t.score=e.score;});for(var i=0,a=e.length;i<a;i+=1){var s=e[i];if(this.options.id&&(s.item=this.options.getFn(s.item,this.options.id)[0]),o.length){for(var c={item:s.item},h=0,l=o.length;h<l;h+=1)o[h](s,c);t.push(c);}else t.push(s.item);}return t}},{key:"_log",value:function(){var e;this.options.verbose&&(e=console).log.apply(e,arguments);}}])&&o(t.prototype,n),e}();e.exports=c;},function(e,t,n){function r(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r);}}var o=n(3),i=n(4),a=n(7),s=function(){function e(t,n){var r=n.location,o=void 0===r?0:r,i=n.distance,s=void 0===i?100:i,c=n.threshold,h=void 0===c?.6:c,l=n.maxPatternLength,u=void 0===l?32:l,f=n.isCaseSensitive,d=void 0!==f&&f,v=n.tokenSeparator,p=void 0===v?/ +/g:v,g=n.findAllMatches,y=void 0!==g&&g,m=n.minMatchCharLength,k=void 0===m?1:m;!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.options={location:o,distance:s,threshold:h,maxPatternLength:u,isCaseSensitive:d,tokenSeparator:p,findAllMatches:y,minMatchCharLength:k},this.pattern=this.options.isCaseSensitive?t:t.toLowerCase(),this.pattern.length<=u&&(this.patternAlphabet=a(this.pattern));}var t,n;return t=e,(n=[{key:"search",value:function(e){if(this.options.isCaseSensitive||(e=e.toLowerCase()),this.pattern===e)return {isMatch:!0,score:0,matchedIndices:[[0,e.length-1]]};var t=this.options,n=t.maxPatternLength,r=t.tokenSeparator;if(this.pattern.length>n)return o(e,this.pattern,r);var a=this.options,s=a.location,c=a.distance,h=a.threshold,l=a.findAllMatches,u=a.minMatchCharLength;return i(e,this.pattern,this.patternAlphabet,{location:s,distance:c,threshold:h,findAllMatches:l,minMatchCharLength:u})}}])&&r(t.prototype,n),e}();e.exports=s;},function(e,t){var n=/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;e.exports=function(e,t){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:/ +/g,o=new RegExp(t.replace(n,"\\$&").replace(r,"|")),i=e.match(o),a=!!i,s=[];if(a)for(var c=0,h=i.length;c<h;c+=1){var l=i[c];s.push([e.indexOf(l),l.length-1]);}return {score:a?.5:1,isMatch:a,matchedIndices:s}};},function(e,t,n){var r=n(5),o=n(6);e.exports=function(e,t,n,i){for(var a=i.location,s=void 0===a?0:a,c=i.distance,h=void 0===c?100:c,l=i.threshold,u=void 0===l?.6:l,f=i.findAllMatches,d=void 0!==f&&f,v=i.minMatchCharLength,p=void 0===v?1:v,g=s,y=e.length,m=u,k=e.indexOf(t,g),S=t.length,x=[],b=0;b<y;b+=1)x[b]=0;if(-1!==k){var M=r(t,{errors:0,currentLocation:k,expectedLocation:g,distance:h});if(m=Math.min(M,m),-1!==(k=e.lastIndexOf(t,g+S))){var _=r(t,{errors:0,currentLocation:k,expectedLocation:g,distance:h});m=Math.min(_,m);}}k=-1;for(var L=[],w=1,A=S+y,C=1<<S-1,I=0;I<S;I+=1){for(var O=0,j=A;O<j;){r(t,{errors:I,currentLocation:g+j,expectedLocation:g,distance:h})<=m?O=j:A=j,j=Math.floor((A-O)/2+O);}A=j;var P=Math.max(1,g-j+1),F=d?y:Math.min(g+j,y)+S,T=Array(F+2);T[F+1]=(1<<I)-1;for(var z=F;z>=P;z-=1){var E=z-1,K=n[e.charAt(E)];if(K&&(x[E]=1),T[z]=(T[z+1]<<1|1)&K,0!==I&&(T[z]|=(L[z+1]|L[z])<<1|1|L[z+1]),T[z]&C&&(w=r(t,{errors:I,currentLocation:E,expectedLocation:g,distance:h}))<=m){if(m=w,(k=E)<=g)break;P=Math.max(1,2*g-k);}}if(r(t,{errors:I+1,currentLocation:g,expectedLocation:g,distance:h})>m)break;L=T;}return {isMatch:k>=0,score:0===w?.001:w,matchedIndices:o(x,p)}};},function(e,t){e.exports=function(e,t){var n=t.errors,r=void 0===n?0:n,o=t.currentLocation,i=void 0===o?0:o,a=t.expectedLocation,s=void 0===a?0:a,c=t.distance,h=void 0===c?100:c,l=r/e.length,u=Math.abs(s-i);return h?l+u/h:u?1:l};},function(e,t){e.exports=function(){for(var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[],t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:1,n=[],r=-1,o=-1,i=0,a=e.length;i<a;i+=1){var s=e[i];s&&-1===r?r=i:s||-1===r||((o=i-1)-r+1>=t&&n.push([r,o]),r=-1);}return e[i-1]&&i-r>=t&&n.push([r,i-1]),n};},function(e,t){e.exports=function(e){for(var t={},n=e.length,r=0;r<n;r+=1)t[e.charAt(r)]=0;for(var o=0;o<n;o+=1)t[e.charAt(o)]|=1<<n-o-1;return t};},function(e,t,n){var r=n(0);e.exports=function(e,t){return function e(t,n,o){if(n){var i=n.indexOf("."),a=n,s=null;-1!==i&&(a=n.slice(0,i),s=n.slice(i+1));var c=t[a];if(null!=c)if(s||"string"!=typeof c&&"number"!=typeof c)if(r(c))for(var h=0,l=c.length;h<l;h+=1)e(c[h],s,o);else s&&e(c,s,o);else o.push(c.toString());}else o.push(t);return o}(e,t,[])};}])});

  /***/ }),
  /* 3 */
  /***/ (function(module, __webpack_exports__, __webpack_require__) {
  /* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return symbolObservablePonyfill; });
  function symbolObservablePonyfill(root) {
  	var result;
  	var Symbol = root.Symbol;

  	if (typeof Symbol === 'function') {
  		if (Symbol.observable) {
  			result = Symbol.observable;
  		} else {
  			result = Symbol('observable');
  			Symbol.observable = result;
  		}
  	} else {
  		result = '@@observable';
  	}

  	return result;
  }

  /***/ }),
  /* 4 */
  /***/ (function(module, exports, __webpack_require__) {

  module.exports = __webpack_require__(7);


  /***/ }),
  /* 5 */
  /***/ (function(module, exports) {

  var g;

  // This works in non-strict mode
  g = (function() {
  	return this;
  })();

  try {
  	// This works if eval is allowed (see CSP)
  	g = g || new Function("return this")();
  } catch (e) {
  	// This works if the window reference is available
  	if (typeof window === "object") g = window;
  }

  // g can still be undefined, but nothing to do about it...
  // We return undefined, instead of nothing here, so it's
  // easier to handle this case. if(!global) { ...}

  module.exports = g;


  /***/ }),
  /* 6 */
  /***/ (function(module, exports) {

  module.exports = function(originalModule) {
  	if (!originalModule.webpackPolyfill) {
  		var module = Object.create(originalModule);
  		// module.parent = undefined by default
  		if (!module.children) module.children = [];
  		Object.defineProperty(module, "loaded", {
  			enumerable: true,
  			get: function() {
  				return module.l;
  			}
  		});
  		Object.defineProperty(module, "id", {
  			enumerable: true,
  			get: function() {
  				return module.i;
  			}
  		});
  		Object.defineProperty(module, "exports", {
  			enumerable: true
  		});
  		module.webpackPolyfill = 1;
  	}
  	return module;
  };


  /***/ }),
  /* 7 */
  /***/ (function(module, __webpack_exports__, __webpack_require__) {
  __webpack_require__.r(__webpack_exports__);

  // EXTERNAL MODULE: ./node_modules/fuse.js/dist/fuse.js
  var dist_fuse = __webpack_require__(2);
  var fuse_default = /*#__PURE__*/__webpack_require__.n(dist_fuse);

  // EXTERNAL MODULE: ./node_modules/deepmerge/dist/cjs.js
  var cjs = __webpack_require__(0);
  var cjs_default = /*#__PURE__*/__webpack_require__.n(cjs);

  // EXTERNAL MODULE: ./node_modules/symbol-observable/es/index.js
  var es = __webpack_require__(1);

  // CONCATENATED MODULE: ./node_modules/redux/es/redux.js


  /**
   * These are private action types reserved by Redux.
   * For any unknown actions, you must return the current state.
   * If the current state is undefined, you must return the initial state.
   * Do not reference these action types directly in your code.
   */
  var randomString = function randomString() {
    return Math.random().toString(36).substring(7).split('').join('.');
  };

  var ActionTypes = {
    INIT: "@@redux/INIT" + randomString(),
    REPLACE: "@@redux/REPLACE" + randomString(),
    PROBE_UNKNOWN_ACTION: function PROBE_UNKNOWN_ACTION() {
      return "@@redux/PROBE_UNKNOWN_ACTION" + randomString();
    }
  };

  /**
   * @param {any} obj The object to inspect.
   * @returns {boolean} True if the argument appears to be a plain object.
   */
  function isPlainObject(obj) {
    if (typeof obj !== 'object' || obj === null) return false;
    var proto = obj;

    while (Object.getPrototypeOf(proto) !== null) {
      proto = Object.getPrototypeOf(proto);
    }

    return Object.getPrototypeOf(obj) === proto;
  }

  /**
   * Creates a Redux store that holds the state tree.
   * The only way to change the data in the store is to call `dispatch()` on it.
   *
   * There should only be a single store in your app. To specify how different
   * parts of the state tree respond to actions, you may combine several reducers
   * into a single reducer function by using `combineReducers`.
   *
   * @param {Function} reducer A function that returns the next state tree, given
   * the current state tree and the action to handle.
   *
   * @param {any} [preloadedState] The initial state. You may optionally specify it
   * to hydrate the state from the server in universal apps, or to restore a
   * previously serialized user session.
   * If you use `combineReducers` to produce the root reducer function, this must be
   * an object with the same shape as `combineReducers` keys.
   *
   * @param {Function} [enhancer] The store enhancer. You may optionally specify it
   * to enhance the store with third-party capabilities such as middleware,
   * time travel, persistence, etc. The only store enhancer that ships with Redux
   * is `applyMiddleware()`.
   *
   * @returns {Store} A Redux store that lets you read the state, dispatch actions
   * and subscribe to changes.
   */

  function createStore(reducer, preloadedState, enhancer) {
    var _ref2;

    if (typeof preloadedState === 'function' && typeof enhancer === 'function' || typeof enhancer === 'function' && typeof arguments[3] === 'function') {
      throw new Error('It looks like you are passing several store enhancers to ' + 'createStore(). This is not supported. Instead, compose them ' + 'together to a single function.');
    }

    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
      enhancer = preloadedState;
      preloadedState = undefined;
    }

    if (typeof enhancer !== 'undefined') {
      if (typeof enhancer !== 'function') {
        throw new Error('Expected the enhancer to be a function.');
      }

      return enhancer(createStore)(reducer, preloadedState);
    }

    if (typeof reducer !== 'function') {
      throw new Error('Expected the reducer to be a function.');
    }

    var currentReducer = reducer;
    var currentState = preloadedState;
    var currentListeners = [];
    var nextListeners = currentListeners;
    var isDispatching = false;
    /**
     * This makes a shallow copy of currentListeners so we can use
     * nextListeners as a temporary list while dispatching.
     *
     * This prevents any bugs around consumers calling
     * subscribe/unsubscribe in the middle of a dispatch.
     */

    function ensureCanMutateNextListeners() {
      if (nextListeners === currentListeners) {
        nextListeners = currentListeners.slice();
      }
    }
    /**
     * Reads the state tree managed by the store.
     *
     * @returns {any} The current state tree of your application.
     */


    function getState() {
      if (isDispatching) {
        throw new Error('You may not call store.getState() while the reducer is executing. ' + 'The reducer has already received the state as an argument. ' + 'Pass it down from the top reducer instead of reading it from the store.');
      }

      return currentState;
    }
    /**
     * Adds a change listener. It will be called any time an action is dispatched,
     * and some part of the state tree may potentially have changed. You may then
     * call `getState()` to read the current state tree inside the callback.
     *
     * You may call `dispatch()` from a change listener, with the following
     * caveats:
     *
     * 1. The subscriptions are snapshotted just before every `dispatch()` call.
     * If you subscribe or unsubscribe while the listeners are being invoked, this
     * will not have any effect on the `dispatch()` that is currently in progress.
     * However, the next `dispatch()` call, whether nested or not, will use a more
     * recent snapshot of the subscription list.
     *
     * 2. The listener should not expect to see all state changes, as the state
     * might have been updated multiple times during a nested `dispatch()` before
     * the listener is called. It is, however, guaranteed that all subscribers
     * registered before the `dispatch()` started will be called with the latest
     * state by the time it exits.
     *
     * @param {Function} listener A callback to be invoked on every dispatch.
     * @returns {Function} A function to remove this change listener.
     */


    function subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new Error('Expected the listener to be a function.');
      }

      if (isDispatching) {
        throw new Error('You may not call store.subscribe() while the reducer is executing. ' + 'If you would like to be notified after the store has been updated, subscribe from a ' + 'component and invoke store.getState() in the callback to access the latest state. ' + 'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.');
      }

      var isSubscribed = true;
      ensureCanMutateNextListeners();
      nextListeners.push(listener);
      return function unsubscribe() {
        if (!isSubscribed) {
          return;
        }

        if (isDispatching) {
          throw new Error('You may not unsubscribe from a store listener while the reducer is executing. ' + 'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.');
        }

        isSubscribed = false;
        ensureCanMutateNextListeners();
        var index = nextListeners.indexOf(listener);
        nextListeners.splice(index, 1);
      };
    }
    /**
     * Dispatches an action. It is the only way to trigger a state change.
     *
     * The `reducer` function, used to create the store, will be called with the
     * current state tree and the given `action`. Its return value will
     * be considered the **next** state of the tree, and the change listeners
     * will be notified.
     *
     * The base implementation only supports plain object actions. If you want to
     * dispatch a Promise, an Observable, a thunk, or something else, you need to
     * wrap your store creating function into the corresponding middleware. For
     * example, see the documentation for the `redux-thunk` package. Even the
     * middleware will eventually dispatch plain object actions using this method.
     *
     * @param {Object} action A plain object representing “what changed”. It is
     * a good idea to keep actions serializable so you can record and replay user
     * sessions, or use the time travelling `redux-devtools`. An action must have
     * a `type` property which may not be `undefined`. It is a good idea to use
     * string constants for action types.
     *
     * @returns {Object} For convenience, the same action object you dispatched.
     *
     * Note that, if you use a custom middleware, it may wrap `dispatch()` to
     * return something else (for example, a Promise you can await).
     */


    function dispatch(action) {
      if (!isPlainObject(action)) {
        throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
      }

      if (typeof action.type === 'undefined') {
        throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
      }

      if (isDispatching) {
        throw new Error('Reducers may not dispatch actions.');
      }

      try {
        isDispatching = true;
        currentState = currentReducer(currentState, action);
      } finally {
        isDispatching = false;
      }

      var listeners = currentListeners = nextListeners;

      for (var i = 0; i < listeners.length; i++) {
        var listener = listeners[i];
        listener();
      }

      return action;
    }
    /**
     * Replaces the reducer currently used by the store to calculate the state.
     *
     * You might need this if your app implements code splitting and you want to
     * load some of the reducers dynamically. You might also need this if you
     * implement a hot reloading mechanism for Redux.
     *
     * @param {Function} nextReducer The reducer for the store to use instead.
     * @returns {void}
     */


    function replaceReducer(nextReducer) {
      if (typeof nextReducer !== 'function') {
        throw new Error('Expected the nextReducer to be a function.');
      }

      currentReducer = nextReducer; // This action has a similiar effect to ActionTypes.INIT.
      // Any reducers that existed in both the new and old rootReducer
      // will receive the previous state. This effectively populates
      // the new state tree with any relevant data from the old one.

      dispatch({
        type: ActionTypes.REPLACE
      });
    }
    /**
     * Interoperability point for observable/reactive libraries.
     * @returns {observable} A minimal observable of state changes.
     * For more information, see the observable proposal:
     * https://github.com/tc39/proposal-observable
     */


    function observable() {
      var _ref;

      var outerSubscribe = subscribe;
      return _ref = {
        /**
         * The minimal observable subscription method.
         * @param {Object} observer Any object that can be used as an observer.
         * The observer object should have a `next` method.
         * @returns {subscription} An object with an `unsubscribe` method that can
         * be used to unsubscribe the observable from the store, and prevent further
         * emission of values from the observable.
         */
        subscribe: function subscribe(observer) {
          if (typeof observer !== 'object' || observer === null) {
            throw new TypeError('Expected the observer to be an object.');
          }

          function observeState() {
            if (observer.next) {
              observer.next(getState());
            }
          }

          observeState();
          var unsubscribe = outerSubscribe(observeState);
          return {
            unsubscribe: unsubscribe
          };
        }
      }, _ref[es["a" /* default */]] = function () {
        return this;
      }, _ref;
    } // When a store is created, an "INIT" action is dispatched so that every
    // reducer returns their initial state. This effectively populates
    // the initial state tree.


    dispatch({
      type: ActionTypes.INIT
    });
    return _ref2 = {
      dispatch: dispatch,
      subscribe: subscribe,
      getState: getState,
      replaceReducer: replaceReducer
    }, _ref2[es["a" /* default */]] = observable, _ref2;
  }

  function getUndefinedStateErrorMessage(key, action) {
    var actionType = action && action.type;
    var actionDescription = actionType && "action \"" + String(actionType) + "\"" || 'an action';
    return "Given " + actionDescription + ", reducer \"" + key + "\" returned undefined. " + "To ignore an action, you must explicitly return the previous state. " + "If you want this reducer to hold no value, you can return null instead of undefined.";
  }

  function assertReducerShape(reducers) {
    Object.keys(reducers).forEach(function (key) {
      var reducer = reducers[key];
      var initialState = reducer(undefined, {
        type: ActionTypes.INIT
      });

      if (typeof initialState === 'undefined') {
        throw new Error("Reducer \"" + key + "\" returned undefined during initialization. " + "If the state passed to the reducer is undefined, you must " + "explicitly return the initial state. The initial state may " + "not be undefined. If you don't want to set a value for this reducer, " + "you can use null instead of undefined.");
      }

      if (typeof reducer(undefined, {
        type: ActionTypes.PROBE_UNKNOWN_ACTION()
      }) === 'undefined') {
        throw new Error("Reducer \"" + key + "\" returned undefined when probed with a random type. " + ("Don't try to handle " + ActionTypes.INIT + " or other actions in \"redux/*\" ") + "namespace. They are considered private. Instead, you must return the " + "current state for any unknown actions, unless it is undefined, " + "in which case you must return the initial state, regardless of the " + "action type. The initial state may not be undefined, but can be null.");
      }
    });
  }
  /**
   * Turns an object whose values are different reducer functions, into a single
   * reducer function. It will call every child reducer, and gather their results
   * into a single state object, whose keys correspond to the keys of the passed
   * reducer functions.
   *
   * @param {Object} reducers An object whose values correspond to different
   * reducer functions that need to be combined into one. One handy way to obtain
   * it is to use ES6 `import * as reducers` syntax. The reducers may never return
   * undefined for any action. Instead, they should return their initial state
   * if the state passed to them was undefined, and the current state for any
   * unrecognized action.
   *
   * @returns {Function} A reducer function that invokes every reducer inside the
   * passed object, and builds a state object with the same shape.
   */


  function combineReducers(reducers) {
    var reducerKeys = Object.keys(reducers);
    var finalReducers = {};

    for (var i = 0; i < reducerKeys.length; i++) {
      var key = reducerKeys[i];

      if (typeof reducers[key] === 'function') {
        finalReducers[key] = reducers[key];
      }
    }

    var finalReducerKeys = Object.keys(finalReducers); // This is used to make sure we don't warn about the same

    var shapeAssertionError;

    try {
      assertReducerShape(finalReducers);
    } catch (e) {
      shapeAssertionError = e;
    }

    return function combination(state, action) {
      if (state === void 0) {
        state = {};
      }

      if (shapeAssertionError) {
        throw shapeAssertionError;
      }

      var hasChanged = false;
      var nextState = {};

      for (var _i = 0; _i < finalReducerKeys.length; _i++) {
        var _key = finalReducerKeys[_i];
        var reducer = finalReducers[_key];
        var previousStateForKey = state[_key];
        var nextStateForKey = reducer(previousStateForKey, action);

        if (typeof nextStateForKey === 'undefined') {
          var errorMessage = getUndefinedStateErrorMessage(_key, action);
          throw new Error(errorMessage);
        }

        nextState[_key] = nextStateForKey;
        hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
      }

      return hasChanged ? nextState : state;
    };
  }



  // CONCATENATED MODULE: ./src/scripts/reducers/items.js
  var defaultState = [];
  function items_items(state, action) {
    if (state === void 0) {
      state = defaultState;
    }

    switch (action.type) {
      case 'ADD_ITEM':
        {
          // Add object to items array
          var newState = [].concat(state, [{
            id: action.id,
            choiceId: action.choiceId,
            groupId: action.groupId,
            value: action.value,
            label: action.label,
            active: true,
            highlighted: false,
            customProperties: action.customProperties,
            placeholder: action.placeholder || false,
            keyCode: null
          }]);
          return newState.map(function (obj) {
            var item = obj;
            item.highlighted = false;
            return item;
          });
        }

      case 'REMOVE_ITEM':
        {
          // Set item to inactive
          return state.map(function (obj) {
            var item = obj;

            if (item.id === action.id) {
              item.active = false;
            }

            return item;
          });
        }

      case 'HIGHLIGHT_ITEM':
        {
          return state.map(function (obj) {
            var item = obj;

            if (item.id === action.id) {
              item.highlighted = action.highlighted;
            }

            return item;
          });
        }

      default:
        {
          return state;
        }
    }
  }
  // CONCATENATED MODULE: ./src/scripts/reducers/groups.js
  var groups_defaultState = [];
  function groups(state, action) {
    if (state === void 0) {
      state = groups_defaultState;
    }

    switch (action.type) {
      case 'ADD_GROUP':
        {
          return [].concat(state, [{
            id: action.id,
            value: action.value,
            active: action.active,
            disabled: action.disabled
          }]);
        }

      case 'CLEAR_CHOICES':
        {
          return [];
        }

      default:
        {
          return state;
        }
    }
  }
  // CONCATENATED MODULE: ./src/scripts/reducers/choices.js
  var choices_defaultState = [];
  function choices_choices(state, action) {
    if (state === void 0) {
      state = choices_defaultState;
    }

    switch (action.type) {
      case 'ADD_CHOICE':
        {
          /*
              A disabled choice appears in the choice dropdown but cannot be selected
              A selected choice has been added to the passed input's value (added as an item)
              An active choice appears within the choice dropdown
           */
          return [].concat(state, [{
            id: action.id,
            elementId: action.elementId,
            groupId: action.groupId,
            value: action.value,
            label: action.label || action.value,
            disabled: action.disabled || false,
            selected: false,
            active: true,
            score: 9999,
            customProperties: action.customProperties,
            placeholder: action.placeholder || false,
            keyCode: null
          }]);
        }

      case 'ADD_ITEM':
        {
          // If all choices need to be activated
          if (action.activateOptions) {
            return state.map(function (obj) {
              var choice = obj;
              choice.active = action.active;
              return choice;
            });
          } // When an item is added and it has an associated choice,
          // we want to disable it so it can't be chosen again


          if (action.choiceId > -1) {
            return state.map(function (obj) {
              var choice = obj;

              if (choice.id === parseInt(action.choiceId, 10)) {
                choice.selected = true;
              }

              return choice;
            });
          }

          return state;
        }

      case 'REMOVE_ITEM':
        {
          // When an item is removed and it has an associated choice,
          // we want to re-enable it so it can be chosen again
          if (action.choiceId > -1) {
            return state.map(function (obj) {
              var choice = obj;

              if (choice.id === parseInt(action.choiceId, 10)) {
                choice.selected = false;
              }

              return choice;
            });
          }

          return state;
        }

      case 'FILTER_CHOICES':
        {
          return state.map(function (obj) {
            var choice = obj; // Set active state based on whether choice is
            // within filtered results

            choice.active = action.results.some(function (_ref) {
              var item = _ref.item,
                  score = _ref.score;

              if (item.id === choice.id) {
                choice.score = score;
                return true;
              }

              return false;
            });
            return choice;
          });
        }

      case 'ACTIVATE_CHOICES':
        {
          return state.map(function (obj) {
            var choice = obj;
            choice.active = action.active;
            return choice;
          });
        }

      case 'CLEAR_CHOICES':
        {
          return choices_defaultState;
        }

      default:
        {
          return state;
        }
    }
  }
  // CONCATENATED MODULE: ./src/scripts/reducers/general.js
  var general_defaultState = {
    loading: false
  };

  var general = function general(state, action) {
    if (state === void 0) {
      state = general_defaultState;
    }

    switch (action.type) {
      case 'SET_IS_LOADING':
        {
          return {
            loading: action.isLoading
          };
        }

      default:
        {
          return state;
        }
    }
  };

  /* harmony default export */ var reducers_general = (general);
  // CONCATENATED MODULE: ./src/scripts/lib/utils.js
  /**
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  var getRandomNumber = function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  };
  /**
   * @param {number} length
   * @returns {string}
   */

  var generateChars = function generateChars(length) {
    return Array.from({
      length: length
    }, function () {
      return getRandomNumber(0, 36).toString(36);
    }).join('');
  };
  /**
   * @param {HTMLInputElement | HTMLSelectElement} element
   * @param {string} prefix
   * @returns {string}
   */

  var generateId = function generateId(element, prefix) {
    var id = element.id || element.name && element.name + "-" + generateChars(2) || generateChars(4);
    id = id.replace(/(:|\.|\[|\]|,)/g, '');
    id = prefix + "-" + id;
    return id;
  };
  /**
   * @param {any} obj
   * @returns {string}
   */

  var getType = function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
  };
  /**
   * @param {string} type
   * @param {any} obj
   * @returns {boolean}
   */

  var isType = function isType(type, obj) {
    return obj !== undefined && obj !== null && getType(obj) === type;
  };
  /**
   * @param {HTMLElement} element
   * @param {HTMLElement} [wrapper={HTMLDivElement}]
   * @returns {HTMLElement}
   */

  var utils_wrap = function wrap(element, wrapper) {
    if (wrapper === void 0) {
      wrapper = document.createElement('div');
    }

    if (element.nextSibling) {
      element.parentNode.insertBefore(wrapper, element.nextSibling);
    } else {
      element.parentNode.appendChild(wrapper);
    }

    return wrapper.appendChild(element);
  };
  /**
   * @param {Element} startEl
   * @param {string} selector
   * @param {1 | -1} direction
   * @returns {Element | undefined}
   */

  var getAdjacentEl = function getAdjacentEl(startEl, selector, direction) {
    if (direction === void 0) {
      direction = 1;
    }

    if (!(startEl instanceof Element) || typeof selector !== 'string') {
      return undefined;
    }

    var prop = (direction > 0 ? 'next' : 'previous') + "ElementSibling";
    var sibling = startEl[prop];

    while (sibling) {
      if (sibling.matches(selector)) {
        return sibling;
      }

      sibling = sibling[prop];
    }

    return sibling;
  };
  /**
   * @param {Element} element
   * @param {Element} parent
   * @param {-1 | 1} direction
   * @returns {boolean}
   */

  var isScrolledIntoView = function isScrolledIntoView(element, parent, direction) {
    if (direction === void 0) {
      direction = 1;
    }

    if (!element) {
      return false;
    }

    var isVisible;

    if (direction > 0) {
      // In view from bottom
      isVisible = parent.scrollTop + parent.offsetHeight >= element.offsetTop + element.offsetHeight;
    } else {
      // In view from top
      isVisible = element.offsetTop >= parent.scrollTop;
    }

    return isVisible;
  };
  /**
   * @param {any} value
   * @returns {any}
   */

  var sanitise = function sanitise(value) {
    if (typeof value !== 'string') {
      return value;
    }

    return value.replace(/&/g, '&amp;').replace(/>/g, '&rt;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  };
  /**
   * @returns {() => (str: string) => Element}
   */

  var strToEl = function () {
    var tmpEl = document.createElement('div');
    return function (str) {
      var cleanedInput = str.trim();
      tmpEl.innerHTML = cleanedInput;
      var firldChild = tmpEl.children[0];

      while (tmpEl.firstChild) {
        tmpEl.removeChild(tmpEl.firstChild);
      }

      return firldChild;
    };
  }();
  /**
   * @param {{ label?: string, value: string }} a
   * @param {{ label?: string, value: string }} b
   * @returns {number}
   */

  var sortByAlpha = function sortByAlpha(_ref, _ref2) {
    var value = _ref.value,
        _ref$label = _ref.label,
        label = _ref$label === void 0 ? value : _ref$label;
    var value2 = _ref2.value,
        _ref2$label = _ref2.label,
        label2 = _ref2$label === void 0 ? value2 : _ref2$label;
    return label.localeCompare(label2, [], {
      sensitivity: 'base',
      ignorePunctuation: true,
      numeric: true
    });
  };
  /**
   * @param {{ score: number }} a
   * @param {{ score: number }} b
   */

  var sortByScore = function sortByScore(a, b) {
    return a.score - b.score;
  };
  /**
   * @param {HTMLElement} element
   * @param {string} type
   * @param {object} customArgs
   */

  var dispatchEvent = function dispatchEvent(element, type, customArgs) {
    if (customArgs === void 0) {
      customArgs = null;
    }

    var event = new CustomEvent(type, {
      detail: customArgs,
      bubbles: true,
      cancelable: true
    });
    return element.dispatchEvent(event);
  };
  /**
   * @param {array} array
   * @param {any} value
   * @param {string} [key="value"]
   * @returns {boolean}
   */

  var existsInArray = function existsInArray(array, value, key) {
    if (key === void 0) {
      key = 'value';
    }

    return array.some(function (item) {
      if (typeof value === 'string') {
        return item[key] === value.trim();
      }

      return item[key] === value;
    });
  };
  /**
   * @param {any} obj
   * @returns {any}
   */

  var cloneObject = function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  };
  /**
   * Returns an array of keys present on the first but missing on the second object
   * @param {object} a
   * @param {object} b
   * @returns {string[]}
   */

  var diff = function diff(a, b) {
    var aKeys = Object.keys(a).sort();
    var bKeys = Object.keys(b).sort();
    return aKeys.filter(function (i) {
      return bKeys.indexOf(i) < 0;
    });
  };
  // CONCATENATED MODULE: ./src/scripts/reducers/index.js






  var appReducer = combineReducers({
    items: items_items,
    groups: groups,
    choices: choices_choices,
    general: reducers_general
  });

  var reducers_rootReducer = function rootReducer(passedState, action) {
    var state = passedState; // If we are clearing all items, groups and options we reassign
    // state and then pass that state to our proper reducer. This isn't
    // mutating our actual state
    // See: http://stackoverflow.com/a/35641992

    if (action.type === 'CLEAR_ALL') {
      state = undefined;
    } else if (action.type === 'RESET_TO') {
      return cloneObject(action.state);
    }

    return appReducer(state, action);
  };

  /* harmony default export */ var reducers = (reducers_rootReducer);
  // CONCATENATED MODULE: ./src/scripts/store/store.js
  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }



  /**
   * @typedef {import('../../../types/index').Choices.Choice} Choice
   * @typedef {import('../../../types/index').Choices.Group} Group
   * @typedef {import('../../../types/index').Choices.Item} Item
   */

  var store_Store =
  /*#__PURE__*/
  function () {
    function Store() {
      this._store = createStore(reducers, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());
    }
    /**
     * Subscribe store to function call (wrapped Redux method)
     * @param  {Function} onChange Function to trigger when state changes
     * @return
     */


    var _proto = Store.prototype;

    _proto.subscribe = function subscribe(onChange) {
      this._store.subscribe(onChange);
    }
    /**
     * Dispatch event to store (wrapped Redux method)
     * @param  {{ type: string, [x: string]: any }} action Action to trigger
     * @return
     */
    ;

    _proto.dispatch = function dispatch(action) {
      this._store.dispatch(action);
    }
    /**
     * Get store object (wrapping Redux method)
     * @returns {object} State
     */
    ;

    /**
     * Get loading state from store
     * @returns {boolean} Loading State
     */
    _proto.isLoading = function isLoading() {
      return this.state.general.loading;
    }
    /**
     * Get single choice by it's ID
     * @param {string} id
     * @returns {Choice | undefined} Found choice
     */
    ;

    _proto.getChoiceById = function getChoiceById(id) {
      return this.activeChoices.find(function (choice) {
        return choice.id === parseInt(id, 10);
      });
    }
    /**
     * Get group by group id
     * @param  {number} id Group ID
     * @returns {Group | undefined} Group data
     */
    ;

    _proto.getGroupById = function getGroupById(id) {
      return this.groups.find(function (group) {
        return group.id === id;
      });
    };

    _createClass(Store, [{
      key: "state",
      get: function get() {
        return this._store.getState();
      }
      /**
       * Get items from store
       * @returns {Item[]} Item objects
       */

    }, {
      key: "items",
      get: function get() {
        return this.state.items;
      }
      /**
       * Get active items from store
       * @returns {Item[]} Item objects
       */

    }, {
      key: "activeItems",
      get: function get() {
        return this.items.filter(function (item) {
          return item.active === true;
        });
      }
      /**
       * Get highlighted items from store
       * @returns {Item[]} Item objects
       */

    }, {
      key: "highlightedActiveItems",
      get: function get() {
        return this.items.filter(function (item) {
          return item.active && item.highlighted;
        });
      }
      /**
       * Get choices from store
       * @returns {Choice[]} Option objects
       */

    }, {
      key: "choices",
      get: function get() {
        return this.state.choices;
      }
      /**
       * Get active choices from store
       * @returns {Choice[]} Option objects
       */

    }, {
      key: "activeChoices",
      get: function get() {
        return this.choices.filter(function (choice) {
          return choice.active === true;
        });
      }
      /**
       * Get selectable choices from store
       * @returns {Choice[]} Option objects
       */

    }, {
      key: "selectableChoices",
      get: function get() {
        return this.choices.filter(function (choice) {
          return choice.disabled !== true;
        });
      }
      /**
       * Get choices that can be searched (excluding placeholders)
       * @returns {Choice[]} Option objects
       */

    }, {
      key: "searchableChoices",
      get: function get() {
        return this.selectableChoices.filter(function (choice) {
          return choice.placeholder !== true;
        });
      }
      /**
       * Get placeholder choice from store
       * @returns {Choice | undefined} Found placeholder
       */

    }, {
      key: "placeholderChoice",
      get: function get() {
        return [].concat(this.choices).reverse().find(function (choice) {
          return choice.placeholder === true;
        });
      }
      /**
       * Get groups from store
       * @returns {Group[]} Group objects
       */

    }, {
      key: "groups",
      get: function get() {
        return this.state.groups;
      }
      /**
       * Get active groups from store
       * @returns {Group[]} Group objects
       */

    }, {
      key: "activeGroups",
      get: function get() {
        var groups = this.groups,
            choices = this.choices;
        return groups.filter(function (group) {
          var isActive = group.active === true && group.disabled === false;
          var hasActiveOptions = choices.some(function (choice) {
            return choice.active === true && choice.disabled === false;
          });
          return isActive && hasActiveOptions;
        }, []);
      }
    }]);

    return Store;
  }();


  // CONCATENATED MODULE: ./src/scripts/components/dropdown.js
  function dropdown_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function dropdown_createClass(Constructor, protoProps, staticProps) { if (protoProps) dropdown_defineProperties(Constructor.prototype, protoProps); if (staticProps) dropdown_defineProperties(Constructor, staticProps); return Constructor; }

  /**
   * @typedef {import('../../../types/index').Choices.passedElement} passedElement
   * @typedef {import('../../../types/index').Choices.ClassNames} ClassNames
   */
  var Dropdown =
  /*#__PURE__*/
  function () {
    /**
     * @param {{
     *  element: HTMLElement,
     *  type: passedElement['type'],
     *  classNames: ClassNames,
     * }} args
     */
    function Dropdown(_ref) {
      var element = _ref.element,
          type = _ref.type,
          classNames = _ref.classNames;
      this.element = element;
      this.classNames = classNames;
      this.type = type;
      this.isActive = false;
    }
    /**
     * Bottom position of dropdown in viewport coordinates
     * @returns {number} Vertical position
     */


    var _proto = Dropdown.prototype;

    /**
     * Find element that matches passed selector
     * @param {string} selector
     * @returns {HTMLElement | null}
     */
    _proto.getChild = function getChild(selector) {
      return this.element.querySelector(selector);
    }
    /**
     * Show dropdown to user by adding active state class
     * @returns {this}
     */
    ;

    _proto.show = function show() {
      this.element.classList.add(this.classNames.activeState);
      this.element.setAttribute('aria-expanded', 'true');
      this.isActive = true;
      return this;
    }
    /**
     * Hide dropdown from user
     * @returns {this}
     */
    ;

    _proto.hide = function hide() {
      this.element.classList.remove(this.classNames.activeState);
      this.element.setAttribute('aria-expanded', 'false');
      this.isActive = false;
      return this;
    };

    dropdown_createClass(Dropdown, [{
      key: "distanceFromTopWindow",
      get: function get() {
        return this.element.getBoundingClientRect().bottom;
      }
    }]);

    return Dropdown;
  }();


  // CONCATENATED MODULE: ./src/scripts/constants.js

  /**
   * @typedef {import('../../types/index').Choices.ClassNames} ClassNames
   * @typedef {import('../../types/index').Choices.Options} Options
   */

  /** @type {ClassNames} */

  var DEFAULT_CLASSNAMES = {
    containerOuter: 'choices',
    containerInner: 'choices__inner',
    input: 'choices__input',
    inputCloned: 'choices__input--cloned',
    list: 'choices__list',
    listItems: 'choices__list--multiple',
    listSingle: 'choices__list--single',
    listDropdown: 'choices__list--dropdown',
    item: 'choices__item',
    itemSelectable: 'choices__item--selectable',
    itemDisabled: 'choices__item--disabled',
    itemChoice: 'choices__item--choice',
    placeholder: 'choices__placeholder',
    group: 'choices__group',
    groupHeading: 'choices__heading',
    button: 'choices__button',
    activeState: 'is-active',
    focusState: 'is-focused',
    openState: 'is-open',
    disabledState: 'is-disabled',
    highlightedState: 'is-highlighted',
    selectedState: 'is-selected',
    flippedState: 'is-flipped',
    loadingState: 'is-loading',
    noResults: 'has-no-results',
    noChoices: 'has-no-choices'
  };
  /** @type {Options} */

  var DEFAULT_CONFIG = {
    items: [],
    choices: [],
    silent: false,
    renderChoiceLimit: -1,
    maxItemCount: -1,
    addItems: true,
    addItemFilter: null,
    removeItems: true,
    removeItemButton: false,
    editItems: false,
    duplicateItemsAllowed: true,
    delimiter: ',',
    paste: true,
    searchEnabled: true,
    searchChoices: true,
    searchFloor: 1,
    searchResultLimit: 4,
    searchFields: ['label', 'value'],
    position: 'auto',
    resetScrollPosition: true,
    shouldSort: true,
    shouldSortItems: false,
    sorter: sortByAlpha,
    placeholder: true,
    placeholderValue: null,
    searchPlaceholderValue: null,
    prependValue: null,
    appendValue: null,
    renderSelectedChoices: 'auto',
    loadingText: 'Loading...',
    noResultsText: 'No results found',
    noChoicesText: 'No choices to choose from',
    itemSelectText: 'Press to select',
    uniqueItemText: 'Only unique values can be added',
    customAddItemText: 'Only values matching specific conditions can be added',
    addItemText: function addItemText(value) {
      return "Press Enter to add <b>\"" + sanitise(value) + "\"</b>";
    },
    maxItemText: function maxItemText(maxItemCount) {
      return "Only " + maxItemCount + " values can be added";
    },
    valueComparer: function valueComparer(value1, value2) {
      return value1 === value2;
    },
    fuseOptions: {
      includeScore: true
    },
    callbackOnInit: null,
    callbackOnCreateTemplates: null,
    classNames: DEFAULT_CLASSNAMES
  };
  var EVENTS = {
    showDropdown: 'showDropdown',
    hideDropdown: 'hideDropdown',
    change: 'change',
    choice: 'choice',
    search: 'search',
    addItem: 'addItem',
    removeItem: 'removeItem',
    highlightItem: 'highlightItem',
    highlightChoice: 'highlightChoice'
  };
  var ACTION_TYPES = {
    ADD_CHOICE: 'ADD_CHOICE',
    FILTER_CHOICES: 'FILTER_CHOICES',
    ACTIVATE_CHOICES: 'ACTIVATE_CHOICES',
    CLEAR_CHOICES: 'CLEAR_CHOICES',
    ADD_GROUP: 'ADD_GROUP',
    ADD_ITEM: 'ADD_ITEM',
    REMOVE_ITEM: 'REMOVE_ITEM',
    HIGHLIGHT_ITEM: 'HIGHLIGHT_ITEM',
    CLEAR_ALL: 'CLEAR_ALL'
  };
  var KEY_CODES = {
    BACK_KEY: 46,
    DELETE_KEY: 8,
    ENTER_KEY: 13,
    A_KEY: 65,
    ESC_KEY: 27,
    UP_KEY: 38,
    DOWN_KEY: 40,
    PAGE_UP_KEY: 33,
    PAGE_DOWN_KEY: 34
  };
  var TEXT_TYPE = 'text';
  var SELECT_ONE_TYPE = 'select-one';
  var SELECT_MULTIPLE_TYPE = 'select-multiple';
  var SCROLLING_SPEED = 4;
  // CONCATENATED MODULE: ./src/scripts/components/container.js


  /**
   * @typedef {import('../../../types/index').Choices.passedElement} passedElement
   * @typedef {import('../../../types/index').Choices.ClassNames} ClassNames
   */

  var container_Container =
  /*#__PURE__*/
  function () {
    /**
     * @param {{
     *  element: HTMLElement,
     *  type: passedElement['type'],
     *  classNames: ClassNames,
     *  position
     * }} args
     */
    function Container(_ref) {
      var element = _ref.element,
          type = _ref.type,
          classNames = _ref.classNames,
          position = _ref.position;
      this.element = element;
      this.classNames = classNames;
      this.type = type;
      this.position = position;
      this.isOpen = false;
      this.isFlipped = false;
      this.isFocussed = false;
      this.isDisabled = false;
      this.isLoading = false;
      this._onFocus = this._onFocus.bind(this);
      this._onBlur = this._onBlur.bind(this);
    }

    var _proto = Container.prototype;

    _proto.addEventListeners = function addEventListeners() {
      this.element.addEventListener('focus', this._onFocus);
      this.element.addEventListener('blur', this._onBlur);
    };

    _proto.removeEventListeners = function removeEventListeners() {
      this.element.removeEventListener('focus', this._onFocus);
      this.element.removeEventListener('blur', this._onBlur);
    }
    /**
     * Determine whether container should be flipped based on passed
     * dropdown position
     * @param {number} dropdownPos
     * @returns {boolean}
     */
    ;

    _proto.shouldFlip = function shouldFlip(dropdownPos) {
      if (typeof dropdownPos !== 'number') {
        return false;
      } // If flip is enabled and the dropdown bottom position is
      // greater than the window height flip the dropdown.


      var shouldFlip = false;

      if (this.position === 'auto') {
        shouldFlip = !window.matchMedia("(min-height: " + (dropdownPos + 1) + "px)").matches;
      } else if (this.position === 'top') {
        shouldFlip = true;
      }

      return shouldFlip;
    }
    /**
     * @param {string} activeDescendantID
     */
    ;

    _proto.setActiveDescendant = function setActiveDescendant(activeDescendantID) {
      this.element.setAttribute('aria-activedescendant', activeDescendantID);
    };

    _proto.removeActiveDescendant = function removeActiveDescendant() {
      this.element.removeAttribute('aria-activedescendant');
    }
    /**
     * @param {number} dropdownPos
     */
    ;

    _proto.open = function open(dropdownPos) {
      this.element.classList.add(this.classNames.openState);
      this.element.setAttribute('aria-expanded', 'true');
      this.isOpen = true;

      if (this.shouldFlip(dropdownPos)) {
        this.element.classList.add(this.classNames.flippedState);
        this.isFlipped = true;
      }
    };

    _proto.close = function close() {
      this.element.classList.remove(this.classNames.openState);
      this.element.setAttribute('aria-expanded', 'false');
      this.removeActiveDescendant();
      this.isOpen = false; // A dropdown flips if it does not have space within the page

      if (this.isFlipped) {
        this.element.classList.remove(this.classNames.flippedState);
        this.isFlipped = false;
      }
    };

    _proto.focus = function focus() {
      if (!this.isFocussed) {
        this.element.focus();
      }
    };

    _proto.addFocusState = function addFocusState() {
      this.element.classList.add(this.classNames.focusState);
    };

    _proto.removeFocusState = function removeFocusState() {
      this.element.classList.remove(this.classNames.focusState);
    };

    _proto.enable = function enable() {
      this.element.classList.remove(this.classNames.disabledState);
      this.element.removeAttribute('aria-disabled');

      if (this.type === SELECT_ONE_TYPE) {
        this.element.setAttribute('tabindex', '0');
      }

      this.isDisabled = false;
    };

    _proto.disable = function disable() {
      this.element.classList.add(this.classNames.disabledState);
      this.element.setAttribute('aria-disabled', 'true');

      if (this.type === SELECT_ONE_TYPE) {
        this.element.setAttribute('tabindex', '-1');
      }

      this.isDisabled = true;
    }
    /**
     * @param {HTMLElement} element
     */
    ;

    _proto.wrap = function wrap(element) {
      utils_wrap(element, this.element);
    }
    /**
     * @param {Element} element
     */
    ;

    _proto.unwrap = function unwrap(element) {
      // Move passed element outside this element
      this.element.parentNode.insertBefore(element, this.element); // Remove this element

      this.element.parentNode.removeChild(this.element);
    };

    _proto.addLoadingState = function addLoadingState() {
      this.element.classList.add(this.classNames.loadingState);
      this.element.setAttribute('aria-busy', 'true');
      this.isLoading = true;
    };

    _proto.removeLoadingState = function removeLoadingState() {
      this.element.classList.remove(this.classNames.loadingState);
      this.element.removeAttribute('aria-busy');
      this.isLoading = false;
    };

    _proto._onFocus = function _onFocus() {
      this.isFocussed = true;
    };

    _proto._onBlur = function _onBlur() {
      this.isFocussed = false;
    };

    return Container;
  }();


  // CONCATENATED MODULE: ./src/scripts/components/input.js
  function input_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function input_createClass(Constructor, protoProps, staticProps) { if (protoProps) input_defineProperties(Constructor.prototype, protoProps); if (staticProps) input_defineProperties(Constructor, staticProps); return Constructor; }



  /**
   * @typedef {import('../../../types/index').Choices.passedElement} passedElement
   * @typedef {import('../../../types/index').Choices.ClassNames} ClassNames
   */

  var input_Input =
  /*#__PURE__*/
  function () {
    /**
     * @param {{
     *  element: HTMLInputElement,
     *  type: passedElement['type'],
     *  classNames: ClassNames,
     *  preventPaste: boolean
     * }} args
     */
    function Input(_ref) {
      var element = _ref.element,
          type = _ref.type,
          classNames = _ref.classNames,
          preventPaste = _ref.preventPaste;
      this.element = element;
      this.type = type;
      this.classNames = classNames;
      this.preventPaste = preventPaste;
      this.isFocussed = this.element === document.activeElement;
      this.isDisabled = element.disabled;
      this._onPaste = this._onPaste.bind(this);
      this._onInput = this._onInput.bind(this);
      this._onFocus = this._onFocus.bind(this);
      this._onBlur = this._onBlur.bind(this);
    }
    /**
     * @param {string} placeholder
     */


    var _proto = Input.prototype;

    _proto.addEventListeners = function addEventListeners() {
      this.element.addEventListener('paste', this._onPaste);
      this.element.addEventListener('input', this._onInput, {
        passive: true
      });
      this.element.addEventListener('focus', this._onFocus, {
        passive: true
      });
      this.element.addEventListener('blur', this._onBlur, {
        passive: true
      });
    };

    _proto.removeEventListeners = function removeEventListeners() {
      this.element.removeEventListener('input', this._onInput, {
        passive: true
      });
      this.element.removeEventListener('paste', this._onPaste);
      this.element.removeEventListener('focus', this._onFocus, {
        passive: true
      });
      this.element.removeEventListener('blur', this._onBlur, {
        passive: true
      });
    };

    _proto.enable = function enable() {
      this.element.removeAttribute('disabled');
      this.isDisabled = false;
    };

    _proto.disable = function disable() {
      this.element.setAttribute('disabled', '');
      this.isDisabled = true;
    };

    _proto.focus = function focus() {
      if (!this.isFocussed) {
        this.element.focus();
      }
    };

    _proto.blur = function blur() {
      if (this.isFocussed) {
        this.element.blur();
      }
    }
    /**
     * Set value of input to blank
     * @param {boolean} setWidth
     * @returns {this}
     */
    ;

    _proto.clear = function clear(setWidth) {
      if (setWidth === void 0) {
        setWidth = true;
      }

      if (this.element.value) {
        this.element.value = '';
      }

      if (setWidth) {
        this.setWidth();
      }

      return this;
    }
    /**
     * Set the correct input width based on placeholder
     * value or input value
     */
    ;

    _proto.setWidth = function setWidth() {
      // Resize input to contents or placeholder
      var _this$element = this.element,
          style = _this$element.style,
          value = _this$element.value,
          placeholder = _this$element.placeholder;
      style.minWidth = placeholder.length + 1 + "ch";
      style.width = value.length + 1 + "ch";
    }
    /**
     * @param {string} activeDescendantID
     */
    ;

    _proto.setActiveDescendant = function setActiveDescendant(activeDescendantID) {
      this.element.setAttribute('aria-activedescendant', activeDescendantID);
    };

    _proto.removeActiveDescendant = function removeActiveDescendant() {
      this.element.removeAttribute('aria-activedescendant');
    };

    _proto._onInput = function _onInput() {
      if (this.type !== SELECT_ONE_TYPE) {
        this.setWidth();
      }
    }
    /**
     * @param {Event} event
     */
    ;

    _proto._onPaste = function _onPaste(event) {
      if (this.preventPaste) {
        event.preventDefault();
      }
    };

    _proto._onFocus = function _onFocus() {
      this.isFocussed = true;
    };

    _proto._onBlur = function _onBlur() {
      this.isFocussed = false;
    };

    input_createClass(Input, [{
      key: "placeholder",
      set: function set(placeholder) {
        this.element.placeholder = placeholder;
      }
      /**
       * @returns {string}
       */

    }, {
      key: "value",
      get: function get() {
        return sanitise(this.element.value);
      }
      /**
       * @param {string} value
       */
      ,
      set: function set(value) {
        this.element.value = value;
      }
    }]);

    return Input;
  }();


  // CONCATENATED MODULE: ./src/scripts/components/list.js

  /**
   * @typedef {import('../../../types/index').Choices.Choice} Choice
   */

  var list_List =
  /*#__PURE__*/
  function () {
    /**
     * @param {{ element: HTMLElement }} args
     */
    function List(_ref) {
      var element = _ref.element;
      this.element = element;
      this.scrollPos = this.element.scrollTop;
      this.height = this.element.offsetHeight;
    }

    var _proto = List.prototype;

    _proto.clear = function clear() {
      this.element.innerHTML = '';
    }
    /**
     * @param {Element | DocumentFragment} node
     */
    ;

    _proto.append = function append(node) {
      this.element.appendChild(node);
    }
    /**
     * @param {string} selector
     * @returns {Element | null}
     */
    ;

    _proto.getChild = function getChild(selector) {
      return this.element.querySelector(selector);
    }
    /**
     * @returns {boolean}
     */
    ;

    _proto.hasChildren = function hasChildren() {
      return this.element.hasChildNodes();
    };

    _proto.scrollToTop = function scrollToTop() {
      this.element.scrollTop = 0;
    }
    /**
     * @param {Element} element
     * @param {1 | -1} direction
     */
    ;

    _proto.scrollToChildElement = function scrollToChildElement(element, direction) {
      var _this = this;

      if (!element) {
        return;
      }

      var listHeight = this.element.offsetHeight; // Scroll position of dropdown

      var listScrollPosition = this.element.scrollTop + listHeight;
      var elementHeight = element.offsetHeight; // Distance from bottom of element to top of parent

      var elementPos = element.offsetTop + elementHeight; // Difference between the element and scroll position

      var destination = direction > 0 ? this.element.scrollTop + elementPos - listScrollPosition : element.offsetTop;
      requestAnimationFrame(function () {
        _this._animateScroll(destination, direction);
      });
    }
    /**
     * @param {number} scrollPos
     * @param {number} strength
     * @param {number} destination
     */
    ;

    _proto._scrollDown = function _scrollDown(scrollPos, strength, destination) {
      var easing = (destination - scrollPos) / strength;
      var distance = easing > 1 ? easing : 1;
      this.element.scrollTop = scrollPos + distance;
    }
    /**
     * @param {number} scrollPos
     * @param {number} strength
     * @param {number} destination
     */
    ;

    _proto._scrollUp = function _scrollUp(scrollPos, strength, destination) {
      var easing = (scrollPos - destination) / strength;
      var distance = easing > 1 ? easing : 1;
      this.element.scrollTop = scrollPos - distance;
    }
    /**
     * @param {*} destination
     * @param {*} direction
     */
    ;

    _proto._animateScroll = function _animateScroll(destination, direction) {
      var _this2 = this;

      var strength = SCROLLING_SPEED;
      var choiceListScrollTop = this.element.scrollTop;
      var continueAnimation = false;

      if (direction > 0) {
        this._scrollDown(choiceListScrollTop, strength, destination);

        if (choiceListScrollTop < destination) {
          continueAnimation = true;
        }
      } else {
        this._scrollUp(choiceListScrollTop, strength, destination);

        if (choiceListScrollTop > destination) {
          continueAnimation = true;
        }
      }

      if (continueAnimation) {
        requestAnimationFrame(function () {
          _this2._animateScroll(destination, direction);
        });
      }
    };

    return List;
  }();


  // CONCATENATED MODULE: ./src/scripts/components/wrapped-element.js
  function wrapped_element_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function wrapped_element_createClass(Constructor, protoProps, staticProps) { if (protoProps) wrapped_element_defineProperties(Constructor.prototype, protoProps); if (staticProps) wrapped_element_defineProperties(Constructor, staticProps); return Constructor; }


  /**
   * @typedef {import('../../../types/index').Choices.passedElement} passedElement
   * @typedef {import('../../../types/index').Choices.ClassNames} ClassNames
   */

  var wrapped_element_WrappedElement =
  /*#__PURE__*/
  function () {
    /**
     * @param {{
     *  element: HTMLInputElement | HTMLSelectElement,
     *  classNames: ClassNames,
     * }} args
     */
    function WrappedElement(_ref) {
      var element = _ref.element,
          classNames = _ref.classNames;
      this.element = element;
      this.classNames = classNames;

      if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement)) {
        throw new TypeError('Invalid element passed');
      }

      this.isDisabled = false;
    }

    var _proto = WrappedElement.prototype;

    _proto.conceal = function conceal() {
      // Hide passed input
      this.element.classList.add(this.classNames.input);
      this.element.hidden = true; // Remove element from tab index

      this.element.tabIndex = -1; // Backup original styles if any

      var origStyle = this.element.getAttribute('style');

      if (origStyle) {
        this.element.setAttribute('data-choice-orig-style', origStyle);
      }

      this.element.setAttribute('data-choice', 'active');
    };

    _proto.reveal = function reveal() {
      // Reinstate passed element
      this.element.classList.remove(this.classNames.input);
      this.element.hidden = false;
      this.element.removeAttribute('tabindex'); // Recover original styles if any

      var origStyle = this.element.getAttribute('data-choice-orig-style');

      if (origStyle) {
        this.element.removeAttribute('data-choice-orig-style');
        this.element.setAttribute('style', origStyle);
      } else {
        this.element.removeAttribute('style');
      }

      this.element.removeAttribute('data-choice'); // Re-assign values - this is weird, I know
      // @todo Figure out why we need to do this

      this.element.value = this.element.value; // eslint-disable-line no-self-assign
    };

    _proto.enable = function enable() {
      this.element.removeAttribute('disabled');
      this.element.disabled = false;
      this.isDisabled = false;
    };

    _proto.disable = function disable() {
      this.element.setAttribute('disabled', '');
      this.element.disabled = true;
      this.isDisabled = true;
    };

    _proto.triggerEvent = function triggerEvent(eventType, data) {
      dispatchEvent(this.element, eventType, data);
    };

    wrapped_element_createClass(WrappedElement, [{
      key: "isActive",
      get: function get() {
        return this.element.dataset.choice === 'active';
      }
    }, {
      key: "dir",
      get: function get() {
        return this.element.dir;
      }
    }, {
      key: "value",
      get: function get() {
        return this.element.value;
      },
      set: function set(value) {
        // you must define setter here otherwise it will be readonly property
        this.element.value = value;
      }
    }]);

    return WrappedElement;
  }();


  // CONCATENATED MODULE: ./src/scripts/components/wrapped-input.js
  function wrapped_input_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function wrapped_input_createClass(Constructor, protoProps, staticProps) { if (protoProps) wrapped_input_defineProperties(Constructor.prototype, protoProps); if (staticProps) wrapped_input_defineProperties(Constructor, staticProps); return Constructor; }

  function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }


  /**
   * @typedef {import('../../../types/index').Choices.ClassNames} ClassNames
   * @typedef {import('../../../types/index').Choices.Item} Item
   */

  var WrappedInput =
  /*#__PURE__*/
  function (_WrappedElement) {
    _inheritsLoose(WrappedInput, _WrappedElement);

    /**
     * @param {{
     *  element: HTMLInputElement,
     *  classNames: ClassNames,
     *  delimiter: string
     * }} args
     */
    function WrappedInput(_ref) {
      var _this;

      var element = _ref.element,
          classNames = _ref.classNames,
          delimiter = _ref.delimiter;
      _this = _WrappedElement.call(this, {
        element: element,
        classNames: classNames
      }) || this;
      _this.delimiter = delimiter;
      return _this;
    }
    /**
     * @returns {string}
     */


    wrapped_input_createClass(WrappedInput, [{
      key: "value",
      get: function get() {
        return this.element.value;
      }
      /**
       * @param {Item[]} items
       */
      ,
      set: function set(items) {
        var itemValues = items.map(function (_ref2) {
          var value = _ref2.value;
          return value;
        });
        var joinedValues = itemValues.join(this.delimiter);
        this.element.setAttribute('value', joinedValues);
        this.element.value = joinedValues;
      }
    }]);

    return WrappedInput;
  }(wrapped_element_WrappedElement);


  // CONCATENATED MODULE: ./src/scripts/components/wrapped-select.js
  function wrapped_select_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function wrapped_select_createClass(Constructor, protoProps, staticProps) { if (protoProps) wrapped_select_defineProperties(Constructor.prototype, protoProps); if (staticProps) wrapped_select_defineProperties(Constructor, staticProps); return Constructor; }

  function wrapped_select_inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }


  /**
   * @typedef {import('../../../types/index').Choices.ClassNames} ClassNames
   * @typedef {import('../../../types/index').Choices.Item} Item
   * @typedef {import('../../../types/index').Choices.Choice} Choice
   */

  var WrappedSelect =
  /*#__PURE__*/
  function (_WrappedElement) {
    wrapped_select_inheritsLoose(WrappedSelect, _WrappedElement);

    /**
     * @param {{
     *  element: HTMLSelectElement,
     *  classNames: ClassNames,
     *  delimiter: string
     *  template: function
     * }} args
     */
    function WrappedSelect(_ref) {
      var _this;

      var element = _ref.element,
          classNames = _ref.classNames,
          template = _ref.template;
      _this = _WrappedElement.call(this, {
        element: element,
        classNames: classNames
      }) || this;
      _this.template = template;
      return _this;
    }

    var _proto = WrappedSelect.prototype;

    /**
     * @param {DocumentFragment} fragment
     */
    _proto.appendDocFragment = function appendDocFragment(fragment) {
      this.element.innerHTML = '';
      this.element.appendChild(fragment);
    };

    wrapped_select_createClass(WrappedSelect, [{
      key: "placeholderOption",
      get: function get() {
        return this.element.querySelector('option[value=""]') || // Backward compatibility layer for the non-standard placeholder attribute supported in older versions.
        this.element.querySelector('option[placeholder]');
      }
      /**
       * @returns {Element[]}
       */

    }, {
      key: "optionGroups",
      get: function get() {
        return Array.from(this.element.getElementsByTagName('OPTGROUP'));
      }
      /**
       * @returns {Item[] | Choice[]}
       */

    }, {
      key: "options",
      get: function get() {
        return Array.from(this.element.options);
      }
      /**
       * @param {Item[] | Choice[]} options
       */
      ,
      set: function set(options) {
        var _this2 = this;

        var fragment = document.createDocumentFragment();

        var addOptionToFragment = function addOptionToFragment(data) {
          // Create a standard select option
          var option = _this2.template(data); // Append it to fragment


          fragment.appendChild(option);
        }; // Add each list item to list


        options.forEach(function (optionData) {
          return addOptionToFragment(optionData);
        });
        this.appendDocFragment(fragment);
      }
    }]);

    return WrappedSelect;
  }(wrapped_element_WrappedElement);


  // CONCATENATED MODULE: ./src/scripts/components/index.js







  // CONCATENATED MODULE: ./src/scripts/templates.js
  /**
   * Helpers to create HTML elements used by Choices
   * Can be overridden by providing `callbackOnCreateTemplates` option
   * @typedef {import('../../types/index').Choices.Templates} Templates
   * @typedef {import('../../types/index').Choices.ClassNames} ClassNames
   * @typedef {import('../../types/index').Choices.Options} Options
   * @typedef {import('../../types/index').Choices.Item} Item
   * @typedef {import('../../types/index').Choices.Choice} Choice
   * @typedef {import('../../types/index').Choices.Group} Group
   */
  var TEMPLATES =
  /** @type {Templates} */
  {
    /**
     * @param {Partial<ClassNames>} classNames
     * @param {"ltr" | "rtl" | "auto"} dir
     * @param {boolean} isSelectElement
     * @param {boolean} isSelectOneElement
     * @param {boolean} searchEnabled
     * @param {"select-one" | "select-multiple" | "text"} passedElementType
     */
    containerOuter: function containerOuter(_ref, dir, isSelectElement, isSelectOneElement, searchEnabled, passedElementType) {
      var _containerOuter = _ref.containerOuter;
      var div = Object.assign(document.createElement('div'), {
        className: _containerOuter
      });
      div.dataset.type = passedElementType;

      if (dir) {
        div.dir = dir;
      }

      if (isSelectOneElement) {
        div.tabIndex = 0;
      }

      if (isSelectElement) {
        div.setAttribute('role', searchEnabled ? 'combobox' : 'listbox');

        if (searchEnabled) {
          div.setAttribute('aria-autocomplete', 'list');
        }
      }

      div.setAttribute('aria-haspopup', 'true');
      div.setAttribute('aria-expanded', 'false');
      return div;
    },

    /**
     * @param {Partial<ClassNames>} classNames
     */
    containerInner: function containerInner(_ref2) {
      var _containerInner = _ref2.containerInner;
      return Object.assign(document.createElement('div'), {
        className: _containerInner
      });
    },

    /**
     * @param {Partial<ClassNames>} classNames
     * @param {boolean} isSelectOneElement
     */
    itemList: function itemList(_ref3, isSelectOneElement) {
      var list = _ref3.list,
          listSingle = _ref3.listSingle,
          listItems = _ref3.listItems;
      return Object.assign(document.createElement('div'), {
        className: list + " " + (isSelectOneElement ? listSingle : listItems)
      });
    },

    /**
     * @param {Partial<ClassNames>} classNames
     * @param {string} value
     */
    placeholder: function placeholder(_ref4, value) {
      var _placeholder = _ref4.placeholder;
      return Object.assign(document.createElement('div'), {
        className: _placeholder,
        innerHTML: value
      });
    },

    /**
     * @param {Partial<ClassNames>} classNames
     * @param {Item} item
     * @param {boolean} removeItemButton
     */
    item: function item(_ref5, _ref6, removeItemButton) {
      var _item = _ref5.item,
          button = _ref5.button,
          highlightedState = _ref5.highlightedState,
          itemSelectable = _ref5.itemSelectable,
          placeholder = _ref5.placeholder;
      var id = _ref6.id,
          value = _ref6.value,
          label = _ref6.label,
          customProperties = _ref6.customProperties,
          active = _ref6.active,
          disabled = _ref6.disabled,
          highlighted = _ref6.highlighted,
          isPlaceholder = _ref6.placeholder;
      var div = Object.assign(document.createElement('div'), {
        className: _item,
        innerHTML: label
      });
      Object.assign(div.dataset, {
        item: '',
        id: id,
        value: value,
        customProperties: customProperties
      });

      if (active) {
        div.setAttribute('aria-selected', 'true');
      }

      if (disabled) {
        div.setAttribute('aria-disabled', 'true');
      }

      if (isPlaceholder) {
        div.classList.add(placeholder);
      }

      div.classList.add(highlighted ? highlightedState : itemSelectable);

      if (removeItemButton) {
        if (disabled) {
          div.classList.remove(itemSelectable);
        }

        div.dataset.deletable = '';
        /** @todo This MUST be localizable, not hardcoded! */

        var REMOVE_ITEM_TEXT = 'Remove item';
        var removeButton = Object.assign(document.createElement('button'), {
          type: 'button',
          className: button,
          innerHTML: REMOVE_ITEM_TEXT
        });
        removeButton.setAttribute('aria-label', REMOVE_ITEM_TEXT + ": '" + value + "'");
        removeButton.dataset.button = '';
        div.appendChild(removeButton);
      }

      return div;
    },

    /**
     * @param {Partial<ClassNames>} classNames
     * @param {boolean} isSelectOneElement
     */
    choiceList: function choiceList(_ref7, isSelectOneElement) {
      var list = _ref7.list;
      var div = Object.assign(document.createElement('div'), {
        className: list
      });

      if (!isSelectOneElement) {
        div.setAttribute('aria-multiselectable', 'true');
      }

      div.setAttribute('role', 'listbox');
      return div;
    },

    /**
     * @param {Partial<ClassNames>} classNames
     * @param {Group} group
     */
    choiceGroup: function choiceGroup(_ref8, _ref9) {
      var group = _ref8.group,
          groupHeading = _ref8.groupHeading,
          itemDisabled = _ref8.itemDisabled;
      var id = _ref9.id,
          value = _ref9.value,
          disabled = _ref9.disabled;
      var div = Object.assign(document.createElement('div'), {
        className: group + " " + (disabled ? itemDisabled : '')
      });
      div.setAttribute('role', 'group');
      Object.assign(div.dataset, {
        group: '',
        id: id,
        value: value
      });

      if (disabled) {
        div.setAttribute('aria-disabled', 'true');
      }

      div.appendChild(Object.assign(document.createElement('div'), {
        className: groupHeading,
        innerHTML: value
      }));
      return div;
    },

    /**
     * @param {Partial<ClassNames>} classNames
     * @param {Choice} choice
     * @param {Options['itemSelectText']} selectText
     */
    choice: function choice(_ref10, _ref11, selectText) {
      var item = _ref10.item,
          itemChoice = _ref10.itemChoice,
          itemSelectable = _ref10.itemSelectable,
          selectedState = _ref10.selectedState,
          itemDisabled = _ref10.itemDisabled,
          placeholder = _ref10.placeholder;
      var id = _ref11.id,
          value = _ref11.value,
          label = _ref11.label,
          groupId = _ref11.groupId,
          elementId = _ref11.elementId,
          isDisabled = _ref11.disabled,
          isSelected = _ref11.selected,
          isPlaceholder = _ref11.placeholder;
      var div = Object.assign(document.createElement('div'), {
        id: elementId,
        innerHTML: label,
        className: item + " " + itemChoice
      });

      if (isSelected) {
        div.classList.add(selectedState);
      }

      if (isPlaceholder) {
        div.classList.add(placeholder);
      }

      div.setAttribute('role', groupId > 0 ? 'treeitem' : 'option');
      Object.assign(div.dataset, {
        choice: '',
        id: id,
        value: value,
        selectText: selectText
      });

      if (isDisabled) {
        div.classList.add(itemDisabled);
        div.dataset.choiceDisabled = '';
        div.setAttribute('aria-disabled', 'true');
      } else {
        div.classList.add(itemSelectable);
        div.dataset.choiceSelectable = '';
      }

      return div;
    },

    /**
     * @param {Partial<ClassNames>} classNames
     * @param {string} placeholderValue
     */
    input: function input(_ref12, placeholderValue) {
      var _input = _ref12.input,
          inputCloned = _ref12.inputCloned;
      var inp = Object.assign(document.createElement('input'), {
        type: 'text',
        className: _input + " " + inputCloned,
        autocomplete: 'off',
        autocapitalize: 'off',
        spellcheck: false
      });
      inp.setAttribute('role', 'textbox');
      inp.setAttribute('aria-autocomplete', 'list');
      inp.setAttribute('aria-label', placeholderValue);
      return inp;
    },

    /**
     * @param {Partial<ClassNames>} classNames
     */
    dropdown: function dropdown(_ref13) {
      var list = _ref13.list,
          listDropdown = _ref13.listDropdown;
      var div = document.createElement('div');
      div.classList.add(list, listDropdown);
      div.setAttribute('aria-expanded', 'false');
      return div;
    },

    /**
     *
     * @param {Partial<ClassNames>} classNames
     * @param {string} innerHTML
     * @param {"no-choices" | "no-results" | ""} type
     */
    notice: function notice(_ref14, innerHTML, type) {
      var item = _ref14.item,
          itemChoice = _ref14.itemChoice,
          noResults = _ref14.noResults,
          noChoices = _ref14.noChoices;

      if (type === void 0) {
        type = '';
      }

      var classes = [item, itemChoice];

      if (type === 'no-choices') {
        classes.push(noChoices);
      } else if (type === 'no-results') {
        classes.push(noResults);
      }

      return Object.assign(document.createElement('div'), {
        innerHTML: innerHTML,
        className: classes.join(' ')
      });
    },

    /**
     * @param {Item} option
     */
    option: function option(_ref15) {
      var label = _ref15.label,
          value = _ref15.value,
          customProperties = _ref15.customProperties,
          active = _ref15.active,
          disabled = _ref15.disabled;
      var opt = new Option(label, value, false, active);

      if (customProperties) {
        opt.dataset.customProperties = customProperties;
      }

      opt.disabled = disabled;
      return opt;
    }
  };
  // CONCATENATED MODULE: ./src/scripts/actions/choices.js
  /**
   * @typedef {import('redux').Action} Action
   * @typedef {import('../../../types/index').Choices.Choice} Choice
   */

  /**
   * @argument {Choice} choice
   * @returns {Action & Choice}
   */

  var choices_addChoice = function addChoice(_ref) {
    var value = _ref.value,
        label = _ref.label,
        id = _ref.id,
        groupId = _ref.groupId,
        disabled = _ref.disabled,
        elementId = _ref.elementId,
        customProperties = _ref.customProperties,
        placeholder = _ref.placeholder,
        keyCode = _ref.keyCode;
    return {
      type: ACTION_TYPES.ADD_CHOICE,
      value: value,
      label: label,
      id: id,
      groupId: groupId,
      disabled: disabled,
      elementId: elementId,
      customProperties: customProperties,
      placeholder: placeholder,
      keyCode: keyCode
    };
  };
  /**
   * @argument {Choice[]} results
   * @returns {Action & { results: Choice[] }}
   */

  var choices_filterChoices = function filterChoices(results) {
    return {
      type: ACTION_TYPES.FILTER_CHOICES,
      results: results
    };
  };
  /**
   * @argument {boolean} active
   * @returns {Action & { active: boolean }}
   */

  var choices_activateChoices = function activateChoices(active) {
    if (active === void 0) {
      active = true;
    }

    return {
      type: ACTION_TYPES.ACTIVATE_CHOICES,
      active: active
    };
  };
  /**
   * @returns {Action}
   */

  var choices_clearChoices = function clearChoices() {
    return {
      type: ACTION_TYPES.CLEAR_CHOICES
    };
  };
  // CONCATENATED MODULE: ./src/scripts/actions/items.js

  /**
   * @typedef {import('redux').Action} Action
   * @typedef {import('../../../types/index').Choices.Item} Item
   */

  /**
   * @param {Item} item
   * @returns {Action & Item}
   */

  var items_addItem = function addItem(_ref) {
    var value = _ref.value,
        label = _ref.label,
        id = _ref.id,
        choiceId = _ref.choiceId,
        groupId = _ref.groupId,
        customProperties = _ref.customProperties,
        placeholder = _ref.placeholder,
        keyCode = _ref.keyCode;
    return {
      type: ACTION_TYPES.ADD_ITEM,
      value: value,
      label: label,
      id: id,
      choiceId: choiceId,
      groupId: groupId,
      customProperties: customProperties,
      placeholder: placeholder,
      keyCode: keyCode
    };
  };
  /**
   * @param {string} id
   * @param {string} choiceId
   * @returns {Action & { id: string, choiceId: string }}
   */

  var items_removeItem = function removeItem(id, choiceId) {
    return {
      type: ACTION_TYPES.REMOVE_ITEM,
      id: id,
      choiceId: choiceId
    };
  };
  /**
   * @param {string} id
   * @param {boolean} highlighted
   * @returns {Action & { id: string, highlighted: boolean }}
   */

  var items_highlightItem = function highlightItem(id, highlighted) {
    return {
      type: ACTION_TYPES.HIGHLIGHT_ITEM,
      id: id,
      highlighted: highlighted
    };
  };
  // CONCATENATED MODULE: ./src/scripts/actions/groups.js

  /**
   * @typedef {import('redux').Action} Action
   * @typedef {import('../../../types/index').Choices.Group} Group
   */

  /**
   * @param {Group} group
   * @returns {Action & Group}
   */

  var groups_addGroup = function addGroup(_ref) {
    var value = _ref.value,
        id = _ref.id,
        active = _ref.active,
        disabled = _ref.disabled;
    return {
      type: ACTION_TYPES.ADD_GROUP,
      value: value,
      id: id,
      active: active,
      disabled: disabled
    };
  };
  // CONCATENATED MODULE: ./src/scripts/actions/misc.js
  /**
   * @typedef {import('redux').Action} Action
   */

  /**
   * @returns {Action}
   */
  var clearAll = function clearAll() {
    return {
      type: 'CLEAR_ALL'
    };
  };
  /**
   * @param {any} state
   * @returns {Action & { state: object }}
   */

  var resetTo = function resetTo(state) {
    return {
      type: 'RESET_TO',
      state: state
    };
  };
  /**
   * @param {boolean} isLoading
   * @returns {Action & { isLoading: boolean }}
   */

  var setIsLoading = function setIsLoading(isLoading) {
    return {
      type: 'SET_IS_LOADING',
      isLoading: isLoading
    };
  };
  // CONCATENATED MODULE: ./src/scripts/choices.js
  function choices_defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function choices_createClass(Constructor, protoProps, staticProps) { if (protoProps) choices_defineProperties(Constructor.prototype, protoProps); if (staticProps) choices_defineProperties(Constructor, staticProps); return Constructor; }












  /** @see {@link http://browserhacks.com/#hack-acea075d0ac6954f275a70023906050c} */

  var IS_IE11 = '-ms-scroll-limit' in document.documentElement.style && '-ms-ime-align' in document.documentElement.style;
  /**
   * @typedef {import('../../types/index').Choices.Choice} Choice
   * @typedef {import('../../types/index').Choices.Item} Item
   * @typedef {import('../../types/index').Choices.Group} Group
   * @typedef {import('../../types/index').Choices.Options} Options
   */

  /** @type {Partial<Options>} */

  var USER_DEFAULTS = {};
  /**
   * Choices
   * @author Josh Johnson<josh@joshuajohnson.co.uk>
   */

  var choices_Choices =
  /*#__PURE__*/
  function () {
    choices_createClass(Choices, null, [{
      key: "defaults",
      get: function get() {
        return Object.preventExtensions({
          get options() {
            return USER_DEFAULTS;
          },

          get templates() {
            return TEMPLATES;
          }

        });
      }
      /**
       * @param {string | HTMLInputElement | HTMLSelectElement} element
       * @param {Partial<Options>} userConfig
       */

    }]);

    function Choices(element, userConfig) {
      var _this = this;

      if (element === void 0) {
        element = '[data-choice]';
      }

      if (userConfig === void 0) {
        userConfig = {};
      }

      /** @type {Partial<Options>} */
      this.config = cjs_default.a.all([DEFAULT_CONFIG, Choices.defaults.options, userConfig], // When merging array configs, replace with a copy of the userConfig array,
      // instead of concatenating with the default array
      {
        arrayMerge: function arrayMerge(_, sourceArray) {
          return [].concat(sourceArray);
        }
      });
      var invalidConfigOptions = diff(this.config, DEFAULT_CONFIG);

      if (invalidConfigOptions.length) {
        console.warn('Unknown config option(s) passed', invalidConfigOptions.join(', '));
      }

      var passedElement = typeof element === 'string' ? document.querySelector(element) : element;

      if (!(passedElement instanceof HTMLInputElement || passedElement instanceof HTMLSelectElement)) {
        throw TypeError('Expected one of the following types text|select-one|select-multiple');
      }

      this._isTextElement = passedElement.type === TEXT_TYPE;
      this._isSelectOneElement = passedElement.type === SELECT_ONE_TYPE;
      this._isSelectMultipleElement = passedElement.type === SELECT_MULTIPLE_TYPE;
      this._isSelectElement = this._isSelectOneElement || this._isSelectMultipleElement;
      this.config.searchEnabled = this._isSelectMultipleElement || this.config.searchEnabled;

      if (!['auto', 'always'].includes(this.config.renderSelectedChoices)) {
        this.config.renderSelectedChoices = 'auto';
      }

      if (userConfig.addItemFilter && typeof userConfig.addItemFilter !== 'function') {
        var re = userConfig.addItemFilter instanceof RegExp ? userConfig.addItemFilter : new RegExp(userConfig.addItemFilter);
        this.config.addItemFilter = re.test.bind(re);
      }

      if (this._isTextElement) {
        this.passedElement = new WrappedInput({
          element: passedElement,
          classNames: this.config.classNames,
          delimiter: this.config.delimiter
        });
      } else {
        this.passedElement = new WrappedSelect({
          element: passedElement,
          classNames: this.config.classNames,
          template: function template(data) {
            return _this._templates.option(data);
          }
        });
      }

      this.initialised = false;
      this._store = new store_Store();
      this._initialState = {};
      this._currentState = {};
      this._prevState = {};
      this._currentValue = '';
      this._canSearch = this.config.searchEnabled;
      this._isScrollingOnIe = false;
      this._highlightPosition = 0;
      this._wasTap = true;
      this._placeholderValue = this._generatePlaceholderValue();
      this._baseId = generateId(this.passedElement.element, 'choices-');
      /**
       * setting direction in cases where it's explicitly set on passedElement
       * or when calculated direction is different from the document
       * @type {HTMLElement['dir']}
       */

      this._direction = this.passedElement.dir;

      if (!this._direction) {
        var _window$getComputedSt = window.getComputedStyle(this.passedElement.element),
            elementDirection = _window$getComputedSt.direction;

        var _window$getComputedSt2 = window.getComputedStyle(document.documentElement),
            documentDirection = _window$getComputedSt2.direction;

        if (elementDirection !== documentDirection) {
          this._direction = elementDirection;
        }
      }

      this._idNames = {
        itemChoice: 'item-choice'
      }; // Assign preset groups from passed element

      this._presetGroups = this.passedElement.optionGroups; // Assign preset options from passed element

      this._presetOptions = this.passedElement.options; // Assign preset choices from passed object

      this._presetChoices = this.config.choices; // Assign preset items from passed object first

      this._presetItems = this.config.items; // Add any values passed from attribute

      if (this.passedElement.value) {
        this._presetItems = this._presetItems.concat(this.passedElement.value.split(this.config.delimiter));
      } // Create array of choices from option elements


      if (this.passedElement.options) {
        this.passedElement.options.forEach(function (o) {
          _this._presetChoices.push({
            value: o.value,
            label: o.innerHTML,
            selected: o.selected,
            disabled: o.disabled || o.parentNode.disabled,
            placeholder: o.value === '' || o.hasAttribute('placeholder'),
            customProperties: o.getAttribute('data-custom-properties')
          });
        });
      }

      this._render = this._render.bind(this);
      this._onFocus = this._onFocus.bind(this);
      this._onBlur = this._onBlur.bind(this);
      this._onKeyUp = this._onKeyUp.bind(this);
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onClick = this._onClick.bind(this);
      this._onTouchMove = this._onTouchMove.bind(this);
      this._onTouchEnd = this._onTouchEnd.bind(this);
      this._onMouseDown = this._onMouseDown.bind(this);
      this._onMouseOver = this._onMouseOver.bind(this);
      this._onFormReset = this._onFormReset.bind(this);
      this._onAKey = this._onAKey.bind(this);
      this._onEnterKey = this._onEnterKey.bind(this);
      this._onEscapeKey = this._onEscapeKey.bind(this);
      this._onDirectionKey = this._onDirectionKey.bind(this);
      this._onDeleteKey = this._onDeleteKey.bind(this); // If element has already been initialised with Choices, fail silently

      if (this.passedElement.isActive) {
        if (!this.config.silent) {
          console.warn('Trying to initialise Choices on element already initialised');
        }

        this.initialised = true;
        return;
      } // Let's go


      this.init();
    }

    var _proto = Choices.prototype;

    _proto.init = function init() {
      if (this.initialised) {
        return;
      }

      this._createTemplates();

      this._createElements();

      this._createStructure(); // Set initial state (We need to clone the state because some reducers
      // modify the inner objects properties in the state) 🤢


      this._initialState = cloneObject(this._store.state);

      this._store.subscribe(this._render);

      this._render();

      this._addEventListeners();

      var shouldDisable = !this.config.addItems || this.passedElement.element.hasAttribute('disabled');

      if (shouldDisable) {
        this.disable();
      }

      this.initialised = true;
      var callbackOnInit = this.config.callbackOnInit; // Run callback if it is a function

      if (callbackOnInit && typeof callbackOnInit === 'function') {
        callbackOnInit.call(this);
      }
    };

    _proto.destroy = function destroy() {
      if (!this.initialised) {
        return;
      }

      this._removeEventListeners();

      this.passedElement.reveal();
      this.containerOuter.unwrap(this.passedElement.element);
      this.clearStore();

      if (this._isSelectElement) {
        this.passedElement.options = this._presetOptions;
      }

      this._templates = null;
      this.initialised = false;
    };

    _proto.enable = function enable() {
      if (this.passedElement.isDisabled) {
        this.passedElement.enable();
      }

      if (this.containerOuter.isDisabled) {
        this._addEventListeners();

        this.input.enable();
        this.containerOuter.enable();
      }

      return this;
    };

    _proto.disable = function disable() {
      if (!this.passedElement.isDisabled) {
        this.passedElement.disable();
      }

      if (!this.containerOuter.isDisabled) {
        this._removeEventListeners();

        this.input.disable();
        this.containerOuter.disable();
      }

      return this;
    };

    _proto.highlightItem = function highlightItem(item, runEvent) {
      if (runEvent === void 0) {
        runEvent = true;
      }

      if (!item) {
        return this;
      }

      var id = item.id,
          _item$groupId = item.groupId,
          groupId = _item$groupId === void 0 ? -1 : _item$groupId,
          _item$value = item.value,
          value = _item$value === void 0 ? '' : _item$value,
          _item$label = item.label,
          label = _item$label === void 0 ? '' : _item$label;
      var group = groupId >= 0 ? this._store.getGroupById(groupId) : null;

      this._store.dispatch(items_highlightItem(id, true));

      if (runEvent) {
        this.passedElement.triggerEvent(EVENTS.highlightItem, {
          id: id,
          value: value,
          label: label,
          groupValue: group && group.value ? group.value : null
        });
      }

      return this;
    };

    _proto.unhighlightItem = function unhighlightItem(item) {
      if (!item) {
        return this;
      }

      var id = item.id,
          _item$groupId2 = item.groupId,
          groupId = _item$groupId2 === void 0 ? -1 : _item$groupId2,
          _item$value2 = item.value,
          value = _item$value2 === void 0 ? '' : _item$value2,
          _item$label2 = item.label,
          label = _item$label2 === void 0 ? '' : _item$label2;
      var group = groupId >= 0 ? this._store.getGroupById(groupId) : null;

      this._store.dispatch(items_highlightItem(id, false));

      this.passedElement.triggerEvent(EVENTS.highlightItem, {
        id: id,
        value: value,
        label: label,
        groupValue: group && group.value ? group.value : null
      });
      return this;
    };

    _proto.highlightAll = function highlightAll() {
      var _this2 = this;

      this._store.items.forEach(function (item) {
        return _this2.highlightItem(item);
      });

      return this;
    };

    _proto.unhighlightAll = function unhighlightAll() {
      var _this3 = this;

      this._store.items.forEach(function (item) {
        return _this3.unhighlightItem(item);
      });

      return this;
    };

    _proto.removeActiveItemsByValue = function removeActiveItemsByValue(value) {
      var _this4 = this;

      this._store.activeItems.filter(function (item) {
        return item.value === value;
      }).forEach(function (item) {
        return _this4._removeItem(item);
      });

      return this;
    };

    _proto.removeActiveItems = function removeActiveItems(excludedId) {
      var _this5 = this;

      this._store.activeItems.filter(function (_ref) {
        var id = _ref.id;
        return id !== excludedId;
      }).forEach(function (item) {
        return _this5._removeItem(item);
      });

      return this;
    };

    _proto.removeHighlightedItems = function removeHighlightedItems(runEvent) {
      var _this6 = this;

      if (runEvent === void 0) {
        runEvent = false;
      }

      this._store.highlightedActiveItems.forEach(function (item) {
        _this6._removeItem(item); // If this action was performed by the user
        // trigger the event


        if (runEvent) {
          _this6._triggerChange(item.value);
        }
      });

      return this;
    };

    _proto.showDropdown = function showDropdown(preventInputFocus) {
      var _this7 = this;

      if (this.dropdown.isActive) {
        return this;
      }

      requestAnimationFrame(function () {
        _this7.dropdown.show();

        _this7.containerOuter.open(_this7.dropdown.distanceFromTopWindow);

        if (!preventInputFocus && _this7._canSearch) {
          _this7.input.focus();
        }

        _this7.passedElement.triggerEvent(EVENTS.showDropdown, {});
      });
      return this;
    };

    _proto.hideDropdown = function hideDropdown(preventInputBlur) {
      var _this8 = this;

      if (!this.dropdown.isActive) {
        return this;
      }

      requestAnimationFrame(function () {
        _this8.dropdown.hide();

        _this8.containerOuter.close();

        if (!preventInputBlur && _this8._canSearch) {
          _this8.input.removeActiveDescendant();

          _this8.input.blur();
        }

        _this8.passedElement.triggerEvent(EVENTS.hideDropdown, {});
      });
      return this;
    };

    _proto.getValue = function getValue(valueOnly) {
      if (valueOnly === void 0) {
        valueOnly = false;
      }

      var values = this._store.activeItems.reduce(function (selectedItems, item) {
        var itemValue = valueOnly ? item.value : item;
        selectedItems.push(itemValue);
        return selectedItems;
      }, []);

      return this._isSelectOneElement ? values[0] : values;
    }
    /**
     * @param {string[] | import('../../types/index').Choices.Item[]} items
     */
    ;

    _proto.setValue = function setValue(items) {
      var _this9 = this;

      if (!this.initialised) {
        return this;
      }

      items.forEach(function (value) {
        return _this9._setChoiceOrItem(value);
      });
      return this;
    };

    _proto.setChoiceByValue = function setChoiceByValue(value) {
      var _this10 = this;

      if (!this.initialised || this._isTextElement) {
        return this;
      } // If only one value has been passed, convert to array


      var choiceValue = Array.isArray(value) ? value : [value]; // Loop through each value and

      choiceValue.forEach(function (val) {
        return _this10._findAndSelectChoiceByValue(val);
      });
      return this;
    }
    /**
     * Set choices of select input via an array of objects (or function that returns array of object or promise of it),
     * a value field name and a label field name.
     * This behaves the same as passing items via the choices option but can be called after initialising Choices.
     * This can also be used to add groups of choices (see example 2); Optionally pass a true `replaceChoices` value to remove any existing choices.
     * Optionally pass a `customProperties` object to add additional data to your choices (useful when searching/filtering etc).
     *
     * **Input types affected:** select-one, select-multiple
     *
     * @template {Choice[] | ((instance: Choices) => object[] | Promise<object[]>)} T
     * @param {T} [choicesArrayOrFetcher]
     * @param {string} [value = 'value'] - name of `value` field
     * @param {string} [label = 'label'] - name of 'label' field
     * @param {boolean} [replaceChoices = false] - whether to replace of add choices
     * @returns {this | Promise<this>}
     *
     * @example
     * ```js
     * const example = new Choices(element);
     *
     * example.setChoices([
     *   {value: 'One', label: 'Label One', disabled: true},
     *   {value: 'Two', label: 'Label Two', selected: true},
     *   {value: 'Three', label: 'Label Three'},
     * ], 'value', 'label', false);
     * ```
     *
     * @example
     * ```js
     * const example = new Choices(element);
     *
     * example.setChoices(async () => {
     *   try {
     *      const items = await fetch('/items');
     *      return items.json()
     *   } catch(err) {
     *      console.error(err)
     *   }
     * });
     * ```
     *
     * @example
     * ```js
     * const example = new Choices(element);
     *
     * example.setChoices([{
     *   label: 'Group one',
     *   id: 1,
     *   disabled: false,
     *   choices: [
     *     {value: 'Child One', label: 'Child One', selected: true},
     *     {value: 'Child Two', label: 'Child Two',  disabled: true},
     *     {value: 'Child Three', label: 'Child Three'},
     *   ]
     * },
     * {
     *   label: 'Group two',
     *   id: 2,
     *   disabled: false,
     *   choices: [
     *     {value: 'Child Four', label: 'Child Four', disabled: true},
     *     {value: 'Child Five', label: 'Child Five'},
     *     {value: 'Child Six', label: 'Child Six', customProperties: {
     *       description: 'Custom description about child six',
     *       random: 'Another random custom property'
     *     }},
     *   ]
     * }], 'value', 'label', false);
     * ```
     */
    ;

    _proto.setChoices = function setChoices(choicesArrayOrFetcher, value, label, replaceChoices) {
      var _this11 = this;

      if (choicesArrayOrFetcher === void 0) {
        choicesArrayOrFetcher = [];
      }

      if (value === void 0) {
        value = 'value';
      }

      if (label === void 0) {
        label = 'label';
      }

      if (replaceChoices === void 0) {
        replaceChoices = false;
      }

      if (!this.initialised) {
        throw new ReferenceError("setChoices was called on a non-initialized instance of Choices");
      }

      if (!this._isSelectElement) {
        throw new TypeError("setChoices can't be used with INPUT based Choices");
      }

      if (typeof value !== 'string' || !value) {
        throw new TypeError("value parameter must be a name of 'value' field in passed objects");
      } // Clear choices if needed


      if (replaceChoices) {
        this.clearChoices();
      }

      if (typeof choicesArrayOrFetcher === 'function') {
        // it's a choices fetcher function
        var fetcher = choicesArrayOrFetcher(this);

        if (typeof Promise === 'function' && fetcher instanceof Promise) {
          // that's a promise
          // eslint-disable-next-line compat/compat
          return new Promise(function (resolve) {
            return requestAnimationFrame(resolve);
          }).then(function () {
            return _this11._handleLoadingState(true);
          }).then(function () {
            return fetcher;
          }).then(function (data) {
            return _this11.setChoices(data, value, label, replaceChoices);
          }).catch(function (err) {
            if (!_this11.config.silent) {
              console.error(err);
            }
          }).then(function () {
            return _this11._handleLoadingState(false);
          }).then(function () {
            return _this11;
          });
        } // function returned something else than promise, let's check if it's an array of choices


        if (!Array.isArray(fetcher)) {
          throw new TypeError(".setChoices first argument function must return either array of choices or Promise, got: " + typeof fetcher);
        } // recursion with results, it's sync and choices were cleared already


        return this.setChoices(fetcher, value, label, false);
      }

      if (!Array.isArray(choicesArrayOrFetcher)) {
        throw new TypeError(".setChoices must be called either with array of choices with a function resulting into Promise of array of choices");
      }

      this.containerOuter.removeLoadingState();

      this._startLoading();

      choicesArrayOrFetcher.forEach(function (groupOrChoice) {
        if (groupOrChoice.choices) {
          _this11._addGroup({
            id: parseInt(groupOrChoice.id, 10) || null,
            group: groupOrChoice,
            valueKey: value,
            labelKey: label
          });
        } else {
          _this11._addChoice({
            value: groupOrChoice[value],
            label: groupOrChoice[label],
            isSelected: groupOrChoice.selected,
            isDisabled: groupOrChoice.disabled,
            customProperties: groupOrChoice.customProperties,
            placeholder: groupOrChoice.placeholder
          });
        }
      });

      this._stopLoading();

      return this;
    };

    _proto.clearChoices = function clearChoices() {
      this._store.dispatch(choices_clearChoices());

      return this;
    };

    _proto.clearStore = function clearStore() {
      this._store.dispatch(clearAll());

      return this;
    };

    _proto.clearInput = function clearInput() {
      var shouldSetInputWidth = !this._isSelectOneElement;
      this.input.clear(shouldSetInputWidth);

      if (!this._isTextElement && this._canSearch) {
        this._isSearching = false;

        this._store.dispatch(choices_activateChoices(true));
      }

      return this;
    };

    _proto._render = function _render() {
      if (this._store.isLoading()) {
        return;
      }

      this._currentState = this._store.state;
      var stateChanged = this._currentState.choices !== this._prevState.choices || this._currentState.groups !== this._prevState.groups || this._currentState.items !== this._prevState.items;
      var shouldRenderChoices = this._isSelectElement;
      var shouldRenderItems = this._currentState.items !== this._prevState.items;

      if (!stateChanged) {
        return;
      }

      if (shouldRenderChoices) {
        this._renderChoices();
      }

      if (shouldRenderItems) {
        this._renderItems();
      }

      this._prevState = this._currentState;
    };

    _proto._renderChoices = function _renderChoices() {
      var _this12 = this;

      var _this$_store = this._store,
          activeGroups = _this$_store.activeGroups,
          activeChoices = _this$_store.activeChoices;
      var choiceListFragment = document.createDocumentFragment();
      this.choiceList.clear();

      if (this.config.resetScrollPosition) {
        requestAnimationFrame(function () {
          return _this12.choiceList.scrollToTop();
        });
      } // If we have grouped options


      if (activeGroups.length >= 1 && !this._isSearching) {
        // If we have a placeholder choice along with groups
        var activePlaceholders = activeChoices.filter(function (activeChoice) {
          return activeChoice.placeholder === true && activeChoice.groupId === -1;
        });

        if (activePlaceholders.length >= 1) {
          choiceListFragment = this._createChoicesFragment(activePlaceholders, choiceListFragment);
        }

        choiceListFragment = this._createGroupsFragment(activeGroups, activeChoices, choiceListFragment);
      } else if (activeChoices.length >= 1) {
        choiceListFragment = this._createChoicesFragment(activeChoices, choiceListFragment);
      } // If we have choices to show


      if (choiceListFragment.childNodes && choiceListFragment.childNodes.length > 0) {
        var activeItems = this._store.activeItems;

        var canAddItem = this._canAddItem(activeItems, this.input.value); // ...and we can select them


        if (canAddItem.response) {
          // ...append them and highlight the first choice
          this.choiceList.append(choiceListFragment);

          this._highlightChoice();
        } else {
          // ...otherwise show a notice
          this.choiceList.append(this._getTemplate('notice', canAddItem.notice));
        }
      } else {
        // Otherwise show a notice
        var dropdownItem;
        var notice;

        if (this._isSearching) {
          notice = typeof this.config.noResultsText === 'function' ? this.config.noResultsText() : this.config.noResultsText;
          dropdownItem = this._getTemplate('notice', notice, 'no-results');
        } else {
          notice = typeof this.config.noChoicesText === 'function' ? this.config.noChoicesText() : this.config.noChoicesText;
          dropdownItem = this._getTemplate('notice', notice, 'no-choices');
        }

        this.choiceList.append(dropdownItem);
      }
    };

    _proto._renderItems = function _renderItems() {
      var activeItems = this._store.activeItems || [];
      this.itemList.clear(); // Create a fragment to store our list items
      // (so we don't have to update the DOM for each item)

      var itemListFragment = this._createItemsFragment(activeItems); // If we have items to add, append them


      if (itemListFragment.childNodes) {
        this.itemList.append(itemListFragment);
      }
    };

    _proto._createGroupsFragment = function _createGroupsFragment(groups, choices, fragment) {
      var _this13 = this;

      if (fragment === void 0) {
        fragment = document.createDocumentFragment();
      }

      var getGroupChoices = function getGroupChoices(group) {
        return choices.filter(function (choice) {
          if (_this13._isSelectOneElement) {
            return choice.groupId === group.id;
          }

          return choice.groupId === group.id && (_this13.config.renderSelectedChoices === 'always' || !choice.selected);
        });
      }; // If sorting is enabled, filter groups


      if (this.config.shouldSort) {
        groups.sort(this.config.sorter);
      }

      groups.forEach(function (group) {
        var groupChoices = getGroupChoices(group);

        if (groupChoices.length >= 1) {
          var dropdownGroup = _this13._getTemplate('choiceGroup', group);

          fragment.appendChild(dropdownGroup);

          _this13._createChoicesFragment(groupChoices, fragment, true);
        }
      });
      return fragment;
    };

    _proto._createChoicesFragment = function _createChoicesFragment(choices, fragment, withinGroup) {
      var _this14 = this;

      if (fragment === void 0) {
        fragment = document.createDocumentFragment();
      }

      if (withinGroup === void 0) {
        withinGroup = false;
      }

      // Create a fragment to store our list items (so we don't have to update the DOM for each item)
      var _this$config = this.config,
          renderSelectedChoices = _this$config.renderSelectedChoices,
          searchResultLimit = _this$config.searchResultLimit,
          renderChoiceLimit = _this$config.renderChoiceLimit;
      var filter = this._isSearching ? sortByScore : this.config.sorter;

      var appendChoice = function appendChoice(choice) {
        var shouldRender = renderSelectedChoices === 'auto' ? _this14._isSelectOneElement || !choice.selected : true;

        if (shouldRender) {
          var dropdownItem = _this14._getTemplate('choice', choice, _this14.config.itemSelectText);

          fragment.appendChild(dropdownItem);
        }
      };

      var rendererableChoices = choices;

      if (renderSelectedChoices === 'auto' && !this._isSelectOneElement) {
        rendererableChoices = choices.filter(function (choice) {
          return !choice.selected;
        });
      } // Split array into placeholders and "normal" choices


      var _rendererableChoices$ = rendererableChoices.reduce(function (acc, choice) {
        if (choice.placeholder) {
          acc.placeholderChoices.push(choice);
        } else {
          acc.normalChoices.push(choice);
        }

        return acc;
      }, {
        placeholderChoices: [],
        normalChoices: []
      }),
          placeholderChoices = _rendererableChoices$.placeholderChoices,
          normalChoices = _rendererableChoices$.normalChoices; // If sorting is enabled or the user is searching, filter choices


      if (this.config.shouldSort || this._isSearching) {
        normalChoices.sort(filter);
      }

      var choiceLimit = rendererableChoices.length; // Prepend placeholeder

      var sortedChoices = this._isSelectOneElement ? [].concat(placeholderChoices, normalChoices) : normalChoices;

      if (this._isSearching) {
        choiceLimit = searchResultLimit;
      } else if (renderChoiceLimit && renderChoiceLimit > 0 && !withinGroup) {
        choiceLimit = renderChoiceLimit;
      } // Add each choice to dropdown within range


      for (var i = 0; i < choiceLimit; i += 1) {
        if (sortedChoices[i]) {
          appendChoice(sortedChoices[i]);
        }
      }

      return fragment;
    };

    _proto._createItemsFragment = function _createItemsFragment(items, fragment) {
      var _this15 = this;

      if (fragment === void 0) {
        fragment = document.createDocumentFragment();
      }

      // Create fragment to add elements to
      var _this$config2 = this.config,
          shouldSortItems = _this$config2.shouldSortItems,
          sorter = _this$config2.sorter,
          removeItemButton = _this$config2.removeItemButton; // If sorting is enabled, filter items

      if (shouldSortItems && !this._isSelectOneElement) {
        items.sort(sorter);
      }

      if (this._isTextElement) {
        // Update the value of the hidden input
        this.passedElement.value = items;
      } else {
        // Update the options of the hidden input
        this.passedElement.options = items;
      }

      var addItemToFragment = function addItemToFragment(item) {
        // Create new list element
        var listItem = _this15._getTemplate('item', item, removeItemButton); // Append it to list


        fragment.appendChild(listItem);
      }; // Add each list item to list


      items.forEach(addItemToFragment);
      return fragment;
    };

    _proto._triggerChange = function _triggerChange(value) {
      if (value === undefined || value === null) {
        return;
      }

      this.passedElement.triggerEvent(EVENTS.change, {
        value: value
      });
    };

    _proto._selectPlaceholderChoice = function _selectPlaceholderChoice() {
      var placeholderChoice = this._store.placeholderChoice;

      if (placeholderChoice) {
        this._addItem({
          value: placeholderChoice.value,
          label: placeholderChoice.label,
          choiceId: placeholderChoice.id,
          groupId: placeholderChoice.groupId,
          placeholder: placeholderChoice.placeholder
        });

        this._triggerChange(placeholderChoice.value);
      }
    };

    _proto._handleButtonAction = function _handleButtonAction(activeItems, element) {
      if (!activeItems || !element || !this.config.removeItems || !this.config.removeItemButton) {
        return;
      }

      var itemId = element.parentNode.getAttribute('data-id');
      var itemToRemove = activeItems.find(function (item) {
        return item.id === parseInt(itemId, 10);
      }); // Remove item associated with button

      this._removeItem(itemToRemove);

      this._triggerChange(itemToRemove.value);

      if (this._isSelectOneElement) {
        this._selectPlaceholderChoice();
      }
    };

    _proto._handleItemAction = function _handleItemAction(activeItems, element, hasShiftKey) {
      var _this16 = this;

      if (hasShiftKey === void 0) {
        hasShiftKey = false;
      }

      if (!activeItems || !element || !this.config.removeItems || this._isSelectOneElement) {
        return;
      }

      var passedId = element.getAttribute('data-id'); // We only want to select one item with a click
      // so we deselect any items that aren't the target
      // unless shift is being pressed

      activeItems.forEach(function (item) {
        if (item.id === parseInt(passedId, 10) && !item.highlighted) {
          _this16.highlightItem(item);
        } else if (!hasShiftKey && item.highlighted) {
          _this16.unhighlightItem(item);
        }
      }); // Focus input as without focus, a user cannot do anything with a
      // highlighted item

      this.input.focus();
    };

    _proto._handleChoiceAction = function _handleChoiceAction(activeItems, element) {
      if (!activeItems || !element) {
        return;
      } // If we are clicking on an option


      var id = element.dataset.id;

      var choice = this._store.getChoiceById(id);

      if (!choice) {
        return;
      }

      var passedKeyCode = activeItems[0] && activeItems[0].keyCode ? activeItems[0].keyCode : null;
      var hasActiveDropdown = this.dropdown.isActive; // Update choice keyCode

      choice.keyCode = passedKeyCode;
      this.passedElement.triggerEvent(EVENTS.choice, {
        choice: choice
      });

      if (!choice.selected && !choice.disabled) {
        var canAddItem = this._canAddItem(activeItems, choice.value);

        if (canAddItem.response) {
          this._addItem({
            value: choice.value,
            label: choice.label,
            choiceId: choice.id,
            groupId: choice.groupId,
            customProperties: choice.customProperties,
            placeholder: choice.placeholder,
            keyCode: choice.keyCode
          });

          this._triggerChange(choice.value);
        }
      }

      this.clearInput(); // We want to close the dropdown if we are dealing with a single select box

      if (hasActiveDropdown && this._isSelectOneElement) {
        this.hideDropdown(true);
        this.containerOuter.focus();
      }
    };

    _proto._handleBackspace = function _handleBackspace(activeItems) {
      if (!this.config.removeItems || !activeItems) {
        return;
      }

      var lastItem = activeItems[activeItems.length - 1];
      var hasHighlightedItems = activeItems.some(function (item) {
        return item.highlighted;
      }); // If editing the last item is allowed and there are not other selected items,
      // we can edit the item value. Otherwise if we can remove items, remove all selected items

      if (this.config.editItems && !hasHighlightedItems && lastItem) {
        this.input.value = lastItem.value;
        this.input.setWidth();

        this._removeItem(lastItem);

        this._triggerChange(lastItem.value);
      } else {
        if (!hasHighlightedItems) {
          // Highlight last item if none already highlighted
          this.highlightItem(lastItem, false);
        }

        this.removeHighlightedItems(true);
      }
    };

    _proto._startLoading = function _startLoading() {
      this._store.dispatch(setIsLoading(true));
    };

    _proto._stopLoading = function _stopLoading() {
      this._store.dispatch(setIsLoading(false));
    };

    _proto._handleLoadingState = function _handleLoadingState(setLoading) {
      if (setLoading === void 0) {
        setLoading = true;
      }

      var placeholderItem = this.itemList.getChild("." + this.config.classNames.placeholder);

      if (setLoading) {
        this.disable();
        this.containerOuter.addLoadingState();

        if (this._isSelectOneElement) {
          if (!placeholderItem) {
            placeholderItem = this._getTemplate('placeholder', this.config.loadingText);
            this.itemList.append(placeholderItem);
          } else {
            placeholderItem.innerHTML = this.config.loadingText;
          }
        } else {
          this.input.placeholder = this.config.loadingText;
        }
      } else {
        this.enable();
        this.containerOuter.removeLoadingState();

        if (this._isSelectOneElement) {
          placeholderItem.innerHTML = this._placeholderValue || '';
        } else {
          this.input.placeholder = this._placeholderValue || '';
        }
      }
    };

    _proto._handleSearch = function _handleSearch(value) {
      if (!value || !this.input.isFocussed) {
        return;
      }

      var choices = this._store.choices;
      var _this$config3 = this.config,
          searchFloor = _this$config3.searchFloor,
          searchChoices = _this$config3.searchChoices;
      var hasUnactiveChoices = choices.some(function (option) {
        return !option.active;
      }); // Check that we have a value to search and the input was an alphanumeric character

      if (value && value.length >= searchFloor) {
        var resultCount = searchChoices ? this._searchChoices(value) : 0; // Trigger search event

        this.passedElement.triggerEvent(EVENTS.search, {
          value: value,
          resultCount: resultCount
        });
      } else if (hasUnactiveChoices) {
        // Otherwise reset choices to active
        this._isSearching = false;

        this._store.dispatch(choices_activateChoices(true));
      }
    };

    _proto._canAddItem = function _canAddItem(activeItems, value) {
      var canAddItem = true;
      var notice = typeof this.config.addItemText === 'function' ? this.config.addItemText(value) : this.config.addItemText;

      if (!this._isSelectOneElement) {
        var isDuplicateValue = existsInArray(activeItems, value);

        if (this.config.maxItemCount > 0 && this.config.maxItemCount <= activeItems.length) {
          // If there is a max entry limit and we have reached that limit
          // don't update
          canAddItem = false;
          notice = typeof this.config.maxItemText === 'function' ? this.config.maxItemText(this.config.maxItemCount) : this.config.maxItemText;
        }

        if (!this.config.duplicateItemsAllowed && isDuplicateValue && canAddItem) {
          canAddItem = false;
          notice = typeof this.config.uniqueItemText === 'function' ? this.config.uniqueItemText(value) : this.config.uniqueItemText;
        }

        if (this._isTextElement && this.config.addItems && canAddItem && typeof this.config.addItemFilter === 'function' && !this.config.addItemFilter(value)) {
          canAddItem = false;
          notice = typeof this.config.customAddItemText === 'function' ? this.config.customAddItemText(value) : this.config.customAddItemText;
        }
      }

      return {
        response: canAddItem,
        notice: notice
      };
    };

    _proto._searchChoices = function _searchChoices(value) {
      var newValue = typeof value === 'string' ? value.trim() : value;
      var currentValue = typeof this._currentValue === 'string' ? this._currentValue.trim() : this._currentValue;

      if (newValue.length < 1 && newValue === currentValue + " ") {
        return 0;
      } // If new value matches the desired length and is not the same as the current value with a space


      var haystack = this._store.searchableChoices;
      var needle = newValue;
      var keys = [].concat(this.config.searchFields);
      var options = Object.assign(this.config.fuseOptions, {
        keys: keys
      });
      var fuse = new fuse_default.a(haystack, options);
      var results = fuse.search(needle);
      this._currentValue = newValue;
      this._highlightPosition = 0;
      this._isSearching = true;

      this._store.dispatch(choices_filterChoices(results));

      return results.length;
    };

    _proto._addEventListeners = function _addEventListeners() {
      var _document = document,
          documentElement = _document.documentElement; // capture events - can cancel event processing or propagation

      documentElement.addEventListener('touchend', this._onTouchEnd, true);
      this.containerOuter.element.addEventListener('keydown', this._onKeyDown, true);
      this.containerOuter.element.addEventListener('mousedown', this._onMouseDown, true); // passive events - doesn't call `preventDefault` or `stopPropagation`

      documentElement.addEventListener('click', this._onClick, {
        passive: true
      });
      documentElement.addEventListener('touchmove', this._onTouchMove, {
        passive: true
      });
      this.dropdown.element.addEventListener('mouseover', this._onMouseOver, {
        passive: true
      });

      if (this._isSelectOneElement) {
        this.containerOuter.element.addEventListener('focus', this._onFocus, {
          passive: true
        });
        this.containerOuter.element.addEventListener('blur', this._onBlur, {
          passive: true
        });
      }

      this.input.element.addEventListener('keyup', this._onKeyUp, {
        passive: true
      });
      this.input.element.addEventListener('focus', this._onFocus, {
        passive: true
      });
      this.input.element.addEventListener('blur', this._onBlur, {
        passive: true
      });

      if (this.input.element.form) {
        this.input.element.form.addEventListener('reset', this._onFormReset, {
          passive: true
        });
      }

      this.input.addEventListeners();
    };

    _proto._removeEventListeners = function _removeEventListeners() {
      var _document2 = document,
          documentElement = _document2.documentElement;
      documentElement.removeEventListener('touchend', this._onTouchEnd, true);
      this.containerOuter.element.removeEventListener('keydown', this._onKeyDown, true);
      this.containerOuter.element.removeEventListener('mousedown', this._onMouseDown, true);
      documentElement.removeEventListener('click', this._onClick);
      documentElement.removeEventListener('touchmove', this._onTouchMove);
      this.dropdown.element.removeEventListener('mouseover', this._onMouseOver);

      if (this._isSelectOneElement) {
        this.containerOuter.element.removeEventListener('focus', this._onFocus);
        this.containerOuter.element.removeEventListener('blur', this._onBlur);
      }

      this.input.element.removeEventListener('keyup', this._onKeyUp);
      this.input.element.removeEventListener('focus', this._onFocus);
      this.input.element.removeEventListener('blur', this._onBlur);

      if (this.input.element.form) {
        this.input.element.form.removeEventListener('reset', this._onFormReset);
      }

      this.input.removeEventListeners();
    }
    /**
     * @param {KeyboardEvent} event
     */
    ;

    _proto._onKeyDown = function _onKeyDown(event) {
      var _keyDownActions;

      var target = event.target,
          keyCode = event.keyCode,
          ctrlKey = event.ctrlKey,
          metaKey = event.metaKey;
      var activeItems = this._store.activeItems;
      var hasFocusedInput = this.input.isFocussed;
      var hasActiveDropdown = this.dropdown.isActive;
      var hasItems = this.itemList.hasChildren();
      var keyString = String.fromCharCode(keyCode);
      var BACK_KEY = KEY_CODES.BACK_KEY,
          DELETE_KEY = KEY_CODES.DELETE_KEY,
          ENTER_KEY = KEY_CODES.ENTER_KEY,
          A_KEY = KEY_CODES.A_KEY,
          ESC_KEY = KEY_CODES.ESC_KEY,
          UP_KEY = KEY_CODES.UP_KEY,
          DOWN_KEY = KEY_CODES.DOWN_KEY,
          PAGE_UP_KEY = KEY_CODES.PAGE_UP_KEY,
          PAGE_DOWN_KEY = KEY_CODES.PAGE_DOWN_KEY;
      var hasCtrlDownKeyPressed = ctrlKey || metaKey; // If a user is typing and the dropdown is not active

      if (!this._isTextElement && /[a-zA-Z0-9-_ ]/.test(keyString)) {
        this.showDropdown();
      } // Map keys to key actions


      var keyDownActions = (_keyDownActions = {}, _keyDownActions[A_KEY] = this._onAKey, _keyDownActions[ENTER_KEY] = this._onEnterKey, _keyDownActions[ESC_KEY] = this._onEscapeKey, _keyDownActions[UP_KEY] = this._onDirectionKey, _keyDownActions[PAGE_UP_KEY] = this._onDirectionKey, _keyDownActions[DOWN_KEY] = this._onDirectionKey, _keyDownActions[PAGE_DOWN_KEY] = this._onDirectionKey, _keyDownActions[DELETE_KEY] = this._onDeleteKey, _keyDownActions[BACK_KEY] = this._onDeleteKey, _keyDownActions); // If keycode has a function, run it

      if (keyDownActions[keyCode]) {
        keyDownActions[keyCode]({
          event: event,
          target: target,
          keyCode: keyCode,
          metaKey: metaKey,
          activeItems: activeItems,
          hasFocusedInput: hasFocusedInput,
          hasActiveDropdown: hasActiveDropdown,
          hasItems: hasItems,
          hasCtrlDownKeyPressed: hasCtrlDownKeyPressed
        });
      }
    };

    _proto._onKeyUp = function _onKeyUp(_ref2) {
      var target = _ref2.target,
          keyCode = _ref2.keyCode;
      var value = this.input.value;
      var activeItems = this._store.activeItems;

      var canAddItem = this._canAddItem(activeItems, value);

      var backKey = KEY_CODES.BACK_KEY,
          deleteKey = KEY_CODES.DELETE_KEY; // We are typing into a text input and have a value, we want to show a dropdown
      // notice. Otherwise hide the dropdown

      if (this._isTextElement) {
        var canShowDropdownNotice = canAddItem.notice && value;

        if (canShowDropdownNotice) {
          var dropdownItem = this._getTemplate('notice', canAddItem.notice);

          this.dropdown.element.innerHTML = dropdownItem.outerHTML;
          this.showDropdown(true);
        } else {
          this.hideDropdown(true);
        }
      } else {
        var userHasRemovedValue = (keyCode === backKey || keyCode === deleteKey) && !target.value;
        var canReactivateChoices = !this._isTextElement && this._isSearching;
        var canSearch = this._canSearch && canAddItem.response;

        if (userHasRemovedValue && canReactivateChoices) {
          this._isSearching = false;

          this._store.dispatch(choices_activateChoices(true));
        } else if (canSearch) {
          this._handleSearch(this.input.value);
        }
      }

      this._canSearch = this.config.searchEnabled;
    };

    _proto._onAKey = function _onAKey(_ref3) {
      var hasItems = _ref3.hasItems,
          hasCtrlDownKeyPressed = _ref3.hasCtrlDownKeyPressed;

      // If CTRL + A or CMD + A have been pressed and there are items to select
      if (hasCtrlDownKeyPressed && hasItems) {
        this._canSearch = false;
        var shouldHightlightAll = this.config.removeItems && !this.input.value && this.input.element === document.activeElement;

        if (shouldHightlightAll) {
          this.highlightAll();
        }
      }
    };

    _proto._onEnterKey = function _onEnterKey(_ref4) {
      var event = _ref4.event,
          target = _ref4.target,
          activeItems = _ref4.activeItems,
          hasActiveDropdown = _ref4.hasActiveDropdown;
      var enterKey = KEY_CODES.ENTER_KEY;
      var targetWasButton = target.hasAttribute('data-button');

      if (this._isTextElement && target.value) {
        var value = this.input.value;

        var canAddItem = this._canAddItem(activeItems, value);

        if (canAddItem.response) {
          this.hideDropdown(true);

          this._addItem({
            value: value
          });

          this._triggerChange(value);

          this.clearInput();
        }
      }

      if (targetWasButton) {
        this._handleButtonAction(activeItems, target);

        event.preventDefault();
      }

      if (hasActiveDropdown) {
        var highlightedChoice = this.dropdown.getChild("." + this.config.classNames.highlightedState);

        if (highlightedChoice) {
          // add enter keyCode value
          if (activeItems[0]) {
            activeItems[0].keyCode = enterKey; // eslint-disable-line no-param-reassign
          }

          this._handleChoiceAction(activeItems, highlightedChoice);
        }

        event.preventDefault();
      } else if (this._isSelectOneElement) {
        this.showDropdown();
        event.preventDefault();
      }
    };

    _proto._onEscapeKey = function _onEscapeKey(_ref5) {
      var hasActiveDropdown = _ref5.hasActiveDropdown;

      if (hasActiveDropdown) {
        this.hideDropdown(true);
        this.containerOuter.focus();
      }
    };

    _proto._onDirectionKey = function _onDirectionKey(_ref6) {
      var event = _ref6.event,
          hasActiveDropdown = _ref6.hasActiveDropdown,
          keyCode = _ref6.keyCode,
          metaKey = _ref6.metaKey;
      var downKey = KEY_CODES.DOWN_KEY,
          pageUpKey = KEY_CODES.PAGE_UP_KEY,
          pageDownKey = KEY_CODES.PAGE_DOWN_KEY; // If up or down key is pressed, traverse through options

      if (hasActiveDropdown || this._isSelectOneElement) {
        this.showDropdown();
        this._canSearch = false;
        var directionInt = keyCode === downKey || keyCode === pageDownKey ? 1 : -1;
        var skipKey = metaKey || keyCode === pageDownKey || keyCode === pageUpKey;
        var selectableChoiceIdentifier = '[data-choice-selectable]';
        var nextEl;

        if (skipKey) {
          if (directionInt > 0) {
            nextEl = this.dropdown.element.querySelector(selectableChoiceIdentifier + ":last-of-type");
          } else {
            nextEl = this.dropdown.element.querySelector(selectableChoiceIdentifier);
          }
        } else {
          var currentEl = this.dropdown.element.querySelector("." + this.config.classNames.highlightedState);

          if (currentEl) {
            nextEl = getAdjacentEl(currentEl, selectableChoiceIdentifier, directionInt);
          } else {
            nextEl = this.dropdown.element.querySelector(selectableChoiceIdentifier);
          }
        }

        if (nextEl) {
          // We prevent default to stop the cursor moving
          // when pressing the arrow
          if (!isScrolledIntoView(nextEl, this.choiceList.element, directionInt)) {
            this.choiceList.scrollToChildElement(nextEl, directionInt);
          }

          this._highlightChoice(nextEl);
        } // Prevent default to maintain cursor position whilst
        // traversing dropdown options


        event.preventDefault();
      }
    };

    _proto._onDeleteKey = function _onDeleteKey(_ref7) {
      var event = _ref7.event,
          target = _ref7.target,
          hasFocusedInput = _ref7.hasFocusedInput,
          activeItems = _ref7.activeItems;

      // If backspace or delete key is pressed and the input has no value
      if (hasFocusedInput && !target.value && !this._isSelectOneElement) {
        this._handleBackspace(activeItems);

        event.preventDefault();
      }
    };

    _proto._onTouchMove = function _onTouchMove() {
      if (this._wasTap) {
        this._wasTap = false;
      }
    };

    _proto._onTouchEnd = function _onTouchEnd(event) {
      var _ref8 = event || event.touches[0],
          target = _ref8.target;

      var touchWasWithinContainer = this._wasTap && this.containerOuter.element.contains(target);

      if (touchWasWithinContainer) {
        var containerWasExactTarget = target === this.containerOuter.element || target === this.containerInner.element;

        if (containerWasExactTarget) {
          if (this._isTextElement) {
            this.input.focus();
          } else if (this._isSelectMultipleElement) {
            this.showDropdown();
          }
        } // Prevents focus event firing


        event.stopPropagation();
      }

      this._wasTap = true;
    }
    /**
     * Handles mousedown event in capture mode for containetOuter.element
     * @param {MouseEvent} event
     */
    ;

    _proto._onMouseDown = function _onMouseDown(event) {
      var target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      } // If we have our mouse down on the scrollbar and are on IE11...


      if (IS_IE11 && this.choiceList.element.contains(target)) {
        // check if click was on a scrollbar area
        var firstChoice =
        /** @type {HTMLElement} */
        this.choiceList.element.firstElementChild;
        var isOnScrollbar = this._direction === 'ltr' ? event.offsetX >= firstChoice.offsetWidth : event.offsetX < firstChoice.offsetLeft;
        this._isScrollingOnIe = isOnScrollbar;
      }

      if (target === this.input.element) {
        return;
      }

      var item = target.closest('[data-button],[data-item],[data-choice]');

      if (item instanceof HTMLElement) {
        var hasShiftKey = event.shiftKey;
        var activeItems = this._store.activeItems;
        var dataset = item.dataset;

        if ('button' in dataset) {
          this._handleButtonAction(activeItems, item);
        } else if ('item' in dataset) {
          this._handleItemAction(activeItems, item, hasShiftKey);
        } else if ('choice' in dataset) {
          this._handleChoiceAction(activeItems, item);
        }
      }

      event.preventDefault();
    }
    /**
     * Handles mouseover event over this.dropdown
     * @param {MouseEvent} event
     */
    ;

    _proto._onMouseOver = function _onMouseOver(_ref9) {
      var target = _ref9.target;

      if (target instanceof HTMLElement && 'choice' in target.dataset) {
        this._highlightChoice(target);
      }
    };

    _proto._onClick = function _onClick(_ref10) {
      var target = _ref10.target;
      var clickWasWithinContainer = this.containerOuter.element.contains(target);

      if (clickWasWithinContainer) {
        if (!this.dropdown.isActive && !this.containerOuter.isDisabled) {
          if (this._isTextElement) {
            if (document.activeElement !== this.input.element) {
              this.input.focus();
            }
          } else {
            this.showDropdown();
            this.containerOuter.focus();
          }
        } else if (this._isSelectOneElement && target !== this.input.element && !this.dropdown.element.contains(target)) {
          this.hideDropdown();
        }
      } else {
        var hasHighlightedItems = this._store.highlightedActiveItems.length > 0;

        if (hasHighlightedItems) {
          this.unhighlightAll();
        }

        this.containerOuter.removeFocusState();
        this.hideDropdown(true);
      }
    };

    _proto._onFocus = function _onFocus(_ref11) {
      var _this17 = this,
          _focusActions;

      var target = _ref11.target;
      var focusWasWithinContainer = this.containerOuter.element.contains(target);

      if (!focusWasWithinContainer) {
        return;
      }

      var focusActions = (_focusActions = {}, _focusActions[TEXT_TYPE] = function () {
        if (target === _this17.input.element) {
          _this17.containerOuter.addFocusState();
        }
      }, _focusActions[SELECT_ONE_TYPE] = function () {
        _this17.containerOuter.addFocusState();

        if (target === _this17.input.element) {
          _this17.showDropdown(true);
        }
      }, _focusActions[SELECT_MULTIPLE_TYPE] = function () {
        if (target === _this17.input.element) {
          _this17.showDropdown(true); // If element is a select box, the focused element is the container and the dropdown
          // isn't already open, focus and show dropdown


          _this17.containerOuter.addFocusState();
        }
      }, _focusActions);
      focusActions[this.passedElement.element.type]();
    };

    _proto._onBlur = function _onBlur(_ref12) {
      var _this18 = this;

      var target = _ref12.target;
      var blurWasWithinContainer = this.containerOuter.element.contains(target);

      if (blurWasWithinContainer && !this._isScrollingOnIe) {
        var _blurActions;

        var activeItems = this._store.activeItems;
        var hasHighlightedItems = activeItems.some(function (item) {
          return item.highlighted;
        });
        var blurActions = (_blurActions = {}, _blurActions[TEXT_TYPE] = function () {
          if (target === _this18.input.element) {
            _this18.containerOuter.removeFocusState();

            if (hasHighlightedItems) {
              _this18.unhighlightAll();
            }

            _this18.hideDropdown(true);
          }
        }, _blurActions[SELECT_ONE_TYPE] = function () {
          _this18.containerOuter.removeFocusState();

          if (target === _this18.input.element || target === _this18.containerOuter.element && !_this18._canSearch) {
            _this18.hideDropdown(true);
          }
        }, _blurActions[SELECT_MULTIPLE_TYPE] = function () {
          if (target === _this18.input.element) {
            _this18.containerOuter.removeFocusState();

            _this18.hideDropdown(true);

            if (hasHighlightedItems) {
              _this18.unhighlightAll();
            }
          }
        }, _blurActions);
        blurActions[this.passedElement.element.type]();
      } else {
        // On IE11, clicking the scollbar blurs our input and thus
        // closes the dropdown. To stop this, we refocus our input
        // if we know we are on IE *and* are scrolling.
        this._isScrollingOnIe = false;
        this.input.element.focus();
      }
    };

    _proto._onFormReset = function _onFormReset() {
      this._store.dispatch(resetTo(this._initialState));
    };

    _proto._highlightChoice = function _highlightChoice(el) {
      var _this19 = this;

      if (el === void 0) {
        el = null;
      }

      var choices = Array.from(this.dropdown.element.querySelectorAll('[data-choice-selectable]'));

      if (!choices.length) {
        return;
      }

      var passedEl = el;
      var highlightedChoices = Array.from(this.dropdown.element.querySelectorAll("." + this.config.classNames.highlightedState)); // Remove any highlighted choices

      highlightedChoices.forEach(function (choice) {
        choice.classList.remove(_this19.config.classNames.highlightedState);
        choice.setAttribute('aria-selected', 'false');
      });

      if (passedEl) {
        this._highlightPosition = choices.indexOf(passedEl);
      } else {
        // Highlight choice based on last known highlight location
        if (choices.length > this._highlightPosition) {
          // If we have an option to highlight
          passedEl = choices[this._highlightPosition];
        } else {
          // Otherwise highlight the option before
          passedEl = choices[choices.length - 1];
        }

        if (!passedEl) {
          passedEl = choices[0];
        }
      }

      passedEl.classList.add(this.config.classNames.highlightedState);
      passedEl.setAttribute('aria-selected', 'true');
      this.passedElement.triggerEvent(EVENTS.highlightChoice, {
        el: passedEl
      });

      if (this.dropdown.isActive) {
        // IE11 ignores aria-label and blocks virtual keyboard
        // if aria-activedescendant is set without a dropdown
        this.input.setActiveDescendant(passedEl.id);
        this.containerOuter.setActiveDescendant(passedEl.id);
      }
    };

    _proto._addItem = function _addItem(_ref13) {
      var value = _ref13.value,
          _ref13$label = _ref13.label,
          label = _ref13$label === void 0 ? null : _ref13$label,
          _ref13$choiceId = _ref13.choiceId,
          choiceId = _ref13$choiceId === void 0 ? -1 : _ref13$choiceId,
          _ref13$groupId = _ref13.groupId,
          groupId = _ref13$groupId === void 0 ? -1 : _ref13$groupId,
          _ref13$customProperti = _ref13.customProperties,
          customProperties = _ref13$customProperti === void 0 ? null : _ref13$customProperti,
          _ref13$placeholder = _ref13.placeholder,
          placeholder = _ref13$placeholder === void 0 ? false : _ref13$placeholder,
          _ref13$keyCode = _ref13.keyCode,
          keyCode = _ref13$keyCode === void 0 ? null : _ref13$keyCode;
      var passedValue = typeof value === 'string' ? value.trim() : value;
      var passedKeyCode = keyCode;
      var passedCustomProperties = customProperties;
      var items = this._store.items;
      var passedLabel = label || passedValue;
      var passedOptionId = choiceId || -1;
      var group = groupId >= 0 ? this._store.getGroupById(groupId) : null;
      var id = items ? items.length + 1 : 1; // If a prepended value has been passed, prepend it

      if (this.config.prependValue) {
        passedValue = this.config.prependValue + passedValue.toString();
      } // If an appended value has been passed, append it


      if (this.config.appendValue) {
        passedValue += this.config.appendValue.toString();
      }

      this._store.dispatch(items_addItem({
        value: passedValue,
        label: passedLabel,
        id: id,
        choiceId: passedOptionId,
        groupId: groupId,
        customProperties: customProperties,
        placeholder: placeholder,
        keyCode: passedKeyCode
      }));

      if (this._isSelectOneElement) {
        this.removeActiveItems(id);
      } // Trigger change event


      this.passedElement.triggerEvent(EVENTS.addItem, {
        id: id,
        value: passedValue,
        label: passedLabel,
        customProperties: passedCustomProperties,
        groupValue: group && group.value ? group.value : undefined,
        keyCode: passedKeyCode
      });
      return this;
    };

    _proto._removeItem = function _removeItem(item) {
      if (!item || !isType('Object', item)) {
        return this;
      }

      var id = item.id,
          value = item.value,
          label = item.label,
          choiceId = item.choiceId,
          groupId = item.groupId;
      var group = groupId >= 0 ? this._store.getGroupById(groupId) : null;

      this._store.dispatch(items_removeItem(id, choiceId));

      if (group && group.value) {
        this.passedElement.triggerEvent(EVENTS.removeItem, {
          id: id,
          value: value,
          label: label,
          groupValue: group.value
        });
      } else {
        this.passedElement.triggerEvent(EVENTS.removeItem, {
          id: id,
          value: value,
          label: label
        });
      }

      return this;
    };

    _proto._addChoice = function _addChoice(_ref14) {
      var value = _ref14.value,
          _ref14$label = _ref14.label,
          label = _ref14$label === void 0 ? null : _ref14$label,
          _ref14$isSelected = _ref14.isSelected,
          isSelected = _ref14$isSelected === void 0 ? false : _ref14$isSelected,
          _ref14$isDisabled = _ref14.isDisabled,
          isDisabled = _ref14$isDisabled === void 0 ? false : _ref14$isDisabled,
          _ref14$groupId = _ref14.groupId,
          groupId = _ref14$groupId === void 0 ? -1 : _ref14$groupId,
          _ref14$customProperti = _ref14.customProperties,
          customProperties = _ref14$customProperti === void 0 ? null : _ref14$customProperti,
          _ref14$placeholder = _ref14.placeholder,
          placeholder = _ref14$placeholder === void 0 ? false : _ref14$placeholder,
          _ref14$keyCode = _ref14.keyCode,
          keyCode = _ref14$keyCode === void 0 ? null : _ref14$keyCode;

      if (typeof value === 'undefined' || value === null) {
        return;
      } // Generate unique id


      var choices = this._store.choices;
      var choiceLabel = label || value;
      var choiceId = choices ? choices.length + 1 : 1;
      var choiceElementId = this._baseId + "-" + this._idNames.itemChoice + "-" + choiceId;

      this._store.dispatch(choices_addChoice({
        id: choiceId,
        groupId: groupId,
        elementId: choiceElementId,
        value: value,
        label: choiceLabel,
        disabled: isDisabled,
        customProperties: customProperties,
        placeholder: placeholder,
        keyCode: keyCode
      }));

      if (isSelected) {
        this._addItem({
          value: value,
          label: choiceLabel,
          choiceId: choiceId,
          customProperties: customProperties,
          placeholder: placeholder,
          keyCode: keyCode
        });
      }
    };

    _proto._addGroup = function _addGroup(_ref15) {
      var _this20 = this;

      var group = _ref15.group,
          id = _ref15.id,
          _ref15$valueKey = _ref15.valueKey,
          valueKey = _ref15$valueKey === void 0 ? 'value' : _ref15$valueKey,
          _ref15$labelKey = _ref15.labelKey,
          labelKey = _ref15$labelKey === void 0 ? 'label' : _ref15$labelKey;
      var groupChoices = isType('Object', group) ? group.choices : Array.from(group.getElementsByTagName('OPTION'));
      var groupId = id || Math.floor(new Date().valueOf() * Math.random());
      var isDisabled = group.disabled ? group.disabled : false;

      if (groupChoices) {
        this._store.dispatch(groups_addGroup({
          value: group.label,
          id: groupId,
          active: true,
          disabled: isDisabled
        }));

        var addGroupChoices = function addGroupChoices(choice) {
          var isOptDisabled = choice.disabled || choice.parentNode && choice.parentNode.disabled;

          _this20._addChoice({
            value: choice[valueKey],
            label: isType('Object', choice) ? choice[labelKey] : choice.innerHTML,
            isSelected: choice.selected,
            isDisabled: isOptDisabled,
            groupId: groupId,
            customProperties: choice.customProperties,
            placeholder: choice.placeholder
          });
        };

        groupChoices.forEach(addGroupChoices);
      } else {
        this._store.dispatch(groups_addGroup({
          value: group.label,
          id: group.id,
          active: false,
          disabled: group.disabled
        }));
      }
    };

    _proto._getTemplate = function _getTemplate(template) {
      var _this$_templates$temp;

      if (!template) {
        return null;
      }

      var classNames = this.config.classNames;

      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return (_this$_templates$temp = this._templates[template]).call.apply(_this$_templates$temp, [this, classNames].concat(args));
    };

    _proto._createTemplates = function _createTemplates() {
      var callbackOnCreateTemplates = this.config.callbackOnCreateTemplates;
      var userTemplates = {};

      if (callbackOnCreateTemplates && typeof callbackOnCreateTemplates === 'function') {
        userTemplates = callbackOnCreateTemplates.call(this, strToEl);
      }

      this._templates = cjs_default()(TEMPLATES, userTemplates);
    };

    _proto._createElements = function _createElements() {
      this.containerOuter = new container_Container({
        element: this._getTemplate('containerOuter', this._direction, this._isSelectElement, this._isSelectOneElement, this.config.searchEnabled, this.passedElement.element.type),
        classNames: this.config.classNames,
        type: this.passedElement.element.type,
        position: this.config.position
      });
      this.containerInner = new container_Container({
        element: this._getTemplate('containerInner'),
        classNames: this.config.classNames,
        type: this.passedElement.element.type,
        position: this.config.position
      });
      this.input = new input_Input({
        element: this._getTemplate('input', this._placeholderValue),
        classNames: this.config.classNames,
        type: this.passedElement.element.type,
        preventPaste: !this.config.paste
      });
      this.choiceList = new list_List({
        element: this._getTemplate('choiceList', this._isSelectOneElement)
      });
      this.itemList = new list_List({
        element: this._getTemplate('itemList', this._isSelectOneElement)
      });
      this.dropdown = new Dropdown({
        element: this._getTemplate('dropdown'),
        classNames: this.config.classNames,
        type: this.passedElement.element.type
      });
    };

    _proto._createStructure = function _createStructure() {
      // Hide original element
      this.passedElement.conceal(); // Wrap input in container preserving DOM ordering

      this.containerInner.wrap(this.passedElement.element); // Wrapper inner container with outer container

      this.containerOuter.wrap(this.containerInner.element);

      if (this._isSelectOneElement) {
        this.input.placeholder = this.config.searchPlaceholderValue || '';
      } else if (this._placeholderValue) {
        this.input.placeholder = this._placeholderValue;
        this.input.setWidth();
      }

      this.containerOuter.element.appendChild(this.containerInner.element);
      this.containerOuter.element.appendChild(this.dropdown.element);
      this.containerInner.element.appendChild(this.itemList.element);

      if (!this._isTextElement) {
        this.dropdown.element.appendChild(this.choiceList.element);
      }

      if (!this._isSelectOneElement) {
        this.containerInner.element.appendChild(this.input.element);
      } else if (this.config.searchEnabled) {
        this.dropdown.element.insertBefore(this.input.element, this.dropdown.element.firstChild);
      }

      if (this._isSelectElement) {
        this._highlightPosition = 0;
        this._isSearching = false;

        this._startLoading();

        if (this._presetGroups.length) {
          this._addPredefinedGroups(this._presetGroups);
        } else {
          this._addPredefinedChoices(this._presetChoices);
        }

        this._stopLoading();
      }

      if (this._isTextElement) {
        this._addPredefinedItems(this._presetItems);
      }
    };

    _proto._addPredefinedGroups = function _addPredefinedGroups(groups) {
      var _this21 = this;

      // If we have a placeholder option
      var placeholderChoice = this.passedElement.placeholderOption;

      if (placeholderChoice && placeholderChoice.parentNode.tagName === 'SELECT') {
        this._addChoice({
          value: placeholderChoice.value,
          label: placeholderChoice.innerHTML,
          isSelected: placeholderChoice.selected,
          isDisabled: placeholderChoice.disabled,
          placeholder: true
        });
      }

      groups.forEach(function (group) {
        return _this21._addGroup({
          group: group,
          id: group.id || null
        });
      });
    };

    _proto._addPredefinedChoices = function _addPredefinedChoices(choices) {
      var _this22 = this;

      // If sorting is enabled or the user is searching, filter choices
      if (this.config.shouldSort) {
        choices.sort(this.config.sorter);
      }

      var hasSelectedChoice = choices.some(function (choice) {
        return choice.selected;
      });
      var firstEnabledChoiceIndex = choices.findIndex(function (choice) {
        return choice.disabled === undefined || !choice.disabled;
      });
      choices.forEach(function (choice, index) {
        var value = choice.value,
            label = choice.label,
            customProperties = choice.customProperties,
            placeholder = choice.placeholder;

        if (_this22._isSelectElement) {
          // If the choice is actually a group
          if (choice.choices) {
            _this22._addGroup({
              group: choice,
              id: choice.id || null
            });
          } else {
            /**
             * If there is a selected choice already or the choice is not the first in
             * the array, add each choice normally.
             *
             * Otherwise we pre-select the first enabled choice in the array ("select-one" only)
             */
            var shouldPreselect = _this22._isSelectOneElement && !hasSelectedChoice && index === firstEnabledChoiceIndex;
            var isSelected = shouldPreselect ? true : choice.selected;
            var isDisabled = choice.disabled;

            _this22._addChoice({
              value: value,
              label: label,
              isSelected: isSelected,
              isDisabled: isDisabled,
              customProperties: customProperties,
              placeholder: placeholder
            });
          }
        } else {
          _this22._addChoice({
            value: value,
            label: label,
            isSelected: choice.selected,
            isDisabled: choice.disabled,
            customProperties: customProperties,
            placeholder: placeholder
          });
        }
      });
    }
    /**
     * @param {Item[]} items
     */
    ;

    _proto._addPredefinedItems = function _addPredefinedItems(items) {
      var _this23 = this;

      items.forEach(function (item) {
        if (typeof item === 'object' && item.value) {
          _this23._addItem({
            value: item.value,
            label: item.label,
            choiceId: item.id,
            customProperties: item.customProperties,
            placeholder: item.placeholder
          });
        }

        if (typeof item === 'string') {
          _this23._addItem({
            value: item
          });
        }
      });
    };

    _proto._setChoiceOrItem = function _setChoiceOrItem(item) {
      var _this24 = this;

      var itemType = getType(item).toLowerCase();
      var handleType = {
        object: function object() {
          if (!item.value) {
            return;
          } // If we are dealing with a select input, we need to create an option first
          // that is then selected. For text inputs we can just add items normally.


          if (!_this24._isTextElement) {
            _this24._addChoice({
              value: item.value,
              label: item.label,
              isSelected: true,
              isDisabled: false,
              customProperties: item.customProperties,
              placeholder: item.placeholder
            });
          } else {
            _this24._addItem({
              value: item.value,
              label: item.label,
              choiceId: item.id,
              customProperties: item.customProperties,
              placeholder: item.placeholder
            });
          }
        },
        string: function string() {
          if (!_this24._isTextElement) {
            _this24._addChoice({
              value: item,
              label: item,
              isSelected: true,
              isDisabled: false
            });
          } else {
            _this24._addItem({
              value: item
            });
          }
        }
      };
      handleType[itemType]();
    };

    _proto._findAndSelectChoiceByValue = function _findAndSelectChoiceByValue(val) {
      var _this25 = this;

      var choices = this._store.choices; // Check 'value' property exists and the choice isn't already selected

      var foundChoice = choices.find(function (choice) {
        return _this25.config.valueComparer(choice.value, val);
      });

      if (foundChoice && !foundChoice.selected) {
        this._addItem({
          value: foundChoice.value,
          label: foundChoice.label,
          choiceId: foundChoice.id,
          groupId: foundChoice.groupId,
          customProperties: foundChoice.customProperties,
          placeholder: foundChoice.placeholder,
          keyCode: foundChoice.keyCode
        });
      }
    };

    _proto._generatePlaceholderValue = function _generatePlaceholderValue() {
      if (this._isSelectElement) {
        var placeholderOption = this.passedElement.placeholderOption;
        return placeholderOption ? placeholderOption.text : false;
      }

      var _this$config4 = this.config,
          placeholder = _this$config4.placeholder,
          placeholderValue = _this$config4.placeholderValue;
      var dataset = this.passedElement.element.dataset;

      if (placeholder) {
        if (placeholderValue) {
          return placeholderValue;
        }

        if (dataset.placeholder) {
          return dataset.placeholder;
        }
      }

      return false;
    };

    return Choices;
  }();

  /* harmony default export */ var scripts_choices = __webpack_exports__["default"] = (choices_Choices);

  /***/ })
  /******/ ])["default"];
  });
  });

  /* floatl version 2.0.1 */
  function addClass$1(element, className) {
    if (element.classList) {
      element.classList.add(className);
    } else {
      element.className += ' ' + className;
    }
  }

  function removeClass$1(element, className) {
    if (element.classList) {
      element.classList.remove(className);
    } else {
      var re = new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi');
      element.className = element.className.replace(re, ' ');
    }
  }

  function addEventListener(element, event, cb) {
    if (element.addEventListener) {
      element.addEventListener(event, cb);
    } else {
      element.attachEvent('on' + event, function () {
        cb.call(element);
      });
    }
  }

  function removeEventListener(element, event, cb) {
    if (element.removeEventListener) {
      element.removeEventListener(event, cb);
    } else {
      element.detachEvent('on' + event, cb);
    }
  }

  var Placeholder =
  /** @class */
  function () {
    function Placeholder(element) {
      var _this = this;

      this.handleChange = function () {
        if (_this.input.value === '') {
          removeClass$1(_this.element, Placeholder.ACTIVE_CLASS);
        } else {
          addClass$1(_this.element, Placeholder.ACTIVE_CLASS);
        }
      };

      this.addFocusedClass = function () {
        if (!_this.element.classList.contains('Form-group-file')) {
          addClass$1(_this.element, Placeholder.FOCUSED_CLASS);
        }
      };

      this.removeFocusedClass = function () {
        if (!_this.element.classList.contains('Form-group-file')) {
          removeClass$1(_this.element, Placeholder.FOCUSED_CLASS);
        }
      };

      this.element = element;
      this.label = element.querySelectorAll('[data-placeholder-label]')[0];
      this.input = element.querySelectorAll('[data-placeholder-input]')[0]; // Return early if not both the label and input are present

      if (!this.label || !this.input) {
        return;
      }

      if (this.input.nodeName === 'TEXTAREA') {
        addClass$1(this.element, Placeholder.MULTILINE_CLASS);
      }

      if (this.input.getAttribute('required') != null) {
        addClass$1(this.element, Placeholder.MREQUIRED_CLASS);
      } // Handle initial value


      this.handleChange(); // Bind event listeners

      addEventListener(this.input, 'focus', this.addFocusedClass);
      addEventListener(this.input, 'blur', this.removeFocusedClass);

      for (var _i = 0, _a = ['keyup', 'blur', 'change', 'input']; _i < _a.length; _i++) {
        var event_1 = _a[_i];
        addEventListener(this.input, event_1, this.handleChange);
      }
    }

    Placeholder.prototype.destroy = function () {
      removeEventListener(this.input, 'focus', this.addFocusedClass);
      removeEventListener(this.input, 'blur', this.removeFocusedClass);

      for (var _i = 0, _a = ['keyup', 'blur', 'change', 'input']; _i < _a.length; _i++) {
        var event_2 = _a[_i];
        removeEventListener(this.input, event_2, this.handleChange);
      }
    };

    Placeholder.FOCUSED_CLASS = 'is-focused';
    Placeholder.ACTIVE_CLASS = 'is-active';
    Placeholder.MULTILINE_CLASS = 'is-multiline';
    Placeholder.MREQUIRED_CLASS = 'is-required';
    return Placeholder;
  }();

var MFDropdown = function MFDropdown(container, options) {
    var container = document.querySelectorAll(container);

    if (container && container.length > 0) {
      return container.forEach(function (c) {
        new MFDropdown()._init(c, options);
      });
    }
  };

  MFDropdown.fn = MFDropdown.prototype = {
    constructor: MFDropdown,
    _defaults: {
      dropClass: 'MFDropdown',
      dropButtonClass: 'MFDropdown-btn',
      dropMenuClass: 'MFDropdown-menu',
      dropHeaderClass: 'MFDropdown-header',
      dropToggleClass: 'MFDropdown-toggle',
      dropItemClass: 'MFDropdown-item',
      dropLinkClass: 'MFDropdown-link ',
      focusedClass: 'is-focused',
      activeClass: 'is-active',
      requiredClass: 'is-required',
      errorClass: 'is-error',
      selectedClass: 'selected',
      disabledClass: 'disabled',
      openedClass: 'opened',
      multiClass: 'multi',
      control: 'href',
      placeholder: 'Select'
    },
    _init: function _init(container, options) {
      this._setElements(container, options);

      this._buildDropdownButton();

      this._buildDropdownToggle();

      this._buildDropdownMenu();

      if (this.dropdown.querySelector('.Form-help')) {
        this.dropdown.appendChild(this.dropdown.querySelector('.Form-help'));
      }

      this._bindEvents();

      return this;
    },
    _setElements: function _setElements(container, options) {
      this.opts = Object.assign({}, this._defaults, options);
      this.dropdown = container;
      this.select = this.dropdown.querySelector('select');
      this.optionGroups = this.select.querySelectorAll('optgroup');
      this.options = this.select.querySelectorAll('option');
      this.dropButton = this.dropdown.getElementsByClassName(this.opts.dropButtonClass);
      this.dropItems = this.dropdown.getElementsByClassName(this.opts.dropItemClass);
      this.dropLinks = this.dropdown.getElementsByClassName(this.opts.dropLinkClass);
      this.isMulti = this.select.getAttribute('multiple') != null ? true : false;
      this.isRequired = false;
      this.length = this.options.length;
    },
    _buildDropdownButton: function _buildDropdownButton() {
      var that = this;
      var hinput = document.createElement('input');
      hinput.setAttribute('type', 'hidden');
      that.hiddenInput = hinput;
      var type = that.select.getAttribute('data-template') != null ? that.select.getAttribute('data-template') : 'input';
      var input = document.createElement(type);
      input.className = that.opts.dropButtonClass + ' Form-input';

      if (that.select.getAttribute('placeholder') != null) {
        input.setAttribute('placeholder', that.select.getAttribute('placeholder'));
      } else {
        input.setAttribute('placeholder', that.opts.placeholder);
      }

      if (type.toLowerCase() != 'input') {
        input.innerHTML = input.getAttribute('placeholder');
      }

      input.setAttribute('data-placeholder-input', '');

      if (that.select.getAttribute('required') != null) {
        input.setAttribute('required', '');
        that.dropdown.classList.add(that.opts.requiredClass);
        that.isRequired = true;
      }

      if (that.select.getAttribute('disabled') != null) {
        input.setAttribute('disabled', '');
      }

      if (that.isMulti) {
        that.dropdown.classList.add(that.opts.multiClass);
      }

      input.setAttribute('readonly', '');
      var hasSelected = false;
      var selectedString = '';
      var selectedHiddenString = '';
      that.options.forEach(function (option) {
        if (option.getAttribute('selected') != null) {
          hasSelected = true;
          selectedString += option.innerHTML + ',';
          selectedHiddenString += option.value + ',';
        }
      });

      if (hasSelected) {
        input.value = selectedString.slice(0, -1); //To get select opt text to display

        hinput.value = selectedHiddenString.slice(0, -1); //To get select opt value to submit
      }

      hinput.id = that.select.id ? that.select.id : '';
      that.select.id = '';
      hinput.name = that.select.name ? that.select.name : '';
      that.select.name = '';
      that.dropdown.appendChild(input);
      that.dropdown.appendChild(hinput);
    },
    _buildDropdownToggle: function _buildDropdownToggle() {
      var that = this;
      var span = document.createElement('span');
      span.className = that.opts.dropToggleClass;
      that.dropdown.appendChild(span);
    },
    _buildDropdownMenu: function _buildDropdownMenu() {
      var that = this;
      var html = '';
      var ul = document.createElement('ul');
      ul.className = that.opts.dropMenuClass;

      if (that.optionGroups && that.optionGroups.length > 0) {
        that.optionGroups.forEach(function (group, i) {
          html += '<li class="' + that.opts.dropHeaderClass + '">' + group.getAttribute('label') + '</li>';
          group.querySelectorAll('option').forEach(function (option, j) {
            var selectedClass = option.getAttribute('selected') != null ? 'selected' : '';
            var liClass = that.opts.dropItemClass + ' ' + group.nodeName + '-' + i + ' ' + selectedClass;
            html += '<li class="' + liClass + '"><a class="' + that.opts.dropLinkClass + '" data-value="' + option.value + '">' + option.innerHTML + '</a></li>';
          });
        });
      } else {
        that.options.forEach(function (option, j) {
          var selectedClass = option.getAttribute('selected') != null ? 'selected' : '';
          var liClass = that.opts.dropItemClass + ' ' + selectedClass;
          html += '<li class="' + liClass + '"><a class="' + that.opts.dropLinkClass + '" data-value="' + option.value + '">' + option.innerHTML + '</a></li>';
        });
      }

      ul.innerHTML = html;
      this.dropdown.appendChild(ul);
    },
    _checkMAX: function _checkMAX(array, max) {
      that.checkMAX = array.length <= max;
    },
    _bindEvents: function _bindEvents() {
      var _this = this;

      var that = this;
      that.dropButton = that.dropdown.getElementsByClassName(that.opts.dropButtonClass)[0];
      that.dropToggle = that.dropdown.getElementsByClassName(that.opts.dropToggleClass)[0];
      that.dropItems = that.dropdown.getElementsByClassName(that.opts.dropItemClass);
      that.dropButton.addEventListener('blur', function (e) {//that.dropdown.classList.remove(that.opts.focusedClass);
      });
      that.dropButton.addEventListener('click', function (e) {
        that.dropdown.classList.add('clicking');
        that.dropdown.classList.toggle(that.opts.openedClass);

        if (that.dropdown.classList.contains(that.opts.openedClass)) {
          that.dropdown.classList.add(that.opts.focusedClass);
        } else {
          that.dropdown.classList.remove(that.opts.focusedClass);

          that._updateStatus();

          that.dropdown.classList.remove('clicking');
        }
      });
      that.dropToggle.addEventListener('click', function (e) {
        that.dropdown.classList.add('clicking');
        that.dropdown.classList.toggle(that.opts.openedClass);

        if (that.dropdown.classList.contains(that.opts.openedClass)) {
          that.dropdown.classList.add(that.opts.focusedClass);
        } else {
          that.dropdown.classList.remove(that.opts.focusedClass);

          that._updateStatus();

          that.dropdown.classList.remove('clicking');
        }
      });
      that.dropItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
          e.preventDefault();
          var value = e.currentTarget.querySelector('.' + that.opts.dropLinkClass).innerHTML;
          var hvalue = e.currentTarget.querySelector('.' + that.opts.dropLinkClass).getAttribute('data-value');

          if (that.dropdown.classList.contains('is-error')) {
            that.dropdown.classList.remove('is-error');
          }

          if (!that.isMulti) {
            Array.from(that.dropItems).filter(function (i) {
              return i.classList.contains(that.opts.selectedClass);
            }).forEach(function (j) {
              j.classList.toggle(that.opts.selectedClass);
            });
            e.currentTarget.classList.toggle(that.opts.selectedClass);
            that.dropButton.value = value;
            that.hiddenInput.value = hvalue;
            that.dropdown.classList.toggle(that.opts.openedClass);
          } else {
            var valueArray = that.dropButton.value != '' ? Array.from(that.dropButton.value.split(', ')) : [];
            var hvalueArray = that.hiddenInput.value != '' ? Array.from(that.hiddenInput.value.split(', ')) : [];

            if (that.optionGroups && that.optionGroups.length > 0) {
              var gArray = Array.from(e.currentTarget.classList).filter(function (i) {
                return i.indexOf('OPTGROUP-') != -1;
              });

              if (gArray.length > 0) {
                var selectedGroupItems = that.dropdown.querySelectorAll('.' + gArray[0] + '.' + that.opts.selectedClass);
                var g = that.select.querySelectorAll('optgroup')[gArray[0].split('-')[1]];
                var gmax = g.getAttribute('data-max-options') ? g.getAttribute('data-max-options') : null;

                if (!e.currentTarget.classList.contains(that.opts.selectedClass)) {
                  if (selectedGroupItems.length < gmax || gmax == null) {
                    e.currentTarget.classList.add(that.opts.selectedClass);
                  }
                } else {
                  e.currentTarget.classList.remove(that.opts.selectedClass);
                }
              }
            } else {
              var max = that.select.getAttribute('data-max-options') ? that.select.getAttribute('data-max-options') : null;

              if (!e.currentTarget.classList.contains(that.opts.selectedClass)) {
                if (valueArray.length < max || max == null) {
                  e.currentTarget.classList.add(that.opts.selectedClass);
                }
              } else {
                e.currentTarget.classList.remove(that.opts.selectedClass);
              }
            }

            if (e.currentTarget.classList.contains(that.opts.selectedClass)) {
              if (valueArray.indexOf(value) == -1) {
                valueArray.push(value);
              }

              that.dropButton.value = valueArray.join(', ');

              if (hvalueArray.indexOf(hvalue) == -1) {
                hvalueArray.push(hvalue);
              }

              that.hiddenInput.value = hvalueArray.join(', ');
            } else {
              valueArray = valueArray.filter(function (i) {
                return i != value;
              });
              that.dropButton.value = valueArray.join(', ');
              hvalueArray = hvalueArray.filter(function (i) {
                return i != hvalue;
              });
              that.hiddenInput.value = hvalueArray.join(', ');
            }
          } //if (that.dropButton.value != '') {
          //that.dropdown.classList.add(that.opts.focusedClass);
          //   that.dropdown.classList.add(that.opts.activedClass);
          //} else {
          //that.dropdown.classList.remove(that.opts.focusedClass);
          //  that.dropdown.classList.remove(that.opts.activedClass);
          // }


          that._updateStatus();
        });
      });
      document.addEventListener('click', function (e) {
        var that = _this;
        var inside = that.dropdown.contains(e.target);

        if (!inside) {
          that.dropdown.classList.remove(that.opts.focusedClass);
          that.dropdown.classList.remove(that.opts.openedClass);

          if (that.dropdown.classList.contains('clicking')) {
            that._updateStatus();

            that.dropdown.classList.remove('clicking');
          }
        }
      }, false);
    },
    _updateStatus: function _updateStatus(target) {
      var that = this;

      if (that.dropButton.value != '') {
        that.dropdown.classList.add(that.opts.activeClass);
        that.dropdown.classList.remove('is-error');
        that.dropdown.classList.add('is-success');
      } else {
        that.dropdown.classList.remove(that.opts.activeClass);

        if (that.isRequired) {
          that.dropdown.classList.remove('is-success');
          that.dropdown.classList.add('is-error');
        }
      }

      that.dropdown.classList.remove(that.opts.focusedClass);

      that._complete();
    },
    _complete: function _complete(callback) {
      var that = this;
      var customEvent = new CustomEvent('mf.dropdown', {
        detail: {
          ele: that
        }
      });

      if (window.dispatchEvent) {
        that.dropdown.dispatchEvent(customEvent);
      } else {
        that.dropdown.fireEvent(customEvent);
      }

      callback && callback();
    },
    length: 0,
    push: [].push,
    sort: [].sort,
    splice: [].splice
  };
  function Form() {
    console.log('Form');
    var groups = document.querySelectorAll('[data-placeholder]');
    var selects = document.querySelectorAll('[data-select]');
    var selectOptions = {
      shouldSort: false
    };
    groups.forEach(function (group) {
      var placeholder = new Placeholder(group);
      console.log(placeholder);
    });
    var dropdowns = MFDropdown('.MFDropdown');
    var inputs = document.querySelectorAll('[data-placeholder-input]');
    inputs.forEach(function (input) {
      input.addEventListener('blur', function (e) {
        if (e.currentTarget.getAttribute('required') != undefined && e.currentTarget.getAttribute('data-placeholder-file') == undefined && !e.currentTarget.parentElement.classList.contains('MFDropdown')) {
          if (e.currentTarget.value.trim() == '') {
            e.currentTarget.parentElement.classList.remove('is-success');
            e.currentTarget.parentElement.classList.add('is-error');
          } else {
            e.currentTarget.parentElement.classList.remove('is-error');
            e.currentTarget.parentElement.classList.add('is-success');
          }
        }

        var type = input.getAttribute('type');

        if (type && type.toLocaleLowerCase() == 'email') {
          var reMail = /^(?:[a-zA-Z0-9]+[_\-\+\.]?)*[a-zA-Z0-9]+@(?:([a-zA-Z0-9]+[_\-]?)*[a-zA-Z0-9]+\.)+([a-zA-Z]{2,})+$/;

          if (!reMail.test(e.currentTarget.value)) {
            e.currentTarget.parentElement.classList.remove('is-success');
            e.currentTarget.parentElement.classList.add('is-error');
          } else {
            e.currentTarget.parentElement.classList.remove('is-error');
            e.currentTarget.parentElement.classList.add('is-success');
          }
        }
      });
    });
    selects.forEach(function (select) {
      new choices(select, selectOptions);
      console.log('SELECT:', select);
    });
    var radioboxes = document.querySelectorAll(".Form-group-rcbox input[type='radio']");
    var checkboxes = document.querySelectorAll(".Form-group-rcbox input[type='checkbox']");
    checkboxes.forEach(function (box) {
      if (box.getAttribute('required') != null) {
        box.closest('.Form-group-rcbox').classList.add('is-required');
      }

      box.addEventListener('click', function (e) {
        updateRCBoxStatus(e.currentTarget);
      });
    });
    radioboxes.forEach(function (box) {
      if (box.getAttribute('required') != null) {
        box.closest('.Form-group-rcbox').classList.add('is-required');
      }

      box.addEventListener('click', function (e) {
        updateRCBoxStatus(e.currentTarget);
      });
    });

    var updateRCBoxStatus = function updateRCBoxStatus(box) {
      if (box && box.getAttribute('required') != null) {
        if (box.checked) {
          box.closest('.Form-group-rcbox').classList.remove('is-error');
          box.closest('.Form-group-rcbox').classList.add('is-success');
        } else {
          box.closest('.Form-group-rcbox').classList.remove('is-success');
          box.closest('.Form-group-rcbox').classList.add('is-error');
        }
      }
    };

    var validateRCBox = function validateRCBox(id) {
      var form = document.getElementById(id);

      if (form) {
        var _radioboxes = form.querySelectorAll(".Form-group-rcbox input[type='radio']");

        var _checkboxes = form.querySelectorAll(".Form-group-rcbox input[type='checkbox']");

        _checkboxes.forEach(function (box) {
          updateRCBoxStatus(box);
        });

        _radioboxes.forEach(function (box) {
          if (box.getAttribute('required') != null) {
            updateRCBoxStatus(box);
          }
        });
      }
    };

    var fileInput = document.querySelectorAll('[data-placeholder-file]');
    var fileUpload = document.querySelectorAll('.Form-fileupload');
    var fileClear = document.querySelectorAll('.Form-fileclear');
    fileInput.forEach(function (input) {
      input.addEventListener('click', function (e) {
        var upload = e.currentTarget.parentElement.querySelector('.Form-fileupload');
        e.currentTarget.parentElement.classList.add('is-focused');
        e.currentTarget.parentElement.classList.add('is-clicked');

        if (upload) {
          upload.click();
        }
      });
    });
    fileUpload.forEach(function (upload) {
      upload.addEventListener('change', function (e) {
        var files = e.currentTarget.files;
        var parentE = e.currentTarget.parentElement;
        var fileContainer = parentE.querySelector('.file-name');

        if (files && files.length > 0) {
          fileContainer.innerHTML = files[0].name;
          parentE.querySelector('.Form-input').value = fileContainer.innerHTML;

          if (parentE.classList.contains('is-error')) {
            parentE.classList.remove('is-error');
          }

          parentE.classList.add('is-success');
        } else {
          if (parentE.querySelector('.Form-input').value != '') {
            parentE.classList.remove('is-error');
            parentE.classList.add('is-success');
          }
        }
      });
    });
    fileClear.forEach(function (clear) {
      clear.addEventListener('click', function (e) {
        var parentE = e.currentTarget.parentElement;
        parentE.querySelector('.Form-fileupload').value = null;
        parentE.querySelector('.Form-input').value = null;
        var fileContainer = parentE.querySelector('.file-name');
        fileContainer.innerHTML = '';
        parentE.classList.remove('is-success');

        if (parentE.classList.contains('is-active')) {
          parentE.classList.remove('is-active');
        }

        if (parentE.querySelector('.Form-input').getAttribute('required') != undefined) {
          parentE.classList.remove('is-success');
          parentE.classList.add('is-error');
        } //parentE.classList.remove('is-focused');

      }, false);
    });

    window.onfocus = function () {
      setTimeout(function () {
        fileUpload.forEach(function (upload) {
          var parentE = upload.parentElement;
          parentE.classList.remove('is-focused');

          if (upload.value.length == 0 && parentE.querySelector('.Form-input').value == '') {
            if (parentE.classList.contains('is-required') && parentE.classList.contains('is-clicked')) {
              parentE.classList.add('is-error');
            }
          } else {
            parentE.classList.remove('is-error');
          }
        });
      }, 100);
    };

    var submits = document.querySelectorAll('[data-submit]');
    submits.forEach(function (submit) {
      submit.addEventListener('click', function (e) {
        e.preventDefault();
        var id = e.currentTarget.getAttribute('data-submit');
        var form = document.getElementById(id);

        if (form) {
          if (form.querySelectorAll('.is-error').length == 0) {
            form.querySelectorAll('.is-required').forEach(function (ele) {
              if (!ele.classList.contains('is-success')) {
                ele.classList.add('is-error');
              }
            });
          }

          validateRCBox(id);
        } //add follow check in detail form submit logic.
        //validateForSubmit(form);

      });
    });
  }

  function Footer() {
    console.log('Footer');
  }

  // import { Group, Panel, Trigger } from 'lego-toggle';
  // import state from 'lego-state';
  // import MobileNav from 'lego-mobile-nav';
  function MobileMenu() {
    var body = document.body;
    var mobileMenu = document.querySelector('[data-mobilemenu]');
    var mobileMenuTriggers = document.querySelectorAll('[data-mobilemenu-trigger]');
    var mobileSubmenus = document.querySelectorAll('[data-submenu]');
    var submenuTriggers = document.querySelectorAll('[data-submenu-trigger]');
    mobileMenuTriggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        mobileMenuTriggers.forEach(function () {
          return trigger.classList.toggle('is-active');
        });
        document.body.classList.toggle('is-mobileMenuOpen');
        mobileMenu.classList.toggle('is-open');
        mobileMenu.querySelector('.MobileMenu-subMenus-menu').classList.remove('is-open');
        body.classList.remove('is-submenuOpen');
        body.classList.remove('is-submenuChildOpen');
      });
    });
    submenuTriggers.forEach(function (trigger) {
      var submenuName = trigger.dataset.submenuTrigger;
      trigger.addEventListener('click', function () {
        mobileSubmenus.forEach(function (submenu) {
          submenu.classList.remove('is-open');
        });

        if (submenuName) {
          var submenu = document.querySelector("[data-submenu=\"".concat(submenuName, "\"]"));
          submenu.classList.add('is-open');
          body.classList.add('is-submenuOpen');

          if (submenu.dataset.submenuChild) {
            body.classList.add('is-submenuChildOpen');
          } else {
            body.classList.remove('is-submenuChildOpen');
          }
        } else {
          var openSubmenu = document.querySelector('[data-submenu].is-open');

          if (openSubmenu) {
            openSubmenu.classList.remove('is-open');
          }

          body.classList.remove('is-submenuOpen');
          body.classList.remove('is-submenuChildOpen');
        }
      });
    });
  }

  function NavigationMenu() {
    console.log('NavigationMenu');
    var timeoutMouseenter = {};
    var delay = 250;
    var navMenus = document.querySelectorAll('[data-navigationmenu]');
    navMenus.forEach(function (navMenu) {
      var wideCallout = navMenu.querySelector('.NavigationMenu-wideCallout');
      var navMenuTabs = navMenu.querySelectorAll('[data-navigationmenu-tab]');
      var navMenuContents = navMenu.querySelectorAll('[data-navigationmenu-content]');
      var navMenuCallouts = navMenu.querySelectorAll('[data-navigationmenu-callout]');
      navMenuTabs.forEach(function (tab) {
        var connectedContent = navMenu.querySelector("[data-navigationmenu-content=\"".concat(tab.dataset.navigationmenuTab, "\"]"));
        var connectedCallout = navMenu.querySelector("[data-navigationmenu-callout=\"".concat(tab.dataset.navigationmenuTab, "\"]"));
        var id = tab.getAttribute("data-navigationmenu-tab");
        tab.addEventListener('mouseenter', function () {
          timeoutMouseenter[id] = setTimeout(function () {
            navMenuTabs.forEach(function (otherTab) {
              return otherTab.classList.remove('is-active');
            });
            tab.classList.add('is-active');
            navMenuContents.forEach(function (content) {
              content.classList.remove('is-active');
              connectedContent.classList.add('is-active');
            });
            navMenuCallouts.forEach(function (callout) {
              callout.classList.remove('is-active');

              if (connectedCallout != undefined) {
                connectedCallout.classList.add('is-active');
                wideCallout.removeAttribute("style");
              } else {
                wideCallout.style.display = "none";
              }
            });
          }, delay);
        });
        tab.addEventListener('mouseleave', function () {
          if (typeof timeoutMouseenter[id] != "undefined") {
            clearTimeout(timeoutMouseenter[id]);
          }
        });
      });
    });
  }

  var MFTab = function MFTab(container, options) {
    if (container != undefined) {
      return new MFTab()._init(container, options);
    }
  };

  MFTab.fn = MFTab.prototype = {
    constructor: MFTab,
    _defaults: {
      tabClass: 'MFTab',
      tabItemClass: 'MFTab-item',
      tabLinkClass: 'MFTab-link ',
      tabContentClass: 'MFTab-content',
      tabPaneClass: 'MFTab-pane',
      activeClass: 'active',
      control: 'href'
    },
    _init: function _init(container, options) {
      this._setElements(container, options);

      this._bindEvents();

      return this;
    },
    _setElements: function _setElements(container, options) {
      this.opts = Object.assign({}, this._defaults, options);
      this.tab = document.getElementById(container);
      this.tabItems = this.tab.getElementsByClassName(this.opts.tabItemClass);
      this.tabLinks = this.tab.getElementsByClassName(this.opts.tabLinkClass);
      this.tabContent = document.querySelector('[data-target="' + container + '"]');
      this.tabPanes = this.tabContent.getElementsByClassName(this.opts.tabPaneClass);
      this._previousElement = this.tabPanes[0];
      this._currentElement = this.tabPanes[0];
      this.length = this.tabItems.length;
    },
    _bindEvents: function _bindEvents() {
      var that = this;
      that.tab.addEventListener('click', function (e) {
        e.preventDefault();
        var target = e.target;
        var tabTarget;

        if (!target.classList.contains(that.opts.tabClass) && !target.classList.contains(that.opts.tabItemClass)) {
          if (target.nodeName != 'A') {
            tabTarget = target.parentElement.getAttribute(that.opts.control).slice(1) || null;
          } else {
            tabTarget = target.getAttribute(that.opts.control).slice(1) || null;
          }

          if (tabTarget != null) {
            that._update(tabTarget);
          }
        }
      });
    },
    _update: function _update(tabTarget) {
      var that = this;

      that._updateStatus(tabTarget);
    },
    _updateStatus: function _updateStatus(tabTarget) {
      var that = this;
      that.tabLinks.forEach(function (item, i) {
        var itemAttr = item.getAttribute(that.opts.control).slice(1);

        if (itemAttr != tabTarget) {
          item.classList.remove(that.opts.activeClass);
        } else {
          item.classList.add(that.opts.activeClass);
        }
      });
      that.tabPanes.forEach(function (item, i) {
        if (item.id != tabTarget) {
          if (item.classList.contains(that.opts.activeClass)) {
            that._previousElement = item;
          }

          item.classList.remove(that.opts.activeClass);
        } else {
          item.classList.add(that.opts.activeClass);
          that._currentElement = item;
        }
      });

      that._complete();
    },
    _complete: function _complete(callback) {
      var that = this;
      var hiddenEvent = new CustomEvent('hidden.mf.tab', {
        detail: {
          relatedTarget: that._previousElement
        }
      });
      var shownEvent = new CustomEvent('shown.mf.tab', {
        detail: {
          relatedTarget: that._currentElement
        }
      });

      if (window.dispatchEvent) {
        that.tab.dispatchEvent(hiddenEvent);
        that.tab.dispatchEvent(shownEvent);
      } else {
        that.tab.fireEvent(hiddenEvent);
        that.tab.fireEvent(shownEvent);
      }

      callback && callback();
    },
    show: function show(callback) {
      console.log('show');
      callback && callback();
    },
    hide: function hide(callback) {
      console.log('hide');
      callback && callback();
    },
    length: 0,
    push: [].push,
    sort: [].sort,
    splice: [].splice
  };

  function Partners() {
    console.log('Partners');
    var partners = document.querySelectorAll('.partners');

    if (partners && partners.length > 0) {
      partners.forEach(function (partner) {
        revealElements();
        var parterTabs = partner.querySelector('.partners-tabs');
        var parterTab = partner.querySelector('.partners-tab');
        var TabId = parterTab.id;
        var trigger = partner.querySelector('[data-partners-trigger]');
        var triggerText = partner.querySelector('.partners-trigger-inner-text');
        var tabActiveLink = partner.querySelector('.MFTab-link.active');
        var tab;

        if (parterTab) {
          tab = MFTab(TabId);
          parterTab.addEventListener('shown.mf.tab', function (event) {
            tabActiveLink = partner.querySelector('.MFTab-link.active');

            if (tabActiveLink) {
              triggerText.innerHTML = tabActiveLink.innerHTML;
            }

            if (parterTabs.classList.contains('open')) {
              parterTabs.classList.remove('open');
            }
          });
        }

        if (tabActiveLink) {
          triggerText.innerHTML = tabActiveLink.innerHTML;
        }

        if (trigger) {
          trigger.addEventListener('click', function () {
            //debugger;
            parterTabs.classList.toggle('open');
          });
        }
      });
    }
  }

  function PrimaryNav() {
    console.log('PrimaryNav');
    var shyNav = document.querySelector('[data-shy-nav]');
    var shyPlaceholder = document.querySelector('.ShyNav-shim');
    var navLinks = document.querySelectorAll('[data-navigationmenu-section]');
    var submenus = document.querySelectorAll('[data-navigationmenu]');
    var search = document.querySelector('[data-search]');
    var secondaryNav = document.querySelector('.SecondaryNav');
    var activeMenu = document.querySelector('.NavigationMenu.is-active');
    var mobildRow = document.querySelector('.PrimaryNav >.Container--row');
    var alertBanner = document.querySelector('.AlertBar');
    var alertHeight = 0;
    var shyPlaceholderHeight = shyPlaceholder ? shyPlaceholder.clientHeight : 0;
    var uaResult = new uaParser().getResult();
    var browserInfo = new uaParser().getBrowser();
    CustomUtil.initCheckScreen();
    updateElementsWithAlert();

    function updateElementsWithAlert() {
      shyPlaceholderHeight = CustomUtil.screenIs == 'isMobile' ? 76 : 143;

      if (alertBanner) {
        if (CustomUtil.screenIs == 'isMobile') {
          shyNav.appendChild(alertBanner);
        } else {
          shyNav.insertBefore(alertBanner, search);
        }

        shyPlaceholder.style.height = shyPlaceholderHeight + alertBanner.clientHeight + 'px';
        shyNav.style.height = shyPlaceholder.clientHeight + 'px';

        if (CustomUtil.screenIs == 'isMobile') {
          search.style.top = mobildRow.clientHeight + alertBanner.clientHeight + 'px';
        } else {
          search.style.top = secondaryNav.clientHeight + alertBanner.clientHeight + 'px';
        }

        submenus.forEach(function (menu) {
          if (browserInfo.name === 'IE' && /^11/.test(browserInfo.version)) {
            menu.style.top = shyNav.clientHeight + 'px';
          }

          if (browserInfo.name === 'Safari' || uaResult.device.type === 'tablet') {
            menu.style.top = shyNav.clientHeight + 'px';
          }
        });
      }
    }

    var timeoutMouseenter = {};
    var timeoutMouseleave = {};
    var delay = 250;
    navLinks.forEach(function (link) {
      var linkSubmenu = document.querySelector("[data-navigationmenu=\"".concat(link.dataset.navigationmenuSection, "\"]"));

      if (linkSubmenu) {
        var id = link.getAttribute('data-navigationmenu-section');
        link.addEventListener('mouseenter', function () {
          if (typeof timeoutMouseleave[id] != 'undefined') {
            clearTimeout(timeoutMouseleave[id]);
          }

          timeoutMouseenter[id] = setTimeout(function () {
            linkSubmenu.classList.add('is-active'); //reset submenu top

            var shytop = parseInt(shyNav.style.top.slice(0, shyNav.style.top.length - 2));

            if (browserInfo.name === 'IE' && /^11/.test(browserInfo.version)) {
              linkSubmenu.style.top = shytop + shyNav.clientHeight + 'px';
            }

            if (browserInfo.name === 'Safari' || uaResult.device.type === 'tablet') {
              linkSubmenu.style.top = shytop + shyNav.clientHeight + 'px';
            }
          }, delay);
        });
        link.addEventListener('mouseleave', function () {
          if (typeof timeoutMouseenter[id] != 'undefined') {
            clearTimeout(timeoutMouseenter[id]);
          }

          timeoutMouseleave[id] = setTimeout(function () {
            linkSubmenu.classList.remove('is-active');
          }, delay);
        });
      }
    });
    submenus.forEach(function (submenu) {
      var id = submenu.getAttribute('data-navigationmenu');
      submenu.addEventListener('mouseenter', function (e) {
        if (typeof timeoutMouseleave[id] != 'undefined') {
          clearTimeout(timeoutMouseleave[id]);
        } //submenu.classList.add('is-active');

      });
      submenu.addEventListener('mouseleave', function () {
        timeoutMouseleave[id] = setTimeout(function () {
          submenu.classList.remove('is-active');
          var shytop = parseInt(shyNav.style.top.slice(0, shyNav.style.top.length - 2));

          if (0 - shytop > shyNav.clientHeight) {
            shyNav.style.top = -parseInt(shyNav.clientHeight) + 'px';
            CustomUtil.settings.headerStatus = 0;
            CustomUtil.updateStickyElements();
          }
        }, delay);
      });
    });

    if (shyNav) {
      var scrollDownPosition = 0;
      var ticking = false;
      var navHeight = parseInt(shyNav.clientHeight);
      var prevScroTop = 0;
      var directionSwitch = false;
      var activeMenuHeight = 0;
      submenus.forEach(function (menu) {
        if (browserInfo.name === 'IE' && /^11/.test(browserInfo.version)) {
          menu.style.top = shyNav.clientHeight + 'px';
        }

        if (browserInfo.name === 'Safari' || uaResult.device.type === 'tablet') {
          menu.style.top = shyNav.clientHeight + 'px';
        }
      });

      function updateHeaderPositionWhenScroll() {
        var scroTop = window.scrollY || document.documentElement.scrollTop;
        navHeight = shyNav.clientHeight;

        if (alertBanner) {
          alertHeight = alertBanner.clientHeight;
        }

        if (shyNav.clientHeight == 0) {
          navHeight = CustomUtil.screenIs == 'isMobile' ? 76 + alertHeight : 143 + alertHeight;
        }

        activeMenu = document.querySelector('.NavigationMenu.is-active');

        if (search && search.classList.contains('is-touched')) {
          //Condition when searchbox opened.
          navHeight = shyNav.clientHeight + search.clientHeight;
        }

        if (activeMenu) {
          //Condition when submenu opened.
          navHeight = shyNav.clientHeight + activeMenu.clientHeight;
          activeMenuHeight = activeMenu.clientHeight;
        } else {
          if (search && !search.classList.contains('is-touched')) {
            if (scroTop <= prevScroTop) {
              //Condition when submenu opened and scroll outside, then scrollup, firstly reset primarynav top.
              if (!directionSwitch) {
                var shytop = parseInt(shyNav.style.top.slice(0, shyNav.style.top.length - 2));

                if (0 - parseInt(shytop) > parseInt(shyNav.clientHeight)) {
                  shyNav.style.top = -parseInt(shyNav.clientHeight) + 'px';
                  directionSwitch = true;
                }
              }
            }
          }
        }

        var navTopPX = shyNav.style.top;
        var navTop = parseInt(navTopPX.slice(0, navTopPX.length - 2));
        var setTop = 0;

        if (scroTop > prevScroTop) {
          // Scroll Down
          var topValue = navTop > -navHeight ? parseInt(navTop - (scroTop - prevScroTop)) : -navHeight;

          if (-topValue > navHeight) {
            //long scroll as anchor
            setTop = -navHeight;
          } else {
            setTop = scroTop > navHeight ? topValue : -(0 - scroTop) < shyPlaceholder.clientHeight ? 0 - scroTop : topValue;
          }

          shyNav.style.top = setTop + 'px';

          if (search) {
            if (CustomUtil.screenIs == 'isMobile') {
              search.style.top = setTop + mobildRow.clientHeight + alertHeight + 'px';
            } else {
              search.style.top = setTop + secondaryNav.clientHeight + alertHeight + 'px';
            }
          }

          if (activeMenu) {
            if (browserInfo.name === 'IE' && /^11/.test(browserInfo.version)) {
              activeMenu.style.top = setTop + shyNav.clientHeight + 'px';
            }

            if (browserInfo.name === 'Safari' || uaResult.device.type === 'tablet') {
              activeMenu.style.top = setTop + shyNav.clientHeight + 'px';
            }
          }

          directionSwitch = false;
        } else {
          // Scroll Up
          var _topValue = parseInt(navTop - (scroTop - prevScroTop)) > 0 ? 0 : parseInt(navTop - (scroTop - prevScroTop));

          setTop = navTop >= 0 ? 0 : _topValue;
          shyNav.style.top = setTop + 'px';

          if (search) {
            if (CustomUtil.screenIs == 'isMobile') {
              search.style.top = setTop + mobildRow.clientHeight + alertHeight + 'px';
            } else {
              search.style.top = setTop + secondaryNav.clientHeight + alertHeight + 'px';
            }
          }

          if (activeMenu) {
            if (browserInfo.name === 'IE' && /^11/.test(browserInfo.version)) {
              activeMenu.style.top = setTop + shyNav.clientHeight + 'px';
            }

            if (browserInfo.name === 'Safari' || uaResult.device.type === 'tablet') {
              activeMenu.style.top = setTop + shyNav.clientHeight + 'px';
            }
          }
        } // 0 = hide, 1 = show part, 2 = show all


        if (setTop == 0) {
          CustomUtil.settings.headerStatus = 2;
        } else if (setTop == -navHeight) {
          CustomUtil.settings.headerStatus = 0;
        } else {
          CustomUtil.settings.headerStatus = 1;
        } //console.log('headerStatus:' + CustomUtil.settings.headerStatus);


        prevScroTop = scroTop;
      }

      window.addEventListener('scroll', function (e) {
        var newScrollPosition = window.scrollY || document.documentElement.scrollTop;

        if (!ticking) {
          window.requestAnimationFrame(function () {
            updateHeaderPositionWhenScroll(); //updateHeaderPosition(newScrollPosition);

            ticking = false;
          });
          ticking = true;
        }
      });
      window.addEventListener('resize', function () {
        /*let shytop = parseInt(shyNav.style.top.slice(0, shyNav.style.top.length - 2));
        if (CustomUtil.screenIs == 'isMobile') {
          search.style.top = shytop + mobildRow.clientHeight + 'px';
        } else {
          search.style.top = shytop + secondaryNav.clientHeight + 'px';
        }*/
        CustomUtil.initCheckScreen();
        updateElementsWithAlert();
        CustomUtil.updateStickyElements();
      }, false);
      window.addEventListener('hashchange', function () {
        scrollDownPosition = window.scrollY || document.documentElement.scrollTop;
      }, false);

      if (document.location.hash != undefined && document.location.hash != '') {
        scrollDownPosition = window.scrollY || document.documentElement.scrollTop;
      }
    }
  }

  function Quote() {
    revealElements();
  }

  function SecondaryNav() {
    console.log('SecondaryNav');
  }

  function VerticalSlider() {
    console.log('VerticalSlider');
    var sliderContainer = document.getElementsByClassName('VerticalSlider')[0];

    if (sliderContainer) {
      var sliders = document.getElementsByClassName('VerticalSlider-item');

      if (sliders && sliders.length > 0) {
        var activeSlider = document.querySelector('.VerticalSlider-item.active');
        var indicatorContainer = document.getElementsByClassName('VerticalSlider-indicator')[0];
        var indicators = document.getElementsByClassName('VerticalSlider-indicator-item');
        var activeIndicator = document.querySelector('.VerticalSlider-indicator-item.active');
        var prevScroTop = 0;
        var ticking = false;
        CustomUtil.updateSettings();
        var sliderAllHeight = sliderContainer.offsetTop + sliderContainer.clientHeight;

        var updateStatus = function updateStatus(i, opt) {
          if (opt == 'remove') {
            //sliders[i].classList.remove('active');
            if (indicators[i].classList.contains('active')) {
              indicators[i].classList.remove('active');
            }
          } else if (opt = 'add') {
            sliders[i].classList.add('active');
            indicators[i].classList.add('active');
          }
        };

        var visibleAnimationElement = function visibleAnimationElement() {
          var showIndexArr = [];
          var showPreHeightArr = [];
          var activeIndex = null;
          var activeHeight = 0;
          var clientHeight = window.innerHeight - CustomUtil.settings.headerFixedHeight;
          var scroTop = document.documentElement.scrollTop - sliderContainer.offsetTop + CustomUtil.getAllStickyTop();
          var totalHeight = 0;

          for (var i = 0; i < sliders.length; i++) {
            var pageHeight = sliders[i].clientHeight;
            var preHeight = totalHeight;
            totalHeight = totalHeight + pageHeight;

            if (scroTop < totalHeight && scroTop + clientHeight >= preHeight) {
              showIndexArr.push(i);
              showPreHeightArr.push(preHeight); //console.log('Page show: ' + i);
            } else {
              //console.log('Page hide: ' + i);
              updateStatus(i, 'remove');
            }
          }

          for (var _i = 0; _i < showIndexArr.length; _i++) {
            var _pageHeight = sliders[showIndexArr[_i]].clientHeight;
            var xTop = scroTop - showPreHeightArr[_i];
            var xBottom = _pageHeight + showPreHeightArr[_i] - scroTop - clientHeight;
            xTop = xTop > 0 ? xTop : 0;
            xBottom = xBottom > 0 ? xBottom : 0;

            if (xTop > 0 && xBottom > 0 || xTop === 0 && xBottom === 0) {
              activeIndex = showIndexArr[_i];
              break;
            } else {
              var viewPageHeight = _pageHeight - xTop - xBottom;

              if (viewPageHeight > activeHeight) {
                activeHeight = viewPageHeight;
                activeIndex = showIndexArr[_i];
              }
            }
          }

          if (activeIndex != null) {
            console.log('Page active: ' + activeIndex);
            updateStatus(activeIndex, 'add');

            for (var k = 0; k < showIndexArr.length; k++) {
              if (activeIndex != showIndexArr[k]) {
                updateStatus(showIndexArr[k], 'remove');
              }
            }
          }
        };

        var bindClick = function bindClick() {
          indicators.forEach(function (indicator, i) {
            indicator.addEventListener('click', function (e) {
              var currentTarget = e.currentTarget;
              var target = e.target;
              var parent = target.parentNode;
              var relatorTarget;

              if (target.getAttribute('href') && target.getAttribute('href').indexOf('#') != -1) {
                relatorTarget = target.getAttribute('href').slice(1);
              } else {
                relatorTarget = parent;
              }

              var currIndex = Number(currentTarget.dataset['indicate']); //debugger;

              scrollToPosition(sliders[currIndex], currIndex);
            });
          });
        };

        var scrollToPosition = function scrollToPosition(element, index) {
          var top = sliderContainer.offsetTop;

          for (var i = 0; i < index; i++) {
            top = top + sliders[i].clientHeight;
          }

          var eleTop = CustomUtil.getAllStickyTop();
          var scrollTo = top;

          if (top > prevScroTop) {
            scrollTo = top - eleTop;
          } else {
            scrollTo = top - eleTop - CustomUtil.settings.headerFixedHeight;
          }

          if (history.replaceState != null) {
            history.replaceState({}, '', window.location.pathname + '#' + element.getAttribute('id'));
          }

          window.scrollTo(0, scrollTo);
        };

        var initLoad = function initLoad() {
          if (sliderContainer.offsetTop < window.innerHeight) {
            updateStatus(0, 'add');

            if (indicatorContainer.classList.contains('hide')) {
              indicatorContainer.classList.remove('hide');
            }
          }
        };

        initLoad();
        bindClick();
        window.addEventListener('scroll', function (e) {
          //console.log('Scroll start ...');
          if (!ticking) {
            window.requestAnimationFrame(function () {
              CustomUtil.updateSettings();
              var scroTop = window.scrollY || document.documentElement.scrollTop;
              var min = sliderContainer.offsetTop - CustomUtil.settings.headerFixedHeight - 1;
              var max = sliderContainer.offsetTop + sliderContainer.clientHeight - CustomUtil.settings.headerFixedHeight;

              if (scroTop < prevScroTop) {
                min = sliderContainer.offsetTop - CustomUtil.settings.headerFixedHeight - 1 - CustomUtil.getAllStickyTop();
              }

              if (scroTop >= min && scroTop < max) {
                if (indicatorContainer.classList.contains('hide')) {
                  indicatorContainer.classList.remove('hide');
                }

                visibleAnimationElement();
              } else {
                for (var i = 0; i < sliders.length; i++) {
                  updateStatus(i, 'remove');
                }

                indicatorContainer.classList.add('hide');
              }

              prevScroTop = scroTop;
              ticking = false;
            });
            ticking = true;
          } //console.log('Scroll end ...');

        });
        window.addEventListener('resize', function (e) {});
      }
    }
  }

  var MFCarousel = function MFCarousel(container, options) {
    var container = document.querySelectorAll(container);

    if (container && container.length > 0) {
      return container.forEach(function (c) {
        new MFCarousel()._init(c, options);
      });
    }
  };

  MFCarousel.fn = MFCarousel.prototype = {
    constructor: MFCarousel,
    _defaults: {
      images: [],
      innerClass: 'MFCarousel-inner',
      itemClass: 'MFCarousel-item',
      arrowControlClass: 'MFCarousel-control--arrows',
      prevClass: 'prev',
      nextClass: 'next',
      indicatorControlClass: 'MFCarousel-control--indicators',
      indicatorClass: 'indicator-item',
      activeClass: 'active',
      disabledClass: 'disabled',
      control: 'data-slide',
      auto: false,
      direction: 'left'
    },
    _init: function _init(container, options) {
      var that = this;

      this._setElements(container, options);

      var images = [];

      if (that.items && that.items.length > 0) {
        that.items.forEach(function (item) {
          var img = item.querySelector('img');

          if (img) {
            images.push(img.getAttribute('src'));
          }
        });
      }

      this._preloadImages(images);

      this._setInnerHeight();

      this._bindEvents();

      return this;
    },
    _setElements: function _setElements(container, options) {
      var _this = this;

      this.opts = Object.assign({}, this._defaults, options);
      this.container = container;
      this.containerString = '#' + container + ' ';
      this.inner = this.container.getElementsByClassName(this.opts.innerClass)[0];
      this.items = this.container.getElementsByClassName(this.opts.itemClass);
      this.controls = this.container.querySelectorAll('[' + this.opts.control + ']');
      this.arrowPrev = this.container.querySelector('[' + this.opts.control + '="prev"]');
      this.arrowNext = this.container.querySelector('[' + this.opts.control + '="next"]');
      this.controls.forEach(function (item, i) {
        var key = item.getAttribute(_this.opts.control);
        _this.controlObj[key] = item;
      });
      this.arrowControl = this.container.getElementsByClassName(this.opts.arrowControlClass);
      this.indicatorControl = this.container.getElementsByClassName(this.opts.indicatorControlClass);
      this.indicatorItems = this.container.getElementsByClassName(this.opts.indicatorClass);
      this.length = this.items.length;
    },
    _preloadImages: function _preloadImages(imgs) {
      var that = this;

      for (var i = 0; i < imgs.length; i++) {
        that.opts.images[i] = new Image();
        that.opts.images[i].src = imgs[i];

        if (i == imgs.length - 1) {
          that.opts.images[imgs.length - 1].onload = function () {
            that._setInnerHeight();
          };
        }
      }
    },
    _setInnerHeight: function _setInnerHeight() {
      var height = 0;
      this.items.forEach(function (item) {
        item.style.height = 'auto';

        if (item.clientHeight > height) {
          height = item.clientHeight;
        }
      });

      if (this.inner && height != 0) {
        this.inner.style.height = height + 'px';
      }

      this.items.forEach(function (item) {
        item.style.height = '100%';
      });
    },
    _bindEvents: function _bindEvents() {
      var _this2 = this;

      var that = this;
      that.controls.forEach(function (trigger, i) {
        trigger.addEventListener('click', function (e) {
          e.preventDefault();
          var target = e.currentTarget;
          var parent = target.parentNode;
          var currentTarget;

          if (target.getAttribute(that.opts.control) != null) {
            currentTarget = target;
          } else if (parent.getAttribute(that.opts.control) != null) {
            currentTarget = parent;
          }

          var slide = currentTarget.getAttribute(that.opts.control);

          if (slide != null) {
            if (isNaN(slide)) {
              if (slide.toLowerCase() === 'prev') {
                that.prev();
              } else if (slide.toLowerCase() === 'next') {
                that.next();
              }
            } else {
              //[].indexOf.call(that.indicatorItems, currentTarget)
              that.index = Number(slide);

              that._update();

              that._updateStatus();
            }
          }
        });
      });
      window.addEventListener('resize', function () {
        _this2._setInnerHeight();
      });
    },
    first: function first() {
      this.index = 0;

      this._update();
    },
    last: function last() {
      this.index = this.length - 1;

      this._update();
    },
    prev: function prev() {
      if (this.index-- > 0) {
        this._update();
      } else {
        this.index = 0;
        console.log('This is already first one');
      }

      if (this.container.classList.contains('MFCarousel-slide')) {
        var pIndex = this.index + 1;
        this.items[pIndex].style.transform = 'translateX(' + 100 + '%)';
        this.items[this.index].style.transform = 'translateX(0)';
      }
    },
    next: function next() {
      if (++this.index < this.length) {
        this._update();
      } else {
        this.index = this.length - 1;
        console.log('This is already last one');
      }

      if (this.container.classList.contains('MFCarousel-slide')) {
        var pIndex = this.index - 1;
        this.items[pIndex].style.transform = 'translateX(' + -100 + '%)';
        this.items[this.index].style.transform = 'translateX(0)';
      }
    },
    get: function get(num) {
      this.index = num >= 0 && num < this.length ? num : 0;

      this._update();
    },
    _update: function _update() {
      var that = this;

      that._updateStatus();
    },
    _updateStatus: function _updateStatus() {
      var that = this;
      that.items.forEach(function (item, i) {
        if (that.index != i) {
          item.classList.remove(that.opts.activeClass);
        } else {
          item.classList.add(that.opts.activeClass);
        }
      });

      if (this.indicatorControl.length) {
        that.indicatorItems.forEach(function (item, i) {
          if (that.index != i) {
            item.classList.remove(that.opts.activeClass);
          } else {
            item.classList.add(that.opts.activeClass);
          }
        });
      }

      if (this.arrowControl.length) {
        if (that.index < 1) {
          that.arrowNext.classList.remove(that.opts.disabledClass);
          that.arrowPrev.classList.add(that.opts.disabledClass);
        } else if (that.index >= this.length - 1) {
          that.arrowPrev.classList.remove(that.opts.disabledClass);
          that.arrowNext.classList.add(that.opts.disabledClass);
        } else {
          that.arrowPrev.classList.remove(that.opts.disabledClass);
          that.arrowNext.classList.remove(that.opts.disabledClass);
        }
      }
    },
    controlObj: {},
    index: 0,
    length: 0,
    push: [].push,
    sort: [].sort,
    splice: [].splice
  };

  // import '../../utilities/MF.js';

  function ProductDetail() {
    console.log('ProductDetail'); // const PD = MF('.ProductDetail').addClass('test');

    var pdpJson,
        result,
        pdpSkuArry = [];
    var currentModel = '';
    var country = 'US',
        site = 'seagate',
        locale = 'en_US';
    var pdpContainer = document.querySelector('.ProductDetail');

    if (pdpContainer) {

      var pdpHeader = pdpContainer.querySelector('.ProductDetail-header');
      var pdpTitle = pdpContainer.querySelector('.ProductDetail-title');
      var pdpDes = pdpContainer.querySelector('.ProductDetail-des');
      var pdpTab = pdpContainer.querySelector('.ProductDetail-tab');
      var pdpTabContent = pdpContainer.querySelector('.ProductDetail-tabContent');
      var pdpVideoModal = document.getElementById('ProductDetail-skuVideo-modal');
      var pdpTabLink;
      var pdpTabPane;
      var pdpTabPaneActive;
      var pdpCarousel;
      var pdpContent;
      var pdpSkuName;
      var pdpSkuPrice;
      var pdpSkuDes;
      var pdpSkuFeature;
      var pdpSkuFeature_items;
      var pdpSkuFeature_color;
      var pdpSkuFeature_color_title;
      var pdpSkuModel;
      var pdpSkuCta;
      var pdpSkuWC;
      var pdpSkuWhere;
      var pdpKeySpecs;
      var pdpSkukeySpec;
      var pdpSkuSystem;
      var pdpSkuInclude;
      var pdpLabel_overview = 'Overview';
      var pdpLabel_price = 'MSRP';
      var pdpLabel_model = 'Model No: ';
      var pdpLabel_keySpecs = 'Key Specs';
      var pdpLabel_productInfo = 'Product Info';
      var pdpLabel_where = 'Where to Buy';
      var pdpLabel_documentInfo = 'Documentation';
      var pdpLabel_currencySymbol = '$';
      var pdpLabel_buyNow = 'Buy Now';
      var videoLabel_cta = 'Click to Play';

      if (CustomUtil.isLocalhost()) {
        pdpJson = {
          //title: 'Three sizes to fit your needs.',
          //description: 'Bacon ipsum dolor amet turkey shankle pork belly.',
          overview_label: 'Overview',
          documentation_label: 'Documentation',
          productinfo_label: 'Product Info',
          msrp_label: 'MSRP',
          modelno_label: 'Model No: ',
          key_specs_label: 'Key Specs',
          where_to_buy_label: 'Where to buy',
          buynowbutton: 'Buy Now',
          videocta: 'Click to Play',
          currency_symbol: '$',
          site: 'seagate',
          is_where_to_buy: true,
          locale: 'en_US',
          country: 'US',
          inContextLink: "<img title='Edit item' border='0' src='/sites/legacy/images/edit_new.gif' style='width: 9px; height: 9px;' onclick=\"javascript: vui.cps.ui.pencilUtil.editItem('vui.vcm.type.CONTENT_INSTANCE', 'd527b5916d07d210VgnVCM1000001180090a____', 'PRODUCT-MASTER', 'a9a936d362c25710VgnVCM100000298c040aRCRD');\">",
          product_models: [{
            name: 'Firecuda SSD',
            internal_name: 'Firecuda SSD internal',
            is_external: false,
            category: '',
            inContextLink: "<img title='Edit item' border='0' src='/sites/legacy/images/edit_new.gif' style='width: 9px; height: 9px;' onclick=\"javascript: vui.cps.ui.pencilUtil.editItem('vui.vcm.type.CONTENT_INSTANCE', 'd527b5916d07d210VgnVCM1000001180090a____', 'PRODUCT-MASTER', '1c0a82dd2c567610VgnVCM1000002410db0aRCRD');\">",
            configurator_features_ordered: [{
              internal_name: 'colors_master_parent_feat',
              values: ['#f55930', '#cebc9d', '#327FC2', '#c4c4c4'],
              display_type: 'color'
            }, {
              internal_name: 'spin_speed_ts_master_feat',
              values: ['15000'],
              display_type: 'dropdown'
            }, {
              internal_name: 'capacity_ts_master_feat',
              values: ['500GB', '1TB', '2TB', '4TB'],
              display_type: 'button'
            }, {
              internal_name: 'cache_size_mb_ts_master_feat',
              values: ['0.512', '1', '32', '64/32'],
              display_type: 'button'
            }, {
              internal_name: 'interface_ts_master_feat',
              values: ['SATA 6Gb/s', 'PCIe Gen4 ×4, NVMe 1.3'],
              display_type: 'dropdown'
            }, {
              internal_name: 'barracuda_warranty_years_master_parent',
              values: ['5 years', '5 years'],
              display_type: 'button'
            }],
            skus: [{
              inContextLink: "<img title='Edit item' border='0' src='/sites/legacy/images/edit_new.gif' style='width: 9px; height: 9px;' onclick=\"javascript: vui.cps.ui.pencilUtil.editItem('vui.vcm.type.CONTENT_INSTANCE', '3147b5916d07d210VgnVCM1000001180090a____', 'PRODUCT-SKU-MASTER', '267febcd520e1710VgnVCM1000003d88040aRCRD');\">",
              modelNo: 'ZA500GM10001',
              key_specs_column2: {
                header: 'work with',
                bullets: ['bullet1', 'bullet2', 'bullet3']
              },
              key_specs_column3: {
                header: 'what is included',
                bullets: ['bullet1', 'bullet2', 'bullet3']
              },
              productManual: {
                title: 'User Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-120-ssd/_shared/files/100867394_B.pdf'
              },
              msrp: '',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '500GB',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: 'SATA 6Gb/s',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: '2.5 in × 7mm',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [{
                isvideo: true,
                videourl: 'https://www.youtube.com/watch?v=y881t8ilMyc',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'https://vimeo.com/368107677',
                small: '/assets/images/EXOS-5E8-v2.png',
                large: '/assets/images/EXOS-5E8-v2.png'
              }, {
                isvideo: true,
                videourl: 'https://v.qq.com/x/page/c3063k9hqur.html',
                small: '/assets/images/EXOS-5E8-v3.png',
                large: '/assets/images/EXOS-5E8-v3.png'
              }],
              wheretobuy: false,
              where_to_buy_label: 'Talk to an Expert22',
              where_to_buy_url: 'https://www.seagate22.com',
              name: 'FireCuda 120 SSD 500GB',
              configurator_features: [{
                title: 'Solar Orange',
                value: '#f55930',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                value: '15000',
                name: 'Spindle Speed (RPM)',
                internal_name: 'spin_speed_ts_master_feat',
                display_type: 'dropdown'
              }, {
                value: '500GB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                value: '64/32',
                name: 'Cache',
                internal_name: 'cache_size_mb_ts_master_feat',
                display_type: 'button'
              }, {
                value: 'SATA 6Gb/s',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],

              /*datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-120-ssd-DS2039-1-2004US-en_US.pdf',
              },*/
              hideSkuNumber: true
            }, {
              modelNo: 'ZA4000GM10001',
              system_requirements: '',

              /*productManual: {
                title: 'User Manual',
                url:
                  '/files/www-content/support-content/internal-products/ssd/firecuda-120-ssd/_shared/files/100867394_B.pdf',
              },*/
              msrp: '',
              overview: '',

              /*key_specs: [
                {
                  name: 'Capacity',
                  value: '',
                  internal_name: 'capacity_ts_master_feat',
                },
                {
                  name: 'Interface',
                  value: '',
                  internal_name: 'interface_ts_master_feat',
                },
                {
                  name: 'Form Factor',
                  value: '2.5 in × 7mm',
                  internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master',
                },
                {
                  name: 'Warranty',
                  value: '5 years',
                  internal_name: 'barracuda_warranty_years_master_parent',
                },
              ],*/
              gallery: [],
              wheretobuy: false,
              where_to_buy_label: 'Talk to an Expert',
              where_to_buy_url: 'https://www.seagate.com',
              name: 'FireCuda 120 SSD 4TB cta',
              what_is_include: '',
              configurator_features: [{
                title: 'Solar Orange',
                value: '#f55930',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                value: '4TB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                value: 'SATA 6Gb/s',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],

              /* datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-120-ssd-DS2039-1-2004US-en_US.pdf',
              },*/
              hideSkuNumber: false
            }, {
              modelNo: 'ZA2000GM10001',
              system_requirements: '',
              productManual: {
                title: 'User Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-120-ssd/_shared/files/100867394_B.pdf'
              },
              msrp: '79.99',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: '',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: '2.5 in × 7mm',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [],
              wheretobuy: false,
              where_to_buy_label: '',
              where_to_buy_url: 'https://www.seagate.com',
              name: 'FireCuda 120 SSD 2TB',
              what_is_include: '',
              configurator_features: [{
                title: 'Gold',
                value: '#cebc9d',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                value: '2TB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                value: '32',
                name: 'Cache',
                internal_name: 'cache_size_mb_ts_master_feat',
                display_type: 'button'
              }, {
                value: 'SATA 6Gb/s',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],
              datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-120-ssd-DS2039-1-2004US-en_US.pdf'
              },
              hideSkuNumber: false
            }, {
              modelNo: 'ZP500GM30002',
              system_requirements: '',
              productManual: {
                title: 'FireCuda 520 SSD Product Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-520-ssd/_shared/files/100857985-C-FireCuda-520-product-manual.pdf'
              },
              msrp: '',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: '',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: 'M.2 2280-D2',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [],
              wheretobuy: true,
              name: 'FireCuda 520 SSD 500GB',
              what_is_include: '',
              configurator_features: [{
                title: 'Camo Blue',
                value: '#327FC2',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                value: '7200',
                name: 'Spindle Speed (RPM)',
                internal_name: 'spin_speed_ts_master_feat',
                display_type: 'dropdown'
              }, {
                value: '500GB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                value: '1',
                name: 'Cache',
                internal_name: 'cache_size_mb_ts_master_feat',
                display_type: 'button'
              }, {
                value: 'PCIe Gen4 ×4, NVMe 1.3',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],
              datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-520-ssd-DS2024-1-1909US-en_US.pdf'
              },
              hideSkuNumber: false
            }, {
              modelNo: 'ZP2000GM3A002',
              system_requirements: "<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>",
              productManual: {
                title: 'FireCuda 520 SSD Product Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-520-ssd/_shared/files/100857985-C-FireCuda-520-product-manual.pdf'
              },
              msrp: '',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: '',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: '',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [{
                isvideo: true,
                videourl: 'http://www.youtube.com/watch?v=IVIHvRYmK7o',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'http://www.youtube.com/watch?v=cGbhEkGMxT4',
                small: '/assets/images/EXOS-5E8-v3.png',
                large: '/assets/images/EXOS-5E8-v3.png'
              }, {
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-5E8-v2.png',
                large: '/assets/images/EXOS-5E8-v2.png'
              }],
              wheretobuy: true,
              name: 'FireCuda 520 SSD 2000GB',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>",
              configurator_features: [{
                title: 'Silver',
                value: '#c4c4c4',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                value: '2TB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                value: 'PCIe Gen4 ×4, NVMe 1.3',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],
              datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-520-ssd-DS2024-1-1909US-en_US.pdf'
              },
              hideSkuNumber: false
            }, {
              modelNo: 'ZA1000GM10001',
              system_requirements: '',
              productManual: {
                title: 'User Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-120-ssd/_shared/files/100867394_B.pdf'
              },
              msrp: '',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: '',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: '2.5 in × 7mm',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [],
              wheretobuy: false,
              name: 'FireCuda 120 SSD 1TB',
              what_is_include: '',
              configurator_features: [{
                title: 'Silver',
                value: '#c4c4c4',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                value: '1TB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                value: '0.512',
                name: 'Cache',
                internal_name: 'cache_size_mb_ts_master_feat',
                display_type: 'button'
              }, {
                value: 'SATA 6Gb/s',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],
              datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-120-ssd-DS2039-1-2004US-en_US.pdf'
              },
              hideSkuNumber: false
            }]
          }, {
            is_external: false,
            category: 'ssd',
            name: 'SSD',
            internal_name: 'SSD internal',
            configurator_features_ordered: [{
              internal_name: 'colors_master_parent_feat',
              display_type: 'color',
              values: ['#f55930', '#cebc9d', '#327FC2', '#c4c4c4']
            }, {
              internal_name: 'capacity_ts_master_feat',
              display_type: 'button',
              values: ['500GB', '1TB', '2TB', '4TB']
            }, {
              internal_name: 'interface_ts_master_feat',
              display_type: 'dropdown',
              values: ['SATA 6Gb/s', 'PCIe Gen4 ×4, NVMe 1.3']
            }, {
              internal_name: 'barracuda_warranty_years_master_parent',
              display_type: 'button',
              values: ['5 years']
            }],
            skus: [{
              modelNo: 'ZA500GM10001',
              system_requirements: '',

              /*productManual: {
                title: 'User Manual',
                url:
                  '/files/www-content/support-content/internal-products/ssd/firecuda-120-ssd/_shared/files/100867394_B.pdf',
              },*/
              msrp: '',
              overview: '',

              /*key_specs: [
                {
                  order: 512000,
                  name: 'Capacity',
                  value: '500GB',
                  internal_name: 'capacity_ts_master_feat',
                },
                {
                  name: 'Interface',
                  value: 'SATA 6Gb/s',
                  internal_name: 'interface_ts_master_feat',
                },
                {
                  name: 'Form Factor',
                  value: '2.5 in × 7mm',
                  internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master',
                },
                {
                  name: 'Warranty',
                  value: '5 years',
                  internal_name: 'barracuda_warranty_years_master_parent',
                },
              ],*/
              gallery: [{
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'http://www.youtube.com/watch?v=cGbhEkGMxT4',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }, {
                isvideo: false,
                videourl: '',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_l.png'
              }],
              wheretobuy: false,
              where_to_buy_label: 'Export',
              where_to_buy_url: 'https://www.lacie.com',
              name: 'FireCuda 120 SSD 500GB',
              what_is_include: '',
              configurator_features: [{
                title: 'Solar Orange',
                order: 13,
                value: '#f55930',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                order: 512000,
                value: '500GB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                order: -1757583760,
                value: 'SATA 6Gb/s',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                order: 1,
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],

              /*datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-120-ssd-DS2039-1-2004US-en_US.pdf',
              },*/
              hideSkuNumber: true
            }, {
              modelNo: 'ZA4000GM10001',
              system_requirements: '',
              productManual: {
                title: 'User Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-120-ssd/_shared/files/100867394_B.pdf'
              },
              msrp: '',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: '',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: '2.5 in × 7mm',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [],
              wheretobuy: true,
              name: 'FireCuda 120 SSD 4TB',
              what_is_include: '',
              configurator_features: [{
                title: 'Solar Orange',
                order: 13,
                value: '#f55930',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                order: 4194304,
                value: '4TB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                order: -1757583760,
                value: 'SATA 6Gb/s',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                order: 1,
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],
              datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-120-ssd-DS2039-1-2004US-en_US.pdf'
              },
              hideSkuNumber: false
            }, {
              modelNo: 'ZA2000GM10001',
              system_requirements: '',
              productManual: {
                title: 'User Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-120-ssd/_shared/files/100867394_B.pdf'
              },
              msrp: '71',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: '',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: '2.5 in × 7mm',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [],
              wheretobuy: true,
              name: 'FireCuda 120 SSD 2TB',
              what_is_include: '',
              configurator_features: [{
                title: 'Gold',
                order: 25,
                value: '#cebc9d',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                order: 2097152,
                value: '2TB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                order: -1757583760,
                value: 'SATA 6Gb/s',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                order: 1,
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],
              datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-120-ssd-DS2039-1-2004US-en_US.pdf'
              },
              hideSkuNumber: false
            }, {
              modelNo: 'ZP500GM30002',
              system_requirements: '',
              productManual: {
                title: 'FireCuda 520 SSD Product Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-520-ssd/_shared/files/100857985-C-FireCuda-520-product-manual.pdf'
              },
              msrp: '56',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: '',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: 'M.2 2280-D2',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [],
              wheretobuy: true,
              name: 'FireCuda 520 SSD 500GB',
              what_is_include: '',
              configurator_features: [{
                title: 'Camo Blue',
                order: 39,
                value: '#327FC2',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                order: 512000,
                value: '500GB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              }, {
                order: -208216398,
                value: 'PCIe Gen4 ×4, NVMe 1.3',
                name: 'Interface',
                internal_name: 'interface_ts_master_feat',
                display_type: 'dropdown'
              }, {
                order: 1,
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],
              datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-520-ssd-DS2024-1-1909US-en_US.pdf'
              },
              hideSkuNumber: false
            }, {
              modelNo: 'ZP2000GM3A002',
              system_requirements: '<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>',
              productManual: {
                title: 'FireCuda 520 SSD Product Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-520-ssd/_shared/files/100857985-C-FireCuda-520-product-manual.pdf'
              },
              msrp: '',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: '',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: '',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [{
                isvideo: true,
                videourl: 'http://www.youtube.com/watch?v=cGbhEkGMxT4',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }],
              wheretobuy: true,
              name: 'FireCuda 520 SSD 2000GB',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>",
              configurator_features: [{
                title: 'Silver',
                order: 48,
                value: '#c4c4c4',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                order: 2097152,
                value: '2TB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              },
              /*{
                      "order": -208216398, 
                      "value": "PCIe Gen4 ×4, NVMe 1.3", 
                      "name": "Interface", 
                      "internal_name": "interface_ts_master_feat", 
                      "display_type": "dropdown"
                  }, */
              {
                order: 1,
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],
              datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-520-ssd-DS2024-1-1909US-en_US.pdf'
              },
              hideSkuNumber: false
            }, {
              modelNo: 'ZA1000GM10001',
              system_requirements: '',
              productManual: {
                title: 'User Manual',
                url: '/files/www-content/support-content/internal-products/ssd/firecuda-120-ssd/_shared/files/100867394_B.pdf'
              },
              msrp: '',
              overview: '',
              key_specs: [{
                name: 'Capacity',
                value: '',
                internal_name: 'capacity_ts_master_feat'
              }, {
                name: 'Interface',
                value: '',
                internal_name: 'interface_ts_master_feat'
              }, {
                name: 'Form Factor',
                value: '2.5 in × 7mm',
                internal_name: 'barracuda_510_ssd_form_factor_prod_feat_master'
              }, {
                name: 'Warranty',
                value: '5 years',
                internal_name: 'barracuda_warranty_years_master_parent'
              }],
              gallery: [],
              wheretobuy: true,
              name: 'FireCuda 120 SSD 1TB',
              what_is_include: '',
              configurator_features: [{
                title: 'Silver',
                order: 48,
                value: '#c4c4c4',
                name: 'Product Colors',
                internal_name: 'colors_master_parent_feat',
                display_type: 'color'
              }, {
                order: 1048576,
                value: '1TB',
                name: 'Capacity',
                internal_name: 'capacity_ts_master_feat',
                display_type: 'button'
              },
              /*{
                      "order": -1757583760, 
                      "value": "SATA 6Gb/s", 
                      "name": "Interface", 
                      "internal_name": "interface_ts_master_feat", 
                      "display_type": "dropdown"
                  }, */
              {
                order: 1,
                value: '5 years',
                name: 'Warranty',
                internal_name: 'barracuda_warranty_years_master_parent',
                display_type: 'button'
              }],
              datasheet: {
                title: ' Data Sheet',
                url: '/files/www-content/datasheets/pdfs/firecuda-120-ssd-DS2039-1-2004US-en_US.pdf'
              },
              hideSkuNumber: false
            }]
          }, {
            is_external: false,
            category: 'portable',
            name: 'Portable',
            internal_name: 'Portable internal',
            configurator_features_ordered: [{
              internal_name: 'capacity',
              display_type: 'button',
              values: ['2TB', '4TB', '6TB']
            }, {
              internal_name: 'format',
              display_type: 'dropdown',
              values: ['2TB Standard Fast Format 512e/4kn', '4TB Standard Fast Format 512e/4kn', '6TB Standard Fast Format 512e/4kn']
            }],
            skus: [{
              gallery: [{
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'http://www.youtube.com/watch?v=cGbhEkGMxT4',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }, {
                isvideo: true,
                videourl: '/assets/Lyve-Mobile-Family_Turn-Table-Animation_HD.mp4',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_l.png'
              }],
              hideSkuNumber: false,
              name: 'BarraCuda Fast SSD: 10TB -p',
              msrp: '$87.99',
              overview: 'Bacon ipsum dolor amet chicken shank meatloaf, pork belly burgdoggen ball tip meatball capicola andouille strip steak biltong. Pork loin drumstick hamburger turducken bresaola short loin tail, burgdoggen chislic filet mignon cow.',
              modelNo: 'STKC10000400',
              wheretobuy: true,
              configurator_features: [{
                name: 'Capacity',
                internal_name: 'capacity',
                value: '2TB',
                display_type: 'button',
                order: 2000000.0,
                reverse: true
              }, {
                name: 'Format',
                internal_name: 'format',
                value: '2TB Standard Fast Format 512e/4kn',
                display_type: 'dropdown',
                order: 1.0
              }],
              key_specs: [{
                name: 'Dimensions: H x W x D',
                value: '3.679 x 3.11 x 0.358 in / (93.51 x 79 x 9.1 mm)'
              }, {
                name: 'Weight',
                value: '0.309 (0.14kg)'
              }],
              system_requirements: '<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>"
            }, {
              gallery: [{
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'http://www.youtube.com/watch?v=IVIHvRYmK7o',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }, {
                isvideo: true,
                videourl: 'http://www.youtube.com/watch?v=cGbhEkGMxT4',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_l.png'
              }],
              hideSkuNumber: false,
              name: 'BarraCuda Fast SSD: 4TB -p',
              msrp: '$87.99',
              overview: 'Bacon ipsum dolor amet chicken shank meatloaf, pork belly burgdoggen ball tip meatball capicola andouille strip steak biltong. Pork loin drumstick hamburger turducken bresaola short loin tail, burgdoggen chislic filet mignon cow.',
              modelNo: 'STKC4000400',
              wheretobuy: true,
              configurator_features: [{
                name: 'Capacity',
                internal_name: 'capacity',
                value: '4TB',
                display_type: 'button',
                order: 4000000.0,
                reverse: true
              }, {
                name: 'Format',
                internal_name: 'format',
                value: '4TB Standard Fast Format 512e/4kn',
                display_type: 'dropdown',
                order: 1.0
              }],
              key_specs: [{
                name: 'Dimensions: H x W x D',
                value: '3.679 x 3.11 x 0.358 in / (93.51 x 79 x 9.1 mm)'
              }, {
                name: 'Weight',
                value: '0.309 (0.14kg)'
              }],
              system_requirements: '<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>"
            }, {
              gallery: [{
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'http://www.youtube.com/watch?v=IVIHvRYmK7o',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }, {
                isvideo: true,
                videourl: 'http://www.youtube.com/watch?v=IVIHvRYmK7o',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_l.png'
              }],
              hideSkuNumber: true,
              name: 'BarraCuda Fast SSD: 6TB',
              msrp: '$87.99',
              overview: 'Bacon ipsum dolor amet chicken shank meatloaf, pork belly burgdoggen ball tip meatball capicola andouille strip steak biltong. Pork loin drumstick hamburger turducken bresaola short loin tail, burgdoggen chislic filet mignon cow.',
              modelNo: 'STKC6000400',
              wheretobuy: true,
              configurator_features: [{
                name: 'Capacity',
                internal_name: 'capacity',
                value: '6TB',
                display_type: 'button',
                order: 6000000.0,
                reverse: true
              }, {
                name: 'Format',
                internal_name: 'format',
                value: '6TB Standard Fast Format 512e/4kn',
                display_type: 'dropdown',
                order: 2.0
              }],
              key_specs: [{
                name: 'Dimensions: H x W x D',
                value: '3.679 x 3.11 x 0.358 in / (93.51 x 79 x 9.1 mm)'
              }, {
                name: 'Weight',
                value: '0.309 (0.14kg)'
              }],
              system_requirements: '<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>"
            }, {
              gallery: [{
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'https://www.youtube.com/watch?v=gpY8c7lT_7k',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }, {
                isvideo: false,
                videourl: '',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_l.png'
              }],
              hideSkuNumber: false,
              name: 'BarraCuda Fast SSD: 2TB -p',
              msrp: '$87.99',
              overview: 'Bacon ipsum dolor amet chicken shank meatloaf, pork belly burgdoggen ball tip meatball capicola andouille strip steak biltong. Pork loin drumstick hamburger turducken bresaola short loin tail, burgdoggen chislic filet mignon cow.',
              modelNo: 'STKC2000400',
              wheretobuy: true,
              configurator_features: [{
                name: 'Capacity',
                internal_name: 'capacity',
                value: '2TB',
                display_type: 'button',
                order: 2000000.0,
                reverse: true
              }, {
                name: 'Format',
                internal_name: 'format',
                value: '2TB Standard Fast Format 512e/4kn',
                display_type: 'dropdown',
                order: 3.0
              }],
              key_specs: [{
                name: 'Dimensions: H x W x D',
                value: '3.679 x 3.11 x 0.358 in / (93.51 x 79 x 9.1 mm)'
              }, {
                name: 'Weight',
                value: '0.309 (0.14kg)'
              }],
              system_requirements: '<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>"
            }]
          }, {
            is_external: false,
            category: 'desktop',
            name: 'Desktop',
            internal_name: 'Desktop internal',
            configurator_features_ordered: [{
              internal_name: 'capacity',
              display_type: 'button',
              values: ['12TB', '6TB', '4TB', '2TB']
            }, {
              internal_name: 'format',
              display_type: 'dropdown',
              values: ['12TB Standard Fast Format 512e/4kn', '6TB Standard Fast Format 512e/4kn', '4TB Standard Fast Format 512e/4kn', '2TB Standard Fast Format 512e/4kn']
            }],
            skus: [{
              gallery: [{
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'https://www.youtube.com/watch?v=gpY8c7lT_7k',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }, {
                isvideo: true,
                videourl: 'https://www.youtube.com/watch?v=gpY8c7lT_7k',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_l.png'
              }],
              hideSkuNumber: false,
              name: 'BarraCuda Fast SSD: 12TB -d',
              msrp: '$87.99',
              overview: 'Bacon ipsum dolor amet chicken shank meatloaf, pork belly burgdoggen ball tip meatball capicola andouille strip steak biltong. Pork loin drumstick hamburger turducken bresaola short loin tail, burgdoggen chislic filet mignon cow.',
              modelNo: 'STKC12000400',
              wheretobuy: true,
              configurator_features: [{
                name: 'Capacity',
                internal_name: 'capacity',
                value: '12TB',
                display_type: 'button',
                order: 12000000.0,
                reverse: true
              }, {
                name: 'Format',
                internal_name: 'format',
                value: '12TB Standard Fast Format 512e/4kn',
                display_type: 'dropdown',
                order: 2.0
              }],
              key_specs: [{
                name: 'Dimensions: H x W x D',
                value: '3.679 x 3.11 x 0.358 in / (93.51 x 79 x 9.1 mm)'
              }, {
                name: 'Weight',
                value: '0.309 (0.14kg)'
              }],
              system_requirements: '<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>"
            }, {
              gallery: [{
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: '/assets/ldr-all.mp4',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }, {
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'https://www.youtube.com/xxxxx',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_l.png'
              }],
              hideSkuNumber: true,
              name: 'BarraCuda Fast SSD: 4TB',
              msrp: '$87.99',
              overview: 'Bacon ipsum dolor amet chicken shank meatloaf, pork belly burgdoggen ball tip meatball capicola andouille strip steak biltong. Pork loin drumstick hamburger turducken bresaola short loin tail, burgdoggen chislic filet mignon cow.',
              modelNo: 'STKC4000400',
              wheretobuy: true,
              configurator_features: [{
                name: 'Capacity',
                internal_name: 'capacity',
                value: '4TB',
                display_type: 'button',
                order: 4000000.0,
                reverse: true
              }, {
                name: 'Format',
                internal_name: 'format',
                value: '4TB Standard Fast Format 512e/4kn',
                display_type: 'dropdown',
                order: 1.0
              }],
              key_specs: [{
                name: 'Dimensions: H x W x D',
                value: '3.679 x 3.11 x 0.358 in / (93.51 x 79 x 9.1 mm)'
              }, {
                name: 'Weight',
                value: '0.309 (0.14kg)'
              }],
              system_requirements: '<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>"
            }, {
              gallery: [{
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'https://www.youtube.com/watch?v=gpY8c7lT_7k',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }, {
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'https://www.youtube.com/watch?v=gpY8c7lT_7k',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_l.png'
              }],
              hideSkuNumber: true,
              name: 'BarraCuda Fast SSD: 6TB',
              msrp: '$87.99',
              overview: 'Bacon ipsum dolor amet chicken shank meatloaf, pork belly burgdoggen ball tip meatball capicola andouille strip steak biltong. Pork loin drumstick hamburger turducken bresaola short loin tail, burgdoggen chislic filet mignon cow.',
              modelNo: 'STKC6000400',
              wheretobuy: true,
              configurator_features: [{
                name: 'Capacity',
                internal_name: 'capacity',
                value: '6TB',
                display_type: 'button',
                order: 6000000.0,
                reverse: true
              }, {
                name: 'Format',
                internal_name: 'format',
                value: '6TB Standard Fast Format 512e/4kn',
                display_type: 'dropdown',
                order: 3.0
              }],
              key_specs: [{
                name: 'Dimensions: H x W x D',
                value: '3.679 x 3.11 x 0.358 in / (93.51 x 79 x 9.1 mm)'
              }, {
                name: 'Weight',
                value: '0.309 (0.14kg)'
              }],
              system_requirements: '<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>"
            }, {
              gallery: [{
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'https://www.youtube.com/watch?v=gpY8c7lT_7k',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Barracuda-120-v2_l.png'
              }, {
                isvideo: false,
                videourl: '',
                small: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png',
                large: '/assets/images/EXOS-X16_Hero-Left_Hi-res_l.png'
              }, {
                isvideo: true,
                videourl: 'https://www.youtube.com/watch?v=gpY8c7lT_7k',
                small: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_s.png',
                large: '/Developer Content/HS-WS/www-redesign-2020/Seagate_Expansion-SSD-v3_l.png'
              }],
              hideSkuNumber: false,
              name: 'BarraCuda Fast SSD: 2TB',
              msrp: '$87.99',
              overview: 'Bacon ipsum dolor amet chicken shank meatloaf, pork belly burgdoggen ball tip meatball capicola andouille strip steak biltong. Pork loin drumstick hamburger turducken bresaola short loin tail, burgdoggen chislic filet mignon cow.',
              modelNo: 'STKC2000400',
              wheretobuy: true,
              configurator_features: [{
                name: 'Capacity',
                internal_name: 'capacity',
                value: '2TB',
                display_type: 'button',
                order: 2000000.0,
                reverse: true
              }, {
                name: 'Format',
                internal_name: 'format',
                value: '2TB Standard Fast Format 512e/4kn',
                display_type: 'dropdown',
                order: 4.0
              }],
              key_specs: [{
                name: 'Dimensions: H x W x D',
                value: '3.679 x 3.11 x 0.358 in / (93.51 x 79 x 9.1 mm)'
              }, {
                name: 'Weight',
                value: '0.309 (0.14kg)'
              }],
              system_requirements: '<h6>System Requirements</h6><ul><li>Computor with C-port</li><li>Latest version of Mac / Latest version of Windows 7</li><li>Min free disk space: 800MB</li></ul>',
              what_is_include: "<h6>What's Include</h6><ul><li><a href=''>Seagate Fast SSD</a></li><li><a href=''>USB Type-C</a></li><li><a href=''>USB Type-C Type-A</a></li><li><a href=''>Quick Install Guide</a></li> <li><a href=''>2 Months Adobe Creative Cloud</a></li></ul>"
            }]
          }]
        };
        initPD(pdpJson);
      } else {
        if (typeof pdpData !== 'undefined') {
          pdpJson = pdpData;
          initPD(pdpJson);
        }
      }

      function initPD(data) {
        //loading.classList.add('hide');
        pdpJson = data;

        if (NotUndefined(pdpJson.product_models)) {
          newTempSkuArry(); //For Hash

          setLabelAndValue();
          initBuildHtml();
          bindMFCarousel();
          bindMFTab();
          getElements();
          reMappingFeatures();

          if (document.location.hash || document.location.href.indexOf('?sku=') != -1) {
            resetFeatureWithHash();
          } else {
            reSetFirstFeatureActive();
          }

          bindSkuFeaturesEvent();
          bindToggleEvent(); //bindVideoModal();

          removeEmptyDiv();
          document.querySelectorAll('a').forEach(function (link) {
            var href = link.getAttribute('href');

            if (href && href.indexOf('#pd-') != -1) {
              link.addEventListener('click', function (e) {
                e.preventDefault();
                var hashMode = link.getAttribute('href').split('#pd-')[1];
                switchSkuWithHash(hashMode);
                var linkTop = link.parentElement.offsetTop;
                var scrollTo = pdpContainer.offsetTop;

                if (linkTop > scrollTo) {
                  var skyNav = document.querySelector('.ShyNav');
                  var inPageNav = document.querySelector('.InPageNav');

                  if (skyNav) {
                    scrollTo -= skyNav.clientHeight;
                  }
                }

                var tabTop = document.getElementById('ProductDetailTab').offsetTop;
                var tabHeight = document.getElementById('ProductDetailTab').clientHeight + 60;
                scrollTo += tabTop;
                scrollTo -= tabHeight;
                window.scrollTo(0, scrollTo);
              });
            }
          });
          window.addEventListener('load', function (event) {
            resetFeatureWithHash();
          });
          window.addEventListener('hashchange', function (e) {
            e.preventDefault();
            resetFeatureWithHash();
          }, false);
        }

        function newTempSkuArry() {
          pdpSkuArry.length = pdpJson.product_models.length;

          for (var j = 0; j < pdpJson.product_models.length; j++) {
            pdpSkuArry[j] = {};
            pdpSkuArry[j].category = pdpJson.product_models[j].internal_name;
            pdpSkuArry[j].skus = [];

            for (var i = 0; i < pdpJson.product_models[j].skus.length; i++) {
              pdpSkuArry[j].skus.push(pdpJson.product_models[j].skus[i].modelNo);
            }
          }
        }
      }

      function switchSkuWithHash(hashMode) {
        if (currentModel != hashMode) {
          var type;

          for (var j = 0; j < pdpSkuArry.length; j++) {
            if (pdpSkuArry[j].skus.indexOf(hashMode) !== -1) {
              type = pdpSkuArry[j].category;
            }
          }

          pdpTabLink.forEach(function (link, index) {
            if (link.getAttribute('href').indexOf(type) !== -1) {
              link.click();
            }
          });
          currentModel = hashMode;
          pdpTabPaneActive.setAttribute('data-model', currentModel);
          updateFeatures(currentModel);
          updateSku(type, currentModel);
        }
      }

      function resetFeatureWithHash(hashMode) {
        if (document.location.hash || document.location.href.indexOf('?sku=') != -1) {
          var hashMode;

          if (document.location.hash) {
            hashMode = document.location.hash.slice(1);
          } else {
            hashMode = document.location.href.split('?sku=')[1];
          }

          switchSkuWithHash(hashMode);
          var scrollTo = pdpContainer.offsetTop;
          var inPageNav = document.querySelector('.InPageNav');

          if (inPageNav) {
            scrollTo -= inPageNav.clientHeight;
          }

          var tabTop = document.getElementById('ProductDetailTab').offsetTop;
          var tabHeight = document.getElementById('ProductDetailTab').clientHeight + 60;
          scrollTo += tabTop;
          scrollTo -= tabHeight;
          window.scrollTo(0, scrollTo);
        }
      }

      function removeEmptyDiv() {
        if (pdpTitle && pdpTitle.innerHTML.trim() == '') {
          pdpTitle.parentElement.removeChild(pdpTitle);
        }

        if (pdpDes && pdpDes.innerHTML.trim() == '') {
          pdpDes.parentElement.removeChild(pdpDes);
        }

        if (pdpTab && pdpTab.innerHTML.trim() == '') {
          pdpTab.parentElement.removeChild(pdpTab);
        }

        if (pdpHeader && pdpHeader.innerHTML.trim() == '') {
          pdpHeader.parentElement.removeChild(pdpHeader);
        }
      }

      function buildImgEditIcon(data) {
        var html = '';

        if (NotUndefined(data.inContextLink)) {
          html = data.inContextLink;
        }

        return html;
      }

      function setLabelAndValue() {
        country = NotUndefined(pdpJson.country) ? pdpJson.country : country;
        site = NotUndefined(pdpJson.site) ? pdpJson.site : site;
        locale = NotUndefined(pdpJson.locale) ? pdpJson.locale : locale;
        pdpLabel_currencySymbol = NotUndefined(pdpJson.currency_symbol) ? pdpJson.currency_symbol : pdpLabel_currencySymbol;
        pdpLabel_overview = NotUndefined(pdpJson.overview_label) ? pdpJson.overview_label : pdpLabel_overview;
        pdpLabel_price = NotUndefined(pdpJson.msrp_label) ? pdpJson.msrp_label : pdpLabel_price;
        pdpLabel_model = NotUndefined(pdpJson.modelno_label) ? pdpJson.modelno_label : pdpLabel_model;
        pdpLabel_keySpecs = NotUndefined(pdpJson.key_specs_label) ? pdpJson.key_specs_label : pdpLabel_keySpecs;
        pdpLabel_productInfo = NotUndefined(pdpJson.productinfo_label) ? pdpJson.productinfo_label : pdpLabel_productInfo;
        pdpLabel_where = NotUndefined(pdpJson.where_to_buy_label) ? pdpJson.where_to_buy_label : pdpLabel_where;
        pdpLabel_documentInfo = NotUndefined(pdpJson.documentation_label) ? pdpJson.documentation_label : pdpLabel_documentInfo;
        pdpLabel_buyNow = NotUndefined(pdpJson.buynowbutton) ? pdpJson.buynowbutton : pdpLabel_buyNow;
        videoLabel_cta = NotUndefined(pdpJson.videocta) ? pdpJson.videocta : videoLabel_cta;
      }

      function getElements() {
        pdpTabLink = pdpContainer.querySelectorAll('.ProductDetail-tab .MFTab-link');
        pdpTabPane = pdpContainer.querySelector('.ProductDetail-tabContent > .MFTab-pane');
        pdpTabPaneActive = pdpContainer.querySelector('.ProductDetail-tabContent > .MFTab-pane.active');
        pdpCarousel = pdpTabPaneActive.querySelector('.ProductDetail-slide');
        pdpContent = pdpTabPaneActive.querySelector('.ProductDetail-content');
        pdpSkuName = pdpTabPaneActive.querySelector('.ProductDetail-skuName');
        pdpSkuPrice = pdpTabPaneActive.querySelector('.ProductDetail-skuPrice .value');
        pdpSkuDes = pdpTabPaneActive.querySelector('.ProductDetail-skuDes');
        pdpSkuFeature = pdpTabPaneActive.querySelectorAll('.ProductDetail-skuFeature');
        pdpSkuFeature_items = pdpContainer.querySelectorAll('.ProductDetail-skuFeature  .feature');
        pdpSkuFeature_color = pdpTabPaneActive.querySelector('.ProductDetail-skuFeature-color');
        pdpSkuFeature_color_title = pdpTabPaneActive.querySelector('.ProductDetail-skuFeature-color + .color-title');
        pdpSkuModel = pdpTabPaneActive.querySelector('.ProductDetail-skuModel .value');
        pdpSkuWC = pdpTabPaneActive.querySelector('.ProductDetail-skuWC');
        pdpSkuWhere = pdpTabPaneActive.querySelector('.ProductDetail-skuWhere');
        pdpSkuCta = pdpTabPaneActive.querySelector('.ProductDetail-skuCta');
        pdpKeySpecs = pdpTabPaneActive.querySelector('.ProductDetail-block--keySpec');
        pdpSkukeySpec = pdpTabPaneActive.querySelector('.ProductDetail-block--keySpec .ProductDetail-blockItem-keySpec');
        pdpSkuSystem = pdpTabPaneActive.querySelector('.ProductDetail-block--keySpec .ProductDetail-blockItem-system');
        pdpSkuInclude = pdpTabPaneActive.querySelector('.ProductDetail-block--keySpec .ProductDetail-blockItem-include');
      }

      function checkUndefined(e) {
        if (e == null || e == undefined || e == '' || e.length == 0) {
          return '';
        } else {
          return e;
        }
      }

      function NotUndefined(e) {
        if (e == null || e == undefined || e == '' || e.length == 0) {
          return false;
        } else {
          return true;
        }
      }

      function reMappingFeatures() {
        currentModel = pdpTabPaneActive.getAttribute('data-model');

        if (NotUndefined(pdpSkuFeature)) {
          pdpSkuFeature.forEach(function (feature) {
            var items = feature.querySelectorAll('.feature');
            var items_hide = feature.querySelectorAll('.feature.hide');

            if (NotUndefined(items_hide)) {
              items_hide.forEach(function (item_hide) {
                items.forEach(function (item) {
                  if (item_hide.getAttribute('data-val') == item.getAttribute('data-val')) {
                    var model_hide = item_hide.getAttribute('data-model');
                    var model = item.getAttribute('data-model');
                    model_hide.split(',').forEach(function (m) {
                      if (model.split(',').indexOf(m) === -1) {
                        model = model + ',' + m;
                      }
                    });
                    item.setAttribute('data-model', model);
                  }
                });
                items_hide.forEach(function (item) {
                  if (NotUndefined(item.parentNode)) {
                    item.parentNode.removeChild(item);
                  }
                });
              });
            }

            if (feature.querySelector('select')) {
              items = feature.querySelectorAll('.feature');

              if (items.length == 1) {
                feature.querySelector('select').setAttribute('disabled', 'true');
              }
            }
          });
        }
      }

      function reSetFirstFeatureActive() {
        if (NotUndefined(pdpSkuFeature)) {
          var feature = pdpSkuFeature[0].querySelectorAll('.feature');

          if (!feature[0].classList.contains('active')) {
            var first_model = feature[0].getAttribute('data-model').split(',')[0];
            currentModel = first_model;
            pdpTabPaneActive.setAttribute('data-model', first_model);
            updateFeatures(currentModel);
            var type = feature[0].getAttribute('data-type');
            updateSku(type, currentModel);
          } else {
            updateFeaturesStatus();
            setSkuFeatureColorTitle();
          }
        }
      }

      function updateFeaturesStatus() {
        if (NotUndefined(pdpSkuFeature)) {
          var feature1 = pdpSkuFeature[0].querySelectorAll('.feature');
          var feature1_active = pdpSkuFeature[0].querySelector('.feature.active');
          var active1Models = [];

          if (NotUndefined(feature1_active)) {
            active1Models = feature1_active.getAttribute('data-model').split(',');

            if (feature1_active.tagName.toLowerCase() == 'option') {
              feature1_active.selected = true;
            }
          }

          for (var i = 1; i < pdpSkuFeature.length; i++) {
            var feature = pdpSkuFeature[i].querySelectorAll('.feature');
            var feature_active = pdpSkuFeature[i].querySelector('.feature.active');
            var foundArry = [];
            var found = false;

            if (!NotUndefined(feature_active)) {
              found = false;

              for (var k = 0; k < feature.length; k++) {
                feature[k].classList.add('gray');
              }
            } else {
              var activeModels = feature_active.getAttribute('data-model').split(',');

              if (active1Models.length == 0) {
                active1Models = activeModels;
              }

              for (var j = 0; j < feature.length; j++) {
                var models = feature[j].getAttribute('data-model').split(',');
                found = models.some(function (r) {
                  if (active1Models.indexOf(r) >= 0) {
                    return true;
                  } else {
                    return false;
                  }
                });

                if (found) {
                  foundArry.push(j);

                  if (feature[j].classList.contains('gray')) {
                    feature[j].classList.remove('gray');
                  }
                } else {
                  feature[j].classList.add('gray');

                  if (feature[j].classList.contains('active')) {
                    feature[j].classList.remove('active');
                  }
                }
              }

              if (foundArry.length == 0) {
                if (NotUndefined(pdpSkuFeature[i].querySelectorAll('select'))) {
                  pdpSkuFeature[i].classList.add('none');
                }
              } else {
                if (NotUndefined(pdpSkuFeature[i].querySelectorAll('select'))) {
                  if (pdpSkuFeature[i].classList.contains('none')) {
                    pdpSkuFeature[i].classList.remove('none');
                  }
                }

                foundArry.forEach(function (k) {
                  if (feature[k].parentElement.querySelectorAll('.feature.active').length == 0) {
                    feature[k].classList.add('active');
                  }

                  if (feature[k].tagName.toLowerCase() == 'option' && feature[k].classList.contains('active')) {
                    feature[k].selected = true;
                  }
                });
                feature_active = pdpSkuFeature[i].querySelector('.feature.active');
                activeModels = feature_active.getAttribute('data-model').split(',');
                active1Models = active1Models.filter(function (e) {
                  return activeModels.indexOf(e) !== -1;
                });
              }
            }
          }

          setcurrentModel();
        }
      }

      function updateFeatures(model) {
        switchFeatures(model);
        updateFeaturesStatus();
        setSkuFeatureColorTitle();
      }

      function setSkuFeatureColorTitle() {
        if (NotUndefined(pdpSkuFeature_color)) {
          var featuresColorActive = pdpTabPaneActive.querySelector('.ProductDetail-skuFeature-color > .feature.active');

          if (NotUndefined(featuresColorActive)) {
            var colorItems = pdpSkuFeature_color_title.querySelectorAll('span');
            colorItems.forEach(function (e) {
              e.classList.remove('feature');

              if (e.classList.contains('hide')) {
                e.parentElement.removeChild(e);
              }
            });
            colorItems = pdpSkuFeature_color_title.querySelectorAll('span');
            colorItems.forEach(function (e) {
              if (e.getAttribute('data-val') == featuresColorActive.getAttribute('data-val')) {
                e.classList.add('active');
              } else {
                e.classList.remove('active');
              }
            });
          }
        }
      }

      function switchFeatures(model) {
        var models = model.split(',');

        for (var i = 0; i < pdpSkuFeature.length; i++) {
          var feature = pdpSkuFeature[i].querySelectorAll('.feature');
          var feature_active = pdpSkuFeature[i].querySelector('.feature.active');
          var found1 = false;

          if (!NotUndefined(feature_active)) {
            found1 = false;
          } else {
            var activeModels = feature_active.getAttribute('data-model').split(',');
            found1 = activeModels.some(function (r) {
              if (models.indexOf(r) >= 0) {
                return true;
              } else {
                return false;
              }
            });
          }

          if (found1) {
            models = models.filter(function (e) {
              return activeModels.indexOf(e) !== -1;
            });
            continue;
          } else {
            for (var a = 0; a < feature.length; a++) {
              var item = feature[a];
              var someModels = item.getAttribute('data-model').split(',');
              var found2 = someModels.some(function (r) {
                if (models.indexOf(r) >= 0) {
                  return true;
                } else {
                  return false;
                }
              });

              if (found2) {
                models = models.filter(function (e) {
                  return someModels.indexOf(e) !== -1;
                });

                if (NotUndefined(feature_active)) {
                  if (feature_active.classList.contains('active')) {
                    feature_active.classList.remove('active');
                  }
                }

                item.classList.add('active');

                if (item.tagName.toLowerCase() == 'option') {
                  item.selected = true;
                }

                break;
              } else {
                continue;
              }
            }
          }
        }
      }

      function setcurrentModel() {
        if (NotUndefined(pdpSkuFeature)) {
          var tempModalArry = [];

          for (var j = 0; j < pdpSkuFeature.length; j++) {
            var feature_active = pdpSkuFeature[j].querySelector('.feature.active');

            if (NotUndefined(feature_active)) {
              tempModalArry.push(feature_active.getAttribute('data-model').split(','));
            }
          }

          var result = tempModalArry.shift().filter(function (v) {
            return tempModalArry.every(function (a) {
              return a.indexOf(v) !== -1;
            });
          });
          currentModel = result;
          pdpTabPaneActive.setAttribute('data-model', result);
        }
      }

      function bindSkuFeaturesEvent() {
        pdpSkuFeature_items.forEach(function (trigger, index) {
          if (trigger.tagName.toLowerCase() != 'option') {
            trigger.addEventListener('click', function (e) {
              var model = trigger.getAttribute('data-model');
              var type = trigger.getAttribute('data-type');
              updateFeatures(model);
              updateSku(type, currentModel);
            });
          } else {
            trigger = trigger.parentElement;

            if (NotUndefined(trigger)) {
              trigger.addEventListener('change', function (e) {
                var model = trigger.options[trigger.selectedIndex].getAttribute('data-model');
                var type = trigger.options[trigger.selectedIndex].getAttribute('data-type');
                updateFeatures(model);
                updateSku(type, currentModel);
              });
            }
          }
        });
      }

      function bindToggleEvent() {
        var toggle = pdpContainer.querySelectorAll('.toggle-icon');
        toggle.forEach(function (trigger, index) {
          trigger.addEventListener('click', function (e) {
            trigger.classList.toggle('collapsed');
            trigger.parentElement.parentElement.classList.toggle('collapsed');
          });
        });
      }

      function updateSku(type, model) {
        for (var j = 0; j < pdpJson.product_models.length; j++) {
          if (pdpJson.product_models[j].internal_name == type) {
            for (var i = 0; i < pdpJson.product_models[j].skus.length; i++) {
              if (pdpJson.product_models[j].skus[i].modelNo == model) {
                result = pdpJson.product_models[j].skus[i];
                updateSkuCarousel(result);
                updateSkuDetail(pdpJson.product_models[j], i);
                updateSkukeySpec(result);
              }
            }
          }
        }
      }

      function updateSkuCarousel(result) {
        pdpCarousel.innerHTML = '';
        var html = buildSkuCarouselHtml(result);
        pdpCarousel.innerHTML = html;
        pdpCarousel.setAttribute('data-model', result.modelNo);
        pdpCarousel.setAttribute('data-vFlag', '1');
        bindMFCarousel();
        init();
      }

      function updateSkuDetail(result, i) {
        pdpSkuName.innerHTML = buildImgEditIcon(result.skus[i]) + result.skus[i].name;

        if (NotUndefined(result.skus[i].msrp)) {
          pdpSkuPrice.innerHTML = pdpLabel_currencySymbol + result.skus[i].msrp;
        } else {
          pdpSkuPrice.innerHTML = result.skus[i].msrp;
        }

        pdpSkuDes.innerHTML = result.skus[i].overview;
        pdpSkuModel = pdpTabPaneActive.querySelector('.ProductDetail-skuModel .value');

        if (!result.skus[i]['hideSkuNumber'] && NotUndefined(result.skus[i].modelNo)) {
          pdpSkuModel.parentElement.innerHTML = pdpLabel_model + '<span class="value">' + result.skus[i].modelNo + '</span>';
        } else {
          pdpSkuModel.parentElement.innerHTML = '<span class="value"></span>';
        }

        pdpSkuWhere.setAttribute('data-model', result.skus[i].modelNo);

        if (result.skus[i].wheretobuy) {
          pdpSkuWC.classList.add('active-where');

          if (pdpSkuWC.classList.contains('active-cta')) {
            pdpSkuWC.classList.remove('active-cta');
          }
        } else {
          if (NotUndefined(result.skus[i].where_to_buy_label) && NotUndefined(result.skus[i].where_to_buy_url)) {
            pdpSkuCta.setAttribute('href', result.skus[i].where_to_buy_url);
            pdpSkuCta.innerHTML = result.skus[i].where_to_buy_label + '<i class="Button-arrow"></i>';

            if (pdpSkuWC.classList.contains('active-where')) {
              pdpSkuWC.classList.remove('active-where');
            }

            pdpSkuWC.classList.add('active-cta');
          } else {
            if (pdpSkuWC.classList.contains('active-where')) {
              pdpSkuWC.classList.remove('active-where');
            }

            if (pdpSkuWC.classList.contains('active-cta')) {
              pdpSkuWC.classList.remove('active-cta');
            }
          }
        }
        /*if(NotUndefined(pdpSkuWhere)){
          pdpSkuWhere.parentElement.removeChild(pdpSkuWhere);
        }
        if(NotUndefined(pdpSkuCta)){
          pdpSkuCta.parentElement.removeChild(pdpSkuCta);
        }
        pdpSkuWC.innerHTML = buildWhereToBuy(result, i);*/

      }

      function updateSkukeySpec(result) {
        var condition = NotUndefined(result.key_specs) || NotUndefined(result.productManual) || NotUndefined(result.datasheet) || NotUndefined(result.key_specs_column2) && NotUndefined(result.key_specs_column2.bullets) || NotUndefined(result.key_specs_column3) && NotUndefined(result.key_specs_column3.bullets);

        if (NotUndefined(pdpKeySpecs)) {
          pdpKeySpecs.innerHTML == '';
          var html = buildSkuProductInfoHtml(result) + buildskuSystemHtml(result) + buildskuIncludeHtml(result) + buildSkuDocumentHtml(result);
          pdpKeySpecs.innerHTML = html;
        }

        if (condition) {
          if (pdpKeySpecs.parentElement.classList.contains('hide')) {
            pdpKeySpecs.parentElement.classList.remove('hide');
          }
        } else {
          pdpKeySpecs.parentElement.classList.add('hide');
        }
      }

      function initBuildHtml() {
        var imageEditItem = document.createElement('span');
        imageEditItem.innerHTML = buildImgEditIcon(pdpJson);
        pdpHeader.parentElement.insertBefore(imageEditItem, pdpHeader);
        pdpTitle.innerHTML = checkUndefined(pdpJson.title);
        pdpDes.innerHTML = checkUndefined(pdpJson.description);

        if (NotUndefined(pdpJson.product_models)) {
          buildTabHtml();
          buildTabContentHtml();
        }
      }

      function buildTabHtml() {
        if (pdpJson.product_models.length > 1) {
          for (var i = 0; i < pdpJson.product_models.length; i++) {
            if (NotUndefined(pdpJson.product_models[i].skus)) {
              var li = document.createElement('li');
              li.className = 'MFTab-item ProductDetail-model';
              var html = i == 0 ? buildImgEditIcon(pdpJson.product_models[i]) + '<a class="MFTab-link active" ' + 'id="ProductDetail-model-' + checkUndefined(pdpJson.product_models[i].internal_name) + '"' + 'href="#ProductDetail-tabContent-' + checkUndefined(pdpJson.product_models[i].internal_name) + '"' + ' data-selected="true">' + checkUndefined(pdpJson.product_models[i].name) + '</a>' : buildImgEditIcon(pdpJson.product_models[i]) + '<a class="MFTab-link" ' + 'id="ProductDetail-model-' + checkUndefined(pdpJson.product_models[i].internal_name) + '"' + 'href="#ProductDetail-tabContent-' + checkUndefined(pdpJson.product_models[i].internal_name) + '"' + ' data-selected="false">' + checkUndefined(pdpJson.product_models[i].name) + '</a>';
              li.innerHTML = html;
              pdpTab.appendChild(li);
            }
          }

          if (pdpTab.querySelectorAll('li').length < 2) {
            pdpTab.innerHTML = '';
          }
        }
      }

      function buildTabContentHtml() {
        for (var i = 0; i < pdpJson.product_models.length; i++) {
          if (NotUndefined(pdpJson.product_models[i].skus)) {
            var div = document.createElement('div');
            div.className = i == 0 ? 'MFTab-pane active' : 'MFTab-pane';
            div.id = 'ProductDetail-tabContent-' + pdpJson.product_models[i].internal_name;
            div.setAttribute('data-target', 'ProductDetail-model-' + pdpJson.product_models[i].internal_name);
            div.setAttribute('data-model', pdpJson.product_models[i].skus[0].modelNo);
            var html = buildOverviewHtml(pdpJson.product_models[i]);

            if (NotUndefined(pdpJson.product_models[i].skus)) {
              html += buildKeySpecHtml(pdpJson.product_models[i].skus[0]);
            }

            div.innerHTML = html;
            pdpTabContent.appendChild(div);
          }
        }
      }

      function buildOverviewHtml(data) {
        var html = '<div class="ProductDetail-tabPane ProductDetail-tabPane--overview">' + '<h3>' + pdpLabel_overview + '<i class="dash toggle-icon"></i></h3>' + '<div class="ProductDetail-block ProductDetail-block--overview">' + '<div class="ProductDetail-slide MFCarousel-fade" data-vFlag="0">';

        if (NotUndefined(data.skus)) {
          html += buildSkuCarouselHtml(data.skus[0]);
        }

        html += '</div>' + '<div class="ProductDetail-content">' + buildSkuDetailHtml(data) + '</div></div></div>';
        return html;
      }

      function buildKeySpecHtml(data) {
        var html = '';
        var condition = NotUndefined(data.key_specs) || NotUndefined(data.productManual) || NotUndefined(data.datasheet) || NotUndefined(data.key_specs_column2) && NotUndefined(data.key_specs_column2.bullets) || NotUndefined(data.key_specs_column3) && NotUndefined(data.key_specs_column3.bullets);

        if (condition) {
          html += '<div class="ProductDetail-tabPane ProductDetail-tabPane--keySpec">';
        } else {
          html += '<div class="ProductDetail-tabPane ProductDetail-tabPane--keySpec hide">';
        }

        html += '<h3>' + pdpLabel_keySpecs + '<i class="dash toggle-icon"></i></h3>' + '<div class="ProductDetail-block ProductDetail-block--keySpec">' + buildSkuProductInfoHtml(data) + buildskuSystemHtml(data) + buildskuIncludeHtml(data) + buildSkuDocumentHtml(data);
        return html;
      }

      function buildSkuCarouselHtml(data) {
        var html = '';

        if (NotUndefined(data.gallery)) {
          html = '<div class="MFCarousel-inner">';

          for (var i = 0; i < data.gallery.length; i++) {
            var isVideo = data.gallery[i].isvideo && data.gallery[i].videourl != '';
            var isVideoClass = isVideo ? 'ProductDetail-skuImage--video' : '';
            var playHtml = isVideo ? '<span class="play-icon"><i></i></span>' : '';
            var videoUrl = '';
            var videoID = '';
            var vid = '';

            if (isVideo) {
              var videoArray = data.gallery[i].videourl.split('/');

              if (data.gallery[i].videourl.indexOf('vimeo.com') != -1) {
                vid = videoArray[videoArray.length - 1];
                videoID = 'data-video-id="' + vid + '"';
                videoUrl = 'href="https://vimeo.com/' + vid + '"';
              }

              if (data.gallery[i].videourl.indexOf('youtube.com') != -1) {
                vid = videoArray[videoArray.length - 1].replace('watch?v=', '');
                videoID = 'data-video-id="' + vid + '"';
                videoUrl = 'href="https://www.youtube.com/watch?v=' + vid + '"';
              }

              if (data.gallery[i].videourl.indexOf('qq.com') != -1) {
                vid = videoArray[videoArray.length - 1].replace('.html', '');
                videoID = 'data-video-id="' + vid + '"';
                videoUrl = 'href="https://v.qq.com/x/page/' + vid + '.html"';
              }
            }

            var videoTrigger = isVideo ? 'data-micromodal-trigger="ProductDetail-skuVideo-modal-' + vid + '"' : '';
            var videoLabel = isVideo ? '<p>' + videoLabel_cta + '</p>' : '';
            html += i == 0 ? '<a class="ProductDetail-skuImage--large MFCarousel-item active ' + isVideoClass + '" ' + videoTrigger + videoUrl + videoID + '>' + '<img src="' + checkUndefined(data.gallery[i].large) + '">' + videoLabel + playHtml + '</a>' : '<a class="ProductDetail-skuImage--large MFCarousel-item ' + isVideoClass + '" ' + videoTrigger + videoUrl + videoID + '>' + '<img src="' + checkUndefined(data.gallery[i].large) + '">' + videoLabel + playHtml + '</a>';
          }

          html += '</div>';
          html += '<ul class="list--noStyle MFCarousel-control--indicators">';

          for (var i = 0; i < data.gallery.length; i++) {
            var _isVideo = data.gallery[i].isvideo && data.gallery[i].videourl != '';

            var isVideoTClass = _isVideo ? 'ProductDetail-skuImage--video' : '';
            var playTHtml = _isVideo ? '<span class="play-icon"><i></i></span>' : '';
            html += i == 0 ? '<li class="ProductDetail-skuImage--thumbnail indicator-item active ' + isVideoTClass + '" data-slide = "' + i + '">' + '<img src="' + checkUndefined(data.gallery[i].small) + '">' + playTHtml + '</li>' : '<li class="ProductDetail-skuImage--thumbnail indicator-item ' + isVideoTClass + '" data-slide = "' + i + '">' + '<img src="' + checkUndefined(data.gallery[i].small) + '">' + playTHtml + '</li>';
          }

          html += '</ul>';
        }

        return html;
      }

      function buildSkuDetailHtml(data) {
        var html = '<h4 class="ProductDetail-skuName">' + buildImgEditIcon(data.skus[0]) + checkUndefined(data.skus[0].name) + '</h4>' + '<h2 class="ProductDetail-skuPrice">';

        if (NotUndefined(data.skus[0].msrp)) {
          html += '<span class="value">' + pdpLabel_currencySymbol + checkUndefined(data.skus[0].msrp) + '</span><span>' + pdpLabel_price + '</span>';
        } else {
          html += '<span class="value">' + checkUndefined(data.skus[0].msrp) + '</span><span>' + pdpLabel_price + '</span>';
        }

        html += '</h2>' + '<p class="ProductDetail-skuDes copy">' + checkUndefined(data.skus[0].overview) + '</p>' + buildSkuFeaturesHtml(data);

        if (!data.skus[0]['hideSkuNumber'] && NotUndefined(data.skus[0].modelNo)) {
          html += '<p class="ProductDetail-skuModel">' + pdpLabel_model + '<span class="value">' + checkUndefined(data.skus[0].modelNo) + '</span></p>';
        } else {
          html += '<p class="ProductDetail-skuModel">' + '<span class="value">' + '</span></p>';
        }

        html += buildWhereToBuy(data, 0);
        return html;
      }

      function buildWhereToBuy(data, i) {
        var html = '';
        var wclass = '';

        if (data.skus[i].wheretobuy) {
          wclass = 'active-where';
        } else {
          if (NotUndefined(data.skus[i].where_to_buy_label) && NotUndefined(data.skus[i].where_to_buy_url)) {
            wclass = 'active-cta';
          }
        }

        html += '<div class="ProductDetail-skuWC ' + wclass + '"><a data-model="' + checkUndefined(data.skus[i].modelNo) + '"' + ' data-country="' + country + '"' + ' data-category="' + data.category + '"' + ' data-isexternal="' + data.is_external + '"' + ' data-site="' + site + '"' + ' data-locale="' + locale + '"' + ' data-buynowlabel="' + pdpLabel_buyNow + '"' + ' data-micromodal-trigger="whereToBuy" class="Button Button-outline ProductDetail-skuWhere gtm-shop ">' + pdpLabel_where + '<i class="Button-arrow"></i></a>';
        html += '<a class="ProductDetail-skuCta Button Button-outline " href="' + checkUndefined(data.skus[i].where_to_buy_url) + '">' + checkUndefined(data.skus[i].where_to_buy_label) + '<i class="Button-arrow"></i></a></div>';
        return html;
      }

      function buildSkuFeatureEachHtml(data, skufeature) {
        var html = '';

        if (NotUndefined(skufeature)) {
          if (skufeature.display_type == 'color') {
            html = buildSkuFeatureColorHtml(data, skufeature);
          } else if (skufeature.display_type == 'dropdown') {
            html = buildSkuFeatureDropHtml(data, skufeature);
          } else {
            html = buildSkuFeatureButtonHtml(data, skufeature);
          }
        }

        return html;
      }

      function generateFeatureTempArray(data, skufeature) {
        var fArray = [];
        var tempArray = [];
        var uniqueArray = skufeature.values.filter(function (item, pos) {
          return skufeature.values.indexOf(item) == pos;
        });

        for (var k = 0; k < uniqueArray.length; k++) {
          for (var j = 0; j < data.skus.length; j++) {
            if (NotUndefined(data.skus[j].configurator_features)) {
              for (var i = 0; i < data.skus[j].configurator_features.length; i++) {
                var feature = data.skus[j].configurator_features[i];

                if (feature.internal_name == skufeature.internal_name && feature.value == skufeature.values[k]) {
                  feature.class = 'feature';
                  feature.data_name = data.internal_name;
                  feature.data_model = data.skus[j].modelNo;

                  if (j == 0) {
                    feature.class += ' active';
                  }

                  if (fArray.indexOf(feature.value) === -1) {
                    fArray.push(feature.value);
                  } else {
                    feature.class += ' hide';
                  }

                  tempArray.push(feature);
                }
              }
            }
          }
        }
        /*tempArray.sort(function (a, b) {
          if (checkUndefined(a.order)) {
            if (checkUndefined(a.reverse)) {
              return parseFloat(b.order) - parseFloat(a.order);
            } else {
              return parseFloat(a.order) - parseFloat(b.order);
            }
          } else {
            return -1;
          }
        });*/


        return tempArray;
      }

      function buildSkuFeatureColorHtml(data, skufeature) {
        var html = '';
        var tempArray = [];
        tempArray = generateFeatureTempArray(data, skufeature);

        if (NotUndefined(tempArray)) {
          html += '<div class="ProductDetail-skuFeature-row"><label class="ProductDetail-skuFeature-label">' + tempArray[0].name + '</label>' + '<ul class="ProductDetail-skuFeature ProductDetail-skuFeature-' + checkUndefined(skufeature.display_type) + ' ProductDetail-skuFeature-' + checkUndefined(skufeature.internal_name) + '">';
          tempArray.forEach(function (feature) {
            html += '<li class="' + feature.class + '" data-type="' + checkUndefined(feature.data_name) + '"' + 'data-val= "' + checkUndefined(feature.value) + '"data-model="' + checkUndefined(feature.data_model) + '">' + '<span style="background:' + checkUndefined(feature.value) + '">' + '</span>' + '</li>';
          });
          html += '</ul>';
          html += '<p class="color-title">';
          tempArray.forEach(function (feature) {
            html += '<span class="' + feature.class + '" data-val= "' + checkUndefined(feature.value) + '">' + checkUndefined(feature.title) + '</span>';
          });
          html += '</p>';
          html += '</div>';
        }

        return html;
      }

      function buildSkuFeatureButtonHtml(data, skufeature) {
        var html = '';
        var tempArray = [];
        tempArray = generateFeatureTempArray(data, skufeature);

        if (NotUndefined(tempArray)) {
          html += '<div class="ProductDetail-skuFeature-row"><label class="ProductDetail-skuFeature-label">' + tempArray[0].name + '</label>' + '<ul class="ProductDetail-skuFeature ProductDetail-skuFeature-' + checkUndefined(skufeature.display_type) + ' ProductDetail-skuFeature-' + checkUndefined(skufeature.internal_name) + '">';
          tempArray.forEach(function (feature) {
            html += '<li class="' + feature.class + '" data-type="' + checkUndefined(feature.data_name) + '"' + 'data-title="' + checkUndefined(feature.title) + '"' + 'data-val= "' + checkUndefined(feature.value) + '"data-model="' + checkUndefined(feature.data_model) + '">' + checkUndefined(feature.value) + '</li>';
          });
          html += '</ul></div>';
        }

        return html;
      }

      function buildSkuFeatureDropHtml(data, skufeature) {
        var html = '';
        var tempArray = [];
        var selectStatus = '';
        tempArray = generateFeatureTempArray(data, skufeature);

        if (NotUndefined(tempArray)) {
          if (tempArray.length == 1) {
            selectStatus = 'disabled';
          }

          html += '<div class="ProductDetail-skuFeature-row"><label class="ProductDetail-skuFeature-label">' + tempArray[0].name + '</label>' + '<div class="ProductDetail-skuFeature ProductDetail-skuFeature-' + checkUndefined(skufeature.display_type) + ' ProductDetail-skuFeature-' + checkUndefined(skufeature.internal_name) + '"><select ' + selectStatus + '>';
          tempArray.forEach(function (feature) {
            html += '<option class="' + feature.class + '" data-type="' + checkUndefined(feature.data_name) + '"' + 'data-val= "' + checkUndefined(feature.value) + '"data-model="' + checkUndefined(feature.data_model) + '">' + checkUndefined(feature.value) + '</li>';
          });
          html += '</select></div></div>';
        }

        return html;
      }

      function buildSkuFeaturesHtml(data) {
        var featuresArry = data.configurator_features_ordered; //['color','capacity','test','format'];

        var html = '';

        if (NotUndefined(featuresArry)) {
          for (var i = 0; i < featuresArry.length; i++) {
            var feature = featuresArry[i];
            html += buildSkuFeatureEachHtml(data, feature);
          }
        }

        return html;
      }

      function buildSkuProductInfoHtml(data) {
        var html = '';

        if (NotUndefined(data.key_specs)) {
          html += '<div class="ProductDetail-blockItem ProductDetail-blockItem-keySpec">';
          html += '<h6>' + pdpLabel_productInfo + '</h6>';

          if (Array.isArray(data.key_specs)) {
            for (var i = 0; i < data.key_specs.length; i++) {
              if (NotUndefined(data.key_specs[i].value)) {
                html += '<div class="ProductDetail-skuInfo">' + '<strong>' + checkUndefined(data.key_specs[i].name) + '</strong>' + '<p class="copy">' + checkUndefined(data.key_specs[i].value) + '</p>' + '</div>';
              }
            }
          }

          html += '</div>';
        }

        return html;
      }

      function buildSkuDocumentHtml(data) {
        var html = '';

        if (NotUndefined(data.productManual) || NotUndefined(data.datasheet)) {
          html += '<div class="ProductDetail-blockItem ProductDetail-blockItem-document">';
          html += '<h6>' + pdpLabel_documentInfo + '</h6>';

          if (NotUndefined(data.datasheet)) {
            html += '<p class="ProductDetail-skuDoc"><a class="gtm-datasheet" target="_blank" href="' + checkUndefined(data.datasheet.url) + '">' + checkUndefined(data.datasheet.title) + '</a></p>';
          }

          if (NotUndefined(data.productManual)) {
            html += '<p class="ProductDetail-skuDoc"><a class="gtm-usermanual" target="_blank" href="' + checkUndefined(data.productManual.url) + '">' + checkUndefined(data.productManual.title) + '</a></p>';
          }

          html += '</div>';
        }

        return html;
      }

      function buildskuSystemHtml(data) {
        var html = '';

        if (NotUndefined(data.key_specs_column2) && NotUndefined(data.key_specs_column2.bullets)) {
          html += '<div class="ProductDetail-blockItem ProductDetail-blockItem-system"><h6>' + checkUndefined(data.key_specs_column2.header) + '</h6><ul>';

          if (Array.isArray(data.key_specs_column2.bullets)) {
            for (var i = 0; i < data.key_specs_column2.bullets.length; i++) {
              html += '<li>' + checkUndefined(data.key_specs_column2.bullets[i]) + '</li>';
            }
          }

          html += '</ul></div>';
        }

        return html;
      }

      function buildskuIncludeHtml(data) {
        var html = '';

        if (NotUndefined(data.key_specs_column3) && NotUndefined(data.key_specs_column3.bullets)) {
          html += '<div class="ProductDetail-blockItem ProductDetail-blockItem-include"><h6>' + checkUndefined(data.key_specs_column3.header) + '</h6><ul>';

          if (Array.isArray(data.key_specs_column3.bullets)) {
            for (var i = 0; i < data.key_specs_column3.bullets.length; i++) {
              html += '<li>' + checkUndefined(data.key_specs_column3.bullets[i]) + '</li>';
            }
          }

          html += '</ul></div>';
        }

        return html;
      }

      function bindMFCarousel() {
        var c = MFCarousel('.ProductDetail-slide');
      }

      function bindMFTab() {
        var tab = MFTab('ProductDetailTab');
        var tabElement = document.getElementById('ProductDetailTab');
        tabElement.addEventListener('hidden.mf.tab', function (event) {//console.log('hidden:' + event.detail.relatedTarget);
        });
        tabElement.addEventListener('shown.mf.tab', function (event) {
          getElements();
          reMappingFeatures();
          reSetFirstFeatureActive(); //console.log('show:' + event.detail.relatedTarget);
        });
      }
    }
  }

  var MFTable = {
    updateDropDownStatus: function updateDropDownStatus(tabColumn, bodyColumnSum, settings) {
      var columnLength = tabColumn.length; // / 2;

      for (var i = 0; i < columnLength; i++) {
        if (CustomUtil.screenIs == 'isLaptop') {
          this.compareColumns(tabColumn, bodyColumnSum, settings.maxLapTop, i);
        } else if (CustomUtil.screenIs == 'isTablet') {
          this.compareColumns(tabColumn, bodyColumnSum, settings.maxTablet, i);
        } else if (CustomUtil.screenIs == 'isMobile') {
          this.compareColumns(tabColumn, bodyColumnSum, settings.maxMobile, i);
        }
      }
    },
    compareColumns: function compareColumns(tabColumn, bodyColumnSum, max, i) {
      //var columnLength = tabColumn.length / 2;
      if (tabColumn[i].querySelector('.dropdown-toggle')) {
        if (bodyColumnSum > max) {
          tabColumn[i].querySelector('.dropdown-toggle').classList.remove('toggle-link');
          tabColumn[i].querySelector('.dropdown-toggle').classList.remove('toggle-link');
        } else {
          tabColumn[i].querySelector('.dropdown-toggle').classList.add('toggle-link');
          tabColumn[i].querySelector('.dropdown-toggle').classList.add('toggle-link');
        }
      }
    },
    bindDropDownEvent: function bindDropDownEvent(dropToggle) {
      dropToggle.forEach(function (trigger, index) {
        trigger.addEventListener('click', function (e) {
          if (!trigger.classList.contains('toggle-link')) {
            var dropContainer = e.currentTarget.parentElement.parentElement;
            dropContainer.classList.toggle('open');
            var k = [].indexOf.call(dropToggle, e.currentTarget);

            for (var i = 0; i < dropToggle.length; i++) {
              if (i != k) {
                dropToggle[i].parentElement.parentElement.classList.remove('open');
              }
            }
          }
        });
      });
    },
    bindDropDownClearEvent: function bindDropDownClearEvent(target, dropContainer) {
      if (!(target.classList && target.classList.contains('dropdown-toggle'))) {
        dropContainer.forEach(function (drop) {
          drop.classList.remove('open');
        });
      }
    },
    bindTableRowHoverEvent: function bindTableRowHoverEvent(tabBody, column, cell) {
      tabBody.querySelectorAll(cell).forEach(function (trigger, index) {
        trigger.addEventListener('mouseover', function (e) {
          var cells = e.currentTarget.parentElement.querySelectorAll(cell);
          var k = [].indexOf.call(cells, e.currentTarget);
          tabBody.querySelectorAll(column).forEach(function (col) {
            col.querySelectorAll(cell)[k].classList.add('active');
          });
        });
        trigger.addEventListener('mouseout', function (e) {
          var cells = e.currentTarget.parentElement.querySelectorAll(cell);
          var k = [].indexOf.call(cells, e.currentTarget);
          tabBody.querySelectorAll(column).forEach(function (col) {
            col.querySelectorAll(cell)[k].classList.remove('active');
          });
        });
      });
    },
    bindTableColumnHoverEvent: function bindTableColumnHoverEvent(tab, tabHeader, tabBody, column) {
      tab.querySelectorAll(column).forEach(function (trigger, index) {
        trigger.addEventListener('mouseover', function (e) {
          var columns = e.currentTarget.parentElement.querySelectorAll(column);
          var k = [].indexOf.call(columns, e.currentTarget);
          tabHeader.querySelectorAll(column)[k].classList.add('active');
          tabBody.querySelectorAll(column)[k].classList.add('active');
        });
        trigger.addEventListener('mouseout', function (e) {
          var columns = e.currentTarget.parentElement.querySelectorAll(column);
          var k = [].indexOf.call(columns, e.currentTarget);
          tabHeader.querySelectorAll(column)[k].classList.remove('active');
          tabBody.querySelectorAll(column)[k].classList.remove('active');
        });
      });
    },
    bindTableScrollFixedEvent: function bindTableScrollFixedEvent(tab, prevScroTop) {
      var eleTop = CustomUtil.getInStickyTop(tab.tabHeader);
      var tab_min = tab.tabContainer.offsetTop - eleTop;
      var tab_max = tab.tabContainer.offsetTop + tab.tabContainer.clientHeight - tab.tabHeader.clientHeight - eleTop;
      CustomUtil.updateSettings();
      var scroTop = window.scrollY || document.documentElement.scrollTop;
      var condition = scroTop > tab_min && scroTop < tab_max;
      var ele = tab.tabHeader;
      CustomUtil.bindStickyEvent(condition, ele);
    },
    generateFixedTableHeader: function generateFixedTableHeader(toContainer, cell) {
      for (var i = 0; i < cell.length; i++) {
        var column = document.createElement('div');
        column.className = 'MFTable-table-column';
        column.innerHTML = cell[i].outerHTML;
        toContainer.appendChild(column);
      }
    },
    setPaddingToFixedTableHeader: function setPaddingToFixedTableHeader(tab) {
      var container = tab.closest('.Container');

      if (container) {
        var value = window.getComputedStyle(container).marginLeft; //tab.querySelector('.MFTable-table-header').style.paddingLeft = value;
        //tab.querySelector('.MFTable-table-header').style.paddingRight = value;

        var headerCells = tab.querySelector('.MFTable-table-header').querySelectorAll('.MFTable-table-cell');
        var bodyColumns = tab.querySelector('.MFTable-table-body').querySelectorAll('.MFTable-table-column');
        headerCells.forEach(function (cell, index) {//cell.style.width = bodyColumns[index].clientWidth + 'px';
        });
      }
    },
    updateTableVars: function updateTableVars(index, tabDom, tab) {
      tabDom.tabContainer = tab.querySelector('.MFTable-table');
      tabDom.tabHeader = tab.querySelector('.MFTable-table-header');
      tabDom.tabBody = tab.querySelector('.MFTable-table-body');
      tabDom.tabCellHeader = tabDom.tabBody.querySelectorAll('.MFTable-table-cell.cell-header');
      tabDom.tabColumn = tabDom.tabBody.querySelectorAll('.MFTable-table-column');
      tabDom.tabBodyColumn = tabDom.tabBody.querySelectorAll('.MFTable-table-column');
      tabDom.tabHeaderColumn = tabDom.tabHeader.querySelectorAll('.MFTable-table-column');
      tabDom.dropContainer = tab.querySelectorAll('.dropdown');
      tabDom.dropToggle = tab.querySelectorAll('.dropdown-toggle');
      tabDom.bodyColumnSum = Number(tabDom.tabBody.getAttribute('data-products-size'));
    }
  };

  Swiper.use([Navigation$1]);

  function ComparisonTable() {
    console.log('ComparisonTable');
    var c_tabs = document.querySelectorAll('.ComparisonTable');

    if (c_tabs && c_tabs.length > 0) {
      var c_tabDoms = {};
      var c_settings = {
        maxLapTop: 4,
        maxTablet: 3,
        maxMobile: 2
      };
      var ticking = false;
      var prevScroTop = 0;

      for (var t = 0; t < c_tabs.length; t++) {
        c_tabDoms[t] = {};
        CustomUtil.updateSettings();
        MFTable.updateTableVars(t, c_tabDoms[t], c_tabs[t]);

        if (CustomUtil.isNavFixed()) {
          c_tabDoms[t].tabHeader.style.top = CustomUtil.settings.headerFixedHeight + 'px';
        } else {
          c_tabDoms[t].tabHeader.style.top = 0;
        }

        CustomUtil.initCheckScreen();

        if (CustomUtil.isLocalhost() && !c_tabs[t].classList.contains('MFTable-carousel')) {
          MFTable.generateFixedTableHeader(c_tabDoms[t].tabHeader, c_tabDoms[t].tabCellHeader);
        }

        MFTable.updateTableVars(t, c_tabDoms[t], c_tabs[t]);

        if (CustomUtil.isLocalhost()) {
          MFTable.updateDropDownStatus(c_tabDoms[t].tabColumn, c_tabDoms[t].bodyColumnSum, c_settings);
        }

        if (!c_tabs[t].classList.contains('MFTable-v')) {
          MFTable.bindTableColumnHoverEvent(c_tabs[t], c_tabDoms[t].tabHeader, c_tabDoms[t].tabBody, '.MFTable-table-column');
        } else {
          MFTable.bindTableRowHoverEvent(c_tabDoms[t].tabBody, '.MFTable-table-column', '.MFTable-table-cell');
        }

        CustomUtil.setColumnCellHeight(c_tabDoms[t].tabBodyColumn, '.MFTable-table-cell', '.dropdown-header');
        CustomUtil.setColumnCellHeight(c_tabDoms[t].tabHeaderColumn, '.MFTable-table-cell', '.dropdown-header');
        MFTable.setPaddingToFixedTableHeader(c_tabs[t]);
      }

      document.addEventListener('click', function (e) {
        var dropContainer = document.querySelectorAll('.ComparisonTable .dropdown');
        MFTable.bindDropDownClearEvent(e.target, dropContainer);
      });
      window.addEventListener('resize', function (e) {
        CustomUtil.initCheckScreen();

        for (var _t = 0; _t < c_tabs.length; _t++) {
          MFTable.updateTableVars(_t, c_tabDoms[_t], c_tabs[_t]);
          MFTable.updateDropDownStatus(c_tabDoms[_t].tabColumn, c_tabDoms[_t].bodyColumnSum, c_settings);
          CustomUtil.setColumnCellHeight(c_tabDoms[_t].tabBodyColumn, '.MFTable-table-cell', '.dropdown-header');
          CustomUtil.setColumnCellHeight(c_tabDoms[_t].tabHeaderColumn, '.MFTable-table-cell', '.dropdown-header');
          MFTable.setPaddingToFixedTableHeader(c_tabs[_t]);
        }
      });
      window.addEventListener('scroll', function (e) {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            for (var _t2 = 0; _t2 < c_tabs.length; _t2++) {
              MFTable.updateTableVars(_t2, c_tabDoms[_t2], c_tabs[_t2]);
              MFTable.bindTableScrollFixedEvent(c_tabDoms[_t2], prevScroTop);
            }

            ticking = false;
          });
          ticking = true;
        }
      });

      if (CustomUtil.isLocalhost()) {
        var dropToggle = document.querySelectorAll('.ComparisonTable .dropdown-toggle');
        MFTable.bindDropDownEvent(dropToggle);
      }
    }
  }

  function ComparisonTableCarousel() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      selector: '.ComparisonTableCarousel-contentPanel'
    },
        el = _ref.el;

    var transitionSpeed = 300;
    var leftButtonEl = el.closest('.ComparisonTableCarousel-contentPanel').querySelector('.ComparisonTableCarousel-navArrowButton-left');
    var rightButtonEl = el.closest('.ComparisonTableCarousel-contentPanel').querySelector('.ComparisonTableCarousel-navArrowButton-right');
    var cardsSwiper = new Swiper(el, {
      effect: 'slide',
      speed: transitionSpeed,
      slidesPerView: 'auto',
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      watchOverflow: true,
      loop: false,
      simulateTouch: false,
      allowTouchMove: false,
      navigation: {
        nextEl: rightButtonEl,
        prevEl: leftButtonEl
      } //on: {
      //slideChange: function (swiper) {
      //console.log('swiper slideChange' + swiper);
      //},
      //},

    });
    revealElements();
    rightButtonEl.addEventListener('click', function (e) {
      var container = e.currentTarget.parentElement.parentElement;

      if (e.currentTarget.classList.contains('swiper-button-disabled')) {
        container.querySelectorAll('.swiper-slide-visible').forEach(function (element) {
          element.classList.add('last-visible');
        });
      } else {
        container.querySelectorAll('.swiper-slide-visible').forEach(function (element) {
          element.classList.remove('last-visible');
        });
      }

      if (e.pointerType == 'mouse' || e.pointerType == 'touch') {
        var root = container.closest('.ComparisonTableCarousel');

        if (container.classList.contains('MFTable-table-header') || container.parentElement.classList.contains('MFTable-table-header') || container.parentElement.parentElement.classList.contains('MFTable-table-header')) {
          root.querySelector('.MFTable-table-body .ComparisonTableCarousel-navArrowButton-right').click();
        } else {
          root.querySelector('.MFTable-table-header .ComparisonTableCarousel-navArrowButton-right').click();
        }
      }
    });
    leftButtonEl.addEventListener('click', function (e) {
      var container = e.currentTarget.parentElement.parentElement;
      var lastVisibles = container.querySelectorAll('.last-visible');

      if (lastVisibles) {
        lastVisibles.forEach(function (element) {
          element.classList.remove('last-visible');
        });
      }

      if (e.pointerType == 'mouse' || e.pointerType == 'touch') {
        var root = container.closest('.ComparisonTableCarousel');

        if (container.classList.contains('MFTable-table-header') || container.parentElement.classList.contains('MFTable-table-header') || container.parentElement.parentElement.classList.contains('MFTable-table-header')) {
          root.querySelector('.MFTable-table-body .ComparisonTableCarousel-navArrowButton-left').click();
        } else {
          root.querySelector('.MFTable-table-header .ComparisonTableCarousel-navArrowButton-left').click();
        }
      }
    });
    return {
      destroy: function destroy() {
        cardsSwiper.detachEvents();
        cardsSwiper.destroy();
      }
    };
  } //export default ComparisonTable;

  function SpecsTable() {
    console.log('SpecsTable');
    var s_tabs = document.querySelectorAll('.SpecsTable');

    if (s_tabs && s_tabs.length > 0) {
      var s_tabDoms = {};
      var s_settings = {
        maxLapTop: 6,
        maxTablet: 3,
        maxMobile: 2
      };
      var ticking = false;
      var prevScroTop = 0;

      for (var t = 0; t < s_tabs.length; t++) {
        s_tabDoms[t] = {};
        CustomUtil.updateSettings();
        MFTable.updateTableVars(t, s_tabDoms[t], s_tabs[t]);

        if (CustomUtil.isNavFixed()) {
          s_tabDoms[t].tabHeader.style.top = CustomUtil.settings.headerFixedHeight + 'px';
        } else {
          s_tabDoms[t].tabHeader.style.top = 0;
        }

        CustomUtil.initCheckScreen();

        if (CustomUtil.isLocalhost()) {
          MFTable.generateFixedTableHeader(s_tabDoms[t].tabHeader, s_tabDoms[t].tabCellHeader);
        }

        MFTable.updateTableVars(t, s_tabDoms[t], s_tabs[t]);

        if (CustomUtil.isLocalhost()) {
          MFTable.updateDropDownStatus(s_tabDoms[t].tabColumn, s_tabDoms[t].bodyColumnSum, s_settings);
        }

        MFTable.bindTableColumnHoverEvent(s_tabs[t], s_tabDoms[t].tabHeader, s_tabDoms[t].tabBody, '.MFTable-table-column');
        CustomUtil.setColumnCellHeight(s_tabDoms[t].tabBodyColumn, '.MFTable-table-cell', '.dropdown-header');
        CustomUtil.setColumnCellHeight(s_tabDoms[t].tabHeaderColumn, '.MFTable-table-cell', '.dropdown-header');
        CustomUtil.setColumnCellHeight(s_tabDoms[t].tabBodyColumn, '.MFTable-table-cell', '.col-group-item .col-value');
      }

      document.addEventListener('click', function (e) {
        var dropContainer = document.querySelectorAll('.SpecsTable .dropdown');
        MFTable.bindDropDownClearEvent(e.target, dropContainer);
      });
      window.addEventListener('resize', function (e) {
        CustomUtil.initCheckScreen();

        for (var _t = 0; _t < s_tabs.length; _t++) {
          MFTable.updateTableVars(_t, s_tabDoms[_t], s_tabs[_t]);
          MFTable.updateDropDownStatus(s_tabDoms[_t].tabColumn, s_tabDoms[_t].bodyColumnSum, s_settings);
          CustomUtil.setColumnCellHeight(s_tabDoms[_t].tabBodyColumn, '.MFTable-table-cell', '.dropdown-header');
          CustomUtil.setColumnCellHeight(s_tabDoms[_t].tabHeaderColumn, '.MFTable-table-cell', '.dropdown-header');
          CustomUtil.setColumnCellHeight(s_tabDoms[_t].tabBodyColumn, '.MFTable-table-cell', '.col-group-item .col-value');
        }
      });
      window.addEventListener('scroll', function (e) {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            for (var _t2 = 0; _t2 < s_tabs.length; _t2++) {
              MFTable.updateTableVars(_t2, s_tabDoms[_t2], s_tabs[_t2]);
              MFTable.bindTableScrollFixedEvent(s_tabDoms[_t2], prevScroTop);
            }

            ticking = false;
          });
          ticking = true;
        }
      });

      if (CustomUtil.isLocalhost()) {
        var dropToggle = document.querySelectorAll('.SpecsTable .dropdown-toggle');
        MFTable.bindDropDownEvent(dropToggle);
      }
    }
  }

  function TabbedInfo() {
    revealElements();
    bindMFTab();
  }

  function bindMFTab() {
    var tabElement = document.getElementById('TabbedInfoTab');

    if (tabElement) {
      var tab = MFTab('TabbedInfoTab');
      tabElement.addEventListener('hidden.mf.tab', function (event) {
        console.log('hidden:' + event.detail.relatedTarget);
      });
      tabElement.addEventListener('shown.mf.tab', function (event) {
        console.log('show:' + event.detail.relatedTarget);
      });
    }
  }

  function MediaBehind2Up() {
    console.log('MediaBehind2Up');
    revealElements();
  }

  var clampValue = (function (_ref) {
    var _ref$val = _ref.val,
        val = _ref$val === void 0 ? 0 : _ref$val,
        _ref$range = _ref.range,
        range = _ref$range === void 0 ? [0, 0] : _ref$range;

    if (val < range[0]) {
      return range[0];
    }

    if (val > range[1]) {
      return range[1];
    }

    return val;
  });

  var convertValueToRange = (function (_ref) {
    var _ref$fromValue = _ref.fromValue,
        fromValue = _ref$fromValue === void 0 ? 0 : _ref$fromValue,
        _ref$fromRange = _ref.fromRange,
        fromRange = _ref$fromRange === void 0 ? [0, 0] : _ref$fromRange,
        _ref$toRange = _ref.toRange,
        toRange = _ref$toRange === void 0 ? [0, 0] : _ref$toRange,
        _ref$isClamped = _ref.isClamped,
        isClamped = _ref$isClamped === void 0 ? true : _ref$isClamped;
    var value = (fromValue - fromRange[0]) / (fromRange[1] - fromRange[0]) * (toRange[1] - toRange[0]) + toRange[0];
    return isClamped ? clampValue({
      val: value,
      range: toRange
    }) : value;
  });

  function ContentLayoutScrollZoom() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      selector: '.ContentLayoutScrollZoom'
    },
        rootEl = _ref.rootEl;

    var tabletWidth = 768;
    var maxSiteWidth = 1440;
    var yObserver;

    var init = function init() {
      if (rootEl.classList.contains('ContentLayoutScrollZoom--withTransitions')) {
        yObserver = new IntersectionObserver(handleObserverChange, {
          threshold: [0]
        });
      }

      addEventListeners();
    };

    var addEventListeners = function addEventListeners() {
      var _yObserver;

      (_yObserver = yObserver) === null || _yObserver === void 0 ? void 0 : _yObserver.observe(rootEl);
    };

    var removeEventListeners = function removeEventListeners() {
      var _yObserver2;

      (_yObserver2 = yObserver) === null || _yObserver2 === void 0 ? void 0 : _yObserver2.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };

    var handleObserverChange = function handleObserverChange(changes) {
      if (changes[0].isIntersecting) {
        window.addEventListener('scroll', handleScroll);
      } else {
        rootEl.classList.remove('is-revealed');
        window.removeEventListener('scroll', handleScroll);
      }
    };

    var handleScroll = function handleScroll() {
      var windowWidth = window.innerWidth;
      var rect = rootEl.getBoundingClientRect(); // NOTE: Only show progressive padding for >= tablet size.

      var paddingRange = windowWidth >= tabletWidth ? [0, convertValueToRange({
        fromValue: windowWidth,
        fromRange: [tabletWidth, maxSiteWidth],
        toRange: [40, 64]
      })] : [0, 0];
      var padding = convertValueToRange({
        fromValue: rect.top,
        fromRange: [rect.height * 0.8, rect.height * 0.2],
        toRange: paddingRange
      });
      rootEl.style.padding = "".concat(padding, "px");

      if (rect.top < rect.height * 0.2) {
        rootEl.classList.add('is-revealed');
      }
    };

    var destroy = function destroy() {
      removeEventListeners();
    };

    return {
      init: init,
      destroy: destroy
    };
  }

  function InPageNav() {
    console.log('InPageNav');
    var inPageNav = document.querySelector('.InPageNav');

    if (inPageNav) {
      var inPageNavList = inPageNav.querySelector('.InPageNav-links');
      var inPageNavLinks = inPageNavList.querySelectorAll('.InPageNav-link');
      var trigger = inPageNav.querySelector('[data-InPagenav-menu-trigger]');
      var triggerText = inPageNav.querySelector('.InPageNav-menu-trigger-inner-text');
      var anchorLink = document.querySelectorAll('.with-anchor');
      var anchorActiveLink = document.querySelector('.with-anchor.active');
      var nav_top = inPageNav.offsetTop;
      var nav_height = inPageNav.clientHeight;
      var ticking = false;
      var prevScroTop = 0;

      if (document.location.hash) {
        var hashStr = document.location.hash.slice(1);
        var hashTarget = inPageNav.querySelector('[data-target="' + hashStr + '"]');

        if (hashTarget) {
          anchorActiveLink = hashTarget;
          anchorActiveLink.classList.add('active');
        }
      }

      if (anchorActiveLink) {
        triggerText.innerHTML = anchorActiveLink.innerHTML;
      }

      trigger.addEventListener('click', function () {
        //debugger;
        inPageNav.classList.toggle('open');
      });
      anchorLink.forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var container = inPageNav;
          anchorActiveLink = document.querySelector('.with-anchor.active');

          if (anchorActiveLink) {
            anchorActiveLink.classList.remove('active');
          }

          e.currentTarget.classList.add('active');
          triggerText.innerHTML = e.currentTarget.innerHTML;

          if (e.currentTarget.classList.contains('with-anchor')) {
            var targetID = e.currentTarget.getAttribute('data-target');
            var target = document.getElementById(targetID);

            if (target) {
              updateScrollPosition(container, target);
            }

            inPageNav.classList.remove('open');
          }
        });
      });

      function updateScrollPosition(container, target) {
        var eleTop = CustomUtil.getInStickyTop(container);
        var top = target.offsetTop;
        CustomUtil.updateSettings();
        var scrollTo = top;

        if (top > prevScroTop) {
          if (container.classList.contains('sticky-fixed')) {
            scrollTo = top - eleTop - container.clientHeight;
          } else {
            scrollTo = top - eleTop - 2 * container.clientHeight;
          }
        } else {
          if (container.classList.contains('sticky-fixed')) {
            scrollTo = top - eleTop - container.clientHeight - CustomUtil.settings.headerFixedHeight;
          } else {
            scrollTo = top - eleTop - 2 * container.clientHeight;
          }
        }

        var isTargetVS = target.id == 'VerticalSlider' || target.id == 'VerticalSlider-item-0' || target.classList.contains('VerticalSlider-container');

        if (isTargetVS) {
          scrollTo += 9;
        }

        window.scrollTo(0, scrollTo);
      }

      window.addEventListener('scroll', function (e) {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            bindNavFixedEvent();
            ticking = false;
          });
          ticking = true;
        }
      });
      window.addEventListener('hashchange', function (e) {
        e.preventDefault();
        var container = inPageNav;

        if (container) {
          var str = document.location.hash.slice(1);
          var target = document.getElementById(str);

          var _anchorLink = container.querySelectorAll('.with-anchor');

          var _anchorActiveLink = container.querySelector('[data-target="' + str + '"]');

          _anchorLink.forEach(function (link) {
            if (link.classList.contains('active')) {
              link.classList.remove('active');
            }
          });

          if (_anchorActiveLink) {
            _anchorActiveLink.classList.add('active');
          }

          updateScrollPosition(container, target);
        }
      }, false);

      function bindNavFixedEvent() {
        var top = nav_top;
        CustomUtil.updateSettings();
        var scroTop = window.scrollY || document.documentElement.scrollTop;
        var condition = scroTop > top;
        var ele = inPageNav;

        if (scroTop > prevScroTop) {
          //down
          condition = scroTop > top;
        } else {
          condition = scroTop > top - nav_height - CustomUtil.settings.headerFixedHeight;
        }

        CustomUtil.bindStickyEvent(condition, ele);
        prevScroTop = scroTop;
      }
    }
  }

  function FormTabs() {
    var tabs = document.querySelectorAll('.Tab');

    if (tabs && tabs.length > 0) {
      //const dropdownItems = document.querySelectorAll('.FormTabs-dropdownItem');
      //const formLink = document.getElementById('nav-option');
      //const formDropdown = document.getElementById('nav-dropdown');
      //const formIcon = document.getElementById('nav-icon');
      //let formTab = document.querySelector('.FormTabs');
      //let formTabBar = document.querySelector('.FormTabs-bar');
      //let ticking = false;
      //let tab_top = formTab.offsetTop;
      //let tabHeight = formTabBar.clientHeight;
      //let prevScroTop = 0;
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var activeTab = document.querySelectorAll('.Tab--active');
          activeTab[0].classList.remove('Tab--active');
          tab.classList.add('Tab--active');
          var relatedContentBodyShown = document.querySelectorAll('.RelatedContent-shown')[0];
          var relatedContentBodyHidden = document.getElementById(tab.dataset.target);
          relatedContentBodyShown.classList.add('RelatedContent-hidden');
          relatedContentBodyShown.classList.remove('RelatedContent-shown');
          relatedContentBodyHidden.classList.remove('RelatedContent-hidden');
          relatedContentBodyHidden.classList.add('RelatedContent-shown');
        });
      });
      /*dropdownItems.forEach((dropdownItem) => {
        dropdownItem.addEventListener('click', () => {
          let activeItem = document.querySelectorAll('.FormTabs-dropdownHeaderActive');
          activeItem.forEach((item) => {
            item.classList.remove('FormTabs-dropdownHeaderActive');
          });
          let dropdownItemHeader = dropdownItem.querySelector('.FormTabs-dropdownHeader');
          dropdownItemHeader.classList.add('FormTabs-dropdownHeaderActive');
          let newTitle = dropdownItemHeader.dataset.title;
          let navHeader = document.getElementById('form-nav-header');
          navHeader.innerText = newTitle;
          let relatedContentBodyShown = document.querySelectorAll('.RelatedContent-shown')[0];
          let relatedContentBodyHidden = document.getElementById(dropdownItem.dataset.target);
          relatedContentBodyShown.classList.add('RelatedContent-hidden');
          relatedContentBodyShown.classList.remove('RelatedContent-shown');
          relatedContentBodyHidden.classList.remove('RelatedContent-hidden');
          relatedContentBodyHidden.classList.add('RelatedContent-shown');
          formLink.classList.remove('FormTabsNav-active');
          formLink.classList.add('FormTabsNav-inactive');
          formDropdown.classList.remove('FormTabs-dropdownActive');
          formIcon.src = '/ww/redesign/assets/icons/expand-more.svg';
            formTabBar.classList.remove('open');
          updateScrollPosition(formTabBar, formTab);
        });
      });
        formLink.addEventListener('click', () => {
        if (formLink.classList.contains('FormTabsNav-inactive')) {
          formLink.classList.remove('FormTabsNav-inactive');
          formLink.classList.add('FormTabsNav-active');
          formDropdown.classList.add('FormTabs-dropdownActive');
          formIcon.src = '/ww/redesign/assets/icons/close.svg';
        } else {
          formLink.classList.remove('FormTabsNav-active');
          formLink.classList.add('FormTabsNav-inactive');
          formDropdown.classList.remove('FormTabs-dropdownActive');
          formIcon.src = '/ww/redesign/assets/icons/expand-more.svg';
        }
          formTabBar.classList.toggle('open');
      });
        function updateScrollPosition(container, target) {
        if (container.classList.contains('sticky-fixed')) {
          let eleTop = CustomUtil.getInStickyTop(container);
          let top = target.offsetTop;
          let scrollTo = top - eleTop - CustomUtil.settings.headerFixedHeight;
          window.scrollTo(0, scrollTo);
        }
      }
        window.addEventListener('scroll', (e) => {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            bindTabFixedEvent();
            ticking = false;
          });
          ticking = true;
        }
      });
        function bindTabFixedEvent() {
        let eleTop = CustomUtil.getInStickyTop(formTabBar);
        //console.log("top:" + tab_top + " offset:" + formTab.offsetTop);
        CustomUtil.updateSettings();
        let scroTop = window.scrollY || document.documentElement.scrollTop;
        let min = formTab.offsetTop - tabHeight - eleTop;
        let max = min + formTab.clientHeight - tabHeight;
        if (scroTop <= prevScroTop) {
          min = formTab.offsetTop - tabHeight - eleTop - CustomUtil.settings.headerFixedHeight;
        }
          let condition = scroTop > min && scroTop < max;
        let ele = formTabBar;
          //Condition when down after fixedtab disappear
        if (condition) {
          ele.classList.add('has-fixed');
        }
          CustomUtil.bindStickyEvent(condition, ele);
          //Condition when up to original tab
        if (scroTop <= min) {
          ele.classList.remove('has-fixed');
        }
          prevScroTop = scroTop;
      }*/
    }
  }

  function AlertBar() {
    console.log('AlertBar');
    var alert = document.querySelectorAll('.AlertBar');

    if (alert && alert.length > 0) {
      bindMFCarousel();

      function bindMFCarousel() {
        var alertBar = MFCarousel('.AlertBar-carousel');
        alert.forEach(function (al) {
          var close = al.querySelector('.MFCarousel-close');

          if (close) {
            close.addEventListener('click', function () {
              al.classList.add('hide-bar');
              updateRelatedElements();
            });
          }
        });
      }

      function updateRelatedElements() {
        var shyPlaceholderHeight = CustomUtil.screenIs == 'isMobile' ? 76 : 143;
        var shyNav = document.querySelector('[data-shy-nav]');
        var shyPlaceholder = document.querySelector('.ShyNav-shim');
        var search = document.querySelector('[data-search]');
        var secondaryNav = document.querySelector('.SecondaryNav');
        var submenus = document.querySelectorAll('[data-navigationmenu]');
        var mobildRow = document.querySelector('.PrimaryNav >.Container--row');
        shyPlaceholder.style.height = shyPlaceholderHeight + 'px';
        shyNav.style.height = shyPlaceholder.clientHeight + 'px';
        submenus.forEach(function (menu) {
          menu.style.top = shyNav.clientHeight + 'px';
        });
      }
    }
  }

  function ArticleDetail() {
    console.log('ArticleDetail');
    var ArticleDetail = document.querySelector('.ArticleDetail');
    setContentImageOverlay();

    function setContentImageOverlay() {
      if (ArticleDetail) {
        var contentImage = ArticleDetail.querySelector('.content-image');
        var overlay = ArticleDetail.querySelector('.content-overlay');

        if (contentImage && overlay) {
          overlay.style.width = ArticleDetail.clientWidth + 'px';
          overlay.style.height = contentImage.clientHeight / 2 + 'px';
          overlay.style.top = -contentImage.clientHeight / 2 + 'px';
        }
      }
    }

    window.addEventListener('resize', function (e) {
      setContentImageOverlay();
    });
  }

  function CardLayoutOffer() {
    var cardLayoutOffer = document.querySelectorAll('.CardLayoutOffer');

    if (cardLayoutOffer) {
      var card = '.CardLayoutOffer-cards';
      var cardTitle = '.card-title';
      var cardDes = '.card-des';
      var cardOffer = '.card-offer';
      var cardBtn = '.CardLayoutOffer-buttonsContainer';
      setSameElementHeight(card, cardTitle);
      setSameElementHeight(card, cardDes);
      setSameElementHeight(card, cardOffer);
      setSameElementHeight(card, cardBtn);
      window.addEventListener('resize', function (e) {
        setSameElementHeight(card, cardTitle);
        setSameElementHeight(card, cardDes);
        setSameElementHeight(card, cardOffer);
        setSameElementHeight(card, cardBtn);
      });
    }

    function setSameElementHeight(parent, child) {
      var boxes = document.querySelectorAll(parent);
      boxes.forEach(function (box) {
        var tallest = 0;
        var elements = box.querySelectorAll(child);
        elements.forEach(function (element) {
          element.style.height = 'auto';

          if (element.clientHeight > tallest) {
            tallest = element.clientHeight;
          }
        });
        elements.forEach(function (element) {
          element.style.height = tallest + 'px';
        });
      });
    }
  }

  //import MFCollapse from '../../components/MFCollapse';
  function ContentLayoutFaq() {
    console.log('ContentLayoutFaq');

    var ContentLayoutFaq = document.querySelector('.ContentLayoutFaq');

    if (ContentLayoutFaq) {
      /*var accordion = MFCollapse('.ContentLayoutFaq', {MULTI_COLLAPSE:true});
      var accordionElement = document.querySelector('.ContentLayoutFaq');
      accordionElement.addEventListener('hidden.mf.collapse', function (event) {
        debugger;
        console.log('hidden:' + event.detail.ele);
      });
      accordionElement.addEventListener('shown.mf.collapse', function (event) {
        debugger;
        console.log('shown:' + event.detail.ele);
      });*/
      var accordionToggles = ContentLayoutFaq.querySelectorAll('[data-toggle="collapse"]');
      var accordionCollapses = ContentLayoutFaq.querySelectorAll('.collapse');
      accordionCollapses.forEach(function (collapse) {
        var dimission = collapse.getBoundingClientRect().height;
        collapse.addEventListener('transitionend', function (e) {
          collapse.classList.remove('collapsing');

          if (collapse.style.height == '') {
            collapse.classList.remove('show');
          }
        });
      });
      accordionToggles.forEach(function (toggle) {
        var target = toggle.getAttribute('data-target');
        var collapse = ContentLayoutFaq.querySelector(target);
        collapse.style.height = collapse.clientHeight + 'px';
        toggle.addEventListener('click', function () {
          if (collapse.classList.contains('show')) {
            toggle.classList.add('collapsed');
            toggle.setAttribute('aria-expanded', 'false');
            collapse.classList.add('collapsing');
            collapse.style.height = '';
          } else {
            toggle.classList.remove('collapsed');
            toggle.setAttribute('aria-expanded', 'true');
            collapse.classList.add('show');
            collapse.classList.add('collapsing');
            collapse.style.height = collapse.querySelector('.accordion-content').clientHeight + 'px';
          }
        });
      });
      window.addEventListener('resize', function () {
        var showCollapses = ContentLayoutFaq.querySelectorAll('.collapse.show');
        showCollapses.forEach(function (collapse) {
          collapse.style.height = collapse.querySelector('.accordion-content').clientHeight + 'px';
        });
      });
    }
  }

  function Chatbot() {
    console.log('Chatbot');
    var chatbot = document.querySelector('.Chatbot');

    if (chatbot) {
      var trigger = document.getElementById('all');
      trigger.addEventListener('click', function () {
        chatbot.classList.toggle('open');
      });
    }
  }

  function NavigationProductTour() {
    console.log('NavigationProductTour');
    var body = document.body;
    var navigationProductTour = document.querySelector('.NavigationProductTour');

    if (navigationProductTour) {
      var navigationProductTourMenu = document.querySelector('[data-navigationproducttour]');
      var navigationProductTourTriggers = document.querySelectorAll('[data-navigationproducttour-trigger]');
      var navigationProductTourSubmenus = document.querySelectorAll('[data-submenu]');
      var submenuTriggers = document.querySelectorAll('[data-submenu-trigger]');
      navigationProductTourTriggers.forEach(function (trigger) {
        trigger.addEventListener('click', function () {
          navigationProductTourTriggers.forEach(function () {
            return trigger.classList.toggle('is-active');
          });
          document.body.classList.toggle('is-navigationProductTourOpen');
          navigationProductTourMenu.classList.toggle('is-open');
          navigationProductTourMenu.querySelector('.NavigationProductTour-subMenus-menu').classList.remove('is-open');
          body.classList.remove('is-submenuOpen');
          body.classList.remove('is-submenuChildOpen');
        });
      });
      submenuTriggers.forEach(function (trigger) {
        var submenuName = trigger.dataset.submenuTrigger;
        trigger.addEventListener('click', function () {
          navigationProductTourSubmenus.forEach(function (submenu) {
            submenu.classList.remove('is-open');
          });

          if (submenuName) {
            var submenu = document.querySelector("[data-submenu=\"".concat(submenuName, "\"]"));
            submenu.classList.add('is-open');
            body.classList.add('is-submenuOpen');

            if (submenu.dataset.submenuChild) {
              body.classList.add('is-submenuChildOpen');
            } else {
              body.classList.remove('is-submenuChildOpen');
            }
          } else {
            var openSubmenu = document.querySelector('[data-submenu].is-open');

            if (openSubmenu) {
              openSubmenu.classList.remove('is-open');
            }

            body.classList.remove('is-submenuOpen');
            body.classList.remove('is-submenuChildOpen');
          }
        });
      });
    }
  }

  Swiper.use([Autoplay$1, EffectFade]);

  function ContentLayoutProductTour() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        el = _ref.el;

    console.log('ContentLayoutProductTour'); //el = document.querySelector('.ContentLayoutProductTour');

    var transitionSpeed = 0.3; //300;

    var singleSlideClass = 'ContentLayoutProductTour--singleSlide';
    var contentPanelEl = el.querySelector('.ContentLayoutProductTour-contentPanel');
    var contentSwiperEl = el.querySelector('.ContentLayoutProductTour-contentPanel .swiper-container');
    var videoSwiperEl = el.querySelector('.ContentLayoutProductTour-contentPanel .video-container');
    var video = el.querySelector('video');
    var videoList = el.querySelectorAll('.ContentLayoutProductTour-video');
    var SwiperEl = el.querySelector('.ContentLayoutProductTour-contentPanel .ContentLayoutProductTour-container');
    var SliderSwiperEl = el.querySelector('.ContentLayoutProductTour-contentPanel .swiper-wrapper');
    var SliderActiveEl = el.querySelector('.ContentLayoutProductTour-contentPanel .swiper-slide-active');
    var leftButtonEl = el.querySelector('.ContentLayoutProductTour-navArrowButton-left');
    var paginationContainerEl = el.querySelector('.ContentLayoutProductTour-paginationContainer');
    var rightButtonEl = el.querySelector('.ContentLayoutProductTour-navArrowButton-right');
    var calloutsEls = SwiperEl.querySelectorAll('.ContentLayoutProductTour-callout');
    var calloutsMobileEl = contentPanelEl.querySelector('.ContentLayoutProductTour-callouts-mobile');
    var expandEl = el.querySelector('.ContentLayoutProductTour-expand');
    var ModalEl = document.getElementById(expandEl.dataset.micromodalTrigger);
    var ModalImagesEls = ModalEl.querySelectorAll('.ContentLayoutProductTour-modalImage');
    var ModalCalloutsEls = ModalEl.querySelectorAll('.ContentLayoutProductTour-callouts');
    var ModalVideo = ModalEl.querySelector('video');
    var browserInfo = new uaParser().getBrowser();
    var isAutoplayRunning = true;
    var isVideoAuto = true;
    var timeArry = [];
    var isVideoPlaying = true;
    var videoActiveIndex = 0;
    var videoCurrentIndex = 0;
    var isImagesReady = false;
    var isMobile = getComputedStyle(calloutsMobileEl).display == 'none' ? false : true;

    var revealCustomElements = function revealCustomElements(ele, timer, speed) {
      if (ele) {
        var revealCEls = ele.querySelectorAll('[data-creveal]');
        var revealCEvent = new CustomEvent('isCRevealed', {
          detail: {
            isCRevealed: true
          }
        });
        var observerConfig = {
          rootMargin: '0px 0px -9% 0px',
          threshold: 0
        };
        var observer = new IntersectionObserver(function (elements, self) {
          elements.forEach(function (element) {
            if (element.isIntersecting) {
              // Add class and stop watching
              element.target.classList.add('is-revealed');
              element.target.dispatchEvent(revealCEvent);
              self.unobserve(element.target);
            }
          });
        }, observerConfig);
        revealCEls.forEach(function (element) {
          var delay = parseInt(element.dataset.creveal, 10) || 0; //element.style.transitionDelay = `${timer * delay - delay * speed}s`;

          element.style.transitionDelay = "".concat(timer * delay, "s");
          observer.observe(element);
        });
      }
    };

    var showCallouts = function showCallouts() {
      var activeEl;
      var activeElDuration;
      var imageWidth;
      var boxWidth;
      var boxEl;

      if (contentSwiperEl) {
        activeEl = contentSwiperEl.querySelector('.swiper-slide-active');
        activeElDuration = parseInt(activeEl.getAttribute('data-swiper-autoplay')) / 1000;
        boxEl = activeEl;
        imageWidth = activeEl.querySelector('.ContentLayoutProductTour-frontground-large').clientWidth;
      } else {
        activeEl = videoList[videoCurrentIndex];
        activeElDuration = parseInt(activeEl.getAttribute('data-duration'));
        boxEl = videoSwiperEl;
        imageWidth = video.clientWidth;
      }

      boxWidth = (boxEl.clientWidth - imageWidth) / 2 - 30;
      var calloutsType = activeEl.dataset.calloutType;
      var calloutsEl = activeEl.querySelectorAll('.ContentLayoutProductTour-callout');
      var calloutLen = calloutsEl.length;
      var transitionDuration = activeElDuration / calloutLen;
      var calloutsMobileIndex = calloutsEl[0].parentElement.dataset.index;
      var calloutsMobileActiveEl = calloutsMobileEl.querySelector('.ContentLayoutProductTour-callouts[data-index= "' + calloutsMobileIndex + '"]');
      revealCustomElements(activeEl, transitionDuration);
      calloutsEl.forEach(function (cEl, i) {
        var cElAlign = cEl.dataset.align;
        var width = cEl.offsetLeft + 30;

        if (cElAlign.toLowerCase() == 'right') {
          width = imageWidth - cEl.offsetLeft + 30;
          cEl.querySelector('i').style.left = 0;
          cEl.querySelector('div').style.left = "".concat(width, "px");
        } else {
          width = cEl.offsetLeft + 30;
          cEl.querySelector('i').style.right = '100%';
          cEl.querySelector('div').style.right = "calc(100% + ".concat(width, "px)");
        }

        var transitionDelay = cEl.querySelector('i').style.transitionDelay;

        if (calloutsType.toLowerCase() == 'immediate') {
          isMobile = getComputedStyle(calloutsMobileEl).display == 'none' ? false : true;

          if (!isMobile) {
            //cEl.querySelector('span').style.transition =`opacity ${transitionSpeed}s linear`;
            cEl.querySelector('i').style.transition = "width ".concat(transitionSpeed, "s linear ").concat(transitionSpeed, "s");
            cEl.querySelector('div').style.transition = "opacity ".concat(transitionSpeed, "s linear ").concat(transitionSpeed, "s,transform ").concat(transitionSpeed, "s linear ").concat(transitionSpeed, "s");
          } else {
            cEl.querySelector('span').style.transition = "opacity ".concat(transitionSpeed, "s linear ").concat(transitionDelay);
          }
        } else {
          cEl.querySelector('span').style.transition = "opacity ".concat(transitionSpeed, "s linear ").concat(transitionDelay);
          cEl.querySelector('i').style.transition = "width ".concat(transitionSpeed, "s linear ").concat(transitionDelay);
          cEl.querySelector('div').style.transition = "opacity ".concat(transitionSpeed, "s linear ").concat(transitionDelay, ", transform ").concat(transitionSpeed, "s linear ").concat(transitionDelay);
        }

        cEl.querySelector('span').style.opacity = 1;
        cEl.querySelector('i').style.width = "".concat(width, "px");
        cEl.querySelector('div').style.width = "".concat(boxWidth, "px");
        cEl.querySelector('div').style.opacity = 1;
        cEl.querySelector('div').style.transform = 'translateY(0)';
        var cElIndex = cEl.dataset.index;
        var transitionEl = cEl.querySelector('span');
        transitionEl.addEventListener('transitionstart', function (e) {
          var p = e.currentTarget.parentElement;
          var pIndex = parseInt(p.dataset.index);
          calloutsEl.forEach(function (el) {
            if (parseInt(el.dataset.index) < pIndex) {
              el.querySelector('span').style.opacity = 0;
              el.querySelector('span').style.transition = 'none';
              el.querySelector('i').style.width = 0;
              el.querySelector('i').style.transition = 'none';
              el.querySelector('div').style.opacity = 0;
              el.querySelector('div').style.transform = 'translateY(5px)';
              el.querySelector('div').style.transition = 'none';
            }
          });
        }); //For Mobile

        if (isMobile) {
          var mobileCEl = calloutsMobileActiveEl.querySelectorAll('.ContentLayoutProductTour-callout');
          var mobileActiveCEl = calloutsMobileActiveEl.querySelector('.ContentLayoutProductTour-callout[data-index= "' + cElIndex + '"]');
          mobileActiveCEl.querySelector('div').style.opacity = 1;
          mobileActiveCEl.querySelector('div').style.transition = "opacity ".concat(transitionSpeed, "s linear ").concat(transitionDelay);
          var mobileTransitionEl = mobileActiveCEl.querySelector('div');
          mobileTransitionEl.addEventListener('transitionstart', function (e) {
            var p = e.currentTarget.parentElement;
            var pp = p.parentElement;
            var pIndex = parseInt(p.dataset.index);
            calloutsEl.forEach(function (el) {
              if (parseInt(el.dataset.index) < pIndex) {
                el.querySelector('span').style.opacity = 0;
                el.querySelector('span').style.transition = 'none';
              }
            });
            mobileCEl.forEach(function (cel) {
              if (cel.dataset.index < pIndex) {
                cel.querySelector('div').style.opacity = 0;
                cel.querySelector('div').style.transition = 'none';
              }
            });
          });
        }
      });
    };

    var setCalloutsPosition = function setCalloutsPosition(children) {
      var pWidth = 640;
      var pHeight = 360;
      children.forEach(function (child) {
        var cX = parseInt(child.dataset.hotspotx);
        var cY = parseInt(child.dataset.hotspoty);
        var cLeft = (cX / pWidth).toFixed(2) * 100;
        var cTop = (cY / pHeight).toFixed(2) * 100;
        child.style.left = cLeft + '%';
        child.style.top = cTop + '%';
      });
    };

    var resetCallouts = function resetCallouts(els) {
      els.forEach(function (el) {
        el.querySelectorAll('.ContentLayoutProductTour-callout').forEach(function (cEl, i) {
          cEl.querySelector('span').style.opacity = 0;
          cEl.querySelector('i').style.width = 0;
          cEl.querySelector('div').style.opacity = 0;
          cEl.querySelector('div').style.transform = 'translateY(5px)';
          cEl.querySelector('span').style.transition = 'none';
          cEl.querySelector('div').style.transition = 'none';
          cEl.querySelector('i').style.transition = 'none';
        });
      });
      calloutsMobileEl.querySelectorAll('.ContentLayoutProductTour-callout').forEach(function (cEl, i) {
        cEl.querySelector('div').style.opacity = 0;
        cEl.querySelector('div').style.transition = 'none';
      });
    };

    var updateProgressBars = function updateProgressBars(index) {
      paginationContainerEl.querySelectorAll('.ContentLayoutProductTour-paginationButton-progressBar').forEach(function (barEl, i) {
        var isActiveIndex = i === index;
        var pageDuration = parseInt(barEl.dataset.duration);
        var autoPlay = contentSwiperEl ? isAutoplayRunning : isVideoAuto; //barEl.style.transition =
        //  isActiveIndex && isAutoplayRunning ? `width ${pageDuration + transitionSpeed}s linear` : 'none';

        barEl.style.transition = isActiveIndex && autoPlay ? "width ".concat(pageDuration, "s linear") : 'none';
        barEl.style.width = isActiveIndex ? '100%' : 0;
      });
    };

    var isSingleSlide = function () {
      if (contentSwiperEl) {
        if (el.classList.contains(singleSlideClass) || contentSwiperEl.querySelector('.swiper-wrapper').children.length < 2) {
          el.classList.add(singleSlideClass);
          return true;
        }
      }
    }();

    var contentSwiper = contentSwiperEl ? new Swiper(contentSwiperEl, {
      // NOTE: Auto height does not work on IE11.
      allowTouchMove: !isSingleSlide,
      autoHeight: !(browserInfo.name === 'IE' && /^11/.test(browserInfo.version)),
      //autoplay: isSingleSlide ? false : { delay: autoplayDelay*1000, disableOnInteraction: false, },
      effect: 'fade',
      fadeEffect: {
        crossFade: true
      },
      loop: true,
      speed: transitionSpeed * 1000,
      on: {
        imagesReady: function imagesReady() {
          console.log('images ready.');
          isImagesReady = true;
        }
      }
    }) : null;
    var old = 0;

    var setSwiperHeightForIE = function setSwiperHeightForIE() {
      if (browserInfo.name === 'IE' && /^11/.test(browserInfo.version) && !isSingleSlide) {
        SliderActiveEl = contentSwiperEl.querySelector('.swiper-slide-active');

        if (SliderActiveEl) {
          SliderActiveEl.style.height = 'auto';
          SliderSwiperEl.style.height = 'auto';

          if (old != contentSwiper.realIndex) {
            SliderSwiperEl.style.height = SliderActiveEl.clientHeight + 'px';
            old = contentSwiper.realIndex;
          }
        }
      }
    };

    if (contentSwiperEl) {
      contentSwiper.on('slideChange', function () {
        //bgSwiper.slideTo(contentSwiper.realIndex);
        var SliderEls = contentSwiperEl.querySelectorAll('.swiper-slide');
        resetCallouts(SliderEls);
        updateProgressBars(contentSwiper.realIndex);
      });
      contentSwiper.on('transitionEnd', function () {
        //console.log('*** contentSwiper.realIndex', contentSwiper.realIndex);
        setSwiperHeightForIE();
        showCallouts();
      });
      contentSwiper.on('autoplayStop', function () {
        return isAutoplayRunning = false;
      });
      setSwiperHeightForIE();
    } else {
      var before = Date.now();
      var timer;
      videoList.forEach(function (v) {
        var videoIndex = parseInt(v.dataset.index);
        var videoDuration = parseInt(v.dataset.duration);
        var videoTime = parseInt(v.dataset.pauseTime);
        timeArry.push(videoTime);
      });
      var currentStopTime = timeArry[videoActiveIndex];
      video.addEventListener('timeupdate', function (e) {
        // check whether we have passed N minutes,
        // current time is given in seconds
        updateVideoTime(video);

        function pauseToPlay() {
          timer = requestAnimationFrame(pauseToPlay);
          var now = Date.now();
          var interval = videoList[videoCurrentIndex].dataset.duration * 1000;

          if (now - before >= interval) {
            if (video.paused && !video.ended && !isVideoPlaying && isVideoAuto) {
              //console.log('delay:' + videoList[videoCurrentIndex].dataset.duration * 1000);
              //console.log('play:' + videoActiveIndex);
              video.play();
              resetCallouts(videoList);

              if (videoCurrentIndex < timeArry.length - 1) {
                videoCurrentIndex++;
              }
            }
          }
        }

        pauseToPlay();
        /*setTimeout(()=>{
        if(video.paused && !video.ended && !isVideoPlaying && isVideoAuto){
          console.log("delay:" + videoList[videoCurrentIndex].dataset.duration* 1000);
          console.log("play:" + videoActiveIndex);
          video.play();
          resetCallouts(videoList);
          if(videoCurrentIndex < timeArry.length - 1){
            videoCurrentIndex++;
          }
        }
        },videoList[videoCurrentIndex].dataset.duration* 1000);*/
      });
      video.addEventListener('ended', function () {
        console.log("It's over!");
        timer = 0;
        isVideoPlaying = false;
        videoActiveIndex = 0;
        videoCurrentIndex = 0;
        currentStopTime = timeArry[videoActiveIndex];
        video.currentTime = 0;
        video.play();
        isVideoPlaying = true;
      });

      var updateVideoTime = function updateVideoTime(video) {
        if (video.currentTime >= timeArry[videoActiveIndex]) {
          if (!video.paused) {
            console.log('pause:' + videoActiveIndex);
            video.pause();
            before = Date.now();
            currentStopTime = timeArry[videoActiveIndex];
            video.currentTime = currentStopTime;
            isVideoPlaying = false;
            updateProgressBars(videoCurrentIndex);
            showCallouts();
          }

          if (timeArry.length > ++videoActiveIndex) {
            // increase index and get next time
            currentStopTime = timeArry[videoActiveIndex];
          }
        }
      };

      var setVideoHeightForIE = function setVideoHeightForIE() {
        if (browserInfo.name === 'IE' && /^11/.test(browserInfo.version)) {
          //alert(video.clientHeight)
          videoSwiperEl.style.height = 360 + 'px';
        }
      };

      setVideoHeightForIE();
    } //External function for click callout to display info

    /*if(calloutsEls && calloutsEls.length > 0){
    calloutsEls.forEach(function(el){
      el.addEventListener(
        'click',
        (el.handleClick = (e) => {
          let elIndex = 0;
          if(contentSwiper) {
            contentSwiper.autoplay.stop();
            SliderActiveEl = contentSwiperEl.querySelector('.swiper-slide-active');
            elIndex = parseInt(SliderActiveEl.querySelectorAll('.ContentLayoutProductTour-callouts')[0].dataset.index);
          }else {
            video.pause();
            elIndex = videoCurrentIndex;
          }
          let calloutIndex = parseInt(e.currentTarget.dataset.index);
          let mobileCallout = calloutsMobileEl.querySelectorAll('.ContentLayoutProductTour-callouts')[elIndex].querySelectorAll('.ContentLayoutProductTour-callout')[calloutIndex];
          calloutsMobileEl.querySelectorAll('.ContentLayoutProductTour-callout').forEach((cEl, i) => {
            cEl.querySelector('div').style.opacity = 0;
            cEl.querySelector('div').style.transition = 'none';
          });
          mobileCallout.querySelector('div').style.opacity = 1;
          mobileCallout.querySelector('div').style.transitionDelay = '0s';
        })
      );
    });
    }*/


    expandEl.addEventListener('click', expandEl.handleClick = function (e) {
      if (contentSwiperEl) {
        contentSwiper.autoplay.stop();
        SliderActiveEl = contentSwiperEl.querySelector('.swiper-slide-active');
        var sliderIndex = parseInt(SliderActiveEl.querySelectorAll('.ContentLayoutProductTour-callouts')[0].dataset.index);
        ModalImagesEls.forEach(function (el) {
          el.style.display = 'none';
        });
        ModalImagesEls[sliderIndex].style.display = 'flex';
      } else {
        isVideoAuto = false;
        video.pause();
        ModalVideo.setAttribute('src', video.getAttribute('src'));
      }
    });
    leftButtonEl.addEventListener('click', leftButtonEl.handleClick = function () {
      if (contentSwiperEl) {
        contentSwiper.autoplay.stop();
        contentSwiper.slidePrev();
      } else {
        isVideoAuto = false;
        resetCallouts(videoList);
        video.pause();
        videoCurrentIndex -= 1;

        if (videoCurrentIndex < 0) {
          videoCurrentIndex = timeArry.length - 1;
        }

        video.currentTime = timeArry[videoCurrentIndex];
        updateProgressBars(videoCurrentIndex);
        showCallouts();
      }
    });
    rightButtonEl.addEventListener('click', rightButtonEl.handleClick = function () {
      if (contentSwiperEl) {
        contentSwiper.autoplay.stop();
        contentSwiper.slideNext();
      } else {
        isVideoAuto = false;
        resetCallouts(videoList);
        video.pause();
        videoCurrentIndex += 1;

        if (videoCurrentIndex > timeArry.length - 1) {
          videoCurrentIndex = 0;
        }

        video.currentTime = timeArry[videoCurrentIndex];
        updateProgressBars(videoCurrentIndex);
        showCallouts();
      }
    });
    paginationContainerEl.children.forEach(function (child, i) {
      return child.addEventListener('click', child.handleClick = function (e) {
        if (contentSwiperEl) {
          contentSwiper.autoplay.stop();
          contentSwiper.slideToLoop(i);
        } else {
          isVideoAuto = false;
          resetCallouts(videoList);
          video.pause();
          videoCurrentIndex = parseInt(e.currentTarget.dataset.index);
          video.currentTime = timeArry[videoCurrentIndex];
          updateProgressBars(videoCurrentIndex);
          showCallouts();
        }
      });
    });

    var revealProductTour = function revealProductTour() {
      var revealPEvent = new CustomEvent('isPRevealed', {
        detail: {
          isPRevealed: true
        }
      });
      var observerConfig = {
        rootMargin: '0px 0px -50% 0px',
        threshold: 0
      };
      var observer = new IntersectionObserver(function (elements, self) {
        elements.forEach(function (element) {
          if (element.isIntersecting) {
            // Add class and stop watching
            element.target.classList.add('is-prevealed');

            if (contentSwiperEl) {
              if (isImagesReady) {
                window.requestAnimationFrame(function () {
                  if (!isSingleSlide) {
                    if (isAutoplayRunning) {
                      contentSwiper.autoplay.start();
                      updateProgressBars(contentSwiper.realIndex);
                    }
                  }

                  showCallouts();
                });
              }
            } else {
              if (isVideoAuto) {
                video.play();
              }
            }

            element.target.dispatchEvent(revealPEvent);
            self.unobserve(element.target);
          }
        });
      }, observerConfig);
      observer.observe(el);
    };

    revealElements();
    calloutsEls = SwiperEl.querySelectorAll('.ContentLayoutProductTour-callout');
    setCalloutsPosition(calloutsEls);
    revealProductTour();
    window.addEventListener('load', function () {
      calloutsEls = SwiperEl.querySelectorAll('.ContentLayoutProductTour-callout');
      setCalloutsPosition(calloutsEls);
      revealProductTour();
    });
    window.addEventListener('resize', function () {
      isMobile = getComputedStyle(calloutsMobileEl).display == 'none' ? false : true;

      if (contentSwiperEl) {
        contentSwiper.autoplay.stop();
      } else {
        isVideoAuto = false;
        video.pause();
      }
    });
    return {
      destroy: function destroy() {
        if (contentSwiperEl) {
          contentSwiper.detachEvents();
          contentSwiper.destroy();
        }

        leftButtonEl.removeEventListener('click', leftButtonEl.handleClick);
        rightButtonEl.removeEventListener('click', rightButtonEl.handleClick);
        expandEl.removeEventListener('click', expandEl.handleClick);
        paginationContainerEl.children.forEach(function (child) {
          return child.removeEventListener('click', child.handleClick);
        });
        calloutsEls.forEach(function (child) {
          return child.removeEventListener('click', child.handleClick);
        });
      }
    };
  }

  ContentLayoutProductTour.defaultSelector = '.ContentLayoutProductTour';

  ContentLayoutProductTour.initAll = function () {
    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref2$selector = _ref2.selector,
        selector = _ref2$selector === void 0 ? ContentLayoutProductTour.defaultSelector : _ref2$selector;

    return _toConsumableArray(document.querySelectorAll(selector)).map(function (el) {
      return ContentLayoutProductTour({
        el: el
      });
    });
  };

  function ContentLayout3up() {
    console.log('ContentLayout3up');
    var ContentLayout3up = document.querySelectorAll('.ContentLayout3up');

    if (ContentLayout3up) {
      var col = '.ContentLayout3up-col';
      var colImage = 'a';
      var colEyebrow = 'h3';
      var colTitle = 'h2';
      var colDes = 'p';
      setSameColHeight(col, colImage);
      setSameColHeight(col, colEyebrow);
      setSameColHeight(col, colTitle);
      setSameColHeight(col, colDes);
      window.addEventListener('resize', function (e) {
        setSameColHeight(col, colImage);
        setSameColHeight(col, colEyebrow);
        setSameColHeight(col, colTitle);
        setSameColHeight(col, colDes);
      });
    }

    function setSameColHeight(parent, child) {
      var boxes = document.querySelectorAll(parent);
      var tallest = 0;
      boxes.forEach(function (box) {
        var element = box.getElementsByTagName(child)[0];

        if (element) {
          element.style.height = 'auto';

          if (element.clientHeight > tallest) {
            tallest = element.clientHeight;
          }
        }
      });
      boxes.forEach(function (box) {
        var element = box.getElementsByTagName(child)[0];

        if (element) {
          element.style.height = tallest + 'px';
        }
      });
    }
  }

  exports.AlertBar = AlertBar;
  exports.ArticleDetail = ArticleDetail;
  exports.Button = Button;
  exports.Card = Card;
  exports.CardLayout = CardLayout;
  exports.CardLayoutCarousel = CardLayoutCarousel;
  exports.CardLayoutMasonry = CardLayoutMasonry;
  exports.CardLayoutOffer = CardLayoutOffer;
  exports.CardLayoutProductDetailsSlider = CardLayoutProductDetailsSlider;
  exports.CardLayoutProducts = CardLayoutProducts;
  exports.Chatbot = Chatbot;
  exports.ComparisonTable = ComparisonTable;
  exports.ComparisonTableCarousel = ComparisonTableCarousel;
  exports.ContentCards = ContentCards;
  exports.ContentLayout3up = ContentLayout3up;
  exports.ContentLayoutCarousel = ContentLayoutCarousel;
  exports.ContentLayoutFaq = ContentLayoutFaq;
  exports.ContentLayoutProductTour = ContentLayoutProductTour;
  exports.ContentLayoutScrollZoom = ContentLayoutScrollZoom;
  exports.Eyebrow = Eyebrow;
  exports.FeatureContentLayout = FeatureContentLayout;
  exports.FeaturedContent = FeaturedContent;
  exports.Footer = Footer;
  exports.Form = Form;
  exports.FormTabs = FormTabs;
  exports.InPageNav = InPageNav;
  exports.MediaBehind2Up = MediaBehind2Up;
  exports.MobileMenu = MobileMenu;
  exports.Modal = init;
  exports.NavigationMenu = NavigationMenu;
  exports.NavigationProductTour = NavigationProductTour;
  exports.Partners = Partners;
  exports.PrimaryNav = PrimaryNav;
  exports.ProductDetail = ProductDetail;
  exports.Quote = Quote;
  exports.RevealElements = revealElements;
  exports.SecondaryNav = SecondaryNav;
  exports.SpecsTable = SpecsTable;
  exports.TabbedInfo = TabbedInfo;
  exports.VerticalSlider = VerticalSlider;

  return exports;

}({}));
