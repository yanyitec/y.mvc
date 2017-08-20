/// <reference path="y.promise.ts" />
/// <reference path="y.ajax.ts" />
namespace Y{
    
    window["$exports"]=undefined;
    export interface IResourceOpts{
        url?:string;
        type?:string;
        id?:string;
        content?:any;
        global?:boolean;
        dispose?:()=>void;
    }
    
    export class Resource extends Promise{
        url:string;
        id:string;
        type:string;
        element?:HTMLElement;
        opts:IResourceOpts;
        constructor(opts:IResourceOpts,_type?:string){
            super();
            if(!(this.opts = opts)) return;
            this.id = opts.id;
            this.url = opts.url;
            this.type = opts.type===undefined?_type:opts.type;
            if(opts.dispose){
                this.dispose = ()=>{ opts.dispose.call(this); };
            }
        }
        
    }

    export class ResourceManager{
        name:string ;
        caches:{[index:string]:Resource};
        superior:ResourceManager;
        children:{[index:string]:ResourceManager};
        constructor(name:string,superior?:ResourceManager){
            this.name = name;
            this.superior = superior;
            this.caches = {};
        }
        dispose(){
            let superior :ResourceManager = this.superior;
            this.superior = undefined;
            let caches :{[index:string]:Resource} = this.caches;
            this.caches = undefined;
            let children : {[index:string]:ResourceManager} = this.children;
            this.children = undefined;
            
            for(var n in caches){
                let res:Resource = caches[n];
                
                let resolveValue = res.resolved_value();
                if(resolveValue && resolveValue.dispose){
                    resolveValue.dispose(res);
                }
                res.dispose();
                if(res.element && res.element.parentNode)res.element.parentNode.removeChild(res.element); 
                res.element = undefined;
            }
            
            if(superior) delete superior.children[this.name];
            for(let n in children){
                let child:ResourceManager = this.children[n];
                child.superior = undefined;
                child.dispose();
            }
        }
        fetch(idOrOpts:string|IResourceOpts):Resource{
            let res:Resource;
            let opts :IResourceOpts;
            let superior:ResourceManager = this;
            let type :string;
            if(typeof idOrOpts==="string") {
                while(superior){
                    if(res=superior.caches[idOrOpts])break;
                    superior = superior.superior; 
                }
                if(res){return res;}
                opts = {id:idOrOpts as string,url:idOrOpts as string};
                
            }else{
                opts = idOrOpts as IResourceOpts;
                let id:string = (opts.id===undefined)?opts.url: opts.id;
                
                while(superior){
                    if(res=superior.caches[id])break;
                    superior = superior.superior; 
                }
                if(res) { return res;}
                
            }
            
            if(opts.type===undefined && opts.url){
                let at = opts.url.lastIndexOf(".");
                if(at>0) type = opts.url.substr(at+1);
            }else{
                type = opts.type;
            }
            
            let srcType :any = ResourceManager.types[type] || Resource ;
            if(!srcType) throw new Error("Cannot load " + opts.url + ", resource type error.");
            res = new srcType(opts,type);
            if(res.id!==undefined){
                if(opts.global) resourceManager.caches[res.id] = res;
                else this.caches[res.id] = res;
            }
            if(opts.content!==undefined){
                res.resolve(opts.content===Resource.None?undefined:opts.content);
                return;
            }
            let loader:(res:Resource,opts:IResourceOpts)=>void = ResourceManager.loaders[opts.type];
            if(loader){
                window["$exports"]=undefined;
                loader(res,opts);
            }
            return res;
        }
        static global:ResourceManager = new ResourceManager("@y.resource.global");
        static loaders :{[index:string]:(src:Resource,opts:IResourceOpts)=>void}= {};
        static types:{[index:string]:Function}={};
    }

    let get_head:()=>HTMLElement =():HTMLElement=>{
        let headers = document.getElementsByTagName("head");
        let head = headers && headers.length?headers[0]:document.body;
        get_head = ():HTMLElement=>head;
        return head as HTMLElement;
    };
    
    ResourceManager.loaders.js = function(res:Resource,opts:IResourceOpts){
        let script:HTMLScriptElement = document.createElement("script") as HTMLScriptElement;
        res.element = script;
        script.src = res.url;
        script.type = "text/javascript";
        if((script as any).onreadystatechange){
            if((script as any).readyState===4 || (script as any).readyState==='complete'){
                let exports:any = window["$exports"];
                window["$exports"] = undefined;
                res.resolve(exports);
            }
        }else script.onload = function(){
            let exports:any = window["$exports"];
            window["$exports"] = undefined;
            res.resolve(exports);
        }
        script.onerror = function(e){
            res.reject({opts:opts,res:res,element:script,content:undefined,error:e||"cannot load script"});
        }
    }
    ResourceManager.loaders.css = function(res:Resource,opts:IResourceOpts){
        let link:HTMLLinkElement = document.createElement("link") as HTMLLinkElement;
        res.element = link;
        link.href = res.url;
        link.type = "text/css";
        link.rel = "stylesheet";
        if((link as any).onreadystatechange){
            if((link as any).readyState===4 || (link as any).readyState==='complete'){
                res.resolve( link.sheet|| (link as any).styleSheet);
            }
        }else link.onload = function(){
            res.resolve( link.sheet|| (link as any).styleSheet);
        }
        link.onerror = function(e){
            res.reject({opts:opts,res:res,element:link,content:undefined,error:e||"cannot load css"});
        }
    }
    ResourceManager.loaders.html =function(src:Resource,opts:IResourceOpts){
        ajax({
            url:opts.url,
            method:"GET",
            type:"html"
        }).done((html)=>{
            
            src.resolve(html);
        }).fail((err)=>{
            src.reject({opts:opts,content:undefined,error:err});
        });
    }
    let resourceManager = ResourceManager.global;
    export interface IRequire{
        (deps:Array<string|IResourceOpts>|any,complete?:Function|any):Promise;
        define?:(id:string|{[index:string]:any},value?:any)=>IRequire;
        base?:string;
    }
    export let require:IRequire = function(_deps:Array<string|IResourceOpts>|any,_complete?:Function|any):Promise{
        let deps:any;
        let taskcount:number = 1;
        let complete:Function;
        let promise :Promise = new Promise();
        let params = [];
        let hasError:boolean = false;
        window["$exports"]=undefined;
        if(arguments.length<=2){
            if(_deps.push && _deps.pop && _deps.length!==undefined){
                deps = _deps;
                complete = _complete;    
            }else deps = arguments;
        }
        
        for(let i =0,j=deps.length;i<j;i++){
            let idOrOpts:any = deps[i];
            taskcount++;
            (function(index:number):void{
                resourceManager.fetch(idOrOpts).done((value:any):void=>{
                    if(hasError)return;
                    if(value.done && value.fail){
                        value.done(function(v:any){
                            params[i] = v;
                            if(--taskcount==0){
                                let result :any = (complete)?complete.apply(this,params):params;
                                promise.resolve(result);
                            }
                        }).fail(function(err){
                            if(!hasError){hasError=true; promise.reject(err);}
                        });
                    }else{
                        params[i] = value;
                        if(--taskcount==0){
                            let result :any = (complete)?complete.apply(this,params):params;
                            promise.resolve(result);
                        }
                    }
                    
                }).fail((err)=>{
                    if(!hasError){hasError=true; promise.reject(err);}
                });
            })(i);
        }
        if(--taskcount==0 && !hasError){
            let result :any = (complete)?complete.apply(this,params):params;
            promise.resolve(result);
        }
        return promise;
    }

    require.define = (id:string|{[index:string]:any},value?:any):IRequire=>{
        if(typeof id =="object"){
            for(let n in id) (require as any).define(n,(id as object)[n]);
            return require;
        }
        let opts : IResourceOpts = {id:id,content:value===undefined?Resource.None:value};
        let res:Resource = resourceManager.caches[id] = new Resource(opts);
        return require;
    }
    require.base =undefined;
    
}