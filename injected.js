(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Code injected by jspm-server
'use strict';

require('./lib');

},{"./lib":3}],2:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _ModuleDiffer = require('./module-differ');

var _ModuleDiffer2 = _interopRequireWildcard(_ModuleDiffer);

var _url = require('url');

var _url2 = _interopRequireWildcard(_url);

var ChangeHandler = (function () {
  function ChangeHandler(System) {
    _classCallCheck(this, ChangeHandler);

    this.System = System;
    this.moduleMap = new Map();
    this.depMap = new Map();
    this.updateModuleMap();
    this.updateDepMap();
  }

  _createClass(ChangeHandler, [{
    key: 'updateModuleMap',
    value: function updateModuleMap() {
      var _this = this;

      var modules = Object.keys(this.System.loads || {});
      if (modules.length != this.moduleMap.size) {
        this.moduleMap.clear();
        modules.forEach(function (moduleName) {
          var meta = _this.System.loads[moduleName].metadata,
              path = meta.pluginArgument || meta.loaderArgument || moduleName;
          _this.moduleMap.set(path, { moduleName: moduleName, loader: meta.plugin || meta.loaderModule });
        });
      }
    }
  }, {
    key: 'updateDepMap',
    value: function updateDepMap() {
      var _this2 = this;

      var modules = Object.keys(this.System.loads || {});
      if (modules.length != this.depMap.size) {
        this.depMap.clear();
        modules.forEach(function (m) {
          var meta = _this2.System.loads[m].metadata,
              path = meta.pluginArgument || meta.loaderArgument || m;
          _this2.depMap.set(path, []);
        });
        modules.forEach(function (m) {
          var deps = _this2.System.loads[m].depMap;
          Object.keys(deps).forEach(function (dep) {
            var _deps$dep$split = deps[dep].split('!');

            var _deps$dep$split2 = _slicedToArray(_deps$dep$split, 2);

            var path = _deps$dep$split2[0];
            var loader = _deps$dep$split2[1];

            var map = _this2.depMap.get(path);
            if (map) map.push(m.split('!')[0]);
          });
        });
      }
    }
  }, {
    key: 'fileChanged',
    value: function fileChanged(_path) {
      var _this3 = this;

      var baseUrlPath = _url2['default'].parse(System.baseURL).pathname,
          path = ('/' + _path).replace(new RegExp('^' + baseUrlPath), '') // match up file paths to System module names
      .replace(/^\//, '') // a leading slash may remain in some cases and should be removed
      .replace(/\.js$/, ''); // .js extensions are implicit in 0.16.x

      // Make sure our knowledge of the modules is up to date
      this.updateModuleMap();
      this.updateDepMap();

      // If the change occurs to a file we don't have a record of
      // e.g. a HTML file, reload the browser window
      if (!this.moduleMap.has(path)) {
        this.reload(path, 'Change occurred to a file outside SystemJS loading');
        return;
      }

      // Import our existing copy of the file that just changed, to inspect it
      var moduleInfo = this.moduleMap.get(path);
      this.System['import'](moduleInfo.moduleName).then(function (oldModule) {
        // If __hotReload is false or undefined, bail out immediately
        if (!oldModule.__hotReload) {
          return Promise.reject('' + path + ' is not hot reloadable!');
        }

        // Grab the loader if there is one for this file
        var loader = moduleInfo.loader && (moduleInfo.loader['default'] || moduleInfo.loader);

        // Remove the module from the registry and call import again.
        // The changed file will be fetched and reinterpreted
        _this3.System['delete'](moduleInfo.moduleName);
        _this3.System['import'](moduleInfo.moduleName).then(function (newModule) {
          console.log('Reloaded ' + path);

          // Now the new module is loaded, we need to handle the old one and
          // potentially propagate the event up the dependency chain.
          var propagateIfNeeded = undefined;
          if (oldModule.__hotReload === true) {
            propagateIfNeeded = true;
          } else if (typeof oldModule.__hotReload === 'function') {
            propagateIfNeeded = oldModule.__hotReload.call(oldModule, loader, newModule);
          }

          // Propagate if the exports from the old and new module differ, or if we've
          // returned false from our __hotReload handler.
          if (propagateIfNeeded && !_ModuleDiffer2['default'].shallowEqual(oldModule, newModule)) {
            var deps = _this3.depMap.get(path);
            if (deps) deps.forEach(function (dep) {
              return _this3.fileChanged(dep);
            });
          }
        });
      })['catch'](function (reason) {
        return _this3.reload(path, reason);
      });
    }
  }, {
    key: 'reload',
    value: function reload(path, reason) {
      console.info('Change detected in ' + path + ' that cannot be handled gracefully: ' + reason);
      setTimeout(function () {
        return console.info('Reloading in 2...');
      }, 1000);
      setTimeout(function () {
        return console.info('1...');
      }, 2000);
      setTimeout(function () {
        return window.location.reload();
      }, 3000);
    }
  }]);

  return ChangeHandler;
})();

exports['default'] = ChangeHandler;
module.exports = exports['default'];
// paths don't come with a preceding slash but URLs do

},{"./module-differ":5,"url":27}],3:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _messageHandler = require('./message-handler');

var _messageHandler2 = _interopRequireWildcard(_messageHandler);

var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
var address = protocol + window.location.host + window.location.pathname + '/ws';
var socket = new WebSocket(address);
socket.onmessage = function (msg) {
  var data = undefined;
  try {
    data = JSON.parse(msg.data);
  } catch (e) {
    console.error('Non-JSON response received: ' + JSON.stringify(msg));
    throw e;
  }
  _messageHandler2['default'](data);
};

},{"./message-handler":4}],4:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _ChangeHandler = require('./change-handler');

var _ChangeHandler2 = _interopRequireWildcard(_ChangeHandler);

var changeHandler = undefined;

exports['default'] = function (message) {
  if (message.type == 'connected') {
    console.log('JSPM watching enabled!');
  } else if (message.type == 'change') {
    // Make sure SystemJS is fully loaded
    if (!changeHandler && window.System && window.System._loader && window.System._loader.modules) {
      changeHandler = new _ChangeHandler2['default'](window.System);
    }
    if (changeHandler) changeHandler.fileChanged(message.path);
  } else {
    console.error('Unknown message type! ' + JSON.stringify(message));
  }
};

module.exports = exports['default'];

},{"./change-handler":2}],5:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _F = require("fkit");

var _F2 = _interopRequireWildcard(_F);

var notChecked = function notChecked(pair) {
  return !(pair[0] == "default" && typeof pair[1] === "object" || /^__/.exec(pair[0]));
},
    getPairs = function getPairs(module) {
  var pairs = _F2["default"].filter(notChecked, _F2["default"].pairs(module));
  if (typeof module["default"] === "object") {
    return pairs.concat(_F2["default"].pairs(module["default"]));
  } else {
    return pairs;
  }
},
    pairsEqual = function pairsEqual(pairs) {
  var _pairs = _slicedToArray(pairs, 2);

  var pairA = _pairs[0];
  var pairB = _pairs[1];

  return pairA[0] === pairB[0] && pairA[1] === pairB[1];
};

exports["default"] = {
  shallowEqual: function shallowEqual(moduleA, moduleB) {
    var a = getPairs(moduleA),
        b = getPairs(moduleB);
    return a.length == b.length && _F2["default"].all(pairsEqual, _F2["default"].zip(a, b));
  }
};
module.exports = exports["default"];

},{"fkit":6}],6:[function(require,module,exports){
'use strict';

var util = require('./util');

/**
 * This module mixes in the functions and classes from all the other FKit
 * modules. It's available as a convenience, however if you don't need all of
 * FKit then you can require just the module that you need.
 *
 * @module fkit
 * @summary ALL THE THINGS!
 * @author Josh Bassett
 */
module.exports = util.extend({}, [
  require('./fn'),
  require('./list'),
  require('./logic'),
  require('./math'),
  require('./obj'),
  require('./string'),
]);

},{"./fn":7,"./list":8,"./logic":18,"./math":19,"./obj":20,"./string":21,"./util":22}],7:[function(require,module,exports){
'use strict';

var util = require('./util');

function flatten(as) {
  return as.reduce(function(a, b) { return a.concat(b); }, []);
}

function curry(f) {
  var arity = f.length;

  return (arity <= 1) ? f : given([], 0);

  function given(args, applications) {
    return function() {
      var newArgs = args.concat(
        (arguments.length > 0) ? util.slice.call(arguments, 0) : undefined
      );

      return (newArgs.length >= arity) ?
        f.apply(this, newArgs) :
        given(newArgs, applications + 1);
    };
  }
}

function variadic(f) {
  var arity = f.length;

  if (arity < 1) {
    return f;
  } else if (arity === 1)  {
    return function() {
      var args    = util.slice.call(arguments, 0),
          newArgs = (arguments.length === 1) ? flatten(args) : args;

      return f.call(this, newArgs);
    };
  } else {
    return function() {
      var numMissingArgs = Math.max(arity - arguments.length - 1, 0),
          missingArgs    = new Array(numMissingArgs),
          namedArgs      = util.slice.call(arguments, 0, arity - 1),
          variadicArgs   = util.slice.call(arguments, f.length - 1);

      return f.apply(this, namedArgs.concat(missingArgs).concat([variadicArgs]));
    };
  }
}

var self;

/**
 * This module defines basic operations on functions.
 *
 * @module fkit/fn
 * @summary Core Functions
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Flattens the list of `as`.
   *
   * @private
   */
  flatten: flatten,

  /**
   * Returns the result of the function `f` applied to the value `a`.
   *
   * @summary Applies a function to a value.
   *
   * @example
   *   function sayHi(a) { return ['Hi', a, '!'].join(' '); }
   *   F.apply(sayHi, 'Jane'); // Hi Jane!
   *
   * @curried
   * @function
   * @param f A function.
   * @param a A value.
   * @returns The result of `f(a)`.
   */
  apply: curry(function(f, a) { return f(a); }),

  /**
   * Returns the result of the function `f` applied to the values `a` and `b`.
   *
   * @summary Applies a function to two values.
   *
   * @example
   *   function sayHi(a, b) { return ['Hi', a, b, '!'].join(' '); }
   *   F.apply2(sayHi, 'Jane', 'Appleseed'); // Hi Jane Appleseed!
   *
   * @curried
   * @function
   * @param f A function.
   * @param a A value.
   * @param b A value.
   * @returns The result of `f(a, b)`.
   */
  apply2: curry(function(f, a, b) { return f(a, b); }),

  /**
   * Returns the result of the function `f` applied to the values `a`, `b`, and
   * `c`.
   *
   * @summary Applies a function to three values.
   *
   * @example
   *   function sayHi(a, b, c) { return ['Hi', a, b, c, '!'].join(' '); }
   *   F.apply3(sayHi, 'Ms', 'Jane', 'Appleseed'); // Hi Ms Jane Appleseed!
   *
   * @curried
   * @function
   * @param f A function.
   * @param a A value.
   * @param b A value.
   * @param c A value.
   * @returns The result of `f(a, b, c)`.
   */
  apply3: curry(function(f, a, b, c) { return f(a, b, c); }),

  /**
   * Returns the result of the function `f` applied to the value `a`.
   *
   * This is similar to `apply`, however the order of the arguments is flipped.
   *
   * @summary Applies a function to a value.
   *
   * @example
   *   function sayHi(a) { return ['Hi', a, '!'].join(' '); }
   *   F.applyRight('Jane', sayHi); // Hi Jane!
   *
   * @curried
   * @function
   * @param a A value.
   * @param f A function.
   * @returns The result of `f(a)`.
   */
  applyRight: curry(function(a, f) { return f(a); }),

  /**
   * Returns a function that is the composition of the list of functions `fs`.
   *
   * @summary Composes a list of functions.
   *
   * @example
   *   F.compose(f, g, h)(a); // f(g(h(a)))
   *
   * @function
   * @param fs A list of functions.
   * @returns A new function.
   */
  compose: variadic(function(fs) {
    return function(a) {
      return fs.reduceRight(function(a, f) {
        return f(a);
      }, a);
    };
  }),

  /**
   * Returns the result of applying the function `f` to the values `b` and `a`.
   *
   * @summary Flips the order of the arguments to a function.
   *
   * @example
   *   function f(a, b) { ... }
   *   var g = F.flip(f);
   *   g(1, 2); // f(2, 1)
   *
   * @function
   * @param f A function.
   * @param a A value.
   * @param b A value.
   * @returns A new function.
   */
  flip: curry(function(f, a, b) { return f(b, a); }),

  /**
   * Returns the value `a` unchanged.
   *
   * @summary The identity function.
   *
   * @example
   *   F.id(1); // 1
   *
   * @param a A value.
   * @returns The value `a`.
   */
  id: function(a) { return a; },

  /**
   * Returns a function that always returns the value `c`, regardless of the
   * arguments.
   *
   * @summary The constant function.
   *
   * @example
   *   F.const(1)(2, 3); // 1
   *
   * @param c A value.
   * @returns A new function.
   */
  const: function(c) { return function() { return c; }; },

  /**
   * Returns a function that allows partial application of the arguments to the
   * function `f`.
   *
   * @summary Converts a function to a curried function.
   *
   * @example
   *   var add = F.curry(function(a, b) { return a + b; });
   *   add(1)(2); // 3
   *
   * @function
   * @param f A function.
   * @returns A new function.
   */
  curry: curry,

  /**
   * Returns a function that wraps the binary function `f` to accept a pair.
   *
   * @summary Converts a binary function to a function on pairs.
   *
   * @example
   *   var add = F.uncurry(function(a, b) { return a + b; });
   *   add([1, 2]); // 3
   *
   * @function
   * @param f A function.
   * @returns A new function.
   */
  uncurry: curry(function(f, p) { return f(p[0], p[1]); }),

  /**
   * Returns a function that wraps the function `f` to accept only one argument.
   *
   * @summary Converts a function to a unary function.
   *
   * @param f A function.
   * @returns A new function.
   */
  unary: function(f) { return (f.length === 1) ? f : self.apply(f); },

  /**
   * Returns a function that wraps the function `f` to accept only two arguments.
   *
   * @summary Converts a function to a binary function.
   *
   * @param f A function.
   * @returns A new function.
   */
  binary: function(f) { return (f.length === 2) ? f : self.apply2(f); },

  /**
   * Returns a function that wraps the function `f` to accept any number of
   * arguments.
   *
   * The last named parameter will be given an array of arguments.
   *
   * @summary Converts a function to a variadic function.
   *
   * @example
   *   function f(head, tail) { ... }
   *   F.variadic(f)(1, 2, 3); // f(1, [2, 3])
   *
   * @function
   * @param f A function.
   * @returns A new function.
   */
  variadic: variadic,

  /**
   * Applies the function `f` to the value `a` and returns the value `a`
   * unchanged.
   *
   * @summary Applies a side-effecting function to a value.
   *
   * @example
   *   function f(a) { console.log(a); }
   *   F.tap(f)(1); // 1
   *
   * @curried
   * @function
   * @param f A function.
   * @param a A value.
   * @returns The value `a`.
   */
  tap: curry(function(f, a) { f(a); return a; }),

  /**
   * Returns `true` if the value `a` is strictly equal (`===`) to the value
   * `b`, false otherwise.
   *
   * @summary The strict equality operator.
   *
   * @curried
   * @function
   * @param a A value.
   * @param b A value.
   * @returns A boolean value.
   */
  equal: curry(function(a, b) { return b === a; }),

  /**
   * Returns `true` if the value `a` is strictly not equal (`!==`) to the value
   * `b`, false otherwise.
   *
   * @summary The strict inequality operator.
   *
   * @curried
   * @function
   * @param a A value.
   * @param b A value.
   * @returns A boolean value.
   */
  notEqual: curry(function(a, b) { return b !== a; }),

  /**
   * Returns the ordering of the two values `a` and `b`.
   *
   * @summary Compares two values using natural ordering.
   *
   * @example
   *   F.compare(1, 2); // -1
   *   F.compare(2, 1); // 1
   *   F.compare(2, 2); // 0
   *
   * @curried
   * @function
   * @param a A value.
   * @param b A value.
   * @returns A number.
   */
  compare: curry(function(a, b) {
    if (a > b) {
      return 1;
    } else if (a < b) {
      return -1;
    } else {
      return 0;
    }
  }),
};

},{"./util":22}],8:[function(require,module,exports){
'use strict';

var util = require('./util');

/**
 * FKit treats both arrays and strings as *lists*: an array is a list of
 * elements, and a string is a list of characters.
 *
 * Representing strings as lists may be a novel concept for some JavaScript
 * users, but it is quite common in other languages. This seemingly simple
 * abstractions yields a great deal of power: it allows you to apply the same
 * list combinators to both arrays and strings.
 *
 * @summary Working with Lists
 *
 * @module fkit/list
 * @mixes module:fkit/list/base
 * @mixes module:fkit/list/build
 * @mixes module:fkit/list/fold
 * @mixes module:fkit/list/map
 * @mixes module:fkit/list/search
 * @mixes module:fkit/list/set
 * @mixes module:fkit/list/sort
 * @mixes module:fkit/list/sublist
 * @mixes module:fkit/list/zip
 * @author Josh Bassett
 */
module.exports = util.extend({}, [
  require('./list/base'),
  require('./list/build'),
  require('./list/fold'),
  require('./list/map'),
  require('./list/search'),
  require('./list/set'),
  require('./list/sort'),
  require('./list/sublist'),
  require('./list/zip'),
]);

},{"./list/base":9,"./list/build":10,"./list/fold":11,"./list/map":12,"./list/search":13,"./list/set":14,"./list/sort":15,"./list/sublist":16,"./list/zip":17,"./util":22}],9:[function(require,module,exports){
'use strict';

var fn = require('../fn');

var self;

/**
 * This module defines basic operations on lists.
 *
 * @private
 * @module fkit/list/base
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Returns true if `as` is a string or an array of strings.
   *
   * @private
   */
  isString: function(as) {
    return (typeof as === 'string');
  },

  /**
   * Returns true if the list of `as` is an array of strings, false otherwise.
   *
   * @private
   */
  isArrayOfStrings: function(as) {
    return Array.isArray(as) &&
      as.length > 0 &&
      as.reduce(function(a, b) { return a && self.isString(b); }, true);
  },

  /**
   * Returns an empty monoid of `as`.
   *
   * @private
   */
  mempty: function(as) {
    return self.isString(as) || self.isArrayOfStrings(as) ? '' : [];
  },

  /**
   * Returns `a` in a pure context.
   *
   * @private
   */
  pure: function(a) {
    return self.isString(a) || self.isArrayOfStrings(a) ? a : [a];
  },

  /**
   * Converts the list of `as` to an array.
   *
   * @private
   */
  toArray: function(as) {
    return self.isString(as) ? as.split('') : as;
  },

  /**
   * Converts the list of `as` to a list of type `t`.
   *
   * @private
   */
  toList: function(as, t) {
    return t === 'string' ? as.join('') : as;
  },

  /**
   * Returns the number of elements in the list of `as`.
   *
   * @summary Gets the length of a list.
   *
   * @example
   *   F.length([1, 2, 3]); // 3
   *   F.length('foo'); // 3
   *
   * @param as A list.
   * @returns A number.
   */
  length: function(as) { return as.length; },

  /**
   * Returns `true` if the list of `as` is empty, `false` otherwise.
   *
   * @summary Determines if a list is empty.
   *
   * @example
   *   F.empty([]); // true
   *   F.empty([1, 2, 3]); // false
   *
   *   F.empty(''); // true
   *   F.empty('foo'); // false
   *
   * @param as A list.
   * @returns A boolean value.
   */
  empty: function(as) { return as.length === 0; },

  /**
   * Returns a list that contains the value `a` appended to the list of `bs`.
   *
   * @summary Appends a value to a list.
   *
   * @example
   *   F.append(3, [1, 2]); // [1, 2, 3]
   *   F.append('o', 'fo'); // 'foo'
   *
   * @curried
   * @function
   * @param a A value.
   * @param bs A list.
   * @returns A new list.
   */
  append: fn.curry(function(a, bs) {
    return self.isString(bs) ? (bs + a) : bs.concat([a]);
  }),

  /**
   * Returns a list that contains the value `a` prepended to the list of `bs`.
   *
   * @summary Prepends a value to a list.
   *
   * @example
   *   F.prepend(1, [2, 3]); // [1, 2, 3]
   *   F.prepend('f', 'oo'); // 'foo'
   *
   * @curried
   * @function
   * @param a A value.
   * @param bs A list.
   * @returns A new list.
   */
  prepend: fn.curry(function(a, bs) {
    return self.isString(bs) ? (a + bs) : [a].concat(bs);
  }),

  /**
   * Surrounds the list of `cs` with the values `a` and `b`.
   *
   * @example
   *   F.surround(0, 4, [1, 2, 3]); // [0, 1, 2, 3, 4]
   *   F.surround('(', ')', 'foo'); // '(foo)'
   *
   * @curried
   * @function
   * @param a A value.
   * @param b A value.
   * @param cs A list.
   * @returns A new list.
   */
  surround: fn.curry(function(a, b, cs) {
    return self.append(b, self.prepend(a, cs));
  }),

  /**
   * Returns the first element in the list of `as`.
   *
   * @summary Gets the first element in a list.
   *
   * @example
   *   F.head([1, 2, 3]); // 1
   *   F.head('foo'); // 'f'
   *
   * @param as A list.
   * @returns A value or `undefined` if the list is empty.
   */
  head: function(as) { return as[0]; },

  /**
   * Returns the last element in the list of `as`.
   *
   * @summary Gets the last element in a list.
   *
   * @example
   *   F.last([1, 2, 3]); // 3
   *   F.last('foo'); // 'o'
   *
   * @param as A list.
   * @returns A value or `undefined` if the list is empty.
   */
  last: function(as) { return as[as.length - 1]; },

  /**
   * Returns a list that contains the elements before the last element in the
   * list of `as`.
   *
   * @summary Gets the elements before the last element in a list.
   *
   * @example
   *   F.init([1, 2, 3]); // [1, 2]
   *   F.init('foo'); // 'fo'
   *
   * @param as A list.
   * @returns A new list.
   */
  init: function(as) { return as.slice(0, as.length - 1); },

  /**
   * Returns a list that contains the elements after the first element in the
   * list of `as`.
   *
   * @summary Get the elements after the first element in a list.
   *
   * @example
   *   F.tail([1, 2, 3]); // [2, 3]
   *   F.tail('foo'); // 'oo'
   *
   * @param as A list.
   * @returns A new list.
   */
  tail: function(as) { return as.slice(1); },

  /**
   * Returns a list that contains all initial segments of the list of `as`.
   *
   * @summary Gets all initial segments of a list.
   *
   * @example
   *   F.inits([1, 2, 3]); // [[], [1], [1, 2], [1, 2, 3]]
   *   F.inits('foo'); // ['', 'f', 'fo', 'foo']
   *
   * @param as A list.
   * @returns A new list.
   */
  inits: function inits(as) {
    return self.prepend(
      self.mempty(as),
      self.empty(as) ? [] : inits(self.tail(as)).map(self.prepend(self.head(as)))
    );
  },

  /**
   * Returns a list that contains all final segments of the list of `as`.
   *
   * @summary Gets all final segments of a list.
   *
   * @example
   *   F.tails([1, 2, 3]); // [[1, 2, 3], [2, 3], [3], []]
   *   F.tails('foo'); // ['foo', 'oo', 'o', '']
   *
   * @param as A list.
   * @returns A new list.
   */
  tails: function tails(as) {
    return self.prepend(
      as,
      self.empty(as) ? [] : tails(self.tail(as))
    );
  },
};

},{"../fn":7}],10:[function(require,module,exports){
'use strict';

var base    = require('./base'),
    fn      = require('../fn'),
    fold    = require('./fold'),
    math    = require('../math'),
    sublist = require('./sublist');

var self;

/**
 * This module defines operations for building lists.
 *
 * @private
 * @module fkit/list/build
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Returns an array of length `n`.
   *
   * @summary Creates a new array.
   *
   * @example
   *   F.array(3); // [undefined, undefined, undefined]
   *
   * @param n A number.
   * @returns A new array.
   */
  array: function(n) { return Array.apply(null, Array(n)); },

  /**
   * Returns an string of length `n`.
   *
   * @summary Creates a new string.
   *
   * @example
   *   F.string(3); // '   '
   *
   * @param n A number.
   * @returns A new string.
   */
  string: function(n) { return self.array(n + 1).join(' '); },

  /**
   * Returns an ordered pair with the values `a` and `b`.
   *
   * @summary Creates a new ordered pair.
   *
   * @example
   *   F.pair(1, 2); // [1, 2]
   *   F.pair('a', 'b'); // ['a', 'b']
   *
   * @curried
   * @function
   * @param a A value.
   * @param b A value.
   * @returns A new pair.
   */
  pair: fn.curry(function(a, b) { return [a, b]; }),

  /**
   * Returns an array of numbers of length `n` starting from `a`.
   *
   * @summary Creates a new array of numbers.
   *
   * @example
   *   F.range(1, 3); // [1, 2, 3]
   *
   * @curried
   * @function
   * @param a A number.
   * @param n A number.
   * @returns A new array.
   */
  range: fn.curry(function(a, n) {
    return self.array(n).map(function(_, i) { return a + i; });
  }),

  /**
   * Returns a list of length `n` with `a` the value of every element.
   *
   * @summary Replicates a value.
   *
   * @example
   *   F.replicate(3, 1); // [1, 1, 1]
   *   F.replicate(3, 'a'); // 'aaa'
   *
   * @curried
   * @function
   * @param n A number.
   * @param a A value.
   * @returns A new list.
   */
  replicate: fn.curry(function(n, a) {
    var as = base.isString(a) ? self.string(n) : self.array(n);
    return fold.concatMap(function() { return [a]; }, as);
  }),

  /**
   * Returns a list of `n` elements randomly sampled from the list of `as`.
   *
   * @summary Samples random elements from a list.
   *
   * @example
   *   F.sample(2, [1, 2, 3]); // [3, 1]
   *   F.sample(2, 'abc'); // 'ca'
   *
   * @curried
   * @function
   * @param n A number.
   * @param as A list.
   * @returns A new list.
   */
  sample: fn.curry(function(n, as) {
    return sublist.take(n, self.shuffle(as));
  }),

  /**
   * Returns a list that contains the elements in the list of `as` randomly
   * shuffled using the [Fisher-Yates
   * algorithm](http://en.wikipedia.org/wiki/Fisher-Yates_shuffle).
   *
   * @summary Shuffles a list.
   *
   * @example
   *   F.shuffle([1, 2, 3]); // [2, 3, 1]
   *   F.shuffle('abc'); // 'bca'
   *
   * @curried
   * @function
   * @param as A list.
   * @returns A new list.
   */
  shuffle: function(as) {
    var i  = -1,
        r  = self.array(as.length),
        bs = fold.fold(f, r, as),
        s  = base.isString(as) ? '' : [];

    return fold.concatWith(s, bs);

    function f(b, a) {
      var j = math.randomInt(0, ++i);

      b[i] = b[j];
      b[j] = a;

      return b;
    }
  },
};

},{"../fn":7,"../math":19,"./base":9,"./fold":11,"./sublist":16}],11:[function(require,module,exports){
'use strict';

var base = require('./base'),
    fn   = require('../fn'),
    math = require('../math');

var self;

/**
 * This module defines fold operations on lists.
 *
 * @private
 * @module fkit/list/fold
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Flattens any strings in the list of `as`.
   *
   * @private
   */
  flattenStrings: function flattenStrings(as) {
    if (base.isArrayOfStrings(as)) {
      return self.concat(as);
    } else {
      if (Array.isArray(as)) {
        return as.map(flattenStrings);
      } else {
        return as;
      }
    }
  },

  /**
   * Returns a list that contains the elements in the list of `as` concatenated
   * with the starting value `s`.
   *
   * @private
   */
  concatWith: fn.curry(function(s, as) {
    return base
      .toArray(fn.flatten(as))
      .reduce(fn.flip(base.append), s);
  }),

  /**
   * Returns a list that contains the concatenated elements in the list of
   * `as`.
   *
   * @summary Concatenates lists.
   *
   * @example
   *   F.concat([1], [2, 3], [4, 5, 6]); // [1, 2, 3, 4, 5, 6]
   *   F.concat('f', 'oo', 'bar'); // 'foobar'
   *
   * @function
   * @param as A list.
   * @returns A new list.
   */
  concat: fn.variadic(function(as) {
    return self.concatWith(base.mempty(as), as);
  }),

  /**
   * Returns a list that contains the elements in the list of `as` mapped with
   * the function `f` concatenated together.
   *
   * @summary Maps a function over a list and concatenates the results.
   *
   * @example
   *   F.concatMap(function(a) {
   *     return [a, 0];
   *   }, [1, 2, 3]); // [1, 0, 2, 0, 3, 0]
   *
   *   F.concatMap(function(a) {
   *     return [a, '-'];
   *   }, 'foo'); // 'f-o-o-'
   *
   * @curried
   * @function
   * @param f A function.
   * @param as A list.
   * @returns A new list.
   */
  concatMap: fn.curry(function(f, as) {
    var bs = base.toArray(as).map(fn.compose(self.flattenStrings, f)),
        cs = bs.length > 0 ? bs : as;

    return self.concatWith(base.mempty(cs), bs);
  }),

  /**
   * Returns a list that contains the elements in the list of `as` folded
   * left-to-right with the binary function `f` and starting value `s`.
   *
   * @summary Folds a list from left to right with a function.
   *
   * @example
   *   F.fold(F.flip(F.prepend), [], [1, 2, 3]); // [3, 2, 1]
   *   F.fold(F.flip(F.prepend), '', 'foo'); // 'oof'
   *
   * @curried
   * @function
   * @param f A binary function.
   * @param s A starting value.
   * @param as A list.
   * @returns A value.
   */
  fold: fn.curry(function(f, s, as) {
    return base
      .toArray(as)
      .reduce(f, s);
  }),

  /**
   * Returns a list that contains the elements in the list of `as` folded
   * right-to-left with the binary function `f` and starting value `s`.
   *
   * @summary Folds a list from right to left with a function.
   *
   * @example
   *   F.foldRight(F.append, [], [1, 2, 3]); // [3, 2, 1]
   *   F.foldRight(F.append, '', 'foo'); // 'oof'
   *
   * @curried
   * @function
   * @param f A binary function.
   * @param s A starting value.
   * @param as A list.
   * @returns A value.
   */
  foldRight: fn.curry(function(f, s, as) {
    return base
      .toArray(as)
      .reduceRight(fn.flip(f), s);
  }),

  /**
   * Returns a list that contains the elements in the list of `as` scanned
   * left-to-right with the binary function `f` and starting value `s`.
   *
   * @summary Scans a list from left to right with a function.
   *
   * @example
   *   F.fold(F.flip(F.prepend), [],  [1, 2, 3]); // [[], [1], [2, 1], [3, 2, 1]]
   *   F.fold(F.flip(F.prepend), '',  'foo'); // ['', 'f', 'of', 'oof']
   *
   * @curried
   * @function
   * @param f A binary function.
   * @param s A starting value.
   * @param as A list.
   * @returns A new list.
   */
  scan: fn.curry(function(f, s, as) {
    var r = [s];

    self.fold(function(b, a) {
      return fn.tap(r.push.bind(r), f(b, a));
    }, s, as);

    return r;
  }),

  /**
   * Returns a list that contains the elements in the list of `as` scanned
   * right-to-left with the binary function `f` and starting value `s`.
   *
   * @summary Scans a list from right to left with a function.
   *
   * @example
   *   F.foldRight(F.append, [],  [1, 2, 3]); // [[3, 2, 1], [3, 2], [3], []]
   *   F.foldRight(F.append, '',  'foo'); // ['oof', 'oo', 'o', '']
   *
   * @curried
   * @function
   * @param f A binary function.
   * @param s A starting value.
   * @param as A list.
   * @returns A new list.
   */
  scanRight: fn.curry(function(f, s, as) {
    var r = [s];

    self.foldRight(function(a, b) {
      return fn.tap(r.unshift.bind(r), f(a, b));
    }, s, as);

    return r;
  }),

  /**
   * Returns the maximum value in the list of `as`.
   *
   * @summary Calculates the maximum value of a list.
   *
   * @example
   *   F.maximum([1, 2, 3]); // 3
   *   F.maximum('abc'); // 'c'
   *
   * @param as A list.
   * @returns A value.
   */
  maximum: function(as) { return self.fold(math.max, as[0], as); },

  /**
   * Returns the minimum value in the list of `as`.
   *
   * @summary Calculates the minimum value of a list.
   *
   * @example
   *   F.minimum([1, 2, 3]); // 1
   *   F.minimum('abc'); // 'a'
   *
   * @param as A list.
   * @returns A value.
   */
  minimum: function(as) { return self.fold(math.min, as[0], as); },

  /**
   * Returns the maximum value in the list of `as` using the comparator
   * function `c`.
   *
   * @summary Calculates the maximum value of a list using a comparator.
   *
   * @curried
   * @function
   * @param c A comparator function.
   * @param as A list.
   * @returns A value.
   */
  maximumBy: fn.curry(function(c, as) {
    return self.fold(function(a, b) {
      return c(a, b) > 0? a : b;
    }, as[0], as);
  }),

  /**
   * Returns the minimum value in the list of `as` using the comparator
   * function `c`.
   *
   * @summary Calculates the minimum value of a list using a comparator
   * function.
   *
   * @curried
   * @function
   * @param c A comparator function.
   * @param as A list.
   * @returns A value.
   */
  minimumBy: fn.curry(function(c, as) {
    return self.fold(function(a, b) {
      return c(a, b) < 0 ? a : b;
    }, as[0], as);
  }),

  /**
   * Returns the sum of the elements in the list of `as`.
   *
   * @summary Calculates the sum of the elements in a list.
   *
   * @example
   *   F.sum([1, 2, 3]); // 6
   *
   * @param as A list.
   * @returns A number.
   */
  sum: function(as) { return self.fold(math.add, 0, as); },

  /**
   * Returns the product of the elements in the list of `as`.
   *
   * @summary Calculates the product of the elements in a list.
   *
   * @example
   *   F.product([1, 2, 3]); // 6
   *
   * @param as A list.
   * @returns A number.
   */
  product: function(as) { return self.fold(math.mul, 1, as); },
};

},{"../fn":7,"../math":19,"./base":9}],12:[function(require,module,exports){
'use strict';

var base = require('./base'),
    fn   = require('../fn'),
    fold = require('./fold');

/**
 * This module defines map operations on lists.
 *
 * @private
 * @module fkit/list/map
 * @author Josh Bassett
 */
module.exports = {
  /**
   * Returns a list that contains the elements in the list of `as` mapped with
   * the function `f`.
   *
   * @summary Maps a function over a list.
   *
   * @example
   *   F.map(F.inc, [1, 2, 3]); // [2, 3, 4]
   *   F.map(F.toUpper, 'foo'); // ['F', 'O', 'O']
   *
   * @curried
   * @function
   * @param f A function.
   * @param as A list.
   * @returns A new list.
   */
  map: fn.curry(function(f, as) {
    return base
      .toArray(as)
      .map(f);
  }),

  /**
   * Returns a list that contains the elements in the list of `as` in reverse
   * order.
   *
   * @summary Reverses the elements in a list.
   *
   * @example
   *   F.reverse([1, 2, 3]); // [3, 2, 1]
   *   F.reverse('foo'); // 'oof'
   *
   * @param as A list.
   * @returns A new list.
   */
  reverse: function(as) {
    return base
      .toArray(as)
      .reduce(fn.flip(base.prepend), base.mempty(as));
  },

  /**
   * Returns a list that contains the elements in the list of `as` interspersed
   * with the separator `s`.
   *
   * @summary Intersperses the elements of a list with separator.
   *
   * @example
   *   F.intersperse(4, [1, 2, 3]); // [1, 4, 2, 4, 3]
   *   F.intersperse('-', 'foo'); // 'f-o-o'
   *
   * @curried
   * @function
   * @param s A separator.
   * @param as A list.
   * @returns A new list.
   */
  intersperse: fn.curry(function(s, as) {
    return base.empty(as) ?
      base.mempty(as) :
      fold.concat(base.head(as), prependToAll(base.tail(as)));

    function prependToAll(bs) {
      return base.empty(bs) ?
        base.mempty(bs) :
        fold.concat(s, base.head(bs), prependToAll(base.tail(bs)));
    }
  }),
};

},{"../fn":7,"./base":9,"./fold":11}],13:[function(require,module,exports){
'use strict';

var base  = require('./base'),
    fn    = require('../fn'),
    fold  = require('./fold'),
    logic = require('../logic'),
    map   = require('./map');

var self;

/**
 * This module defines search operations on lists.
 *
 * @private
 * @module fkit/list/search
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Returns `true` if the list of `as` contains the element `a`, `false`
   * otherwise.
   *
   * @summary Determines if a value is present in a list.
   *
   * @example
   *   F.elem(0, [1, 2, 3]); // false
   *   F.elem(1, [1, 2, 3]); // true
   *
   *   F.elem('a', 'foo'); // false
   *   F.elem('o', 'foo'); // true
   *
   * @curried
   * @function
   * @param a A value.
   * @param as A list.
   * @returns A boolean value.
   */
  elem: fn.curry(function(a, as) {
    return as.indexOf(a) >= 0;
  }),

  /**
   * Returns the index of the first occurance of the element `a` in the list of
   * `as`.
   *
   * @summary Gets the index of the first occurance of an element in a list.
   *
   * @example
   *   F.elemIndex(0, [1, 2, 3]); // undefined
   *   F.elemIndex(1, [1, 2, 3]); // 0
   *
   *   F.elemIndex('a', 'foo'); // undefined
   *   F.elemIndex('o', 'foo'); // 1
   *
   * @curried
   * @function
   * @param a A value.
   * @param as A list.
   * @returns A number or `undefined` if no value was found.
   */
  elemIndex: fn.curry(function(a, as) {
    var i = as.indexOf(a);
    return (i >= 0) ? i : undefined;
  }),

  /**
   * Returns the indices of all occurances of the element `a` in the list of
   * `as`.
   *
   * @summary Gets the indices of all occurances of an element in a list.
   *
   * @example
   *   F.elemIndices(0, [1, 2, 3]); // []
   *   F.elemIndices(1, [1, 2, 3]); // [0]
   *
   *   F.elemIndices('a', 'foo'); // []
   *   F.elemIndices('o', 'foo'); // [1, 2]
   *
   * @curried
   * @function
   * @param a A value.
   * @param as A list.
   * @returns A number or `undefined` if no value was found.
   */
  elemIndices: fn.curry(function(a, as) {
    return self.findIndices(fn.equal(a), as);
  }),

  /**
   * Returns an element in the list of `as` that satisfies the predicate function
   * `p`.
   *
   * @summary Finds an element in a list that satisfies a predicate function.
   *
   * @example
   *   F.find(F.gt(1), []); // undefined
   *   F.find(F.gt(1), [1, 2, 3]); // 2
   *
   *   F.find(F.eq('o'), ''); // undefined
   *   F.find(F.eq('o'), 'foo'); // 'o'
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A value or `undefined` if no value was found.
   */
  find: fn.curry(function(p, as) {
    return base.head(self.filter(p, as));
  }),

  /**
   * Returns the index of the first occurance of an element in the list of `as`
   * that satisfies the predicate function `p`.
   *
   * @summary Finds the index of the first occurance of an element in a list
   * that satisfies a predicate function.
   *
   * @example
   *   F.findIndex(F.gt(1), []); // undefined
   *   F.findIndex(F.gt(1), [1, 2, 3]); // 1
   *
   *   F.findIndex(F.eq('o'), ''); // undefined
   *   F.findIndex(F.eq('o'), 'foo'); // 1
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A number or `undefined` if no value was found.
   */
  findIndex: fn.curry(function(p, as) {
    var n = as.length;

    for (var i = 0; i < n; i++) {
      if (p(as[i])) { return i; }
    }

    return undefined;
  }),

  /**
   * Returns the indices of the elements in the list of `as` that satisfy the
   * predicate function `p`.
   *
   * @summary Finds the indices of all occurances of the elements in a list
   * that satisfy a predicate function.
   *
   * @example
   *   F.findIndices(F.gt(1), []); // []
   *   F.findIndices(F.gt(1), [1, 2, 3]); // [1, 2]
   *
   *   F.findIndices(F.eq('o'), ''); // []
   *   F.findIndices(F.eq('o'), 'foo'); // [1, 2]
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A number or `undefined` if no value was found.
   */
  findIndices: fn.curry(function(p, as) {
    var s = [],
        n = as.length;

    for (var i = 0; i < n; i++) {
      if (p(as[i])) { s.push(i); }
    }

    return s;
  }),

  /**
   * Returns a list that contains the elements in the list of `as` that satisfy
   * the predicate function `p`.
   *
   * @summary Filters a list using a predicate function.
   *
   * @example
   *   F.filter(F.gt(1), [1, 2, 3]); // [2, 3]
   *   F.filter(F.eq('o'), 'foo'); // 'oo'
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A new list.
   */
  filter: fn.curry(function(p, as) {
    var f = logic.branch(p, fn.id, fn.const(''));
    return base.isString(as) ? fold.concatMap(f, as) : as.filter(p);
  }),

  /**
   * Returns a list that contains the elements in the list of `as` split into a
   * pair of lists: the elements that satisfy the predicate function `p` and
   * the elements that do not satisfy the predicate function `p`.
   *
   * @summary Partitions a list using a predicate function.
   *
   * @example
   *   F.partition(F.gt(1), [1, 2, 3]); // [[2, 3], [1]]
   *   F.partition(F.eq('o'), 'foo'); // ['oo', 'f']
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A pair of lists.
   */
  partition: fn.curry(function(p, as) {
    return [
      self.filter(p, as),
      self.filter(fn.compose(logic.not, p), as)
    ];
  }),

  /**
   * Returns `true` if all elements in the list of `as` satisfy the predicate
   * function `p`, `false` otherwise.
   *
   * @summary Determines if all elements in a list satisfy a predicate
   * function.
   *
   * @example
   *   F.all(F.gt(1), [1, 2, 3]); // false
   *   F.all(F.gt(1), [2, 3]); // true
   *   F.all(F.gt(1), [3]); // true
   *
   *   F.all(F.eq('o'), 'foo'); // false
   *   F.all(F.eq('o'), 'oo'); // true
   *   F.all(F.eq('o'), 'o'); // true
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A boolean value.
   */
  all: fn.curry(function(p, as) {
    return self.filter(p, as).length === as.length;
  }),

  /**
   * Returns `true` if any elements in the list of `as` satisfy the predicate
   * function `p`, `false` otherwise.
   *
   * @summary Determines if any elements in a list satisfy a predicate
   * function.
   *
   * @example
   *   F.any(F.gt(1), [1, 2, 3]); // true
   *   F.any(F.gt(1), [1, 2]); // true
   *   F.any(F.gt(1), [1]); // false
   *
   *   F.any(F.eq('o'), 'foo'); // true
   *   F.any(F.eq('o'), 'fo'); // true
   *   F.any(F.eq('o'), 'f'); // false
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A boolean value.
   */
  any: fn.curry(function(p, as) {
    return self.filter(p, as).length > 0;
  }),

  /**
   * Returns `true` if the list of `as` is a prefix of the list of `bs`,
   * `false` otherwise.
   *
   * @summary Determines if a list is a prefix of another list.
   *
   * @example
   *   F.isPrefixOf([], [1, 2, 3]); // true
   *   F.isPrefixOf([1, 2], [1, 2, 3]); // true
   *   F.isPrefixOf([2, 3], [1, 2, 3]); // false
   *
   *   F.isPrefixOf('', 'foo'); // true
   *   F.isPrefixOf('fo', 'foo'); // true
   *   F.isPrefixOf('oo', 'foo'); // false
   *
   * @curried
   * @function
   * @param as A list.
   * @param bs A list.
   * @returns A boolean value.
   */
  isPrefixOf: fn.curry(function isPrefixOf(as, bs) {
    if (base.empty(as)) {
      return true;
    } else if (base.empty(bs)) {
      return false;
    } else {
      return base.head(as) === base.head(bs) && isPrefixOf(base.tail(as), base.tail(bs));
    }
  }),

  /**
   * Returns `true` if the list of `as` is a suffix of the list of `bs`,
   * `false` otherwise.
   *
   * @summary Determines if a list is a suffix of another list.
   *
   * @example
   *   F.isSuffixOf([], [1, 2, 3]); // true
   *   F.isSuffixOf([1, 2], [1, 2, 3]); // false
   *   F.isSuffixOf([2, 3], [1, 2, 3]); // true
   *
   *   F.isSuffixOf('', 'foo'); // true
   *   F.isSuffixOf('fo', 'foo'); // false
   *   F.isSuffixOf('oo', 'foo'); // true
   *
   * @curried
   * @function
   * @param as A list.
   * @param bs A list.
   * @returns A boolean value.
   */
  isSuffixOf: fn.curry(function(as, bs) {
    return self.isPrefixOf(map.reverse(as), map.reverse(bs));
  }),

  /**
   * Returns `true` if the list of `as` is contained within the list of `bs`,
   * `false` otherwise.
   *
   * @summary Determines if a list is contained within another list.
   *
   * @example
   *   F.isInfixOf([], [1, 2, 3]); // true
   *   F.isInfixOf([2, 3], [1, 2, 3]); // true
   *   F.isInfixOf([3, 2], [1, 2, 3]); // false
   *
   *   F.isInfixOf('', 'foo'); // true
   *   F.isInfixOf('oo', 'foo'); // true
   *   F.isInfixOf('of', 'foo'); // false
   *
   * @curried
   * @function
   * @param as A list.
   * @param bs A list.
   * @returns A boolean value.
   */
  isInfixOf: fn.curry(function(as, bs) {
    return self.any(self.isPrefixOf(as), base.tails(bs));
  }),
};

},{"../fn":7,"../logic":18,"./base":9,"./fold":11,"./map":12}],14:[function(require,module,exports){
'use strict';

var base   = require('./base'),
    build  = require('./build'),
    fn     = require('../fn'),
    fold   = require('./fold'),
    map    = require('./map'),
    search = require('./search');

var self;

/**
 * This module defines set operations on lists.
 *
 * @private
 * @module fkit/list/set
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Returns a list with all duplicate elements removed from the list of `as`.
   *
   * It is a special case of the `nubBy` function where the elements are
   * compared using the strict equality `===` operator.
   *
   * The resulting list will only contain unique elements.
   *
   * @summary Removes duplicate elements from a list.
   *
   * @example
   *   F.nub([1, 2, 2, 3, 3, 3]); // [1, 2, 3]
   *   F.nub('abbccc'); // 'abc'
   *
   * @param as A list.
   * @returns A new list.
   */
  nub: function(as) {
    return self.nubBy(fn.equal, as);
  },

  /**
   * Returns a list with all duplicate elements that satisfy the comparator
   * function `f` removed from the list of `bs`.
   *
   * @summary Removes duplicate elements from a list using a comparator
   * function.
   *
   * @curried
   * @function
   * @param f A comparator function.
   * @param as A list.
   * @returns A new list.
   */
  nubBy: fn.curry(function nubBy(f, as) {
    var a = base.head(as);

    return base.empty(as) ?
      base.mempty(as) :
      base.prepend(
        a,
        nubBy(f, search.filter(function(b) { return !f(a, b); }, base.tail(as)))
      );
  }),

  /**
   * Returns a list that contains the union of elements in the lists of `as`
   * and `bs`.
   *
   * Duplicates are removed from `bs`, but if `as` contains duplicates then so
   * will the result.
   *
   * @summary Calculates the union of two lists.
   *
   * @example
   *   F.union([1, 2, 3], [2, 3, 4]); // [1, 2, 3, 4]
   *   F.union('hello', 'world'); // 'hellowrd'
   *
   * @curried
   * @function
   * @param as A list.
   * @param bs A list.
   * @returns A new list.
   */
  union: fn.curry(function(as, bs) {
    return fold.fold(function(cs, b) {
      return (search.elem(b, cs)) ? cs : base.append(b, cs);
    }, as, bs);
  }),

  /**
   * Returns a list that contains the intersection of the elments in the lists
   * of `as` and `bs`.
   *
   * Duplicates are removed from `bs`, but if `as` contains duplicates then so
   * will the result.
   *
   * @summary Calculates the intersection of two lists.
   *
   * @example
   *   F.intersect([1, 2, 3], [2, 3, 4]); // [2, 3]
   *   F.intersect('hello', 'world'); // 'ol'
   *
   * @curried
   * @function
   * @param as A list.
   * @param bs A list.
   * @returns A new list.
   */
  intersect: fn.curry(function(as, bs) {
    return fold.fold(function(cs, a) {
      return (search.elem(a, bs)) ? base.append(a, cs) : cs;
    }, base.mempty(as), as);
  }),

  /**
   * Returns a list that contains the difference of the elements in the lists
   * of `as` and `bs`.
   *
   * @summary Calculates the difference of two lists.
   *
   * @example
   *   F.difference([1, 2, 3], [2, 3, 4]); // [1]
   *   F.difference('hello', 'world'); // 'wrd'
   *
   * @curried
   * @function
   * @param as A list.
   * @param bs A list.
   * @returns A new list.
   */
  difference: fn.curry(function(as, bs) {
    return fold.fold(fn.flip(self.remove), as, bs);
  }),

  /**
   * Returns a list with the first occurance of the element `a` removed from
   * the list of `bs`.
   *
   * It is a special case of the `removeBy` function where the elements are
   * compared using the strict equality `===` operator.
   *
   * @summary Removes the first occurance of an element from a list.
   *
   * @example
   *   F.remove(2, [1, 2, 3]); // [1, 3]
   *   F.remove('f', 'foo'); // 'oo'
   *
   * @curried
   * @function
   * @param a A value.
   * @param bs A list.
   * @returns A new list.
   */
  remove: fn.curry(function(a, bs) {
    return self.removeBy(fn.equal, a, bs);
  }),

  /**
   * Returns a list with the first occurance of the element `a` that satisfies
   * the comparator function `f` removed from the list of `bs`.
   *
   * @summary Removes the first occurance of an element from a list using a
   * comparator function.
   *
   * @curried
   * @function
   * @param f A comparator function.
   * @param a A value.
   * @param bs A list.
   * @returns A new list.
   */
  removeBy: fn.curry(function removeBy(f, a, bs_) {
    var b  = base.head(bs_),
        bs = base.tail(bs_);

    return base.empty(bs_) ?
      base.mempty(bs_) :
      f(a, b) ? bs : base.prepend(b, removeBy(f, a, bs));
  }),

  /**
   * Returns a list that contains all the ordered pairs `[a, b]` in the lists
   * of `as` and `bs`.
   *
   * @summary Calculates the cartesian product of two lists.
   *
   * @example
   *   F.cartesian([1, 2], [3, 4]); // [[1, 3], [1, 4], [2, 3], [2, 4]]
   *   F.cartesian('ab', 'cd'); // [['a', 'c'], ['a', 'd'], ['b', 'c'], ['b', 'd']]
   *
   * @curried
   * @function
   * @param as A list.
   * @param bs A list.
   * @returns A new list.
   */
  cartesian: fn.curry(function cartesian(as, bs) {
    return base.empty(as) ?
      [] :
      fold.concat(
        map.map(build.pair(base.head(as)), bs),
        cartesian(base.tail(as), bs)
      );
  }),

  /**
   * Returns a list that contains all the subsequences of the elements in the
   * list of `as`.
   *
   * @summary Calculates the subsequences of a list.
   *
   * @example
   *   F.subsequences([1, 2, 3]); // [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
   *   F.subsequences('abc'); // ['', 'a', 'b', 'ab', 'c', 'ac', 'bc', 'abc']
   *
   * @param as A list.
   * @returns A new list.
   */
  subsequences: function(as) {
    return base.prepend(base.mempty(as), subsequences_(as));

    function subsequences_(bs) {
      var b = base.head(bs);

      if (base.empty(bs)) {
        return [];
      } else {
        return base.prepend(base.pure(b), fold.foldRight(f, [], subsequences_(base.tail(bs))));
      }

      function f(ys, r) {
        return fold.concat(base.pure(ys), base.pure(base.prepend(b, ys)), r);
      }
    }
  },

  /**
   * Returns a list that contains all the permutations of the elements in the
   * list of `as`.
   *
   * @summary Calculates the permutations of a list.
   *
   * @example
   *   F.permutations([1, 2, 3]); // [[1, 2, 3], [2, 1, 3], [3, 2, 1], [2, 3, 1], [3, 1, 2], [1, 3, 2]]
   *   F.permutations('abc'); // ['abc', 'bac', 'cba', 'bca', 'cab', 'acb']
   *
   * @param as A list.
   * @returns A new list.
   */
  permutations: function permutations(as) {
    return base.prepend(as, permutations_(as, []));

    function permutations_(bs_, cs) {
      var b  = base.head(bs_),
          bs = base.tail(bs_);

      return base.empty(bs_) ? [] :
        fold.foldRight(
          interleave,
          permutations_(bs, base.prepend(b, cs)),
          permutations(cs)
        );

      function interleave(ds, r) {
        return interleave_(fn.id, ds)[1];

        function interleave_(f, es_) {
          if (base.empty(es_)) {
            return [bs, r];
          } else {
            var e  = base.head(es_),
                es = base.tail(es_),
                s  = interleave_(fn.compose(f, base.prepend(e)), es);

            return [
              base.prepend(e, s[0]),
              base.prepend(f(fold.concat(b, e, s[0])), s[1])
            ];
          }
        }
      }
    }
  },
};

},{"../fn":7,"./base":9,"./build":10,"./fold":11,"./map":12,"./search":13}],15:[function(require,module,exports){
'use strict';

var base = require('./base'),
    fn   = require('../fn'),
    util = require('../util');

var self;

/**
 * This module defines operations for sorting lists.
 *
 * @private
 * @module fkit/list/sort
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Returns a list that contains the elements in the list of `as` sorted.
   *
   * @summary Sorts a list using natural ordering.
   *
   * @example
   *   F.sort([2, 3, 1]); // [1, 2, 3]
   *   F.sort('bca'); // 'abc'
   *
   * @curried
   * @function
   * @param a A list.
   * @returns A new list.
   */
  sort: function(as) {
    return self.sortBy(fn.compare, as);
  },

  /**
   * Returns a list that contains the elements in the list of `as` sorted
   * using the comparator function `c`.
   *
   * @summary Sorts a list using a comparator function.
   *
   * @curried
   * @function
   * @param c A comparator function.
   * @param as A list.
   * @returns A new list.
   */
  sortBy: fn.curry(function(c, as) {
    var bs = base.toArray(as.slice(0));
    return base.toList(bs.sort(c), typeof as);
  }),
};

},{"../fn":7,"../util":22,"./base":9}],16:[function(require,module,exports){
'use strict';

var base = require('./base'),
    fn   = require('../fn'),
    fold = require('./fold');

var self;

/**
 * This module defines sublist operations on lists.
 *
 * @private
 * @module fkit/list/sublist
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Returns the prefix of `n` elements from the list of `as`.
   *
   * @summary Gets the prefix of a list.
   *
   * @example
   *   F.take(2, [1, 2, 3]); // [1, 2]
   *   F.take(2, 'foo'); // 'fo'
   *
   * @curried
   * @function
   * @param n A number.
   * @param as A list.
   * @returns A new list.
   */
  take: fn.curry(function(n, as) {
    var s = base.isString(as) ? '' : [],
        m = as.length;

    for (var i = 0; i < Math.min(m, n); i++) {
      s = s.concat(as[i]);
    }

    return s;
  }),

  /**
   * Returns the suffix after dropping `n` elements from the list of `as`.
   *
   * @summary Gets the suffix of a list.
   *
   * @example
   *   F.drop(2, [1, 2, 3]); // [3]
   *   F.drop(2, 'foo'); // 'o'
   *
   * @curried
   * @function
   * @param n A number.
   * @param as A list.
   * @returns A new list.
   */
  drop: fn.curry(function(n, as) {
    var s = base.isString(as) ? '' : [],
        m = as.length;

    for (var i = n; i < m; i++) {
      s = s.concat(as[i]);
    }

    return s;
  }),

  /**
   * Returns the prefix of elements from the list of `as` while the predicate
   * function `p` is satisfied.
   *
   * @summary Gets the prefix of a list using a predicate function.
   *
   * @example
   *   F.takeWhile(F.lt(3), [1, 2, 3]); // [1, 2]
   *   F.takeWhile(F.neq(o), 'foo'); // 'f'
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A new list.
   */
  takeWhile: fn.curry(function(p, as) {
    var s = base.isString(as) ? '' : [],
        n = as.length;

    for (var i = 0; i < n && p(as[i]); i++) {
      s = s.concat(as[i]);
    }

    return s;
  }),

  /**
   * Returns the suffix after dropping elements from the list of `as` while
   * the predicate function `p` is satisfied.
   *
   * @summary Gets the suffix of a list using a predicate function.
   *
   * @example
   *   F.dropWhile(F.lt(3), [1, 2, 3]); // [3]
   *   F.dropWhile(F.neq(o), 'foo'); // 'oo'
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A new list.
   */
  dropWhile: fn.curry(function(p, as) {
    var s = base.isString(as) ? '' : [],
        m = as.length,
        n = 0;

    while (p(as[n]) && n < as.length) {
      n++;
    }

    for (var i = n; i < m; i++) {
      s = s.concat(as[i]);
    }

    return s;
  }),

  /**
   * Returns a list that contains the elements in the list of `as` split into a
   * pair of lists: a prefix of length `n` and the remainder of the list.
   *
   * @summary Splits a list.
   *
   * @example
   *   F.splitAt(1, [1, 2, 3]); // [[1], [2, 3]]
   *   F.splitAt(1, 'foo'); // ['f', 'oo']
   *
   * @curried
   * @function
   * @param n A number.
   * @param as A list.
   * @returns A pair of lists.
   */
  splitAt: fn.curry(function(n, as) {
    return [self.take(n, as), self.drop(n, as)];
  }),

  /**
   * Returns a list that contains the elements in the list of `as` split into a
   * pair of lists: a prefix of elements that satisfy the predicate function
   * `p` and the remainder of the list.
   *
   * @summary Splits a list using a predicate function.
   *
   * @example
   *   F.span(F.lt(3), [1, 2, 3]); // [[1, 2], [3]]
   *   F.span(F.neq(o), 'foo'); // ['f', 'oo']
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param as A list.
   * @returns A pair of lists.
   */
  span: fn.curry(function(p, as) {
    return [self.takeWhile(p, as), self.dropWhile(p, as)];
  }),

  /**
   * Returns a list that contains the elements in the list of `as` grouped into
   * sublists of equal elements.
   *
   * It is a special case of the `groupBy` function where the elements are
   * compared using the strict equality `===` operator.
   *
   * @summary Groups the elements in a list.
   *
   * @example
   *   F.group([1, 2, 2, 3, 3, 3]); // [[1], [2, 2], [3, 3, 3]]
   *   F.group('Mississippi'); // ['M', 'i', 'ss', 'i', 'ss', 'i', 'pp', 'i']
   *
   * @param as A list.
   * @returns A new list.
   */
  group: function(as) { return self.groupBy(fn.equal, as); },

  /**
   * Returns a list that contains the elements in the list of `as` grouped into
   * sublists that satisfy the comparator function `f`.
   *
   * @summary Groups the elements in a list using a comparator function.
   *
   * @curried
   * @function
   * @param f A comparator function.
   * @param as A list.
   * @returns A new list.
   */
  groupBy: fn.curry(function groupBy(f, as) {
    var b  = base.head(as),
        bs = self.span(f(b), base.tail(as));

    return base.empty(as) ?
      [] :
      base.prepend(
        base.prepend(b, base.head(bs)),
        groupBy(f, base.last(bs))
      );
  }),
};

},{"../fn":7,"./base":9,"./fold":11}],17:[function(require,module,exports){
'use strict';

var base  = require('./base'),
    build = require('./build'),
    fn    = require('../fn');

var self;

/**
 * This module defines zip operations on lists.
 *
 * @private
 * @module fkit/list/zip
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Returns the lists of `as` and `bs` zipped with the binary function `f`.
   *
   * @summary Zips two lists with a function.
   *
   * @curried
   * @function
   * @param f A binary function.
   * @param as A list.
   * @param bs A list.
   * @returns A new list.
   */
  zipWith: fn.curry(function(f, as, bs) {
    var n = Math.min(as.length, bs.length);

    return base
      .toArray(as.slice(0, n))
      .map(function(a, i) { return f(a, bs[i]); });
  }),

  /**
   * Returns the lists of `as` and `bs` zipped into a list of pairs.
   *
   * It is a special case of the `zipWith` function where the elements are combined
   * using the `F.pair` function.
   *
   * @summary Zips two lists into list of pairs.
   *
   * @example
   *   F.zip([1, 2, 3], [4, 5, 6]); // [[1, 4], [2, 5], [3, 6]]
   *   F.zip('foo', 'bar'); // [['f', 'b'], ['o', 'a'], ['o', 'r']]
   *
   * @curried
   * @function
   * @param as A list.
   * @param bs A list.
   * @returns A new list.
   */
  zip: fn.curry(function(as, bs) {
    return self.zipWith(build.pair, as, bs);
  }),

  /**
   * Returns the list of pairs `as` unzipped into a pair of lists.
   *
   * @summary Unzips a list of pairs into a pair of lists.
   *
   * @example
   *   F.unzip([[1, 4], [2, 5], [3, 6]]); // [[1, 2, 3], [4, 5, 6]]
   *   F.unzip([['f', 'b'], ['o', 'a'], ['o', 'r']]); // ['foo', 'bar']
   *
   * @param as A list.
   * @returns A new list.
   */
  unzip: function(as) {
    var s = base.mempty(as[0]);

    return as.reduceRight(function(p, ps) {
      var a = ps[0], b = ps[1], as = p[0], bs = p[1];
      return [base.prepend(a, as), base.prepend(b, bs)];
    }, [s, s]);
  },
};

},{"../fn":7,"./base":9,"./build":10}],18:[function(require,module,exports){
'use strict';

var fn  = require('./fn'),
    map = require('./list/map');

var self;

/**
 * This module defines logic functions.
 *
 * @module fkit/logic
 * @summary Logical Functions and Combinators
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Returns the result of `b && a`.
   *
   * @summary The logical AND operator.
   *
   * @curried
   * @function
   * @param a A boolean value.
   * @param b A boolean value.
   * @returns A boolean value.
   */
  and: fn.curry(function(a, b) { return b && a; }),

  /**
   * Returns the result of `b || a`.
   *
   * @summary The logical OR operator.
   *
   * @curried
   * @function
   * @param a A boolean value.
   * @param b A boolean value.
   * @returns A boolean value.
   */
  or: fn.curry(function(a, b) { return b || a; }),

  /**
   * Returns the result of `!a`.
   *
   * @summary The logical NOT operator.
   *
   * @param a A boolean.
   * @returns A boolean value.
   */
  not: function(a) { return !a; },

  /**
   * If `p(a)` is true then `f` is applied to `a`, otherwise `g` is applied to
   * `a`.
   *
   * @summary Branches execution based on a predicate function.
   *
   * @example
   *   function big(a) { return a + ' is a big number'; }
   *   function small(a) { return a + ' is a small number'; }
   *   var f = F.branch(F.gt(10), big, small);
   *   f(10); // small number
   *   f(11); // big number
   *
   * @curried
   * @function
   * @param p A predicate function.
   * @param f A function.
   * @param g A function.
   * @param a A value.
   * @returns A value.
   */
  branch: fn.curry(function(p, f, g, a) {
    return p(a) ? f(a) : g(a);
  }),

  /**
   * Applies the list of predicate functions `ps` to the value `a` and returns
   * their conjunction.
   *
   * @example
   *   var ps = [F.gt(1), F.gt(2)];
   *   F.whereAll(ps, 1); // false
   *   F.whereAll(ps, 2); // false
   *   F.whereAll(ps, 3); // true
   *
   * @curried
   * @function
   * @param ps A list of predicate functions.
   * @param a A value.
   * @returns A boolean value.
   */
  whereAll: fn.curry(function(ps, a) {
    return ps.map(fn.applyRight(a)).reduce(self.and, true);
  }),

  /**
   * Applies the list of predicate functions `ps` to the value `a` and returns
   * their disjunction.
   *
   * @example
   *   var ps = [F.gt(1), F.gt(2)];
   *   F.whereAny(ps, 1); // false
   *   F.whereAny(ps, 2); // true
   *   F.whereAny(ps, 3); // true
   *
   * @curried
   * @function
   * @param ps A list of predicate functions.
   * @param a A value.
   * @returns A boolean value.
   */
  whereAny: fn.curry(function(ps, a) {
    return ps.map(fn.applyRight(a)).reduce(self.or, false);
  }),
};

},{"./fn":7,"./list/map":12}],19:[function(require,module,exports){
'use strict';

var fn = require('./fn');

/**
 * This module defines math functions.
 *
 * @module fkit/math
 * @summary Yay, Numbers!
 * @author Josh Bassett
 */
module.exports = {
  /**
   * Returns the result of `b + a`.
   *
   * @summary The addition operator.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A number.
   */
  add: fn.curry(function(a, b) { return b + a; }),

  /**
   * Returns the result of `b - a`.
   *
   * @summary The subtraction operator.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A number.
   */
  sub: fn.curry(function(a, b) { return b - a; }),

  /**
   * Returns the result of `b * a`.
   *
   * @summary The multiplication operator.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A number.
   */
  mul: fn.curry(function(a, b) { return b * a; }),

  /**
   * Returns the result of `b / a`.
   *
   * @summary The division operator.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A number.
   */
  div: fn.curry(function(a, b) { return b / a; }),

  /**
   * Returns the result of `b % a`.
   *
   * @summary The modulo operator.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A number.
   */
  mod: fn.curry(function(a, b) { return b % a; }),

  /**
   * Returns the largest of the numbers `a` and `b`.
   *
   * @summary Determines the largest of two numbers.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A number.
   */
  max: fn.curry(function(a, b) { return b > a ? b : a; }),

  /**
   * Returns the smallest of the numbers `a` and `b`.
   *
   * @summary Determines the smallest of two numbers.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A number.
   */
  min: fn.curry(function(a, b) { return a > b ? b : a; }),

  /**
   * Returns the negation of the number `a`.
   *
   * @summary The negation operator.
   *
   * @param a A number.
   * @returns A number.
   */
  negate: function(a) { return -a; },

  /**
   * Returns `true` if the value `a` is equal (`==`) to the value `b`, false
   * otherwise.
   *
   * @summary The non-strict equality operator.
   *
   * @curried
   * @function
   * @param a A value.
   * @param b A value.
   * @returns A boolean value.
   */
  eq: fn.curry(function(a, b) { return b == a; }),

  /**
   * Returns `true` if the value `a` is not equal (`!=`) to the value `b`,
   * false otherwise.
   *
   * @summary The non-strict inequality operator.
   *
   * @curried
   * @function
   * @param a A value.
   * @param b A value.
   * @returns A boolean value.
   */
  neq: fn.curry(function(a, b) { return b != a; }),

  /**
   * Returns `true` if the value `a` is greater than the value `b`, false
   * otherwise.
   *
   * @summary The greater than operator.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A boolean value.
   */
  gt: fn.curry(function(a, b) { return b > a; }),

  /**
   * Returns `true` if the value `a` is greater than or equal to the value `b`,
   * false otherwise.
   *
   * @summary The greater than or equal operator.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A boolean value.
   */
  gte: fn.curry(function(a, b) { return b >= a; }),

  /**
   * Returns `true` if the value `a` is less than the value `b`, false
   * otherwise.
   *
   * @summary The less than operator.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A boolean value.
   */
  lt: fn.curry(function(a, b) { return b < a; }),

  /**
   * Returns `true` if the value `a` is less than or equal to the value `b`,
   * false otherwise.
   *
   * @summary The less than or equal operator.
   *
   * @curried
   * @function
   * @param a A number.
   * @param b A number.
   * @returns A boolean value.
   */
  lte: fn.curry(function(a, b) { return b <= a; }),

  /**
   * Returns the result of `a + 1`.
   *
   * @summary Increments a number.
   *
   * @param a A number.
   * @returns A number.
   */
  inc: function(a) { return a + 1; },

  /**
   * Returns the result of `a - 1`.
   *
   * @summary Decrements a number.
   *
   * @param a A number.
   * @returns A number.
   */
  dec: function(a) { return a - 1; },

  /**
   * Returns a random integer between `a` and `b`.
   *
   * @summary Generates a random integer.
   *
   * @param a A number.
   * @param b A number.
   * @returns A number.
   */
  randomInt: fn.curry(function(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }),

  /**
   * Returns a random float between `a` and `b`.
   *
   * @summary Generates a random float.
   *
   * @param a A number.
   * @param b A number.
   * @returns A number.
   */
  randomFloat: fn.curry(function(a, b) {
    return (Math.random() * (b - a)) + a;
  }),
};

},{"./fn":7}],20:[function(require,module,exports){
'use strict';

var fn   = require('./fn'),
    set  = require('./list/set'),
    util = require('./util');

var self;

/**
 * This module defines operations on objects.
 *
 * @module fkit/obj
 * @summary Objects
 * @author Josh Bassett
 */
self = module.exports = {
  /**
   * Returns the result of the method `k` of object `o` applied to the value
   * `a`.
   *
   * @summary Applies a method to a method.
   *
   * @example
   *   var person = {sayHi: function(a) { return ['Hi', a, '!'].join(' '); }};
   *   F.applyMethod(sayHi, 'Jane', person); // Hi Jane!
   *
   * @curried
   * @function
   * @param k A string.
   * @param a A value.
   * @param o An object.
   * @returns A value.
   */
  applyMethod: fn.curry(function(k, a, o) {
    return o[k](a);
  }),

  /**
   * Returns the result of the method `k` of object `o` applied to the values
   * `a` and `b`.
   *
   * @summary Applies a method to two values.
   *
   * @example
   *   var person = {sayHi: function(a, b) { return ['Hi', a, b, '!'].join(' '); }};
   *   F.applyMethod2(sayHi, 'Jane', 'Appleseed', person); // Hi Jane Appleseed!
   *
   * @curried
   * @function
   * @param k A string.
   * @param a A value.
   * @param b A value.
   * @param o An object.
   * @returns A value.
   */
  applyMethod2: fn.curry(function(k, a, b, o) {
    return o[k](a, b);
  }),

  /**
   * Returns the result of the method `k` of object `o` applied to the values
   * `a`, `b`, and `c`.
   *
   * @summary Applies a method to three values.
   *
   * @example
   *   var person = {sayHi: function(a, b, c) { return ['Hi', a, b, c, '!'].join(' '); }};
   *   F.applyMethod3(sayHi, 'Ms', 'Jane', 'Appleseed', person); // Hi Ms Jane Appleseed!
   *
   * @curried
   * @function
   * @param k A string.
   * @param a A value.
   * @param b A value.
   * @param c A value.
   * @param o An object.
   * @returns A value.
   */
  applyMethod3: fn.curry(function(k, a, b, c, o) {
    return o[k](a, b, c);
  }),

  /**
   * Returns a copy of the objects in the list of `os`.
   *
   * Properties with the same key will take precedence from right to left.
   *
   * The copy will have the *same* prototype as the *first* object in the list.
   *
   * @summary Creates a copy of an object.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, city: 'Melbourne'};
   *   F.copy(person, {name: 'Steve'}); // {name: 'Steve', age: 20, city: 'Melbourne'}
   *
   * @function
   * @param os A list.
   * @returns A new object.
   */
  copy: fn.variadic(function(o, ps) {
    return util.extend(new o.constructor(), [o].concat(ps));
  }),

  /**
   * Returns the property at the key `k` in the object `o`.
   *
   * @summary Gets a property of an object.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, city: 'Melbourne'};
   *   F.get('name', person); // 'Jane'
   *
   * @curried
   * @function
   * @param k A string.
   * @param o An object.
   * @returns A value.
   */
  get: fn.curry(function(k, o) { return o[k]; }),

  /**
   * Returns the property at the key path `ks` in the object `o`.
   *
   * @summary Gets a property of an object using a key path.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, address: {city: 'Melbourne', country: 'Australia'}};
   *   F.getIn(['address', 'city'], person); // 'Melbourne'
   *
   * @curried
   * @function
   * @param ks A list.
   * @param o An object.
   * @returns A value.
   */
  getIn: fn.curry(function(ks, o) {
    return ks.reduce(function(a, b) {
      return (a !== undefined) ? a[b] : undefined;
    }, o);
  }),

  /**
   * Returns a copy of the object `o` with the property `k` set to the value
   * `v`.
   *
   * @summary Sets a property of an object.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, city: 'Melbourne'};
   *   F.set('name', 'Steve', person); // {name: 'Steve', age: 20, city: 'Melbourne'}
   *
   * @curried
   * @function
   * @param k A string.
   * @param v A value.
   * @param o An object.
   * @returns A new object.
   */
  set: fn.curry(function(k, v, o) {
    var p = {};
    p[k] = v;
    return self.copy(o, p);
  }),

  /**
   * Returns a copy of the object `o` with the property `k` updated with the
   * function `f`.
   *
   * @summary Updates a property of an object with a function.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, city: 'Melbourne'};
   *   F.update('age', F.inc, person); // {name: 'Jane', age: 21, city: 'Melbourne'}
   *
   * @curried
   * @function
   * @param k A string.
   * @param f A function.
   * @param o An object.
   * @returns A new object.
   */
  update: fn.curry(function(k, f, o) {
    return self.set(k, f(self.get(k, o)), o);
  }),

  /**
   * Returns a copy of the object `o` *with* the properties in the list of
   * `ks`.
   *
   * @summary Picks properties of an object.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, city: 'Melbourne'};
   *   F.pick(['name', 'age'], person); // {name: 'Jane', age: 20}
   *
   * @curried
   * @function
   * @param ks A list.
   * @param o An object.
   * @returns A new object.
   */
  pick: fn.curry(function(ks, o) {
    return ks.reduce(function(p, k) {
      return self.set(k, self.get(k, o), p);
    }, {});
  }),

  /**
   * Returns a copy of the object `o` *without* the properties in the list of
   * `ks`.
   *
   * @summary Omits properties of an object.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, city: 'Melbourne'};
   *   F.omit(['name', 'age'], person); // {city: 'Melbourne'}
   *
   * @curried
   * @function
   * @param ks A list.
   * @param o An object.
   * @returns A new object.
   */
  omit: fn.curry(function(ks, o) {
    return set
      .difference(self.keys(o), ks)
      .reduce(function(p, k) {
        return self.set(k, self.get(k, o), p);
      }, {});
  }),

  /**
   * Returns a list of key-value pairs for the properties of the object `o`.
   *
   * @summary Gets the key-value pairs of an object.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, city: 'Melbourne'};
   *   F.pairs(person); // [['name', 'Jane'], ['age', 20], ['city', 'Melbourne']]
   *
   * @param o An object.
   * @returns A new list.
   */
  pairs: function(o) {
    return Object.keys(o).map(function(k) {
      return [k, self.get(k, o)];
    });
  },

  /**
   * Returns a list of keys for the properties of the object `o`.
   *
   * @summary Gets the keys of an object.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, city: 'Melbourne'};
   *   F.keys(person); // ['name', 'age', 'city']
   *
   * @param o An object.
   * @returns A new list.
   */
  keys: function(o) {
    return Object.keys(o);
  },

  /**
   * Returns a list of values for the properties of the object `o`.
   *
   * @summary Gets the values of an object.
   *
   * @example
   *   var person = {name: 'Jane', age: 20, city: 'Melbourne'};
   *   F.values(person); // ['Jane', 20, 'Melbourne']
   *
   * @param o An object.
   * @returns A new list.
   */
  values: function(o) {
    return Object
      .keys(o)
      .map(fn.flip(self.get)(o));
  },
};

},{"./fn":7,"./list/set":14,"./util":22}],21:[function(require,module,exports){
'use strict';

var fn = require('./fn');

/**
 * This module defines string functions.
 *
 * @module fkit/string
 * @summary Strings
 * @author Josh Bassett
 */
module.exports = {
  /**
   * @summary Converts a string to uppercase.
   *
   * @param s A string.
   * @returns A new string.
   */
  toUpper: function(s) { return s.toUpperCase(); },

  /**
   * @summary Converts a string to lowercase.
   *
   * @param s A string.
   * @returns A new string.
   */
  toLower: function(s) { return s.toLowerCase(); },

  /**
   * Returns the result of replacing term `a` with the string `b` in the string
   * `s`.
   *
   * @summary Replaces a term in a string.
   *
   * @example
   *   F.replace('r', 'z', 'bar'); // baz
   *   F.replace(/$hello/, 'goodbye', 'hello world!'); // goodbye world!
   *
   * @curried
   * @function
   * @param a A string or a regexp.
   * @param b A string.
   * @param s A string.
   * @returns A new string.
   */
  replace: fn.curry(function(a, b, s) {
    return s.replace(a, b);
  }),
};

},{"./fn":7}],22:[function(require,module,exports){
'use strict';

module.exports = {
  extend: function(target, objects) {
    objects.forEach(function(object) {
      Object.getOwnPropertyNames(object).forEach(function(property) {
        target[property] = object[property];
      });
    });
    return target;
  },

  slice: Array.prototype.slice
};

},{}],23:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],24:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],25:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],26:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":24,"./encode":25}],27:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":23,"querystring":26}]},{},[1]);
