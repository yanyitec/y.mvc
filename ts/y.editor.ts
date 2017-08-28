/// <reference path="y.util.ts" />
namespace Y{
    export interface IEditorCommand{
        execute:(editor:Editor,args:any,text:string,isHtml?:boolean)=>any;
        toolbar?:(editor:Editor,name:string)=>HTMLElement;
    }
    export class Editor{
        _win:Window;
        _doc:Document;
        _container:HTMLDivElement;
        _selection:any;
        constructor(element:HTMLTextAreaElement,opts:any){
            let content :string = element.value;
            let width = element.clientWidth;
            let height = element.clientHeight;
            let container:HTMLDivElement = this._container = document.createElement("div");
            container.appendChild(this._buildToolbar(opts.toolbars));
            let ifr:HTMLIFrameElement = document.createElement("iframe");
            container.appendChild(ifr);
            
            element.parentElement.insertBefore(container,element);
            
            element.style.display="none";
            //element.innerHTML = "<iframe style='width:"+width+"px;height:"+height+"px;'></iframe>";
            let doc:HTMLDocument = this._doc = ifr.contentDocument || ifr.contentWindow.document; // W3C || IE  方式获取iframe的文档对象 
            doc.open();
            doc.write("<html><head><meta http-equiv=\"content-type\" content=\"text/html;charset=utf-8\"></head><body>" + content + "</body></html>");
            doc.close();
            doc.designMode= "on";  
            this._win = ifr.contentWindow || (ifr as any).window;
            this._doc = doc = ifr.contentDocument || this._win.document;
            doc.body.contentEditable= "true"; 
            (doc.body  as any).contentEditable= true; 
            Y.attach(doc.body,"select",()=>{
                if (this._win.getSelection) {  
                    let sel:Selection = this._win.getSelection();  
                    this._selection  = {
                        startNode :sel.anchorNode,
                        startIndex:sel.anchorOffset,
                        endNode:sel.focusNode,
                        endIndex:sel.focusOffset
                    };
                } 
            });
            
        }
        exec(cmdname:string,args?:any):Editor{
            let cmd :IEditorCommand = Editor.commands[cmdname];
            this.replaceSelection(args, (editor:Editor,args:any,text:string,isHtml?:boolean):any=>{return cmd.execute(this,args,text,isHtml);});
            return this;
        }
        replaceSelection(args:any,replacer:(editor:Editor,args:any,text:string,isHtml?:boolean)=>any){
            //非IE浏览器  
            if (this._win.getSelection) {  
                
                let sel:Selection = this._win.getSelection();  
                if(this._selection){
                    let range:Range = (this._doc as any).createRange();
                    //这里应该调用compareBoundaryPoints来比较边界在文档中的顺序
                    range.setStart(this._selection.startNode,this._selection.startIndex);
                    range.setEnd(this._selection.endNode,this._selection.endIndex);
                    console.log(this._selection.startIndex,this._selection.endIndex);
                    sel.addRange(range);
                }
                let selText = sel.toString();
                console.log(selText);
                //alert(sel.rangeCount); //选区个数, 通常为 1 .  
                sel.deleteFromDocument(); //清除选择的内容  
                let r :Range= sel.getRangeAt(0); //即使已经执行了deleteFromDocument(), 这个函数仍然返回一个有效对象. 
                //var selFrag :DocumentFragment= r.cloneContents(); //克隆选择的内容  
                let node:Node = replacer(this,args,selText);
                r.insertNode(node); //把对象插入到选区, 这个操作不会替换选择的内容, 而是追加到选区的后面, 所以如果需要普通粘贴的替换效果, 之前执行deleteFromDocument()函数.  
            }  
            else if ((this._doc as any).selection && (this._doc as any).selection.createRange) {  
                //IE浏览器  
                let sel:any = (this._doc as any).selection.createRange(); //获得选区对象  
                let html = replacer(this,args,sel.text,true);  
                sel.pasteHTML(html); //粘贴到选区的html内容, 会替换选择的内容.  
            }  
        }
        _buildToolbar(toolbars:Array<string>){
            toolbars||(toolbars=Editor.defaultToolbars);
            let toolbar = document.createElement("div");
            
            let me = this;
            for(let i=0,j=toolbars.length;i<j;i++){
                let cmdname = toolbars[i];
                let cmd = commands[cmdname];
                if(cmd && cmd.toolbar) {
                    let bar = cmd.toolbar(this,cmdname);
                    bar.setAttribute("y-editor-command",cmdname);
                    bar["@y.editor.command"] = cmd;
                    bar.onclick = function(evt){
                        let cname = this.getAttribute("y-editor-command");
                        me.exec(cname,me["@y.editor.command"]);
                        return Y.cancelEvent(evt);
                    }
                    toolbar.appendChild(bar);
                }
            }
            return toolbar;
        }
        static commands:{[index:string]:IEditorCommand} ={};
        static defaultToolbars:Array<string> = ["strong"];
    }
    let commands : {[index:string]:IEditorCommand} = Editor.commands;
    commands.strong = {
        execute:(editor:Editor,args:any,text:string,isHtml?:boolean):any=>{
            if(isHtml)return "<strong>" + text + "</strong>";
            let node :Node = editor._doc.createElement("strong");
            (node as HTMLElement).innerText= text;
            return node;
        },
        toolbar:(editor:Editor,name:string):HTMLElement=>{
            let elem = document.createElement("div");
            elem.style.cssText="float:left;text-align:center;width:20px;height:20px;line-height:20px;font-weight:bold;border:1px solid black;background-color:#ddd;";
            elem.innerHTML="B";
            return elem;
        }
    }
}