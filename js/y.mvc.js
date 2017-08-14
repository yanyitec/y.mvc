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
    /**
     * 骆驼命名转换
     * 把 padding-top变成paddingTop
     * @param {string} text - 要转变的字符串
     * @return {string} -转换后的字符串
     */
    function camelize(text) {
        // /\-(\w)/g 正则内的 (\w) 是一个捕获，捕获的内容对应后面 function 的 letter
        // 意思是将 匹配到的 -x 结构的 x 转换为大写的 X (x 这里代表任意字母)
        return text.replace(/\-(\w)/g, function (all, letter) { return letter.toUpperCase(); });
    }
    Y.camelize = camelize;
    /**
     * 去掉前后空格的正则对象
     */
    Y.trimRegx = /^\s+|\s+$/;
    /**
     * 去掉前后空格
     * 把 padding-top变成paddingTop
     * @param {string} text - 要去掉前后空格的字符串
     * @return {string} -转换后的字符串
     */
    function trim(text) { return text.replace(Y.trimRegx, ""); }
    Y.trim = trim;
    ///////////////////////////////////////////////////////////////
    /// Observable
    ///
    var reservedPropnames = {};
    /**
     * Observable发送改变通知时，传递给监听函数的事件对象
     * @class
     */
    var ObservableEvent = (function () {
        /**
         * Observable的事件对象
         * @constructor
         * @param {IObservable} observable - 触发事件的Observable对象
         * @param {string} type -事件类型
         * @param {object} obj -在那个对象上触发的事件
         * @param {string} field -在那个数据域上触发的事件
         * @param {*} value -改变后的新值
         * @param {*} oldValue -原来的值
         * @param {*} src -如果是false，表示不想上传播事件;如果是ObservableEvent，表示源事件;如果是其他对象，就是事件的数据
         */
        function ObservableEvent(observable, type, obj, field, value, oldValue, src) {
            this.observable = observable;
            this.type = type;
            this.field = field;
            this.object = obj;
            this.value = value;
            this.oldValue = oldValue;
            this.propagate = true;
            this.bubble = true;
            if (src instanceof ObservableEvent) {
                if (this.src = src)
                    this.origins = src.origins || src;
                else
                    this.origins = this;
            }
            else {
                if (this.data = src) {
                    if (this.src = src.$src_event)
                        this.origins = this.src.origins || this.src;
                    else
                        this.origins = this;
                }
            }
        }
        return ObservableEvent;
    }());
    Y.ObservableEvent = ObservableEvent;
    /**
    * 创建一个IObservable对象
    * @method
    * @param {string|number} field - 数据域的名称
    * @param {object} object - 在那个对象上的数据
    * @param {any} opts - 该observable上的额外的数据
    * @param {IObservable} superior - 该observable的上级对象
    * @return -获取返回额外数据；设置返回IObservable
    */
    function observable(field, object, opts, superior) {
        // 事件
        var changeHandlers;
        // 格式化
        var formatter;
        // 域名
        field = field === undefined || field === null ? "" : field;
        // 对象
        object = object || {};
        var ob = function (newValue, srcEvt) {
            var self = ob;
            var oldValue = object[field];
            if (newValue === undefined)
                return formatter ? formatter(oldValue) : oldValue;
            if (oldValue === newValue)
                return self;
            if (!newValue) {
                if (self.is_Array) {
                    newValue = [];
                }
                else if (self.is_Object) {
                    newValue = {};
                }
            }
            var evt = srcEvt === false ? null : new ObservableEvent(self, "value_change", object, field, newValue, oldValue, srcEvt);
            if (self.is_Array) {
                //只通知子observable
                self.clear(evt, oldValue);
                var itemTemplate = self.ob_itemTemplate();
                for (var i = 0, j = newValue.length; i < j; i++) {
                    self[i] = itemTemplate.clone(i, newValue, self);
                }
            }
            object[field] = newValue;
            ///#DEBUG_BEGIN
            ob["@y.ob.value"] = newValue;
            ///#DEBUG_END
            if (evt)
                self.notify(evt);
            //处理property
            if (self.is_Object) {
                for (var n in newValue) {
                    var prop = self[reservedPropnames[n] || n];
                    if (prop && prop.is_Observable) {
                        prop.ob_object(newValue, evt);
                        evt.propagate = true;
                    }
                }
            }
            if (evt && superior && evt.bubble !== false && !evt.stop) {
                superior.bubble_up(evt);
            }
            return self;
        };
        ob.is_Observable = true;
        ///#DEBUG_BEGIN
        ob["@y.ob.object"] = object;
        ob["@y.ob.field"] = field;
        ob["@y.ob.parent"] = parent;
        ob["@y.ob.value"] = object[field];
        ///#DEBUG_END
        ob.is_Observable = true;
        ob.is_Object = ob.is_Array = false;
        ob.toString = function () { return object[field]; };
        ob.ob_opts = function (v) {
            if (v === undefined)
                return opts || (opts = {});
            if (!opts)
                opts = {};
            for (var n in v)
                opts[n] = v[n];
            return ob;
        };
        // 树形结构
        ob.ob_superior = function () { return superior; };
        ob.ob_root = function () {
            if (superior)
                return superior.ob_root();
            return ob;
        };
        ob.ob_prop = function (pname, opts) {
            var self = ob;
            self.is_Object = true;
            var _pname = reservedPropnames[pname] || pname;
            var prop = self[_pname];
            if (!prop) {
                var value = object[field] || (object[field] = {});
                prop = self[_pname] = observable(pname, value, opts, self);
            }
            else if (opts) {
                prop.ob_opts(opts);
            }
            return prop;
        };
        // 
        ob.ob_object = function (newObject, srcEvt) {
            var obj = object;
            if (newObject === undefined)
                return object;
            if (newObject === object)
                return ob;
            var self = ob, pname = field;
            var newValue = newObject[pname];
            var oldValue = object[pname];
            if (newValue === oldValue)
                return self;
            if (!newValue) {
                if (self.is_Array) {
                    newValue = obj[pname] = [];
                }
                else if (self.is_Object) {
                    newValue = obj[pname] = {};
                }
            }
            var evt;
            if (srcEvt !== false) {
                evt = new ObservableEvent(self, "object_change", obj, pname, newValue, oldValue, srcEvt);
            }
            if (self.is_Array) {
                //清洗掉原来的，但不通知自己，因为后面会发送一次object_change通知
                self.clear(evt, oldValue);
                var itemTemplate = self.ob_itemTemplate();
                for (var i = 0, j = newValue.length; i < j; i++) {
                    self[i] = itemTemplate.clone(i, newValue, self);
                }
            }
            object = newObject;
            ///#DEBUG_BEGIN
            ob["@y.ob.object"] = object;
            ob["@y.ob.value"] = newValue;
            ///#DEBUG_END
            if (evt)
                ob.notify(evt);
            if (self.is_Object) {
                for (var n in self) {
                    var prop = self[reservedPropnames[n] || n];
                    if (prop && prop.is_Observable) {
                        prop.ob_object(newValue, evt);
                        evt.propagate = true;
                    }
                }
            }
            return ob;
        };
        ob.ob_field = function (newPropname, srcEvt) {
            if (newPropname === undefined)
                return field;
            var newValue = object[newPropname];
            field = newPropname;
            ob.ob_object(newValue, srcEvt);
            return ob;
        };
        // 事件
        ob.notify = function (evt) {
            var handlers = changeHandlers;
            var self = ob;
            if (handlers) {
                for (var i = 0, j = handlers.length; i < j; i++) {
                    var fn = handlers.shift();
                    var result = fn.call(self, evt);
                    if (result !== false)
                        handlers.push(fn);
                    if (evt.stop)
                        return self;
                }
            }
            return self;
        };
        ob.bubble_up = function (src) {
            var obj = object;
            var self = ob;
            var value = object[field];
            var evt = new ObservableEvent(self, "bubble_up", object, field, value, value, src);
            evt.bubble = true;
            self.notify(evt);
            if (evt.bubble && !evt.stop && superior) {
                superior.bubble_up(evt);
            }
            return self;
        };
        ob.subscribe = function (handler) {
            var handlers = changeHandlers || (changeHandlers = []);
            ///#DEBUG_BEGIN
            ob["@y.ob.changeHandlers"] = handlers;
            ///#DEBUG_END
            changeHandlers.push(handler);
            return ob;
        };
        ob.unsubscribe = function (handler) {
            var handlers = changeHandlers;
            if (handlers === undefined)
                return ob;
            for (var i = 0, j = handlers.length; i < j; i++) {
                var fn = handlers.shift();
                if (fn !== handler)
                    handlers.push(fn);
            }
            return ob;
        };
        ob.clone = function (pname, obj, parent) {
            pname || (pname = field);
            var self = ob;
            var clone = observable(pname, obj, opts, parent || self.ob_superior());
            clone.is_Object = self.is_Object;
            clone.is_Array = self.is_Array;
            if (self.is_Array) {
                clone.asArray(self.ob_itemTemplate());
                return clone;
            }
            if (!self.is_Object)
                return clone;
            var value = obj[pname] || (obj[pname] = {});
            for (var n in self) {
                if (n[0] === "@")
                    continue;
                var prop = self[n];
                if (!prop.is_Observable)
                    continue;
                clone[n] = prop.clone(n, value, clone);
            }
            return clone;
        };
        ob.asArray = function (itemTemplate) {
            var self = ob;
            self.is_Array = true;
            //self.is_Object = false;
            itemTemplate || (itemTemplate = observable("0", [], undefined, self));
            ///#DEBUG_BEGIN
            ob["@y.ob.itemTemplate"] = itemTemplate;
            ///#DEBUG_END
            var arr = object[field] || (object[field] = []);
            for (var i = 0, j = arr.length; i < j; i++) {
                self[i] = itemTemplate.clone(i, arr, self);
            }
            self.ob_itemTemplate = function () { return itemTemplate; };
            self.ob_count = function () { return object[field].length; };
            self.push = function (itemValue) {
                var arr = object[field];
                var index = arr.length;
                arr.push(itemValue);
                var item = self[index] = itemTemplate.clone(index, arr, self);
                var evt = new ObservableEvent(self, "add_item", object, field, arr);
                evt.index = index;
                self.notify(evt);
                return item;
            };
            self.pop = function () {
                var arr = object[field];
                var index = arr.length - 1;
                if (index < 0)
                    return;
                var itemValue = arr.pop();
                var item = self[index];
                delete self[index];
                var itemEvt = new ObservableEvent(item, "remove", arr, index, itemValue);
                item.notify(itemEvt);
                if (itemEvt.bubble !== false && !itemEvt.stop) {
                    var evt = new ObservableEvent(self, "remove_item", object, field, arr);
                    evt.index = index;
                    evt.itemValue = itemValue;
                    self.notify(evt);
                    if (evt.bubble !== false && !evt.stop)
                        self.bubble_up(evt);
                }
                return itemValue;
            };
            //添加第一个
            self.unshift = function (itemValue) {
                var me = self;
                var arr = object[field];
                var index = arr.length;
                arr.unshift(itemValue);
                for (var i = arr.length, j = 0; i >= j; i--) {
                    var item_1 = me[i] = me[i - 1];
                    item_1.ob_field(i, false);
                }
                var item = self[0] = itemTemplate.clone(0, arr, self);
                var evt = new ObservableEvent(self, "add_item", object, field, arr);
                evt.index = index;
                self.notify(evt);
                return item;
            };
            self.shift = function () {
                var me = self;
                var arr = object[field];
                var count = arr.length - 1;
                if (count < 0)
                    return;
                var itemValue = arr.shift();
                var item = self[0];
                for (var i = 1, j = count; i <= j; i++) {
                    var item_2 = me[i - 1] = me[i];
                    item_2.ob_field(i, false);
                }
                delete self[count];
                var itemEvt = new ObservableEvent(item, "remove", arr, 0, itemValue);
                item.notify(itemEvt);
                if (itemEvt.bubble !== false && !itemEvt.stop) {
                    var evt = new ObservableEvent(self, "remove_item", object, field, arr);
                    evt.index = 0;
                    evt.itemValue = itemValue;
                    self.notify(evt);
                    if (evt.bubble !== false && !evt.stop)
                        self.bubble_up(evt);
                }
                return itemValue;
            };
            self.clear = function (srcEvt, oldValue) {
                var arr = oldValue || object[field];
                var me = self;
                var count = arr.length;
                var rplc = [];
                var stop = false;
                var bubble_up = true;
                for (var i = 0; i < count; i++) {
                    var itemValue = arr.shift();
                    var item = me[i];
                    delete me[i];
                    //evtArgs.index = i;
                    if (srcEvt !== false && stop) {
                        var itemEvt = srcEvt === false ? null : new ObservableEvent(self, "remove", arr, i, itemValue, itemValue, srcEvt);
                        item.notify(itemEvt);
                        if (itemEvt.stop)
                            stop = true;
                        if (itemEvt.bubble === false)
                            bubble_up = false;
                    }
                    rplc.push(itemValue);
                }
                if (oldValue === undefined && srcEvt !== false && bubble_up && !stop) {
                    var evt = new ObservableEvent(self, "clear", object, field, arr, rplc, srcEvt);
                    self.notify(evt);
                }
                return self;
            };
            return itemTemplate;
        };
        return ob;
    }
    Y.observable = observable;
    ///////////////////////////////////////////////////////////////
    /// DOM
    ////////////////////////////////////////////////////////////////
    var divContainer = document.createElement("div");
    var p_maps = {
        "TD": document.createElement("tr"),
        "TH": document.createElement("tr"),
        "TR": document.createElement("tbody"),
        "TBODY": document.createElement("table"),
        "LI": document.createElement("ul"),
        "OPTION": document.createElement("select"),
        "DT": document.createElement("dl")
    };
    p_maps.THEAD = p_maps.TFOOT = p_maps.TBODY;
    p_maps.DD = p_maps.DT;
    p_maps.OPTIONGROUP = p_maps.OPTION;
    var displayValues = {};
    /**
    * 克隆一个html元素
    * @method
    * @param {HTMLElement} toBeClone - 要克隆的元素
    * @return - 克隆的新的元素。其结构与属性与toBeClone一模一样
    */
    function cloneNode(toBeClone) {
        var p = p_maps[toBeClone.tagName] || divContainer;
        var html = toBeClone.outerHTML + "";
        p.innerHTML = html;
        var node = p.firstChild;
        p.removeChild(node);
        return node;
    }
    Y.cloneNode = cloneNode;
    if (divContainer.addEventListener) {
        Y.attach = function (element, evtname, handler) { return element.addEventListener(evtname, handler, false); };
        Y.detech = function (element, evtname, handler) { return element.removeEventListener(evtname, handler, false); };
    }
    else if (divContainer["attachEvent"]) {
        Y.attach = function (element, evtname, handler) { return element.attachEvent("on" + evtname, handler); };
        Y.detech = function (element, evtname, handler) { return element.detechEvent("on" + evtname, handler); };
    }
    function setStyle(elem, style, value) { elem.style[camelize(style)] = value; }
    Y.setStyle = setStyle;
    // 主流浏览器
    if (window.getComputedStyle) {
        Y.getStyle = function (elem, style) { return getComputedStyle(elem, null).getPropertyValue(style); };
    }
    else {
        function getIEOpacity(elem) {
            var filter = null;
            // 早期的 IE 中要设置透明度有两个方法：
            // 1、alpha(opacity=0)
            // 2、filter:progid:DXImageTransform.Microsoft.gradient( GradientType= 0 , startColorstr = ‘#ccccc’, endColorstr = ‘#ddddd’ );
            // 利用正则匹配
            filter = elem.style.filter.match(/progid:DXImageTransform.Microsoft.Alpha\(.?opacity=(.*).?\)/i) || elem.style.filter.match(/alpha\(opacity=(.*)\)/i);
            if (filter) {
                var value = parseFloat(filter);
                if (NaN !== value) {
                    // 转化为标准结果
                    return value ? value / 100 : 0;
                }
            }
            // 透明度的值默认返回 1
            return 1;
        }
        Y.getStyle = function (elem, style) {
            // IE 下获取透明度
            if (style == "opacity") {
                getIEOpacity(elem);
                // IE687 下获取浮动使用 styleFloat
            }
            else if (style == "float") {
                return elem.currentStyle.getAttribute("styleFloat");
                // 取高宽使用 getBoundingClientRect
            }
            else if ((style == "width" || style == "height") && (elem.currentStyle[style] == "auto")) {
                var clientRect = elem.getBoundingClientRect();
                return (style == "width" ? clientRect.right - clientRect.left : clientRect.bottom - clientRect.top) + "px";
            }
            // 其他样式，无需特殊处理
            return elem.currentStyle.getAttribute(camelize(style));
        };
    }
    Y.setOpacity = function (elem, val) {
        var value = parseFloat(val);
        elem.style.opacity = value.toString();
        elem.style.filter = "alpha(opacity=" + (value * 100) + ")";
        return elem;
    };
    function hasClass(element, css) {
        var cssStr = element.className;
        var begin = cssStr.indexOf(css);
        if (begin < 0)
            return false;
        var end = begin + css.length;
        if (begin == 0) {
            if (end == cssStr.length)
                return true;
            return /^\s$/.test(cssStr[begin + 1]);
        }
        if (!/^\s$/.test(cssStr[begin - 1]))
            return false;
        if (end == cssStr.length)
            return true;
        return /^\s$/.test(cssStr[end + 1]);
    }
    Y.hasClass = hasClass;
    function addClass(element, css) {
        if (hasClass(element, css))
            return false;
        var cssStr = element.className;
        if (cssStr === "")
            element.className = css;
        else if (/^\s$/.test(cssStr[cssStr.length - 1]))
            cssStr += css;
        else
            cssStr += ' ' + css;
        element.className = cssStr;
        return true;
    }
    Y.addClass = addClass;
    function removeClass(element, css) {
        var cssStr = element.className;
        var s = cssStr.split(/\s+/);
        var hasIt = false;
        for (var i = 0, j = s.length; i < j; i++) {
            var c = s.shift();
            if (c !== css)
                s.push(c);
            else
                hasIt = true;
        }
        if (hasIt)
            element.className = s.join(" ");
        return hasIt;
    }
    Y.removeClass = removeClass;
    ////////////////////////////
    /// Expression
    var propReg = "[\\w\\u4e00-\\u9fa5]+";
    var pathReg = propReg + "(?:\\s*.\\s*" + propReg + ")*";
    var BindContext = (function () {
        function BindContext(element, ob_instance, controller) {
            this.element = element;
            this.observable = ob_instance || observable();
            if (controller.TEXT)
                this.text = function (key, isLazy) { return controller.TEXT(key, isLazy); };
            else {
                this.text = function (key, isLazy) {
                    var ctrlr = controller;
                    while (ctrlr) {
                        var lngs = ctrlr.$lngs;
                        var txt = lngs[key];
                        if (txt !== undefined)
                            return txt;
                        ctrlr = ctrlr._$container;
                    }
                    return key;
                };
            }
            //this.binders = ns.binders;
            //this.label = function(key,lazy){
            //    return lazy ?{toString:function(){return key}}:key;
            //}
        }
        return BindContext;
    }());
    Y.BindContext = BindContext;
    var BindExpression = (function () {
        function BindExpression() {
        }
        return BindExpression;
    }());
    Y.BindExpression = BindExpression;
    var expressions = BindExpression;
    var ValueExpression = (function (_super) {
        __extends(ValueExpression, _super);
        function ValueExpression() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ValueExpression.parse = function (exprText, context) {
            var expr = ObservableExpression.parse(exprText, context);
            if (expr == null)
                expr = TextExpression.parse(exprText, context);
            if (expr == null)
                expr = new ConstantExpression(exprText, context);
            return expr;
        };
        return ValueExpression;
    }(BindExpression));
    Y.ValueExpression = ValueExpression;
    expressions.ValueExpression = ValueExpression;
    var ObservableExpression = (function (_super) {
        __extends(ObservableExpression, _super);
        function ObservableExpression(path, context) {
            var _this = _super.call(this) || this;
            _this.path = path;
            var paths = path.split(".");
            var innerPaths = ["this.observable"];
            var observable = context.observable;
            for (var i = 0, j = paths.length; i < j; i++) {
                var pathname = paths.shift().replace(Y.trimRegx, "");
                if (pathname == "$root") {
                    innerPaths = ["this.observable.ob_root()"];
                    observable = context.observable.ob_root();
                    continue;
                }
                if (pathname == "$" || pathname == "$self") {
                    innerPaths = ["this.observable"];
                    observable = context.observable;
                    continue;
                }
                if (pathname == "$parent") {
                    observable = observable.ob_superior();
                    innerPaths = ["this.observable.ob_parent()"];
                    continue;
                }
                observable = observable.ob_prop(pathname);
                innerPaths.push(pathname);
            }
            _this.path = innerPaths.join(".");
            _this.observable = observable;
            return _this;
        }
        ObservableExpression.prototype.getValue = function (context) { return this.observable; };
        ObservableExpression.prototype.toCode = function () { return this.path; };
        ObservableExpression.parse = function (exprText, context) {
            if (ObservableExpression.regx.test(exprText))
                return new ObservableExpression(exprText, context);
        };
        ObservableExpression.regText = "^\\s*\\$|\\$self|\\$parent|\\$root\\s*.\\s*" + pathReg + "\\s*$";
        ObservableExpression.regx = new RegExp(ObservableExpression.regText);
        return ObservableExpression;
    }(ValueExpression));
    expressions["Observable"] = ObservableExpression;
    var TextExpression = (function (_super) {
        __extends(TextExpression, _super);
        function TextExpression(key, context) {
            var _this = _super.call(this) || this;
            _this.key = key;
            return _this;
        }
        TextExpression.prototype.toCode = function () { return "this.text(\"" + this.key + "\"," + (this.lazy ? "true" : "false") + ")"; };
        TextExpression.prototype.getValue = function (context) { return context.text(this.key); };
        TextExpression.parse = function (exprText, context) {
            var match = exprText.match(TextExpression.regx);
            if (match)
                return new TextExpression(match[1], context);
        };
        TextExpression.regText = "^\\s*##(" + pathReg + ")$";
        TextExpression.regx = new RegExp(TextExpression.regText);
        return TextExpression;
    }(ValueExpression));
    expressions.Text = TextExpression;
    var ConstantExpression = (function (_super) {
        __extends(ConstantExpression, _super);
        function ConstantExpression(value, context) {
            var _this = _super.call(this) || this;
            _this.value = value.replace(Y.trimQuoteRegx, "");
            return _this;
        }
        ConstantExpression.prototype.toCode = function () { return "\"" + this.value.replace(/"/, "\\\"") + "\""; };
        ConstantExpression.prototype.getValue = function (contex) { return this.value; };
        ConstantExpression.parse = function (exprText, context) {
            var match = exprText.match(ConstantExpression.regx);
            if (match)
                return new ConstantExpression(match[1], context);
        };
        ConstantExpression.regText = "(?:\"([^\"]*)\")|(?:'([^']*)')|(?:([^$.,()#]*))";
        ConstantExpression.regx = new RegExp(ConstantExpression.regText);
        return ConstantExpression;
    }(ValueExpression));
    expressions.Constant = ConstantExpression;
    Y.trimQuoteRegx = /(^\s*['"])|(['"]\s*$)/g;
    var ChildExpression = (function (_super) {
        __extends(ChildExpression, _super);
        function ChildExpression() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ChildExpression;
    }(BindExpression));
    //alert(expr.match(ConstantExpression.Regx));
    var ChildBeginExpression = (function (_super) {
        __extends(ChildBeginExpression, _super);
        function ChildBeginExpression(at, parentNode, context) {
            var _this = _super.call(this) || this;
            _this.index = at;
            _this.parentNode = parentNode;
            if (parentNode != context.element)
                throw "Invalid Arguments";
            context.element = context.element.childNodes[_this.index];
            return _this;
        }
        ChildBeginExpression.prototype.toCode = function () { return "this.element = this.element.childNodes[" + this.index + "];\r\n"; };
        return ChildBeginExpression;
    }(ChildExpression));
    expressions.ChildBegin = ChildBeginExpression;
    var ChildEndExpression = (function (_super) {
        __extends(ChildEndExpression, _super);
        function ChildEndExpression(at, parentNode, context) {
            var _this = _super.call(this) || this;
            _this.index = at;
            _this.parentNode = parentNode;
            context.element = context.element.parentNode;
            if (parentNode != context.element)
                throw "Invalid Arguments";
            return _this;
        }
        ChildEndExpression.prototype.toCode = function () { return "this.element = this.element.parentNode;\r\n"; };
        return ChildEndExpression;
    }(ChildExpression));
    expressions.ChildEnd = ChildEndExpression;
    var BinderExpression = (function (_super) {
        __extends(BinderExpression, _super);
        function BinderExpression(binderName, params, context) {
            var _this = _super.call(this) || this;
            _this.binderName = binderName;
            _this.parameters = params;
            var args = [context.element];
            var code = "this.binders[\"" + binderName + "\"].call(this,this.element";
            for (var i = 0, j = _this.parameters.length; i < j; i++) {
                var par = _this.parameters[i];
                var value = par.getValue(context);
                code += "," + par.toCode();
                args.push(value);
            }
            var binder = context.binders[_this.binderName];
            if (!binder)
                throw "binder is not found";
            if (context.parseOnly !== true)
                context.ignoreChildren = binder.apply(context, args) === false;
            code += ");\r\n";
            _this._code = code;
            return _this;
        }
        BinderExpression.prototype.toCode = function () { return this._code; };
        BinderExpression.parseArguments = function (argsText) {
            var argTexts = argsText.split(",");
            var argExprs = [];
            var strs = undefined;
            var startMatch = undefined;
            for (var i = 0, j = argTexts.length; i < j; i++) {
                var expr = argTexts[i];
                if (startMatch) {
                    strs.push(expr);
                    var endMatch = expr.match(strEndRegx);
                    if (endMatch && endMatch[1] == startMatch[1]) {
                        argExprs.push(strs.join(""));
                        strs = startMatch = undefined;
                        continue;
                    }
                    continue;
                }
                if (startMatch = expr.match(strStartRegx)) {
                    strs = [expr];
                    continue;
                }
                argExprs.push(expr);
            }
            if (startMatch)
                throw "Invalid Arguments";
            return argExprs;
        };
        BinderExpression.parse = function (binderName, argsText, context) {
            var argTexts = BinderExpression.parseArguments(argsText);
            var args = [];
            for (var i = 0, j = argTexts.length; i < j; i++) {
                var argText = argTexts[i];
                args.push(ValueExpression.parse(argText, context));
            }
            return new BinderExpression(binderName, args, context);
        };
        return BinderExpression;
    }(BindExpression));
    expressions.Binder = BinderExpression;
    var strStartRegx = /^\s*(["'])/g;
    var strEndRegx = /(["']\s*$)/g;
    var getValueBinderExpression;
    function parseElement(context, ignoreSelf) {
        var element = context.element;
        if (!element.tagName)
            return;
        var observable = context.observable;
        var exprs = context.expressions || (context.expressions = []);
        if (!ignoreSelf) {
            var attrs = element.attributes;
            var ignoreChildren = false;
            for (var i = 0, j = attrs.length; i < j; i++) {
                var attr = attrs[i];
                var attrname = attr.name;
                var attrvalue = attr.value;
                if (attrname[0] != 'y')
                    continue;
                if (attrname[1] != '-')
                    continue;
                var binderName = attrname.substr(2);
                var bindExpr = binderName === "value"
                    ? getValueBinderExpression(element, attrvalue, context)
                    : BinderExpression.parse(binderName, attrvalue, context);
                exprs.push(bindExpr);
                if (context.ignoreChildren)
                    ignoreChildren = true;
            }
            if (ignoreChildren)
                return;
        }
        var childNodes = element.childNodes;
        for (var i = 0, j = childNodes.length; i < j; i++) {
            var child = childNodes[i];
            var childBegin = new ChildBeginExpression(i, element, context);
            exprs.push(childBegin);
            parseElement(context);
            var lastExpr = exprs.pop();
            if (lastExpr != childBegin) {
                exprs.push(lastExpr);
                var childEnd = new ChildEndExpression(i, element, context);
                exprs.push(childEnd);
            }
            else {
                context.element = element;
            }
        }
    }
    Y.parseElement = parseElement;
    /////////////////////////////
    /// Binders
    function makeBinder(context, ignoreSelf) {
        parseElement(context, ignoreSelf);
        var exprs = context.expressions;
        if (exprs.length > 0)
            while (true) {
                var expr_1 = exprs.pop();
                if (!(expr_1 instanceof ChildExpression)) {
                    exprs.push(expr_1);
                    break;
                }
            }
        var expr, codes = "///" + (ignoreSelf ? ignoreSelf : "") + "\r\nthis.element = $element;this.observable = $observable;\r\n";
        while (expr = exprs.shift()) {
            codes += expr.toCode();
        }
        return new Function("$element", "$observable", codes);
    }
    Y.makeBinder = makeBinder;
    Y.binders = {};
    Y.binders.scope = function (element, observable) {
        var binder = observable["@y.binder.scope"];
        if (!binder) {
            var ob = this.observable;
            this.observable = observable;
            this.element = element;
            var exprs = this.expressions;
            this.expressions = [];
            binder = observable["@y.binder.scope"] = makeBinder(this, true);
            this.observable = ob;
            this.element = element;
            this.expressions = exprs;
        }
        binder(element, observable);
    };
    Y.binders.each = function (element, observable) {
        var binder = observable["@y.binder.each"];
        var templateNode;
        var context = this;
        if (!binder) {
            var tmpNode = cloneNode(element);
            templateNode = cloneNode(tmpNode);
            var itemTemplate = observable(0, [], undefined, observable);
            var ob = this.observable;
            this.observable = itemTemplate;
            this.element = tmpNode;
            var prevParseOnly = this.parseOnly;
            this.parseOnly = true;
            var exprs = this.expressions;
            this.expressions = [];
            binder = observable["@y.binder.each"] = makeBinder(this, element.getAttribute("y-each"));
            this.observable = ob;
            this.element = element;
            this.expressions = exprs;
            this.parseOnly = prevParseOnly;
            binder["@y.binder.templateElement"] = templateNode;
            observable.asArray(itemTemplate);
        }
        else {
            templateNode = binder["@y.binder.templateElement"];
        }
        var valueChange = function (evtArgs) {
            var value = evtArgs.value;
            element.innerHTML = "";
            var ob = context.observable;
            var el = context.element;
            for (var i = 0, j = value.length; i < j; i++) {
                var item = observable[i];
                var elem = context.element = cloneNode(templateNode);
                context.observable = item;
                binder.call(context, elem, item);
                for (var m = 0, n = elem.childNodes.length; m < n; m++) {
                    element.appendChild(elem.firstChild);
                }
            }
            context.observable = ob;
            context.element = el;
        };
        valueChange.call(observable, { value: observable() });
        observable.subscribe(valueChange);
        return false;
    };
    Y.binders["value-textbox"] = function (element, observable) {
        var context = this;
        var val = observable();
        if (val === undefined)
            observable(element.value);
        else
            element.value = val;
        observable.subscribe(function (e) {
            element.value = e.value;
        });
        Y.attach(element, "keyup", function () { observable(element.value); });
        Y.attach(element, "blur", function () { observable(element.value); });
    };
    Y.binders["value-select"] = function (element, observable) {
        var context = this;
        var val = observable();
        var opts = element.options;
        var valuechange = function (e) {
            var value = e.value;
            var opts = element.options;
            for (var i = 0, j = opts.length; i < j; i++) {
                if (opts[i].value === value) {
                    opts[i].selected = true;
                    element.selectedIndex = i;
                    break;
                }
            }
        };
        var setElement = function (value) {
            if (value === undefined || value === null)
                value = "";
            else
                value = value.toString();
            var opts = element.options;
            for (var i = 0, j = opts.length; i < j; i++) {
                var opt_1 = opts[i];
                if (opt_1.value === value) {
                    opt_1.selected = true;
                    element.selectedIndex = i;
                    break;
                }
            }
        };
        if (val === undefined) {
            var sIndex = element.selectedIndex;
            if (sIndex == -1)
                sIndex = 0;
            var opt = opts[sIndex];
            var value = opt ? opt.value : undefined;
            observable(value);
        }
        else {
            setElement(val);
        }
        observable.subscribe(valuechange);
        Y.attach(element, "change", function (e) {
            setElement(e.value);
        });
    };
    Y.binders["value-check"] = Y.binders["value-radio"] = function (element, observable) {
        var context = this;
        observable(element.checked ? element.value : undefined);
        observable.subscribe(function (e) {
            if (e.value === element.value) {
                element.checked = true;
            }
            else {
                element.checked = false;
                element.removeAttribute("checked");
            }
        });
        Y.attach(element, "click", function () { observable(element.checked ? element.value : undefined); });
        Y.attach(element, "blur", function () { observable(element.checked ? element.value : undefined); });
    };
    Y.binders["value-button"] = function (element, observable) {
        var context = this;
        observable(element.value);
        observable.subscribe(function (e) {
            element.value = e.value;
        });
    };
    Y.binders["value-text"] = function (element, observable) {
        var context = this;
        var val = observable();
        if (val === undefined)
            observable(element.value);
        else
            element.value = val;
        observable.subscribe(function (e) {
            element.value = e.value;
        });
    };
    Y.binders["text"] = function (element, observable) {
        var context = this;
        var val = observable();
        if (val === undefined)
            observable(element.innerHTML);
        else
            element.innerHTML = val;
        observable.subscribe(function (e) {
            element.innerHTML = e.value;
        });
    };
    Y.binders.visible = function (element, observable) {
        var context = this;
        observable(element.style.display === "none" ? false : true);
        observable.subscribe(function (e) {
            var value = e.value;
            if (value && value !== "0" && value !== "false") {
                var displayValue = element["@y.displayValue"];
                if (displayValue === undefined)
                    displayValue = element["@y.displayValue"] = Y.getStyle(element, "display");
                if (displayValue === "none")
                    displayValue = "";
                element.style.display = displayValue;
            }
            else {
                if (element["@y.displayValue"] === undefined)
                    element["@y.displayValue"] = element.style.display || displayValues[element.tagName] || "";
                element.style.display = "none";
            }
        });
    };
    Y.binders.readonly = function (element, observable) {
        var context = this;
        observable(element.readonly ? true : false);
        observable.subscribe(function (e) {
            var value = e.value;
            if (value && value !== "0" && value !== "false") {
                element.readonly = true;
                element.setAttribute("readonly", "readonly");
            }
            else {
                element.readonly = false;
                element.removeAttribute("readonly");
            }
        });
    };
    getValueBinderExpression = function (element, expr, context) {
        var tagName = element.tagName;
        if (tagName == "SELECT") {
            return BinderExpression.parse("value-select", expr, context);
        }
        if (tagName == "TEXTAREA")
            return BinderExpression.parse("value-text", expr, context);
        if (tagName == "INPUT") {
            var type = element.type;
            if (type === "button" || type === "reset" || type === "submit")
                return BinderExpression.parse("value-button", expr, context);
            if (type === "check")
                return BinderExpression.parse("value-check", expr, context);
            if (type === "radio")
                return BinderExpression.parse("value-radio", expr, context);
            return BinderExpression.parse("value-textbox", expr, context);
        }
        if (tagName == "OPTION")
            return BinderExpression.parse("value-text", expr, context);
        return BinderExpression.parse("text", expr, context);
    };
})(Y || (Y = {}));
