/// <reference path="y.util.ts" />
/// <reference path="y.observable.ts" />

namespace Y{
    ////////////////////////////
    /// Expression

    let propReg:string = "[\\w\\u4e00-\\u9fa5]+";
    let pathReg:string = propReg + "(?:\\s*.\\s*" + propReg + ")*";
    export interface IBinder{
        applyWhenParsing?:boolean;
    }
    export let binders :{[index:string]:Function}={};
    export class BindContext{
        public element:HTMLElement;
        public binders:{[index:string]:Function};
        public observable:IObservable;
        public text:(key:string,isLazy?:boolean)=>string;

        public parseOnly:boolean;
        public ignoreChildren:boolean;
        public controller?:{};

        public expressions:Array<BindExpression>;
        public constructor(element:HTMLElement,ob_instance:IObservable,controller?:any){
            this.element = element;
            this.observable = ob_instance || observable();
            controller||(controller={});
            if(controller.TEXT)this.text=(key:string,isLazy?:boolean):string=>controller.TEXT(key,isLazy);
            else {
                this.text = (key:string,isLazy?:boolean):string=>{
                    let ctrlr:any = controller;
                    while(ctrlr){
                        let lngs:{[index:string]:string} = ctrlr.$lngs;
                        let txt = lngs[key];
                        if(txt!==undefined)return txt;
                        ctrlr = ctrlr._$container;
                    }
                    return key;
                }
            }
            this.binders = binders;
            //this.binders = ns.binders;
            //this.label = function(key,lazy){
            //    return lazy ?{toString:function(){return key}}:key;
            //}
        }
    }
    export abstract class BindExpression{
        abstract toCode():string;
        //abstract execute(context:BindContext):any;
    }
    let expressions: {[index:string]:Function}= BindExpression as any;
    export abstract class ValueExpression extends BindExpression{

        abstract getValue(context:BindContext):any;
        static parse(exprText:string,context:BindContext):ValueExpression{
            var expr:ValueExpression = ObservableExpression.parse(exprText,context);
            if(expr==null) expr = LabelExpression.parse(exprText,context);
            if(expr==null) expr = new ConstantExpression(exprText,context);
            return expr;
        }
    }
    expressions.ValueExpression = ValueExpression;


    class ObservableExpression extends ValueExpression{
        path:string;
        observable:IObservable;
        constructor(path:string,context:BindContext){
            super();
            let rs:any = ObservableExpression.makePath(path,context);
            this.path = rs.path;
            this.observable = rs.observable;
        }
        getValue(context:BindContext):any{return this.observable;}
        toCode():string{return this.path;}
        static makePath(path:string,context:BindContext):object{
            var result = {};
            var paths = path.split(".");
            var innerPaths = ["this.observable"];
            var observable = context.observable;
            for(var i =0,j=paths.length;i<j;i++){
                var pathname = paths.shift().replace(trimRegx,"");
                if(pathname=="$root"){
                    innerPaths = ["this.observable.ob_root()"];
                    observable = context.observable.ob_root();continue;
                }
                if(pathname=="$" || pathname=="$self") {innerPaths = ["this.observable"];observable = context.observable;continue;}
                if(pathname=="$parent") {observable = observable.ob_superior(); innerPaths = ["this.observable.ob_superior()"];continue;}
                observable= observable.ob_prop(pathname);
                innerPaths.push(pathname);
            }
            path = innerPaths.join(".");
            return {path:path,observable:observable};
        }

        static regText:string = "^\\s*\\$|\\$self|\\$parent|\\$root\\s*.\\s*" + pathReg + "\\s*$";
        static regx = new RegExp(ObservableExpression.regText);
        static parse(exprText:string , context:BindContext):ObservableExpression{
            if(ObservableExpression.regx.test(exprText)) return new ObservableExpression(exprText,context);
        }
    }
    expressions["Observable"] = ObservableExpression;

    class LabelExpression extends ValueExpression{
        key:string;
        lazy:boolean;
        constructor(key:string,context:BindContext){
            super();
            this.key = key;
        }
        toCode():string{return "this.text(\"" + this.key + "\","+(this.lazy?"true":"false")+")";}
        getValue(context:BindContext){return context.text(this.key);}
        static regText:string = "^\\s*##(" + pathReg + ")$";
        static regx :RegExp =  new RegExp(LabelExpression.regText);
        static parse(exprText:string ,context:BindContext):LabelExpression{
            var match = exprText.match(LabelExpression.regx);
            if(match) return new LabelExpression(match[1],context);
        }
    }
    expressions.Label  = LabelExpression;

    class ConstantExpression extends ValueExpression{
        value:string;
        constructor(value:string ,context:BindContext){
            super();
            this.value = value.replace(trimQuoteRegx,"");
        }
        toCode():string{ return  "\"" + this.value.replace(/"/,"\\\"") + "\"";}
        getValue(contex:BindContext):string{return this.value;}
        static regText:string = "(?:\"([^\"]*)\")|(?:'([^']*)')|(?:([^$.,()#]*))";
        static regx = new RegExp(ConstantExpression.regText);
        static parse (exprText:string,context:BindContext):ConstantExpression{
            var match = exprText.match(ConstantExpression.regx);
            if(match) return new ConstantExpression(match[1],context);
        }
    }    
    expressions.Constant = ConstantExpression;
    export let trimQuoteRegx:RegExp = /(^\s*['"])|(['"]\s*$)/g;

    class TextExpression extends ValueExpression{
        observable:IObservable;
        computedField:string;
        constructor(params :Array<string|{}>,context:BindContext){
            super();
            let codes:Array<string> = ["var $_txt='';var $_t = '';\n"];
            let deps:Array<IObservable> = [];
            for(let i=0,j=params.length;i<j;i++){
                let par :string|{} = params[i];
                if(typeof par ==="object"){
                    if((par as any).token[0]==="$"){
                        let rs :any = ObservableExpression.makePath((par as any).token,context);
                        codes.push("$_t=arguments[" + deps.length + "]();if($_t!==undefined&&$_t!==null)$_txt+=$_t;\n");
                        deps.push(rs.observable);
                    }else if((par as any).token[0]==="#"){
                        let key :string = (par as any).token.substr(1).replace(/"/g,"\\\"");
                        codes.push("$_txt += (this['@y.ob.controller']?this['@y.ob.controller'].TEXT(\"" +key + "\"):\"" + key + "\")\n");
                    }
                } else {
                    codes.push('$_txt +="' + (par as string).replace(/"/g,'\\"') + '";\n');
                }
            }
            let funcCode:string =codes.join("") + "return $_txt;\n";
            let observable :IObservable = context.observable;
            let pname:string = this.computedField = "COMPUTED_" + genId();
            this.observable = observable.set_computed(pname,deps,new Function(funcCode));

        }
        toCode():string{return "this.observable[\""+this.computedField + "\"]";}
        getValue(context:BindContext):any{
            return this.observable;
        }
        static regx:RegExp = /(?:\{\{(\$[a-z]{0,6}(?:.[\w\u4e00-\u9fa5]+)+)\}\})|(?:(#[\w\u4e00-\u9fa5]+(?:.[\w\u4e00-\u9fa5]+)*)#)/g;
        static parse( text:string,context:BindContext):TextExpression{
            let regx:RegExp = TextExpression.regx;
            let match :RegExpExecArray;
            let params :Array<string|{}> = [];
            let at = regx.lastIndex;
            while(match = regx.exec(text)){
                let prev:string = text.substring(at,match.index);
                if(prev)params.push(prev);
                let token :string = match[1]||match[2];
                params.push({token:token});
                at = regx.lastIndex;
            }
            if(params.length){
                let last:string = text.substring(at);
                if(last)params.push(last);
            }

            return params.length==0?null:new TextExpression(params,context);
        }
    }
    expressions.Text = TextExpression;

    abstract class ChildExpression extends BindExpression{

    }
    
    //alert(expr.match(ConstantExpression.Regx));
    class ChildBeginExpression extends ChildExpression{
        index:number;
        parentNode:HTMLElement;
        constructor(at:number,parentNode:HTMLElement,context:BindContext){
            super();
            this.index = at;
            this.parentNode = parentNode;
            if(parentNode!=context.element) throw "Invalid Arguments";
            context.element = context.element.childNodes[this.index] as HTMLElement;
        }
        toCode(){ return "this.element = this.element.childNodes["+this.index+"];\r\n"; }
    }
    expressions.ChildBegin = ChildBeginExpression;

    class ChildEndExpression extends ChildExpression{
        index:number;
        parentNode:HTMLElement;

        constructor(at:number,parentNode:HTMLElement,context:BindContext){
            super();
            this.index = at;
            this.parentNode = parentNode;
            context.element = context.element.parentNode as HTMLElement;
            if(parentNode!=context.element) throw "Invalid Arguments";
        }
        toCode():string{ return "this.element = this.element.parentNode;\r\n"; }
    }
    expressions.ChildEnd = ChildEndExpression;

    class BinderExpression extends BindExpression{
        binderName:string;
        parameters:Array<ValueExpression>;
        private _code:string;
        constructor(binderName:string , params:Array<ValueExpression>,context:BindContext){
            super();
            this.binderName = binderName;
            this.parameters = params;
            var args = [context.element];
            let code = "this.binders[\""+binderName+"\"].call(this,this.element";
            for(let i =0,j=this.parameters.length;i<j;i++){
                let par:ValueExpression = this.parameters[i];
                let value:any = par.getValue(context);
                code += "," + par.toCode();
                args.push(value);
            }
            
            let binder:Function = context.binders[this.binderName];
            if(!binder) 
                throw "binder is not found";
            if((binder as IBinder).applyWhenParsing || context.parseOnly!==true) context.ignoreChildren = binder.apply(context,args)===false;
            code += ");\r\n";
            this._code = code;
        }
        toCode(){return this._code;}
        static parseArguments(argsText:string):Array<string>{
            let argTexts:Array<string> = argsText.split(",");
            let argExprs:Array<string> = [];
            let strs:Array<string>=undefined;
            let startMatch:RegExpMatchArray = undefined;
            for(let i =0,j=argTexts.length;i<j;i++){
                let expr:string = argTexts[i];
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
        static parse(binderName:string,argsText:string,context:BindContext):BinderExpression{
            let argTexts:Array<string> = BinderExpression.parseArguments(argsText);
            var args:Array<ValueExpression> = [];
            for(let i =0,j=argTexts.length;i<j;i++){
                let argText:string = argTexts[i];
                args.push(ValueExpression.parse(argText,context));
            }
            return new BinderExpression(binderName,args,context);
        }
    }
    expressions.Binder = BinderExpression;
    
    let strStartRegx:RegExp = /^\s*(["'])/g;
    let strEndRegx:RegExp = /(["']\s*$)/g;

    let getValueBinderExpression:Function;

    export  function parseElement(context:BindContext,ignoreSelf?:boolean):void{
        var element = context.element;
        var exprs = context.expressions || (context.expressions=[]);
        if(!element.tagName){
            let cp: TextExpression = TextExpression.parse(element.textContent|| element.innerText || "",context);
            if(cp){
                let textBinder:BinderExpression = new BinderExpression("text",[cp],context);
                exprs.push(textBinder);
            }
            return;
        }
        var observable = context.observable;
        
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
                    ? getValueBinderExpression(element,attrvalue,context)
                    : BinderExpression.parse(binderName,attrvalue,context);
                exprs.push(bindExpr);
                if(context.ignoreChildren) ignoreChildren= true;
            }
            if(ignoreChildren)return;
        }
        
        var childNodes = element.childNodes;
        for(var i=0,j=childNodes.length;i<j;i++){
            var child = childNodes[i];
            var childBegin = new ChildBeginExpression(i,element,context);
            exprs.push(childBegin);
            parseElement(context);
            var lastExpr = exprs.pop();
            if(lastExpr!=childBegin){
                exprs.push(lastExpr);
                var childEnd = new ChildEndExpression(i,element,context);
                exprs.push(childEnd);
            }else{
                context.element = element;
            }
        }
    }

    export function makeBinder(context:BindContext,ignoreSelf?:boolean){
        parseElement(context,ignoreSelf);
        let exprs : Array<BindExpression> = context.expressions;
        if(exprs.length>0)while(true){
            let expr: BindExpression= exprs.pop();
            if(!(expr instanceof ChildExpression)){exprs.push(expr);break;}
        }
        var expr,codes="///"+(ignoreSelf?ignoreSelf:"") + "\r\nthis.element = $element;this.observable = $observable;\r\n";
        while(expr=exprs.shift()){
            codes += expr.toCode();
        }
        return new Function("$element","$observable",codes);
    }

    export function bind(element:HTMLElement,observable?:IObservable){
        let context:BindContext = new BindContext(document.body,observable);
        
        //ob_instance = context.observable;
        //var binder = Y.makeBinder(context);	
    }
    /////////////////////////////
    /// Binders
    let scope:any = binders.scope = function(element:HTMLElement,observable:IObservable):boolean{
        let binder:Function = observable["@y.binder.scope"];
        if(!binder){
            let ob:IObservable = this.observable;this.observable = observable;this.element = element;
            let exprs:Array<BindExpression> = this.expressions;this.expressions = [];
            binder = observable["@y.binder.scope"] = makeBinder(this,true);
            this.observable = ob;this.element = element;this.expressions=exprs;
            
        }
        binder(element,observable);
        return false;
    }
    scope.applyWhenParsing = true;
    

    let each :any = binders.each = function(element,observable){
        let binder:Function = observable["@y.binder.each"];
        let templateNode:HTMLElement;
        let context:BindContext = this as BindContext;
        if(!binder){
            let tmpNode:HTMLElement = cloneNode(element);
            templateNode =  cloneNode(tmpNode);
            let itemTemplate:IObservable = Y.observable(0,[],undefined,observable);
            let ob:IObservable = this.observable;this.observable = itemTemplate;this.element = tmpNode;
            let prevParseOnly:boolean = this.parseOnly; this.parseOnly = true;
            let exprs:Array<BindExpression> = this.expressions;this.expressions = [];
            binder = observable["@y.binder.each"] = makeBinder(this,element.getAttribute("y-each"));
            this.observable = ob;this.element = element;this.expressions=exprs;this.parseOnly = prevParseOnly;
            binder["@y.binder.templateElement"] = templateNode;
            observable.asArray(itemTemplate);
        }else{
            templateNode = binder["@y.binder.templateElement"];
        }
        let valueChange:(evt:ObservableEvent)=>any = (evtArgs:ObservableEvent):any=>{
            let value:any = evtArgs.value;
            element.innerHTML = "";
            let ob :IObservable= context.observable;
            let el:HTMLElement = context.element;
            for(let i =0,j=value.length;i<j;i++){
                let item :IObservable = observable[i];
                let elem:HTMLElement =context.element =  cloneNode(templateNode);
                context.observable = item;
                binder.call(context,elem,item);
                for(let m=0,n=elem.childNodes.length;m<n;m++){
                    element.appendChild(elem.firstChild);
                }
            }
            context.observable = ob;
            context.element = el;
        }
        valueChange.call(observable,{value:observable()});
        observable.subscribe(valueChange);
        return false;
    }
    each.applyWhenParsing = true;

    binders["value-textbox"] = function(element:HTMLInputElement,observable:IObservable,formatName?:string,formatOpt?:string){
        let context:BindContext = this as BindContext;
        let val:any = observable();
        let format:(value:any,opt?:string)=>string = formaters[formatName];
        if(val===undefined)observable(element.value);
        else{
            
            element.value = format?format(val,formatOpt):val;
        } 
        observable.subscribe((e:ObservableEvent)=>{
            element.value = format?format(e.value,formatOpt):e.value;
        });
        attach(element,"keyup",function(){observable(element.value);});
        attach(element,"blur",function(){observable(element.value);});
        
    }
    binders["value-select"] = function(element:HTMLSelectElement,observable:IObservable){
        let context:BindContext = this;
        let val:any = observable();
        let opts:NodeListOf<HTMLOptionElement> = element.options;
        let valuechange:(e:ObservableEvent)=>any = function(e:ObservableEvent):any{
            let value:any = e.value;
            let opts:NodeListOf<HTMLOptionElement> = element.options;
            for(let i=0,j=opts.length;i<j;i++){
                if(opts[i].value===value) {
                    opts[i].selected= true;
                    element.selectedIndex = i;
                    break;
                }
            }
        }
        let setElement:(value:string)=>void = (value:string):any=>{
            if(value===undefined || value===null)value="";else value = value.toString();
            let opts:NodeListOf<HTMLOptionElement> = element.options;
            for(let i=0,j=opts.length;i<j;i++){
                let opt:HTMLOptionElement = opts[i];
                if(opt.value===value){
                    opt.selected=true;
                    element.selectedIndex = i;
                    break;
                }
            }
        }
        if(val===undefined){
            let sIndex:number = element.selectedIndex;
            if(sIndex==-1)sIndex=0;
            var opt:HTMLOptionElement = opts[sIndex];
            let value:string = opt ? opt.value : undefined;
            observable(value);
        }else{
            setElement(val);
        }
        
        observable.subscribe(valuechange);
        attach(element,"change",(e:ObservableEvent):any=>{
            setElement(e.value);
        });
        
        
    }
    binders["value-check"] = binders["value-radio"] = function(element:HTMLInputElement,observable:IObservable):any{
        let context:BindContext = this as BindContext;
        observable(element.checked?element.value:undefined);
        observable.subscribe((e:ObservableEvent):any=>{
            if(e.value===element.value){
                element.checked = true;
            }else {
                element.checked = false;
                element.removeAttribute("checked");
            }
        });
        attach(element,"click",function(){observable(element.checked?element.value:undefined);});
        attach(element,"blur",function(){observable(element.checked?element.value:undefined);});
    } 
    binders["value-button"] = function(element:HTMLElement,observable:IObservable,formatName?:string,formatOpt?:string){
        var context = this;
        let format:(value:any,opt?:string)=>string = formaters[formatName];
        observable((element as HTMLInputElement).value);
        observable.subscribe(function(e){
            (element as HTMLInputElement).value = format?format(e.value,formatOpt):e.value;
        });
        
    } 
    binders["value-text"] = function(element:HTMLElement,observable:IObservable,formatName?:string,formatOpt?:string):any{
        let context:BindContext = this;
        let val = observable();
        let format:(value:any,opt?:string)=>string = formaters[formatName];
        if(val===undefined)observable((element as HTMLInputElement).value);
        else (element as HTMLInputElement).value = format?format(val,formatOpt):val;
        observable.subscribe((e:ObservableEvent):any=>{
            (element as HTMLInputElement).value = format?format(e.value,formatOpt):e.value;
        });
    }
    binders["text"]= function(element:HTMLElement,observable:IObservable,formatName?:string,formatOpt?:string){
        let context:BindContext = this;
        let val:any = observable();
        let format:(value:any,opt?:string)=>string = formaters[formatName];
        if(val===undefined)observable(element.tagName?element.textContent:element.innerHTML);
        else{
            if(element.tagName)element.innerHTML = format?format(val,formatOpt):val;
            else element.textContent = format?format(val,formatOpt):val;;
        } 
        observable.subscribe((e:ObservableEvent):any=>{
            if(element.tagName)element.innerHTML = format?format(e.value,formatOpt):e.value;
            else element.textContent = format?format(e.value,formatOpt):e.value;
        });
    }
    
    binders.visible = function(element:HTMLElement,observable:IObservable){
        let context:BindContext = this;
        let val:any = observable();
        let valuechange = function(e:ObservableEvent){
            let value:any = e.value;
            if(typeof value==="object"){
                let obj:object = value as object;
                value = false;
                for(var n in obj) {value=true;break;}
            }
            if(value && value!=="0" && value!=="false"){
                let displayValue:string = element["@y.displayValue"];
                if(displayValue===undefined)displayValue = element["@y.displayValue"]=getStyle(element,"display");
                if(displayValue==="none") displayValue= "";
                element.style.display = displayValue;
            } else {
                if(element["@y.displayValue"]===undefined) 
                    element["@y.displayValue"]= element.style.display || Y.displayValues[element.tagName] || "";
                element.style.display = "none";
            }
        }
        if(val===undefined) observable(element.style.display==="none"?false:true);
        else valuechange({value:val} as ObservableEvent);
        
        observable.subscribe(valuechange);
    }
    binders.readonly = function(element:HTMLElement,observable:IObservable){
        let context:BindContext = this as BindContext;
        let valuechange = function(e:ObservableEvent){
            var value = e.value;
            if(value && value!=="0" && value!=="false"){
                (element as any).readonly= true;
                element.setAttribute("readonly","readonly");
            } else {
                (element as any).readonly= false;
                element.removeAttribute("readonly");
            }
        }
        let val :any = observable();
        if(val===undefined)observable((element as any).readonly?true:false);
        else valuechange({value:val} as ObservableEvent);
        observable.subscribe(valuechange);
    }

    getValueBinderExpression = function(element:HTMLElement,expr:string,context:BindContext){
        var tagName = element.tagName;
        
        if(tagName=="SELECT") {
            return BinderExpression.parse("value-select",expr,context);
        }
        if(tagName=="TEXTAREA") return BinderExpression.parse("value-text",expr,context);
        if(tagName=="INPUT") {
            var type = (element as HTMLInputElement).type;
            
            if(type==="button" || type==="reset" || type==="submit") return BinderExpression.parse("value-button",expr,context);
            if(type==="check" ) return BinderExpression.parse("value-check",expr,context);
            if(type==="radio" ) return BinderExpression.parse("value-radio",expr,context);
            return BinderExpression.parse("value-textbox",expr,context);
        }
        if(tagName=="OPTION") return BinderExpression.parse("value-text",expr,context);
        return BinderExpression.parse("text",expr,context);
    }
}