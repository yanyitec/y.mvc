namespace Y{
    
    export interface IPromiseResult{
        resolve:any;
        reject:any;
        isSuccess:boolean;
    }

    export class Promise{
        
        done(handler:(result:any)=>void):Promise{
            let result :IPromiseResult = this["@y.promise.result"] as IPromiseResult;
            if(result===undefined){
                let handlers:Array<(result:any)=>void> = 
                    (this["@y.promise.doneHandlers"] || (this["@y.promise.doneHandlers"]=[])) as Array<(result:any)=>void>;
                handlers.push(handler);
            }else{
                if(result.isSuccess)handler.call(this,result.resolve);
            }
            return this;
        }
        fail(handler:(result:any)=>void):Promise{
            let result :IPromiseResult = this["@y.promise.result"] as IPromiseResult;
            if(result===undefined){
                let handlers:Array<(result:any)=>void> = 
                    (this["@y.promise.failHandlers"] || (this["@y.promise.failHandlers"]=[])) as Array<(result:any)=>void>;
                handlers.push(handler);
            }else{
                if(!result.isSuccess)handler.call(this,result.reject);
            }
            return this;
        }
        resolve(value:any):Promise{
            if(value.done && value.fail && value!=this){
                value.done((value:any)=>{
                    this.resolve(value);
                }).fail((error:any)=>{
                    this.reject(error);
                });
                return this;
            }
            this["@y.promise.result"]={resolve:value,isSuccess:true};
            let handlers:Array<(result:any)=>void> = this["@y.promise.doneHandlers"];
            this["@y.promise.doneHandlers"] = this["@y.promise.failHandlers"]=undefined;
            this.resolve = this.reject = ()=>{throw "Aready resolved";}
            for(let i=0,j=handlers.length;i<j;i++) handlers[i].call(this,value);
            return this;
        }
        reject(value:any):Promise{
            this["@y.promise.result"]={reject:value,isSuccess:false};
            let handlers:Array<(result:any)=>void> = this["@y.promise.failHandlers"];
            this["@y.promise.doneHandlers"] = this["@y.promise.failHandlers"]=undefined;
            this.resolve = this.reject = ()=>{throw "Aready resolved";}
            for(let i=0,j=handlers.length;i<j;i++) handlers[i].call(this,value);
            return this;
        }
        resolved_value():any{
            let result:IPromiseResult = this["@y.promise.result"];
            if(result) return result.resolve;
        }
        dispose(){
            let result:IPromiseResult = this["@y.promise.result"] as IPromiseResult;
            this["@y.promise.result"] = this["@y.promise.failHandlers"] =this["@y.promise.doneHandlers"] = undefined;
            
            this.reject = this.done = this.fail = this.resolve
            = this.resolved_value
            = ()=>{throw new Error("disposed");}
            
        }
        static None:Promise = new Promise();
    }
    export function promise(handler:(resolve:(result:any)=>void,reject:(error:any)=>void)=>void,delay?:boolean){
        var promise = new Promise();
        let resolve = (result:any)=>setTimeout(()=>{if(!promise["@y.promise.result"])promise.resolve(result);},0);
        let reject = (result:any)=>setTimeout(()=>{if(!promise["@y.promise.result"])promise.reject(result);},0);
        if(delay){
            setTimeout(()=>{
                try{
                    handler.call(promise,resolve,reject);
                }catch(ex){
                    promise.reject(ex);
                }
            },0);
        }else{
            try{
                handler.call(promise,resolve,reject);
            }catch(ex){
                promise.reject(ex);
            }
        }
        return promise;
    }
}