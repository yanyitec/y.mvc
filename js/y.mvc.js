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
            self.is_Object = false;
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
})(Y || (Y = {}));
