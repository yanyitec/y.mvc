var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/// <reference path="y.promise.ts" />
/// <reference path="y.ajax.ts" />
var Y;
(function (Y) {
    window["$exports"] = undefined;
    var Resource = (function (_super) {
        __extends(Resource, _super);
        function Resource(opts, _type) {
            var _this = _super.call(this) || this;
            if (!(_this.opts = opts))
                return _this;
            _this.id = opts.id;
            _this.url = opts.url;
            _this.type = opts.type === undefined ? _type : opts.type;
            if (opts.dispose) {
                _this.dispose = function () { opts.dispose.call(_this); };
            }
            return _this;
        }
        return Resource;
    }(Y.Promise));
    Y.Resource = Resource;
    var ResourceManager = (function () {
        function ResourceManager(name, superior) {
            this.name = name;
            this.superior = superior;
            this.caches = {};
        }
        ResourceManager.prototype.dispose = function () {
            var superior = this.superior;
            this.superior = undefined;
            var caches = this.caches;
            this.caches = undefined;
            var children = this.children;
            this.children = undefined;
            for (var n in caches) {
                var res = caches[n];
                var resolveValue = res.resolved_value();
                if (resolveValue && resolveValue.dispose) {
                    resolveValue.dispose(res);
                }
                res.dispose();
                if (res.element && res.element.parentNode)
                    res.element.parentNode.removeChild(res.element);
                res.element = undefined;
            }
            if (superior)
                delete superior.children[this.name];
            for (var n_1 in children) {
                var child = this.children[n_1];
                child.superior = undefined;
                child.dispose();
            }
        };
        ResourceManager.prototype.fetch = function (idOrOpts) {
            var res;
            var opts;
            var superior = this;
            var type;
            if (typeof idOrOpts === "string") {
                while (superior) {
                    if (res = superior.caches[idOrOpts])
                        break;
                    superior = superior.superior;
                }
                if (res) {
                    return res;
                }
                opts = { id: idOrOpts, url: idOrOpts };
            }
            else {
                opts = idOrOpts;
                var id = (opts.id === undefined) ? opts.url : opts.id;
                while (superior) {
                    if (res = superior.caches[id])
                        break;
                    superior = superior.superior;
                }
                if (res) {
                    return res;
                }
            }
            if (opts.type === undefined && opts.url) {
                var at = opts.url.lastIndexOf(".");
                if (at > 0)
                    type = opts.url.substr(at + 1);
            }
            else {
                type = opts.type;
            }
            var srcType = ResourceManager.types[type] || Resource;
            if (!srcType)
                throw new Error("Cannot load " + opts.url + ", resource type error.");
            res = new srcType(opts, type);
            if (res.id !== undefined) {
                if (opts.global)
                    resourceManager.caches[res.id] = res;
                else
                    this.caches[res.id] = res;
            }
            if (opts.content !== undefined) {
                res.resolve(opts.content === Resource.None ? undefined : opts.content);
                return;
            }
            var loader = ResourceManager.loaders[opts.type];
            if (loader) {
                window["$exports"] = undefined;
                loader(res, opts);
            }
            return res;
        };
        ResourceManager.global = new ResourceManager("@y.resource.global");
        ResourceManager.loaders = {};
        ResourceManager.types = {};
        return ResourceManager;
    }());
    Y.ResourceManager = ResourceManager;
    var get_head = function () {
        var headers = document.getElementsByTagName("head");
        var head = headers && headers.length ? headers[0] : document.body;
        get_head = function () { return head; };
        return head;
    };
    ResourceManager.loaders.js = function (res, opts) {
        var script = document.createElement("script");
        res.element = script;
        script.src = res.url;
        script.type = "text/javascript";
        if (script.onreadystatechange) {
            if (script.readyState === 4 || script.readyState === 'complete') {
                var exports = window["$exports"];
                window["$exports"] = undefined;
                res.resolve(exports);
            }
        }
        else
            script.onload = function () {
                var exports = window["$exports"];
                window["$exports"] = undefined;
                res.resolve(exports);
            };
        script.onerror = function (e) {
            res.reject({ opts: opts, res: res, element: script, content: undefined, error: e || "cannot load script" });
        };
    };
    ResourceManager.loaders.css = function (res, opts) {
        var link = document.createElement("link");
        res.element = link;
        link.href = res.url;
        link.type = "text/css";
        link.rel = "stylesheet";
        if (link.onreadystatechange) {
            if (link.readyState === 4 || link.readyState === 'complete') {
                res.resolve(link.sheet || link.styleSheet);
            }
        }
        else
            link.onload = function () {
                res.resolve(link.sheet || link.styleSheet);
            };
        link.onerror = function (e) {
            res.reject({ opts: opts, res: res, element: link, content: undefined, error: e || "cannot load css" });
        };
    };
    ResourceManager.loaders.html = function (src, opts) {
        Y.ajax({
            url: opts.url,
            method: "GET",
            type: "html"
        }).done(function (html) {
            src.resolve(html);
        }).fail(function (err) {
            src.reject({ opts: opts, content: undefined, error: err });
        });
    };
    var resourceManager = ResourceManager.global;
    Y.require = function (_deps, _complete) {
        var deps;
        var taskcount = 1;
        var complete;
        var promise = new Y.Promise();
        var params = [];
        var hasError = false;
        window["$exports"] = undefined;
        if (arguments.length <= 2) {
            if (_deps.push && _deps.pop && _deps.length !== undefined) {
                deps = _deps;
                complete = _complete;
            }
            else
                deps = arguments;
        }
        var _loop_1 = function (i, j) {
            var idOrOpts = deps[i];
            taskcount++;
            (function (index) {
                var _this = this;
                resourceManager.fetch(idOrOpts).done(function (value) {
                    if (hasError)
                        return;
                    if (value.done && value.fail) {
                        value.done(function (v) {
                            params[i] = v;
                            if (--taskcount == 0) {
                                var result = (complete) ? complete.apply(this, params) : params;
                                promise.resolve(result);
                            }
                        }).fail(function (err) {
                            if (!hasError) {
                                hasError = true;
                                promise.reject(err);
                            }
                        });
                    }
                    else {
                        params[i] = value;
                        if (--taskcount == 0) {
                            var result = (complete) ? complete.apply(_this, params) : params;
                            promise.resolve(result);
                        }
                    }
                }).fail(function (err) {
                    if (!hasError) {
                        hasError = true;
                        promise.reject(err);
                    }
                });
            })(i);
        };
        for (var i = 0, j = deps.length; i < j; i++) {
            _loop_1(i, j);
        }
        if (--taskcount == 0 && !hasError) {
            var result = (complete) ? complete.apply(this, params) : params;
            promise.resolve(result);
        }
        return promise;
    };
    Y.require.define = function (id, value) {
        if (typeof id == "object") {
            for (var n in id)
                Y.require.define(n, id[n]);
            return Y.require;
        }
        var opts = { id: id, content: value === undefined ? Resource.None : value };
        var res = resourceManager.caches[id] = new Resource(opts);
        return Y.require;
    };
    Y.require.base = undefined;
})(Y || (Y = {}));
