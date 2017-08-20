"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Timer = (function () {
    function Timer(interval) {
        this.interval = interval;
    }
    Timer.prototype.ring = function (handler) {
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
exports.Timer = Timer;
