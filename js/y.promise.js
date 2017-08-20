var Y;
(function (Y) {
    var Promise = (function () {
        function Promise() {
        }
        Promise.prototype.done = function (handler) {
            var result = this["@y.promise.result"];
            if (result === undefined) {
                var handlers = (this["@y.promise.doneHandlers"] || (this["@y.promise.doneHandlers"] = []));
                handlers.push(handler);
            }
            else {
                if (result.isSuccess)
                    handler.call(this, result.resolve);
            }
            return this;
        };
        Promise.prototype.fail = function (handler) {
            var result = this["@y.promise.result"];
            if (result === undefined) {
                var handlers = (this["@y.promise.failHandlers"] || (this["@y.promise.failHandlers"] = []));
                handlers.push(handler);
            }
            else {
                if (!result.isSuccess)
                    handler.call(this, result.reject);
            }
            return this;
        };
        Promise.prototype.resolve = function (value) {
            var _this = this;
            if (value.done && value.fail && value != this) {
                value.done(function (value) {
                    _this.resolve(value);
                }).fail(function (error) {
                    _this.reject(error);
                });
                return this;
            }
            this["@y.promise.result"] = { resolve: value, isSuccess: true };
            var handlers = this["@y.promise.doneHandlers"];
            this["@y.promise.doneHandlers"] = this["@y.promise.failHandlers"] = undefined;
            this.resolve = this.reject = function () { throw "Aready resolved"; };
            for (var i = 0, j = handlers.length; i < j; i++)
                handlers[i].call(this, value);
            return this;
        };
        Promise.prototype.reject = function (value) {
            this["@y.promise.result"] = { reject: value, isSuccess: false };
            var handlers = this["@y.promise.failHandlers"];
            this["@y.promise.doneHandlers"] = this["@y.promise.failHandlers"] = undefined;
            this.resolve = this.reject = function () { throw "Aready resolved"; };
            for (var i = 0, j = handlers.length; i < j; i++)
                handlers[i].call(this, value);
            return this;
        };
        Promise.prototype.resolved_value = function () {
            var result = this["@y.promise.result"];
            if (result)
                return result.resolve;
        };
        Promise.prototype.dispose = function () {
            var result = this["@y.promise.result"];
            this["@y.promise.result"] = this["@y.promise.failHandlers"] = this["@y.promise.doneHandlers"] = undefined;
            this.reject = this.done = this.fail = this.resolve
                = this.resolved_value
                    = function () { throw new Error("disposed"); };
        };
        Promise.None = new Promise();
        return Promise;
    }());
    Y.Promise = Promise;
    function promise(handler, delay) {
        var promise = new Promise();
        var resolve = function (result) { return setTimeout(function () { if (!promise["@y.promise.result"])
            promise.resolve(result); }, 0); };
        var reject = function (result) { return setTimeout(function () { if (!promise["@y.promise.result"])
            promise.reject(result); }, 0); };
        if (delay) {
            setTimeout(function () {
                try {
                    handler.call(promise, resolve, reject);
                }
                catch (ex) {
                    promise.reject(ex);
                }
            }, 0);
        }
        else {
            try {
                handler.call(promise, resolve, reject);
            }
            catch (ex) {
                promise.reject(ex);
            }
        }
        return promise;
    }
    Y.promise = promise;
})(Y || (Y = {}));
