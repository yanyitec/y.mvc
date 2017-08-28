var Y;
(function (Y) {
    var Timer = (function () {
        function Timer(interval) {
            this.interval = interval;
        }
        Timer.prototype.unsubscribe = function (handler) {
            if (this._handlers) {
                var handlers = this._handlers;
                for (var i = 0, j = handlers.length; i < j; i++) {
                    var h = handlers.shift();
                    if (h != handler)
                        handlers.push(handler);
                }
            }
            return this;
        };
        Timer.prototype.subscribe = function (handler) {
            var _this = this;
            if (!this._handlers) {
                this._handlers = [handler];
                this._timer = setInterval(function () {
                    var handlers = _this._handlers;
                    for (var i = 0, j = handlers.length; i < j; i++) {
                        var handler_1 = handlers.shift();
                        if (handler_1() !== false)
                            handlers.push(handler_1);
                    }
                    if (handlers.length == 0) {
                        _this._handlers = undefined;
                        clearInterval(_this._timer);
                        _this._timer = 0;
                    }
                }, this.interval);
            }
            else {
                this._handlers.push(handler);
            }
            return this;
        };
        return Timer;
    }());
    Y.Timer = Timer;
})(Y || (Y = {}));
