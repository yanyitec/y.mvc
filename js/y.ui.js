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
/// <reference path="y.util.ts" />
/// <reference path="y.promise.ts" />
var Y;
(function (Y) {
    function absolutePos(element) {
        var x = 0;
        var y = 0;
        while (element) {
            x += element.offsetLeft;
            y += element.offsetTop;
            element = element.offsetParent;
        }
        return { x: x, y: y };
    }
    Y.absolutePos = absolutePos;
    var blockTimer = new Y.Timer(100);
    var Block = (function (_super) {
        __extends(Block, _super);
        function Block(target) {
            var _this = _super.call(this) || this;
            _this.target = target == document ? document.body : target;
            _this.container = document.createElement("div");
            _this.container.style.cssText = "position:absolute;z-index:999997;";
            _this.container.className = "y-block";
            _this.container.innerHTML = "<div class='y-block-mask' style='position:absolute;left:0;height:0;width:100%;height:100%;z-index:999998;'></div><div class='y-block-message' style='position:absolute;z-index:999999'></div>";
            _this._mask = _this.container.firstChild;
            _this._message = _this.container.lastChild;
            _this.actived = false;
            return _this;
        }
        Block.prototype.open = function (opts) {
            var _this = this;
            if (opts.target !== this.target)
                throw new Error("target is incorrect.");
            this._w = this._h = this._x = this._y = undefined;
            if (opts) {
                if (opts.css) {
                    this.container.className = "y-block " + opts.css;
                }
                if (opts.message) {
                    if (typeof opts.message === "string")
                        this._message.innerHTML = opts.message;
                    else {
                        this._message.innerHTML = "";
                        this._message.appendChild(opts.message);
                    }
                }
                if (opts.keepCenter === true) {
                    if (!this._keepCenterHandler) {
                        this._keepCenterHandler = function () { return _this._moveToCenter(); };
                        blockTimer.subscribe(this._keepCenterHandler);
                    }
                }
                else if (opts.keepCenter === false) {
                    if (this._keepCenterHandler) {
                        blockTimer.unsubscribe(this._keepCenterHandler);
                        this._keepCenterHandler = undefined;
                    }
                }
            }
            if (!this.actived) {
                if (this.target === document.body) {
                    document.body.appendChild(this.container);
                }
                else {
                    var p = this.target.parentNode;
                    p.appendChild(this.container);
                }
            }
            this._moveToCenter();
            this.actived = true;
            return this;
        };
        Block.prototype.close = function (evtArgs) {
            if (!this.actived)
                return this;
            this.container.parentNode.removeChild(this.container);
            if (this._keepCenterHandler) {
                blockTimer.unsubscribe(this._keepCenterHandler);
                this._keepCenterHandler = undefined;
            }
            this.actived = false;
            this.notify("onclose", evtArgs || {});
            return this;
        };
        Block.prototype._moveToCenter = function () {
            var target = this.target;
            var container = this.container;
            var x = target.offsetLeft;
            var y = target.offsetTop;
            var w = target.clientWidth;
            var h = target.clientHeight;
            if (target === document.body) {
                w = Math.max(w, document.documentElement.clientWidth);
                h = Math.max(h, document.documentElement.clientHeight);
                x += document.body.scrollLeft;
                y += document.body.scrollTop;
            }
            if (this._x !== x)
                container.style.left = (this._x = x) + "px";
            if (this._y !== y)
                container.style.top = (this._y = y) + "px";
            if (this._w !== w)
                container.style.width = (this._w = w) + "px";
            if (this._h !== h)
                container.style.height = (this._h = h) + "px";
            return true;
        };
        return Block;
    }(Y.Eventable));
    Y.Block = Block;
    function block(opts) {
        var target = opts.target;
        var blocker = target.__y_ui_blocker;
        if (!blocker)
            blocker = target.__y_ui_blocker = new Block(target);
        blocker.open(opts);
        return blocker;
        //if()
    }
    Y.block = block;
    function unblock(target, evtArgs) {
        var blocker = target.__y_ui_blocker;
        if (blocker)
            blocker.close(evtArgs);
    }
    Y.unblock = unblock;
    var dragableMasker = document.createElement("div");
    dragableMasker.style.cssText = "position:absolute;left:0;top:0;opacity:0.01;filter:alpha(opacity=1);background-color:#fff;z-index:9999999;";
    var currentDragable;
    dragableMasker.onmousemove = function (evt) {
        evt || (evt = event);
        var dg = currentDragable;
        var mx = evt.offsetX || evt.layerX;
        var my = evt.offsetY || evt.layerY;
        var offsetX = mx - dg._mx0;
        var offsetY = my - dg._my0;
        var target = dg.target;
        target.style.left = dg._x0 + offsetX + "px";
        target.style.top = dg._y0 + offsetY + "px";
    };
    dragableMasker.onmouseout = dragableMasker.onmouseup = function (evt) {
        evt || (evt = event);
        var dg = currentDragable;
        var mx = evt.offsetX || evt.layerX;
        var my = evt.offsetY || evt.layerY;
        var offsetX = mx - dg._mx0;
        var offsetY = my - dg._my0;
        var target = dg.target;
        target.style.left = dg._x0 + offsetX + "px";
        target.style.top = dg._y0 + offsetY + "px";
        currentDragable = undefined;
        dragableMasker.parentNode.removeChild(dragableMasker);
    };
    var Dragable = (function (_super) {
        __extends(Dragable, _super);
        function Dragable(triggerElement, target) {
            var _this = _super.call(this) || this;
            _this.triggerElement = triggerElement;
            _this.target = target;
            return _this;
        }
        Dragable.prototype.enable = function () {
            var self = this;
            Y.attach(this.triggerElement, "mousedown", function (evt) {
                var target = self.target;
                var posValue = self._positionValue = Y.getStyle(target, "position");
                target.style.position = posValue === 'static' ? "relative" : "absolute";
                self._x0 = target.offsetLeft;
                self._y0 = target.offsetTop;
                var pos = absolutePos(self.target);
                self._mx0 = pos.x;
                self._my0 = pos.y;
                dragableMasker.style.width = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) + "px";
                dragableMasker.style.height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) + "px";
                document.body.appendChild(dragableMasker);
                currentDragable = self;
                return Y.cancelEvent(evt);
            });
        };
        return Dragable;
    }(Y.Eventable));
    Y.Dragable = Dragable;
    var MessageBox = (function () {
        function MessageBox() {
            Block.call(this, document.body);
            var wrapper = this.wrapper = document.createElement("div");
            wrapper.className = "y-messagebox";
            wrapper.innerHTML = "<div class='y-messagebox-head'><div class='y-caption y-messagebox-caption'></div><div class='y-messagebox-closeIcon'>X</div></div><div class='y-messagebox-body'></div><div class='y-messagebox-foot'></div>";
            this.head = wrapper.firstChild;
            this.foot = wrapper.lastChild;
            this.body = wrapper.childNodes[1];
            this.captionElement = this.head.firstChild;
            this.closeElement = this.head.lastChild;
            this.buttonsElement = this.foot;
            var me = this;
            this.closeElement.onclick = function () {
                me.close("close");
            };
        }
        MessageBox.prototype.open = function (opts) {
            if (opts.caption)
                this.captionElement.innerHTML = opts.caption;
            if (typeof opts.content === "string") {
                this.body.innerHTML = opts.content;
            }
            else {
                this.body.innerHTML = "";
                this.body.appendChild(opts.content);
            }
            this.currentOpts = opts;
            var btns = opts.buttons;
            this.buttonsElement.innerHTML = "";
            for (var n in btns) {
                var btn = this._buildButton(n, btns[n]);
                this.buttonsElement.appendChild(btn);
            }
            //this.currentInstance = opts
            var blockOpts = {
                keepCenter: opts.keepCenter,
                target: document.body,
                message: this.wrapper,
                css: opts.css
            };
            Block.prototype.open.call(this, blockOpts);
            return this;
        };
        MessageBox.prototype.close = function (type, evtArg) {
            evtArg || (evtArg = {});
            evtArg.type = type;
            var instance = this.currentInstance;
            this.currentInstance = undefined;
            this.currentOpts = undefined;
            Block.prototype.close.call(this, evtArg);
            instance.resolve(evtArg);
            return this;
        };
        MessageBox.prototype._buildButton = function (name, value) {
            var btn = document.createElement("a");
            var me = this;
            btn.className = "y-btn y-messagebox-btn";
            btn.innerHTML = value || name;
            btn.onclick = function () {
                me.close(name);
            };
            return btn;
        };
        return MessageBox;
    }());
    Y.MessageBox = MessageBox;
    MessageBox.apply(MessageBox);
    function messageBox(opts) {
        var promise = new Y.Promise();
        MessageBox.currentInstance = promise;
        MessageBox.open(opts);
        return promise;
    }
    Y.messageBox = messageBox;
})(Y || (Y = {}));
