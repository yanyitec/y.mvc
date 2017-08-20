/// <reference path="y.promise.ts" />
/// <reference path="y.ajax.ts" />
/// <reference path="y.require.ts" />
namespace Y{



    let readyHandlers = [];
    Y.attach((window as any) as HTMLElement,"load",()=>{
        let handlers = readyHandlers;readyHandlers=undefined;
        for(let i =0,j=readyHandlers.length;i<j;i++){
            readyHandlers[i]();
        }
    });
    export function ready(handler:()=>void){
        if(readyHandlers) readyHandlers.push(handler);
        else handler();
    }
        

    
    
    export class Module extends Resource{
        deps:Array<Resource>;
        controllerType:Function;
        constructor(opts:IResourceOpts){super(opts);}
    }
    ResourceManager.types.module = Module;
    ResourceManager.loaders.module = (module:Resource,opts:IResourceOpts)=>{
        ajax({
            url:opts.url,
            method:"GET",
            type:"html"
        }).done((html)=>{
            let element = document.createElement("div");
            
            parseModuleHtml(html,module as Module);

            module.resolve(module);
        }).fail((err)=>{
            module.reject({content:undefined,error:err});
        });
    }
    function parseModuleHtml(html:string,module:Module){
        let rs :any = {};
        let container = rs.container = document.createElement("div");
        container.innerHTML = html;
        parseModuleElement(container,rs);
        let taskcount = 1;
        if(rs.stylesheets){
            for(let i =0,j=rs.stylesheets.length;i<j;i++){
                let elem:HTMLLinkElement = rs.stylesheets[i] as HTMLLinkElement;
                let url = elem.href;
                
                taskcount++;
                ResourceManager.global.fetch({id:elem.id,url:url,type:"css"}).done(function(res){
                    module.deps[this.id] =this;
                    if(--taskcount==0) module.resolve(module);
                })
            }
        }
        if(rs.scripts){
            for(let i =0,j=rs.scripts.length;i<j;i++){
                let elem:HTMLScriptElement = rs.scripts[i] as HTMLScriptElement;
                let url = elem.src;
                
                let id = elem.id || url;
                taskcount++;
                ResourceManager.global.fetch({id:id,url:url,type:"js"}).done(function(res){
                    module.deps[this.id] = this;
                    if(((this as Resource).element as HTMLElement).getAttribute("y-controller")){
                        module.controllerType = (this as Resource).resolved_value();
                        if(typeof module.controllerType !="function") throw new Error(this.url +" was set as controller, but it do not exports any class(Function).");
                    }
                    if(--taskcount==0) module.resolve(module);
                });
            }
        }
    }
    function parseModuleElement(element:HTMLElement,rs:any){
        if(element.tagName==="SCRIPT" && (element as HTMLScriptElement).type==="text/javascript"){ 
            (rs.scripts || (rs.scripts=[])).push({element:element});
            element.parentNode.removeChild(element);
            return false;
        }
        if(element.tagName==="LINK" && (element as HTMLLinkElement).type==="text/css" && (element as HTMLLinkElement).href){ 
            (rs.stylesheets || (rs.stylesheets=[])).push({element:element});
            element.parentNode.removeChild(element);
            return false;
        }
        if(!element.hasChildNodes)return ;
        let at :number =0;
        for(let i =0,j=element.childNodes.length;i<j;i++){
            if(parseModuleElement(element.childNodes[at] as HTMLElement,rs)!==false)at++;
        }
    }
    
}//end namespace