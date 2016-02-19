var clone, pegasusProvider,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  slice = [].slice;

angular.module('pegasus.services', ['LocalForageModule', 'angularMoment']).config(function($localForageProvider, $httpProvider) {
  $localForageProvider.config({
    name: 'pegasus_gateway',
    description: 'pegasus local storage information'
  });
  $httpProvider.interceptors.push('pegasus_interceptor');
}).factory('pegasus_interceptor', function($q, $localForage, $rootScope, pegasus_config) {
  return {
    request: function(config) {
      var append_if, append_when, defer;
      append_when = ['apps/', 'lang/', 'templates/'];
      append_if = append_when.map(function(i) {
        return config.url.indexOf(i) === 0;
      }).filter(function(i) {
        return i;
      }).length;
      if (append_if) {
        config.url = cdn + config.url;
      }
      if (~config.url.indexOf(pegasus_config.server)) {
        defer = $q.defer();
        $localForage.getItem('_peg_auth').then(function(data) {
          config.headers.Authenticate = data;
          defer.resolve(config);
        }, function(data) {
          defer.resolve(config);
        });
        return defer.promise;
      } else {
        return config;
      }
    },
    responseError: function(response) {
      if (response.config.url.includes(pegasus_config.server) && response.status === 401 && response.data.message.includes("NOT Logged")) {
        $localForage.removeItem('_peg_auth');
        $rootScope.$broadcast('pegasus.api.unauthorized', {});
      }
      return $q.reject(response);
    }
  };
}).factory('pegasus_config', function() {
  var settings;
  return settings = {
    server: null
  };
}).factory('pegasus_api', function($q, $http, $localForage, pegasus_config) {
  var api;
  return api = {
    config: pegasus_config,
    url_encode: function(data) {
      return Object.keys(data).map(function(k) {
        return (encodeURIComponent(k)) + "=" + (encodeURIComponent(data[k]));
      }).join('&');
    },
    get_base_url: function() {
      var baseLocalUrl, baseUrl, index1, index2, pathname, url;
      url = location.href;
      baseUrl = url.substring(0, url.indexOf('/', 14));
      if (~baseUrl.indexOf('http://localhost') || ~baseUrl.indexOf('https://cdn.pegasusgateway.com')) {
        url = location.href;
        pathname = location.pathname;
        index1 = url.indexOf(pathname);
        index2 = url.indexOf("/", index1 + 1);
        baseLocalUrl = url.substr(0, index2);
        baseLocalUrl + "/";
        baseUrl = 'https://pegasus1.pegasusgateway.com/';
        return baseUrl;
      } else {
        return baseUrl + '/';
      }
    },
    set_server: function(server) {
      if (server != null) {
        api.config.server = server;
      } else {
        api.config.server = api.get_base_url() + "api/v0/";
      }
    },
    interpolate: function(str, data, prefix) {
      var k, v;
      if (data == null) {
        data = {};
      }
      if (prefix == null) {
        prefix = ":";
      }
      for (k in data) {
        v = data[k];
        if (~str.indexOf("" + prefix + k)) {
          str = str.replace("" + prefix + k, v);
          delete data[k];
        }
      }
      if (!Object.keys(data).length) {
        data = null;
      }
      return [str, data];
    },
    _process: function(resources, data) {
      var j, len, r, ref, resource, url;
      resource = '';
      for (j = 0, len = resources.length; j < len; j++) {
        r = resources[j];
        if (r != null) {
          resource += "/" + r;
        }
      }
      if (!(typeof data === "object" || data instanceof Object)) {
        resource += "/" + data;
        data = null;
      }
      resource = resource.slice(1);
      ref = api.interpolate(resource, data), resource = ref[0], data = ref[1];
      url = api.config.server + resource;
      return [url, data];
    },
    get: function() {
      var data, j, ref, resources, url;
      resources = 2 <= arguments.length ? slice.call(arguments, 0, j = arguments.length - 1) : (j = 0, []), data = arguments[j++];
      if (data == null) {
        data = {};
      }
      ref = api._process(resources, data), url = ref[0], data = ref[1];
      if (data != null) {
        url += "?" + (api.url_encode(data));
      }
      return $http.get(url);
    },
    post: function() {
      var data, j, ref, resources, url;
      resources = 2 <= arguments.length ? slice.call(arguments, 0, j = arguments.length - 1) : (j = 0, []), data = arguments[j++];
      if (data == null) {
        data = {};
      }
      ref = api._process(resources, data), url = ref[0], data = ref[1];
      return $http.post(url, data);
    },
    put: function() {
      var data, j, ref, resources, url;
      resources = 2 <= arguments.length ? slice.call(arguments, 0, j = arguments.length - 1) : (j = 0, []), data = arguments[j++];
      if (data == null) {
        data = {};
      }
      ref = api._process(resources, data), url = ref[0], data = ref[1];
      return $http.put(url, data);
    },
    "delete": function() {
      var data, j, ref, resources, url;
      resources = 2 <= arguments.length ? slice.call(arguments, 0, j = arguments.length - 1) : (j = 0, []), data = arguments[j++];
      if (data == null) {
        data = {};
      }
      ref = api._process(resources, data), url = ref[0], data = ref[1];
      if (data != null) {
        url += "?" + (api.url_encode(data));
      }
      return $http["delete"](url);
    },
    login: function(login_data) {
      var defer;
      defer = $q.defer();
      api.post('login', login_data).success(function(data) {
        $localForage.setItem('_peg_auth', data.auth);
        defer.resolve(data);
      }).error(function(data) {
        defer.reject(data);
      });
      return defer.promise;
    },
    logout: function() {
      api.get('logout').success(function(data) {
        $localForage.removeItem('_peg_auth');
      });
    }
  };
}).provider('pegasus', pegasusProvider = function() {
  var apps;
  apps = [];
  this.add_app = function(name, state, icon) {
    apps.push({
      'name': name,
      'state': state,
      'icon': icon
    });
    return console.log('APP', name);
  };
  this.$get = function($q, $localForage, $timeout, $http, pegasus_api) {
    var pegasus;
    return pegasus = {
      apps: apps,
      api: pegasus_api,
      overrides: {},
      date: moment,
      local: $localForage,
      objects: {
        user: null,
        users: [],
        groups: [],
        vehicles: [],
        devices: [],
        sims: [],
        actions: [],
        triggers: [],
        rules: [],
        assets: [],
        ibuttons: [],
        fingerprints: [],
        triggers: [],
        tasks: [],
        geofences: [],
        geofence_types: []
      },
      load_items: function(items, page, cleared) {
        var defer, item_set;
        if (page == null) {
          page = 1;
        }
        defer = $q.defer();
        if (!cleared) {
          pegasus.objects[items] = [];
          $timeout(function() {
            return pegasus.load_items(items, page, true)["finally"](function() {
              defer.resolve();
            });
          }, 25);
          return defer.promise;
        }
        item_set = pegasus_api.get(items, {
          page: page
        });
        item_set.success(function(data) {
          if (data.page) {
            pegasus.objects[items] = pegasus.objects[items].concat(data.data);
            if (data.page < data.pages) {
              pegasus.load_items(items, data.page + 1, true)["finally"](function() {
                return defer.resolve();
              });
            } else {
              defer.resolve();
            }
          } else {
            pegasus.objects[items] = data;
            defer.resolve();
          }
        }).error(function(data) {
          defer.reject(data);
        });
        return defer.promise;
      },
      load_user: function() {
        var defer;
        defer = $q.defer();
        pegasus_api.get('user').success(function(data) {
          pegasus.objects.user = data;
          defer.resolve(data);
        }).error(function(data) {
          defer.reject(data);
        });
        return defer.promise;
      },
      load_all: function() {
        var defer, items, loaded;
        defer = $q.defer();
        items = ['users', 'groups', 'vehicles', 'devices', 'sims' , 'assets', 'ibuttons', 'fingerprints', 'triggers', 'tasks', 'geofences', 'geofence_types'];
        loaded = 0;
        pegasus.load_user().then(function(data) {
          var item, j, len;
          for (j = 0, len = items.length; j < len; j++) {
            item = items[j];
            pegasus.load_items(item)["finally"](function() {
              if (++loaded === items.length) {
                defer.resolve(pegasus.objects);
                return;
              }
            });
          }
        }, function(data) {
          defer.reject(data);
        });
        return defer.promise;
      },
      _initializing: false,
      init: function() {
        var defer;
        defer = $q.defer();
        if (pegasus._initializing) {
          defer.reject('init already in progress');
          return defer.promise;
        } else {
          pegasus._initializing = true;
        }
        pegasus_api.get('login').success(function(data) {
          pegasus_api.get('tz').success(function(data) {
            var language, system_tz;
            if (data.set != null) {
              pegasus.date.tz.setDefault(data.set);
            } else {
              system_tz = Intl? Intl.DateTimeFormat().resolvedOptions().timeZone : jstz().timezone_name;
              if (indexOf.call(data.allowed, system_tz) < 0) {
                system_tz = 'UTC';
              }
              $http.defaults.headers.common['X-Time-Zone'] = system_tz

            }
            language = navigator.language || navigator.browserLanguage || navigator.systemLanguage || navigator.userLanguage;
            moment.locale(language || 'en');
          });
          pegasus.load_all().then(function(data) {
            pegasus._initializing = false;
            defer.resolve(data);
          });
        }).error(function(data) {
          pegasus._initializing = false;
          defer.reject(data);
        });
        return defer.promise;
      }
    };
  };
});

clone = function(obj) {
  var key, temp;
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  temp = new obj.constructor();
  for (key in obj) {
    temp[key] = clone(obj[key]);
  }
  return temp;
};

angular.module('pegasus.directives', []).directive('pegParseJson', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attr, ctrl) {
      ctrl.$parsers.unshift(function(viewValue) {
        var e;
        try {
          return JSON.parse(viewValue);
        } catch (_error) {
          e = _error;
          return viewValue;
        }
      });
    }
  };
}).directive('pegRequires', function(ngIfDirective, pegasus, $timeout, $q) {
  var directive, ngIf, verify;
  ngIf = ngIfDirective[0];
  verify = function(_read, _write) {
    var _read_missing, _scope, _write_missing, admin, defer, j, l, len, len1, scopes;
    defer = $q.defer();
    if (pegasus.objects.user == null) {
      $timeout(function() {
        verify(_read, _write).then(function(value) {
          defer.resolve(value);
        });
      }, 500);
      return defer.promise;
    }
    scopes = pegasus.objects.user.scopes;
    admin = pegasus.objects.user.is_staff;
    if (admin) {
      defer.resolve(true);
      return defer.promise;
    }
    _read_missing = [];
    for (j = 0, len = _read.length; j < len; j++) {
      _scope = _read[j];
      if (scopes[_scope] === 'r' || scopes[_scope] === 'w') {
        continue;
      }
      _read_missing.push(_scope);
    }
    _write_missing = [];
    for (l = 0, len1 = _write.length; l < len1; l++) {
      _scope = _write[l];
      if (scopes[_scope] === 'w') {
        continue;
      }
      _write_missing.push(_scope);
    }
    defer.resolve(!(_read_missing.length || _write_missing.length));
    return defer.promise;
  };
  return directive = {
    transclude: ngIf.transclude,
    priority: ngIf.priority,
    terminal: ngIf.terminal,
    restrict: ngIf.restrict || 'A',
    link: function(scope, element, attrs) {
      var __args, _read, _show, _write;
      __args = arguments;
      _read = attrs.read || '';
      _write = attrs.write || '';
      _read = _read.split(',');
      _write = _write.split(',');
      _read = _read.map(function(i) {
        return i.trim();
      });
      _write = _write.map(function(i) {
        return i.trim();
      });
      _read = _read.filter(function(i) {
        return i.length;
      });
      _write = _write.filter(function(i) {
        return i.length;
      });
      _show = true;
      attrs.ngIf = function() {
        return _show;
      };
      verify(_read, _write).then(function(show) {
        _show = show;
        ngIf.link.apply(ngIf, __args);
      });
    }
  };
}).directive('selector', function() {
  return {
    restrict: "EAC",
    compile: function(element, attrs) {
      if (attrs.heading == null) {
        attrs.heading = false;
      }
      if (attrs.single == null) {
        attrs.single = false;
      }
      if (attrs.orderby == null) {
        attrs.orderby = attrs.prop;
      }
      if (attrs.limit == null) {
        attrs.limit = false;
      }
      if (attrs.page_size == null) {
        attrs.page_size = 50;
      }
      if (attrs.mapWith == null) {
        attrs.mapWith = null;
      }
      if (attrs.mapWith == null) {
        attrs.mapWith = null;
      }
      if (attrs.selectorType == null) {
        attrs.selectorType = "split";
      }
    },
    scope: {
      heading: '@',
      prop: '@',
      available: '=',
      assigned: '=',
      orderby: '@',
      single: '@',
      limit: '@',
      page_size: '@',
      mapWith: '@',
      selectorType: '@'
    },
    controller: function($scope, $timeout) {
      var _set_available, init, template_map;
      template_map = {
        tabbed: "templates/directives/selector/tabbed.html",
        split: "templates/directives/selector/split.html"
      };
      $scope.selector = template_map[$scope.selectorType];
      $scope._assigned = [];
      _set_available = function() {
        $scope._available = $scope.available.slice(0).filter(function(x) {
          return indexOf.call($scope._assigned, x) < 0;
        });
      };
      $scope.selected = {
        available: [],
        assigned: []
      };
      $scope.availablePage = 1;
      $scope.assignedPage = 1;
      if ($scope.assigned == null) {
        $scope.assigned = [];
      }
      if ($scope.available == null) {
        $scope.available = [];
      }
      $scope.assign = function(objs) {
        var index1, index2, item, j, len, obj, prop;
        if (!(objs instanceof Array)) {
          objs = [objs];
        }
        for (j = 0, len = objs.length; j < len; j++) {
          obj = objs[j];
          item = obj;
          if ($scope.mapWith != null) {
            prop = $scope.mapWith;
            item = obj[prop];
          }
          if (~$scope.assigned.indexOf(item)) {
            index1 = $scope.assigned.indexOf(item);
            $scope.assigned.splice(index1, 1);
            index2 = $scope._assigned.indexOf(obj);
            $scope._assigned.splice(index2, 1);
            console.log('deleting', item, obj);
          } else {
            if ($scope.limit > 0 && $scope.assigned.length >= $scope.limit) {
              return;
            }
            $scope.assigned.push(item);
            $scope._assigned.push(obj);
            console.log('inserting', item, obj);
          }
        }
        _set_available();
      };
      $scope.assign_all = function() {
        var j, len, o, ref;
        $scope._assigned = $scope.available;
        if ($scope.mapWith != null) {
          $scope.assigned = [];
          ref = $scope.available;
          for (j = 0, len = ref.length; j < len; j++) {
            o = ref[j];
            $scope.assigned.push(o[$scope.mapWith]);
          }
        } else {
          $scope.assigned = $scope.available;
        }
        _set_available();
      };
      $scope.remove_all = function() {
        $scope.assigned = [];
        $scope._assigned = [];
        _set_available();
      };
      $scope.select = function(key, obj) {
        var set;
        set = $scope.selected[key];
        if (indexOf.call(set, obj) < 0) {
          set.push(obj);
        } else {
          set = set.splice(set.indexOf(obj), 1);
        }
      };
      init = (function(_this) {
        return function() {
          var j, len, n, ref, ref1, x;
          n = $scope.assigned;
          if (n == null) {
            n = [];
          }
          $scope._assigned = [];
          if ($scope.mapWith != null) {
            ref = $scope.available;
            for (j = 0, len = ref.length; j < len; j++) {
              x = ref[j];
              if (ref1 = x[$scope.mapWith], indexOf.call(n, ref1) >= 0) {
                $scope._assigned.push(x);
              }
            }
          } else {
            $scope._assigned = n;
          }
          _set_available();
        };
      })(this);
      $scope.$watch('available', init);
      $scope.$watch('assigned', init);
    },
    link: function(scope, element, attrs) {},
    template: "<div ng-include='selector'></div>"
  };
}).directive('onReadFile', function($parse) {
  return {
    restrict: "A",
    scope: false,
    link: function(scope, element, attrs) {
      var fn;
      fn = $parse(attrs.onReadFile);
      element.on('change', function(onChangeEvent) {
        var reader;
        reader = new FileReader;
        reader.onload = function(onLoadEvent) {
          scope.$apply(function() {
            fn(scope, {
              $fileContent: onLoadEvent.target.result
            });
          });
        };
        reader.readAsText((onChangeEvent.srcElement || onChangeEvent.target).files[0]);
      });
    }
  };
}).directive("slider", function($document, $timeout) {
  return {
    restrict: "E",
    scope: {
      model: "=",
      property: "@",
      step: "@"
    },
    replace: true,
    template: "<div class=\"slider-control\">\n	<div class=\"slider\"></div>\n</div>",
    link: function(scope, element, attrs) {
      var fn1, getP, handles, i, j, len, mv, pTotal, ref, setP, step, updatePositions;
      element = element.children();
      element.css('position', 'relative');
      handles = [];
      pTotal = 0;
      step = function() {
        if (scope.step != null) {
          return parseFloat(scope.step);
        } else {
          return 0;
        }
      };
      getP = function(i) {
        if (scope.property != null) {
          return scope.model[i][scope.property];
        } else {
          return scope.model[i];
        }
      };
      setP = function(i, p) {
        var s;
        s = step();
        if (s > 0) {
          p = Math.round(p / s) * s;
        }
        if (scope.property != null) {
          return scope.model[i][scope.property] = p;
        } else {
          return scope.model[i] = p;
        }
      };
      updatePositions = function() {
        var handle, i, j, len, p, pRunningTotal, results, x;
        pTotal = scope.model.reduce(function(sum, item, i) {
          return sum + getP(i);
        }, 0);
        pRunningTotal = 0;
        results = [];
        for (i = j = 0, len = handles.length; j < len; i = ++j) {
          handle = handles[i];
          p = getP(i);
          pRunningTotal += p;
          x = pRunningTotal / pTotal * 100;
          results.push(handle.css({
            left: x + "%",
            top: "-" + handle.prop("clientHeight") / 2 + "px"
          }));
        }
        return results;
      };
      ref = scope.model;
      fn1 = function(mv, i) {
        var handle, startPleft, startPright, startX;
        if (i === scope.model.length - 1) {
          return;
        }
        handle = angular.element('<div class="slider-handle"></div>');
        handle.css("position", "absolute");
        handles.push(handle);
        element.append(handle);
        startX = 0;
        startPleft = startPright = 0;
        return handle.on("mousedown", function(event) {
          var mousemove, mouseup;
          mousemove = (function(_this) {
            return function(event) {
              return scope.$apply(function() {
                var dp;
                dp = (event.screenX - startX) / element.prop("clientWidth") * pTotal;
                if (dp < -startPleft || dp > startPright) {
                  return;
                }
                setP(i, startPleft + dp);
                setP(i + 1, startPright - dp);
                return updatePositions();
              });
            };
          })(this);
          mouseup = function() {
            $document.unbind("mousemove", mousemove);
            return $document.unbind("mouseup", mouseup);
          };
          event.preventDefault();
          startX = event.screenX;
          startPleft = getP(i);
          startPright = getP(i + 1);
          $document.on("mousemove", mousemove);
          return $document.on("mouseup", mouseup);
        });
      };
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        mv = ref[i];
        fn1(mv, i);
      }
      return scope.$watch("model", updatePositions, true);
    }
  };
}).directive('rdLoading', function() {
  return {
    restrict: 'AE',
    compile: function(element, attrs) {
      var ref;
      if ((ref = attrs.loader) !== 'rectangles' && ref !== 'spinner' && ref !== 'double_bounce') {
        attrs.loader = 'spinner';
      }
    },
    scope: {
      loader: '@'
    },
    template: "<div ng-if='loader==\"rectangles\"' class=\"rectangles\"><div class=\"rect1\"></div><div class=\"rect2\"></div><div class=\"rect3\"></div><div class=\"rect4\"></div><div class=\"rect5\"></div></div>\n<div ng-if='loader==\"double_bounce\"' class=\"loading\"><div class=\"double-bounce1\"></div><div class=\"double-bounce2\"></div></div>\n<div ng-if='loader==\"spinner\"' class=\"spinner\">\n	<div class=\"spinner-container container1\"><div class=\"circle1\"></div><div class=\"circle2\"></div><div class=\"circle3\"></div><div class=\"circle4\"></div></div>\n	<div class=\"spinner-container container2\"><div class=\"circle1\"></div><div class=\"circle2\"></div><div class=\"circle3\"></div><div class=\"circle4\"></div></div>\n	<div class=\"spinner-container container3\"><div class=\"circle1\"></div><div class=\"circle2\"></div><div class=\"circle3\"></div><div class=\"circle4\"></div></div>\n</div>"
  };
}).directive('rdWidget', function() {
  return {
    transclude: true,
    template: '<div class="widget" ng-transclude></div>',
    restrict: 'EA',
    link: function(scope, element, attrs) {}
  };
}).directive('rdWidgetHeader', function() {
  return {
    requires: '^rdWidget',
    scope: {
      title: '@',
      icon: '@'
    },
    transclude: true,
    template: '<div class="widget-header"><i class="fa" ng-class="icon"></i> {{title}} <div class="pull-right" ng-transclude></div></div>',
    restrict: 'E'
  };
}).directive('rdWidgetBody', function() {
  return {
    requires: '^rdWidget',
    scope: {
      loading: '@?',
      classes: '@?'
    },
    transclude: true,
    template: '<div class="widget-body" ng-class="classes"><rd-loading ng-show="loading"></rd-loading><div ng-hide="loading" class="widget-content" ng-transclude></div></div>',
    restrict: 'E'
  };
}).directive('rdWidgetFooter', function() {
  return {
    requires: '^rdWidget',
    transclude: true,
    template: '<div class="widget-footer" ng-transclude></div>',
    restrict: 'E'
  };
});

angular.module('pegasus.filters', []).filter('percentage', function($filter) {
  return function(input, decimals, zeroes) {
    var number;
    if (zeroes == null) {
      zeroes = true;
    }
    if (zeroes === true) {
      number = $filter('number')(input * 100, decimals) || 0;
      return number += '%';
    } else {
      if (input) {
        return $filter('number')(input * 100, decimals) + '%';
      } else {
        return '';
      }
    }
  };
}).filter('megabytes', function($filter) {
  return function(input, decimals, zeroes) {
    var number;
    if (zeroes == null) {
      zeroes = true;
    }
    if (zeroes === true) {
      if (input == null) {
        input = 0;
      }
      number = $filter('number')(input / Math.pow(2, 20), decimals) || 0;
      return number += '%';
    } else {
      if (input) {
        return $filter('number')(input / Math.pow(2, 20), decimals) + ' MB';
      } else {
        return '';
      }
    }
  };
}).filter('slice', function() {
  return function(arr, start, end) {
    if (arr == null) {
      arr = [];
    }
    if (start == null) {
      start = 0;
    }
    return arr.slice(start, end);
  };
}).filter('propsFilter', function() {
  return function(items, props) {
    var item, j, k, len, out, v;
    out = [];
    if (angular.isArray(items)) {
      for (j = 0, len = items.length; j < len; j++) {
        item = items[j];
        for (k in props) {
          v = props[k];
          if (item[k].toString().toLowerCase().indexOf(v.toLowerCase()) !== -1) {
            out.push(item);
            break;
          }
        }
      }
    } else {
      out = items;
    }
    return out;
  };
});

angular.module('pegasus_bundle',['pegasus.services','pegasus.directives','pegasus.filters'])
