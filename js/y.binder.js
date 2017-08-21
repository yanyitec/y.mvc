/// <reference path="y.util.ts" />
/// <reference path="y.observable.ts" />
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
    ////////////////////////////
    /// Expression
    var propReg = "[\\w\\u4e00-\\u9fa5]+";
    var pathReg = propReg + "(?:\\s*.\\s*" + propReg + ")*";
    Y.binders = {};
    var BindContext = (function () {
        function BindContext(element, ob_instance, controller) {
            this.element = element;
            this.observable = ob_instance || Y.observable();
            controller || (controller = {});
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
            this.binders = Y.binders;
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
                expr = LabelExpression.parse(exprText, context);
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
            var rs = ObservableExpression.makePath(path, context);
            _this.path = rs.path;
            _this.observable = rs.observable;
            return _this;
        }
        ObservableExpression.prototype.getValue = function (context) { return this.observable; };
        ObservableExpression.prototype.toCode = function () { return this.path; };
        ObservableExpression.makePath = function (path, context) {
            var result = {};
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
                    innerPaths = ["this.observable.ob_superior()"];
                    continue;
                }
                observable = observable.ob_prop(pathname);
                innerPaths.push(pathname);
            }
            path = innerPaths.join(".");
            return { path: path, observable: observable };
        };
        ObservableExpression.parse = function (exprText, context) {
            if (ObservableExpression.regx.test(exprText))
                return new ObservableExpression(exprText, context);
        };
        ObservableExpression.regText = "^\\s*\\$|\\$self|\\$parent|\\$root\\s*.\\s*" + pathReg + "\\s*$";
        ObservableExpression.regx = new RegExp(ObservableExpression.regText);
        return ObservableExpression;
    }(ValueExpression));
    expressions["Observable"] = ObservableExpression;
    var LabelExpression = (function (_super) {
        __extends(LabelExpression, _super);
        function LabelExpression(key, context) {
            var _this = _super.call(this) || this;
            _this.key = key;
            return _this;
        }
        LabelExpression.prototype.toCode = function () { return "this.text(\"" + this.key + "\"," + (this.lazy ? "true" : "false") + ")"; };
        LabelExpression.prototype.getValue = function (context) { return context.text(this.key); };
        LabelExpression.parse = function (exprText, context) {
            var match = exprText.match(LabelExpression.regx);
            if (match)
                return new LabelExpression(match[1], context);
        };
        LabelExpression.regText = "^\\s*##(" + pathReg + ")$";
        LabelExpression.regx = new RegExp(LabelExpression.regText);
        return LabelExpression;
    }(ValueExpression));
    expressions.Label = LabelExpression;
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
    var TextExpression = (function (_super) {
        __extends(TextExpression, _super);
        function TextExpression(params, context) {
            var _this = _super.call(this) || this;
            var codes = ["var $_txt='';var $_t = '';\n"];
            var deps = [];
            for (var i = 0, j = params.length; i < j; i++) {
                var par = params[i];
                if (typeof par === "object") {
                    if (par.token[0] === "$") {
                        var rs = ObservableExpression.makePath(par.token, context);
                        codes.push("$_t=arguments[" + deps.length + "]();if($_t!==undefined&&$_t!==null)$_txt+=$_t;\n");
                        deps.push(rs.observable);
                    }
                    else if (par.token[0] === "#") {
                        var key = par.token.substr(1).replace(/"/g, "\\\"");
                        codes.push("$_txt += (this['@y.ob.controller']?this['@y.ob.controller'].TEXT(\"" + key + "\"):\"" + key + "\")\n");
                    }
                }
                else {
                    codes.push('$_txt +="' + par.replace(/"/g, '\\"') + '";\n');
                }
            }
            var funcCode = codes.join("") + "return $_txt;\n";
            var observable = context.observable;
            var pname = _this.computedField = "COMPUTED_" + Y.genId();
            _this.observable = observable.set_computed(pname, deps, new Function(funcCode));
            return _this;
        }
        TextExpression.prototype.toCode = function () { return "this.observable[\"" + this.computedField + "\"]"; };
        TextExpression.prototype.getValue = function (context) {
            return this.observable;
        };
        TextExpression.parse = function (text, context) {
            var regx = TextExpression.regx;
            var match;
            var params = [];
            var at = regx.lastIndex;
            while (match = regx.exec(text)) {
                var prev = text.substring(at, match.index);
                if (prev)
                    params.push(prev);
                var token = match[1] || match[2];
                params.push({ token: token });
                at = regx.lastIndex;
            }
            if (params.length) {
                var last = text.substring(at);
                if (last)
                    params.push(last);
            }
            return params.length == 0 ? null : new TextExpression(params, context);
        };
        TextExpression.regx = /(?:\{\{(\$[a-z]{0,6}(?:.[\w\u4e00-\u9fa5]+)+)\}\})|(?:(#[\w\u4e00-\u9fa5]+(?:.[\w\u4e00-\u9fa5]+)*)#)/g;
        return TextExpression;
    }(ValueExpression));
    expressions.Text = TextExpression;
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
            if (binder.applyWhenParsing || context.parseOnly !== true)
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
        var exprs = context.expressions || (context.expressions = []);
        if (!element.tagName) {
            var cp = TextExpression.parse(element.textContent || element.innerText || "", context);
            if (cp) {
                var textBinder = new BinderExpression("text", [cp], context);
                exprs.push(textBinder);
            }
            return;
        }
        var observable = context.observable;
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
    function bind(element, observable) {
        var context = new BindContext(document.body, observable);
        //ob_instance = context.observable;
        //var binder = Y.makeBinder(context);	
    }
    Y.bind = bind;
    /////////////////////////////
    /// Binders
    var scope = Y.binders.scope = function (element, observable) {
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
        return false;
    };
    scope.applyWhenParsing = true;
    var each = Y.binders.each = function (element, observable) {
        var binder = observable["@y.binder.each"];
        var templateNode;
        var context = this;
        if (!binder) {
            var tmpNode = Y.cloneNode(element);
            templateNode = Y.cloneNode(tmpNode);
            var itemTemplate = Y.observable(0, [], undefined, observable);
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
                var elem = context.element = Y.cloneNode(templateNode);
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
    each.applyWhenParsing = true;
    Y.binders["value-textbox"] = function (element, observable, formatName, formatOpt) {
        var context = this;
        var val = observable();
        var format = Y.formaters[formatName];
        if (val === undefined)
            observable(element.value);
        else {
            element.value = format ? format(val, formatOpt) : val;
        }
        observable.subscribe(function (e) {
            element.value = format ? format(e.value, formatOpt) : e.value;
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
    Y.binders["value-button"] = function (element, observable, formatName, formatOpt) {
        var context = this;
        var format = Y.formaters[formatName];
        observable(element.value);
        observable.subscribe(function (e) {
            element.value = format ? format(e.value, formatOpt) : e.value;
        });
    };
    Y.binders["value-text"] = function (element, observable, formatName, formatOpt) {
        var context = this;
        var val = observable();
        var format = Y.formaters[formatName];
        if (val === undefined)
            observable(element.value);
        else
            element.value = format ? format(val, formatOpt) : val;
        observable.subscribe(function (e) {
            element.value = format ? format(e.value, formatOpt) : e.value;
        });
    };
    Y.binders["text"] = function (element, observable, formatName, formatOpt) {
        var context = this;
        var val = observable();
        var format = Y.formaters[formatName];
        if (val === undefined)
            observable(element.tagName ? element.textContent : element.innerHTML);
        else {
            if (element.tagName)
                element.innerHTML = format ? format(val, formatOpt) : val;
            else
                element.textContent = format ? format(val, formatOpt) : val;
            ;
        }
        observable.subscribe(function (e) {
            if (element.tagName)
                element.innerHTML = format ? format(e.value, formatOpt) : e.value;
            else
                element.textContent = format ? format(e.value, formatOpt) : e.value;
        });
    };
    Y.binders.visible = function (element, observable) {
        var context = this;
        var val = observable();
        var valuechange = function (e) {
            var value = e.value;
            if (typeof value === "object") {
                var obj = value;
                value = false;
                for (var n in obj) {
                    value = true;
                    break;
                }
            }
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
                    element["@y.displayValue"] = element.style.display || Y.displayValues[element.tagName] || "";
                element.style.display = "none";
            }
        };
        if (val === undefined)
            observable(element.style.display === "none" ? false : true);
        else
            valuechange({ value: val });
        observable.subscribe(valuechange);
    };
    Y.binders.readonly = function (element, observable) {
        var context = this;
        var valuechange = function (e) {
            var value = e.value;
            if (value && value !== "0" && value !== "false") {
                element.readonly = true;
                element.setAttribute("readonly", "readonly");
            }
            else {
                element.readonly = false;
                element.removeAttribute("readonly");
            }
        };
        var val = observable();
        if (val === undefined)
            observable(element.readonly ? true : false);
        else
            valuechange({ value: val });
        observable.subscribe(valuechange);
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
