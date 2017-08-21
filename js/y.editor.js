/// <reference path="y.util.ts" />
var Y;
(function (Y) {
    var Editor = (function () {
        function Editor(element, opts) {
            var _this = this;
            var content = element.value;
            var width = element.clientWidth;
            var height = element.clientHeight;
            var container = this._container = document.createElement("div");
            container.appendChild(this._buildToolbar(opts.toolbars));
            var ifr = document.createElement("iframe");
            container.appendChild(ifr);
            element.parentElement.insertBefore(container, element);
            element.style.display = "none";
            //element.innerHTML = "<iframe style='width:"+width+"px;height:"+height+"px;'></iframe>";
            var doc = this._doc = ifr.contentDocument || ifr.contentWindow.document; // W3C || IE  方式获取iframe的文档对象 
            doc.open();
            doc.write("<html><head><meta http-equiv=\"content-type\" content=\"text/html;charset=utf-8\"></head><body>" + content + "</body></html>");
            doc.close();
            doc.designMode = "on";
            this._win = ifr.contentWindow || ifr.window;
            this._doc = doc = ifr.contentDocument || this._win.document;
            doc.body.contentEditable = "true";
            doc.body.contentEditable = true;
            Y.attach(doc.body, "select", function () {
                if (_this._win.getSelection) {
                    var sel = _this._win.getSelection();
                    _this._selection = {
                        startNode: sel.anchorNode,
                        startIndex: sel.anchorOffset,
                        endNode: sel.focusNode,
                        endIndex: sel.focusOffset
                    };
                }
            });
        }
        Editor.prototype.exec = function (cmdname, args) {
            var _this = this;
            var cmd = Editor.commands[cmdname];
            this.replaceSelection(args, function (editor, args, text, isHtml) { return cmd.execute(_this, args, text, isHtml); });
            return this;
        };
        Editor.prototype.replaceSelection = function (args, replacer) {
            //非IE浏览器  
            if (this._win.getSelection) {
                var sel = this._win.getSelection();
                if (this._selection) {
                    var range = this._doc.createRange();
                    range.setStart(this._selection.startNode, this._selection.startIndex);
                    range.setEnd(this._selection.endNode, this._selection.endIndex);
                    console.log(this._selection.startIndex, this._selection.endIndex);
                    sel.addRange(range);
                }
                var selText = sel.toString();
                console.log(selText);
                //alert(sel.rangeCount); //选区个数, 通常为 1 .  
                sel.deleteFromDocument(); //清除选择的内容  
                var r = sel.getRangeAt(0); //即使已经执行了deleteFromDocument(), 这个函数仍然返回一个有效对象. 
                //var selFrag :DocumentFragment= r.cloneContents(); //克隆选择的内容  
                var node = replacer(this, args, selText);
                r.insertNode(node); //把对象插入到选区, 这个操作不会替换选择的内容, 而是追加到选区的后面, 所以如果需要普通粘贴的替换效果, 之前执行deleteFromDocument()函数.  
            }
            else if (this._doc.selection && this._doc.selection.createRange) {
                //IE浏览器  
                var sel = this._doc.selection.createRange(); //获得选区对象  
                var html = replacer(this, args, sel.text, true);
                sel.pasteHTML(html); //粘贴到选区的html内容, 会替换选择的内容.  
            }
        };
        Editor.prototype._buildToolbar = function (toolbars) {
            toolbars || (toolbars = Editor.defaultToolbars);
            var toolbar = document.createElement("div");
            var me = this;
            for (var i = 0, j = toolbars.length; i < j; i++) {
                var cmdname = toolbars[i];
                var cmd = commands[cmdname];
                if (cmd && cmd.toolbar) {
                    var bar = cmd.toolbar(this, cmdname);
                    bar.setAttribute("y-editor-command", cmdname);
                    bar["@y.editor.command"] = cmd;
                    bar.onclick = function (evt) {
                        var cname = this.getAttribute("y-editor-command");
                        me.exec(cname, me["@y.editor.command"]);
                        return Y.cancelEvent(evt);
                    };
                    toolbar.appendChild(bar);
                }
            }
            return toolbar;
        };
        Editor.commands = {};
        Editor.defaultToolbars = ["strong"];
        return Editor;
    }());
    Y.Editor = Editor;
    var commands = Editor.commands;
    commands.strong = {
        execute: function (editor, args, text, isHtml) {
            if (isHtml)
                return "<strong>" + text + "</strong>";
            var node = editor._doc.createElement("strong");
            node.innerText = text;
            return node;
        },
        toolbar: function (editor, name) {
            var elem = document.createElement("div");
            elem.style.cssText = "float:left;text-align:center;width:20px;height:20px;line-height:20px;font-weight:bold;border:1px solid black;background-color:#ddd;";
            elem.innerHTML = "B";
            return elem;
        }
    };
})(Y || (Y = {}));
