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

        is_Observable?:boolean;
        is_Object?:boolean;
        is_Array?:boolean;

        ob_opts?(opts?:any):any;
        ob_superior?():IObservable;
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

    

    export function observable(field?:string|number,object?:object,opts?:any,superior?:IObservable){
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
            self.is_Object = false;
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
        

}