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
/// <reference path="y.require.ts" />
var Y;
(function (Y) {
    var readyHandlers = [];
    Y.attach(window, "load", function () {
        var handlers = readyHandlers;
        readyHandlers = undefined;
        for (var i = 0, j = readyHandlers.length; i < j; i++) {
            readyHandlers[i]();
        }
    });
    function ready(handler) {
        if (readyHandlers)
            readyHandlers.push(handler);
        else
            handler();
    }
    Y.ready = ready;
    var Module = (function (_super) {
        __extends(Module, _super);
        function Module(opts) {
            return _super.call(this, opts) || this;
        }
        return Module;
    }(Y.Resource));
    Y.Module = Module;
    Y.ResourceManager.types.module = Module;
    Y.ResourceManager.loaders.module = function (module, opts) {
        Y.ajax({
            url: opts.url,
            method: "GET",
            type: "html"
        }).done(function (html) {
            var element = document.createElement("div");
            parseModuleHtml(html, module);
            module.resolve(module);
        }).fail(function (err) {
            module.reject({ content: undefined, error: err });
        });
    };
    function parseModuleHtml(html, module) {
        var rs = {};
        var container = rs.container = document.createElement("div");
        container.innerHTML = html;
        parseModuleElement(container, rs);
        var taskcount = 1;
        if (rs.stylesheets) {
            for (var i = 0, j = rs.stylesheets.length; i < j; i++) {
                var elem = rs.stylesheets[i];
                var url = elem.href;
                taskcount++;
                Y.ResourceManager.global.fetch({ id: elem.id, url: url, type: "css" }).done(function (res) {
                    module.deps[this.id] = this;
                    if (--taskcount == 0)
                        module.resolve(module);
                });
            }
        }
        if (rs.scripts) {
            for (var i = 0, j = rs.scripts.length; i < j; i++) {
                var elem = rs.scripts[i];
                var url = elem.src;
                var id = elem.id || url;
                taskcount++;
                Y.ResourceManager.global.fetch({ id: id, url: url, type: "js" }).done(function (res) {
                    module.deps[this.id] = this;
                    if (this.element.getAttribute("y-controller")) {
                        module.controllerType = this.resolved_value();
                        if (typeof module.controllerType != "function")
                            throw new Error(this.url + " was set as controller, but it do not exports any class(Function).");
                    }
                    if (--taskcount == 0)
                        module.resolve(module);
                });
            }
        }
    }
    function parseModuleElement(element, rs) {
        if (element.tagName === "SCRIPT" && element.type === "text/javascript") {
            (rs.scripts || (rs.scripts = [])).push({ element: element });
            element.parentNode.removeChild(element);
            return false;
        }
        if (element.tagName === "LINK" && element.type === "text/css" && element.href) {
            (rs.stylesheets || (rs.stylesheets = [])).push({ element: element });
            element.parentNode.removeChild(element);
            return false;
        }
        if (!element.hasChildNodes)
            return;
        var at = 0;
        for (var i = 0, j = element.childNodes.length; i < j; i++) {
            if (parseModuleElement(element.childNodes[at], rs) !== false)
                at++;
        }
    }
})(Y || (Y = {})); //end namespace
