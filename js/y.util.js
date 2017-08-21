var Y;
(function (Y) {
    /**
     * 骆驼命名转换
     * 把 padding-top变成paddingTop
     * @param {string} text - 要转变的字符串
     * @return {string} -转换后的字符串
     */
    function camelize(text) {
        // /\-(\w)/g 正则内的 (\w) 是一个捕获，捕获的内容对应后面 function 的 letter
        // 意思是将 匹配到的 -x 结构的 x 转换为大写的 X (x 这里代表任意字母)
        return text.replace(/\-(\w)/g, function (all, letter) { return letter.toUpperCase(); });
    }
    Y.camelize = camelize;
    Y.numberRegx = /([+\-]?)(\d{1,3}(?:,?\d{3})*)(.\d+)?/;
    var idSeed = 0;
    var idTime = "_";
    function genId() {
        if (++idSeed === 2100000000) {
            idSeed = 0;
            idTime = "_";
        }
        return idTime + idSeed.toString();
    }
    Y.genId = genId;
    /**
     * 去掉前后空格的正则对象
     */
    Y.trimRegx = /^\s+|\s+$/;
    /**
     * 去掉前后空格
     * 把 padding-top变成paddingTop
     * @param {string} text - 要去掉前后空格的字符串
     * @return {string} -转换后的字符串
     */
    function trim(text) { return text.replace(Y.trimRegx, ""); }
    Y.trim = trim;
    ///////////////////////////////////////////////////////////////
    /// DOM
    ////////////////////////////////////////////////////////////////
    var divContainer = document.createElement("div");
    var p_maps = {
        "TD": document.createElement("tr"),
        "TH": document.createElement("tr"),
        "TR": document.createElement("tbody"),
        "TBODY": document.createElement("table"),
        "LI": document.createElement("ul"),
        "OPTION": document.createElement("select"),
        "DT": document.createElement("dl")
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
    function cloneNode(toBeClone) {
        var p = p_maps[toBeClone.tagName] || divContainer;
        var html = toBeClone.outerHTML + "";
        p.innerHTML = html;
        var node = p.firstChild;
        p.removeChild(node);
        return node;
    }
    Y.cloneNode = cloneNode;
    if (divContainer.addEventListener) {
        Y.attach = function (element, evtname, handler) { return element.addEventListener(evtname, handler, false); };
        Y.detech = function (element, evtname, handler) { return element.removeEventListener(evtname, handler, false); };
    }
    else if (divContainer["attachEvent"]) {
        Y.attach = function (element, evtname, handler) { return element.attachEvent("on" + evtname, handler); };
        Y.detech = function (element, evtname, handler) { return element.detechEvent("on" + evtname, handler); };
    }
    function cancelEvent(evt) {
        evt || (evt = event);
        evt.cancelBubble = true;
        evt.returnValue = false;
        if (evt.preventDefault)
            evt.preventDefault();
        if (evt.stopPropagation)
            evt.stopPropagation();
        return false;
    }
    Y.cancelEvent = cancelEvent;
    function setStyle(elem, style, value) { elem.style[camelize(style)] = value; }
    Y.setStyle = setStyle;
    // 主流浏览器
    if (window.getComputedStyle) {
        Y.getStyle = function (elem, style) { return getComputedStyle(elem, null).getPropertyValue(style); };
    }
    else {
        function getIEOpacity(elem) {
            var filter = null;
            // 早期的 IE 中要设置透明度有两个方法：
            // 1、alpha(opacity=0)
            // 2、filter:progid:DXImageTransform.Microsoft.gradient( GradientType= 0 , startColorstr = ‘#ccccc’, endColorstr = ‘#ddddd’ );
            // 利用正则匹配
            filter = elem.style.filter.match(/progid:DXImageTransform.Microsoft.Alpha\(.?opacity=(.*).?\)/i) || elem.style.filter.match(/alpha\(opacity=(.*)\)/i);
            if (filter) {
                var value = parseFloat(filter);
                if (NaN !== value) {
                    // 转化为标准结果
                    return value ? value / 100 : 0;
                }
            }
            // 透明度的值默认返回 1
            return 1;
        }
        Y.getStyle = function (elem, style) {
            // IE 下获取透明度
            if (style == "opacity") {
                getIEOpacity(elem);
                // IE687 下获取浮动使用 styleFloat
            }
            else if (style == "float") {
                return elem.currentStyle.getAttribute("styleFloat");
                // 取高宽使用 getBoundingClientRect
            }
            else if ((style == "width" || style == "height") && (elem.currentStyle[style] == "auto")) {
                var clientRect = elem.getBoundingClientRect();
                return (style == "width" ? clientRect.right - clientRect.left : clientRect.bottom - clientRect.top) + "px";
            }
            // 其他样式，无需特殊处理
            return elem.currentStyle.getAttribute(camelize(style));
        };
    }
    Y.setOpacity = function (elem, val) {
        var value = parseFloat(val);
        elem.style.opacity = value.toString();
        elem.style.filter = "alpha(opacity=" + (value * 100) + ")";
        return elem;
    };
    Y.displayValues = {};
    function hasClass(element, css) {
        var cssStr = element.className;
        var begin = cssStr.indexOf(css);
        if (begin < 0)
            return false;
        var end = begin + css.length;
        if (begin == 0) {
            if (end == cssStr.length)
                return true;
            return /^\s$/.test(cssStr[begin + 1]);
        }
        if (!/^\s$/.test(cssStr[begin - 1]))
            return false;
        if (end == cssStr.length)
            return true;
        return /^\s$/.test(cssStr[end + 1]);
    }
    Y.hasClass = hasClass;
    function addClass(element, css) {
        if (hasClass(element, css))
            return false;
        var cssStr = element.className;
        if (cssStr === "")
            element.className = css;
        else if (/^\s$/.test(cssStr[cssStr.length - 1]))
            cssStr += css;
        else
            cssStr += ' ' + css;
        element.className = cssStr;
        return true;
    }
    Y.addClass = addClass;
    function removeClass(element, css) {
        var cssStr = element.className;
        var s = cssStr.split(/\s+/);
        var hasIt = false;
        for (var i = 0, j = s.length; i < j; i++) {
            var c = s.shift();
            if (c !== css)
                s.push(c);
            else
                hasIt = true;
        }
        if (hasIt)
            element.className = s.join(" ");
        return hasIt;
    }
    Y.removeClass = removeClass;
})(Y || (Y = {}));
