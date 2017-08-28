namespace Y{
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
    export let numberRegx:RegExp = /([+\-]?)(\d{1,3}(?:,?\d{3})*)(.\d+)?/;

    let idSeed:number = 0;
    let idTime:string = "_";
    
    export function genId():string{
        if(++idSeed===2100000000) {idSeed=0;idTime = "_";}
        return idTime +idSeed.toString();
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

    export function cancelEvent(evt:any){
        evt ||(evt=event);
        evt.cancelBubble = true;
        evt.returnValue = false;
        if(evt.preventDefault)evt.preventDefault();
        if(evt.stopPropagation)evt.stopPropagation();
        return false;
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
    export let displayValues:{[index:string]:string}={};
    
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

    export class Eventable{
        __y_eventable_defaults?:Array<Function>;
        __y_eventable_events?:{[index:string]:Array<Function>};
        constructor(){}
        subscribe(name:string|Function,handler?:Function):Eventable{
            let handlers:Array<Function>;
            if(typeof name==="string"){
                let events  = this.__y_eventable_events || (this.__y_eventable_events={"@.@":[]});
                handlers = events[name as string]||(events[name as string]=[]);
            }else{
                handlers = this.__y_eventable_defaults||(this.__y_eventable_defaults=[]);
                handler = name as Function;
            }
            handlers.push(handler);
            return this;
        }
        unsubscribe(name:string|Function,handler?:Function):Eventable{
            let handlers:Array<Function>;
            if(typeof name==="string"){
                let events  = this.__y_eventable_events;
                if(!events)return this;
                handlers = events[name as string];
            }else{
                handlers = this.__y_eventable_defaults;
            }
            if(!handlers|| handlers.length==0)return this;
            for(let i=0,j= handlers.length;i<j;i++){
                let h = handlers.shift();
                if(h!==handler) handlers.push(h);
            }
            return this;
        }
        notify(name:any,evtArgs?:any){
            let handlers:Array<Function>;
            if(evtArgs!==undefined){
                let events  = this.__y_eventable_events;
                if(!events)return this;
                handlers = events[name as string];
            }else{
                handlers = this.__y_eventable_defaults;
                evtArgs = name;
            }
            if(!handlers|| handlers.length==0)return this;
            for(let i=0,j= handlers.length;i<j;i++){
                let h = handlers.shift();
                if(h.call(this,evtArgs)!==false) handlers.push(h);
            }
            return this;
        }

    }

}