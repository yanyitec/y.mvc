/// <reference path="y.util.ts" />
/// <reference path="y.promise.ts" />
namespace Y{
    export function absolutePos(element:HTMLElement){
        let x:number =0;let y:number = 0;
        while(element){
            x += element.offsetLeft;y+=element.offsetTop;
            element = element.offsetParent as HTMLElement;
        }
        return {x:x,y:y};
    }
    let blockTimer = new Y.Timer(100);
    export interface BlockOpts{
        target:HTMLElement,
        css?:string;
        message?:string|HTMLElement;
        keepCenter?:boolean;
    }
    export class Block extends Y.Eventable{
        container:HTMLElement;
        _mask:HTMLElement;
        _message:HTMLElement;
        target:HTMLElement;
        _x:number;
        _y:number;
        _w:number;
        _h:number;
        actived:boolean;
        _keepCenterHandler:()=>boolean;

        constructor(target:HTMLElement){
            super();
            this.target = (target as any)==document?document.body:target;
            this.container = document.createElement("div");
            this.container.style.cssText="position:absolute;z-index:999997;";
            this.container.className="y-block";
            this.container.innerHTML="<div class='y-block-mask' style='position:absolute;left:0;height:0;width:100%;height:100%;z-index:999998;'></div><div class='y-block-message' style='position:absolute;z-index:999999'></div>";
            this._mask = this.container.firstChild as HTMLElement;
            this._message = this.container.lastChild as HTMLElement;
            this.actived = false;
           
        }
        open(opts:BlockOpts):Block{
            if(opts.target!== this.target) throw new Error("target is incorrect.");
            this._w= this._h = this._x = this._y = undefined;
            if(opts){
                if(opts.css){
                    this.container.className = "y-block " + opts.css;
                }
                if(opts.message){
                    if(typeof opts.message==="string") this._message.innerHTML=(opts.message as string);
                    else {
                        this._message.innerHTML="";
                        this._message.appendChild(opts.message as HTMLElement);
                    }
                }
                if(opts.keepCenter===true){
                    if(!this._keepCenterHandler)  {
                        this._keepCenterHandler = ()=> this._moveToCenter();
                        blockTimer.subscribe(this._keepCenterHandler);
                    }
                }else if(opts.keepCenter===false){
                    if(this._keepCenterHandler)  {
                        blockTimer.unsubscribe(this._keepCenterHandler);
                        this._keepCenterHandler = undefined;
                    }
                }
                
            }
            if(!this.actived){
                if(this.target===document.body){
                    document.body.appendChild(this.container);
                }else{
                    let p = this.target.parentNode;
                    p.appendChild(this.container);
                }
                
            }
            this._moveToCenter();
            this.actived = true;
            return this;
        }
        close(evtArgs?:any):Block{
            if(!this.actived) return this;
            this.container.parentNode.removeChild(this.container);
            if(this._keepCenterHandler) {
                blockTimer.unsubscribe(this._keepCenterHandler);
                this._keepCenterHandler = undefined;
            }
            this.actived = false;
            this.notify("onclose",evtArgs||{});
            return this;
        }

        _moveToCenter():boolean{
            let target:HTMLElement = this.target;
            let container :HTMLElement = this.container;
            let x = target.offsetLeft;
            let y = target.offsetTop;
            let w = target.clientWidth;
            let h = target.clientHeight;
            if(target===document.body){
                w = Math.max(w , document.documentElement.clientWidth);
                h = Math.max(h, document.documentElement.clientHeight);
                x += document.body.scrollLeft;
                y += document.body.scrollTop;
            }
            if(this._x!==x )container.style.left = (this._x = x) + "px";
            if(this._y!==y )container.style.top = (this._y = y) + "px";
            if(this._w!==w )container.style.width = (this._w = w) + "px";
            if(this._h!==h )container.style.height = (this._h = h) + "px";
            return true;
        }


    }
    export function block(opts:BlockOpts):Block{
        let target :HTMLElement = opts.target;
        let blocker:Block = (target as any).__y_ui_blocker;
        if(!blocker) blocker = (target as any).__y_ui_blocker= new Block(target);
        blocker.open(opts);
        return blocker;
        //if()
    }
    export function unblock(target:HTMLElement,evtArgs?:any){
        let blocker:Block = (target as any).__y_ui_blocker;
        if(blocker) blocker.close(evtArgs);
    }

    let dragableMasker = document.createElement("div");
    dragableMasker.style.cssText = "position:absolute;left:0;top:0;opacity:0.01;filter:alpha(opacity=1);background-color:#fff;z-index:9999999;";
    let currentDragable :Dragable;
    dragableMasker.onmousemove = function(evt:any){
        evt || (evt=event);
        let dg = currentDragable;
        let mx = evt.offsetX || evt.layerX;
        let my = evt.offsetY || evt.layerY;
        let offsetX = mx - dg._mx0;
        let offsetY = my - dg._my0;
        let target = dg.target;
        target.style.left  = dg._x0 + offsetX + "px";
        target.style.top = dg._y0 + offsetY + "px";
    }
    dragableMasker.onmouseout = dragableMasker.onmouseup = function(evt:any){
        evt || (evt=event);
        let dg = currentDragable;
        let mx = evt.offsetX || evt.layerX;
        let my = evt.offsetY || evt.layerY;
        let offsetX = mx - dg._mx0;
        let offsetY = my - dg._my0;
        let target = dg.target;
        target.style.left  = dg._x0 + offsetX + "px";
        target.style.top = dg._y0 + offsetY + "px";
        currentDragable = undefined;
        dragableMasker.parentNode.removeChild(dragableMasker);

    }

    export class Dragable extends Eventable{
        triggerElement:HTMLElement;
        target:HTMLElement;
        _positionValue:string;
        _x0:number;
        _y0:number;
        _mx0:number;
        _my0:number;
        constructor(triggerElement:HTMLElement,target:HTMLElement){
            super();
            this.triggerElement = triggerElement;
            this.target = target;
        }
        enable(){
            let self = this;
            Y.attach(this.triggerElement,"mousedown",function(evt){
                let target = self.target;
                let posValue = self._positionValue = Y.getStyle(target,"position");
                target.style.position = posValue==='static'?"relative":"absolute";
                self._x0 = target.offsetLeft;
                self._y0 = target.offsetTop;
                var pos = absolutePos(self.target);
                self._mx0 = pos.x;self._my0 = pos.y;
                dragableMasker.style.width = Math.max(document.body.scrollWidth,document.documentElement.scrollWidth) + "px";
                dragableMasker.style.height = Math.max(document.body.scrollHeight,document.documentElement.scrollHeight) + "px";
                document.body.appendChild(dragableMasker);
                currentDragable = self;
                return Y.cancelEvent(evt);
            });
        }

    }
    export interface MessageBoxOpts {
        caption?:string;
        content:HTMLElement|string;
        css?:string;
        keepCenter?:boolean;
        dragable?:boolean;
        buttons?:{[index:string]:string}
    }
    export class MessageBox {
        wrapper:HTMLElement;
        head:HTMLElement;
        body:HTMLElement;
        foot:HTMLElement;
        captionElement:HTMLElement;
        closeElement:HTMLElement;
        buttonsElement:HTMLElement;
        currentInstance:Promise;
        currentOpts : MessageBoxOpts;
        constructor(){
            Block.call(this,document.body);
            let wrapper = this.wrapper = document.createElement("div");
            wrapper.className = "y-messagebox";
            wrapper.innerHTML = "<div class='y-messagebox-head'><div class='y-caption y-messagebox-caption'></div><div class='y-messagebox-closeIcon'>X</div></div><div class='y-messagebox-body'></div><div class='y-messagebox-foot'></div>";
            this.head = wrapper.firstChild as HTMLElement;
            this.foot = wrapper.lastChild  as HTMLElement;
            this.body = wrapper.childNodes[1] as HTMLElement;
            this.captionElement = this.head.firstChild as HTMLElement;
            this.closeElement = this.head.lastChild as HTMLElement;
            this.buttonsElement = this.foot;
            let me = this;
            this.closeElement.onclick = function(){
                me.close("close");
            }
        }
        open(opts:MessageBoxOpts):MessageBox{
            if(opts.caption) this.captionElement.innerHTML = opts.caption;
            if(typeof opts.content==="string"){
                this.body.innerHTML = opts.content;
            }else {
                this.body.innerHTML = "";
                this.body.appendChild(opts.content);
            }
            this.currentOpts = opts;
            let btns = opts.buttons;
            this.buttonsElement.innerHTML="";
            for(var n in btns){
                let btn = this._buildButton(n,btns[n]);
                this.buttonsElement.appendChild(btn);
            }
            //this.currentInstance = opts
            let blockOpts :BlockOpts ={
                keepCenter : opts.keepCenter,
                target:document.body,
                message : this.wrapper,
                css:opts.css
            };
            Block.prototype.open.call(this,blockOpts);
            return this;
        }
        close(type:string,evtArg?:any):MessageBox{
            evtArg ||(evtArg={});evtArg.type = type;
            let instance = this.currentInstance;
            this.currentInstance = undefined;
            this.currentOpts = undefined;
            Block.prototype.close.call(this,evtArg);
            instance.resolve(evtArg);
            return this;
        }
        _buildButton(name,value):HTMLElement{
            let btn = document.createElement("a");
            let me = this;
            btn.className="y-btn y-messagebox-btn";
            btn.innerHTML = value||name;
            btn.onclick = function(){
                me.close(name);
            }
            return btn;
        }
    }
    MessageBox.apply(MessageBox);

    export function messageBox(opts:MessageBoxOpts):Y.Promise{
        let promise = new Y.Promise();
        ((MessageBox as any) as MessageBox).currentInstance = promise;
        ((MessageBox as any) as MessageBox).open(opts);
        return promise;
    }

}