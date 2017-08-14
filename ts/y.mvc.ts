namespace Y
{
    /**
     * 骆驼命名转换
     * 把 padding-top变成paddingTop
     * @param {string} text - 要转变的字符串
     * @return {string} -转换后的字符串
     */
    export function camelize(text:string):string {
        // /\-(\w)/g 正则内的 (\w) 是一个捕获，捕获的内容对应后面 function 的 letter
        // 意思是将 匹配到的 -x 结构的 x 转换为大写的 X (x 这里代表任意字母)
        return text.replace(/\-(\w)/g, function (all, letter) { return letter.toUpperCase(); });
    }

    /**
     * 去掉前后空格的正则对象
     */
    export let trimRegx :RegExp = /^\s+|\s+$/;

    /**
     * 去掉前后空格
     * 把 padding-top变成paddingTop
     * @param {string} text - 要去掉前后空格的字符串
     * @return {string} -转换后的字符串
     */
    export function trim(text:string):string { return text.replace(trimRegx, ""); }

    ///////////////////////////////////////////////////////////////
    /// Observable
    ///
    let reservedPropnames:{[index:string]:string}={};

    /**
     * 用于Observable.subscribe/unsubscribe的监听函数原型
     * @interface 
     */
    export interface IObservableEventHandler{
        (evt:ObservableEvent):any;
    }
    /**
     * Observable发送改变通知时，传递给监听函数的事件对象
     * @class 
     */
    export class ObservableEvent{
        /** 发送事件的Observable */
        public observable:IObservable;

        /** 事件类型 */
        public type : string;
        /** 发生改变的数据字段名 */
        public field:string|number;
        /** 那个对象上的field值发生了改变 */
        public object:object;
        /** 改变后的值 */
        public value :any;
        /** 改变前的值 */
        public oldValue:any;
        /** 指示是否向子observable传播事件 */
        public propagate:boolean;
        /** 指示是否向上级observable传播事件 */
        public bubble:boolean;
        /** 是否立即终止事件传播。如果该值为true,事件会立即停止传播，未调用的同级的事件函数、下级的事件函数、上级的事件函数都不会被调用 */
        public stop?:boolean;
        /** 事件源，该事件是由什么事件而触发的*/
        public src?:ObservableEvent;
        /** 事件源。该事件最初是由什么事件导致的 ，可以通过循环src.src获取到该值*/
        public origins:ObservableEvent;
        /** 事件数据，一般是调用者给出 */
        public data?:any;
        public index?:number;
        public itemValue?:any;

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
        constructor(observable:IObservable,type:string,obj:object,field:string|number,value:any,oldValue?:any,src?:any){
            this.observable = observable;
            this.type = type;
            this.field = field;
            this.object = obj;
            this.value = value;
            this.oldValue = oldValue;
            this.propagate = true;
            this.bubble = true;
            if(src instanceof ObservableEvent){
                if(this.src = src) this.origins = src.origins || src;
                else this.origins = this;
            }else{
                if(this.data = src) {
                    if(this.src = src.$src_event) this.origins=this.src.origins|| this.src;
                    else this.origins = this;
                }
            }
            
        }
    }

    /**
     * 可观察对象
     * 可以用subscribe来添加事件，当其值改变后会发送通知
     * @interface 
     */
    export interface IObservable{
        (value?:any,srcEvt?:ObservableEvent|boolean):any;
        //[index:number]:IObservable;

        /** 指示该对象是否是Observable */
        is_Observable?:boolean;
        /** 指示该observable是否是Object(具有prop) */
        is_Object?:boolean;
        /** 指示该observable是否是array */
        is_Array?:boolean;

        /**
         * 获取/设置 该observable上的额外数据
         * @method
         * @param {any} opts - 额外数据(设置)/undefined(获取)
         * @return -获取返回额外数据；设置返回IObservable
         */
        ob_opts?(opts?:any):any;
        /**
         * 上级observable
         * @method
         * @return {IObservable} - 返回IObservable
         */
        ob_superior?():IObservable;
        /**
         * 根observable
         * @method
         * @return {IObservable} - 返回IObservable
         */
        ob_root?():IObservable;
        ob_prop?(name:string,opts?:any):IObservable;
        ob_object?(object:object,srcEvt?:ObservableEvent|boolean):IObservable|object;
        ob_field?(name:string|number):string|number|IObservable;

        notify?(evt:ObservableEvent):IObservable;
        bubble_up?(evt:ObservableEvent):IObservable;
        subscribe?(handler:IObservableEventHandler ):IObservable;
        unsubscribe?(handler:IObservableEventHandler ):IObservable;
        clone?(field?:string|number,obj?:object,parent?:IObservable):IObservable;
        asArray?(itemTemplate?:IObservable):IObservable;

        ob_itemTemplate?():IObservable;
        ob_count?():number;
        push?(itemValue:any):IObservable;
        pop?():any;
        unshift?(itemValue:any):IObservable;
        shift?():any;
        clear?(srcEvt:ObservableEvent|boolean,oldValue?:any):IObservable;

    }

    
    /**
    * 创建一个IObservable对象
    * @method
    * @param {string|number} field - 数据域的名称
    * @param {object} object - 在那个对象上的数据
    * @param {any} opts - 该observable上的额外的数据
    * @param {IObservable} superior - 该observable的上级对象
    * @return -获取返回额外数据；设置返回IObservable
    */
    export function observable(field?:string|number,object?:object,opts?:any,superior?:IObservable):IObservable{
        // 事件
        let changeHandlers:Array<IObservableEventHandler>;
        // 格式化
        let formatter:(value:any)=>any;
        // 域名
        field = field===undefined || field===null? "":field;
        // 对象
        object = object || {};
        

        
        let ob :IObservable = (newValue?:any,srcEvt?:boolean|ObservableEvent):any=>{
            let self:IObservable = ob;

            let oldValue:any = object[field];
            if(newValue===undefined) return formatter?formatter(oldValue):oldValue;
            if(oldValue===newValue) return self;
            if(!newValue){
                if(self.is_Array){
                    newValue=[];
                } else if(self.is_Object){
                    newValue={};
                }
            }
            let evt :ObservableEvent =srcEvt===false?null :new ObservableEvent(self,"value_change",object,field,newValue,oldValue,srcEvt) ;
            
            if(self.is_Array){
                //只通知子observable
                self.clear(evt,oldValue);
                let itemTemplate:IObservable = self.ob_itemTemplate();
                for(let i=0,j=newValue.length;i<j;i++){
                    self[i] = itemTemplate.clone(i,newValue,self);
                }
            } 
            object[field] = newValue;
            ///#DEBUG_BEGIN
            (ob as {[index:string]:any})["@y.ob.value"] = newValue;
            ///#DEBUG_END
            
            if(evt) self.notify(evt);
            //处理property
            if(self.is_Object){
                for(let n in newValue){
                    let prop = self[reservedPropnames[n]||n];
                    if(prop && prop.is_Observable){
                        prop.ob_object(newValue,evt);
                        evt.propagate=true;
                    }	
                }
            }
            if(evt && superior && evt.bubble!==false && !evt.stop){
                superior.bubble_up(evt);
            }
            return self;
        }
        ob.is_Observable=true;

          ///#DEBUG_BEGIN
          ob["@y.ob.object"] = object;
          ob["@y.ob.field"] = field;
          ob["@y.ob.parent"] = parent;
          ob["@y.ob.value"] = object[field];
          ///#DEBUG_END
        
        ob.is_Observable = true;
        ob.is_Object = ob.is_Array = false;
        ob.toString = function(){return object[field];}
        ob.ob_opts = function(v){
            if(v===undefined)return opts||(opts={});
            if(!opts)opts={};
            for(let n in v) opts[n]=v[n];
            return ob;
        }
        // 树形结构
        ob.ob_superior = ():IObservable=> superior;
        
        ob.ob_root = ():IObservable=>{
            if(superior)return superior.ob_root();
            return ob;
        };
        ob.ob_prop = function(pname:string|number,opts?){
            let self:IObservable = ob;
            self.is_Object = true;
            
            let _pname:string|number = reservedPropnames[pname]||pname;
            let prop:IObservable = self[_pname];
            if(!prop){
                let value = object[field] || (object[field]={});
                prop = self[_pname] = observable(pname,value ,opts,self);
            }else if(opts){
                prop.ob_opts(opts);
            }
            return prop;
        }
        
        // 
        ob.ob_object = function(newObject:object,srcEvt?:ObservableEvent|boolean){
            let obj:object = object;
            if(newObject===undefined)return object;
            if(newObject===object)return ob;
            let self:IObservable = ob,pname:string|number = field;
            
            let newValue:any = newObject[pname];
            let oldValue:any = object[pname];
            if(newValue===oldValue) return self;
            if(!newValue){
                if(self.is_Array){
                    newValue=obj[pname]=[];
                }else if(self.is_Object){
                    newValue = obj[pname]={};
                }
            }
            let evt:ObservableEvent ;
            if(srcEvt!==false){
                evt =new ObservableEvent(self,"object_change",obj,pname,newValue,oldValue,srcEvt);
            }
            
            if(self.is_Array){
                //清洗掉原来的，但不通知自己，因为后面会发送一次object_change通知
                self.clear(evt,oldValue);
                let itemTemplate:IObservable = self.ob_itemTemplate();
                for(let i=0,j=newValue.length;i<j;i++){
                    self[i] = itemTemplate.clone(i,newValue,self);
                }
            }
            object = newObject;
            ///#DEBUG_BEGIN
            ob["@y.ob.object"] = object;
            ob["@y.ob.value"] = newValue;
            ///#DEBUG_END
            
            if(evt)ob.notify(evt);
            if(self.is_Object ){
                for(let n in self){
                    let prop = self[reservedPropnames[n]||n];
                    if(prop && prop.is_Observable){
                        prop.ob_object(newValue,evt);
                        evt.propagate=true;
                    }
                }
            }
            return ob;
        }
        ob.ob_field = function(newPropname:string|number,srcEvt?:ObservableEvent|boolean){
            if(newPropname===undefined)return field;
            
            let newValue:object = object[newPropname];
            field = newPropname;
            ob.ob_object(newValue,srcEvt);
            return ob;
        }
        // 事件
        ob.notify = function(evt:ObservableEvent){
            let handlers: Array<IObservableEventHandler> = changeHandlers;
            let self:IObservable = ob;
            if(handlers){
                for(let i =0,j=handlers.length;i<j;i++){
                    let fn:IObservableEventHandler = handlers.shift();
                    let result:any = fn.call(self,evt);
                    if(result!==false) handlers.push(fn);
                    if(evt.stop) return self;
                }
            }
            return self;
        }
        ob.bubble_up = function(src?:ObservableEvent):IObservable{
            let obj:object = object;
            let self:IObservable = ob;
            let value:any = object[field];
            let evt:ObservableEvent = new ObservableEvent(self,"bubble_up",object,field,value,value,src);
            evt.bubble= true;
            self.notify(evt);
            if(evt.bubble && !evt.stop && superior){
                superior.bubble_up(evt);
            }
            return self;
        }

        ob.subscribe = function(handler:IObservableEventHandler):IObservable{
            let handlers:Array<IObservableEventHandler> =changeHandlers || (changeHandlers=[]);
            ///#DEBUG_BEGIN
            ob["@y.ob.changeHandlers"] = handlers;
            ///#DEBUG_END
            changeHandlers.push(handler);
            return ob;
        }
        ob.unsubscribe = function(handler:IObservableEventHandler):IObservable{
            let handlers:Array<IObservableEventHandler> = changeHandlers ;
            if(handlers===undefined)return ob;
            for(let i =0,j=handlers.length;i<j;i++){
                let fn = handlers.shift();
                if(fn!==handler) handlers.push(fn);
            }
            return ob;
        }

        ob.clone = function(pname?:string|number,obj?:object,parent?:IObservable):IObservable{
            pname || (pname = field);
            let self = ob;
            let clone = observable(pname,obj, opts,parent||self.ob_superior());
            clone.is_Object = self.is_Object;
            clone.is_Array = self.is_Array;
            
            if(self.is_Array){
                clone.asArray(self.ob_itemTemplate());
                return clone;
            }
            if(!self.is_Object) return clone;
            let value = obj[pname] ||(obj[pname]={});
            for(let n in self){
                if(n[0]==="@")continue;
                let prop = self[n];
                if(!prop.is_Observable)continue;
                clone[n] = prop.clone(n,value,clone);
            }
            return clone;
        }

        ob.asArray = function(itemTemplate?:IObservable):IObservable{
            let self:IObservable = ob;
            self.is_Array = true;
            //self.is_Object = false;
            itemTemplate || ( itemTemplate = observable("0",[],undefined,self)) ;
            ///#DEBUG_BEGIN
            ob["@y.ob.itemTemplate"] = itemTemplate;
            ///#DEBUG_END

            let arr:Array<any> = object[field] || (object[field]=[]);
            for(let i=0,j=arr.length;i<j;i++){
                self[i] = itemTemplate.clone(i,arr,self);
            }

            self.ob_itemTemplate = ():IObservable=>itemTemplate;
            self.ob_count = ():number=> object[field].length;
            self.push = (itemValue:any):IObservable=>{
                let arr = object[field];
                let index:number = arr.length;
                arr.push(itemValue);
                let item = self[index]=itemTemplate.clone(index,arr,self);
                let evt:ObservableEvent = new ObservableEvent(self,"add_item",object,field,arr);
                evt.index = index;
                self.notify(evt);
                return item;
            }

            self.pop = ():any=>{
                let arr:Array<any> = object[field];
                let  index:number = arr.length-1;
                if(index<0)return;
                let itemValue:any = arr.pop();
                let item :IObservable = self[index];
                delete self[index];
                let itemEvt:ObservableEvent = new ObservableEvent(item,"remove",arr,index,itemValue);
                item.notify(itemEvt);
                if(itemEvt.bubble!==false && !itemEvt.stop){
                    let evt:ObservableEvent = new ObservableEvent(self,"remove_item",object,field,arr);
                    evt.index = index;evt.itemValue=itemValue;
                    self.notify(evt);
                    if(evt.bubble!==false && !evt.stop)self.bubble_up(evt);
                }
                
                return itemValue;
            }
            //添加第一个
            self.unshift = function(itemValue:any):IObservable{
                let me :IObservable = self;
                let arr :Array<any>= object[field];
                let index:number = arr.length;
                arr.unshift(itemValue);
                for(let i =arr.length,j=0;i>=j;i--){
                    let item = me[i] = me[i-1];
                    item.ob_field(i,false);
                }
                let item:IObservable = self[0]=itemTemplate.clone(0,arr,self);
                let evt:ObservableEvent = new ObservableEvent(self,"add_item",object,field,arr);
                evt.index = index;
                self.notify(evt);
                return item;
            }
            self.shift = function():any{
                let me :IObservable = self;
                let arr : Array<any>= object[field];
                let  count:number = arr.length-1;
                if(count<0)return;
                let itemValue:any = arr.shift();
                let item :IObservable = self[0];
                
                for(let i =1,j=count;i<=j;i++){
                    let item = me[i-1] = me[i];
                    item.ob_field(i,false);
                }
                delete self[count];
                let itemEvt:ObservableEvent = new ObservableEvent(item,"remove",arr,0,itemValue);
                item.notify(itemEvt);
                if(itemEvt.bubble!==false&& !itemEvt.stop){
                    let evt:ObservableEvent = new ObservableEvent(self,"remove_item",object,field,arr);
                    evt.index = 0 ;evt.itemValue=itemValue;
                    self.notify(evt);
                    if(evt.bubble!==false && !evt.stop)self.bubble_up(evt);
                }
                return itemValue;
            }
            self.clear = function(srcEvt?:ObservableEvent|boolean,oldValue?:any):IObservable{
                let arr :Array<any>= oldValue || object[field];
                let me : IObservable = self;
                let count :number = arr.length;
                let rplc:Array<any> = [];let stop:boolean = false;let bubble_up: boolean = true;
                for(let i =0;i<count;i++){
                    let itemValue:any = arr.shift();
                    let item:IObservable = me[i];
                    delete me[i];
                    //evtArgs.index = i;
                    if(srcEvt!==false && stop){
                        let itemEvt:ObservableEvent = srcEvt===false?null : new ObservableEvent(self,"remove",arr,i,itemValue,itemValue,srcEvt);
                        item.notify(itemEvt);
                        if(itemEvt.stop) stop = true;
                        if(itemEvt.bubble===false) bubble_up = false;
                    }
                    rplc.push(itemValue);
                }
                if(oldValue===undefined&& srcEvt!==false && bubble_up && !stop ){
                    let evt = new ObservableEvent(self,"clear",object,field,arr,rplc,srcEvt);
                    self.notify(evt);
                }
                
                return self;
            }
            return itemTemplate;
        }

        return ob;
    }
    ///////////////////////////////////////////////////////////////
    /// DOM
    ////////////////////////////////////////////////////////////////

    var divContainer:HTMLDivElement = document.createElement("div");
    var p_maps:{[index:string]:HTMLElement}= {
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

    let displayValues :{[index:string]:string}= {};
    
    /**
    * 克隆一个html元素
    * @method
    * @param {HTMLElement} toBeClone - 要克隆的元素
    * @return - 克隆的新的元素。其结构与属性与toBeClone一模一样
    */
    export function cloneNode(toBeClone:HTMLElement):HTMLElement {
        let p:HTMLElement = p_maps[toBeClone.tagName] || divContainer;
        let html:string =toBeClone.outerHTML+"";
        p.innerHTML = html;
        let node :HTMLElement= p.firstChild as HTMLElement;
        p.removeChild(node);
        return node;
    }   

    export let attach :(element:HTMLElement,evtname:string,handler:Function)=>void;
    export let detech :(element:HTMLElement,evtname:string,handler:Function)=>void;
    if(divContainer.addEventListener){
        attach = (element:HTMLElement,evtname:string,handler:Function):void => element.addEventListener(evtname,handler as EventListenerOrEventListenerObject,false);
        detech = (element:HTMLElement,evtname:string,handler:Function):void => element.removeEventListener(evtname,handler as EventListenerOrEventListenerObject,false);
    }else if(divContainer["attachEvent"]){
        attach = (element:HTMLElement,evtname:string,handler:Function):void =>(element as any).attachEvent("on" + evtname,handler);
        detech = (element:HTMLElement,evtname:string,handler:Function):void =>(element as any).detechEvent("on" + evtname,handler);
    }

    export function setStyle(elem:HTMLElement, style:string, value:string) { elem.style[camelize(style)] = value; }
    
    export let getStyle:(elem:HTMLElement,style:string)=>string;
    // 主流浏览器
    if (window.getComputedStyle) {
        getStyle = (elem:HTMLElement, style:string)=> getComputedStyle(elem, null).getPropertyValue(style);
    } else {
        function getIEOpacity(elem) {
            let filter:any = null;

            // 早期的 IE 中要设置透明度有两个方法：
            // 1、alpha(opacity=0)
            // 2、filter:progid:DXImageTransform.Microsoft.gradient( GradientType= 0 , startColorstr = ‘#ccccc’, endColorstr = ‘#ddddd’ );
            // 利用正则匹配
            filter = elem.style.filter.match(/progid:DXImageTransform.Microsoft.Alpha\(.?opacity=(.*).?\)/i) || elem.style.filter.match(/alpha\(opacity=(.*)\)/i);

            if (filter) {
                let value:number = parseFloat(filter);
                if (NaN!==value) {
                    // 转化为标准结果
                    return value ? value / 100 : 0;
                }
            }
            // 透明度的值默认返回 1
            return 1;
        }
        getStyle = function (elem:HTMLElement, style:string):string {
            // IE 下获取透明度
            if (style == "opacity") {
                getIEOpacity(elem);
                // IE687 下获取浮动使用 styleFloat
            } else if (style == "float") {
                return (elem as any).currentStyle.getAttribute("styleFloat");
                // 取高宽使用 getBoundingClientRect
            } else if ((style == "width" || style == "height") && ((elem as any).currentStyle[style] == "auto")) {
                var clientRect = elem.getBoundingClientRect();

                return (style == "width" ? clientRect.right - clientRect.left : clientRect.bottom - clientRect.top) + "px";
            }
            // 其他样式，无需特殊处理
            return (elem as any).currentStyle.getAttribute(camelize(style));
        };


    }
    export let setOpacity :(elem:HTMLElement,val:string)=>void = (elem:HTMLElement,val:string)=> {
        let value:number = parseFloat(val);
        elem.style.opacity = value.toString();
        elem.style.filter = "alpha(opacity=" + (value * 100) + ")";
        return elem;
    }
    
    export function hasClass(element:HTMLElement,css:string):boolean{
        let cssStr:string = element.className;
        let begin:number = cssStr.indexOf(css);
        if(begin<0)return false;
        let end = begin + css.length;
        if(begin==0){
            if(end ==cssStr.length)return true;
            return /^\s$/.test(cssStr[begin+1]);
        }
        if(!/^\s$/.test(cssStr[begin-1]))return false;
        if(end==cssStr.length)return true;
        return /^\s$/.test(cssStr[end+1]);
    }

    export function addClass(element:HTMLElement,css:string):boolean{
        if(hasClass(element,css))return false;
        var cssStr = element.className;
        if(cssStr==="") element.className = css;
        else if(/^\s$/.test(cssStr[cssStr.length-1]))cssStr += css;
        else cssStr += ' ' + css;
        element.className = cssStr;
        return true;
    }
    export function removeClass(element:HTMLElement,css:string):boolean{
        let cssStr:string = element.className;
        let s :Array<string> = cssStr.split(/\s+/);
        let hasIt :boolean = false;
        for(let i=0,j=s.length;i<j;i++){
            let c = s.shift();
            if(c!==css)s.push(c);
            else hasIt = true;
        }
        if(hasIt)element.className = s.join(" ");
        return hasIt;
    }

    ////////////////////////////
    /// Expression

    let propReg:string = "[\\w\\u4e00-\\u9fa5]+";
    let pathReg:string = propReg + "(?:\\s*.\\s*" + propReg + ")*";
    export class BindContext{
        public element:HTMLElement;
        public binders:{[index:string]:Function};
        public observable:IObservable;
        public text:(key:string,isLazy?:boolean)=>string;

        public parseOnly:boolean;
        public ignoreChildren:boolean;

        public expressions:Array<BindExpression>;
        public constructor(element:HTMLElement,ob_instance:IObservable,controller:any){
            this.element = element;
            this.observable = ob_instance || observable();
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
            if(expr==null) expr = TextExpression.parse(exprText,context);
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
            this.path = path;
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
                if(pathname=="$parent") {observable = observable.ob_superior(); innerPaths = ["this.observable.ob_parent()"];continue;}
                observable= observable.ob_prop(pathname);
                innerPaths.push(pathname);
            }
            this.path = innerPaths.join(".");
            this.observable = observable;
        }
        getValue(context:BindContext):any{return this.observable;}
        toCode():string{return this.path;}

        static regText:string = "^\\s*\\$|\\$self|\\$parent|\\$root\\s*.\\s*" + pathReg + "\\s*$";
        static regx = new RegExp(ObservableExpression.regText);
        static parse(exprText:string , context:BindContext):ObservableExpression{
            if(ObservableExpression.regx.test(exprText)) return new ObservableExpression(exprText,context);
        }
    }
    expressions["Observable"] = ObservableExpression;

    class TextExpression extends ValueExpression{
        key:string;
        lazy:boolean;
        constructor(key:string,context:BindContext){
            super();
            this.key = key;
        }
        toCode():string{return "this.text(\"" + this.key + "\","+(this.lazy?"true":"false")+")";}
        getValue(context:BindContext){return context.text(this.key);}
        static regText:string = "^\\s*##(" + pathReg + ")$";
        static regx :RegExp =  new RegExp(TextExpression.regText);
        static parse(exprText:string ,context:BindContext):TextExpression{
            var match = exprText.match(TextExpression.regx);
            if(match) return new TextExpression(match[1],context);
        }
    }
    expressions.Text  = TextExpression;

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
            let binder = context.binders[this.binderName];
            if(!binder) 
                throw "binder is not found";
            if(context.parseOnly!==true) context.ignoreChildren = binder.apply(context,args)===false;
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

    export  function parseElement(context:BindContext,ignoreSelf?:boolean):Function{
        var element = context.element;
        if(!element.tagName)return;
        var observable = context.observable;
        var exprs = context.expressions || (context.expressions=[]);
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

    /////////////////////////////
    /// Binders
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

    export let binders :{[index:string]:Function}={};

    binders.scope = function(element,observable){
        let binder:Function = observable["@y.binder.scope"];
        if(!binder){
            let ob:IObservable = this.observable;this.observable = observable;this.element = element;
            let exprs:Array<BindExpression> = this.expressions;this.expressions = [];
            binder = observable["@y.binder.scope"] = makeBinder(this,true);
            this.observable = ob;this.element = element;this.expressions=exprs;
            
        }
        binder(element,observable);
    }

    binders.each = function(element,observable){
        let binder:Function = observable["@y.binder.each"];
        let templateNode:HTMLElement;
        let context:BindContext = this as BindContext;
        if(!binder){
            let tmpNode:HTMLElement = cloneNode(element);
            templateNode =  cloneNode(tmpNode);
            let itemTemplate:IObservable = observable(0,[],undefined,observable);
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
    binders["value-textbox"] = function(element:HTMLInputElement,observable:IObservable){
        let context:BindContext = this as BindContext;
        let val:any = observable();
        if(val===undefined)observable(element.value);
        else element.value = val;
        observable.subscribe((e:ObservableEvent)=>{
            element.value = e.value;
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
    binders["value-button"] = function(element:HTMLElement,observable:IObservable){
        var context = this;
        observable((element as HTMLInputElement).value);
        observable.subscribe(function(e){
            (element as HTMLInputElement).value = e.value;
        });
        
    } 
    binders["value-text"] = function(element:HTMLElement,observable:IObservable):any{
        let context:BindContext = this;
        let val = observable();
        if(val===undefined)observable((element as HTMLInputElement).value);
        else (element as HTMLInputElement).value = val;
        observable.subscribe((e:ObservableEvent):any=>{
            (element as HTMLInputElement).value = e.value;
        });
    }
    binders["text"]= function(element:HTMLElement,observable:IObservable){
        let context:BindContext = this;
        let val:any = observable();
        if(val===undefined)observable(element.innerHTML);
        else element.innerHTML = val;
        observable.subscribe((e:ObservableEvent):any=>{
            element.innerHTML = e.value;
        });
    }
    
    binders.visible = function(element:HTMLElement,observable:IObservable){
        let context:BindContext = this;
        observable(element.style.display==="none"?false:true);
        observable.subscribe((e:ObservableEvent):any=>{
            let value:any =e.value;
            if(value && value!=="0" && value!=="false"){
                let displayValue:string = element["@y.displayValue"];
                if(displayValue===undefined)displayValue = element["@y.displayValue"]=getStyle(element,"display");
                if(displayValue==="none") displayValue= "";
                element.style.display = displayValue;
            } else {
                if(element["@y.displayValue"]===undefined) 
                    element["@y.displayValue"]= element.style.display || displayValues[element.tagName] || "";
                element.style.display = "none";
            }
        });
    }
    binders.readonly = function(element:HTMLElement,observable:IObservable){
        var context = this;
        observable((element as any).readonly?true:false);
        observable.subscribe(function(e){
            var value = e.value;
            if(value && value!=="0" && value!=="false"){
                (element as any).readonly= true;
                element.setAttribute("readonly","readonly");
            } else {
                (element as any).readonly= false;
                element.removeAttribute("readonly");
            }
        });
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