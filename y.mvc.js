(function(window,document){
var ns = window.Y = {};
var camelize = ns.camelize = function camelize(attr) {
	// /\-(\w)/g 正则内的 (\w) 是一个捕获，捕获的内容对应后面 function 的 letter
	// 意思是将 匹配到的 -x 结构的 x 转换为大写的 X (x 这里代表任意字母)
	return attr.replace(/\-(\w)/g, function (all, letter) { return letter.toUpperCase(); });
}
var trimRegx = ns.trimRegx = /^\s+|\s+$/;
var trim = ns.trim = function (val) { return val.replace(trimRegx, ""); }

var reservedPropnames={};
var ObservableEvent = ns.ObservableEvent = function(sender,type,reason,src){
	this.sender = sender;
	this.type = type;
	this.reason = reason;
	this.src = src===false?undefined:src;
}
var observable = ns.observable = function(propname,object,parent){
	var changeHandlers;
	var format;
	propname = propname || "@y.ob.DEFAULT_PROPNAME";
	object = object || {};
	
	
	var ob = function(newValue,srcEvt){
		var self = ob;
		
		var oldValue = object[propname];
		if(newValue===undefined) return format?format(oldValue):oldValue;
		if(oldValue===newValue) return self;
		if(self.ob_isArray){
			self.clear(evt);
			object[propname] = newValue||(newValue=[]);
		} else if(self.ob_isObject){
			object[propname] = newValue||(newValue={});
		}else object[propname] = newValue;
		///#DEBUG_BEGIN
		ob["@y.ob.value"] = newValue;
		///#DEBUG_END


		var evt=srcEvt===false?false :new ObservableEvent(self,"change","assign",srcEvt) ;
		if(evt !==false && changeHandlers){
			for(var i =0,j=changeHandlers.length;i<j;i++){
				var fn = changeHandlers.shift();
				if(fn.call(self,newValue,oldValue,evt)===false) continue;
				changeHandlers.push(fn);
			}
		}
		
		if(self.ob_isArray){self.initArray();}
		else if(self.ob_isObject){
			for(var n in self){
				var prop = self[n];
				if(prop && prop.ob_observable)
					prop.ob_object(newValue,evt);
			}
		}
		return self;
	}
	///#DEBUG_BEGIN
	ob["@y.ob.object"] = object;
	ob["@y.ob.propname"] = propname;
	///#DEBUG_END

	ob.ob_observable = true;
	ob.toString = function(){return object[propname];}
	ob.ob_parent = function(){return parent;}
	///#DEBUG_BEGIN
	ob["@y.ob.parent"] = parent;
	///#DEBUG_END

	ob.ob_object = function(newObject,srcEvt){
		if(newObject===undefined)return object;
		if(newObject===object)return ob;
		var self = ob;
		var pname = propname;
		var newValue = newObject[propname];
		var oldValue = object[propname];
		//
		if(newValue!==oldValue){
			var evt ;
			if(srcEvt!==false){
				evt =new ObservableEvent(self,"change","objectChange",srcEvt);
			}else evt = false;

			if(self.ob_isArray)self.clear(evt);
			object = newObject;
			///#DEBUG_BEGIN
			ob["@y.ob.object"] = object;
			ob["@y.ob.value"] = newValue;
			///#DEBUG_END
			if(self.ob_isArray) self.initArray();

			if(evt!==false)ob.notify(newValue,oldValue,evt);
			
			
			if(self.ob_isObject){
				for(var n in self){
					var prop = self[n];
					///#DEBUG_BEGIN
					if(n==="@y.ob.parent") continue;
					///#DEBUG_END
					if(prop && prop.ob_observable)
						prop.ob_object(newValue,evt);
				}
			}
		} 
		return ob;
	}

	ob.ob_root = function(){
		if(parent)return parent.ob_root();
		return ob;
	}
	
	ob.notify = function(newValue,oldValue,evt){
		var handlers = changeHandlers;
		var self = ob;
		if(handlers){
			evt || (evt = new ObservableEvent(self,"notify"));
			for(var i =0,j=handlers.length;i<j;i++){
				var fn = handlers.shift();
				if(fn.call(self,newValue,oldValue,evt)===false) continue;
				handlers.push(fn);
			}
		}
		return self;
	}

	ob.subscribe = function(handler){
		var handlers=changeHandlers || (changeHandlers=[]);
		///#DEBUG_BEGIN
		ob["@y.ob.changeHandlers"] = handlers;
		///#DEBUG_END
		changeHandlers.push(handler);
		return ob;
	}
	ob.unsubscribe = function(handler){
		var handlers = changeHandlers ;
		if(handlers===undefined)return ob;
		for(var i =0,j=handlers.length;i<j;i++){
			var fn = handlers.shift();
			if(fn!==handler) handlers.push(fn);
		}
		return ob;
	}
	ob.ob_prop = function(pname){
		var self = ob;
		self.ob_isObject = true;
		
		_pname = reservedPropnames[pname]||pname;
		var prop = self[_pname];
		if(!prop){
			var value = object[propname] || (object[propname]={});
			prop = self[_pname] = observable(pname,value ,this);
		}
		return prop;
	}
	ob.ob_name = function(newPropname,srcEvt){
		if(newPropname===undefined)return propname;
		
		var newValue = object[newPropname];
		propname = newPropname;
		ob.ob_object(newValue,srcEvt);
		return ob;
	}
	
	
	ob.clone = function(pname,obj,parent){
		pname || (pname = propname);
		var self = ob;
		var clone = observable(pname,obj,parent||self.ob_parent());
		clone.ob_isObject = self.ob_isObject;
		clone.ob_isArray = self.ob_isArray;
		if(!self.ob_isObject) return clone;
		if(self.ob_isArray){
			clone.asArray(self.itemTemplate());
			return clone;
		}
		var value = obj[pname] ||(obj[pname]={});
		for(var n in self){
			var prop = self[n];
			if(!prop.ob_observable)continue;
			clone[n] = prop.clone(n,value);
		}
		return clone;
	}
	ob.asArray = function(itemTemplate){
		var self = ob;
		self.ob_isArray = true;
		self.ob_isObject = false;
		object[propname] || (object[propname]=[]);
		itemTemplate || ( itemTemplate = observable("0",[],self)) ;
		///#DEBUG_BEGIN
		ob["@y.ob.itemTemplate"] = itemTemplate;
		///#DEBUG_END
		self.itemTemplate = function(){return itemTemplate;}
		self.ob_count = function(){return object[propname].length;}
		self.initArray = function(){
			var arr = object[propname];
			var me = self;
			for(var i=0,j=arr.length;i<j;i++){
				me[i] = itemTemplate.clone(i,arr);
			}
			return me;
		}
		self.push = function(itemValue){
			var arr = object[propname];
			var index = arr.length;
			arr.push(itemValue);
			var item = self[c]=itemTemplate.clone(c,arr);
			var evt = new ObservableEvent(self,"add","push");
			evt.index = index;
			self.notify(arr,arr,evt);
			return item;
		}

		self.pop = function(){
			var arr = object[propname];
			var  index = arr.length-1;
			if(index<0)return;
			var itemValue = arr.pop();
			var item = self[index];
			delete self[index];
			var evt = new ObservableEvent(self,"remove","pop");
			evt.index = index;evt.itemValue=itemValue;
			item.notify(undefined,itemValue,evt);
			if(!evtArgs.cancelBubble)self.notify(arr,arr,evt);
			return itemValue;
		}
		//添加第一个
		self.unshift = function(itemValue){
			var me = self;
			var arr = object[propname];
			var index = arr.length;
			arr.unshift(itemValue);
			for(var i =arr.length,j=0;i>=j;i--){
				var item = me[i] = me[i-1];
				item.ob_name(i,false);
			}
			var item = self[0]=itemTemplate.clone(0,arr);
			var evt = new ObservableEvent(self,"add","unshift");
			evt.index = index;

			self.notify(arr,arr,evt);
			return item;
		}
		self.shift = function(){
			var me = self;
			var arr = object[propname];
			var  count = arr.length-1;
			if(count<0)return;
			var itemValue = arr.shift();
			var item = self[0];
			
			for(var i =1,j=count;i<=j;i++){
				var item = me[i-1] = me[i];
				item.ob_name(i,false);
			}
			delete self[count];
			var evt = new ObservableEvent(self,"remove","shift");
			evt.index = index;evt.itemValue=itemValue;
			item.notify(undefined,itemValue,evt);
			if(!evt.cancelBubble)self.notify(arr,arr,evt);
			return itemValue;
		}
		self.clear = function(srcEvt){
			var arr = object[propname];
			var me = self;
			var count = arr.length;
			var evt = srcEvt===false?false : new ObservableEvent(self,"remove","clear",srcEvt);
			var oldValue = [];
			for(var i =0;i<count;i++){
				var itemValue = arr.shift();
				var item = me[i];
				delete me[i];
				//evtArgs.index = i;
				if(evt!==false)item.notify(undefined,itemValue,evt);
				oldValue.push(itemValue);
			}
			if(evt!==false && !evt.cancelBubble)self.notify(arr,oldValue,evt);
		}
		return itemTemplate;
	}
	return ob;
}
})(window,document);
(function(window,document){
var ns = window.Y;	
var camelize = ns.camelize;
var div = document.createElement("div");
var p_maps= {
	"TD":document.createElement("tr"),
	"TH":document.createElement("tr"),
	"TR":document.createElement("tbody"),
	"TBODY":document.createElement("table"),
	"LI":document.createElement("ul"),
	"OPTION":document.createElement("select"),
	"DT":document.createElement("dl")
};
p_maps.THEAD = p_maps.TFOOT = p_maps.TBODY;
p_maps.DD = p_maps.DT;
p_maps.OPTIONGROUP = p_maps.OPTION;
ns.cloneNode = function(node){
	var p = p_maps[node.tagName] || div;
	p.innerHTML = node.outerHTML;
	return p.firstChild;
}
if(div.addEventListener){
	ns.attach = function(element,evtname,handler){element.addEventListener(evtname,handler,false);}
	ns.detech = function(element,evtname,handler){element.removeEventListener(evtname,handler,false);}
}
if(div.attachEvent){
	ns.attach = function(element,evtname,handler){element.attachEvent("on" + evtname,handler);}
	ns.detech = function(element,evtname,handler){element.detechEvent("on" + evtname,handler);}
}
ns.displayValues = {
	
};
var setStyle = ns.setStyle = function (elem, style, value) { elem.style[camelize(style)] = value; }
    
// 主流浏览器
if (window.getComputedStyle) {
    getStyle = ns.getStyle = function (elem, style) {
        return getComputedStyle(elem, null).getPropertyValue(style);
    };
} else {
    function getIEOpacity(elem) {
        var filter = null;

        // 早期的 IE 中要设置透明度有两个方法：
        // 1、alpha(opacity=0)
        // 2、filter:progid:DXImageTransform.Microsoft.gradient( GradientType= 0 , startColorstr = ‘#ccccc’, endColorstr = ‘#ddddd’ );
        // 利用正则匹配
        fliter = elem.style.filter.match(/progid:DXImageTransform.Microsoft.Alpha\(.?opacity=(.*).?\)/i) || elem.style.filter.match(/alpha\(opacity=(.*)\)/i);

        if (fliter) {
            var value = parseFloat(fliter);
            if (!NaN(value)) {
                // 转化为标准结果
                return value ? value / 100 : 0;
            }
        }
        // 透明度的值默认返回 1
        return 1;
    }
    getStyle = ns.getStyle = function (elem, style) {
        // IE 下获取透明度
        if (style == "opacity") {
            getIEOpacity(elem);
            // IE687 下获取浮动使用 styleFloat
        } else if (style == "float") {
            return elem.currentStyle.getAttribute("styleFloat");
            // 取高宽使用 getBoundingClientRect
        } else if ((style == "width" || style == "height") && (elem.currentStyle[style] == "auto")) {
            var clientRect = elem.getBoundingClientRect();

            return (style == "width" ? clientRect.right - clientRect.left : clientRect.bottom - clientRect.top) + "px";
        }
        // 其他样式，无需特殊处理
        return elem.currentStyle.getAttribute(style.camelize());
    };


}
var setOpacity = ns.setOpacity = function (elem, val) {
    val = parseFloat(val);
    elem.style.opacity = val;
    elem.style.filter = "alpha(opacity=" + (val * 100) + ")";
    return elem;
}

})(window,document);

(function(window,document){//Expression
var ns = window.Y;	
var attach = ns.attach;
var detech = ns.detech;
var observable = ns.observable;
var propReg = "[\\w\\u4e00-\\u9fa5]+";
var pathReg = propReg + "(?:\\s*.\\s*" + propReg + ")*";
var trimRegx = ns.trimRegx;
var BindContext = Y.BindContext = function(element,ob_instance){
	this.element = element;
	this.observable = ob_instance || observable();
	this.binders = ns.binders;
	this.label = function(key,lazy){
		return lazy ?{toString:function(){return key}}:key;
	}
}

var Expression = function(){
	this.toCode = function(){throw "abstract method";}
	this.execute = function(context){throw "abstract method";}
}

var ValueExpression = Expression.ValueExpression = function(){
	this.get_value=function(){throw "abstract method";}
}
ValueExpression.prototype = new Expression();
ValueExpression.parse = function(exprText,$CONTEXT){
	var expr = ObservableExpression.parse(exprText,$CONTEXT);
	if(expr==null) expr = LabelExpression.parse(exprText,$CONTEXT);
	if(expr==null) expr = new ConstantExpression(exprText,$CONTEXT);
	return expr;
}

var ObservableExpression = Expression.Observable = function(path,$CONTEXT){
	this.path = path;
	var paths = path.split(".");
	var innerPaths = ["this.observable"];
	var observable = $CONTEXT.observable;
	for(var i =0,j=paths.length;i<j;i++){
		var pathname = paths.shift().replace(trimRegx,"");
		if(pathname=="$root"){innerPaths = ["this.observable.ob_root()"];observable = $CONTEXT.observable.ob_root();continue;}
		if(pathname=="$" || pathname=="$self") {innerPaths = ["this.observable"];observable = $CONTEXT.observable;continue;}
		if(pathname=="$parent") {observable = observable.ob_parent(); innerPaths = ["this.observable.ob_parent()"];continue;}
		observable= observable.ob_prop(pathname);
		innerPaths.push(pathname);
	}
	this.path = innerPaths.join(".");
	this.observable = observable;
	this.get_value = function($CONTEXT){ return this.observable;}
	this.toCode = function(){return this.path;}
	//this.execute = function(context){return this.observable;}
}
ObservableExpression.prototype = new ValueExpression();
ObservableExpression.regText = "^\\s*\\$|\\$self|\\$parent|\\$root\\s*.\\s*" + pathReg + "\\s*$";
var obRegx = ObservableExpression.regx = new RegExp(ObservableExpression.regText);
ObservableExpression.parse = function(exprText,$CONTEXT){
	if(obRegx.test(obRegx)) return new ObservableExpression(exprText,$CONTEXT);
}
var expr = "$self.User.Username.Nick";
//alert(expr.match(ObservableExpression.Regx));

var LabelExpression = Expression.Label = function(key,isLazy,$CONTEXT){
	this.key = key;
	this.lazy = isLazy;
	this.toCode = function(){return "this.label(\"" + key + "\","+(isLazy?"true":"false")+")";}
	this.get_value = function($CONTEXT){return $CONTEXT.label(this.key,this.lazy);}
}
LabelExpression.prototype = new ValueExpression();
LabelExpression.regText = "^\\s*#(#?)(" + pathReg + ")$";
var labelRegx = LabelExpression.regx = new RegExp(LabelExpression.regText);
LabelExpression.parse = function(exprText,$CONTEXT){
	var match = exprText.match(labelRegx);
	if(match) return new ObservableExpression(match[2],match[1],$CONTEXT);
}
var expr = "#名字";
//alert(expr.match(LabelExpression.Regx));

var trimQuoteRegx = /(^\s*['"])|(['"]\s*$)/g;
var ConstantExpression = Expression.Constant = function(value,$CONTEXT){
	this.text = value.replace(trimQuoteRegx,"");
	this.toCode = function(){return "\"" + this.text.replace(/"/,"\\\"") + "\"";}
	this.get_value = function(){return this.text;}
}
ConstantExpression.prototype = new ValueExpression();
ConstantExpression.regText = "(?:\"([^\"]*)\")|(?:'([^']*)')|(?:([^$.,()#]*))";
var constRegx = ConstantExpression.regx = new RegExp(ConstantExpression.regText);
ConstantExpression.parse = function(exprText,$CONTEXT){
	var match = exprText.match(constRegx);
	if(match) return new ConstantExpression(constRegx,$CONTEXT);
}
var expr = "'abc$?.def'";
//alert(expr.match(ConstantExpression.Regx));


var ChildBeginExpression = Expression.ChildBegin= function(at,parentNode,$CONTEXT){
	this.index = at;
	this.parentNode= parentNode;
	if(parentNode!=$CONTEXT.element) throw "Invalid Arguments";
	$CONTEXT.element = $CONTEXT.element.childNodes[this.index];

	this.toCode = function(){return "this.element = this.element.childNodes["+this.index+"];\r\n";}
}
ChildBeginExpression.prototype = new Expression();

var ChildEndExpression = Expression.ChildEnd = function(at,parentNode,$CONTEXT){
	this.index = at;
	this.parentNode = parentNode;
	$CONTEXT.element = $CONTEXT.element.parentNode;
	if($CONTEXT.element!=parentNode) throw "Invalid Arguments";
	this.toCode = function(){return "this.element = this.element.parentNode;\r\n";}
	
}
ChildEndExpression.prototype = new Expression();

var BindExpression = Expression.Bind = function(binderName,params,$CONTEXT){
	this.binderName = binderName;
	this.parameters = params;
	var args = [$CONTEXT.element];
	var code = "this.binders[\""+binderName+"\"].call(this,this.element";
	for(var i =0,j=this.parameters.length;i<j;i++){
		var par = this.parameters[i];
		var value = par.get_value();
		code += "," + par.toCode();
		args.push(value);
	}
	$CONTEXT.ignoreChildren = $CONTEXT.binders[this.binderName].apply($CONTEXT,args)===false;
	code += ");\r\n";
	this._code = code;
	this.toCode = function(){
		return this._code;
	}
}
BindExpression.prototype = new Expression();
var strStartRegx = /^\s*(["'])/g;
var strEndRegx = /(["']\s*$)/g;

var parseArguments = BindExpression.parseArguments = function(argsText){
	var argTexts = argsText.split(",");
	var argExprs = [];
	var strs=undefined;
	var startMatch = undefined;
	for(var i =0,j=argTexts.length;i<j;i++){
		var expr = argTexts[i];
		if(startMatch){
			strs.push(expr);
			var endMatch = expr.match(strEndRegx);
			if(endMatch && endMatch[1]==startMatch[1]){
				argExprs.push(strs.join(""));
				strs=startMatch=undefined;
				continue;
			}
			continue;
		}
		if(startMatch=expr.match(strStartRegx)){
			strs=[expr];
			continue;
		}
		argExprs.push(expr);
	}
	if(startMatch) throw "Invalid Arguments";
	return argExprs;
	
}
BindExpression.parse = function(binderName,argsText,$CONTEXT){
	var argTexts = parseArguments(argsText);
	var args = [];
	for(var i =0,j=argTexts.length;i<j;i++){
		var argText = argTexts[i];
		args.push(ValueExpression.parse(argText,$CONTEXT));
	}
	return new BindExpression(binderName,args,$CONTEXT);
}
var parseElement = function($CONTEXT,ignoreSelf){
	var element = $CONTEXT.element;
	if(!element.tagName)return;
	var observable = $CONTEXT.observable;
	var exprs = $CONTEXT.expressions || ($CONTEXT.expressions=[]);
	if(!ignoreSelf){
		var attrs = element.attributes;
		var ignoreChildren = false;
		for(var i=0,j=attrs.length;i<j;i++){
			var attr = attrs[i];
			var attrname = attr.name;
			var attrvalue =  attr.value;
			if(attrname[0]!='y')continue;if(attrname[1]!='-')continue;
			var binderName = attrname.substr(2);
			
			var bindExpr =binderName==="value"
				? getValueBinderExpression(element,attrvalue,$CONTEXT)
				: BindExpression.parse(binderName,attrvalue,$CONTEXT);
			exprs.push(bindExpr);
			if($CONTEXT.ignoreChildren) ignoreChildren= true;
		}
		if(ignoreChildren)return;
	}
	
	var childNodes = element.childNodes;
	for(var i=0,j=childNodes.length;i<j;i++){
		var child = childNodes[i];
		var childBegin = new ChildBeginExpression(i,element,$CONTEXT);
		exprs.push(childBegin);
		parseElement($CONTEXT);
		var lastExpr = exprs.pop();
		if(lastExpr!=childBegin){
			exprs.push(lastExpr);
			var childEnd = new ChildEndExpression(i,element,$CONTEXT);
			exprs.push(childEnd);
		}else{
			$CONTEXT.element = element;
		}
	}
}
var makeBinder = ns.makeBinder = function($CONTEXT,ignoreSelf){
	parseElement($CONTEXT,ignoreSelf);
	var exprs = $CONTEXT.expressions;
	while(true){
		var expr = exprs.pop();
		if(!expr.parentNode){exprs.push(expr);break;}
	}
	var expr,codes="this.element = $element;this.observable = $observable;\r\n";
	while(expr=exprs.shift()){
		codes += expr.toCode();
	}
	return new Function("$element","$observable",codes);
}
var binders = ns.binders ={};
var scopeBinder = binders.scope = function(element,observable){
	var binder = observable["@y.binder.scope"];
	if(!binder){
		var ob = this.observable;this.observable = observable;this.element = element;
		var exprs = this.expressions;this.expressions = [];
		binder = observable["@y.binder.scope"] = makeBinder(this,true);
		this.observable = ob;this.element = element;this.expressions=exprs;
		
	}
	binder(element,observable);
}
var eachBinder = binders.each = function(element,observable){
	var binder = observable["@y.binder.each"];
	var templateNode;
	var context = this;
	if(!binder){
		var tmpNode = ns.cloneNode(element);
		var itemTemplate = observable.asArray();
		var ob = this.observable;this.observable = itemTemplate;this.element = tmpNode;
		var exprs = this.expressions;this.expressions = [];
		binder = observable["@y.binder.each"] = makeBinder(this,true);
		this.observable = ob;this.element = element;this.expressions=exprs;
		templateNode = binder["@y.binder.templateElement"] = ns.cloneNode(tmpNode);
		observable.initArray();
	}else{
		templateNode = binder["@y.binder.templateElement"];
	}
	var valueChange = function(value,oldValue,evtArgs){
		element.innerHTML = "";
		var ob = context.observable;
		var el = context.element;
		for(var i =0,j=value.length;i<j;i++){
			var item = this[i];
			var elem =context.element =  ns.cloneNode(templateNode);
			context.observable = item;
			binder.call(context,elem,item);
			for(var m=0,n=elem.childNodes.length;m<n;m++){
				element.appendChild(elem.firstChild);
			}
		}
		context.observable = ob;
		context.element = el;
	}
	valueChange.call(observable,observable());
	observable.subscribe(valueChange);
	return false;
}
var valueBinder = binders.value = function(element,observable,format){
	//var tagName 
}
var getValueBinderExpression = function(element,expr,$CONTEXT){
	var tagName = element.tagName;
	
	if(tagName=="SELECT") {
		return BindExpression.parse("value-select",expr,$CONTEXT);
	}
	if(tagName=="TEXTAREA") return BindExpression.parse("value-text",expr,$CONTEXT);
	if(tagName=="INPUT") {
		var type = element.type;
		
		if(type==="button" || type==="reset" || type==="submit") return BindExpression.parse("value-button",expr,$CONTEXT);
		if(type==="check" ) return BindExpression.parse("value-check",expr,$CONTEXT);
		if(type==="radio" ) return BindExpression.parse("value-radio",expr,$CONTEXT);
		return BindExpression.parse("value-text",expr,$CONTEXT);
	}
	return BindExpression.parse("value-label",expr,$CONTEXT);
}
var textBinder = binders["value-text"] = function(element,observable,format){
	var context = this;
	var val = observable();
	if(val===undefined)observable(element.value);
	else element.value = val;
	observable.subscribe(function(value){
		element.value = value;
	});
	attach(element,"keyup",function(){observable(element.value);});
	attach(element,"blur",function(){observable(element.value);});
	
}
var selectBinder = binders["value-select"] = function(element,observable,format){
	var context = this;
	var val = observable();
	var opts = element.options;
	var valuechange = function(value){
		var opts = element.options;
		for(var i=0,j=opts.length;i<j;i++){
			if(opts[i].value===value) {
				opts[i].selected= true;
				element.selectedIndex = i;
				break;
			}
		}
	}
	if(val===undefined){
		var value = opts[element.selectedIndex].value;
		observable(value);
	}else{
		valuechange(val);
	}
	
	observable.subscribe(valuechange);
	attach(element,"change",function(){
		var opts = element.options;
		var value = opts[element.selectedIndex].value;
		subscribe(value);
	});
	
	
}
var checkBinder = binders["value-check"] = binders["value-radio"] = function(element,observable,format){
	var context = this;
	observable(element.checked?element.value:undefined);
	observable.subscribe(function(value){
		if(value===element.value){
			element.checked = true;
		}else {
			element.checked = false;
			element.removeAttribute("checked");
		}
	});
	attach(element,"click",function(){observable(element.checked?element.value:undefined);});
	attach(element,"blur",function(){observable(element.checked?element.value:undefined);});
} 
var buttonBinder = binders["value-button"] = function(element,observable,format){
	var context = this;
	observable(element.value);
	observable.subscribe(function(value){
		element.value = value;
	});
	
} 
var textBinder =binders["value-label"] = function(element,observable,format){
	var context = this;
	var val = observable();
	if(val===undefined)observable(element.innerHTML);
	else element.innerHTML = val;
	observable.subscribe(function(value){
		element.innerHTML = value;
	});
}
binders.visible = function(element,observable){
	var context = this;
	var getStyle = ns.getStyle;
	observable(element.style.display==="none"?false:true);
	observable.subscribe(function(value){
		if(value && value!=="0" && value!=="false"){
			var displayValue = element["@y.displayValue"];
			if(displayValue===undefined)displayValue = element["@y.displayValue"]=getStyle(element);
			if(displayValue==="none") displayValue= "";
			element.style.display = displayValue;
		} else {
			if(element["@y.displayValue"]===undefined) 
				element["@y.displayValue"]= element.style.display || ns.displayValues[element.tagName] || "";
			element.style.display = "none";
		}
	});
}
binders.readonly = function(element,observable){
	var context = this;
	observable(element.readonly?true:false);
	observable.subscribe(function(value){
		if(value && value!=="0" && value!=="false"){
			element.readonly= true;
			element.setAttribute("readonly","readonly");
		} else {
			element.readonly= false;
			element.removeAttribute("readonly");
		}
	});
}

})(window,document);