/**
 * rome - Customizable date (and time) picker. Opt-in UI, no jQuery!
 * @version v2.1.25
 * @link https://github.com/bevacqua/rome
 * @license MIT
 */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.rome = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function atoa (a, n) { return Array.prototype.slice.call(a, n); }

},{}],2:[function(require,module,exports){
'use strict';

var crossvent = require('crossvent');
var throttle = require('./throttle');
var tailormade = require('./tailormade');

function bullseye (el, target, options) {
  var o = options;
  var domTarget = target && target.tagName;

  if (!domTarget && arguments.length === 2) {
    o = target;
  }
  if (!domTarget) {
    target = el;
  }
  if (!o) { o = {}; }

  var destroyed = false;
  var throttledWrite = throttle(write, 30);
  var tailorOptions = { update: o.autoupdateToCaret !== false && update };
  var tailor = o.caret && tailormade(target, tailorOptions);

  write();

  if (o.tracking !== false) {
    crossvent.add(window, 'resize', throttledWrite);
  }

  return {
    read: readNull,
    refresh: write,
    destroy: destroy,
    sleep: sleep
  };

  function sleep () {
    tailorOptions.sleeping = true;
  }

  function readNull () { return read(); }

  function read (readings) {
    var bounds = target.getBoundingClientRect();
    var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    if (tailor) {
      readings = tailor.read();
      return {
        x: (readings.absolute ? 0 : bounds.left) + readings.x,
        y: (readings.absolute ? 0 : bounds.top) + scrollTop + readings.y + 20
      };
    }
    return {
      x: bounds.left,
      y: bounds.top + scrollTop
    };
  }

  function update (readings) {
    write(readings);
  }

  function write (readings) {
    if (destroyed) {
      throw new Error('Bullseye can\'t refresh after being destroyed. Create another instance instead.');
    }
    if (tailor && !readings) {
      tailorOptions.sleeping = false;
      tailor.refresh(); return;
    }
    var p = read(readings);
    if (!tailor && target !== el) {
      p.y += target.offsetHeight;
    }
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
  }

  function destroy () {
    if (tailor) { tailor.destroy(); }
    crossvent.remove(window, 'resize', throttledWrite);
    destroyed = true;
  }
}

module.exports = bullseye;

},{"./tailormade":3,"./throttle":4,"crossvent":7}],3:[function(require,module,exports){
(function (global){
'use strict';

var sell = require('sell');
var crossvent = require('crossvent');
var seleccion = require('seleccion');
var throttle = require('./throttle');
var getSelection = seleccion.get;
var props = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing'
];
var win = global;
var doc = document;
var ff = win.mozInnerScreenX !== null && win.mozInnerScreenX !== void 0;

function tailormade (el, options) {
  var textInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
  var throttledRefresh = throttle(refresh, 30);
  var o = options || {};

  bind();

  return {
    read: readPosition,
    refresh: throttledRefresh,
    destroy: destroy
  };

  function noop () {}
  function readPosition () { return (textInput ? coordsText : coordsHTML)(); }

  function refresh () {
    if (o.sleeping) {
      return;
    }
    return (o.update || noop)(readPosition());
  }

  function coordsText () {
    var p = sell(el);
    var context = prepare();
    var readings = readTextCoords(context, p.start);
    doc.body.removeChild(context.mirror);
    return readings;
  }

  function coordsHTML () {
    var sel = getSelection();
    if (sel.rangeCount) {
      var range = sel.getRangeAt(0);
      var needsToWorkAroundNewlineBug = range.startContainer.nodeName === 'P' && range.startOffset === 0;
      if (needsToWorkAroundNewlineBug) {
        return {
          x: range.startContainer.offsetLeft,
          y: range.startContainer.offsetTop,
          absolute: true
        };
      }
      if (range.getClientRects) {
        var rects = range.getClientRects();
        if (rects.length > 0) {
          return {
            x: rects[0].left,
            y: rects[0].top,
            absolute: true
          };
        }
      }
    }
    return { x: 0, y: 0 };
  }

  function readTextCoords (context, p) {
    var rest = doc.createElement('span');
    var mirror = context.mirror;
    var computed = context.computed;

    write(mirror, read(el).substring(0, p));

    if (el.tagName === 'INPUT') {
      mirror.textContent = mirror.textContent.replace(/\s/g, '\u00a0');
    }

    write(rest, read(el).substring(p) || '.');

    mirror.appendChild(rest);

    return {
      x: rest.offsetLeft + parseInt(computed['borderLeftWidth']),
      y: rest.offsetTop + parseInt(computed['borderTopWidth'])
    };
  }

  function read (el) {
    return textInput ? el.value : el.innerHTML;
  }

  function prepare () {
    var computed = win.getComputedStyle ? getComputedStyle(el) : el.currentStyle;
    var mirror = doc.createElement('div');
    var style = mirror.style;

    doc.body.appendChild(mirror);

    if (el.tagName !== 'INPUT') {
      style.wordWrap = 'break-word';
    }
    style.whiteSpace = 'pre-wrap';
    style.position = 'absolute';
    style.visibility = 'hidden';
    props.forEach(copy);

    if (ff) {
      style.width = parseInt(computed.width) - 2 + 'px';
      if (el.scrollHeight > parseInt(computed.height)) {
        style.overflowY = 'scroll';
      }
    } else {
      style.overflow = 'hidden';
    }
    return { mirror: mirror, computed: computed };

    function copy (prop) {
      style[prop] = computed[prop];
    }
  }

  function write (el, value) {
    if (textInput) {
      el.textContent = value;
    } else {
      el.innerHTML = value;
    }
  }

  function bind (remove) {
    var op = remove ? 'remove' : 'add';
    crossvent[op](el, 'keydown', throttledRefresh);
    crossvent[op](el, 'keyup', throttledRefresh);
    crossvent[op](el, 'input', throttledRefresh);
    crossvent[op](el, 'paste', throttledRefresh);
    crossvent[op](el, 'change', throttledRefresh);
  }

  function destroy () {
    bind(true);
  }
}

module.exports = tailormade;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./throttle":4,"crossvent":7,"seleccion":16,"sell":18}],4:[function(require,module,exports){
'use strict';

function throttle (fn, boundary) {
  var last = -Infinity;
  var timer;
  return function bounced () {
    if (timer) {
      return;
    }
    unbound();

    function unbound () {
      clearTimeout(timer);
      timer = null;
      var next = last + boundary;
      var now = Date.now();
      if (now > next) {
        last = now;
        fn();
      } else {
        timer = setTimeout(unbound, next - now);
      }
    }
  };
}

module.exports = throttle;

},{}],5:[function(require,module,exports){
'use strict';

var ticky = require('ticky');

module.exports = function debounce (fn, args, ctx) {
  if (!fn) { return; }
  ticky(function run () {
    fn.apply(ctx || null, args || []);
  });
};

},{"ticky":19}],6:[function(require,module,exports){
'use strict';

var atoa = require('atoa');
var debounce = require('./debounce');

module.exports = function emitter (thing, options) {
  var opts = options || {};
  var evt = {};
  if (thing === undefined) { thing = {}; }
  thing.on = function (type, fn) {
    if (!evt[type]) {
      evt[type] = [fn];
    } else {
      evt[type].push(fn);
    }
    return thing;
  };
  thing.once = function (type, fn) {
    fn._once = true; // thing.off(fn) still works!
    thing.on(type, fn);
    return thing;
  };
  thing.off = function (type, fn) {
    var c = arguments.length;
    if (c === 1) {
      delete evt[type];
    } else if (c === 0) {
      evt = {};
    } else {
      var et = evt[type];
      if (!et) { return thing; }
      et.splice(et.indexOf(fn), 1);
    }
    return thing;
  };
  thing.emit = function () {
    var args = atoa(arguments);
    return thing.emitterSnapshot(args.shift()).apply(this, args);
  };
  thing.emitterSnapshot = function (type) {
    var et = (evt[type] || []).slice(0);
    return function () {
      var args = atoa(arguments);
      var ctx = this || thing;
      if (type === 'error' && opts.throws !== false && !et.length) { throw args.length === 1 ? args[0] : args; }
      et.forEach(function emitter (listen) {
        if (opts.async) { debounce(listen, args, ctx); } else { listen.apply(ctx, args); }
        if (listen._once) { thing.off(type, listen); }
      });
      return thing;
    };
  };
  return thing;
};

},{"./debounce":5,"atoa":1}],7:[function(require,module,exports){
(function (global){
'use strict';

var customEvent = require('custom-event');
var eventmap = require('./eventmap');
var doc = document;
var addEvent = addEventEasy;
var removeEvent = removeEventEasy;
var hardCache = [];

if (!global.addEventListener) {
  addEvent = addEventHard;
  removeEvent = removeEventHard;
}

function addEventEasy (el, type, fn, capturing) {
  return el.addEventListener(type, fn, capturing);
}

function addEventHard (el, type, fn) {
  return el.attachEvent('on' + type, wrap(el, type, fn));
}

function removeEventEasy (el, type, fn, capturing) {
  return el.removeEventListener(type, fn, capturing);
}

function removeEventHard (el, type, fn) {
  return el.detachEvent('on' + type, unwrap(el, type, fn));
}

function fabricateEvent (el, type, model) {
  var e = eventmap.indexOf(type) === -1 ? makeCustomEvent() : makeClassicEvent();
  if (el.dispatchEvent) {
    el.dispatchEvent(e);
  } else {
    el.fireEvent('on' + type, e);
  }
  function makeClassicEvent () {
    var e;
    if (doc.createEvent) {
      e = doc.createEvent('Event');
      e.initEvent(type, true, true);
    } else if (doc.createEventObject) {
      e = doc.createEventObject();
    }
    return e;
  }
  function makeCustomEvent () {
    return new customEvent(type, { detail: model });
  }
}

function wrapperFactory (el, type, fn) {
  return function wrapper (originalEvent) {
    var e = originalEvent || global.event;
    e.target = e.target || e.srcElement;
    e.preventDefault = e.preventDefault || function preventDefault () { e.returnValue = false; };
    e.stopPropagation = e.stopPropagation || function stopPropagation () { e.cancelBubble = true; };
    e.which = e.which || e.keyCode;
    fn.call(el, e);
  };
}

function wrap (el, type, fn) {
  var wrapper = unwrap(el, type, fn) || wrapperFactory(el, type, fn);
  hardCache.push({
    wrapper: wrapper,
    element: el,
    type: type,
    fn: fn
  });
  return wrapper;
}

function unwrap (el, type, fn) {
  var i = find(el, type, fn);
  if (i) {
    var wrapper = hardCache[i].wrapper;
    hardCache.splice(i, 1); // free up a tad of memory
    return wrapper;
  }
}

function find (el, type, fn) {
  var i, item;
  for (i = 0; i < hardCache.length; i++) {
    item = hardCache[i];
    if (item.element === el && item.type === type && item.fn === fn) {
      return i;
    }
  }
}

module.exports = {
  add: addEvent,
  remove: removeEvent,
  fabricate: fabricateEvent
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./eventmap":8,"custom-event":9}],8:[function(require,module,exports){
(function (global){
'use strict';

var eventmap = [];
var eventname = '';
var ron = /^on/;

for (eventname in global) {
  if (ron.test(eventname)) {
    eventmap.push(eventname.slice(2));
  }
}

module.exports = eventmap;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
(function (global){

var NativeCustomEvent = global.CustomEvent;

function useNative () {
  try {
    var p = new NativeCustomEvent('cat', { detail: { foo: 'bar' } });
    return  'cat' === p.type && 'bar' === p.detail.foo;
  } catch (e) {
  }
  return false;
}

/**
 * Cross-browser `CustomEvent` constructor.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.CustomEvent
 *
 * @public
 */

module.exports = useNative() ? NativeCustomEvent :

// IE >= 9
'function' === typeof document.createEvent ? function CustomEvent (type, params) {
  var e = document.createEvent('CustomEvent');
  if (params) {
    e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
  } else {
    e.initCustomEvent(type, false, false, void 0);
  }
  return e;
} :

// IE <= 8
function CustomEvent (type, params) {
  var e = document.createEventObject();
  e.type = type;
  if (params) {
    e.bubbles = Boolean(params.bubbles);
    e.cancelable = Boolean(params.cancelable);
    e.detail = params.detail;
  } else {
    e.bubbles = false;
    e.cancelable = false;
    e.detail = void 0;
  }
  return e;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
(function (global){
'use strict';

var getSelection;
var doc = global.document;
var getSelectionRaw = require('./getSelectionRaw');
var getSelectionNullOp = require('./getSelectionNullOp');
var getSelectionSynthetic = require('./getSelectionSynthetic');
var isHost = require('./isHost');
if (isHost.method(global, 'getSelection')) {
  getSelection = getSelectionRaw;
} else if (typeof doc.selection === 'object' && doc.selection) {
  getSelection = getSelectionSynthetic;
} else {
  getSelection = getSelectionNullOp;
}

module.exports = getSelection;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./getSelectionNullOp":11,"./getSelectionRaw":12,"./getSelectionSynthetic":13,"./isHost":14}],11:[function(require,module,exports){
'use strict';

function noop () {}

function getSelectionNullOp () {
  return {
    removeAllRanges: noop,
    addRange: noop
  };
}

module.exports = getSelectionNullOp;

},{}],12:[function(require,module,exports){
(function (global){
'use strict';

function getSelectionRaw () {
  return global.getSelection();
}

module.exports = getSelectionRaw;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],13:[function(require,module,exports){
(function (global){
'use strict';

var rangeToTextRange = require('./rangeToTextRange');
var doc = global.document;
var body = doc.body;
var GetSelectionProto = GetSelection.prototype;

function GetSelection (selection) {
  var self = this;
  var range = selection.createRange();

  this._selection = selection;
  this._ranges = [];

  if (selection.type === 'Control') {
    updateControlSelection(self);
  } else if (isTextRange(range)) {
    updateFromTextRange(self, range);
  } else {
    updateEmptySelection(self);
  }
}

GetSelectionProto.removeAllRanges = function () {
  var textRange;
  try {
    this._selection.empty();
    if (this._selection.type !== 'None') {
      textRange = body.createTextRange();
      textRange.select();
      this._selection.empty();
    }
  } catch (e) {
  }
  updateEmptySelection(this);
};

GetSelectionProto.addRange = function (range) {
  if (this._selection.type === 'Control') {
    addRangeToControlSelection(this, range);
  } else {
    rangeToTextRange(range).select();
    this._ranges[0] = range;
    this.rangeCount = 1;
    this.isCollapsed = this._ranges[0].collapsed;
    updateAnchorAndFocusFromRange(this, range, false);
  }
};

GetSelectionProto.setRanges = function (ranges) {
  this.removeAllRanges();
  var rangeCount = ranges.length;
  if (rangeCount > 1) {
    createControlSelection(this, ranges);
  } else if (rangeCount) {
    this.addRange(ranges[0]);
  }
};

GetSelectionProto.getRangeAt = function (index) {
  if (index < 0 || index >= this.rangeCount) {
    throw new Error('getRangeAt(): index out of bounds');
  } else {
    return this._ranges[index].cloneRange();
  }
};

GetSelectionProto.removeRange = function (range) {
  if (this._selection.type !== 'Control') {
    removeRangeManually(this, range);
    return;
  }
  var controlRange = this._selection.createRange();
  var rangeElement = getSingleElementFromRange(range);
  var newControlRange = body.createControlRange();
  var el;
  var removed = false;
  for (var i = 0, len = controlRange.length; i < len; ++i) {
    el = controlRange.item(i);
    if (el !== rangeElement || removed) {
      newControlRange.add(controlRange.item(i));
    } else {
      removed = true;
    }
  }
  newControlRange.select();
  updateControlSelection(this);
};

GetSelectionProto.eachRange = function (fn, returnValue) {
  var i = 0;
  var len = this._ranges.length;
  for (i = 0; i < len; ++i) {
    if (fn(this.getRangeAt(i))) {
      return returnValue;
    }
  }
};

GetSelectionProto.getAllRanges = function () {
  var ranges = [];
  this.eachRange(function (range) {
    ranges.push(range);
  });
  return ranges;
};

GetSelectionProto.setSingleRange = function (range) {
  this.removeAllRanges();
  this.addRange(range);
};

function createControlSelection (sel, ranges) {
  var controlRange = body.createControlRange();
  for (var i = 0, el, len = ranges.length; i < len; ++i) {
    el = getSingleElementFromRange(ranges[i]);
    try {
      controlRange.add(el);
    } catch (e) {
      throw new Error('setRanges(): Element could not be added to control selection');
    }
  }
  controlRange.select();
  updateControlSelection(sel);
}

function removeRangeManually (sel, range) {
  var ranges = sel.getAllRanges();
  sel.removeAllRanges();
  for (var i = 0, len = ranges.length; i < len; ++i) {
    if (!isSameRange(range, ranges[i])) {
      sel.addRange(ranges[i]);
    }
  }
  if (!sel.rangeCount) {
    updateEmptySelection(sel);
  }
}

function updateAnchorAndFocusFromRange (sel, range) {
  var anchorPrefix = 'start';
  var focusPrefix = 'end';
  sel.anchorNode = range[anchorPrefix + 'Container'];
  sel.anchorOffset = range[anchorPrefix + 'Offset'];
  sel.focusNode = range[focusPrefix + 'Container'];
  sel.focusOffset = range[focusPrefix + 'Offset'];
}

function updateEmptySelection (sel) {
  sel.anchorNode = sel.focusNode = null;
  sel.anchorOffset = sel.focusOffset = 0;
  sel.rangeCount = 0;
  sel.isCollapsed = true;
  sel._ranges.length = 0;
}

function rangeContainsSingleElement (rangeNodes) {
  if (!rangeNodes.length || rangeNodes[0].nodeType !== 1) {
    return false;
  }
  for (var i = 1, len = rangeNodes.length; i < len; ++i) {
    if (!isAncestorOf(rangeNodes[0], rangeNodes[i])) {
      return false;
    }
  }
  return true;
}

function getSingleElementFromRange (range) {
  var nodes = range.getNodes();
  if (!rangeContainsSingleElement(nodes)) {
    throw new Error('getSingleElementFromRange(): range did not consist of a single element');
  }
  return nodes[0];
}

function isTextRange (range) {
  return range && range.text !== void 0;
}

function updateFromTextRange (sel, range) {
  sel._ranges = [range];
  updateAnchorAndFocusFromRange(sel, range, false);
  sel.rangeCount = 1;
  sel.isCollapsed = range.collapsed;
}

function updateControlSelection (sel) {
  sel._ranges.length = 0;
  if (sel._selection.type === 'None') {
    updateEmptySelection(sel);
  } else {
    var controlRange = sel._selection.createRange();
    if (isTextRange(controlRange)) {
      updateFromTextRange(sel, controlRange);
    } else {
      sel.rangeCount = controlRange.length;
      var range;
      for (var i = 0; i < sel.rangeCount; ++i) {
        range = doc.createRange();
        range.selectNode(controlRange.item(i));
        sel._ranges.push(range);
      }
      sel.isCollapsed = sel.rangeCount === 1 && sel._ranges[0].collapsed;
      updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
    }
  }
}

function addRangeToControlSelection (sel, range) {
  var controlRange = sel._selection.createRange();
  var rangeElement = getSingleElementFromRange(range);
  var newControlRange = body.createControlRange();
  for (var i = 0, len = controlRange.length; i < len; ++i) {
    newControlRange.add(controlRange.item(i));
  }
  try {
    newControlRange.add(rangeElement);
  } catch (e) {
    throw new Error('addRange(): Element could not be added to control selection');
  }
  newControlRange.select();
  updateControlSelection(sel);
}

function isSameRange (left, right) {
  return (
    left.startContainer === right.startContainer &&
    left.startOffset === right.startOffset &&
    left.endContainer === right.endContainer &&
    left.endOffset === right.endOffset
  );
}

function isAncestorOf (ancestor, descendant) {
  var node = descendant;
  while (node.parentNode) {
    if (node.parentNode === ancestor) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

function getSelection () {
  return new GetSelection(global.document.selection);
}

module.exports = getSelection;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./rangeToTextRange":15}],14:[function(require,module,exports){
'use strict';

function isHostMethod (host, prop) {
  var type = typeof host[prop];
  return type === 'function' || !!(type === 'object' && host[prop]) || type === 'unknown';
}

function isHostProperty (host, prop) {
  return typeof host[prop] !== 'undefined';
}

function many (fn) {
  return function areHosted (host, props) {
    var i = props.length;
    while (i--) {
      if (!fn(host, props[i])) {
        return false;
      }
    }
    return true;
  };
}

module.exports = {
  method: isHostMethod,
  methods: many(isHostMethod),
  property: isHostProperty,
  properties: many(isHostProperty)
};

},{}],15:[function(require,module,exports){
(function (global){
'use strict';

var doc = global.document;
var body = doc.body;

function rangeToTextRange (p) {
  if (p.collapsed) {
    return createBoundaryTextRange({ node: p.startContainer, offset: p.startOffset }, true);
  }
  var startRange = createBoundaryTextRange({ node: p.startContainer, offset: p.startOffset }, true);
  var endRange = createBoundaryTextRange({ node: p.endContainer, offset: p.endOffset }, false);
  var textRange = body.createTextRange();
  textRange.setEndPoint('StartToStart', startRange);
  textRange.setEndPoint('EndToEnd', endRange);
  return textRange;
}

function isCharacterDataNode (node) {
  var t = node.nodeType;
  return t === 3 || t === 4 || t === 8 ;
}

function createBoundaryTextRange (p, starting) {
  var bound;
  var parent;
  var offset = p.offset;
  var workingNode;
  var childNodes;
  var range = body.createTextRange();
  var data = isCharacterDataNode(p.node);

  if (data) {
    bound = p.node;
    parent = bound.parentNode;
  } else {
    childNodes = p.node.childNodes;
    bound = offset < childNodes.length ? childNodes[offset] : null;
    parent = p.node;
  }

  workingNode = doc.createElement('span');
  workingNode.innerHTML = '&#feff;';

  if (bound) {
    parent.insertBefore(workingNode, bound);
  } else {
    parent.appendChild(workingNode);
  }

  range.moveToElementText(workingNode);
  range.collapse(!starting);
  parent.removeChild(workingNode);

  if (data) {
    range[starting ? 'moveStart' : 'moveEnd']('character', offset);
  }
  return range;
}

module.exports = rangeToTextRange;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],16:[function(require,module,exports){
'use strict';

var getSelection = require('./getSelection');
var setSelection = require('./setSelection');

module.exports = {
  get: getSelection,
  set: setSelection
};

},{"./getSelection":10,"./setSelection":17}],17:[function(require,module,exports){
(function (global){
'use strict';

var getSelection = require('./getSelection');
var rangeToTextRange = require('./rangeToTextRange');
var doc = global.document;

function setSelection (p) {
  if (doc.createRange) {
    modernSelection();
  } else {
    oldSelection();
  }

  function modernSelection () {
    var sel = getSelection();
    var range = doc.createRange();
    if (!p.startContainer) {
      return;
    }
    if (p.endContainer) {
      range.setEnd(p.endContainer, p.endOffset);
    } else {
      range.setEnd(p.startContainer, p.startOffset);
    }
    range.setStart(p.startContainer, p.startOffset);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function oldSelection () {
    rangeToTextRange(p).select();
  }
}

module.exports = setSelection;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./getSelection":10,"./rangeToTextRange":15}],18:[function(require,module,exports){
'use strict';

var get = easyGet;
var set = easySet;

if (document.selection && document.selection.createRange) {
  get = hardGet;
  set = hardSet;
}

function easyGet (el) {
  return {
    start: el.selectionStart,
    end: el.selectionEnd
  };
}

function hardGet (el) {
  var active = document.activeElement;
  if (active !== el) {
    el.focus();
  }

  var range = document.selection.createRange();
  var bookmark = range.getBookmark();
  var original = el.value;
  var marker = getUniqueMarker(original);
  var parent = range.parentElement();
  if (parent === null || !inputs(parent)) {
    return result(0, 0);
  }
  range.text = marker + range.text + marker;

  var contents = el.value;

  el.value = original;
  range.moveToBookmark(bookmark);
  range.select();

  return result(contents.indexOf(marker), contents.lastIndexOf(marker) - marker.length);

  function result (start, end) {
    if (active !== el) { // don't disrupt pre-existing state
      if (active) {
        active.focus();
      } else {
        el.blur();
      }
    }
    return { start: start, end: end };
  }
}

function getUniqueMarker (contents) {
  var marker;
  do {
    marker = '@@marker.' + Math.random() * new Date();
  } while (contents.indexOf(marker) !== -1);
  return marker;
}

function inputs (el) {
  return ((el.tagName === 'INPUT' && el.type === 'text') || el.tagName === 'TEXTAREA');
}

function easySet (el, p) {
  el.selectionStart = parse(el, p.start);
  el.selectionEnd = parse(el, p.end);
}

function hardSet (el, p) {
  var range = el.createTextRange();

  if (p.start === 'end' && p.end === 'end') {
    range.collapse(false);
    range.select();
  } else {
    range.collapse(true);
    range.moveEnd('character', parse(el, p.end));
    range.moveStart('character', parse(el, p.start));
    range.select();
  }
}

function parse (el, value) {
  return value === 'end' ? el.value.length : value || 0;
}

function sell (el, p) {
  if (arguments.length === 2) {
    set(el, p);
  }
  return get(el);
}

module.exports = sell;

},{}],19:[function(require,module,exports){
var si = typeof setImmediate === 'function', tick;
if (si) {
  tick = function (fn) { setImmediate(fn); };
} else {
  tick = function (fn) { setTimeout(fn, 0); };
}

module.exports = tick;
},{}],20:[function(require,module,exports){
'use strict';

var isInput = require('./isInput');
var bindings = {};

function has (source, target) {
  var binding = bindings[source.id];
  return binding && binding[target.id];
}

function insert (source, target) {
  var binding = bindings[source.id];
  if (!binding) {
    binding = bindings[source.id] = {};
  }
  var invalidate = invalidator(target);
  binding[target.id] = invalidate;
  source.on('data', invalidate);
  source.on('destroyed', remove.bind(null, source, target));
}

function remove (source, target) {
  var binding = bindings[source.id];
  if (!binding) {
    return;
  }
  var invalidate = binding[target.id];
  source.off('data', invalidate);
  delete binding[target.id];
}

function invalidator (target) {
  return function invalidate () {
    target.refresh();
  };
}

function add (source, target) {
  if (isInput(target.associated) || has(source, target)) {
    return;
  }
  insert(source, target);
}

module.exports = {
  add: add,
  remove: remove
};

},{"./isInput":30}],21:[function(require,module,exports){
'use strict';

var crossvent = require('crossvent');
var emitter = require('contra/emitter');
var dom = require('./dom');
var text = require('./text');
var value = require('./value');
var parse = require('./parse');
var clone = require('./clone');
var defaults = require('./defaults');
var momentum = require('./momentum');
var classes = require('./classes');
var noop = require('./noop');
var no;

function calendar (calendarOptions) {
  var o;
  var ref;
  var refCal;
  var container;
  var rendered = false;

  // date variables
  var monthOffsetAttribute = 'data-rome-offset';
  var weekdays;
  var weekdayCount;
  var calendarMonths = [];
  var currentYear;
  var lastYear;
  var lastMonth;
  var lastDay;
  var lastDayElement;
  var datewrapper;
  var back;
  var next;
  var showYears;

  // time variables
  var secondsInDay = 60 * 60 * 24;
  var time;
  var timelist;

  var api = emitter({
    associated: calendarOptions.associated
  });

  init();
  setTimeout(ready, 0);

  return api;

  function napi () { return api; }

  function init (initOptions) {
    o = defaults(initOptions || calendarOptions, api);
    if (!container) { container = dom({ className: o.styles.container }); }
    weekdays = o.weekdayFormat;
    weekdayCount = weekdays.length;
    showYears = o.showYears;
    lastMonth = no;
    lastYear = no;
    lastDay = no;
    lastDayElement = no;
    o.appendTo.appendChild(container);

    removeChildren(container);
    rendered = false;
    ref = o.initialValue ? o.initialValue : momentum.moment();
    refCal = ref.clone();

    api.back = subtractMonth;
    api.container = container;
    api.destroyed = false;
    api.destroy = destroy.bind(api, false);
    api.emitValues = emitValues;
    api.getDate = getDate;
    api.getDateString = getDateString;
    api.getMoment = getMoment;
    api.hide = hide;
    api.next = addMonth;
    api.options = changeOptions;
    api.options.reset = resetOptions;
    api.refresh = refresh;
    api.restore = napi;
    api.setValue = setValue;
    api.show = show;
    api.nextYear = addYear;
    api.backYear = subtractYear;

    eventListening();
    ready();

    return api;
  }

  function ready () {
    api.emit('ready', clone(o));
  }

  function destroy (silent) {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }

    if (o) {
      eventListening(true);
    }

    var destroyed = api.emitterSnapshot('destroyed');
    api.back = noop;
    api.destroyed = true;
    api.destroy = napi;
    api.emitValues = napi;
    api.getDate = noop;
    api.getDateString = noop;
    api.getMoment = noop;
    api.hide = napi;
    api.next = noop;
    api.options = napi;
    api.options.reset = napi;
    api.refresh = napi;
    api.restore = init;
    api.setValue = napi;
    api.show = napi;
    api.off();

    if (silent !== true) {
      destroyed();
    }

    return api;
  }

  function eventListening (remove) {
    var op = remove ? 'remove' : 'add';
    //if (o.autoHideOnBlur) { crossvent[op](document.documentElement, 'focus', hideOnBlur, true); }
    if (o.autoHideOnClick) { crossvent[op](document, 'click', hideOnClick); }
  }

  function changeOptions (options) {
    if (arguments.length === 0) {
      return clone(o);
    }
    destroy();
    init(options);
    return api;
  }

  function resetOptions () {
    return changeOptions({ appendTo: o.appendTo });
  }

  function render () {
    if (rendered) {
      return;
    }
    rendered = true;
    renderDates();
    renderTime();
    api.emit('render');
  }

  function renderDates () {
    if (!o.date) {
      return;
    }

    var i;
    calendarMonths = [];

    datewrapper = dom({ className: o.styles.date, parent: container });

    renderYear(datewrapper);

    for (i = 0; i < o.monthsInCalendar; i++) {
      renderMonth(i);
    }

    crossvent.add(back, 'click', subtractMonth);
    crossvent.add(next, 'click', addMonth);
    crossvent.add(datewrapper, 'click', pickDay);

    function renderMonth (i) {
      var month = dom({ className: o.styles.month, parent: datewrapper });
      if (i === 0) {
        back = dom({ type: 'button', className: o.styles.back, attributes: { type: 'button' }, parent: month });
      }
      if (i === o.monthsInCalendar -1) {
        next = dom({ type: 'button', className: o.styles.next, attributes: { type: 'button' }, parent: month });
      }
      var label = dom({ className: o.styles.monthLabel, parent: month });
      var date = dom({ type: 'table', className: o.styles.dayTable, parent: month });
      var datehead = dom({ type: 'thead', className: o.styles.dayHead, parent: date });
      var dateheadrow = dom({ type: 'tr', className: o.styles.dayRow, parent: datehead });
      var datebody = dom({ type: 'tbody', className: o.styles.dayBody, parent: date });
      var j;

      for (j = 0; j < weekdayCount; j++) {
        dom({ type: 'th', className: o.styles.dayHeadElem, parent: dateheadrow, text: weekdays[weekday(j)] });
      }

      datebody.setAttribute(monthOffsetAttribute, i);
      calendarMonths.push({
        label: label,
        body: datebody
      });
    }
  }

  function renderYear (parent) {
    if(!o.showYears) {
      return;
    }
    var y = ref.year();
    var yearWrapper = dom({ className: o.styles.year, parent: parent});

    back = dom({ type: 'button', className: o.styles.back, attributes: { type: 'button' }, parent: yearWrapper });
    next = dom({ type: 'button', className: o.styles.next, attributes: { type: 'button' }, parent: yearWrapper });

    currentYear = dom({ type: 'input', className: 'year-input', attributes: { type: 'number' }, parent: yearWrapper });

    crossvent.add(back, 'click', subtractYear);
    crossvent.add(next, 'click', addYear);
    crossvent.add(currentYear, 'change', setYear);
  }

  function renderTime () {
    if (!o.time || !o.timeInterval) {
      return;
    }
    var timewrapper = dom({ className: o.styles.time, parent: container });
    time = dom({ className: o.styles.selectedTime, parent: timewrapper, text: ref.format(o.timeFormat) });
    crossvent.add(time, 'click', toggleTimeList);
    timelist = dom({ className: o.styles.timeList, parent: timewrapper });
    crossvent.add(timelist, 'click', pickTime);
    var next = momentum.moment('00:00:00', 'HH:mm:ss');
    var latest = next.clone().add(1, 'days');
    while (next.isBefore(latest)) {
      dom({ className: o.styles.timeOption, parent: timelist, text: next.format(o.timeFormat) });
      next.add(o.timeInterval, 'seconds');
    }
  }

  function weekday (index, backwards) {
    var factor = backwards ? -1 : 1;
    var offset = index + o.weekStart * factor;
    if (offset >= weekdayCount || offset < 0) {
      offset += weekdayCount * -factor;
    }
    return offset;
  }

  function displayValidTimesOnly () {
    if (!o.time || !rendered) {
      return;
    }
    var times = timelist.children;
    var length = times.length;
    var date;
    var time;
    var item;
    var i;
    for (i = 0; i < length; i++) {
      item = times[i];
      time = momentum.moment(text(item), o.timeFormat);
      date = setTime(ref.clone(), time);
      item.style.display = isInRange(date, false, o.timeValidator) ? 'block' : 'none';
    }
  }

  function toggleTimeList (show) {
    var display = typeof show === 'boolean' ? show : timelist.style.display === 'none';
    if (display) {
      showTimeList();
    } else {
      hideTimeList();
    }
  }

  function showTimeList () { if (timelist) { timelist.style.display = 'block'; } }
  function hideTimeList () { if (timelist) { timelist.style.display = 'none'; } }
  function showCalendar () { container.style.display = 'inline-block'; api.emit('show'); }
  function hideCalendar () {
    if (container.style.display !== 'none') {
      container.style.display = 'none';
      api.emit('hide');
    }
  }

  function show () {
    render();
    refresh();
    toggleTimeList(!o.date);
    showCalendar();
    return api;
  }

  function hide () {
    hideTimeList();
    setTimeout(hideCalendar, 0);
    return api;
  }

  function hideConditionally () {
    hideTimeList();

    var pos = classes.contains(container, o.styles.positioned);
    if (pos) {
      setTimeout(hideCalendar, 0);
    }
    return api;
  }

  function calendarEventTarget (e) {
    var target = e.target;
    if (target === api.associated) {
      return true;
    }
    while (target) {
      if (target === container) {
        return true;
      }
      target = target.parentNode;
    }
  }

  function hideOnBlur (e) {
    if (calendarEventTarget(e)) {
      return;
    }
    hideConditionally();
  }

  function hideOnClick (e) {
    if (calendarEventTarget(e)) {
      return;
    }
    hideConditionally();
  }

  function subtractMonth () { changeMonth('subtract'); }
  function addMonth () { changeMonth('add'); }
  function changeMonth (op) {
    var bound;
    var direction = op === 'add' ? -1 : 1;
    var offset = o.monthsInCalendar + direction * getMonthOffset(lastDayElement);
    refCal[op](offset, 'months');
    bound = inRange(refCal.clone());
    ref = bound || ref;
    if (bound) { refCal = bound.clone(); }
    update();
    api.emit(op === 'add' ? 'next' : 'back', ref.month());
  }

  function subtractYear () { changeYear('subtract'); }
  function addYear () { changeYear('add'); }
  function changeYear (op) {
    var bound;
    refCal[op](1, 'years');
    bound = inRange(refCal.clone());
    ref = bound || ref;
    if (bound) { refCal = bound.clone(); }
    update();
    api.emit(op === 'add' ? 'nextYear' : 'backYear', ref.year());
  }

  /*
    hack to allow direct manipulation of the year
    will not check for valid bounds
  */
  function setYear( evt ) {
    var year = evt.target.value;
    var yearAsNumber = evt.target.valueAsNumber;
    if( year.length === 4 && yearAsNumber ) {
      ref.year( yearAsNumber );
      refCal.year( yearAsNumber );
      update();
    } else {
      evt.target.value = refCal.year();
    }
  }

  function update (silent) {
    updateCalendar();
    updateTime();
    if (silent !== true) { emitValues(); }
    displayValidTimesOnly();
  }

  function updateCalendar () {
    if (!o.date || !rendered) {
      return;
    }
    var y = refCal.year();
    var m = refCal.month();
    var d = refCal.date();
    if (d === lastDay && m === lastMonth && y === lastYear) {
      return;
    }
    var canStay = isDisplayed();
    lastDay = refCal.date();
    lastMonth = refCal.month();
    lastYear = refCal.year();
    if (canStay) { updateCalendarSelection(); return; }
    if (o.showYears) { updateYear(); }
    calendarMonths.forEach(updateMonth);
    renderAllDays();

    function updateMonth (month, i) {
      var offsetCal = refCal.clone().add(i, 'months');
      var monthFormat = o.showYears ? o.monthFormat.replace(/(y|Y| )/g, '') : o.monthFormat;
      text(month.label, offsetCal.format(monthFormat));
      removeChildren(month.body);
    }

    function updateYear () {
      value(currentYear, lastYear);
    }
  }

  function updateCalendarSelection () {
    var day = refCal.date() - 1;
    selectDayElement(false);
    calendarMonths.forEach(function (cal) {
      var days;
      if (sameCalendarMonth(cal.date, refCal)) {
        days = cast(cal.body.children).map(aggregate);
        days = Array.prototype.concat.apply([], days).filter(inside);
        selectDayElement(days[day]);
      }
    });

    function cast (like) {
      var dest = [];
      var i;
      for (i = 0; i < like.length; i++) {
        dest.push(like[i]);
      }
      return dest;
    }

    function aggregate (child) {
      return cast(child.children);
    }

    function inside (child) {
      return !classes.contains(child, o.styles.dayPrevMonth) &&
             !classes.contains(child, o.styles.dayNextMonth);
    }
  }

  function isDisplayed () {
    return calendarMonths.some(matches);

    function matches (cal) {
      if (!lastYear) { return false; }
      return sameCalendarMonth(cal.date, refCal);
    }
  }

  function sameCalendarMonth (left, right) {
    return left && right && left.year() === right.year() && left.month() === right.month();
  }

  function updateTime () {
    if (!o.time || !rendered) {
      return;
    }
    text(time, ref.format(o.timeFormat));
  }

  function emitValues () {
    api.emit('data', getDateString());
    api.emit('year', ref.year());
    api.emit('month', ref.month());
    api.emit('day', ref.day());
    api.emit('time', ref.format(o.timeFormat));
    return api;
  }

  function refresh () {
    lastYear = false;
    lastMonth = false;
    lastDay = false;
    update(true);
    return api;
  }

  function setValue (value) {
    var date = parse(value, o.inputFormat);
    if (date === null) {
      return;
    }
    ref = inRange(date) || ref;
    refCal = ref.clone();
    update(true);

    return api;
  }

  function removeChildren (elem, self) {
    while (elem && elem.firstChild) {
      elem.removeChild(elem.firstChild);
    }
    if (self === true) {
      elem.parentNode.removeChild(elem);
    }
  }

  function renderAllDays () {
    var i;
    for (i = 0; i < o.monthsInCalendar; i++) {
      renderDays(i);
    }
  }

  function renderDays (offset) {
    var month = calendarMonths[offset];
    var offsetCal = refCal.clone().add(offset, 'months');
    var total = offsetCal.daysInMonth();
    var current = offsetCal.month() !== ref.month() ? -1 : ref.date(); // -1 : 1..31
    var first = offsetCal.clone().date(1);
    var firstDay = weekday(first.day(), true); // 0..6
    var tr = dom({ type: 'tr', className: o.styles.dayRow, parent: month.body });
    var prevMonth = hiddenWhen(offset !== 0, [o.styles.dayBodyElem, o.styles.dayPrevMonth]);
    var nextMonth = hiddenWhen(offset !== o.monthsInCalendar - 1, [o.styles.dayBodyElem, o.styles.dayNextMonth]);
    var disabled = o.styles.dayDisabled;
    var lastDay;

    part({
      base: first.clone().subtract(firstDay, 'days'),
      length: firstDay,
      cell: prevMonth
    });

    part({
      base: first.clone(),
      length: total,
      cell: [o.styles.dayBodyElem],
      selectable: true
    });

    lastDay = first.clone().add(total, 'days');

    part({
      base: lastDay,
      length: weekdayCount - tr.children.length,
      cell: nextMonth
    });

    back.disabled = !isInRangeLeft(first, true);
    next.disabled = !isInRangeRight(lastDay, true);
    month.date = offsetCal.clone();

    function part (data) {
      var i, day, node;
      for (i = 0; i < data.length; i++) {
        if (tr.children.length === weekdayCount) {
          tr = dom({ type: 'tr', className: o.styles.dayRow, parent: month.body });
        }
        day = data.base.clone().add(i, 'days');
        node = dom({
          type: 'td',
          parent: tr,
          text: day.format(o.dayFormat),
          className: validationTest(day, data.cell.join(' ').split(' ')).join(' ')
        });
        if (data.selectable && day.date() === current) {
          selectDayElement(node);
        }
      }
    }

    function validationTest (day, cell) {
      if (!isInRange(day, true, o.dateValidator)) { cell.push(disabled); }
      return cell;
    }

    function hiddenWhen (value, cell) {
      if (value) { cell.push(o.styles.dayConcealed); }
      return cell;
    }
  }

  function isInRange (date, allday, validator) {
    if (!isInRangeLeft(date, allday)) {
      return false;
    }
    if (!isInRangeRight(date, allday)) {
      return false;
    }
    var valid = (validator || Function.prototype).call(api, date.toDate());
    return valid !== false;
  }

  function isInRangeLeft (date, allday) {
    var min = !o.min ? false : (allday ? o.min.clone().startOf('day') : o.min);
    return !min || !date.isBefore(min);
  }

  function isInRangeRight (date, allday) {
    var max = !o.max ? false : (allday ? o.max.clone().endOf('day') : o.max);
    return !max || !date.isAfter(max);
  }

  function inRange (date) {
    if (o.min && date.isBefore(o.min)) {
      return inRange(o.min.clone());
    } else if (o.max && date.isAfter(o.max)) {
      return inRange(o.max.clone());
    }
    var value = date.clone().subtract(1, 'days');
    if (validateTowards(value, date, 'add')) {
      return inTimeRange(value);
    }
    value = date.clone();
    if (validateTowards(value, date, 'subtract')) {
      return inTimeRange(value);
    }
  }

  function inTimeRange (value) {
    var copy = value.clone().subtract(o.timeInterval, 'seconds');
    var times = Math.ceil(secondsInDay / o.timeInterval);
    var i;
    for (i = 0; i < times; i++) {
      copy.add(o.timeInterval, 'seconds');
      if (copy.date() > value.date()) {
        copy.subtract(1, 'days');
      }
      if (o.timeValidator.call(api, copy.toDate()) !== false) {
        return copy;
      }
    }
  }

  function validateTowards (value, date, op) {
    var valid = false;
    while (valid === false) {
      value[op](1, 'days');
      if (value.month() !== date.month()) {
        break;
      }
      valid = o.dateValidator.call(api, value.toDate());
    }
    return valid !== false;
  }

  function pickDay (e) {
    var target = e.target;
    if (classes.contains(target, o.styles.dayDisabled) || !classes.contains(target, o.styles.dayBodyElem)) {
      return;
    }
    var day = parseInt(text(target), 10);
    var prev = classes.contains(target, o.styles.dayPrevMonth);
    var next = classes.contains(target, o.styles.dayNextMonth);
    var offset = getMonthOffset(target) - getMonthOffset(lastDayElement);
    ref.add(offset, 'months');
    if (prev || next) {
      ref.add(prev ? -1 : 1, 'months');
    }
    selectDayElement(target);
    ref.date(day); // must run after setting the month
    setTime(ref, inRange(ref) || ref);
    refCal = ref.clone();
    if (o.autoClose === true) { hideConditionally(); }
    update();
  }

  function selectDayElement (node) {
    if (lastDayElement) {
      classes.remove(lastDayElement, o.styles.selectedDay);
    }
    if (node) {
      classes.add(node, o.styles.selectedDay);
    }
    lastDayElement = node;
  }

  function getMonthOffset (elem) {
    var offset;
    while (elem && elem.getAttribute) {
      offset = elem.getAttribute(monthOffsetAttribute);
      if (typeof offset === 'string') {
        return parseInt(offset, 10);
      }
      elem = elem.parentNode;
    }
    return 0;
  }

  function setTime (to, from) {
    to.hour(from.hour()).minute(from.minute()).second(from.second());
    return to;
  }

  function pickTime (e) {
    var target = e.target;
    if (!classes.contains(target, o.styles.timeOption)) {
      return;
    }
    var value = momentum.moment(text(target), o.timeFormat);
    setTime(ref, value);
    refCal = ref.clone();
    emitValues();
    updateTime();
    if ((!o.date && o.autoClose === true) || o.autoClose === 'time') {
      hideConditionally();
    } else {
      hideTimeList();
    }
  }

  function getDate () {
    return ref.toDate();
  }

  function getDateString (format) {
    return ref.format(format || o.inputFormat);
  }

  function getMoment () {
    return ref.clone();
  }
}

module.exports = calendar;

},{"./classes":22,"./clone":23,"./defaults":25,"./dom":26,"./momentum":31,"./noop":32,"./parse":33,"./text":45,"./value":49,"contra/emitter":6,"crossvent":7}],22:[function(require,module,exports){
'use strict';

var trim = /^\s+|\s+$/g;
var whitespace = /\s+/;

function classes (node) {
  return node.className.replace(trim, '').split(whitespace);
}

function set (node, value) {
  node.className = value.join(' ');
}

function add (node, value) {
  var values = remove(node, value);
  values.push(value);
  set(node, values);
}

function remove (node, value) {
  var values = classes(node);
  var i = values.indexOf(value);
  if (i !== -1) {
    values.splice(i, 1);
    set(node, values);
  }
  return values;
}

function contains (node, value) {
  return classes(node).indexOf(value) !== -1;
}

module.exports = {
  add: add,
  remove: remove,
  contains: contains
};

},{}],23:[function(require,module,exports){
'use strict';

var momentum = require('./momentum');

// naïve implementation, specifically meant to clone `options` objects
function clone (thing) {
  var copy = {};
  var value;

  for (var key in thing) {
    value = thing[key];

    if (!value) {
      copy[key] = value;
    } else if (momentum.isMoment(value)) {
      copy[key] = value.clone();
    } else if (value._isStylesConfiguration) {
      copy[key] = clone(value);
    } else {
      copy[key] = value;
    }
  }

  return copy;
}

module.exports = clone;

},{"./momentum":31}],24:[function(require,module,exports){
'use strict';

var index = require('./index');
var input = require('./input');
var inline = require('./inline');
var isInput = require('./isInput');

function core (elem, options) {
  var cal;
  var existing = index.find(elem);
  if (existing) {
    return existing;
  }

  if (isInput(elem)) {
    cal = input(elem, options);
  } else {
    cal = inline(elem, options);
  }
  index.assign(elem, cal);

  return cal;
}

module.exports = core;

},{"./index":27,"./inline":28,"./input":29,"./isInput":30}],25:[function(require,module,exports){
'use strict';

var parse = require('./parse');
var isInput = require('./isInput');
var momentum = require('./momentum');

function defaults (options, cal) {
  var temp;
  var no;
  var o = options || {};
  if (o.autoHideOnClick === no) { o.autoHideOnClick = true; }
  if (o.autoHideOnBlur === no) { o.autoHideOnBlur = true; }
  if (o.autoClose === no) { o.autoClose = true; }
  if (o.appendTo === no) { o.appendTo = document.body; }
  if (o.appendTo === 'parent') {
    if (isInput(cal.associated)) {
      o.appendTo = cal.associated.parentNode;
    } else {
      throw new Error('Inline calendars must be appended to a parent node explicitly.');
    }
  }
  if (o.invalidate === no) { o.invalidate = true; }
  if (o.required === no) { o.required = false; }
  if (o.date === no) { o.date = true; }
  if (o.time === no) { o.time = true; }
  if (o.date === false && o.time === false) { throw new Error('At least one of `date` or `time` must be `true`.'); }
  if (o.inputFormat === no) {
    if (o.date && o.time) {
      o.inputFormat = 'YYYY-MM-DD HH:mm';
    } else if (o.date) {
      o.inputFormat = 'YYYY-MM-DD';
    } else {
      o.inputFormat = 'HH:mm';
    }
  }
  if (o.initialValue === no) {
    o.initialValue = null;
  } else {
    o.initialValue = parse(o.initialValue, o.inputFormat);
  }
  if (o.min === no) { o.min = null; } else { o.min = parse(o.min, o.inputFormat); }
  if (o.max === no) { o.max = null; } else { o.max = parse(o.max, o.inputFormat); }
  if (o.timeInterval === no) { o.timeInterval = 60 * 30; } // 30 minutes by default
  if (o.min && o.max) {
    if (o.max.isBefore(o.min)) {
      temp = o.max;
      o.max = o.min;
      o.min = temp;
    }
    if (o.date === true) {
      if (o.max.clone().subtract(1, 'days').isBefore(o.min)) {
        throw new Error('`max` must be at least one day after `min`');
      }
    } else if (o.timeInterval * 1000 - o.min % (o.timeInterval * 1000) > o.max - o.min) {
      throw new Error('`min` to `max` range must allow for at least one time option that matches `timeInterval`');
    }
  }
  if (o.dateValidator === no) { o.dateValidator = Function.prototype; }
  if (o.timeValidator === no) { o.timeValidator = Function.prototype; }
  if (o.timeFormat === no) { o.timeFormat = 'HH:mm'; }
  if (o.weekStart === no) { o.weekStart = momentum.moment().weekday(0).day(); }
  if (o.weekdayFormat === no) { o.weekdayFormat = 'min'; }
  if (o.weekdayFormat === 'long') {
    o.weekdayFormat = momentum.moment.weekdays();
  } else if (o.weekdayFormat === 'short') {
    o.weekdayFormat = momentum.moment.weekdaysShort();
  } else if (o.weekdayFormat === 'min') {
    o.weekdayFormat = momentum.moment.weekdaysMin();
  } else if (!Array.isArray(o.weekdayFormat) || o.weekdayFormat.length < 7) {
    throw new Error('`weekdays` must be `min`, `short`, or `long`');
  }
  if (o.monthsInCalendar === no) { o.monthsInCalendar = 1; }
  if (o.monthFormat === no) { o.monthFormat = 'MMMM YYYY'; }
  if (o.dayFormat === no) { o.dayFormat = 'DD'; }
  if (o.showYears === no) { o.showYears = false; }
  if (o.styles === no) { o.styles = {}; }

  o.styles._isStylesConfiguration = true;

  var styl = o.styles;
  if (styl.back === no) { styl.back = 'rd-back'; }
  if (styl.container === no) { styl.container = 'rd-container'; }
  if (styl.positioned === no) { styl.positioned = 'rd-container-attachment'; }
  if (styl.date === no) { styl.date = 'rd-date'; }
  if (styl.dayBody === no) { styl.dayBody = 'rd-days-body'; }
  if (styl.dayBodyElem === no) { styl.dayBodyElem = 'rd-day-body'; }
  if (styl.dayPrevMonth === no) { styl.dayPrevMonth = 'rd-day-prev-month'; }
  if (styl.dayNextMonth === no) { styl.dayNextMonth = 'rd-day-next-month'; }
  if (styl.dayDisabled === no) { styl.dayDisabled = 'rd-day-disabled'; }
  if (styl.dayConcealed === no) { styl.dayConcealed = 'rd-day-concealed'; }
  if (styl.dayHead === no) { styl.dayHead = 'rd-days-head'; }
  if (styl.dayHeadElem === no) { styl.dayHeadElem = 'rd-day-head'; }
  if (styl.dayRow === no) { styl.dayRow = 'rd-days-row'; }
  if (styl.dayTable === no) { styl.dayTable = 'rd-days'; }
  if (styl.year === no) { styl.year = 'rd-year'; }
  if (styl.yearLabel === no) { styl.yearLabel = 'rd-year-label'; }
  if (styl.month === no) { styl.month = 'rd-month'; }
  if (styl.monthLabel === no) { styl.monthLabel = 'rd-month-label'; }
  if (styl.next === no) { styl.next = 'rd-next'; }
  if (styl.selectedDay === no) { styl.selectedDay = 'rd-day-selected'; }
  if (styl.selectedTime === no) { styl.selectedTime = 'rd-time-selected'; }
  if (styl.time === no) { styl.time = 'rd-time'; }
  if (styl.timeList === no) { styl.timeList = 'rd-time-list'; }
  if (styl.timeOption === no) { styl.timeOption = 'rd-time-option'; }

  return o;
}

module.exports = defaults;

},{"./isInput":30,"./momentum":31,"./parse":33}],26:[function(require,module,exports){
'use strict';

function dom (options) {
  var o = options || {};
  if (!o.type) { o.type = 'div'; }
  var elem = document.createElement(o.type);
  if (o.className) { elem.className = o.className; }
  if (o.text) { elem.innerText = elem.textContent = o.text; }
  if (o.attributes) {
    Object.keys(o.attributes).forEach(function(key) {
      elem.setAttribute(key, o.attributes[key]);
    });
  }
  if (o.parent) { o.parent.appendChild(elem); }
  return elem;
}

module.exports = dom;

},{}],27:[function(require,module,exports){
'use strict';
var no;
var ikey = 'data-rome-id';
var index = [];

function find (thing) { // can be a DOM element or a number
  if (typeof thing !== 'number' && thing && thing.getAttribute) {
    return find(thing.getAttribute(ikey));
  }
  var existing = index[thing];
  if (existing !== no) {
    return existing;
  }
  return null;
}

function assign (elem, instance) {
  elem.setAttribute(ikey, instance.id = index.push(instance) - 1);
}

module.exports = {
  find: find,
  assign: assign
};

},{}],28:[function(require,module,exports){
'use strict';

var calendar = require('./calendar');

function inline (elem, calendarOptions) {
  var o = calendarOptions || {};

  o.appendTo = elem;
  o.associated = elem;

  var cal = calendar(o);
  cal.show();
  return cal;
}

module.exports = inline;

},{"./calendar":21}],29:[function(require,module,exports){
'use strict';

var crossvent = require('crossvent');
var bullseye = require('bullseye');
var throttle = require('./throttle');
var clone = require('./clone');
var defaults = require('./defaults');
var calendar = require('./calendar');
var momentum = require('./momentum');
var classes = require('./classes');

var swipeDetected = false;
var startPos = null;

function inputCalendar (input, calendarOptions) {
  var o = calendarOptions || {};

  o.associated = input;

  var api = calendar(o);
  var throttledTakeInput = throttle(takeInput, 30);
  var ignoreInvalidation;
  var ignoreShow;
  var eye;

  init(o);

  return api;

  function init (initOptions) {
    o = defaults(initOptions || o, api);

    classes.add(api.container, o.styles.positioned);
    crossvent.add(api.container, 'mousedown', containerMouseDown);

    api.getDate = unrequire(api.getDate);
    api.getDateString = unrequire(api.getDateString);
    api.getMoment = unrequire(api.getMoment);

    if (o.initialValue) {
      input.value = o.initialValue.format(o.inputFormat);
    }

    eye = bullseye(api.container, input);
    api.on('data', updateInput);
    api.on('show', eye.refresh);

    eventListening();
    throttledTakeInput();
  }

  function destroy () {
    eventListening(true);
    eye.destroy();
    eye = null;
  }

  function eventListening (remove) {
    var op = remove ? 'remove' : 'add';
    crossvent[op](input, 'click', show);
    crossvent[op](input, 'touchstart', swipeStart);
    crossvent[op](input, 'touchmove', swipeMove);
    crossvent[op](input, 'touchend', show);
    crossvent[op](input, 'focusin', show);
    crossvent[op](input, 'change', throttledTakeInput);
    crossvent[op](input, 'keypress', throttledTakeInput);
    crossvent[op](input, 'keydown', throttledTakeInput);
    crossvent[op](input, 'input', throttledTakeInput);
    if (o.invalidate) { crossvent[op](input, 'blur', invalidateInput); }

    if (remove) {
      api.once('ready', init);
      api.off('destroyed', destroy);
    } else {
      api.off('ready', init);
      api.once('destroyed', destroy);
    }
  }

  function containerClick () {
    ignoreShow = true;
    input.focus();
    ignoreShow = false;
  }

  function containerMouseDown () {
    ignoreInvalidation = true;
    setTimeout(unignore, 0);

    function unignore () {
      ignoreInvalidation = false;
    }
  }

  function invalidateInput () {
    if (!ignoreInvalidation && !isEmpty()) {
      api.emitValues();
    }
  }

  function swipeStart(event) {
    swipeDetected = false;
    startPos = {
      pageX: event.touches[0].pageX,
      pageY: event.touches[0].pageY
    };
  }

  function swipeMove (event) {
    if (Math.abs(startPos.pageX - event.touches[0].pageX) > 10 || Math.abs(startPos.pageY - event.touches[0].pageY) > 10) {
      swipeDetected = true;
    }
  }

  function show () {
    if (ignoreShow || swipeDetected) {
      return;
    }
    api.show();
  }

  function takeInput () {
    var value = input.value.trim();
    if (isEmpty()) {
      return;
    }
    var date = momentum.moment(value, o.inputFormat, o.strictParse);
    api.setValue(date);
  }

  function updateInput (data) {
    input.value = data;
  }

  function isEmpty () {
    return o.required === false && input.value.trim() === '';
  }

  function unrequire (fn) {
    return function maybe () {
      return isEmpty() ? null : fn.apply(this, arguments);
    };
  }
}

module.exports = inputCalendar;

},{"./calendar":21,"./classes":22,"./clone":23,"./defaults":25,"./momentum":31,"./throttle":46,"bullseye":2,"crossvent":7}],30:[function(require,module,exports){
'use strict';

function isInput (elem) {
  return elem && elem.nodeName && elem.nodeName.toLowerCase() === 'input';
}

module.exports = isInput;

},{}],31:[function(require,module,exports){
'use strict';

function isMoment (value) {
  return value && Object.prototype.hasOwnProperty.call(value, '_isAMomentObject');
}

var api = {
  moment: null,
  isMoment: isMoment
};

module.exports = api;

},{}],32:[function(require,module,exports){
'use strict';

function noop () {}

module.exports = noop;

},{}],33:[function(require,module,exports){
'use strict';

var momentum = require('./momentum');

function raw (date, format) {
  if (typeof date === 'string') {
    return momentum.moment(date, format);
  }
  if (Object.prototype.toString.call(date) === '[object Date]') {
    return momentum.moment(date);
  }
  if (momentum.isMoment(date)) {
    return date.clone();
  }
}

function parse (date, format) {
  var m = raw(date, typeof format === 'string' ? format : null);
  return m && m.isValid() ? m : null;
}

module.exports = parse;

},{"./momentum":31}],34:[function(require,module,exports){
'use strict';

if (!Array.prototype.filter) {
  Array.prototype.filter = function (fn, ctx) {
    var f = [];
    this.forEach(function (v, i, t) {
      if (fn.call(ctx, v, i, t)) { f.push(v); }
    }, ctx);
    return f;
  };
}

},{}],35:[function(require,module,exports){
'use strict';

if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (fn, ctx) {
    if (this === void 0 || this === null || typeof fn !== 'function') {
      throw new TypeError();
    }
    var t = this;
    var len = t.length;
    for (var i = 0; i < len; i++) {
      if (i in t) { fn.call(ctx, t[i], i, t); }
    }
  };
}

},{}],36:[function(require,module,exports){
'use strict';

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (what, start) {
    if (this === undefined || this === null) {
      throw new TypeError();
    }
    var length = this.length;
    start = +start || 0;
    if (Math.abs(start) === Infinity) {
      start = 0;
    } else if (start < 0) {
      start += length;
      if (start < 0) { start = 0; }
    }
    for (; start < length; start++) {
      if (this[start] === what) {
        return start;
      }
    }
    return -1;
  };
}

},{}],37:[function(require,module,exports){
'use strict';

Array.isArray || (Array.isArray = function (a) {
  return '' + a !== a && Object.prototype.toString.call(a) === '[object Array]';
});

},{}],38:[function(require,module,exports){
'use strict';

if (!Array.prototype.map) {
  Array.prototype.map = function (fn, ctx) {
    var context, result, i;

    if (this == null) {
      throw new TypeError('this is null or not defined');
    }

    var source = Object(this);
    var len = source.length >>> 0;

    if (typeof fn !== 'function') {
      throw new TypeError(fn + ' is not a function');
    }

    if (arguments.length > 1) {
      context = ctx;
    }

    result = new Array(len);
    i = 0;

    while (i < len) {
      if (i in source) {
        result[i] = fn.call(context, source[i], i, source);
      }
      i++;
    }
    return result;
  };
}

},{}],39:[function(require,module,exports){
'use strict';

if (!Array.prototype.some) {
  Array.prototype.some = function (fn, ctx) {
    var context, i;

    if (this == null) {
      throw new TypeError('this is null or not defined');
    }

    var source = Object(this);
    var len = source.length >>> 0;

    if (typeof fn !== 'function') {
      throw new TypeError(fn + ' is not a function');
    }

    if (arguments.length > 1) {
      context = ctx;
    }

    i = 0;

    while (i < len) {
      if (i in source) {
        var test = fn.call(context, source[i], i, source);
        if (test) {
          return true;
        }
      }
      i++;
    }
    return false;
  };
}

},{}],40:[function(require,module,exports){
'use strict';

if (!Function.prototype.bind) {
  Function.prototype.bind = function (context) {
    if (typeof this !== 'function') {
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }
    var curried = Array.prototype.slice.call(arguments, 1);
    var original = this;
    var NoOp = function () {};
    var bound = function () {
      var ctx = this instanceof NoOp && context ? this : context;
      var args = curried.concat(Array.prototype.slice.call(arguments));
      return original.apply(ctx, args);
    };
    NoOp.prototype = this.prototype;
    bound.prototype = new NoOp();
    return bound;
  };
}

},{}],41:[function(require,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString');
var dontEnums = [
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'constructor'
];
var dontEnumsLength = dontEnums.length;

if (!Object.keys) {
  Object.keys = function(obj) {
    if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
      throw new TypeError('Object.keys called on non-object');
    }

    var result = [], prop, i;

    for (prop in obj) {
      if (hasOwn.call(obj, prop)) {
        result.push(prop);
      }
    }

    if (hasDontEnumBug) {
      for (i = 0; i < dontEnumsLength; i++) {
        if (hasOwn.call(obj, dontEnums[i])) {
          result.push(dontEnums[i]);
        }
      }
    }
    return result;
  };
}

},{}],42:[function(require,module,exports){
'use strict';

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

},{}],43:[function(require,module,exports){
'use strict';

// these are only required for IE < 9
// maybe move to IE-specific distro?
require('./polyfills/function.bind');
require('./polyfills/array.foreach');
require('./polyfills/array.map');
require('./polyfills/array.filter');
require('./polyfills/array.isarray');
require('./polyfills/array.indexof');
require('./polyfills/array.some');
require('./polyfills/string.trim');
require('./polyfills/object.keys');

var core = require('./core');
var index = require('./index');
var use = require('./use');

core.use = use.bind(core);
core.find = index.find;
core.val = require('./validators');

module.exports = core;

},{"./core":24,"./index":27,"./polyfills/array.filter":34,"./polyfills/array.foreach":35,"./polyfills/array.indexof":36,"./polyfills/array.isarray":37,"./polyfills/array.map":38,"./polyfills/array.some":39,"./polyfills/function.bind":40,"./polyfills/object.keys":41,"./polyfills/string.trim":42,"./use":47,"./validators":48}],44:[function(require,module,exports){
(function (global){
var rome = require('./rome');
var momentum = require('./momentum');

rome.use(global.moment);

if (momentum.moment === void 0) {
  throw new Error('rome depends on moment.js, you can get it at http://momentjs.com, or you could use the bundled distribution file instead.');
}

module.exports = rome;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./momentum":31,"./rome":43}],45:[function(require,module,exports){
'use strict';

function text (elem, value) {
  if (arguments.length === 2) {
    elem.innerText = elem.textContent = value;
  }
  return elem.innerText || elem.textContent;
}

module.exports = text;

},{}],46:[function(require,module,exports){
'use strict';

module.exports = function throttle (fn, boundary) {
  var last = -Infinity;
  var timer;
  return function bounced () {
    if (timer) {
      return;
    }
    unbound();

    function unbound () {
      clearTimeout(timer);
      timer = null;
      var next = last + boundary;
      var now = +new Date();
      if (now > next) {
        last = now;
        fn.apply(this, arguments);
      } else {
        timer = setTimeout(unbound, next - now);
      }
    }
  };
};

},{}],47:[function(require,module,exports){
'use strict';

var momentum = require('./momentum');

function use (moment) {
  this.moment = momentum.moment = moment;
}

module.exports = use;

},{"./momentum":31}],48:[function(require,module,exports){
'use strict';

var index = require('./index');
var parse = require('./parse');
var association = require('./association');

function compareBuilder (compare) {
  return function factory (value) {
    var fixed = parse(value);

    return function validate (date) {
      var cal = index.find(value);
      var left = parse(date);
      var right = fixed || cal && cal.getMoment();
      if (!right) {
        return true;
      }
      if (cal) {
        association.add(this, cal);
      }
      return compare(left, right);
    };
  };
}

function rangeBuilder (how, compare) {
  return function factory (start, end) {
    var dates;
    var len = arguments.length;

    if (Array.isArray(start)) {
      dates = start;
    } else {
      if (len === 1) {
        dates = [start];
      } else if (len === 2) {
        dates = [[start, end]];
      }
    }

    return function validate (date) {
      return dates.map(expand.bind(this))[how](compare.bind(this, date));
    };

    function expand (value) {
      var start, end;
      var cal = index.find(value);
      if (cal) {
        start = end = cal.getMoment();
      } else if (Array.isArray(value)) {
        start = value[0]; end = value[1];
      } else {
        start = end = value;
      }
      if (cal) {
        association.add(cal, this);
      }
      return {
        start: parse(start).startOf('day').toDate(),
        end: parse(end).endOf('day').toDate()
      };
    }
  };
}

var afterEq  = compareBuilder(function (left, right) { return left >= right; });
var after    = compareBuilder(function (left, right) { return left  > right; });
var beforeEq = compareBuilder(function (left, right) { return left <= right; });
var before   = compareBuilder(function (left, right) { return left  < right; });

var except   = rangeBuilder('every', function (left, right) { return right.start  > left || right.end  < left; });
var only     = rangeBuilder('some',  function (left, right) { return right.start <= left && right.end >= left; });

module.exports = {
  afterEq: afterEq,
  after: after,
  beforeEq: beforeEq,
  before: before,
  except: except,
  only: only
};

},{"./association":20,"./index":27,"./parse":33}],49:[function(require,module,exports){
'use strict';

function value(elem, value) {
	if(arguments.length === 2) {
		elem.value = value;
	}
	return elem.value;
}

module.exports = value;
},{}]},{},[44])(44)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXRvYS9hdG9hLmpzIiwibm9kZV9tb2R1bGVzL2J1bGxzZXllL2J1bGxzZXllLmpzIiwibm9kZV9tb2R1bGVzL2J1bGxzZXllL3RhaWxvcm1hZGUuanMiLCJub2RlX21vZHVsZXMvYnVsbHNleWUvdGhyb3R0bGUuanMiLCJub2RlX21vZHVsZXMvY29udHJhL2RlYm91bmNlLmpzIiwibm9kZV9tb2R1bGVzL2NvbnRyYS9lbWl0dGVyLmpzIiwibm9kZV9tb2R1bGVzL2Nyb3NzdmVudC9zcmMvY3Jvc3N2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2Nyb3NzdmVudC9zcmMvZXZlbnRtYXAuanMiLCJub2RlX21vZHVsZXMvY3VzdG9tLWV2ZW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvZ2V0U2VsZWN0aW9uLmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvZ2V0U2VsZWN0aW9uTnVsbE9wLmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvZ2V0U2VsZWN0aW9uUmF3LmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvZ2V0U2VsZWN0aW9uU3ludGhldGljLmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvaXNIb3N0LmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvcmFuZ2VUb1RleHRSYW5nZS5qcyIsIm5vZGVfbW9kdWxlcy9zZWxlY2Npb24vc3JjL3NlbGVjY2lvbi5qcyIsIm5vZGVfbW9kdWxlcy9zZWxlY2Npb24vc3JjL3NldFNlbGVjdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9zZWxsL3NlbGwuanMiLCJub2RlX21vZHVsZXMvdGlja3kvdGlja3ktYnJvd3Nlci5qcyIsInNyYy9hc3NvY2lhdGlvbi5qcyIsInNyYy9jYWxlbmRhci5qcyIsInNyYy9jbGFzc2VzLmpzIiwic3JjL2Nsb25lLmpzIiwic3JjL2NvcmUuanMiLCJzcmMvZGVmYXVsdHMuanMiLCJzcmMvZG9tLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL2lubGluZS5qcyIsInNyYy9pbnB1dC5qcyIsInNyYy9pc0lucHV0LmpzIiwic3JjL21vbWVudHVtLmpzIiwic3JjL25vb3AuanMiLCJzcmMvcGFyc2UuanMiLCJzcmMvcG9seWZpbGxzL2FycmF5LmZpbHRlci5qcyIsInNyYy9wb2x5ZmlsbHMvYXJyYXkuZm9yZWFjaC5qcyIsInNyYy9wb2x5ZmlsbHMvYXJyYXkuaW5kZXhvZi5qcyIsInNyYy9wb2x5ZmlsbHMvYXJyYXkuaXNhcnJheS5qcyIsInNyYy9wb2x5ZmlsbHMvYXJyYXkubWFwLmpzIiwic3JjL3BvbHlmaWxscy9hcnJheS5zb21lLmpzIiwic3JjL3BvbHlmaWxscy9mdW5jdGlvbi5iaW5kLmpzIiwic3JjL3BvbHlmaWxscy9vYmplY3Qua2V5cy5qcyIsInNyYy9wb2x5ZmlsbHMvc3RyaW5nLnRyaW0uanMiLCJzcmMvcm9tZS5qcyIsInNyYy9yb21lLnN0YW5kYWxvbmUuanMiLCJzcmMvdGV4dC5qcyIsInNyYy90aHJvdHRsZS5qcyIsInNyYy91c2UuanMiLCJzcmMvdmFsaWRhdG9ycy5qcyIsInNyYy92YWx1ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3Z0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhdG9hIChhLCBuKSB7IHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhLCBuKTsgfVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3Jvc3N2ZW50ID0gcmVxdWlyZSgnY3Jvc3N2ZW50Jyk7XG52YXIgdGhyb3R0bGUgPSByZXF1aXJlKCcuL3Rocm90dGxlJyk7XG52YXIgdGFpbG9ybWFkZSA9IHJlcXVpcmUoJy4vdGFpbG9ybWFkZScpO1xuXG5mdW5jdGlvbiBidWxsc2V5ZSAoZWwsIHRhcmdldCwgb3B0aW9ucykge1xuICB2YXIgbyA9IG9wdGlvbnM7XG4gIHZhciBkb21UYXJnZXQgPSB0YXJnZXQgJiYgdGFyZ2V0LnRhZ05hbWU7XG5cbiAgaWYgKCFkb21UYXJnZXQgJiYgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIG8gPSB0YXJnZXQ7XG4gIH1cbiAgaWYgKCFkb21UYXJnZXQpIHtcbiAgICB0YXJnZXQgPSBlbDtcbiAgfVxuICBpZiAoIW8pIHsgbyA9IHt9OyB9XG5cbiAgdmFyIGRlc3Ryb3llZCA9IGZhbHNlO1xuICB2YXIgdGhyb3R0bGVkV3JpdGUgPSB0aHJvdHRsZSh3cml0ZSwgMzApO1xuICB2YXIgdGFpbG9yT3B0aW9ucyA9IHsgdXBkYXRlOiBvLmF1dG91cGRhdGVUb0NhcmV0ICE9PSBmYWxzZSAmJiB1cGRhdGUgfTtcbiAgdmFyIHRhaWxvciA9IG8uY2FyZXQgJiYgdGFpbG9ybWFkZSh0YXJnZXQsIHRhaWxvck9wdGlvbnMpO1xuXG4gIHdyaXRlKCk7XG5cbiAgaWYgKG8udHJhY2tpbmcgIT09IGZhbHNlKSB7XG4gICAgY3Jvc3N2ZW50LmFkZCh3aW5kb3csICdyZXNpemUnLCB0aHJvdHRsZWRXcml0ZSk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJlYWQ6IHJlYWROdWxsLFxuICAgIHJlZnJlc2g6IHdyaXRlLFxuICAgIGRlc3Ryb3k6IGRlc3Ryb3ksXG4gICAgc2xlZXA6IHNsZWVwXG4gIH07XG5cbiAgZnVuY3Rpb24gc2xlZXAgKCkge1xuICAgIHRhaWxvck9wdGlvbnMuc2xlZXBpbmcgPSB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVhZE51bGwgKCkgeyByZXR1cm4gcmVhZCgpOyB9XG5cbiAgZnVuY3Rpb24gcmVhZCAocmVhZGluZ3MpIHtcbiAgICB2YXIgYm91bmRzID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHZhciBzY3JvbGxUb3AgPSBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgIGlmICh0YWlsb3IpIHtcbiAgICAgIHJlYWRpbmdzID0gdGFpbG9yLnJlYWQoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHg6IChyZWFkaW5ncy5hYnNvbHV0ZSA/IDAgOiBib3VuZHMubGVmdCkgKyByZWFkaW5ncy54LFxuICAgICAgICB5OiAocmVhZGluZ3MuYWJzb2x1dGUgPyAwIDogYm91bmRzLnRvcCkgKyBzY3JvbGxUb3AgKyByZWFkaW5ncy55ICsgMjBcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB4OiBib3VuZHMubGVmdCxcbiAgICAgIHk6IGJvdW5kcy50b3AgKyBzY3JvbGxUb3BcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlIChyZWFkaW5ncykge1xuICAgIHdyaXRlKHJlYWRpbmdzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdyaXRlIChyZWFkaW5ncykge1xuICAgIGlmIChkZXN0cm95ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQnVsbHNleWUgY2FuXFwndCByZWZyZXNoIGFmdGVyIGJlaW5nIGRlc3Ryb3llZC4gQ3JlYXRlIGFub3RoZXIgaW5zdGFuY2UgaW5zdGVhZC4nKTtcbiAgICB9XG4gICAgaWYgKHRhaWxvciAmJiAhcmVhZGluZ3MpIHtcbiAgICAgIHRhaWxvck9wdGlvbnMuc2xlZXBpbmcgPSBmYWxzZTtcbiAgICAgIHRhaWxvci5yZWZyZXNoKCk7IHJldHVybjtcbiAgICB9XG4gICAgdmFyIHAgPSByZWFkKHJlYWRpbmdzKTtcbiAgICBpZiAoIXRhaWxvciAmJiB0YXJnZXQgIT09IGVsKSB7XG4gICAgICBwLnkgKz0gdGFyZ2V0Lm9mZnNldEhlaWdodDtcbiAgICB9XG4gICAgZWwuc3R5bGUubGVmdCA9IHAueCArICdweCc7XG4gICAgZWwuc3R5bGUudG9wID0gcC55ICsgJ3B4JztcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlc3Ryb3kgKCkge1xuICAgIGlmICh0YWlsb3IpIHsgdGFpbG9yLmRlc3Ryb3koKTsgfVxuICAgIGNyb3NzdmVudC5yZW1vdmUod2luZG93LCAncmVzaXplJywgdGhyb3R0bGVkV3JpdGUpO1xuICAgIGRlc3Ryb3llZCA9IHRydWU7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBidWxsc2V5ZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHNlbGwgPSByZXF1aXJlKCdzZWxsJyk7XG52YXIgY3Jvc3N2ZW50ID0gcmVxdWlyZSgnY3Jvc3N2ZW50Jyk7XG52YXIgc2VsZWNjaW9uID0gcmVxdWlyZSgnc2VsZWNjaW9uJyk7XG52YXIgdGhyb3R0bGUgPSByZXF1aXJlKCcuL3Rocm90dGxlJyk7XG52YXIgZ2V0U2VsZWN0aW9uID0gc2VsZWNjaW9uLmdldDtcbnZhciBwcm9wcyA9IFtcbiAgJ2RpcmVjdGlvbicsXG4gICdib3hTaXppbmcnLFxuICAnd2lkdGgnLFxuICAnaGVpZ2h0JyxcbiAgJ292ZXJmbG93WCcsXG4gICdvdmVyZmxvd1knLFxuICAnYm9yZGVyVG9wV2lkdGgnLFxuICAnYm9yZGVyUmlnaHRXaWR0aCcsXG4gICdib3JkZXJCb3R0b21XaWR0aCcsXG4gICdib3JkZXJMZWZ0V2lkdGgnLFxuICAncGFkZGluZ1RvcCcsXG4gICdwYWRkaW5nUmlnaHQnLFxuICAncGFkZGluZ0JvdHRvbScsXG4gICdwYWRkaW5nTGVmdCcsXG4gICdmb250U3R5bGUnLFxuICAnZm9udFZhcmlhbnQnLFxuICAnZm9udFdlaWdodCcsXG4gICdmb250U3RyZXRjaCcsXG4gICdmb250U2l6ZScsXG4gICdmb250U2l6ZUFkanVzdCcsXG4gICdsaW5lSGVpZ2h0JyxcbiAgJ2ZvbnRGYW1pbHknLFxuICAndGV4dEFsaWduJyxcbiAgJ3RleHRUcmFuc2Zvcm0nLFxuICAndGV4dEluZGVudCcsXG4gICd0ZXh0RGVjb3JhdGlvbicsXG4gICdsZXR0ZXJTcGFjaW5nJyxcbiAgJ3dvcmRTcGFjaW5nJ1xuXTtcbnZhciB3aW4gPSBnbG9iYWw7XG52YXIgZG9jID0gZG9jdW1lbnQ7XG52YXIgZmYgPSB3aW4ubW96SW5uZXJTY3JlZW5YICE9PSBudWxsICYmIHdpbi5tb3pJbm5lclNjcmVlblggIT09IHZvaWQgMDtcblxuZnVuY3Rpb24gdGFpbG9ybWFkZSAoZWwsIG9wdGlvbnMpIHtcbiAgdmFyIHRleHRJbnB1dCA9IGVsLnRhZ05hbWUgPT09ICdJTlBVVCcgfHwgZWwudGFnTmFtZSA9PT0gJ1RFWFRBUkVBJztcbiAgdmFyIHRocm90dGxlZFJlZnJlc2ggPSB0aHJvdHRsZShyZWZyZXNoLCAzMCk7XG4gIHZhciBvID0gb3B0aW9ucyB8fCB7fTtcblxuICBiaW5kKCk7XG5cbiAgcmV0dXJuIHtcbiAgICByZWFkOiByZWFkUG9zaXRpb24sXG4gICAgcmVmcmVzaDogdGhyb3R0bGVkUmVmcmVzaCxcbiAgICBkZXN0cm95OiBkZXN0cm95XG4gIH07XG5cbiAgZnVuY3Rpb24gbm9vcCAoKSB7fVxuICBmdW5jdGlvbiByZWFkUG9zaXRpb24gKCkgeyByZXR1cm4gKHRleHRJbnB1dCA/IGNvb3Jkc1RleHQgOiBjb29yZHNIVE1MKSgpOyB9XG5cbiAgZnVuY3Rpb24gcmVmcmVzaCAoKSB7XG4gICAgaWYgKG8uc2xlZXBpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIChvLnVwZGF0ZSB8fCBub29wKShyZWFkUG9zaXRpb24oKSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb29yZHNUZXh0ICgpIHtcbiAgICB2YXIgcCA9IHNlbGwoZWwpO1xuICAgIHZhciBjb250ZXh0ID0gcHJlcGFyZSgpO1xuICAgIHZhciByZWFkaW5ncyA9IHJlYWRUZXh0Q29vcmRzKGNvbnRleHQsIHAuc3RhcnQpO1xuICAgIGRvYy5ib2R5LnJlbW92ZUNoaWxkKGNvbnRleHQubWlycm9yKTtcbiAgICByZXR1cm4gcmVhZGluZ3M7XG4gIH1cblxuICBmdW5jdGlvbiBjb29yZHNIVE1MICgpIHtcbiAgICB2YXIgc2VsID0gZ2V0U2VsZWN0aW9uKCk7XG4gICAgaWYgKHNlbC5yYW5nZUNvdW50KSB7XG4gICAgICB2YXIgcmFuZ2UgPSBzZWwuZ2V0UmFuZ2VBdCgwKTtcbiAgICAgIHZhciBuZWVkc1RvV29ya0Fyb3VuZE5ld2xpbmVCdWcgPSByYW5nZS5zdGFydENvbnRhaW5lci5ub2RlTmFtZSA9PT0gJ1AnICYmIHJhbmdlLnN0YXJ0T2Zmc2V0ID09PSAwO1xuICAgICAgaWYgKG5lZWRzVG9Xb3JrQXJvdW5kTmV3bGluZUJ1Zykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHg6IHJhbmdlLnN0YXJ0Q29udGFpbmVyLm9mZnNldExlZnQsXG4gICAgICAgICAgeTogcmFuZ2Uuc3RhcnRDb250YWluZXIub2Zmc2V0VG9wLFxuICAgICAgICAgIGFic29sdXRlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBpZiAocmFuZ2UuZ2V0Q2xpZW50UmVjdHMpIHtcbiAgICAgICAgdmFyIHJlY3RzID0gcmFuZ2UuZ2V0Q2xpZW50UmVjdHMoKTtcbiAgICAgICAgaWYgKHJlY3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogcmVjdHNbMF0ubGVmdCxcbiAgICAgICAgICAgIHk6IHJlY3RzWzBdLnRvcCxcbiAgICAgICAgICAgIGFic29sdXRlOiB0cnVlXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geyB4OiAwLCB5OiAwIH07XG4gIH1cblxuICBmdW5jdGlvbiByZWFkVGV4dENvb3JkcyAoY29udGV4dCwgcCkge1xuICAgIHZhciByZXN0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB2YXIgbWlycm9yID0gY29udGV4dC5taXJyb3I7XG4gICAgdmFyIGNvbXB1dGVkID0gY29udGV4dC5jb21wdXRlZDtcblxuICAgIHdyaXRlKG1pcnJvciwgcmVhZChlbCkuc3Vic3RyaW5nKDAsIHApKTtcblxuICAgIGlmIChlbC50YWdOYW1lID09PSAnSU5QVVQnKSB7XG4gICAgICBtaXJyb3IudGV4dENvbnRlbnQgPSBtaXJyb3IudGV4dENvbnRlbnQucmVwbGFjZSgvXFxzL2csICdcXHUwMGEwJyk7XG4gICAgfVxuXG4gICAgd3JpdGUocmVzdCwgcmVhZChlbCkuc3Vic3RyaW5nKHApIHx8ICcuJyk7XG5cbiAgICBtaXJyb3IuYXBwZW5kQ2hpbGQocmVzdCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgeDogcmVzdC5vZmZzZXRMZWZ0ICsgcGFyc2VJbnQoY29tcHV0ZWRbJ2JvcmRlckxlZnRXaWR0aCddKSxcbiAgICAgIHk6IHJlc3Qub2Zmc2V0VG9wICsgcGFyc2VJbnQoY29tcHV0ZWRbJ2JvcmRlclRvcFdpZHRoJ10pXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGVsKSB7XG4gICAgcmV0dXJuIHRleHRJbnB1dCA/IGVsLnZhbHVlIDogZWwuaW5uZXJIVE1MO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJlcGFyZSAoKSB7XG4gICAgdmFyIGNvbXB1dGVkID0gd2luLmdldENvbXB1dGVkU3R5bGUgPyBnZXRDb21wdXRlZFN0eWxlKGVsKSA6IGVsLmN1cnJlbnRTdHlsZTtcbiAgICB2YXIgbWlycm9yID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHZhciBzdHlsZSA9IG1pcnJvci5zdHlsZTtcblxuICAgIGRvYy5ib2R5LmFwcGVuZENoaWxkKG1pcnJvcik7XG5cbiAgICBpZiAoZWwudGFnTmFtZSAhPT0gJ0lOUFVUJykge1xuICAgICAgc3R5bGUud29yZFdyYXAgPSAnYnJlYWstd29yZCc7XG4gICAgfVxuICAgIHN0eWxlLndoaXRlU3BhY2UgPSAncHJlLXdyYXAnO1xuICAgIHN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICBzdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG4gICAgcHJvcHMuZm9yRWFjaChjb3B5KTtcblxuICAgIGlmIChmZikge1xuICAgICAgc3R5bGUud2lkdGggPSBwYXJzZUludChjb21wdXRlZC53aWR0aCkgLSAyICsgJ3B4JztcbiAgICAgIGlmIChlbC5zY3JvbGxIZWlnaHQgPiBwYXJzZUludChjb21wdXRlZC5oZWlnaHQpKSB7XG4gICAgICAgIHN0eWxlLm92ZXJmbG93WSA9ICdzY3JvbGwnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgIH1cbiAgICByZXR1cm4geyBtaXJyb3I6IG1pcnJvciwgY29tcHV0ZWQ6IGNvbXB1dGVkIH07XG5cbiAgICBmdW5jdGlvbiBjb3B5IChwcm9wKSB7XG4gICAgICBzdHlsZVtwcm9wXSA9IGNvbXB1dGVkW3Byb3BdO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHdyaXRlIChlbCwgdmFsdWUpIHtcbiAgICBpZiAodGV4dElucHV0KSB7XG4gICAgICBlbC50ZXh0Q29udGVudCA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBiaW5kIChyZW1vdmUpIHtcbiAgICB2YXIgb3AgPSByZW1vdmUgPyAncmVtb3ZlJyA6ICdhZGQnO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdrZXlkb3duJywgdGhyb3R0bGVkUmVmcmVzaCk7XG4gICAgY3Jvc3N2ZW50W29wXShlbCwgJ2tleXVwJywgdGhyb3R0bGVkUmVmcmVzaCk7XG4gICAgY3Jvc3N2ZW50W29wXShlbCwgJ2lucHV0JywgdGhyb3R0bGVkUmVmcmVzaCk7XG4gICAgY3Jvc3N2ZW50W29wXShlbCwgJ3Bhc3RlJywgdGhyb3R0bGVkUmVmcmVzaCk7XG4gICAgY3Jvc3N2ZW50W29wXShlbCwgJ2NoYW5nZScsIHRocm90dGxlZFJlZnJlc2gpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSAoKSB7XG4gICAgYmluZCh0cnVlKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRhaWxvcm1hZGU7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIHRocm90dGxlIChmbiwgYm91bmRhcnkpIHtcbiAgdmFyIGxhc3QgPSAtSW5maW5pdHk7XG4gIHZhciB0aW1lcjtcbiAgcmV0dXJuIGZ1bmN0aW9uIGJvdW5jZWQgKCkge1xuICAgIGlmICh0aW1lcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB1bmJvdW5kKCk7XG5cbiAgICBmdW5jdGlvbiB1bmJvdW5kICgpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICB0aW1lciA9IG51bGw7XG4gICAgICB2YXIgbmV4dCA9IGxhc3QgKyBib3VuZGFyeTtcbiAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgaWYgKG5vdyA+IG5leHQpIHtcbiAgICAgICAgbGFzdCA9IG5vdztcbiAgICAgICAgZm4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVyID0gc2V0VGltZW91dCh1bmJvdW5kLCBuZXh0IC0gbm93KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGhyb3R0bGU7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB0aWNreSA9IHJlcXVpcmUoJ3RpY2t5Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGVib3VuY2UgKGZuLCBhcmdzLCBjdHgpIHtcbiAgaWYgKCFmbikgeyByZXR1cm47IH1cbiAgdGlja3koZnVuY3Rpb24gcnVuICgpIHtcbiAgICBmbi5hcHBseShjdHggfHwgbnVsbCwgYXJncyB8fCBbXSk7XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGF0b2EgPSByZXF1aXJlKCdhdG9hJyk7XG52YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZW1pdHRlciAodGhpbmcsIG9wdGlvbnMpIHtcbiAgdmFyIG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgZXZ0ID0ge307XG4gIGlmICh0aGluZyA9PT0gdW5kZWZpbmVkKSB7IHRoaW5nID0ge307IH1cbiAgdGhpbmcub24gPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgICBpZiAoIWV2dFt0eXBlXSkge1xuICAgICAgZXZ0W3R5cGVdID0gW2ZuXTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXZ0W3R5cGVdLnB1c2goZm4pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpbmc7XG4gIH07XG4gIHRoaW5nLm9uY2UgPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgICBmbi5fb25jZSA9IHRydWU7IC8vIHRoaW5nLm9mZihmbikgc3RpbGwgd29ya3MhXG4gICAgdGhpbmcub24odHlwZSwgZm4pO1xuICAgIHJldHVybiB0aGluZztcbiAgfTtcbiAgdGhpbmcub2ZmID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGlmIChjID09PSAxKSB7XG4gICAgICBkZWxldGUgZXZ0W3R5cGVdO1xuICAgIH0gZWxzZSBpZiAoYyA9PT0gMCkge1xuICAgICAgZXZ0ID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBldCA9IGV2dFt0eXBlXTtcbiAgICAgIGlmICghZXQpIHsgcmV0dXJuIHRoaW5nOyB9XG4gICAgICBldC5zcGxpY2UoZXQuaW5kZXhPZihmbiksIDEpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpbmc7XG4gIH07XG4gIHRoaW5nLmVtaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBhdG9hKGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaW5nLmVtaXR0ZXJTbmFwc2hvdChhcmdzLnNoaWZ0KCkpLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9O1xuICB0aGluZy5lbWl0dGVyU25hcHNob3QgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHZhciBldCA9IChldnRbdHlwZV0gfHwgW10pLnNsaWNlKDApO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgYXJncyA9IGF0b2EoYXJndW1lbnRzKTtcbiAgICAgIHZhciBjdHggPSB0aGlzIHx8IHRoaW5nO1xuICAgICAgaWYgKHR5cGUgPT09ICdlcnJvcicgJiYgb3B0cy50aHJvd3MgIT09IGZhbHNlICYmICFldC5sZW5ndGgpIHsgdGhyb3cgYXJncy5sZW5ndGggPT09IDEgPyBhcmdzWzBdIDogYXJnczsgfVxuICAgICAgZXQuZm9yRWFjaChmdW5jdGlvbiBlbWl0dGVyIChsaXN0ZW4pIHtcbiAgICAgICAgaWYgKG9wdHMuYXN5bmMpIHsgZGVib3VuY2UobGlzdGVuLCBhcmdzLCBjdHgpOyB9IGVsc2UgeyBsaXN0ZW4uYXBwbHkoY3R4LCBhcmdzKTsgfVxuICAgICAgICBpZiAobGlzdGVuLl9vbmNlKSB7IHRoaW5nLm9mZih0eXBlLCBsaXN0ZW4pOyB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGluZztcbiAgICB9O1xuICB9O1xuICByZXR1cm4gdGhpbmc7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3VzdG9tRXZlbnQgPSByZXF1aXJlKCdjdXN0b20tZXZlbnQnKTtcbnZhciBldmVudG1hcCA9IHJlcXVpcmUoJy4vZXZlbnRtYXAnKTtcbnZhciBkb2MgPSBkb2N1bWVudDtcbnZhciBhZGRFdmVudCA9IGFkZEV2ZW50RWFzeTtcbnZhciByZW1vdmVFdmVudCA9IHJlbW92ZUV2ZW50RWFzeTtcbnZhciBoYXJkQ2FjaGUgPSBbXTtcblxuaWYgKCFnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICBhZGRFdmVudCA9IGFkZEV2ZW50SGFyZDtcbiAgcmVtb3ZlRXZlbnQgPSByZW1vdmVFdmVudEhhcmQ7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50RWFzeSAoZWwsIHR5cGUsIGZuLCBjYXB0dXJpbmcpIHtcbiAgcmV0dXJuIGVsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4sIGNhcHR1cmluZyk7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50SGFyZCAoZWwsIHR5cGUsIGZuKSB7XG4gIHJldHVybiBlbC5hdHRhY2hFdmVudCgnb24nICsgdHlwZSwgd3JhcChlbCwgdHlwZSwgZm4pKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnRFYXN5IChlbCwgdHlwZSwgZm4sIGNhcHR1cmluZykge1xuICByZXR1cm4gZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgY2FwdHVyaW5nKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnRIYXJkIChlbCwgdHlwZSwgZm4pIHtcbiAgcmV0dXJuIGVsLmRldGFjaEV2ZW50KCdvbicgKyB0eXBlLCB1bndyYXAoZWwsIHR5cGUsIGZuKSk7XG59XG5cbmZ1bmN0aW9uIGZhYnJpY2F0ZUV2ZW50IChlbCwgdHlwZSwgbW9kZWwpIHtcbiAgdmFyIGUgPSBldmVudG1hcC5pbmRleE9mKHR5cGUpID09PSAtMSA/IG1ha2VDdXN0b21FdmVudCgpIDogbWFrZUNsYXNzaWNFdmVudCgpO1xuICBpZiAoZWwuZGlzcGF0Y2hFdmVudCkge1xuICAgIGVsLmRpc3BhdGNoRXZlbnQoZSk7XG4gIH0gZWxzZSB7XG4gICAgZWwuZmlyZUV2ZW50KCdvbicgKyB0eXBlLCBlKTtcbiAgfVxuICBmdW5jdGlvbiBtYWtlQ2xhc3NpY0V2ZW50ICgpIHtcbiAgICB2YXIgZTtcbiAgICBpZiAoZG9jLmNyZWF0ZUV2ZW50KSB7XG4gICAgICBlID0gZG9jLmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgZS5pbml0RXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgfSBlbHNlIGlmIChkb2MuY3JlYXRlRXZlbnRPYmplY3QpIHtcbiAgICAgIGUgPSBkb2MuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgICB9XG4gICAgcmV0dXJuIGU7XG4gIH1cbiAgZnVuY3Rpb24gbWFrZUN1c3RvbUV2ZW50ICgpIHtcbiAgICByZXR1cm4gbmV3IGN1c3RvbUV2ZW50KHR5cGUsIHsgZGV0YWlsOiBtb2RlbCB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3cmFwcGVyRmFjdG9yeSAoZWwsIHR5cGUsIGZuKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwcGVyIChvcmlnaW5hbEV2ZW50KSB7XG4gICAgdmFyIGUgPSBvcmlnaW5hbEV2ZW50IHx8IGdsb2JhbC5ldmVudDtcbiAgICBlLnRhcmdldCA9IGUudGFyZ2V0IHx8IGUuc3JjRWxlbWVudDtcbiAgICBlLnByZXZlbnREZWZhdWx0ID0gZS5wcmV2ZW50RGVmYXVsdCB8fCBmdW5jdGlvbiBwcmV2ZW50RGVmYXVsdCAoKSB7IGUucmV0dXJuVmFsdWUgPSBmYWxzZTsgfTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbiA9IGUuc3RvcFByb3BhZ2F0aW9uIHx8IGZ1bmN0aW9uIHN0b3BQcm9wYWdhdGlvbiAoKSB7IGUuY2FuY2VsQnViYmxlID0gdHJ1ZTsgfTtcbiAgICBlLndoaWNoID0gZS53aGljaCB8fCBlLmtleUNvZGU7XG4gICAgZm4uY2FsbChlbCwgZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHdyYXAgKGVsLCB0eXBlLCBmbikge1xuICB2YXIgd3JhcHBlciA9IHVud3JhcChlbCwgdHlwZSwgZm4pIHx8IHdyYXBwZXJGYWN0b3J5KGVsLCB0eXBlLCBmbik7XG4gIGhhcmRDYWNoZS5wdXNoKHtcbiAgICB3cmFwcGVyOiB3cmFwcGVyLFxuICAgIGVsZW1lbnQ6IGVsLFxuICAgIHR5cGU6IHR5cGUsXG4gICAgZm46IGZuXG4gIH0pO1xuICByZXR1cm4gd3JhcHBlcjtcbn1cblxuZnVuY3Rpb24gdW53cmFwIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIGkgPSBmaW5kKGVsLCB0eXBlLCBmbik7XG4gIGlmIChpKSB7XG4gICAgdmFyIHdyYXBwZXIgPSBoYXJkQ2FjaGVbaV0ud3JhcHBlcjtcbiAgICBoYXJkQ2FjaGUuc3BsaWNlKGksIDEpOyAvLyBmcmVlIHVwIGEgdGFkIG9mIG1lbW9yeVxuICAgIHJldHVybiB3cmFwcGVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmQgKGVsLCB0eXBlLCBmbikge1xuICB2YXIgaSwgaXRlbTtcbiAgZm9yIChpID0gMDsgaSA8IGhhcmRDYWNoZS5sZW5ndGg7IGkrKykge1xuICAgIGl0ZW0gPSBoYXJkQ2FjaGVbaV07XG4gICAgaWYgKGl0ZW0uZWxlbWVudCA9PT0gZWwgJiYgaXRlbS50eXBlID09PSB0eXBlICYmIGl0ZW0uZm4gPT09IGZuKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFkZDogYWRkRXZlbnQsXG4gIHJlbW92ZTogcmVtb3ZlRXZlbnQsXG4gIGZhYnJpY2F0ZTogZmFicmljYXRlRXZlbnRcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBldmVudG1hcCA9IFtdO1xudmFyIGV2ZW50bmFtZSA9ICcnO1xudmFyIHJvbiA9IC9eb24vO1xuXG5mb3IgKGV2ZW50bmFtZSBpbiBnbG9iYWwpIHtcbiAgaWYgKHJvbi50ZXN0KGV2ZW50bmFtZSkpIHtcbiAgICBldmVudG1hcC5wdXNoKGV2ZW50bmFtZS5zbGljZSgyKSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBldmVudG1hcDtcbiIsIlxudmFyIE5hdGl2ZUN1c3RvbUV2ZW50ID0gZ2xvYmFsLkN1c3RvbUV2ZW50O1xuXG5mdW5jdGlvbiB1c2VOYXRpdmUgKCkge1xuICB0cnkge1xuICAgIHZhciBwID0gbmV3IE5hdGl2ZUN1c3RvbUV2ZW50KCdjYXQnLCB7IGRldGFpbDogeyBmb286ICdiYXInIH0gfSk7XG4gICAgcmV0dXJuICAnY2F0JyA9PT0gcC50eXBlICYmICdiYXInID09PSBwLmRldGFpbC5mb287XG4gIH0gY2F0Y2ggKGUpIHtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ3Jvc3MtYnJvd3NlciBgQ3VzdG9tRXZlbnRgIGNvbnN0cnVjdG9yLlxuICpcbiAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DdXN0b21FdmVudC5DdXN0b21FdmVudFxuICpcbiAqIEBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHVzZU5hdGl2ZSgpID8gTmF0aXZlQ3VzdG9tRXZlbnQgOlxuXG4vLyBJRSA+PSA5XG4nZnVuY3Rpb24nID09PSB0eXBlb2YgZG9jdW1lbnQuY3JlYXRlRXZlbnQgPyBmdW5jdGlvbiBDdXN0b21FdmVudCAodHlwZSwgcGFyYW1zKSB7XG4gIHZhciBlID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0N1c3RvbUV2ZW50Jyk7XG4gIGlmIChwYXJhbXMpIHtcbiAgICBlLmluaXRDdXN0b21FdmVudCh0eXBlLCBwYXJhbXMuYnViYmxlcywgcGFyYW1zLmNhbmNlbGFibGUsIHBhcmFtcy5kZXRhaWwpO1xuICB9IGVsc2Uge1xuICAgIGUuaW5pdEN1c3RvbUV2ZW50KHR5cGUsIGZhbHNlLCBmYWxzZSwgdm9pZCAwKTtcbiAgfVxuICByZXR1cm4gZTtcbn0gOlxuXG4vLyBJRSA8PSA4XG5mdW5jdGlvbiBDdXN0b21FdmVudCAodHlwZSwgcGFyYW1zKSB7XG4gIHZhciBlID0gZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QoKTtcbiAgZS50eXBlID0gdHlwZTtcbiAgaWYgKHBhcmFtcykge1xuICAgIGUuYnViYmxlcyA9IEJvb2xlYW4ocGFyYW1zLmJ1YmJsZXMpO1xuICAgIGUuY2FuY2VsYWJsZSA9IEJvb2xlYW4ocGFyYW1zLmNhbmNlbGFibGUpO1xuICAgIGUuZGV0YWlsID0gcGFyYW1zLmRldGFpbDtcbiAgfSBlbHNlIHtcbiAgICBlLmJ1YmJsZXMgPSBmYWxzZTtcbiAgICBlLmNhbmNlbGFibGUgPSBmYWxzZTtcbiAgICBlLmRldGFpbCA9IHZvaWQgMDtcbiAgfVxuICByZXR1cm4gZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGdldFNlbGVjdGlvbjtcbnZhciBkb2MgPSBnbG9iYWwuZG9jdW1lbnQ7XG52YXIgZ2V0U2VsZWN0aW9uUmF3ID0gcmVxdWlyZSgnLi9nZXRTZWxlY3Rpb25SYXcnKTtcbnZhciBnZXRTZWxlY3Rpb25OdWxsT3AgPSByZXF1aXJlKCcuL2dldFNlbGVjdGlvbk51bGxPcCcpO1xudmFyIGdldFNlbGVjdGlvblN5bnRoZXRpYyA9IHJlcXVpcmUoJy4vZ2V0U2VsZWN0aW9uU3ludGhldGljJyk7XG52YXIgaXNIb3N0ID0gcmVxdWlyZSgnLi9pc0hvc3QnKTtcbmlmIChpc0hvc3QubWV0aG9kKGdsb2JhbCwgJ2dldFNlbGVjdGlvbicpKSB7XG4gIGdldFNlbGVjdGlvbiA9IGdldFNlbGVjdGlvblJhdztcbn0gZWxzZSBpZiAodHlwZW9mIGRvYy5zZWxlY3Rpb24gPT09ICdvYmplY3QnICYmIGRvYy5zZWxlY3Rpb24pIHtcbiAgZ2V0U2VsZWN0aW9uID0gZ2V0U2VsZWN0aW9uU3ludGhldGljO1xufSBlbHNlIHtcbiAgZ2V0U2VsZWN0aW9uID0gZ2V0U2VsZWN0aW9uTnVsbE9wO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNlbGVjdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gbm9vcCAoKSB7fVxuXG5mdW5jdGlvbiBnZXRTZWxlY3Rpb25OdWxsT3AgKCkge1xuICByZXR1cm4ge1xuICAgIHJlbW92ZUFsbFJhbmdlczogbm9vcCxcbiAgICBhZGRSYW5nZTogbm9vcFxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNlbGVjdGlvbk51bGxPcDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gZ2V0U2VsZWN0aW9uUmF3ICgpIHtcbiAgcmV0dXJuIGdsb2JhbC5nZXRTZWxlY3Rpb24oKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZWxlY3Rpb25SYXc7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciByYW5nZVRvVGV4dFJhbmdlID0gcmVxdWlyZSgnLi9yYW5nZVRvVGV4dFJhbmdlJyk7XG52YXIgZG9jID0gZ2xvYmFsLmRvY3VtZW50O1xudmFyIGJvZHkgPSBkb2MuYm9keTtcbnZhciBHZXRTZWxlY3Rpb25Qcm90byA9IEdldFNlbGVjdGlvbi5wcm90b3R5cGU7XG5cbmZ1bmN0aW9uIEdldFNlbGVjdGlvbiAoc2VsZWN0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHJhbmdlID0gc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKCk7XG5cbiAgdGhpcy5fc2VsZWN0aW9uID0gc2VsZWN0aW9uO1xuICB0aGlzLl9yYW5nZXMgPSBbXTtcblxuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICdDb250cm9sJykge1xuICAgIHVwZGF0ZUNvbnRyb2xTZWxlY3Rpb24oc2VsZik7XG4gIH0gZWxzZSBpZiAoaXNUZXh0UmFuZ2UocmFuZ2UpKSB7XG4gICAgdXBkYXRlRnJvbVRleHRSYW5nZShzZWxmLCByYW5nZSk7XG4gIH0gZWxzZSB7XG4gICAgdXBkYXRlRW1wdHlTZWxlY3Rpb24oc2VsZik7XG4gIH1cbn1cblxuR2V0U2VsZWN0aW9uUHJvdG8ucmVtb3ZlQWxsUmFuZ2VzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdGV4dFJhbmdlO1xuICB0cnkge1xuICAgIHRoaXMuX3NlbGVjdGlvbi5lbXB0eSgpO1xuICAgIGlmICh0aGlzLl9zZWxlY3Rpb24udHlwZSAhPT0gJ05vbmUnKSB7XG4gICAgICB0ZXh0UmFuZ2UgPSBib2R5LmNyZWF0ZVRleHRSYW5nZSgpO1xuICAgICAgdGV4dFJhbmdlLnNlbGVjdCgpO1xuICAgICAgdGhpcy5fc2VsZWN0aW9uLmVtcHR5KCk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gIH1cbiAgdXBkYXRlRW1wdHlTZWxlY3Rpb24odGhpcyk7XG59O1xuXG5HZXRTZWxlY3Rpb25Qcm90by5hZGRSYW5nZSA9IGZ1bmN0aW9uIChyYW5nZSkge1xuICBpZiAodGhpcy5fc2VsZWN0aW9uLnR5cGUgPT09ICdDb250cm9sJykge1xuICAgIGFkZFJhbmdlVG9Db250cm9sU2VsZWN0aW9uKHRoaXMsIHJhbmdlKTtcbiAgfSBlbHNlIHtcbiAgICByYW5nZVRvVGV4dFJhbmdlKHJhbmdlKS5zZWxlY3QoKTtcbiAgICB0aGlzLl9yYW5nZXNbMF0gPSByYW5nZTtcbiAgICB0aGlzLnJhbmdlQ291bnQgPSAxO1xuICAgIHRoaXMuaXNDb2xsYXBzZWQgPSB0aGlzLl9yYW5nZXNbMF0uY29sbGFwc2VkO1xuICAgIHVwZGF0ZUFuY2hvckFuZEZvY3VzRnJvbVJhbmdlKHRoaXMsIHJhbmdlLCBmYWxzZSk7XG4gIH1cbn07XG5cbkdldFNlbGVjdGlvblByb3RvLnNldFJhbmdlcyA9IGZ1bmN0aW9uIChyYW5nZXMpIHtcbiAgdGhpcy5yZW1vdmVBbGxSYW5nZXMoKTtcbiAgdmFyIHJhbmdlQ291bnQgPSByYW5nZXMubGVuZ3RoO1xuICBpZiAocmFuZ2VDb3VudCA+IDEpIHtcbiAgICBjcmVhdGVDb250cm9sU2VsZWN0aW9uKHRoaXMsIHJhbmdlcyk7XG4gIH0gZWxzZSBpZiAocmFuZ2VDb3VudCkge1xuICAgIHRoaXMuYWRkUmFuZ2UocmFuZ2VzWzBdKTtcbiAgfVxufTtcblxuR2V0U2VsZWN0aW9uUHJvdG8uZ2V0UmFuZ2VBdCA9IGZ1bmN0aW9uIChpbmRleCkge1xuICBpZiAoaW5kZXggPCAwIHx8IGluZGV4ID49IHRoaXMucmFuZ2VDb3VudCkge1xuICAgIHRocm93IG5ldyBFcnJvcignZ2V0UmFuZ2VBdCgpOiBpbmRleCBvdXQgb2YgYm91bmRzJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuX3Jhbmdlc1tpbmRleF0uY2xvbmVSYW5nZSgpO1xuICB9XG59O1xuXG5HZXRTZWxlY3Rpb25Qcm90by5yZW1vdmVSYW5nZSA9IGZ1bmN0aW9uIChyYW5nZSkge1xuICBpZiAodGhpcy5fc2VsZWN0aW9uLnR5cGUgIT09ICdDb250cm9sJykge1xuICAgIHJlbW92ZVJhbmdlTWFudWFsbHkodGhpcywgcmFuZ2UpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgY29udHJvbFJhbmdlID0gdGhpcy5fc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKCk7XG4gIHZhciByYW5nZUVsZW1lbnQgPSBnZXRTaW5nbGVFbGVtZW50RnJvbVJhbmdlKHJhbmdlKTtcbiAgdmFyIG5ld0NvbnRyb2xSYW5nZSA9IGJvZHkuY3JlYXRlQ29udHJvbFJhbmdlKCk7XG4gIHZhciBlbDtcbiAgdmFyIHJlbW92ZWQgPSBmYWxzZTtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvbnRyb2xSYW5nZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGVsID0gY29udHJvbFJhbmdlLml0ZW0oaSk7XG4gICAgaWYgKGVsICE9PSByYW5nZUVsZW1lbnQgfHwgcmVtb3ZlZCkge1xuICAgICAgbmV3Q29udHJvbFJhbmdlLmFkZChjb250cm9sUmFuZ2UuaXRlbShpKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlbW92ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuICBuZXdDb250cm9sUmFuZ2Uuc2VsZWN0KCk7XG4gIHVwZGF0ZUNvbnRyb2xTZWxlY3Rpb24odGhpcyk7XG59O1xuXG5HZXRTZWxlY3Rpb25Qcm90by5lYWNoUmFuZ2UgPSBmdW5jdGlvbiAoZm4sIHJldHVyblZhbHVlKSB7XG4gIHZhciBpID0gMDtcbiAgdmFyIGxlbiA9IHRoaXMuX3Jhbmdlcy5sZW5ndGg7XG4gIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChmbih0aGlzLmdldFJhbmdlQXQoaSkpKSB7XG4gICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgfVxuICB9XG59O1xuXG5HZXRTZWxlY3Rpb25Qcm90by5nZXRBbGxSYW5nZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciByYW5nZXMgPSBbXTtcbiAgdGhpcy5lYWNoUmFuZ2UoZnVuY3Rpb24gKHJhbmdlKSB7XG4gICAgcmFuZ2VzLnB1c2gocmFuZ2UpO1xuICB9KTtcbiAgcmV0dXJuIHJhbmdlcztcbn07XG5cbkdldFNlbGVjdGlvblByb3RvLnNldFNpbmdsZVJhbmdlID0gZnVuY3Rpb24gKHJhbmdlKSB7XG4gIHRoaXMucmVtb3ZlQWxsUmFuZ2VzKCk7XG4gIHRoaXMuYWRkUmFuZ2UocmFuZ2UpO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlQ29udHJvbFNlbGVjdGlvbiAoc2VsLCByYW5nZXMpIHtcbiAgdmFyIGNvbnRyb2xSYW5nZSA9IGJvZHkuY3JlYXRlQ29udHJvbFJhbmdlKCk7XG4gIGZvciAodmFyIGkgPSAwLCBlbCwgbGVuID0gcmFuZ2VzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgZWwgPSBnZXRTaW5nbGVFbGVtZW50RnJvbVJhbmdlKHJhbmdlc1tpXSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnRyb2xSYW5nZS5hZGQoZWwpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc2V0UmFuZ2VzKCk6IEVsZW1lbnQgY291bGQgbm90IGJlIGFkZGVkIHRvIGNvbnRyb2wgc2VsZWN0aW9uJyk7XG4gICAgfVxuICB9XG4gIGNvbnRyb2xSYW5nZS5zZWxlY3QoKTtcbiAgdXBkYXRlQ29udHJvbFNlbGVjdGlvbihzZWwpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVSYW5nZU1hbnVhbGx5IChzZWwsIHJhbmdlKSB7XG4gIHZhciByYW5nZXMgPSBzZWwuZ2V0QWxsUmFuZ2VzKCk7XG4gIHNlbC5yZW1vdmVBbGxSYW5nZXMoKTtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHJhbmdlcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICghaXNTYW1lUmFuZ2UocmFuZ2UsIHJhbmdlc1tpXSkpIHtcbiAgICAgIHNlbC5hZGRSYW5nZShyYW5nZXNbaV0pO1xuICAgIH1cbiAgfVxuICBpZiAoIXNlbC5yYW5nZUNvdW50KSB7XG4gICAgdXBkYXRlRW1wdHlTZWxlY3Rpb24oc2VsKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVBbmNob3JBbmRGb2N1c0Zyb21SYW5nZSAoc2VsLCByYW5nZSkge1xuICB2YXIgYW5jaG9yUHJlZml4ID0gJ3N0YXJ0JztcbiAgdmFyIGZvY3VzUHJlZml4ID0gJ2VuZCc7XG4gIHNlbC5hbmNob3JOb2RlID0gcmFuZ2VbYW5jaG9yUHJlZml4ICsgJ0NvbnRhaW5lciddO1xuICBzZWwuYW5jaG9yT2Zmc2V0ID0gcmFuZ2VbYW5jaG9yUHJlZml4ICsgJ09mZnNldCddO1xuICBzZWwuZm9jdXNOb2RlID0gcmFuZ2VbZm9jdXNQcmVmaXggKyAnQ29udGFpbmVyJ107XG4gIHNlbC5mb2N1c09mZnNldCA9IHJhbmdlW2ZvY3VzUHJlZml4ICsgJ09mZnNldCddO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVFbXB0eVNlbGVjdGlvbiAoc2VsKSB7XG4gIHNlbC5hbmNob3JOb2RlID0gc2VsLmZvY3VzTm9kZSA9IG51bGw7XG4gIHNlbC5hbmNob3JPZmZzZXQgPSBzZWwuZm9jdXNPZmZzZXQgPSAwO1xuICBzZWwucmFuZ2VDb3VudCA9IDA7XG4gIHNlbC5pc0NvbGxhcHNlZCA9IHRydWU7XG4gIHNlbC5fcmFuZ2VzLmxlbmd0aCA9IDA7XG59XG5cbmZ1bmN0aW9uIHJhbmdlQ29udGFpbnNTaW5nbGVFbGVtZW50IChyYW5nZU5vZGVzKSB7XG4gIGlmICghcmFuZ2VOb2Rlcy5sZW5ndGggfHwgcmFuZ2VOb2Rlc1swXS5ub2RlVHlwZSAhPT0gMSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKHZhciBpID0gMSwgbGVuID0gcmFuZ2VOb2Rlcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICghaXNBbmNlc3Rvck9mKHJhbmdlTm9kZXNbMF0sIHJhbmdlTm9kZXNbaV0pKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBnZXRTaW5nbGVFbGVtZW50RnJvbVJhbmdlIChyYW5nZSkge1xuICB2YXIgbm9kZXMgPSByYW5nZS5nZXROb2RlcygpO1xuICBpZiAoIXJhbmdlQ29udGFpbnNTaW5nbGVFbGVtZW50KG5vZGVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignZ2V0U2luZ2xlRWxlbWVudEZyb21SYW5nZSgpOiByYW5nZSBkaWQgbm90IGNvbnNpc3Qgb2YgYSBzaW5nbGUgZWxlbWVudCcpO1xuICB9XG4gIHJldHVybiBub2Rlc1swXTtcbn1cblxuZnVuY3Rpb24gaXNUZXh0UmFuZ2UgKHJhbmdlKSB7XG4gIHJldHVybiByYW5nZSAmJiByYW5nZS50ZXh0ICE9PSB2b2lkIDA7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUZyb21UZXh0UmFuZ2UgKHNlbCwgcmFuZ2UpIHtcbiAgc2VsLl9yYW5nZXMgPSBbcmFuZ2VdO1xuICB1cGRhdGVBbmNob3JBbmRGb2N1c0Zyb21SYW5nZShzZWwsIHJhbmdlLCBmYWxzZSk7XG4gIHNlbC5yYW5nZUNvdW50ID0gMTtcbiAgc2VsLmlzQ29sbGFwc2VkID0gcmFuZ2UuY29sbGFwc2VkO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVDb250cm9sU2VsZWN0aW9uIChzZWwpIHtcbiAgc2VsLl9yYW5nZXMubGVuZ3RoID0gMDtcbiAgaWYgKHNlbC5fc2VsZWN0aW9uLnR5cGUgPT09ICdOb25lJykge1xuICAgIHVwZGF0ZUVtcHR5U2VsZWN0aW9uKHNlbCk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGNvbnRyb2xSYW5nZSA9IHNlbC5fc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKCk7XG4gICAgaWYgKGlzVGV4dFJhbmdlKGNvbnRyb2xSYW5nZSkpIHtcbiAgICAgIHVwZGF0ZUZyb21UZXh0UmFuZ2Uoc2VsLCBjb250cm9sUmFuZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWwucmFuZ2VDb3VudCA9IGNvbnRyb2xSYW5nZS5sZW5ndGg7XG4gICAgICB2YXIgcmFuZ2U7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbC5yYW5nZUNvdW50OyArK2kpIHtcbiAgICAgICAgcmFuZ2UgPSBkb2MuY3JlYXRlUmFuZ2UoKTtcbiAgICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZShjb250cm9sUmFuZ2UuaXRlbShpKSk7XG4gICAgICAgIHNlbC5fcmFuZ2VzLnB1c2gocmFuZ2UpO1xuICAgICAgfVxuICAgICAgc2VsLmlzQ29sbGFwc2VkID0gc2VsLnJhbmdlQ291bnQgPT09IDEgJiYgc2VsLl9yYW5nZXNbMF0uY29sbGFwc2VkO1xuICAgICAgdXBkYXRlQW5jaG9yQW5kRm9jdXNGcm9tUmFuZ2Uoc2VsLCBzZWwuX3Jhbmdlc1tzZWwucmFuZ2VDb3VudCAtIDFdLCBmYWxzZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFJhbmdlVG9Db250cm9sU2VsZWN0aW9uIChzZWwsIHJhbmdlKSB7XG4gIHZhciBjb250cm9sUmFuZ2UgPSBzZWwuX3NlbGVjdGlvbi5jcmVhdGVSYW5nZSgpO1xuICB2YXIgcmFuZ2VFbGVtZW50ID0gZ2V0U2luZ2xlRWxlbWVudEZyb21SYW5nZShyYW5nZSk7XG4gIHZhciBuZXdDb250cm9sUmFuZ2UgPSBib2R5LmNyZWF0ZUNvbnRyb2xSYW5nZSgpO1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gY29udHJvbFJhbmdlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgbmV3Q29udHJvbFJhbmdlLmFkZChjb250cm9sUmFuZ2UuaXRlbShpKSk7XG4gIH1cbiAgdHJ5IHtcbiAgICBuZXdDb250cm9sUmFuZ2UuYWRkKHJhbmdlRWxlbWVudCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2FkZFJhbmdlKCk6IEVsZW1lbnQgY291bGQgbm90IGJlIGFkZGVkIHRvIGNvbnRyb2wgc2VsZWN0aW9uJyk7XG4gIH1cbiAgbmV3Q29udHJvbFJhbmdlLnNlbGVjdCgpO1xuICB1cGRhdGVDb250cm9sU2VsZWN0aW9uKHNlbCk7XG59XG5cbmZ1bmN0aW9uIGlzU2FtZVJhbmdlIChsZWZ0LCByaWdodCkge1xuICByZXR1cm4gKFxuICAgIGxlZnQuc3RhcnRDb250YWluZXIgPT09IHJpZ2h0LnN0YXJ0Q29udGFpbmVyICYmXG4gICAgbGVmdC5zdGFydE9mZnNldCA9PT0gcmlnaHQuc3RhcnRPZmZzZXQgJiZcbiAgICBsZWZ0LmVuZENvbnRhaW5lciA9PT0gcmlnaHQuZW5kQ29udGFpbmVyICYmXG4gICAgbGVmdC5lbmRPZmZzZXQgPT09IHJpZ2h0LmVuZE9mZnNldFxuICApO1xufVxuXG5mdW5jdGlvbiBpc0FuY2VzdG9yT2YgKGFuY2VzdG9yLCBkZXNjZW5kYW50KSB7XG4gIHZhciBub2RlID0gZGVzY2VuZGFudDtcbiAgd2hpbGUgKG5vZGUucGFyZW50Tm9kZSkge1xuICAgIGlmIChub2RlLnBhcmVudE5vZGUgPT09IGFuY2VzdG9yKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGdldFNlbGVjdGlvbiAoKSB7XG4gIHJldHVybiBuZXcgR2V0U2VsZWN0aW9uKGdsb2JhbC5kb2N1bWVudC5zZWxlY3Rpb24pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNlbGVjdGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gaXNIb3N0TWV0aG9kIChob3N0LCBwcm9wKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIGhvc3RbcHJvcF07XG4gIHJldHVybiB0eXBlID09PSAnZnVuY3Rpb24nIHx8ICEhKHR5cGUgPT09ICdvYmplY3QnICYmIGhvc3RbcHJvcF0pIHx8IHR5cGUgPT09ICd1bmtub3duJztcbn1cblxuZnVuY3Rpb24gaXNIb3N0UHJvcGVydHkgKGhvc3QsIHByb3ApIHtcbiAgcmV0dXJuIHR5cGVvZiBob3N0W3Byb3BdICE9PSAndW5kZWZpbmVkJztcbn1cblxuZnVuY3Rpb24gbWFueSAoZm4pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGFyZUhvc3RlZCAoaG9zdCwgcHJvcHMpIHtcbiAgICB2YXIgaSA9IHByb3BzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBpZiAoIWZuKGhvc3QsIHByb3BzW2ldKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbWV0aG9kOiBpc0hvc3RNZXRob2QsXG4gIG1ldGhvZHM6IG1hbnkoaXNIb3N0TWV0aG9kKSxcbiAgcHJvcGVydHk6IGlzSG9zdFByb3BlcnR5LFxuICBwcm9wZXJ0aWVzOiBtYW55KGlzSG9zdFByb3BlcnR5KVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRvYyA9IGdsb2JhbC5kb2N1bWVudDtcbnZhciBib2R5ID0gZG9jLmJvZHk7XG5cbmZ1bmN0aW9uIHJhbmdlVG9UZXh0UmFuZ2UgKHApIHtcbiAgaWYgKHAuY29sbGFwc2VkKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJvdW5kYXJ5VGV4dFJhbmdlKHsgbm9kZTogcC5zdGFydENvbnRhaW5lciwgb2Zmc2V0OiBwLnN0YXJ0T2Zmc2V0IH0sIHRydWUpO1xuICB9XG4gIHZhciBzdGFydFJhbmdlID0gY3JlYXRlQm91bmRhcnlUZXh0UmFuZ2UoeyBub2RlOiBwLnN0YXJ0Q29udGFpbmVyLCBvZmZzZXQ6IHAuc3RhcnRPZmZzZXQgfSwgdHJ1ZSk7XG4gIHZhciBlbmRSYW5nZSA9IGNyZWF0ZUJvdW5kYXJ5VGV4dFJhbmdlKHsgbm9kZTogcC5lbmRDb250YWluZXIsIG9mZnNldDogcC5lbmRPZmZzZXQgfSwgZmFsc2UpO1xuICB2YXIgdGV4dFJhbmdlID0gYm9keS5jcmVhdGVUZXh0UmFuZ2UoKTtcbiAgdGV4dFJhbmdlLnNldEVuZFBvaW50KCdTdGFydFRvU3RhcnQnLCBzdGFydFJhbmdlKTtcbiAgdGV4dFJhbmdlLnNldEVuZFBvaW50KCdFbmRUb0VuZCcsIGVuZFJhbmdlKTtcbiAgcmV0dXJuIHRleHRSYW5nZTtcbn1cblxuZnVuY3Rpb24gaXNDaGFyYWN0ZXJEYXRhTm9kZSAobm9kZSkge1xuICB2YXIgdCA9IG5vZGUubm9kZVR5cGU7XG4gIHJldHVybiB0ID09PSAzIHx8IHQgPT09IDQgfHwgdCA9PT0gOCA7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJvdW5kYXJ5VGV4dFJhbmdlIChwLCBzdGFydGluZykge1xuICB2YXIgYm91bmQ7XG4gIHZhciBwYXJlbnQ7XG4gIHZhciBvZmZzZXQgPSBwLm9mZnNldDtcbiAgdmFyIHdvcmtpbmdOb2RlO1xuICB2YXIgY2hpbGROb2RlcztcbiAgdmFyIHJhbmdlID0gYm9keS5jcmVhdGVUZXh0UmFuZ2UoKTtcbiAgdmFyIGRhdGEgPSBpc0NoYXJhY3RlckRhdGFOb2RlKHAubm9kZSk7XG5cbiAgaWYgKGRhdGEpIHtcbiAgICBib3VuZCA9IHAubm9kZTtcbiAgICBwYXJlbnQgPSBib3VuZC5wYXJlbnROb2RlO1xuICB9IGVsc2Uge1xuICAgIGNoaWxkTm9kZXMgPSBwLm5vZGUuY2hpbGROb2RlcztcbiAgICBib3VuZCA9IG9mZnNldCA8IGNoaWxkTm9kZXMubGVuZ3RoID8gY2hpbGROb2Rlc1tvZmZzZXRdIDogbnVsbDtcbiAgICBwYXJlbnQgPSBwLm5vZGU7XG4gIH1cblxuICB3b3JraW5nTm9kZSA9IGRvYy5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gIHdvcmtpbmdOb2RlLmlubmVySFRNTCA9ICcmI2ZlZmY7JztcblxuICBpZiAoYm91bmQpIHtcbiAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHdvcmtpbmdOb2RlLCBib3VuZCk7XG4gIH0gZWxzZSB7XG4gICAgcGFyZW50LmFwcGVuZENoaWxkKHdvcmtpbmdOb2RlKTtcbiAgfVxuXG4gIHJhbmdlLm1vdmVUb0VsZW1lbnRUZXh0KHdvcmtpbmdOb2RlKTtcbiAgcmFuZ2UuY29sbGFwc2UoIXN0YXJ0aW5nKTtcbiAgcGFyZW50LnJlbW92ZUNoaWxkKHdvcmtpbmdOb2RlKTtcblxuICBpZiAoZGF0YSkge1xuICAgIHJhbmdlW3N0YXJ0aW5nID8gJ21vdmVTdGFydCcgOiAnbW92ZUVuZCddKCdjaGFyYWN0ZXInLCBvZmZzZXQpO1xuICB9XG4gIHJldHVybiByYW5nZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByYW5nZVRvVGV4dFJhbmdlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZ2V0U2VsZWN0aW9uID0gcmVxdWlyZSgnLi9nZXRTZWxlY3Rpb24nKTtcbnZhciBzZXRTZWxlY3Rpb24gPSByZXF1aXJlKCcuL3NldFNlbGVjdGlvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2V0OiBnZXRTZWxlY3Rpb24sXG4gIHNldDogc2V0U2VsZWN0aW9uXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZ2V0U2VsZWN0aW9uID0gcmVxdWlyZSgnLi9nZXRTZWxlY3Rpb24nKTtcbnZhciByYW5nZVRvVGV4dFJhbmdlID0gcmVxdWlyZSgnLi9yYW5nZVRvVGV4dFJhbmdlJyk7XG52YXIgZG9jID0gZ2xvYmFsLmRvY3VtZW50O1xuXG5mdW5jdGlvbiBzZXRTZWxlY3Rpb24gKHApIHtcbiAgaWYgKGRvYy5jcmVhdGVSYW5nZSkge1xuICAgIG1vZGVyblNlbGVjdGlvbigpO1xuICB9IGVsc2Uge1xuICAgIG9sZFNlbGVjdGlvbigpO1xuICB9XG5cbiAgZnVuY3Rpb24gbW9kZXJuU2VsZWN0aW9uICgpIHtcbiAgICB2YXIgc2VsID0gZ2V0U2VsZWN0aW9uKCk7XG4gICAgdmFyIHJhbmdlID0gZG9jLmNyZWF0ZVJhbmdlKCk7XG4gICAgaWYgKCFwLnN0YXJ0Q29udGFpbmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChwLmVuZENvbnRhaW5lcikge1xuICAgICAgcmFuZ2Uuc2V0RW5kKHAuZW5kQ29udGFpbmVyLCBwLmVuZE9mZnNldCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJhbmdlLnNldEVuZChwLnN0YXJ0Q29udGFpbmVyLCBwLnN0YXJ0T2Zmc2V0KTtcbiAgICB9XG4gICAgcmFuZ2Uuc2V0U3RhcnQocC5zdGFydENvbnRhaW5lciwgcC5zdGFydE9mZnNldCk7XG4gICAgc2VsLnJlbW92ZUFsbFJhbmdlcygpO1xuICAgIHNlbC5hZGRSYW5nZShyYW5nZSk7XG4gIH1cblxuICBmdW5jdGlvbiBvbGRTZWxlY3Rpb24gKCkge1xuICAgIHJhbmdlVG9UZXh0UmFuZ2UocCkuc2VsZWN0KCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXRTZWxlY3Rpb247XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBnZXQgPSBlYXN5R2V0O1xudmFyIHNldCA9IGVhc3lTZXQ7XG5cbmlmIChkb2N1bWVudC5zZWxlY3Rpb24gJiYgZG9jdW1lbnQuc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKSB7XG4gIGdldCA9IGhhcmRHZXQ7XG4gIHNldCA9IGhhcmRTZXQ7XG59XG5cbmZ1bmN0aW9uIGVhc3lHZXQgKGVsKSB7XG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IGVsLnNlbGVjdGlvblN0YXJ0LFxuICAgIGVuZDogZWwuc2VsZWN0aW9uRW5kXG4gIH07XG59XG5cbmZ1bmN0aW9uIGhhcmRHZXQgKGVsKSB7XG4gIHZhciBhY3RpdmUgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuICBpZiAoYWN0aXZlICE9PSBlbCkge1xuICAgIGVsLmZvY3VzKCk7XG4gIH1cblxuICB2YXIgcmFuZ2UgPSBkb2N1bWVudC5zZWxlY3Rpb24uY3JlYXRlUmFuZ2UoKTtcbiAgdmFyIGJvb2ttYXJrID0gcmFuZ2UuZ2V0Qm9va21hcmsoKTtcbiAgdmFyIG9yaWdpbmFsID0gZWwudmFsdWU7XG4gIHZhciBtYXJrZXIgPSBnZXRVbmlxdWVNYXJrZXIob3JpZ2luYWwpO1xuICB2YXIgcGFyZW50ID0gcmFuZ2UucGFyZW50RWxlbWVudCgpO1xuICBpZiAocGFyZW50ID09PSBudWxsIHx8ICFpbnB1dHMocGFyZW50KSkge1xuICAgIHJldHVybiByZXN1bHQoMCwgMCk7XG4gIH1cbiAgcmFuZ2UudGV4dCA9IG1hcmtlciArIHJhbmdlLnRleHQgKyBtYXJrZXI7XG5cbiAgdmFyIGNvbnRlbnRzID0gZWwudmFsdWU7XG5cbiAgZWwudmFsdWUgPSBvcmlnaW5hbDtcbiAgcmFuZ2UubW92ZVRvQm9va21hcmsoYm9va21hcmspO1xuICByYW5nZS5zZWxlY3QoKTtcblxuICByZXR1cm4gcmVzdWx0KGNvbnRlbnRzLmluZGV4T2YobWFya2VyKSwgY29udGVudHMubGFzdEluZGV4T2YobWFya2VyKSAtIG1hcmtlci5sZW5ndGgpO1xuXG4gIGZ1bmN0aW9uIHJlc3VsdCAoc3RhcnQsIGVuZCkge1xuICAgIGlmIChhY3RpdmUgIT09IGVsKSB7IC8vIGRvbid0IGRpc3J1cHQgcHJlLWV4aXN0aW5nIHN0YXRlXG4gICAgICBpZiAoYWN0aXZlKSB7XG4gICAgICAgIGFjdGl2ZS5mb2N1cygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwuYmx1cigpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geyBzdGFydDogc3RhcnQsIGVuZDogZW5kIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VW5pcXVlTWFya2VyIChjb250ZW50cykge1xuICB2YXIgbWFya2VyO1xuICBkbyB7XG4gICAgbWFya2VyID0gJ0BAbWFya2VyLicgKyBNYXRoLnJhbmRvbSgpICogbmV3IERhdGUoKTtcbiAgfSB3aGlsZSAoY29udGVudHMuaW5kZXhPZihtYXJrZXIpICE9PSAtMSk7XG4gIHJldHVybiBtYXJrZXI7XG59XG5cbmZ1bmN0aW9uIGlucHV0cyAoZWwpIHtcbiAgcmV0dXJuICgoZWwudGFnTmFtZSA9PT0gJ0lOUFVUJyAmJiBlbC50eXBlID09PSAndGV4dCcpIHx8IGVsLnRhZ05hbWUgPT09ICdURVhUQVJFQScpO1xufVxuXG5mdW5jdGlvbiBlYXN5U2V0IChlbCwgcCkge1xuICBlbC5zZWxlY3Rpb25TdGFydCA9IHBhcnNlKGVsLCBwLnN0YXJ0KTtcbiAgZWwuc2VsZWN0aW9uRW5kID0gcGFyc2UoZWwsIHAuZW5kKTtcbn1cblxuZnVuY3Rpb24gaGFyZFNldCAoZWwsIHApIHtcbiAgdmFyIHJhbmdlID0gZWwuY3JlYXRlVGV4dFJhbmdlKCk7XG5cbiAgaWYgKHAuc3RhcnQgPT09ICdlbmQnICYmIHAuZW5kID09PSAnZW5kJykge1xuICAgIHJhbmdlLmNvbGxhcHNlKGZhbHNlKTtcbiAgICByYW5nZS5zZWxlY3QoKTtcbiAgfSBlbHNlIHtcbiAgICByYW5nZS5jb2xsYXBzZSh0cnVlKTtcbiAgICByYW5nZS5tb3ZlRW5kKCdjaGFyYWN0ZXInLCBwYXJzZShlbCwgcC5lbmQpKTtcbiAgICByYW5nZS5tb3ZlU3RhcnQoJ2NoYXJhY3RlcicsIHBhcnNlKGVsLCBwLnN0YXJ0KSk7XG4gICAgcmFuZ2Uuc2VsZWN0KCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyc2UgKGVsLCB2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09ICdlbmQnID8gZWwudmFsdWUubGVuZ3RoIDogdmFsdWUgfHwgMDtcbn1cblxuZnVuY3Rpb24gc2VsbCAoZWwsIHApIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBzZXQoZWwsIHApO1xuICB9XG4gIHJldHVybiBnZXQoZWwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGw7XG4iLCJ2YXIgc2kgPSB0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSAnZnVuY3Rpb24nLCB0aWNrO1xuaWYgKHNpKSB7XG4gIHRpY2sgPSBmdW5jdGlvbiAoZm4pIHsgc2V0SW1tZWRpYXRlKGZuKTsgfTtcbn0gZWxzZSB7XG4gIHRpY2sgPSBmdW5jdGlvbiAoZm4pIHsgc2V0VGltZW91dChmbiwgMCk7IH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGljazsiLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgaXNJbnB1dCA9IHJlcXVpcmUoJy4vaXNJbnB1dCcpO1xyXG52YXIgYmluZGluZ3MgPSB7fTtcclxuXHJcbmZ1bmN0aW9uIGhhcyAoc291cmNlLCB0YXJnZXQpIHtcclxuICB2YXIgYmluZGluZyA9IGJpbmRpbmdzW3NvdXJjZS5pZF07XHJcbiAgcmV0dXJuIGJpbmRpbmcgJiYgYmluZGluZ1t0YXJnZXQuaWRdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbnNlcnQgKHNvdXJjZSwgdGFyZ2V0KSB7XHJcbiAgdmFyIGJpbmRpbmcgPSBiaW5kaW5nc1tzb3VyY2UuaWRdO1xyXG4gIGlmICghYmluZGluZykge1xyXG4gICAgYmluZGluZyA9IGJpbmRpbmdzW3NvdXJjZS5pZF0gPSB7fTtcclxuICB9XHJcbiAgdmFyIGludmFsaWRhdGUgPSBpbnZhbGlkYXRvcih0YXJnZXQpO1xyXG4gIGJpbmRpbmdbdGFyZ2V0LmlkXSA9IGludmFsaWRhdGU7XHJcbiAgc291cmNlLm9uKCdkYXRhJywgaW52YWxpZGF0ZSk7XHJcbiAgc291cmNlLm9uKCdkZXN0cm95ZWQnLCByZW1vdmUuYmluZChudWxsLCBzb3VyY2UsIHRhcmdldCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmUgKHNvdXJjZSwgdGFyZ2V0KSB7XHJcbiAgdmFyIGJpbmRpbmcgPSBiaW5kaW5nc1tzb3VyY2UuaWRdO1xyXG4gIGlmICghYmluZGluZykge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgaW52YWxpZGF0ZSA9IGJpbmRpbmdbdGFyZ2V0LmlkXTtcclxuICBzb3VyY2Uub2ZmKCdkYXRhJywgaW52YWxpZGF0ZSk7XHJcbiAgZGVsZXRlIGJpbmRpbmdbdGFyZ2V0LmlkXTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW52YWxpZGF0b3IgKHRhcmdldCkge1xyXG4gIHJldHVybiBmdW5jdGlvbiBpbnZhbGlkYXRlICgpIHtcclxuICAgIHRhcmdldC5yZWZyZXNoKCk7XHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkIChzb3VyY2UsIHRhcmdldCkge1xyXG4gIGlmIChpc0lucHV0KHRhcmdldC5hc3NvY2lhdGVkKSB8fCBoYXMoc291cmNlLCB0YXJnZXQpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGluc2VydChzb3VyY2UsIHRhcmdldCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGFkZDogYWRkLFxyXG4gIHJlbW92ZTogcmVtb3ZlXHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBjcm9zc3ZlbnQgPSByZXF1aXJlKCdjcm9zc3ZlbnQnKTtcclxudmFyIGVtaXR0ZXIgPSByZXF1aXJlKCdjb250cmEvZW1pdHRlcicpO1xyXG52YXIgZG9tID0gcmVxdWlyZSgnLi9kb20nKTtcclxudmFyIHRleHQgPSByZXF1aXJlKCcuL3RleHQnKTtcclxudmFyIHZhbHVlID0gcmVxdWlyZSgnLi92YWx1ZScpO1xyXG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlJyk7XHJcbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4vY2xvbmUnKTtcclxudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0cycpO1xyXG52YXIgbW9tZW50dW0gPSByZXF1aXJlKCcuL21vbWVudHVtJyk7XHJcbnZhciBjbGFzc2VzID0gcmVxdWlyZSgnLi9jbGFzc2VzJyk7XHJcbnZhciBub29wID0gcmVxdWlyZSgnLi9ub29wJyk7XHJcbnZhciBubztcclxuXHJcbmZ1bmN0aW9uIGNhbGVuZGFyIChjYWxlbmRhck9wdGlvbnMpIHtcclxuICB2YXIgbztcclxuICB2YXIgcmVmO1xyXG4gIHZhciByZWZDYWw7XHJcbiAgdmFyIGNvbnRhaW5lcjtcclxuICB2YXIgcmVuZGVyZWQgPSBmYWxzZTtcclxuXHJcbiAgLy8gZGF0ZSB2YXJpYWJsZXNcclxuICB2YXIgbW9udGhPZmZzZXRBdHRyaWJ1dGUgPSAnZGF0YS1yb21lLW9mZnNldCc7XHJcbiAgdmFyIHdlZWtkYXlzO1xyXG4gIHZhciB3ZWVrZGF5Q291bnQ7XHJcbiAgdmFyIGNhbGVuZGFyTW9udGhzID0gW107XHJcbiAgdmFyIGN1cnJlbnRZZWFyO1xyXG4gIHZhciBsYXN0WWVhcjtcclxuICB2YXIgbGFzdE1vbnRoO1xyXG4gIHZhciBsYXN0RGF5O1xyXG4gIHZhciBsYXN0RGF5RWxlbWVudDtcclxuICB2YXIgZGF0ZXdyYXBwZXI7XHJcbiAgdmFyIGJhY2s7XHJcbiAgdmFyIG5leHQ7XHJcbiAgdmFyIHNob3dZZWFycztcclxuXHJcbiAgLy8gdGltZSB2YXJpYWJsZXNcclxuICB2YXIgc2Vjb25kc0luRGF5ID0gNjAgKiA2MCAqIDI0O1xyXG4gIHZhciB0aW1lO1xyXG4gIHZhciB0aW1lbGlzdDtcclxuXHJcbiAgdmFyIGFwaSA9IGVtaXR0ZXIoe1xyXG4gICAgYXNzb2NpYXRlZDogY2FsZW5kYXJPcHRpb25zLmFzc29jaWF0ZWRcclxuICB9KTtcclxuXHJcbiAgaW5pdCgpO1xyXG4gIHNldFRpbWVvdXQocmVhZHksIDApO1xyXG5cclxuICByZXR1cm4gYXBpO1xyXG5cclxuICBmdW5jdGlvbiBuYXBpICgpIHsgcmV0dXJuIGFwaTsgfVxyXG5cclxuICBmdW5jdGlvbiBpbml0IChpbml0T3B0aW9ucykge1xyXG4gICAgbyA9IGRlZmF1bHRzKGluaXRPcHRpb25zIHx8IGNhbGVuZGFyT3B0aW9ucywgYXBpKTtcclxuICAgIGlmICghY29udGFpbmVyKSB7IGNvbnRhaW5lciA9IGRvbSh7IGNsYXNzTmFtZTogby5zdHlsZXMuY29udGFpbmVyIH0pOyB9XHJcbiAgICB3ZWVrZGF5cyA9IG8ud2Vla2RheUZvcm1hdDtcclxuICAgIHdlZWtkYXlDb3VudCA9IHdlZWtkYXlzLmxlbmd0aDtcclxuICAgIHNob3dZZWFycyA9IG8uc2hvd1llYXJzO1xyXG4gICAgbGFzdE1vbnRoID0gbm87XHJcbiAgICBsYXN0WWVhciA9IG5vO1xyXG4gICAgbGFzdERheSA9IG5vO1xyXG4gICAgbGFzdERheUVsZW1lbnQgPSBubztcclxuICAgIG8uYXBwZW5kVG8uYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcclxuXHJcbiAgICByZW1vdmVDaGlsZHJlbihjb250YWluZXIpO1xyXG4gICAgcmVuZGVyZWQgPSBmYWxzZTtcclxuICAgIHJlZiA9IG8uaW5pdGlhbFZhbHVlID8gby5pbml0aWFsVmFsdWUgOiBtb21lbnR1bS5tb21lbnQoKTtcclxuICAgIHJlZkNhbCA9IHJlZi5jbG9uZSgpO1xyXG5cclxuICAgIGFwaS5iYWNrID0gc3VidHJhY3RNb250aDtcclxuICAgIGFwaS5jb250YWluZXIgPSBjb250YWluZXI7XHJcbiAgICBhcGkuZGVzdHJveWVkID0gZmFsc2U7XHJcbiAgICBhcGkuZGVzdHJveSA9IGRlc3Ryb3kuYmluZChhcGksIGZhbHNlKTtcclxuICAgIGFwaS5lbWl0VmFsdWVzID0gZW1pdFZhbHVlcztcclxuICAgIGFwaS5nZXREYXRlID0gZ2V0RGF0ZTtcclxuICAgIGFwaS5nZXREYXRlU3RyaW5nID0gZ2V0RGF0ZVN0cmluZztcclxuICAgIGFwaS5nZXRNb21lbnQgPSBnZXRNb21lbnQ7XHJcbiAgICBhcGkuaGlkZSA9IGhpZGU7XHJcbiAgICBhcGkubmV4dCA9IGFkZE1vbnRoO1xyXG4gICAgYXBpLm9wdGlvbnMgPSBjaGFuZ2VPcHRpb25zO1xyXG4gICAgYXBpLm9wdGlvbnMucmVzZXQgPSByZXNldE9wdGlvbnM7XHJcbiAgICBhcGkucmVmcmVzaCA9IHJlZnJlc2g7XHJcbiAgICBhcGkucmVzdG9yZSA9IG5hcGk7XHJcbiAgICBhcGkuc2V0VmFsdWUgPSBzZXRWYWx1ZTtcclxuICAgIGFwaS5zaG93ID0gc2hvdztcclxuICAgIGFwaS5uZXh0WWVhciA9IGFkZFllYXI7XHJcbiAgICBhcGkuYmFja1llYXIgPSBzdWJ0cmFjdFllYXI7XHJcblxyXG4gICAgZXZlbnRMaXN0ZW5pbmcoKTtcclxuICAgIHJlYWR5KCk7XHJcblxyXG4gICAgcmV0dXJuIGFwaTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlYWR5ICgpIHtcclxuICAgIGFwaS5lbWl0KCdyZWFkeScsIGNsb25lKG8pKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGRlc3Ryb3kgKHNpbGVudCkge1xyXG4gICAgaWYgKGNvbnRhaW5lciAmJiBjb250YWluZXIucGFyZW50Tm9kZSkge1xyXG4gICAgICBjb250YWluZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChjb250YWluZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvKSB7XHJcbiAgICAgIGV2ZW50TGlzdGVuaW5nKHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkZXN0cm95ZWQgPSBhcGkuZW1pdHRlclNuYXBzaG90KCdkZXN0cm95ZWQnKTtcclxuICAgIGFwaS5iYWNrID0gbm9vcDtcclxuICAgIGFwaS5kZXN0cm95ZWQgPSB0cnVlO1xyXG4gICAgYXBpLmRlc3Ryb3kgPSBuYXBpO1xyXG4gICAgYXBpLmVtaXRWYWx1ZXMgPSBuYXBpO1xyXG4gICAgYXBpLmdldERhdGUgPSBub29wO1xyXG4gICAgYXBpLmdldERhdGVTdHJpbmcgPSBub29wO1xyXG4gICAgYXBpLmdldE1vbWVudCA9IG5vb3A7XHJcbiAgICBhcGkuaGlkZSA9IG5hcGk7XHJcbiAgICBhcGkubmV4dCA9IG5vb3A7XHJcbiAgICBhcGkub3B0aW9ucyA9IG5hcGk7XHJcbiAgICBhcGkub3B0aW9ucy5yZXNldCA9IG5hcGk7XHJcbiAgICBhcGkucmVmcmVzaCA9IG5hcGk7XHJcbiAgICBhcGkucmVzdG9yZSA9IGluaXQ7XHJcbiAgICBhcGkuc2V0VmFsdWUgPSBuYXBpO1xyXG4gICAgYXBpLnNob3cgPSBuYXBpO1xyXG4gICAgYXBpLm9mZigpO1xyXG5cclxuICAgIGlmIChzaWxlbnQgIT09IHRydWUpIHtcclxuICAgICAgZGVzdHJveWVkKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFwaTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGV2ZW50TGlzdGVuaW5nIChyZW1vdmUpIHtcclxuICAgIHZhciBvcCA9IHJlbW92ZSA/ICdyZW1vdmUnIDogJ2FkZCc7XHJcbiAgICAvL2lmIChvLmF1dG9IaWRlT25CbHVyKSB7IGNyb3NzdmVudFtvcF0oZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCAnZm9jdXMnLCBoaWRlT25CbHVyLCB0cnVlKTsgfVxyXG4gICAgaWYgKG8uYXV0b0hpZGVPbkNsaWNrKSB7IGNyb3NzdmVudFtvcF0oZG9jdW1lbnQsICdjbGljaycsIGhpZGVPbkNsaWNrKTsgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY2hhbmdlT3B0aW9ucyAob3B0aW9ucykge1xyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuIGNsb25lKG8pO1xyXG4gICAgfVxyXG4gICAgZGVzdHJveSgpO1xyXG4gICAgaW5pdChvcHRpb25zKTtcclxuICAgIHJldHVybiBhcGk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXNldE9wdGlvbnMgKCkge1xyXG4gICAgcmV0dXJuIGNoYW5nZU9wdGlvbnMoeyBhcHBlbmRUbzogby5hcHBlbmRUbyB9KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlbmRlciAoKSB7XHJcbiAgICBpZiAocmVuZGVyZWQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgcmVuZGVyZWQgPSB0cnVlO1xyXG4gICAgcmVuZGVyRGF0ZXMoKTtcclxuICAgIHJlbmRlclRpbWUoKTtcclxuICAgIGFwaS5lbWl0KCdyZW5kZXInKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlbmRlckRhdGVzICgpIHtcclxuICAgIGlmICghby5kYXRlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaTtcclxuICAgIGNhbGVuZGFyTW9udGhzID0gW107XHJcblxyXG4gICAgZGF0ZXdyYXBwZXIgPSBkb20oeyBjbGFzc05hbWU6IG8uc3R5bGVzLmRhdGUsIHBhcmVudDogY29udGFpbmVyIH0pO1xyXG5cclxuICAgIHJlbmRlclllYXIoZGF0ZXdyYXBwZXIpO1xyXG5cclxuICAgIGZvciAoaSA9IDA7IGkgPCBvLm1vbnRoc0luQ2FsZW5kYXI7IGkrKykge1xyXG4gICAgICByZW5kZXJNb250aChpKTtcclxuICAgIH1cclxuXHJcbiAgICBjcm9zc3ZlbnQuYWRkKGJhY2ssICdjbGljaycsIHN1YnRyYWN0TW9udGgpO1xyXG4gICAgY3Jvc3N2ZW50LmFkZChuZXh0LCAnY2xpY2snLCBhZGRNb250aCk7XHJcbiAgICBjcm9zc3ZlbnQuYWRkKGRhdGV3cmFwcGVyLCAnY2xpY2snLCBwaWNrRGF5KTtcclxuXHJcbiAgICBmdW5jdGlvbiByZW5kZXJNb250aCAoaSkge1xyXG4gICAgICB2YXIgbW9udGggPSBkb20oeyBjbGFzc05hbWU6IG8uc3R5bGVzLm1vbnRoLCBwYXJlbnQ6IGRhdGV3cmFwcGVyIH0pO1xyXG4gICAgICBpZiAoaSA9PT0gMCkge1xyXG4gICAgICAgIGJhY2sgPSBkb20oeyB0eXBlOiAnYnV0dG9uJywgY2xhc3NOYW1lOiBvLnN0eWxlcy5iYWNrLCBhdHRyaWJ1dGVzOiB7IHR5cGU6ICdidXR0b24nIH0sIHBhcmVudDogbW9udGggfSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGkgPT09IG8ubW9udGhzSW5DYWxlbmRhciAtMSkge1xyXG4gICAgICAgIG5leHQgPSBkb20oeyB0eXBlOiAnYnV0dG9uJywgY2xhc3NOYW1lOiBvLnN0eWxlcy5uZXh0LCBhdHRyaWJ1dGVzOiB7IHR5cGU6ICdidXR0b24nIH0sIHBhcmVudDogbW9udGggfSk7XHJcbiAgICAgIH1cclxuICAgICAgdmFyIGxhYmVsID0gZG9tKHsgY2xhc3NOYW1lOiBvLnN0eWxlcy5tb250aExhYmVsLCBwYXJlbnQ6IG1vbnRoIH0pO1xyXG4gICAgICB2YXIgZGF0ZSA9IGRvbSh7IHR5cGU6ICd0YWJsZScsIGNsYXNzTmFtZTogby5zdHlsZXMuZGF5VGFibGUsIHBhcmVudDogbW9udGggfSk7XHJcbiAgICAgIHZhciBkYXRlaGVhZCA9IGRvbSh7IHR5cGU6ICd0aGVhZCcsIGNsYXNzTmFtZTogby5zdHlsZXMuZGF5SGVhZCwgcGFyZW50OiBkYXRlIH0pO1xyXG4gICAgICB2YXIgZGF0ZWhlYWRyb3cgPSBkb20oeyB0eXBlOiAndHInLCBjbGFzc05hbWU6IG8uc3R5bGVzLmRheVJvdywgcGFyZW50OiBkYXRlaGVhZCB9KTtcclxuICAgICAgdmFyIGRhdGVib2R5ID0gZG9tKHsgdHlwZTogJ3Rib2R5JywgY2xhc3NOYW1lOiBvLnN0eWxlcy5kYXlCb2R5LCBwYXJlbnQ6IGRhdGUgfSk7XHJcbiAgICAgIHZhciBqO1xyXG5cclxuICAgICAgZm9yIChqID0gMDsgaiA8IHdlZWtkYXlDb3VudDsgaisrKSB7XHJcbiAgICAgICAgZG9tKHsgdHlwZTogJ3RoJywgY2xhc3NOYW1lOiBvLnN0eWxlcy5kYXlIZWFkRWxlbSwgcGFyZW50OiBkYXRlaGVhZHJvdywgdGV4dDogd2Vla2RheXNbd2Vla2RheShqKV0gfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGRhdGVib2R5LnNldEF0dHJpYnV0ZShtb250aE9mZnNldEF0dHJpYnV0ZSwgaSk7XHJcbiAgICAgIGNhbGVuZGFyTW9udGhzLnB1c2goe1xyXG4gICAgICAgIGxhYmVsOiBsYWJlbCxcclxuICAgICAgICBib2R5OiBkYXRlYm9keVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlbmRlclllYXIgKHBhcmVudCkge1xyXG4gICAgaWYoIW8uc2hvd1llYXJzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciB5ID0gcmVmLnllYXIoKTtcclxuICAgIHZhciB5ZWFyV3JhcHBlciA9IGRvbSh7IGNsYXNzTmFtZTogby5zdHlsZXMueWVhciwgcGFyZW50OiBwYXJlbnR9KTtcclxuXHJcbiAgICBiYWNrID0gZG9tKHsgdHlwZTogJ2J1dHRvbicsIGNsYXNzTmFtZTogby5zdHlsZXMuYmFjaywgYXR0cmlidXRlczogeyB0eXBlOiAnYnV0dG9uJyB9LCBwYXJlbnQ6IHllYXJXcmFwcGVyIH0pO1xyXG4gICAgbmV4dCA9IGRvbSh7IHR5cGU6ICdidXR0b24nLCBjbGFzc05hbWU6IG8uc3R5bGVzLm5leHQsIGF0dHJpYnV0ZXM6IHsgdHlwZTogJ2J1dHRvbicgfSwgcGFyZW50OiB5ZWFyV3JhcHBlciB9KTtcclxuXHJcbiAgICBjdXJyZW50WWVhciA9IGRvbSh7IHR5cGU6ICdpbnB1dCcsIGNsYXNzTmFtZTogJ3llYXItaW5wdXQnLCBhdHRyaWJ1dGVzOiB7IHR5cGU6ICdudW1iZXInIH0sIHBhcmVudDogeWVhcldyYXBwZXIgfSk7XHJcblxyXG4gICAgY3Jvc3N2ZW50LmFkZChiYWNrLCAnY2xpY2snLCBzdWJ0cmFjdFllYXIpO1xyXG4gICAgY3Jvc3N2ZW50LmFkZChuZXh0LCAnY2xpY2snLCBhZGRZZWFyKTtcclxuICAgIGNyb3NzdmVudC5hZGQoY3VycmVudFllYXIsICdjaGFuZ2UnLCBzZXRZZWFyKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlbmRlclRpbWUgKCkge1xyXG4gICAgaWYgKCFvLnRpbWUgfHwgIW8udGltZUludGVydmFsKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciB0aW1ld3JhcHBlciA9IGRvbSh7IGNsYXNzTmFtZTogby5zdHlsZXMudGltZSwgcGFyZW50OiBjb250YWluZXIgfSk7XHJcbiAgICB0aW1lID0gZG9tKHsgY2xhc3NOYW1lOiBvLnN0eWxlcy5zZWxlY3RlZFRpbWUsIHBhcmVudDogdGltZXdyYXBwZXIsIHRleHQ6IHJlZi5mb3JtYXQoby50aW1lRm9ybWF0KSB9KTtcclxuICAgIGNyb3NzdmVudC5hZGQodGltZSwgJ2NsaWNrJywgdG9nZ2xlVGltZUxpc3QpO1xyXG4gICAgdGltZWxpc3QgPSBkb20oeyBjbGFzc05hbWU6IG8uc3R5bGVzLnRpbWVMaXN0LCBwYXJlbnQ6IHRpbWV3cmFwcGVyIH0pO1xyXG4gICAgY3Jvc3N2ZW50LmFkZCh0aW1lbGlzdCwgJ2NsaWNrJywgcGlja1RpbWUpO1xyXG4gICAgdmFyIG5leHQgPSBtb21lbnR1bS5tb21lbnQoJzAwOjAwOjAwJywgJ0hIOm1tOnNzJyk7XHJcbiAgICB2YXIgbGF0ZXN0ID0gbmV4dC5jbG9uZSgpLmFkZCgxLCAnZGF5cycpO1xyXG4gICAgd2hpbGUgKG5leHQuaXNCZWZvcmUobGF0ZXN0KSkge1xyXG4gICAgICBkb20oeyBjbGFzc05hbWU6IG8uc3R5bGVzLnRpbWVPcHRpb24sIHBhcmVudDogdGltZWxpc3QsIHRleHQ6IG5leHQuZm9ybWF0KG8udGltZUZvcm1hdCkgfSk7XHJcbiAgICAgIG5leHQuYWRkKG8udGltZUludGVydmFsLCAnc2Vjb25kcycpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gd2Vla2RheSAoaW5kZXgsIGJhY2t3YXJkcykge1xyXG4gICAgdmFyIGZhY3RvciA9IGJhY2t3YXJkcyA/IC0xIDogMTtcclxuICAgIHZhciBvZmZzZXQgPSBpbmRleCArIG8ud2Vla1N0YXJ0ICogZmFjdG9yO1xyXG4gICAgaWYgKG9mZnNldCA+PSB3ZWVrZGF5Q291bnQgfHwgb2Zmc2V0IDwgMCkge1xyXG4gICAgICBvZmZzZXQgKz0gd2Vla2RheUNvdW50ICogLWZhY3RvcjtcclxuICAgIH1cclxuICAgIHJldHVybiBvZmZzZXQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBkaXNwbGF5VmFsaWRUaW1lc09ubHkgKCkge1xyXG4gICAgaWYgKCFvLnRpbWUgfHwgIXJlbmRlcmVkKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciB0aW1lcyA9IHRpbWVsaXN0LmNoaWxkcmVuO1xyXG4gICAgdmFyIGxlbmd0aCA9IHRpbWVzLmxlbmd0aDtcclxuICAgIHZhciBkYXRlO1xyXG4gICAgdmFyIHRpbWU7XHJcbiAgICB2YXIgaXRlbTtcclxuICAgIHZhciBpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGl0ZW0gPSB0aW1lc1tpXTtcclxuICAgICAgdGltZSA9IG1vbWVudHVtLm1vbWVudCh0ZXh0KGl0ZW0pLCBvLnRpbWVGb3JtYXQpO1xyXG4gICAgICBkYXRlID0gc2V0VGltZShyZWYuY2xvbmUoKSwgdGltZSk7XHJcbiAgICAgIGl0ZW0uc3R5bGUuZGlzcGxheSA9IGlzSW5SYW5nZShkYXRlLCBmYWxzZSwgby50aW1lVmFsaWRhdG9yKSA/ICdibG9jaycgOiAnbm9uZSc7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiB0b2dnbGVUaW1lTGlzdCAoc2hvdykge1xyXG4gICAgdmFyIGRpc3BsYXkgPSB0eXBlb2Ygc2hvdyA9PT0gJ2Jvb2xlYW4nID8gc2hvdyA6IHRpbWVsaXN0LnN0eWxlLmRpc3BsYXkgPT09ICdub25lJztcclxuICAgIGlmIChkaXNwbGF5KSB7XHJcbiAgICAgIHNob3dUaW1lTGlzdCgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaGlkZVRpbWVMaXN0KCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzaG93VGltZUxpc3QgKCkgeyBpZiAodGltZWxpc3QpIHsgdGltZWxpc3Quc3R5bGUuZGlzcGxheSA9ICdibG9jayc7IH0gfVxyXG4gIGZ1bmN0aW9uIGhpZGVUaW1lTGlzdCAoKSB7IGlmICh0aW1lbGlzdCkgeyB0aW1lbGlzdC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnOyB9IH1cclxuICBmdW5jdGlvbiBzaG93Q2FsZW5kYXIgKCkgeyBjb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdpbmxpbmUtYmxvY2snOyBhcGkuZW1pdCgnc2hvdycpOyB9XHJcbiAgZnVuY3Rpb24gaGlkZUNhbGVuZGFyICgpIHtcclxuICAgIGlmIChjb250YWluZXIuc3R5bGUuZGlzcGxheSAhPT0gJ25vbmUnKSB7XHJcbiAgICAgIGNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICBhcGkuZW1pdCgnaGlkZScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2hvdyAoKSB7XHJcbiAgICByZW5kZXIoKTtcclxuICAgIHJlZnJlc2goKTtcclxuICAgIHRvZ2dsZVRpbWVMaXN0KCFvLmRhdGUpO1xyXG4gICAgc2hvd0NhbGVuZGFyKCk7XHJcbiAgICByZXR1cm4gYXBpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaGlkZSAoKSB7XHJcbiAgICBoaWRlVGltZUxpc3QoKTtcclxuICAgIHNldFRpbWVvdXQoaGlkZUNhbGVuZGFyLCAwKTtcclxuICAgIHJldHVybiBhcGk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBoaWRlQ29uZGl0aW9uYWxseSAoKSB7XHJcbiAgICBoaWRlVGltZUxpc3QoKTtcclxuXHJcbiAgICB2YXIgcG9zID0gY2xhc3Nlcy5jb250YWlucyhjb250YWluZXIsIG8uc3R5bGVzLnBvc2l0aW9uZWQpO1xyXG4gICAgaWYgKHBvcykge1xyXG4gICAgICBzZXRUaW1lb3V0KGhpZGVDYWxlbmRhciwgMCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXBpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY2FsZW5kYXJFdmVudFRhcmdldCAoZSkge1xyXG4gICAgdmFyIHRhcmdldCA9IGUudGFyZ2V0O1xyXG4gICAgaWYgKHRhcmdldCA9PT0gYXBpLmFzc29jaWF0ZWQpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICB3aGlsZSAodGFyZ2V0KSB7XHJcbiAgICAgIGlmICh0YXJnZXQgPT09IGNvbnRhaW5lcikge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaGlkZU9uQmx1ciAoZSkge1xyXG4gICAgaWYgKGNhbGVuZGFyRXZlbnRUYXJnZXQoZSkpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaGlkZUNvbmRpdGlvbmFsbHkoKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGhpZGVPbkNsaWNrIChlKSB7XHJcbiAgICBpZiAoY2FsZW5kYXJFdmVudFRhcmdldChlKSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBoaWRlQ29uZGl0aW9uYWxseSgpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc3VidHJhY3RNb250aCAoKSB7IGNoYW5nZU1vbnRoKCdzdWJ0cmFjdCcpOyB9XHJcbiAgZnVuY3Rpb24gYWRkTW9udGggKCkgeyBjaGFuZ2VNb250aCgnYWRkJyk7IH1cclxuICBmdW5jdGlvbiBjaGFuZ2VNb250aCAob3ApIHtcclxuICAgIHZhciBib3VuZDtcclxuICAgIHZhciBkaXJlY3Rpb24gPSBvcCA9PT0gJ2FkZCcgPyAtMSA6IDE7XHJcbiAgICB2YXIgb2Zmc2V0ID0gby5tb250aHNJbkNhbGVuZGFyICsgZGlyZWN0aW9uICogZ2V0TW9udGhPZmZzZXQobGFzdERheUVsZW1lbnQpO1xyXG4gICAgcmVmQ2FsW29wXShvZmZzZXQsICdtb250aHMnKTtcclxuICAgIGJvdW5kID0gaW5SYW5nZShyZWZDYWwuY2xvbmUoKSk7XHJcbiAgICByZWYgPSBib3VuZCB8fCByZWY7XHJcbiAgICBpZiAoYm91bmQpIHsgcmVmQ2FsID0gYm91bmQuY2xvbmUoKTsgfVxyXG4gICAgdXBkYXRlKCk7XHJcbiAgICBhcGkuZW1pdChvcCA9PT0gJ2FkZCcgPyAnbmV4dCcgOiAnYmFjaycsIHJlZi5tb250aCgpKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHN1YnRyYWN0WWVhciAoKSB7IGNoYW5nZVllYXIoJ3N1YnRyYWN0Jyk7IH1cclxuICBmdW5jdGlvbiBhZGRZZWFyICgpIHsgY2hhbmdlWWVhcignYWRkJyk7IH1cclxuICBmdW5jdGlvbiBjaGFuZ2VZZWFyIChvcCkge1xyXG4gICAgdmFyIGJvdW5kO1xyXG4gICAgcmVmQ2FsW29wXSgxLCAneWVhcnMnKTtcclxuICAgIGJvdW5kID0gaW5SYW5nZShyZWZDYWwuY2xvbmUoKSk7XHJcbiAgICByZWYgPSBib3VuZCB8fCByZWY7XHJcbiAgICBpZiAoYm91bmQpIHsgcmVmQ2FsID0gYm91bmQuY2xvbmUoKTsgfVxyXG4gICAgdXBkYXRlKCk7XHJcbiAgICBhcGkuZW1pdChvcCA9PT0gJ2FkZCcgPyAnbmV4dFllYXInIDogJ2JhY2tZZWFyJywgcmVmLnllYXIoKSk7XHJcbiAgfVxyXG5cclxuICAvKlxyXG4gICAgaGFjayB0byBhbGxvdyBkaXJlY3QgbWFuaXB1bGF0aW9uIG9mIHRoZSB5ZWFyXHJcbiAgICB3aWxsIG5vdCBjaGVjayBmb3IgdmFsaWQgYm91bmRzXHJcbiAgKi9cclxuICBmdW5jdGlvbiBzZXRZZWFyKCBldnQgKSB7XHJcbiAgICB2YXIgeWVhciA9IGV2dC50YXJnZXQudmFsdWU7XHJcbiAgICB2YXIgeWVhckFzTnVtYmVyID0gZXZ0LnRhcmdldC52YWx1ZUFzTnVtYmVyO1xyXG4gICAgaWYoIHllYXIubGVuZ3RoID09PSA0ICYmIHllYXJBc051bWJlciApIHtcclxuICAgICAgcmVmLnllYXIoIHllYXJBc051bWJlciApO1xyXG4gICAgICByZWZDYWwueWVhciggeWVhckFzTnVtYmVyICk7XHJcbiAgICAgIHVwZGF0ZSgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZXZ0LnRhcmdldC52YWx1ZSA9IHJlZkNhbC55ZWFyKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiB1cGRhdGUgKHNpbGVudCkge1xyXG4gICAgdXBkYXRlQ2FsZW5kYXIoKTtcclxuICAgIHVwZGF0ZVRpbWUoKTtcclxuICAgIGlmIChzaWxlbnQgIT09IHRydWUpIHsgZW1pdFZhbHVlcygpOyB9XHJcbiAgICBkaXNwbGF5VmFsaWRUaW1lc09ubHkoKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHVwZGF0ZUNhbGVuZGFyICgpIHtcclxuICAgIGlmICghby5kYXRlIHx8ICFyZW5kZXJlZCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgeSA9IHJlZkNhbC55ZWFyKCk7XHJcbiAgICB2YXIgbSA9IHJlZkNhbC5tb250aCgpO1xyXG4gICAgdmFyIGQgPSByZWZDYWwuZGF0ZSgpO1xyXG4gICAgaWYgKGQgPT09IGxhc3REYXkgJiYgbSA9PT0gbGFzdE1vbnRoICYmIHkgPT09IGxhc3RZZWFyKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBjYW5TdGF5ID0gaXNEaXNwbGF5ZWQoKTtcclxuICAgIGxhc3REYXkgPSByZWZDYWwuZGF0ZSgpO1xyXG4gICAgbGFzdE1vbnRoID0gcmVmQ2FsLm1vbnRoKCk7XHJcbiAgICBsYXN0WWVhciA9IHJlZkNhbC55ZWFyKCk7XHJcbiAgICBpZiAoY2FuU3RheSkgeyB1cGRhdGVDYWxlbmRhclNlbGVjdGlvbigpOyByZXR1cm47IH1cclxuICAgIGlmIChvLnNob3dZZWFycykgeyB1cGRhdGVZZWFyKCk7IH1cclxuICAgIGNhbGVuZGFyTW9udGhzLmZvckVhY2godXBkYXRlTW9udGgpO1xyXG4gICAgcmVuZGVyQWxsRGF5cygpO1xyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZU1vbnRoIChtb250aCwgaSkge1xyXG4gICAgICB2YXIgb2Zmc2V0Q2FsID0gcmVmQ2FsLmNsb25lKCkuYWRkKGksICdtb250aHMnKTtcclxuICAgICAgdmFyIG1vbnRoRm9ybWF0ID0gby5zaG93WWVhcnMgPyBvLm1vbnRoRm9ybWF0LnJlcGxhY2UoLyh5fFl8ICkvZywgJycpIDogby5tb250aEZvcm1hdDtcclxuICAgICAgdGV4dChtb250aC5sYWJlbCwgb2Zmc2V0Q2FsLmZvcm1hdChtb250aEZvcm1hdCkpO1xyXG4gICAgICByZW1vdmVDaGlsZHJlbihtb250aC5ib2R5KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVZZWFyICgpIHtcclxuICAgICAgdmFsdWUoY3VycmVudFllYXIsIGxhc3RZZWFyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHVwZGF0ZUNhbGVuZGFyU2VsZWN0aW9uICgpIHtcclxuICAgIHZhciBkYXkgPSByZWZDYWwuZGF0ZSgpIC0gMTtcclxuICAgIHNlbGVjdERheUVsZW1lbnQoZmFsc2UpO1xyXG4gICAgY2FsZW5kYXJNb250aHMuZm9yRWFjaChmdW5jdGlvbiAoY2FsKSB7XHJcbiAgICAgIHZhciBkYXlzO1xyXG4gICAgICBpZiAoc2FtZUNhbGVuZGFyTW9udGgoY2FsLmRhdGUsIHJlZkNhbCkpIHtcclxuICAgICAgICBkYXlzID0gY2FzdChjYWwuYm9keS5jaGlsZHJlbikubWFwKGFnZ3JlZ2F0ZSk7XHJcbiAgICAgICAgZGF5cyA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGRheXMpLmZpbHRlcihpbnNpZGUpO1xyXG4gICAgICAgIHNlbGVjdERheUVsZW1lbnQoZGF5c1tkYXldKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgZnVuY3Rpb24gY2FzdCAobGlrZSkge1xyXG4gICAgICB2YXIgZGVzdCA9IFtdO1xyXG4gICAgICB2YXIgaTtcclxuICAgICAgZm9yIChpID0gMDsgaSA8IGxpa2UubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBkZXN0LnB1c2gobGlrZVtpXSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGRlc3Q7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWdncmVnYXRlIChjaGlsZCkge1xyXG4gICAgICByZXR1cm4gY2FzdChjaGlsZC5jaGlsZHJlbik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW5zaWRlIChjaGlsZCkge1xyXG4gICAgICByZXR1cm4gIWNsYXNzZXMuY29udGFpbnMoY2hpbGQsIG8uc3R5bGVzLmRheVByZXZNb250aCkgJiZcclxuICAgICAgICAgICAgICFjbGFzc2VzLmNvbnRhaW5zKGNoaWxkLCBvLnN0eWxlcy5kYXlOZXh0TW9udGgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaXNEaXNwbGF5ZWQgKCkge1xyXG4gICAgcmV0dXJuIGNhbGVuZGFyTW9udGhzLnNvbWUobWF0Y2hlcyk7XHJcblxyXG4gICAgZnVuY3Rpb24gbWF0Y2hlcyAoY2FsKSB7XHJcbiAgICAgIGlmICghbGFzdFllYXIpIHsgcmV0dXJuIGZhbHNlOyB9XHJcbiAgICAgIHJldHVybiBzYW1lQ2FsZW5kYXJNb250aChjYWwuZGF0ZSwgcmVmQ2FsKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVDYWxlbmRhck1vbnRoIChsZWZ0LCByaWdodCkge1xyXG4gICAgcmV0dXJuIGxlZnQgJiYgcmlnaHQgJiYgbGVmdC55ZWFyKCkgPT09IHJpZ2h0LnllYXIoKSAmJiBsZWZ0Lm1vbnRoKCkgPT09IHJpZ2h0Lm1vbnRoKCk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiB1cGRhdGVUaW1lICgpIHtcclxuICAgIGlmICghby50aW1lIHx8ICFyZW5kZXJlZCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0ZXh0KHRpbWUsIHJlZi5mb3JtYXQoby50aW1lRm9ybWF0KSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBlbWl0VmFsdWVzICgpIHtcclxuICAgIGFwaS5lbWl0KCdkYXRhJywgZ2V0RGF0ZVN0cmluZygpKTtcclxuICAgIGFwaS5lbWl0KCd5ZWFyJywgcmVmLnllYXIoKSk7XHJcbiAgICBhcGkuZW1pdCgnbW9udGgnLCByZWYubW9udGgoKSk7XHJcbiAgICBhcGkuZW1pdCgnZGF5JywgcmVmLmRheSgpKTtcclxuICAgIGFwaS5lbWl0KCd0aW1lJywgcmVmLmZvcm1hdChvLnRpbWVGb3JtYXQpKTtcclxuICAgIHJldHVybiBhcGk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZWZyZXNoICgpIHtcclxuICAgIGxhc3RZZWFyID0gZmFsc2U7XHJcbiAgICBsYXN0TW9udGggPSBmYWxzZTtcclxuICAgIGxhc3REYXkgPSBmYWxzZTtcclxuICAgIHVwZGF0ZSh0cnVlKTtcclxuICAgIHJldHVybiBhcGk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzZXRWYWx1ZSAodmFsdWUpIHtcclxuICAgIHZhciBkYXRlID0gcGFyc2UodmFsdWUsIG8uaW5wdXRGb3JtYXQpO1xyXG4gICAgaWYgKGRhdGUgPT09IG51bGwpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgcmVmID0gaW5SYW5nZShkYXRlKSB8fCByZWY7XHJcbiAgICByZWZDYWwgPSByZWYuY2xvbmUoKTtcclxuICAgIHVwZGF0ZSh0cnVlKTtcclxuXHJcbiAgICByZXR1cm4gYXBpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmVtb3ZlQ2hpbGRyZW4gKGVsZW0sIHNlbGYpIHtcclxuICAgIHdoaWxlIChlbGVtICYmIGVsZW0uZmlyc3RDaGlsZCkge1xyXG4gICAgICBlbGVtLnJlbW92ZUNoaWxkKGVsZW0uZmlyc3RDaGlsZCk7XHJcbiAgICB9XHJcbiAgICBpZiAoc2VsZiA9PT0gdHJ1ZSkge1xyXG4gICAgICBlbGVtLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWxlbSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZW5kZXJBbGxEYXlzICgpIHtcclxuICAgIHZhciBpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IG8ubW9udGhzSW5DYWxlbmRhcjsgaSsrKSB7XHJcbiAgICAgIHJlbmRlckRheXMoaSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZW5kZXJEYXlzIChvZmZzZXQpIHtcclxuICAgIHZhciBtb250aCA9IGNhbGVuZGFyTW9udGhzW29mZnNldF07XHJcbiAgICB2YXIgb2Zmc2V0Q2FsID0gcmVmQ2FsLmNsb25lKCkuYWRkKG9mZnNldCwgJ21vbnRocycpO1xyXG4gICAgdmFyIHRvdGFsID0gb2Zmc2V0Q2FsLmRheXNJbk1vbnRoKCk7XHJcbiAgICB2YXIgY3VycmVudCA9IG9mZnNldENhbC5tb250aCgpICE9PSByZWYubW9udGgoKSA/IC0xIDogcmVmLmRhdGUoKTsgLy8gLTEgOiAxLi4zMVxyXG4gICAgdmFyIGZpcnN0ID0gb2Zmc2V0Q2FsLmNsb25lKCkuZGF0ZSgxKTtcclxuICAgIHZhciBmaXJzdERheSA9IHdlZWtkYXkoZmlyc3QuZGF5KCksIHRydWUpOyAvLyAwLi42XHJcbiAgICB2YXIgdHIgPSBkb20oeyB0eXBlOiAndHInLCBjbGFzc05hbWU6IG8uc3R5bGVzLmRheVJvdywgcGFyZW50OiBtb250aC5ib2R5IH0pO1xyXG4gICAgdmFyIHByZXZNb250aCA9IGhpZGRlbldoZW4ob2Zmc2V0ICE9PSAwLCBbby5zdHlsZXMuZGF5Qm9keUVsZW0sIG8uc3R5bGVzLmRheVByZXZNb250aF0pO1xyXG4gICAgdmFyIG5leHRNb250aCA9IGhpZGRlbldoZW4ob2Zmc2V0ICE9PSBvLm1vbnRoc0luQ2FsZW5kYXIgLSAxLCBbby5zdHlsZXMuZGF5Qm9keUVsZW0sIG8uc3R5bGVzLmRheU5leHRNb250aF0pO1xyXG4gICAgdmFyIGRpc2FibGVkID0gby5zdHlsZXMuZGF5RGlzYWJsZWQ7XHJcbiAgICB2YXIgbGFzdERheTtcclxuXHJcbiAgICBwYXJ0KHtcclxuICAgICAgYmFzZTogZmlyc3QuY2xvbmUoKS5zdWJ0cmFjdChmaXJzdERheSwgJ2RheXMnKSxcclxuICAgICAgbGVuZ3RoOiBmaXJzdERheSxcclxuICAgICAgY2VsbDogcHJldk1vbnRoXHJcbiAgICB9KTtcclxuXHJcbiAgICBwYXJ0KHtcclxuICAgICAgYmFzZTogZmlyc3QuY2xvbmUoKSxcclxuICAgICAgbGVuZ3RoOiB0b3RhbCxcclxuICAgICAgY2VsbDogW28uc3R5bGVzLmRheUJvZHlFbGVtXSxcclxuICAgICAgc2VsZWN0YWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcblxyXG4gICAgbGFzdERheSA9IGZpcnN0LmNsb25lKCkuYWRkKHRvdGFsLCAnZGF5cycpO1xyXG5cclxuICAgIHBhcnQoe1xyXG4gICAgICBiYXNlOiBsYXN0RGF5LFxyXG4gICAgICBsZW5ndGg6IHdlZWtkYXlDb3VudCAtIHRyLmNoaWxkcmVuLmxlbmd0aCxcclxuICAgICAgY2VsbDogbmV4dE1vbnRoXHJcbiAgICB9KTtcclxuXHJcbiAgICBiYWNrLmRpc2FibGVkID0gIWlzSW5SYW5nZUxlZnQoZmlyc3QsIHRydWUpO1xyXG4gICAgbmV4dC5kaXNhYmxlZCA9ICFpc0luUmFuZ2VSaWdodChsYXN0RGF5LCB0cnVlKTtcclxuICAgIG1vbnRoLmRhdGUgPSBvZmZzZXRDYWwuY2xvbmUoKTtcclxuXHJcbiAgICBmdW5jdGlvbiBwYXJ0IChkYXRhKSB7XHJcbiAgICAgIHZhciBpLCBkYXksIG5vZGU7XHJcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHRyLmNoaWxkcmVuLmxlbmd0aCA9PT0gd2Vla2RheUNvdW50KSB7XHJcbiAgICAgICAgICB0ciA9IGRvbSh7IHR5cGU6ICd0cicsIGNsYXNzTmFtZTogby5zdHlsZXMuZGF5Um93LCBwYXJlbnQ6IG1vbnRoLmJvZHkgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRheSA9IGRhdGEuYmFzZS5jbG9uZSgpLmFkZChpLCAnZGF5cycpO1xyXG4gICAgICAgIG5vZGUgPSBkb20oe1xyXG4gICAgICAgICAgdHlwZTogJ3RkJyxcclxuICAgICAgICAgIHBhcmVudDogdHIsXHJcbiAgICAgICAgICB0ZXh0OiBkYXkuZm9ybWF0KG8uZGF5Rm9ybWF0KSxcclxuICAgICAgICAgIGNsYXNzTmFtZTogdmFsaWRhdGlvblRlc3QoZGF5LCBkYXRhLmNlbGwuam9pbignICcpLnNwbGl0KCcgJykpLmpvaW4oJyAnKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmIChkYXRhLnNlbGVjdGFibGUgJiYgZGF5LmRhdGUoKSA9PT0gY3VycmVudCkge1xyXG4gICAgICAgICAgc2VsZWN0RGF5RWxlbWVudChub2RlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB2YWxpZGF0aW9uVGVzdCAoZGF5LCBjZWxsKSB7XHJcbiAgICAgIGlmICghaXNJblJhbmdlKGRheSwgdHJ1ZSwgby5kYXRlVmFsaWRhdG9yKSkgeyBjZWxsLnB1c2goZGlzYWJsZWQpOyB9XHJcbiAgICAgIHJldHVybiBjZWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGhpZGRlbldoZW4gKHZhbHVlLCBjZWxsKSB7XHJcbiAgICAgIGlmICh2YWx1ZSkgeyBjZWxsLnB1c2goby5zdHlsZXMuZGF5Q29uY2VhbGVkKTsgfVxyXG4gICAgICByZXR1cm4gY2VsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGlzSW5SYW5nZSAoZGF0ZSwgYWxsZGF5LCB2YWxpZGF0b3IpIHtcclxuICAgIGlmICghaXNJblJhbmdlTGVmdChkYXRlLCBhbGxkYXkpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGlmICghaXNJblJhbmdlUmlnaHQoZGF0ZSwgYWxsZGF5KSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICB2YXIgdmFsaWQgPSAodmFsaWRhdG9yIHx8IEZ1bmN0aW9uLnByb3RvdHlwZSkuY2FsbChhcGksIGRhdGUudG9EYXRlKCkpO1xyXG4gICAgcmV0dXJuIHZhbGlkICE9PSBmYWxzZTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGlzSW5SYW5nZUxlZnQgKGRhdGUsIGFsbGRheSkge1xyXG4gICAgdmFyIG1pbiA9ICFvLm1pbiA/IGZhbHNlIDogKGFsbGRheSA/IG8ubWluLmNsb25lKCkuc3RhcnRPZignZGF5JykgOiBvLm1pbik7XHJcbiAgICByZXR1cm4gIW1pbiB8fCAhZGF0ZS5pc0JlZm9yZShtaW4pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaXNJblJhbmdlUmlnaHQgKGRhdGUsIGFsbGRheSkge1xyXG4gICAgdmFyIG1heCA9ICFvLm1heCA/IGZhbHNlIDogKGFsbGRheSA/IG8ubWF4LmNsb25lKCkuZW5kT2YoJ2RheScpIDogby5tYXgpO1xyXG4gICAgcmV0dXJuICFtYXggfHwgIWRhdGUuaXNBZnRlcihtYXgpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaW5SYW5nZSAoZGF0ZSkge1xyXG4gICAgaWYgKG8ubWluICYmIGRhdGUuaXNCZWZvcmUoby5taW4pKSB7XHJcbiAgICAgIHJldHVybiBpblJhbmdlKG8ubWluLmNsb25lKCkpO1xyXG4gICAgfSBlbHNlIGlmIChvLm1heCAmJiBkYXRlLmlzQWZ0ZXIoby5tYXgpKSB7XHJcbiAgICAgIHJldHVybiBpblJhbmdlKG8ubWF4LmNsb25lKCkpO1xyXG4gICAgfVxyXG4gICAgdmFyIHZhbHVlID0gZGF0ZS5jbG9uZSgpLnN1YnRyYWN0KDEsICdkYXlzJyk7XHJcbiAgICBpZiAodmFsaWRhdGVUb3dhcmRzKHZhbHVlLCBkYXRlLCAnYWRkJykpIHtcclxuICAgICAgcmV0dXJuIGluVGltZVJhbmdlKHZhbHVlKTtcclxuICAgIH1cclxuICAgIHZhbHVlID0gZGF0ZS5jbG9uZSgpO1xyXG4gICAgaWYgKHZhbGlkYXRlVG93YXJkcyh2YWx1ZSwgZGF0ZSwgJ3N1YnRyYWN0JykpIHtcclxuICAgICAgcmV0dXJuIGluVGltZVJhbmdlKHZhbHVlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGluVGltZVJhbmdlICh2YWx1ZSkge1xyXG4gICAgdmFyIGNvcHkgPSB2YWx1ZS5jbG9uZSgpLnN1YnRyYWN0KG8udGltZUludGVydmFsLCAnc2Vjb25kcycpO1xyXG4gICAgdmFyIHRpbWVzID0gTWF0aC5jZWlsKHNlY29uZHNJbkRheSAvIG8udGltZUludGVydmFsKTtcclxuICAgIHZhciBpO1xyXG4gICAgZm9yIChpID0gMDsgaSA8IHRpbWVzOyBpKyspIHtcclxuICAgICAgY29weS5hZGQoby50aW1lSW50ZXJ2YWwsICdzZWNvbmRzJyk7XHJcbiAgICAgIGlmIChjb3B5LmRhdGUoKSA+IHZhbHVlLmRhdGUoKSkge1xyXG4gICAgICAgIGNvcHkuc3VidHJhY3QoMSwgJ2RheXMnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoby50aW1lVmFsaWRhdG9yLmNhbGwoYXBpLCBjb3B5LnRvRGF0ZSgpKSAhPT0gZmFsc2UpIHtcclxuICAgICAgICByZXR1cm4gY29weTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gdmFsaWRhdGVUb3dhcmRzICh2YWx1ZSwgZGF0ZSwgb3ApIHtcclxuICAgIHZhciB2YWxpZCA9IGZhbHNlO1xyXG4gICAgd2hpbGUgKHZhbGlkID09PSBmYWxzZSkge1xyXG4gICAgICB2YWx1ZVtvcF0oMSwgJ2RheXMnKTtcclxuICAgICAgaWYgKHZhbHVlLm1vbnRoKCkgIT09IGRhdGUubW9udGgoKSkge1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICAgIHZhbGlkID0gby5kYXRlVmFsaWRhdG9yLmNhbGwoYXBpLCB2YWx1ZS50b0RhdGUoKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsaWQgIT09IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcGlja0RheSAoZSkge1xyXG4gICAgdmFyIHRhcmdldCA9IGUudGFyZ2V0O1xyXG4gICAgaWYgKGNsYXNzZXMuY29udGFpbnModGFyZ2V0LCBvLnN0eWxlcy5kYXlEaXNhYmxlZCkgfHwgIWNsYXNzZXMuY29udGFpbnModGFyZ2V0LCBvLnN0eWxlcy5kYXlCb2R5RWxlbSkpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdmFyIGRheSA9IHBhcnNlSW50KHRleHQodGFyZ2V0KSwgMTApO1xyXG4gICAgdmFyIHByZXYgPSBjbGFzc2VzLmNvbnRhaW5zKHRhcmdldCwgby5zdHlsZXMuZGF5UHJldk1vbnRoKTtcclxuICAgIHZhciBuZXh0ID0gY2xhc3Nlcy5jb250YWlucyh0YXJnZXQsIG8uc3R5bGVzLmRheU5leHRNb250aCk7XHJcbiAgICB2YXIgb2Zmc2V0ID0gZ2V0TW9udGhPZmZzZXQodGFyZ2V0KSAtIGdldE1vbnRoT2Zmc2V0KGxhc3REYXlFbGVtZW50KTtcclxuICAgIHJlZi5hZGQob2Zmc2V0LCAnbW9udGhzJyk7XHJcbiAgICBpZiAocHJldiB8fCBuZXh0KSB7XHJcbiAgICAgIHJlZi5hZGQocHJldiA/IC0xIDogMSwgJ21vbnRocycpO1xyXG4gICAgfVxyXG4gICAgc2VsZWN0RGF5RWxlbWVudCh0YXJnZXQpO1xyXG4gICAgcmVmLmRhdGUoZGF5KTsgLy8gbXVzdCBydW4gYWZ0ZXIgc2V0dGluZyB0aGUgbW9udGhcclxuICAgIHNldFRpbWUocmVmLCBpblJhbmdlKHJlZikgfHwgcmVmKTtcclxuICAgIHJlZkNhbCA9IHJlZi5jbG9uZSgpO1xyXG4gICAgaWYgKG8uYXV0b0Nsb3NlID09PSB0cnVlKSB7IGhpZGVDb25kaXRpb25hbGx5KCk7IH1cclxuICAgIHVwZGF0ZSgpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2VsZWN0RGF5RWxlbWVudCAobm9kZSkge1xyXG4gICAgaWYgKGxhc3REYXlFbGVtZW50KSB7XHJcbiAgICAgIGNsYXNzZXMucmVtb3ZlKGxhc3REYXlFbGVtZW50LCBvLnN0eWxlcy5zZWxlY3RlZERheSk7XHJcbiAgICB9XHJcbiAgICBpZiAobm9kZSkge1xyXG4gICAgICBjbGFzc2VzLmFkZChub2RlLCBvLnN0eWxlcy5zZWxlY3RlZERheSk7XHJcbiAgICB9XHJcbiAgICBsYXN0RGF5RWxlbWVudCA9IG5vZGU7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXRNb250aE9mZnNldCAoZWxlbSkge1xyXG4gICAgdmFyIG9mZnNldDtcclxuICAgIHdoaWxlIChlbGVtICYmIGVsZW0uZ2V0QXR0cmlidXRlKSB7XHJcbiAgICAgIG9mZnNldCA9IGVsZW0uZ2V0QXR0cmlidXRlKG1vbnRoT2Zmc2V0QXR0cmlidXRlKTtcclxuICAgICAgaWYgKHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KG9mZnNldCwgMTApO1xyXG4gICAgICB9XHJcbiAgICAgIGVsZW0gPSBlbGVtLnBhcmVudE5vZGU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMDtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNldFRpbWUgKHRvLCBmcm9tKSB7XHJcbiAgICB0by5ob3VyKGZyb20uaG91cigpKS5taW51dGUoZnJvbS5taW51dGUoKSkuc2Vjb25kKGZyb20uc2Vjb25kKCkpO1xyXG4gICAgcmV0dXJuIHRvO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcGlja1RpbWUgKGUpIHtcclxuICAgIHZhciB0YXJnZXQgPSBlLnRhcmdldDtcclxuICAgIGlmICghY2xhc3Nlcy5jb250YWlucyh0YXJnZXQsIG8uc3R5bGVzLnRpbWVPcHRpb24pKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciB2YWx1ZSA9IG1vbWVudHVtLm1vbWVudCh0ZXh0KHRhcmdldCksIG8udGltZUZvcm1hdCk7XHJcbiAgICBzZXRUaW1lKHJlZiwgdmFsdWUpO1xyXG4gICAgcmVmQ2FsID0gcmVmLmNsb25lKCk7XHJcbiAgICBlbWl0VmFsdWVzKCk7XHJcbiAgICB1cGRhdGVUaW1lKCk7XHJcbiAgICBpZiAoKCFvLmRhdGUgJiYgby5hdXRvQ2xvc2UgPT09IHRydWUpIHx8IG8uYXV0b0Nsb3NlID09PSAndGltZScpIHtcclxuICAgICAgaGlkZUNvbmRpdGlvbmFsbHkoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGhpZGVUaW1lTGlzdCgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0RGF0ZSAoKSB7XHJcbiAgICByZXR1cm4gcmVmLnRvRGF0ZSgpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0RGF0ZVN0cmluZyAoZm9ybWF0KSB7XHJcbiAgICByZXR1cm4gcmVmLmZvcm1hdChmb3JtYXQgfHwgby5pbnB1dEZvcm1hdCk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXRNb21lbnQgKCkge1xyXG4gICAgcmV0dXJuIHJlZi5jbG9uZSgpO1xyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjYWxlbmRhcjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHRyaW0gPSAvXlxccyt8XFxzKyQvZztcclxudmFyIHdoaXRlc3BhY2UgPSAvXFxzKy87XHJcblxyXG5mdW5jdGlvbiBjbGFzc2VzIChub2RlKSB7XHJcbiAgcmV0dXJuIG5vZGUuY2xhc3NOYW1lLnJlcGxhY2UodHJpbSwgJycpLnNwbGl0KHdoaXRlc3BhY2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXQgKG5vZGUsIHZhbHVlKSB7XHJcbiAgbm9kZS5jbGFzc05hbWUgPSB2YWx1ZS5qb2luKCcgJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZCAobm9kZSwgdmFsdWUpIHtcclxuICB2YXIgdmFsdWVzID0gcmVtb3ZlKG5vZGUsIHZhbHVlKTtcclxuICB2YWx1ZXMucHVzaCh2YWx1ZSk7XHJcbiAgc2V0KG5vZGUsIHZhbHVlcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZSAobm9kZSwgdmFsdWUpIHtcclxuICB2YXIgdmFsdWVzID0gY2xhc3Nlcyhub2RlKTtcclxuICB2YXIgaSA9IHZhbHVlcy5pbmRleE9mKHZhbHVlKTtcclxuICBpZiAoaSAhPT0gLTEpIHtcclxuICAgIHZhbHVlcy5zcGxpY2UoaSwgMSk7XHJcbiAgICBzZXQobm9kZSwgdmFsdWVzKTtcclxuICB9XHJcbiAgcmV0dXJuIHZhbHVlcztcclxufVxyXG5cclxuZnVuY3Rpb24gY29udGFpbnMgKG5vZGUsIHZhbHVlKSB7XHJcbiAgcmV0dXJuIGNsYXNzZXMobm9kZSkuaW5kZXhPZih2YWx1ZSkgIT09IC0xO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBhZGQ6IGFkZCxcclxuICByZW1vdmU6IHJlbW92ZSxcclxuICBjb250YWluczogY29udGFpbnNcclxufTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIG1vbWVudHVtID0gcmVxdWlyZSgnLi9tb21lbnR1bScpO1xyXG5cclxuLy8gbmHDr3ZlIGltcGxlbWVudGF0aW9uLCBzcGVjaWZpY2FsbHkgbWVhbnQgdG8gY2xvbmUgYG9wdGlvbnNgIG9iamVjdHNcclxuZnVuY3Rpb24gY2xvbmUgKHRoaW5nKSB7XHJcbiAgdmFyIGNvcHkgPSB7fTtcclxuICB2YXIgdmFsdWU7XHJcblxyXG4gIGZvciAodmFyIGtleSBpbiB0aGluZykge1xyXG4gICAgdmFsdWUgPSB0aGluZ1trZXldO1xyXG5cclxuICAgIGlmICghdmFsdWUpIHtcclxuICAgICAgY29weVtrZXldID0gdmFsdWU7XHJcbiAgICB9IGVsc2UgaWYgKG1vbWVudHVtLmlzTW9tZW50KHZhbHVlKSkge1xyXG4gICAgICBjb3B5W2tleV0gPSB2YWx1ZS5jbG9uZSgpO1xyXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5faXNTdHlsZXNDb25maWd1cmF0aW9uKSB7XHJcbiAgICAgIGNvcHlba2V5XSA9IGNsb25lKHZhbHVlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvcHlba2V5XSA9IHZhbHVlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGNvcHk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY2xvbmU7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBpbmRleCA9IHJlcXVpcmUoJy4vaW5kZXgnKTtcclxudmFyIGlucHV0ID0gcmVxdWlyZSgnLi9pbnB1dCcpO1xyXG52YXIgaW5saW5lID0gcmVxdWlyZSgnLi9pbmxpbmUnKTtcclxudmFyIGlzSW5wdXQgPSByZXF1aXJlKCcuL2lzSW5wdXQnKTtcclxuXHJcbmZ1bmN0aW9uIGNvcmUgKGVsZW0sIG9wdGlvbnMpIHtcclxuICB2YXIgY2FsO1xyXG4gIHZhciBleGlzdGluZyA9IGluZGV4LmZpbmQoZWxlbSk7XHJcbiAgaWYgKGV4aXN0aW5nKSB7XHJcbiAgICByZXR1cm4gZXhpc3Rpbmc7XHJcbiAgfVxyXG5cclxuICBpZiAoaXNJbnB1dChlbGVtKSkge1xyXG4gICAgY2FsID0gaW5wdXQoZWxlbSwgb3B0aW9ucyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGNhbCA9IGlubGluZShlbGVtLCBvcHRpb25zKTtcclxuICB9XHJcbiAgaW5kZXguYXNzaWduKGVsZW0sIGNhbCk7XHJcblxyXG4gIHJldHVybiBjYWw7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY29yZTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpO1xyXG52YXIgaXNJbnB1dCA9IHJlcXVpcmUoJy4vaXNJbnB1dCcpO1xyXG52YXIgbW9tZW50dW0gPSByZXF1aXJlKCcuL21vbWVudHVtJyk7XHJcblxyXG5mdW5jdGlvbiBkZWZhdWx0cyAob3B0aW9ucywgY2FsKSB7XHJcbiAgdmFyIHRlbXA7XHJcbiAgdmFyIG5vO1xyXG4gIHZhciBvID0gb3B0aW9ucyB8fCB7fTtcclxuICBpZiAoby5hdXRvSGlkZU9uQ2xpY2sgPT09IG5vKSB7IG8uYXV0b0hpZGVPbkNsaWNrID0gdHJ1ZTsgfVxyXG4gIGlmIChvLmF1dG9IaWRlT25CbHVyID09PSBubykgeyBvLmF1dG9IaWRlT25CbHVyID0gdHJ1ZTsgfVxyXG4gIGlmIChvLmF1dG9DbG9zZSA9PT0gbm8pIHsgby5hdXRvQ2xvc2UgPSB0cnVlOyB9XHJcbiAgaWYgKG8uYXBwZW5kVG8gPT09IG5vKSB7IG8uYXBwZW5kVG8gPSBkb2N1bWVudC5ib2R5OyB9XHJcbiAgaWYgKG8uYXBwZW5kVG8gPT09ICdwYXJlbnQnKSB7XHJcbiAgICBpZiAoaXNJbnB1dChjYWwuYXNzb2NpYXRlZCkpIHtcclxuICAgICAgby5hcHBlbmRUbyA9IGNhbC5hc3NvY2lhdGVkLnBhcmVudE5vZGU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lubGluZSBjYWxlbmRhcnMgbXVzdCBiZSBhcHBlbmRlZCB0byBhIHBhcmVudCBub2RlIGV4cGxpY2l0bHkuJyk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmIChvLmludmFsaWRhdGUgPT09IG5vKSB7IG8uaW52YWxpZGF0ZSA9IHRydWU7IH1cclxuICBpZiAoby5yZXF1aXJlZCA9PT0gbm8pIHsgby5yZXF1aXJlZCA9IGZhbHNlOyB9XHJcbiAgaWYgKG8uZGF0ZSA9PT0gbm8pIHsgby5kYXRlID0gdHJ1ZTsgfVxyXG4gIGlmIChvLnRpbWUgPT09IG5vKSB7IG8udGltZSA9IHRydWU7IH1cclxuICBpZiAoby5kYXRlID09PSBmYWxzZSAmJiBvLnRpbWUgPT09IGZhbHNlKSB7IHRocm93IG5ldyBFcnJvcignQXQgbGVhc3Qgb25lIG9mIGBkYXRlYCBvciBgdGltZWAgbXVzdCBiZSBgdHJ1ZWAuJyk7IH1cclxuICBpZiAoby5pbnB1dEZvcm1hdCA9PT0gbm8pIHtcclxuICAgIGlmIChvLmRhdGUgJiYgby50aW1lKSB7XHJcbiAgICAgIG8uaW5wdXRGb3JtYXQgPSAnWVlZWS1NTS1ERCBISDptbSc7XHJcbiAgICB9IGVsc2UgaWYgKG8uZGF0ZSkge1xyXG4gICAgICBvLmlucHV0Rm9ybWF0ID0gJ1lZWVktTU0tREQnO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgby5pbnB1dEZvcm1hdCA9ICdISDptbSc7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmIChvLmluaXRpYWxWYWx1ZSA9PT0gbm8pIHtcclxuICAgIG8uaW5pdGlhbFZhbHVlID0gbnVsbDtcclxuICB9IGVsc2Uge1xyXG4gICAgby5pbml0aWFsVmFsdWUgPSBwYXJzZShvLmluaXRpYWxWYWx1ZSwgby5pbnB1dEZvcm1hdCk7XHJcbiAgfVxyXG4gIGlmIChvLm1pbiA9PT0gbm8pIHsgby5taW4gPSBudWxsOyB9IGVsc2UgeyBvLm1pbiA9IHBhcnNlKG8ubWluLCBvLmlucHV0Rm9ybWF0KTsgfVxyXG4gIGlmIChvLm1heCA9PT0gbm8pIHsgby5tYXggPSBudWxsOyB9IGVsc2UgeyBvLm1heCA9IHBhcnNlKG8ubWF4LCBvLmlucHV0Rm9ybWF0KTsgfVxyXG4gIGlmIChvLnRpbWVJbnRlcnZhbCA9PT0gbm8pIHsgby50aW1lSW50ZXJ2YWwgPSA2MCAqIDMwOyB9IC8vIDMwIG1pbnV0ZXMgYnkgZGVmYXVsdFxyXG4gIGlmIChvLm1pbiAmJiBvLm1heCkge1xyXG4gICAgaWYgKG8ubWF4LmlzQmVmb3JlKG8ubWluKSkge1xyXG4gICAgICB0ZW1wID0gby5tYXg7XHJcbiAgICAgIG8ubWF4ID0gby5taW47XHJcbiAgICAgIG8ubWluID0gdGVtcDtcclxuICAgIH1cclxuICAgIGlmIChvLmRhdGUgPT09IHRydWUpIHtcclxuICAgICAgaWYgKG8ubWF4LmNsb25lKCkuc3VidHJhY3QoMSwgJ2RheXMnKS5pc0JlZm9yZShvLm1pbikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BtYXhgIG11c3QgYmUgYXQgbGVhc3Qgb25lIGRheSBhZnRlciBgbWluYCcpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKG8udGltZUludGVydmFsICogMTAwMCAtIG8ubWluICUgKG8udGltZUludGVydmFsICogMTAwMCkgPiBvLm1heCAtIG8ubWluKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignYG1pbmAgdG8gYG1heGAgcmFuZ2UgbXVzdCBhbGxvdyBmb3IgYXQgbGVhc3Qgb25lIHRpbWUgb3B0aW9uIHRoYXQgbWF0Y2hlcyBgdGltZUludGVydmFsYCcpO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoby5kYXRlVmFsaWRhdG9yID09PSBubykgeyBvLmRhdGVWYWxpZGF0b3IgPSBGdW5jdGlvbi5wcm90b3R5cGU7IH1cclxuICBpZiAoby50aW1lVmFsaWRhdG9yID09PSBubykgeyBvLnRpbWVWYWxpZGF0b3IgPSBGdW5jdGlvbi5wcm90b3R5cGU7IH1cclxuICBpZiAoby50aW1lRm9ybWF0ID09PSBubykgeyBvLnRpbWVGb3JtYXQgPSAnSEg6bW0nOyB9XHJcbiAgaWYgKG8ud2Vla1N0YXJ0ID09PSBubykgeyBvLndlZWtTdGFydCA9IG1vbWVudHVtLm1vbWVudCgpLndlZWtkYXkoMCkuZGF5KCk7IH1cclxuICBpZiAoby53ZWVrZGF5Rm9ybWF0ID09PSBubykgeyBvLndlZWtkYXlGb3JtYXQgPSAnbWluJzsgfVxyXG4gIGlmIChvLndlZWtkYXlGb3JtYXQgPT09ICdsb25nJykge1xyXG4gICAgby53ZWVrZGF5Rm9ybWF0ID0gbW9tZW50dW0ubW9tZW50LndlZWtkYXlzKCk7XHJcbiAgfSBlbHNlIGlmIChvLndlZWtkYXlGb3JtYXQgPT09ICdzaG9ydCcpIHtcclxuICAgIG8ud2Vla2RheUZvcm1hdCA9IG1vbWVudHVtLm1vbWVudC53ZWVrZGF5c1Nob3J0KCk7XHJcbiAgfSBlbHNlIGlmIChvLndlZWtkYXlGb3JtYXQgPT09ICdtaW4nKSB7XHJcbiAgICBvLndlZWtkYXlGb3JtYXQgPSBtb21lbnR1bS5tb21lbnQud2Vla2RheXNNaW4oKTtcclxuICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KG8ud2Vla2RheUZvcm1hdCkgfHwgby53ZWVrZGF5Rm9ybWF0Lmxlbmd0aCA8IDcpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignYHdlZWtkYXlzYCBtdXN0IGJlIGBtaW5gLCBgc2hvcnRgLCBvciBgbG9uZ2AnKTtcclxuICB9XHJcbiAgaWYgKG8ubW9udGhzSW5DYWxlbmRhciA9PT0gbm8pIHsgby5tb250aHNJbkNhbGVuZGFyID0gMTsgfVxyXG4gIGlmIChvLm1vbnRoRm9ybWF0ID09PSBubykgeyBvLm1vbnRoRm9ybWF0ID0gJ01NTU0gWVlZWSc7IH1cclxuICBpZiAoby5kYXlGb3JtYXQgPT09IG5vKSB7IG8uZGF5Rm9ybWF0ID0gJ0REJzsgfVxyXG4gIGlmIChvLnNob3dZZWFycyA9PT0gbm8pIHsgby5zaG93WWVhcnMgPSBmYWxzZTsgfVxyXG4gIGlmIChvLnN0eWxlcyA9PT0gbm8pIHsgby5zdHlsZXMgPSB7fTsgfVxyXG5cclxuICBvLnN0eWxlcy5faXNTdHlsZXNDb25maWd1cmF0aW9uID0gdHJ1ZTtcclxuXHJcbiAgdmFyIHN0eWwgPSBvLnN0eWxlcztcclxuICBpZiAoc3R5bC5iYWNrID09PSBubykgeyBzdHlsLmJhY2sgPSAncmQtYmFjayc7IH1cclxuICBpZiAoc3R5bC5jb250YWluZXIgPT09IG5vKSB7IHN0eWwuY29udGFpbmVyID0gJ3JkLWNvbnRhaW5lcic7IH1cclxuICBpZiAoc3R5bC5wb3NpdGlvbmVkID09PSBubykgeyBzdHlsLnBvc2l0aW9uZWQgPSAncmQtY29udGFpbmVyLWF0dGFjaG1lbnQnOyB9XHJcbiAgaWYgKHN0eWwuZGF0ZSA9PT0gbm8pIHsgc3R5bC5kYXRlID0gJ3JkLWRhdGUnOyB9XHJcbiAgaWYgKHN0eWwuZGF5Qm9keSA9PT0gbm8pIHsgc3R5bC5kYXlCb2R5ID0gJ3JkLWRheXMtYm9keSc7IH1cclxuICBpZiAoc3R5bC5kYXlCb2R5RWxlbSA9PT0gbm8pIHsgc3R5bC5kYXlCb2R5RWxlbSA9ICdyZC1kYXktYm9keSc7IH1cclxuICBpZiAoc3R5bC5kYXlQcmV2TW9udGggPT09IG5vKSB7IHN0eWwuZGF5UHJldk1vbnRoID0gJ3JkLWRheS1wcmV2LW1vbnRoJzsgfVxyXG4gIGlmIChzdHlsLmRheU5leHRNb250aCA9PT0gbm8pIHsgc3R5bC5kYXlOZXh0TW9udGggPSAncmQtZGF5LW5leHQtbW9udGgnOyB9XHJcbiAgaWYgKHN0eWwuZGF5RGlzYWJsZWQgPT09IG5vKSB7IHN0eWwuZGF5RGlzYWJsZWQgPSAncmQtZGF5LWRpc2FibGVkJzsgfVxyXG4gIGlmIChzdHlsLmRheUNvbmNlYWxlZCA9PT0gbm8pIHsgc3R5bC5kYXlDb25jZWFsZWQgPSAncmQtZGF5LWNvbmNlYWxlZCc7IH1cclxuICBpZiAoc3R5bC5kYXlIZWFkID09PSBubykgeyBzdHlsLmRheUhlYWQgPSAncmQtZGF5cy1oZWFkJzsgfVxyXG4gIGlmIChzdHlsLmRheUhlYWRFbGVtID09PSBubykgeyBzdHlsLmRheUhlYWRFbGVtID0gJ3JkLWRheS1oZWFkJzsgfVxyXG4gIGlmIChzdHlsLmRheVJvdyA9PT0gbm8pIHsgc3R5bC5kYXlSb3cgPSAncmQtZGF5cy1yb3cnOyB9XHJcbiAgaWYgKHN0eWwuZGF5VGFibGUgPT09IG5vKSB7IHN0eWwuZGF5VGFibGUgPSAncmQtZGF5cyc7IH1cclxuICBpZiAoc3R5bC55ZWFyID09PSBubykgeyBzdHlsLnllYXIgPSAncmQteWVhcic7IH1cclxuICBpZiAoc3R5bC55ZWFyTGFiZWwgPT09IG5vKSB7IHN0eWwueWVhckxhYmVsID0gJ3JkLXllYXItbGFiZWwnOyB9XHJcbiAgaWYgKHN0eWwubW9udGggPT09IG5vKSB7IHN0eWwubW9udGggPSAncmQtbW9udGgnOyB9XHJcbiAgaWYgKHN0eWwubW9udGhMYWJlbCA9PT0gbm8pIHsgc3R5bC5tb250aExhYmVsID0gJ3JkLW1vbnRoLWxhYmVsJzsgfVxyXG4gIGlmIChzdHlsLm5leHQgPT09IG5vKSB7IHN0eWwubmV4dCA9ICdyZC1uZXh0JzsgfVxyXG4gIGlmIChzdHlsLnNlbGVjdGVkRGF5ID09PSBubykgeyBzdHlsLnNlbGVjdGVkRGF5ID0gJ3JkLWRheS1zZWxlY3RlZCc7IH1cclxuICBpZiAoc3R5bC5zZWxlY3RlZFRpbWUgPT09IG5vKSB7IHN0eWwuc2VsZWN0ZWRUaW1lID0gJ3JkLXRpbWUtc2VsZWN0ZWQnOyB9XHJcbiAgaWYgKHN0eWwudGltZSA9PT0gbm8pIHsgc3R5bC50aW1lID0gJ3JkLXRpbWUnOyB9XHJcbiAgaWYgKHN0eWwudGltZUxpc3QgPT09IG5vKSB7IHN0eWwudGltZUxpc3QgPSAncmQtdGltZS1saXN0JzsgfVxyXG4gIGlmIChzdHlsLnRpbWVPcHRpb24gPT09IG5vKSB7IHN0eWwudGltZU9wdGlvbiA9ICdyZC10aW1lLW9wdGlvbic7IH1cclxuXHJcbiAgcmV0dXJuIG87XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZGVmYXVsdHM7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIGRvbSAob3B0aW9ucykge1xyXG4gIHZhciBvID0gb3B0aW9ucyB8fCB7fTtcclxuICBpZiAoIW8udHlwZSkgeyBvLnR5cGUgPSAnZGl2JzsgfVxyXG4gIHZhciBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvLnR5cGUpO1xyXG4gIGlmIChvLmNsYXNzTmFtZSkgeyBlbGVtLmNsYXNzTmFtZSA9IG8uY2xhc3NOYW1lOyB9XHJcbiAgaWYgKG8udGV4dCkgeyBlbGVtLmlubmVyVGV4dCA9IGVsZW0udGV4dENvbnRlbnQgPSBvLnRleHQ7IH1cclxuICBpZiAoby5hdHRyaWJ1dGVzKSB7XHJcbiAgICBPYmplY3Qua2V5cyhvLmF0dHJpYnV0ZXMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgIGVsZW0uc2V0QXR0cmlidXRlKGtleSwgby5hdHRyaWJ1dGVzW2tleV0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIGlmIChvLnBhcmVudCkgeyBvLnBhcmVudC5hcHBlbmRDaGlsZChlbGVtKTsgfVxyXG4gIHJldHVybiBlbGVtO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRvbTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG52YXIgbm87XHJcbnZhciBpa2V5ID0gJ2RhdGEtcm9tZS1pZCc7XHJcbnZhciBpbmRleCA9IFtdO1xyXG5cclxuZnVuY3Rpb24gZmluZCAodGhpbmcpIHsgLy8gY2FuIGJlIGEgRE9NIGVsZW1lbnQgb3IgYSBudW1iZXJcclxuICBpZiAodHlwZW9mIHRoaW5nICE9PSAnbnVtYmVyJyAmJiB0aGluZyAmJiB0aGluZy5nZXRBdHRyaWJ1dGUpIHtcclxuICAgIHJldHVybiBmaW5kKHRoaW5nLmdldEF0dHJpYnV0ZShpa2V5KSk7XHJcbiAgfVxyXG4gIHZhciBleGlzdGluZyA9IGluZGV4W3RoaW5nXTtcclxuICBpZiAoZXhpc3RpbmcgIT09IG5vKSB7XHJcbiAgICByZXR1cm4gZXhpc3Rpbmc7XHJcbiAgfVxyXG4gIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ24gKGVsZW0sIGluc3RhbmNlKSB7XHJcbiAgZWxlbS5zZXRBdHRyaWJ1dGUoaWtleSwgaW5zdGFuY2UuaWQgPSBpbmRleC5wdXNoKGluc3RhbmNlKSAtIDEpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBmaW5kOiBmaW5kLFxyXG4gIGFzc2lnbjogYXNzaWduXHJcbn07XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBjYWxlbmRhciA9IHJlcXVpcmUoJy4vY2FsZW5kYXInKTtcclxuXHJcbmZ1bmN0aW9uIGlubGluZSAoZWxlbSwgY2FsZW5kYXJPcHRpb25zKSB7XHJcbiAgdmFyIG8gPSBjYWxlbmRhck9wdGlvbnMgfHwge307XHJcblxyXG4gIG8uYXBwZW5kVG8gPSBlbGVtO1xyXG4gIG8uYXNzb2NpYXRlZCA9IGVsZW07XHJcblxyXG4gIHZhciBjYWwgPSBjYWxlbmRhcihvKTtcclxuICBjYWwuc2hvdygpO1xyXG4gIHJldHVybiBjYWw7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gaW5saW5lO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgY3Jvc3N2ZW50ID0gcmVxdWlyZSgnY3Jvc3N2ZW50Jyk7XHJcbnZhciBidWxsc2V5ZSA9IHJlcXVpcmUoJ2J1bGxzZXllJyk7XHJcbnZhciB0aHJvdHRsZSA9IHJlcXVpcmUoJy4vdGhyb3R0bGUnKTtcclxudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xyXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuL2RlZmF1bHRzJyk7XHJcbnZhciBjYWxlbmRhciA9IHJlcXVpcmUoJy4vY2FsZW5kYXInKTtcclxudmFyIG1vbWVudHVtID0gcmVxdWlyZSgnLi9tb21lbnR1bScpO1xyXG52YXIgY2xhc3NlcyA9IHJlcXVpcmUoJy4vY2xhc3NlcycpO1xyXG5cclxudmFyIHN3aXBlRGV0ZWN0ZWQgPSBmYWxzZTtcclxudmFyIHN0YXJ0UG9zID0gbnVsbDtcclxuXHJcbmZ1bmN0aW9uIGlucHV0Q2FsZW5kYXIgKGlucHV0LCBjYWxlbmRhck9wdGlvbnMpIHtcclxuICB2YXIgbyA9IGNhbGVuZGFyT3B0aW9ucyB8fCB7fTtcclxuXHJcbiAgby5hc3NvY2lhdGVkID0gaW5wdXQ7XHJcblxyXG4gIHZhciBhcGkgPSBjYWxlbmRhcihvKTtcclxuICB2YXIgdGhyb3R0bGVkVGFrZUlucHV0ID0gdGhyb3R0bGUodGFrZUlucHV0LCAzMCk7XHJcbiAgdmFyIGlnbm9yZUludmFsaWRhdGlvbjtcclxuICB2YXIgaWdub3JlU2hvdztcclxuICB2YXIgZXllO1xyXG5cclxuICBpbml0KG8pO1xyXG5cclxuICByZXR1cm4gYXBpO1xyXG5cclxuICBmdW5jdGlvbiBpbml0IChpbml0T3B0aW9ucykge1xyXG4gICAgbyA9IGRlZmF1bHRzKGluaXRPcHRpb25zIHx8IG8sIGFwaSk7XHJcblxyXG4gICAgY2xhc3Nlcy5hZGQoYXBpLmNvbnRhaW5lciwgby5zdHlsZXMucG9zaXRpb25lZCk7XHJcbiAgICBjcm9zc3ZlbnQuYWRkKGFwaS5jb250YWluZXIsICdtb3VzZWRvd24nLCBjb250YWluZXJNb3VzZURvd24pO1xyXG5cclxuICAgIGFwaS5nZXREYXRlID0gdW5yZXF1aXJlKGFwaS5nZXREYXRlKTtcclxuICAgIGFwaS5nZXREYXRlU3RyaW5nID0gdW5yZXF1aXJlKGFwaS5nZXREYXRlU3RyaW5nKTtcclxuICAgIGFwaS5nZXRNb21lbnQgPSB1bnJlcXVpcmUoYXBpLmdldE1vbWVudCk7XHJcblxyXG4gICAgaWYgKG8uaW5pdGlhbFZhbHVlKSB7XHJcbiAgICAgIGlucHV0LnZhbHVlID0gby5pbml0aWFsVmFsdWUuZm9ybWF0KG8uaW5wdXRGb3JtYXQpO1xyXG4gICAgfVxyXG5cclxuICAgIGV5ZSA9IGJ1bGxzZXllKGFwaS5jb250YWluZXIsIGlucHV0KTtcclxuICAgIGFwaS5vbignZGF0YScsIHVwZGF0ZUlucHV0KTtcclxuICAgIGFwaS5vbignc2hvdycsIGV5ZS5yZWZyZXNoKTtcclxuXHJcbiAgICBldmVudExpc3RlbmluZygpO1xyXG4gICAgdGhyb3R0bGVkVGFrZUlucHV0KCk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBkZXN0cm95ICgpIHtcclxuICAgIGV2ZW50TGlzdGVuaW5nKHRydWUpO1xyXG4gICAgZXllLmRlc3Ryb3koKTtcclxuICAgIGV5ZSA9IG51bGw7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBldmVudExpc3RlbmluZyAocmVtb3ZlKSB7XHJcbiAgICB2YXIgb3AgPSByZW1vdmUgPyAncmVtb3ZlJyA6ICdhZGQnO1xyXG4gICAgY3Jvc3N2ZW50W29wXShpbnB1dCwgJ2NsaWNrJywgc2hvdyk7XHJcbiAgICBjcm9zc3ZlbnRbb3BdKGlucHV0LCAndG91Y2hzdGFydCcsIHN3aXBlU3RhcnQpO1xyXG4gICAgY3Jvc3N2ZW50W29wXShpbnB1dCwgJ3RvdWNobW92ZScsIHN3aXBlTW92ZSk7XHJcbiAgICBjcm9zc3ZlbnRbb3BdKGlucHV0LCAndG91Y2hlbmQnLCBzaG93KTtcclxuICAgIGNyb3NzdmVudFtvcF0oaW5wdXQsICdmb2N1c2luJywgc2hvdyk7XHJcbiAgICBjcm9zc3ZlbnRbb3BdKGlucHV0LCAnY2hhbmdlJywgdGhyb3R0bGVkVGFrZUlucHV0KTtcclxuICAgIGNyb3NzdmVudFtvcF0oaW5wdXQsICdrZXlwcmVzcycsIHRocm90dGxlZFRha2VJbnB1dCk7XHJcbiAgICBjcm9zc3ZlbnRbb3BdKGlucHV0LCAna2V5ZG93bicsIHRocm90dGxlZFRha2VJbnB1dCk7XHJcbiAgICBjcm9zc3ZlbnRbb3BdKGlucHV0LCAnaW5wdXQnLCB0aHJvdHRsZWRUYWtlSW5wdXQpO1xyXG4gICAgaWYgKG8uaW52YWxpZGF0ZSkgeyBjcm9zc3ZlbnRbb3BdKGlucHV0LCAnYmx1cicsIGludmFsaWRhdGVJbnB1dCk7IH1cclxuXHJcbiAgICBpZiAocmVtb3ZlKSB7XHJcbiAgICAgIGFwaS5vbmNlKCdyZWFkeScsIGluaXQpO1xyXG4gICAgICBhcGkub2ZmKCdkZXN0cm95ZWQnLCBkZXN0cm95KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGFwaS5vZmYoJ3JlYWR5JywgaW5pdCk7XHJcbiAgICAgIGFwaS5vbmNlKCdkZXN0cm95ZWQnLCBkZXN0cm95KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNvbnRhaW5lckNsaWNrICgpIHtcclxuICAgIGlnbm9yZVNob3cgPSB0cnVlO1xyXG4gICAgaW5wdXQuZm9jdXMoKTtcclxuICAgIGlnbm9yZVNob3cgPSBmYWxzZTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNvbnRhaW5lck1vdXNlRG93biAoKSB7XHJcbiAgICBpZ25vcmVJbnZhbGlkYXRpb24gPSB0cnVlO1xyXG4gICAgc2V0VGltZW91dCh1bmlnbm9yZSwgMCk7XHJcblxyXG4gICAgZnVuY3Rpb24gdW5pZ25vcmUgKCkge1xyXG4gICAgICBpZ25vcmVJbnZhbGlkYXRpb24gPSBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGludmFsaWRhdGVJbnB1dCAoKSB7XHJcbiAgICBpZiAoIWlnbm9yZUludmFsaWRhdGlvbiAmJiAhaXNFbXB0eSgpKSB7XHJcbiAgICAgIGFwaS5lbWl0VmFsdWVzKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzd2lwZVN0YXJ0KGV2ZW50KSB7XHJcbiAgICBzd2lwZURldGVjdGVkID0gZmFsc2U7XHJcbiAgICBzdGFydFBvcyA9IHtcclxuICAgICAgcGFnZVg6IGV2ZW50LnRvdWNoZXNbMF0ucGFnZVgsXHJcbiAgICAgIHBhZ2VZOiBldmVudC50b3VjaGVzWzBdLnBhZ2VZXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc3dpcGVNb3ZlIChldmVudCkge1xyXG4gICAgaWYgKE1hdGguYWJzKHN0YXJ0UG9zLnBhZ2VYIC0gZXZlbnQudG91Y2hlc1swXS5wYWdlWCkgPiAxMCB8fCBNYXRoLmFicyhzdGFydFBvcy5wYWdlWSAtIGV2ZW50LnRvdWNoZXNbMF0ucGFnZVkpID4gMTApIHtcclxuICAgICAgc3dpcGVEZXRlY3RlZCA9IHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzaG93ICgpIHtcclxuICAgIGlmIChpZ25vcmVTaG93IHx8IHN3aXBlRGV0ZWN0ZWQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgYXBpLnNob3coKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHRha2VJbnB1dCAoKSB7XHJcbiAgICB2YXIgdmFsdWUgPSBpbnB1dC52YWx1ZS50cmltKCk7XHJcbiAgICBpZiAoaXNFbXB0eSgpKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBkYXRlID0gbW9tZW50dW0ubW9tZW50KHZhbHVlLCBvLmlucHV0Rm9ybWF0LCBvLnN0cmljdFBhcnNlKTtcclxuICAgIGFwaS5zZXRWYWx1ZShkYXRlKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHVwZGF0ZUlucHV0IChkYXRhKSB7XHJcbiAgICBpbnB1dC52YWx1ZSA9IGRhdGE7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBpc0VtcHR5ICgpIHtcclxuICAgIHJldHVybiBvLnJlcXVpcmVkID09PSBmYWxzZSAmJiBpbnB1dC52YWx1ZS50cmltKCkgPT09ICcnO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gdW5yZXF1aXJlIChmbikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG1heWJlICgpIHtcclxuICAgICAgcmV0dXJuIGlzRW1wdHkoKSA/IG51bGwgOiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gaW5wdXRDYWxlbmRhcjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gaXNJbnB1dCAoZWxlbSkge1xyXG4gIHJldHVybiBlbGVtICYmIGVsZW0ubm9kZU5hbWUgJiYgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnaW5wdXQnO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGlzSW5wdXQ7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIGlzTW9tZW50ICh2YWx1ZSkge1xyXG4gIHJldHVybiB2YWx1ZSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodmFsdWUsICdfaXNBTW9tZW50T2JqZWN0Jyk7XHJcbn1cclxuXHJcbnZhciBhcGkgPSB7XHJcbiAgbW9tZW50OiBudWxsLFxyXG4gIGlzTW9tZW50OiBpc01vbWVudFxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBhcGk7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIG5vb3AgKCkge31cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbm9vcDtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIG1vbWVudHVtID0gcmVxdWlyZSgnLi9tb21lbnR1bScpO1xyXG5cclxuZnVuY3Rpb24gcmF3IChkYXRlLCBmb3JtYXQpIHtcclxuICBpZiAodHlwZW9mIGRhdGUgPT09ICdzdHJpbmcnKSB7XHJcbiAgICByZXR1cm4gbW9tZW50dW0ubW9tZW50KGRhdGUsIGZvcm1hdCk7XHJcbiAgfVxyXG4gIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZGF0ZSkgPT09ICdbb2JqZWN0IERhdGVdJykge1xyXG4gICAgcmV0dXJuIG1vbWVudHVtLm1vbWVudChkYXRlKTtcclxuICB9XHJcbiAgaWYgKG1vbWVudHVtLmlzTW9tZW50KGRhdGUpKSB7XHJcbiAgICByZXR1cm4gZGF0ZS5jbG9uZSgpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2UgKGRhdGUsIGZvcm1hdCkge1xyXG4gIHZhciBtID0gcmF3KGRhdGUsIHR5cGVvZiBmb3JtYXQgPT09ICdzdHJpbmcnID8gZm9ybWF0IDogbnVsbCk7XHJcbiAgcmV0dXJuIG0gJiYgbS5pc1ZhbGlkKCkgPyBtIDogbnVsbDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaWYgKCFBcnJheS5wcm90b3R5cGUuZmlsdGVyKSB7XHJcbiAgQXJyYXkucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChmbiwgY3R4KSB7XHJcbiAgICB2YXIgZiA9IFtdO1xyXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh2LCBpLCB0KSB7XHJcbiAgICAgIGlmIChmbi5jYWxsKGN0eCwgdiwgaSwgdCkpIHsgZi5wdXNoKHYpOyB9XHJcbiAgICB9LCBjdHgpO1xyXG4gICAgcmV0dXJuIGY7XHJcbiAgfTtcclxufVxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pZiAoIUFycmF5LnByb3RvdHlwZS5mb3JFYWNoKSB7XHJcbiAgQXJyYXkucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiAoZm4sIGN0eCkge1xyXG4gICAgaWYgKHRoaXMgPT09IHZvaWQgMCB8fCB0aGlzID09PSBudWxsIHx8IHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCk7XHJcbiAgICB9XHJcbiAgICB2YXIgdCA9IHRoaXM7XHJcbiAgICB2YXIgbGVuID0gdC5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgIGlmIChpIGluIHQpIHsgZm4uY2FsbChjdHgsIHRbaV0sIGksIHQpOyB9XHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pZiAoIUFycmF5LnByb3RvdHlwZS5pbmRleE9mKSB7XHJcbiAgQXJyYXkucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiAod2hhdCwgc3RhcnQpIHtcclxuICAgIGlmICh0aGlzID09PSB1bmRlZmluZWQgfHwgdGhpcyA9PT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCk7XHJcbiAgICB9XHJcbiAgICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGg7XHJcbiAgICBzdGFydCA9ICtzdGFydCB8fCAwO1xyXG4gICAgaWYgKE1hdGguYWJzKHN0YXJ0KSA9PT0gSW5maW5pdHkpIHtcclxuICAgICAgc3RhcnQgPSAwO1xyXG4gICAgfSBlbHNlIGlmIChzdGFydCA8IDApIHtcclxuICAgICAgc3RhcnQgKz0gbGVuZ3RoO1xyXG4gICAgICBpZiAoc3RhcnQgPCAwKSB7IHN0YXJ0ID0gMDsgfVxyXG4gICAgfVxyXG4gICAgZm9yICg7IHN0YXJ0IDwgbGVuZ3RoOyBzdGFydCsrKSB7XHJcbiAgICAgIGlmICh0aGlzW3N0YXJ0XSA9PT0gd2hhdCkge1xyXG4gICAgICAgIHJldHVybiBzdGFydDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIC0xO1xyXG4gIH07XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuQXJyYXkuaXNBcnJheSB8fCAoQXJyYXkuaXNBcnJheSA9IGZ1bmN0aW9uIChhKSB7XHJcbiAgcmV0dXJuICcnICsgYSAhPT0gYSAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYSkgPT09ICdbb2JqZWN0IEFycmF5XSc7XHJcbn0pO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5pZiAoIUFycmF5LnByb3RvdHlwZS5tYXApIHtcclxuICBBcnJheS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gKGZuLCBjdHgpIHtcclxuICAgIHZhciBjb250ZXh0LCByZXN1bHQsIGk7XHJcblxyXG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd0aGlzIGlzIG51bGwgb3Igbm90IGRlZmluZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc291cmNlID0gT2JqZWN0KHRoaXMpO1xyXG4gICAgdmFyIGxlbiA9IHNvdXJjZS5sZW5ndGggPj4+IDA7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGZuICsgJyBpcyBub3QgYSBmdW5jdGlvbicpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xyXG4gICAgICBjb250ZXh0ID0gY3R4O1xyXG4gICAgfVxyXG5cclxuICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW4pO1xyXG4gICAgaSA9IDA7XHJcblxyXG4gICAgd2hpbGUgKGkgPCBsZW4pIHtcclxuICAgICAgaWYgKGkgaW4gc291cmNlKSB7XHJcbiAgICAgICAgcmVzdWx0W2ldID0gZm4uY2FsbChjb250ZXh0LCBzb3VyY2VbaV0sIGksIHNvdXJjZSk7XHJcbiAgICAgIH1cclxuICAgICAgaSsrO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9O1xyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmlmICghQXJyYXkucHJvdG90eXBlLnNvbWUpIHtcclxuICBBcnJheS5wcm90b3R5cGUuc29tZSA9IGZ1bmN0aW9uIChmbiwgY3R4KSB7XHJcbiAgICB2YXIgY29udGV4dCwgaTtcclxuXHJcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3RoaXMgaXMgbnVsbCBvciBub3QgZGVmaW5lZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBzb3VyY2UgPSBPYmplY3QodGhpcyk7XHJcbiAgICB2YXIgbGVuID0gc291cmNlLmxlbmd0aCA+Pj4gMDtcclxuXHJcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoZm4gKyAnIGlzIG5vdCBhIGZ1bmN0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcbiAgICAgIGNvbnRleHQgPSBjdHg7XHJcbiAgICB9XHJcblxyXG4gICAgaSA9IDA7XHJcblxyXG4gICAgd2hpbGUgKGkgPCBsZW4pIHtcclxuICAgICAgaWYgKGkgaW4gc291cmNlKSB7XHJcbiAgICAgICAgdmFyIHRlc3QgPSBmbi5jYWxsKGNvbnRleHQsIHNvdXJjZVtpXSwgaSwgc291cmNlKTtcclxuICAgICAgICBpZiAodGVzdCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGkrKztcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9O1xyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmlmICghRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQpIHtcclxuICBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uIChjb250ZXh0KSB7XHJcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgLSB3aGF0IGlzIHRyeWluZyB0byBiZSBib3VuZCBpcyBub3QgY2FsbGFibGUnKTtcclxuICAgIH1cclxuICAgIHZhciBjdXJyaWVkID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcclxuICAgIHZhciBvcmlnaW5hbCA9IHRoaXM7XHJcbiAgICB2YXIgTm9PcCA9IGZ1bmN0aW9uICgpIHt9O1xyXG4gICAgdmFyIGJvdW5kID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgY3R4ID0gdGhpcyBpbnN0YW5jZW9mIE5vT3AgJiYgY29udGV4dCA/IHRoaXMgOiBjb250ZXh0O1xyXG4gICAgICB2YXIgYXJncyA9IGN1cnJpZWQuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xyXG4gICAgICByZXR1cm4gb3JpZ2luYWwuYXBwbHkoY3R4LCBhcmdzKTtcclxuICAgIH07XHJcbiAgICBOb09wLnByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlO1xyXG4gICAgYm91bmQucHJvdG90eXBlID0gbmV3IE5vT3AoKTtcclxuICAgIHJldHVybiBib3VuZDtcclxuICB9O1xyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xyXG52YXIgaGFzRG9udEVudW1CdWcgPSAhKHsgdG9TdHJpbmc6IG51bGwgfSkucHJvcGVydHlJc0VudW1lcmFibGUoJ3RvU3RyaW5nJyk7XHJcbnZhciBkb250RW51bXMgPSBbXHJcbiAgJ3RvU3RyaW5nJyxcclxuICAndG9Mb2NhbGVTdHJpbmcnLFxyXG4gICd2YWx1ZU9mJyxcclxuICAnaGFzT3duUHJvcGVydHknLFxyXG4gICdpc1Byb3RvdHlwZU9mJyxcclxuICAncHJvcGVydHlJc0VudW1lcmFibGUnLFxyXG4gICdjb25zdHJ1Y3RvcidcclxuXTtcclxudmFyIGRvbnRFbnVtc0xlbmd0aCA9IGRvbnRFbnVtcy5sZW5ndGg7XHJcblxyXG5pZiAoIU9iamVjdC5rZXlzKSB7XHJcbiAgT2JqZWN0LmtleXMgPSBmdW5jdGlvbihvYmopIHtcclxuICAgIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyAmJiAodHlwZW9mIG9iaiAhPT0gJ2Z1bmN0aW9uJyB8fCBvYmogPT09IG51bGwpKSB7XHJcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdC5rZXlzIGNhbGxlZCBvbiBub24tb2JqZWN0Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHJlc3VsdCA9IFtdLCBwcm9wLCBpO1xyXG5cclxuICAgIGZvciAocHJvcCBpbiBvYmopIHtcclxuICAgICAgaWYgKGhhc093bi5jYWxsKG9iaiwgcHJvcCkpIHtcclxuICAgICAgICByZXN1bHQucHVzaChwcm9wKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChoYXNEb250RW51bUJ1Zykge1xyXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgZG9udEVudW1zTGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBkb250RW51bXNbaV0pKSB7XHJcbiAgICAgICAgICByZXN1bHQucHVzaChkb250RW51bXNbaV0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9O1xyXG59XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmlmICghU3RyaW5nLnByb3RvdHlwZS50cmltKSB7XHJcbiAgU3RyaW5nLnByb3RvdHlwZS50cmltID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xyXG4gIH07XHJcbn1cclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuLy8gdGhlc2UgYXJlIG9ubHkgcmVxdWlyZWQgZm9yIElFIDwgOVxyXG4vLyBtYXliZSBtb3ZlIHRvIElFLXNwZWNpZmljIGRpc3Rybz9cclxucmVxdWlyZSgnLi9wb2x5ZmlsbHMvZnVuY3Rpb24uYmluZCcpO1xyXG5yZXF1aXJlKCcuL3BvbHlmaWxscy9hcnJheS5mb3JlYWNoJyk7XHJcbnJlcXVpcmUoJy4vcG9seWZpbGxzL2FycmF5Lm1hcCcpO1xyXG5yZXF1aXJlKCcuL3BvbHlmaWxscy9hcnJheS5maWx0ZXInKTtcclxucmVxdWlyZSgnLi9wb2x5ZmlsbHMvYXJyYXkuaXNhcnJheScpO1xyXG5yZXF1aXJlKCcuL3BvbHlmaWxscy9hcnJheS5pbmRleG9mJyk7XHJcbnJlcXVpcmUoJy4vcG9seWZpbGxzL2FycmF5LnNvbWUnKTtcclxucmVxdWlyZSgnLi9wb2x5ZmlsbHMvc3RyaW5nLnRyaW0nKTtcclxucmVxdWlyZSgnLi9wb2x5ZmlsbHMvb2JqZWN0LmtleXMnKTtcclxuXHJcbnZhciBjb3JlID0gcmVxdWlyZSgnLi9jb3JlJyk7XHJcbnZhciBpbmRleCA9IHJlcXVpcmUoJy4vaW5kZXgnKTtcclxudmFyIHVzZSA9IHJlcXVpcmUoJy4vdXNlJyk7XHJcblxyXG5jb3JlLnVzZSA9IHVzZS5iaW5kKGNvcmUpO1xyXG5jb3JlLmZpbmQgPSBpbmRleC5maW5kO1xyXG5jb3JlLnZhbCA9IHJlcXVpcmUoJy4vdmFsaWRhdG9ycycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjb3JlO1xyXG4iLCJ2YXIgcm9tZSA9IHJlcXVpcmUoJy4vcm9tZScpO1xyXG52YXIgbW9tZW50dW0gPSByZXF1aXJlKCcuL21vbWVudHVtJyk7XHJcblxyXG5yb21lLnVzZShnbG9iYWwubW9tZW50KTtcclxuXHJcbmlmIChtb21lbnR1bS5tb21lbnQgPT09IHZvaWQgMCkge1xyXG4gIHRocm93IG5ldyBFcnJvcigncm9tZSBkZXBlbmRzIG9uIG1vbWVudC5qcywgeW91IGNhbiBnZXQgaXQgYXQgaHR0cDovL21vbWVudGpzLmNvbSwgb3IgeW91IGNvdWxkIHVzZSB0aGUgYnVuZGxlZCBkaXN0cmlidXRpb24gZmlsZSBpbnN0ZWFkLicpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHJvbWU7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIHRleHQgKGVsZW0sIHZhbHVlKSB7XHJcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcclxuICAgIGVsZW0uaW5uZXJUZXh0ID0gZWxlbS50ZXh0Q29udGVudCA9IHZhbHVlO1xyXG4gIH1cclxuICByZXR1cm4gZWxlbS5pbm5lclRleHQgfHwgZWxlbS50ZXh0Q29udGVudDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0ZXh0O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRocm90dGxlIChmbiwgYm91bmRhcnkpIHtcclxuICB2YXIgbGFzdCA9IC1JbmZpbml0eTtcclxuICB2YXIgdGltZXI7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uIGJvdW5jZWQgKCkge1xyXG4gICAgaWYgKHRpbWVyKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHVuYm91bmQoKTtcclxuXHJcbiAgICBmdW5jdGlvbiB1bmJvdW5kICgpIHtcclxuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuICAgICAgdGltZXIgPSBudWxsO1xyXG4gICAgICB2YXIgbmV4dCA9IGxhc3QgKyBib3VuZGFyeTtcclxuICAgICAgdmFyIG5vdyA9ICtuZXcgRGF0ZSgpO1xyXG4gICAgICBpZiAobm93ID4gbmV4dCkge1xyXG4gICAgICAgIGxhc3QgPSBub3c7XHJcbiAgICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQodW5ib3VuZCwgbmV4dCAtIG5vdyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgbW9tZW50dW0gPSByZXF1aXJlKCcuL21vbWVudHVtJyk7XHJcblxyXG5mdW5jdGlvbiB1c2UgKG1vbWVudCkge1xyXG4gIHRoaXMubW9tZW50ID0gbW9tZW50dW0ubW9tZW50ID0gbW9tZW50O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHVzZTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGluZGV4ID0gcmVxdWlyZSgnLi9pbmRleCcpO1xyXG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlJyk7XHJcbnZhciBhc3NvY2lhdGlvbiA9IHJlcXVpcmUoJy4vYXNzb2NpYXRpb24nKTtcclxuXHJcbmZ1bmN0aW9uIGNvbXBhcmVCdWlsZGVyIChjb21wYXJlKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uIGZhY3RvcnkgKHZhbHVlKSB7XHJcbiAgICB2YXIgZml4ZWQgPSBwYXJzZSh2YWx1ZSk7XHJcblxyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHZhbGlkYXRlIChkYXRlKSB7XHJcbiAgICAgIHZhciBjYWwgPSBpbmRleC5maW5kKHZhbHVlKTtcclxuICAgICAgdmFyIGxlZnQgPSBwYXJzZShkYXRlKTtcclxuICAgICAgdmFyIHJpZ2h0ID0gZml4ZWQgfHwgY2FsICYmIGNhbC5nZXRNb21lbnQoKTtcclxuICAgICAgaWYgKCFyaWdodCkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChjYWwpIHtcclxuICAgICAgICBhc3NvY2lhdGlvbi5hZGQodGhpcywgY2FsKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gY29tcGFyZShsZWZ0LCByaWdodCk7XHJcbiAgICB9O1xyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJhbmdlQnVpbGRlciAoaG93LCBjb21wYXJlKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uIGZhY3RvcnkgKHN0YXJ0LCBlbmQpIHtcclxuICAgIHZhciBkYXRlcztcclxuICAgIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xyXG5cclxuICAgIGlmIChBcnJheS5pc0FycmF5KHN0YXJ0KSkge1xyXG4gICAgICBkYXRlcyA9IHN0YXJ0O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKGxlbiA9PT0gMSkge1xyXG4gICAgICAgIGRhdGVzID0gW3N0YXJ0XTtcclxuICAgICAgfSBlbHNlIGlmIChsZW4gPT09IDIpIHtcclxuICAgICAgICBkYXRlcyA9IFtbc3RhcnQsIGVuZF1dO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHZhbGlkYXRlIChkYXRlKSB7XHJcbiAgICAgIHJldHVybiBkYXRlcy5tYXAoZXhwYW5kLmJpbmQodGhpcykpW2hvd10oY29tcGFyZS5iaW5kKHRoaXMsIGRhdGUpKTtcclxuICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gZXhwYW5kICh2YWx1ZSkge1xyXG4gICAgICB2YXIgc3RhcnQsIGVuZDtcclxuICAgICAgdmFyIGNhbCA9IGluZGV4LmZpbmQodmFsdWUpO1xyXG4gICAgICBpZiAoY2FsKSB7XHJcbiAgICAgICAgc3RhcnQgPSBlbmQgPSBjYWwuZ2V0TW9tZW50KCk7XHJcbiAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICBzdGFydCA9IHZhbHVlWzBdOyBlbmQgPSB2YWx1ZVsxXTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzdGFydCA9IGVuZCA9IHZhbHVlO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChjYWwpIHtcclxuICAgICAgICBhc3NvY2lhdGlvbi5hZGQoY2FsLCB0aGlzKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXJ0OiBwYXJzZShzdGFydCkuc3RhcnRPZignZGF5JykudG9EYXRlKCksXHJcbiAgICAgICAgZW5kOiBwYXJzZShlbmQpLmVuZE9mKCdkYXknKS50b0RhdGUoKVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbnZhciBhZnRlckVxICA9IGNvbXBhcmVCdWlsZGVyKGZ1bmN0aW9uIChsZWZ0LCByaWdodCkgeyByZXR1cm4gbGVmdCA+PSByaWdodDsgfSk7XHJcbnZhciBhZnRlciAgICA9IGNvbXBhcmVCdWlsZGVyKGZ1bmN0aW9uIChsZWZ0LCByaWdodCkgeyByZXR1cm4gbGVmdCAgPiByaWdodDsgfSk7XHJcbnZhciBiZWZvcmVFcSA9IGNvbXBhcmVCdWlsZGVyKGZ1bmN0aW9uIChsZWZ0LCByaWdodCkgeyByZXR1cm4gbGVmdCA8PSByaWdodDsgfSk7XHJcbnZhciBiZWZvcmUgICA9IGNvbXBhcmVCdWlsZGVyKGZ1bmN0aW9uIChsZWZ0LCByaWdodCkgeyByZXR1cm4gbGVmdCAgPCByaWdodDsgfSk7XHJcblxyXG52YXIgZXhjZXB0ICAgPSByYW5nZUJ1aWxkZXIoJ2V2ZXJ5JywgZnVuY3Rpb24gKGxlZnQsIHJpZ2h0KSB7IHJldHVybiByaWdodC5zdGFydCAgPiBsZWZ0IHx8IHJpZ2h0LmVuZCAgPCBsZWZ0OyB9KTtcclxudmFyIG9ubHkgICAgID0gcmFuZ2VCdWlsZGVyKCdzb21lJywgIGZ1bmN0aW9uIChsZWZ0LCByaWdodCkgeyByZXR1cm4gcmlnaHQuc3RhcnQgPD0gbGVmdCAmJiByaWdodC5lbmQgPj0gbGVmdDsgfSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBhZnRlckVxOiBhZnRlckVxLFxyXG4gIGFmdGVyOiBhZnRlcixcclxuICBiZWZvcmVFcTogYmVmb3JlRXEsXHJcbiAgYmVmb3JlOiBiZWZvcmUsXHJcbiAgZXhjZXB0OiBleGNlcHQsXHJcbiAgb25seTogb25seVxyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5mdW5jdGlvbiB2YWx1ZShlbGVtLCB2YWx1ZSkge1xyXG5cdGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcclxuXHRcdGVsZW0udmFsdWUgPSB2YWx1ZTtcclxuXHR9XHJcblx0cmV0dXJuIGVsZW0udmFsdWU7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdmFsdWU7Il19
