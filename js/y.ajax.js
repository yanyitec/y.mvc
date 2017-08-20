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
var Y;
(function (Y) {
    var HttpRequest = (function (_super) {
        __extends(HttpRequest, _super);
        function HttpRequest(opts) {
            var _this = _super.call(this) || this;
            _this.opts = opts;
            var xhr = _this.xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    var dataType = opts.dataType || "";
                    if (dataType === "xml") {
                        _this.resolve(xhr.responseXML);
                    }
                    else if (dataType === "json") {
                        var json = void 0;
                        try {
                            json = JSON.parse(xhr.responseText);
                        }
                        catch (ex) {
                            _this.reject(ex);
                        }
                        _this.resolve(json);
                    }
                    _this.resolve(xhr.responseText);
                }
            };
            var data = opts.data;
            var url = opts.url;
            var method = opts.method ? opts.method.toString().toUpperCase() : "GET";
            var type = opts.type;
            if (method === "GET") {
                if (typeof data === "object") {
                    url += url.indexOf("?") >= 0 ? "&" : "?";
                    for (var n in data) {
                        url += encodeURIComponent(n);
                        url += "=";
                        var v = data[n];
                        url += encodeURIComponent(v === undefined || v === null ? "" : v.toString());
                        url += "&";
                    }
                }
                data = undefined;
            }
            else {
                if (typeof data === "object") {
                    if (type === "json") {
                        data = JSON.stringify(data);
                    }
                    else if (type === "xml") {
                        throw new Error("Not implement");
                    }
                    else {
                        var encoded = "";
                        for (var n in data) {
                            if (encoded)
                                encoded += "&";
                            encoded += encodeURIComponent(n);
                            encoded += "=";
                            var v = data[n];
                            encoded += encodeURIComponent(v === undefined || v === null ? "" : v.toString());
                        }
                        data = encoded;
                    }
                }
            } //end if
            var contentType = contentTypes[type];
            if (contentType)
                xhr.setRequestHeader("Content-Type", contentType);
            var headers = opts.headers;
            if (headers) {
                for (var n in headers)
                    xhr.setRequestHeader(n, headers[n]);
            }
            xhr.open(method, url, opts.sync);
            xhr.send(data);
            return _this;
        } //end constructor
        return HttpRequest;
    }(Y.Promise));
    Y.HttpRequest = HttpRequest;
    var contentTypes = HttpRequest.contentTypes = {
        "json": "application/json",
        "text": "application/text"
    };
    function ajax(opts) { return new HttpRequest(opts); }
    Y.ajax = ajax;
})(Y || (Y = {}));
