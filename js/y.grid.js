var Y;
(function (Y) {
    var Column = (function () {
        function Column(name, opts, grid) {
            this.gridInstance = grid;
            this._width = opts.width;
            this._resizeable = opts.resizeable;
            this._cell = opts.cell;
            this.name = opts.name || name;
            this._text = opts.text || this.name;
            this._frozen = opts.frozen;
            var th = this.th = document.createElement("th");
            th.innerHTML = "<div class='grid-view-cell' style='position:relative;overflow:hidden;" + (this._width ? "width:" + this._width + "px" : "") + "'><div class='caption'>" + (this._text) + "</div><div class='grid-column-resizer'></div></div>";
            this._lit = th.firstChild;
            this._resizer = th.lastChild;
        }
        Column.prototype.frozen = function (value) {
            if (value === undefined)
                return this._frozen;
            throw "Not implement";
        };
        Column.prototype.width = function (value) {
            if (value === undefined)
                return this._width;
            throw "Not implement";
        };
        Column.prototype.createCell = function (rowData) {
            var cell = document.createElement("td");
            var val = rowData[this.name];
            cell.innerHTML = "<div style='width:" + this._width + "px;overflow:hidden;' class='grid-view-cell'>" + (val === undefined || val === null ? "" : val.toString()) + "</div>";
            return cell;
        };
        return Column;
    }());
    Y.Column = Column;
    var Grid = (function () {
        function Grid(element, opts) {
            this.element = element;
            this.opts = opts;
            this._columns = {};
            var colOpts = opts.columns;
            for (var n in colOpts) {
                var colOpt = colOpts[n];
                var col = new Column(n, colOpt, this);
                this._columns[col.name] = col;
                if (col.frozen())
                    this.frozenWidth = -1;
            }
            this._rowDatas = opts.data;
            this._width = opts.width || "auto";
            this.refreshView();
        }
        Grid.prototype.refreshView = function () {
            var _this = this;
            var viewArea = this._viewArea = document.createElement("div");
            this._viewArea.className = "grid-view";
            var viewHTML = "<div class='grid-view-frozen'>";
            viewHTML += "<div class='grid-view-frozen-head head'><table><thead><tr></tr></thead></table></div>";
            viewHTML += "<div class='grid-view-frozen-body body'><table><tbody></tbody></table></div>";
            viewHTML += "</div>";
            viewHTML += "<div class='grid-view-scrollable' style='overflow:hidden;'>";
            viewHTML += "<div class='grid-view-scrollable-head head' style='overflow:hidden;'><table><thead><tr></tr></thead></table></div>";
            viewHTML += "<div  class='grid-view-scrollable-body body' style='overflow:auto;'><table><tbody></tbody></table></div>";
            viewHTML += "</div>";
            this._viewArea.innerHTML = viewHTML;
            this._frozenArea = viewArea.firstChild;
            this._frozenHeadRow = this._frozenArea.firstChild.firstChild.firstChild.firstChild;
            this._frozenTBody = this._frozenArea.lastChild.firstChild.firstChild;
            this._scrollableArea = viewArea.lastChild;
            this._scrollableHeaderArea = this._scrollableArea.firstChild;
            this._scrollableHeadRow = this._scrollableHeaderArea.firstChild.firstChild;
            this._scrollableBodyArea = this._scrollableArea.lastChild;
            this._scrollableTBody = this._scrollableBodyArea.firstChild.firstChild;
            var me = this;
            this._scrollableBodyArea.onscroll = function () {
                _this._frozenArea.lastChild.scrollTop =
                    _this._scrollableArea.firstChild.scrollTop = _this._scrollableBodyArea.scrollTop;
                _this._scrollableArea.firstChild.scrollLeft =
                    _this._scrollableArea.lastChild.scrollLeft = _this._scrollableBodyArea.scrollLeft;
            };
            var cols = this._columns;
            var frozenCount = 0;
            var needMeasureWidthCols = [];
            for (var n in cols) {
                var col = cols[n];
                if (col.frozen()) {
                    this._frozenHeadRow.appendChild(col.th);
                    frozenCount++;
                }
                else
                    this._scrollableHeadRow.appendChild(col.th);
                if (col.width() === undefined) {
                    needMeasureWidthCols.push(col);
                }
            }
            if (frozenCount == 0) {
                this._frozenArea.style.display = "none";
            }
            if (needMeasureWidthCols.length > 0 || this.frozenWidth === -1) {
                this._measureColumnsWidth(needMeasureWidthCols);
            }
            this.width(this._width);
            var rowDatas = this._rowDatas;
            for (var i = 0, j = rowDatas.length; i < j; i++) {
                var rowData = rowDatas[i];
                var frozenTr = void 0;
                var scrollableTr = void 0;
                var tr = void 0;
                for (var n in cols) {
                    var col = cols[n];
                    if (col.frozen()) {
                        if (!frozenTr)
                            frozenTr = document.createElement("tr");
                        tr = frozenTr;
                    }
                    else {
                        if (!scrollableTr)
                            scrollableTr = document.createElement("tr");
                        tr = scrollableTr;
                    }
                    tr.appendChild(col.createCell(rowData));
                }
                if (frozenTr)
                    this._frozenTBody.appendChild(frozenTr);
                if (scrollableTr)
                    this._scrollableTBody.appendChild(scrollableTr);
            }
            this.element.innerHTML = "";
            this.element.appendChild(this._viewArea);
        };
        Grid.prototype._useMeasureArea = function (state, elem) {
            var area = this._measureArea;
            if (!area) {
                area = this._measureArea = document.createElement("div");
                area.style.cssText = "position:absolute;z-index:-99999999;border:0;padding:0;margin:0;";
            }
            else
                area.innerHTML = "";
            if (elem)
                area.appendChild(elem);
            document.body.appendChild(area);
            state(area);
            document.body.removeChild(area);
        };
        Grid.prototype._measureColumnsWidth = function (cols) {
            var _this = this;
            this._useMeasureArea(function (measureArea) {
                for (var i = 0, j = cols.length; i < j; i++) {
                    var col = cols[i];
                    col._width = col.th.firstChild.clientWidth;
                    col.th.firstChild.style.width = col._width + "px";
                }
                _this.frozenWidth = _this._frozenArea.clientWidth;
            }, this._viewArea);
        };
        Grid.prototype.hasFrozen = function () { return this.frozenWidth > 0; };
        Grid.prototype.width = function (value) {
            if (value === undefined) {
                if (this._width === undefined || this._width === "auto")
                    return this.element.clientWidth;
                return this._width;
            }
            var w;
            if (value === "auto") {
                this._width = "auto";
                w = this.element.clientWidth;
            }
            else
                this._width = w = parseInt(value.toString());
            var sw = this.frozenWidth ? this.frozenWidth - 1 : 0;
            sw = this.width() - sw;
            this._scrollableBodyArea.style.width = this._scrollableArea.firstChild.style.width = sw + "px";
            return this;
        };
        return Grid;
    }());
    Y.Grid = Grid;
})(Y || (Y = {}));
