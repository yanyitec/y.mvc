
namespace Y
{
    export function date_str(d?:Date){
        if(d===undefined) d= new Date();
        let text:string = d.getFullYear().toString();
        let month :number = d.getMonth();text +=(month<10)? "-0":"-"; text += month.toString();
        let day :number = d.getDate();text +=(day<10)? "-0":"-";text += day.toString();
        let hour:number = d.getHours();text +=(hour<10)? " 0":" ";text += hour.toString();
        let minute:number = d.getMinutes();text +=(minute<10)? ":0":":";text += minute.toString();
        let second :number = d.getSeconds(); text +=(second<10)? ":0":":";text += second.toString();
        let ms :number = d.getMilliseconds();if(ms<10)text += ".00";else if(ms<100) text += ".0"; else text += ".";text += ms.toString();
        return text;
    }
    

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
        dispose?:(sender:IObservable)=>void;
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
     * Observable发送改变通知时，传递给监听函数的事件对象
     * @class 
     */
    export class ObservableComputedArgs{
        func:Function;
        deps:Array<IObservable>
        constructor(func:Function,deps:Array<IObservable>){
            this.func = func;
            this.deps = deps;
        }
    }

    

    /**
     * 可观察对象
     * 可以用subscribe来添加事件，当其值改变后会发送通知
     * @interface 
     */
    export interface IObservable {
        (value?:any,srcEvt?:ObservableEvent|boolean):any;
        //[index:number]:IObservable;

        /** 指示该对象是否是Observable */
        is_Observable?:boolean;
        /** 指示该observable是否是Object(具有prop) */
        is_Object?:boolean;
        /** 指示该observable是否是array */
        is_Array?:boolean;
        /** 指示该observable是否是计算域 */
        is_Computed?:boolean;

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
        clone?(field?:string|number,obj?:object,superior?:IObservable):IObservable;
        asArray?(itemTemplate?:IObservable):IObservable;
        set_computed?:(pname:string,deps:Array<IObservable>,func:Function)=>IObservable;

        ob_itemTemplate?():IObservable;
        ob_count?():number;
        push?(itemValue:any):IObservable;
        pop?():any;
        unshift?(itemValue:any):IObservable;
        shift?():any;
        clear?(srcEvt:ObservableEvent|boolean,oldValue?:any):IObservable;
        dispose?(handler?:(sender:IObservable)=>void):void;
    }

    let computedPlaceholdValue:object= {};
    
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
        let disposeHanders : Array<(sender:IObservable)=>void>;
        // 格式化
        let formatter:(value:any)=>any;
        // 域名
        field = field===undefined || field===null? "":field;
        // 对象
        object = object || {};

        let computeFunc : Function;
        let newComputedValue:any = computedPlaceholdValue;
        let ob :IObservable;
        let isComputed = object instanceof ObservableComputedArgs;
        let computedEventHandler:IObservableEventHandler;
        if(isComputed){
            let computedValue :any=computedPlaceholdValue;
            let deps:Array<IObservable> = (object as ObservableComputedArgs).deps;
            ob =  function(newValue?:any,srcEvt?:boolean|ObservableEvent){  
                if(computedValue ===computedPlaceholdValue){  
                    computedValue =  (object as ObservableComputedArgs).func.apply(ob,deps);  
                }
                return computedValue;
            }
                    
            computedEventHandler = function(evt:ObservableEvent){
                let newComputedValue:any =  (object as ObservableComputedArgs).func.apply(ob,(object as ObservableComputedArgs).deps);
                if(newComputedValue===computedValue)return;
                let computedEvt :ObservableEvent = new ObservableEvent(ob,"value_change",undefined,field,newComputedValue,computedValue,evt) ;
                computedValue = newComputedValue;
                computedEvt.bubble = false;
                ob.notify(computedEvt);
            }
            for(let i=0,j=deps.length;i<j;i++){ deps[i].subscribe(computedEventHandler);  }
            ob.is_Computed = true;
            
        } else ob  = (newValue?:any,srcEvt?:boolean|ObservableEvent):any=>{
            let self:IObservable = ob;

            let oldValue:any = object[field];
            if(newValue===undefined) return formatter?formatter(oldValue):oldValue;
            if(oldValue===newValue) return self;
            if(typeof newValue!=='object'){
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
                    if(prop && prop.is_Observable && prop.ob_object){
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
        for(let n in exts) ob[n] = exts[n];
        ob.is_Observable=true;

        ///#DEBUG_BEGIN
        ob["@y.ob.object"] = object;
        ob["@y.ob.field"] = field;
        ob["@y.ob.superior"] = superior;
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
        if(!isComputed)ob.ob_prop = function(pname:string|number,opts?){
            let self:IObservable = ob;
            self.is_Object = true;
            
            let _pname:string|number = reservedPropnames[pname]||pname;
            let prop:IObservable = self[_pname];
            if(!prop){
                let value = object[field];
                if(typeof value!=="object"){
                    value = (self.is_Array)?[]:{};
                }
                prop = self[_pname] = observable(pname,value ,opts,self);
            }else if(opts){
                prop.ob_opts(opts);
            }
            return prop;
        }
        
        // 
        if(!isComputed)ob.ob_object = function(newObject:object,srcEvt?:ObservableEvent|boolean){
            let obj:object = object;
            if(newObject===undefined)return object;
            if(newObject===object)return ob;
            let self:IObservable = ob,pname:string|number = field;
            
            let newValue:any = newObject[pname];
            let oldValue:any = object[pname];
            if(newValue===oldValue) return self;
            if(typeof newValue !=='object'){
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
            if(self.is_Object){
                for(let n in self){
                    let prop = self[reservedPropnames[n]||n];
                    if(prop && prop.is_Observable && prop.ob_object){
                        prop.ob_object(newValue,evt);
                        evt.propagate=true;
                    }
                }
            }
            return ob;
        }
        ob.ob_field = function(newPropname:string|number,srcEvt?:ObservableEvent|boolean){
            if(newPropname===undefined)return field;
            if(isComputed){field=newPropname;return ob;}
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

        ob.clone = function(pname?:string|number,obj?:object,superior?:IObservable):IObservable{
            pname || (pname = field);
            let self = ob;
            let clone = observable(pname,obj, opts,superior ||self.ob_superior());
            clone.is_Object = self.is_Object;
            clone.is_Array = self.is_Array;
            clone.is_Computed = self.is_Computed;
            
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

        if(!isComputed)ob.asArray = function(itemTemplate?:IObservable):IObservable{
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

        if(!isComputed)ob.set_computed = function(pname:string,deps:Array<IObservable>,func:Function):IObservable{
            let self:IObservable = ob;
            self.is_Object = true;
            
            let _pname:string|number = reservedPropnames[pname]||pname;
            let prop:IObservable = self[_pname];
            if(prop) throw "field[" + pname + "] already existed.";
            prop = self[_pname] = observable(pname,new ObservableComputedArgs(func,deps));
            
            return prop;
        }

        ob.dispose = function(handler?:(sender:IObservable)=>void){
            let self: IObservable = ob;
            if(handler!==undefined){
                disposeHanders || (disposeHanders=[]);
                disposeHanders.push(handler);
                return ob;
            }
            if(disposeHanders){
                for(let i=0,j=changeHandlers.length;i<j;i++){
                    changeHandlers[i].call(self,self);
                }
                disposeHanders = undefined;
            }
            
            if(changeHandlers){
                for(let i=0,j=changeHandlers.length;i<j;i++){
                    let handler:IObservableEventHandler = changeHandlers.shift();
                    if(handler.dispose) handler.dispose(self);
                }
                changeHandlers = undefined;
            }
        }
        if(isComputed){
            ob.dispose((sender:IObservable):void=>{
                let deps :Array<IObservable> = (object as ObservableComputedArgs).deps;
                for(let i =0,j=deps.length;i<j;i++){
                    deps[i].unsubscribe(computedEventHandler);
                }
            });
        }
        
        return ob;
    }
    let exts:object = (observable as any).exts = {};
    
    
    /////////////////////////////////
    /// format
    export let formaters:{[index:string]:(value:any,format_opts?:string)=>string}={};
}