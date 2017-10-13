namespace Y{
    export interface ColumnOpts{
        width?:number;
        name:string;
        text?:string;
        frozen?:boolean;
        resizeable?:boolean;
        cell?:(data:Object)=>string|HTMLElement;
    }
    export interface GridOpts{
        columns:{[index:string]:ColumnOpts};
        width:number|string;
        data:any;
    }
    export class Column{
        private _width:number;
        name:string;
        private _text:string;
        protected _frozen:boolean;
        private _resizeable:boolean;
        private _cell:(data:Object)=>string|HTMLElement;
        th:HTMLTableHeaderCellElement;
        private _lit:HTMLDivElement;
        private _resizer:HTMLDivElement;
        gridInstance:Grid;
        constructor(name:string,opts:ColumnOpts,grid:Grid){
            this.gridInstance= grid;
            this._width = opts.width;
            this._resizeable = opts.resizeable;
            this._cell = opts.cell;
            this.name = opts.name || name;
            this._text = opts.text || this.name;
            this._frozen = opts.frozen;
            let th:HTMLTableHeaderCellElement = this.th = document.createElement("th");
            th.innerHTML = "<div class='grid-view-cell' style='position:relative;overflow:hidden;"+(this._width?"width:" + this._width + "px":"")+"'><div class='caption'>"+(this._text)+"</div><div class='grid-column-resizer'></div></div>";
            this._lit = th.firstChild as HTMLDivElement;this._resizer = th.lastChild as HTMLDivElement;
        }
        frozen(value?:boolean){
            if(value===undefined)return this._frozen;
            throw "Not implement";
        }
        width(value?:boolean){
            if(value===undefined)return this._width;
            throw "Not implement";
        }
        createCell(rowData:object){
            let cell : HTMLTableCellElement = document.createElement("td");
            var val = rowData[this.name];
            cell.innerHTML = "<div style='width:"+this._width+"px;overflow:hidden;' class='grid-view-cell'>"+(val===undefined||val===null?"":val.toString())+"</div>";
            return cell;
        }
    }
    export class Grid{
        element:HTMLElement;
        frozenWidth:number;
        _viewArea:HTMLDivElement;
        _width:number|string;
        opts:GridOpts;
        _columns:{[index:string]:Column};
        _measureArea:HTMLDivElement;
        _frozenArea:HTMLDivElement;
        _frozenHeadRow :HTMLTableRowElement;
        _frozenTBody :HTMLTableSectionElement;
        _scrollableArea:HTMLDivElement;
        _scrollableHeaderArea:HTMLDivElement;
        _scrollableHeadRow :HTMLTableRowElement;
        _scrollableBodyArea:HTMLDivElement;
        _scrollableTBody :HTMLTableSectionElement;
        _rowDatas : Array<object>;
        constructor(element:HTMLElement,opts:GridOpts){
            this.element = element;
            this.opts = opts;
            this._columns = {};
            let colOpts = opts.columns;
            for(var n in colOpts){
                let colOpt = colOpts[n];
                let col = new Column(n,colOpt,this);
                this._columns[col.name] = col;
                if(col.frozen()) this.frozenWidth = -1;
            }
            this._rowDatas = opts.data;
            this._width = opts.width || "auto";
            this.refreshView();
        }

        refreshView(){
            let viewArea = this._viewArea = document.createElement("div");
            this._viewArea.className="grid-view";
            let viewHTML = "<div class='grid-view-frozen'>";
            viewHTML += "<div class='grid-view-frozen-head head'><table><thead><tr></tr></thead></table></div>";
            viewHTML += "<div class='grid-view-frozen-body body'><table><tbody></tbody></table></div>";
            viewHTML += "</div>";
            viewHTML += "<div class='grid-view-scrollable' style='overflow:hidden;'>";
            viewHTML += "<div class='grid-view-scrollable-head head' style='overflow:hidden;'><table><thead><tr></tr></thead></table></div>";
            viewHTML +="<div  class='grid-view-scrollable-body body' style='overflow:auto;'><table><tbody></tbody></table></div>";
            viewHTML += "</div>";
            this._viewArea.innerHTML = viewHTML;
            this._frozenArea = viewArea.firstChild as HTMLDivElement;
            this._frozenHeadRow = this._frozenArea.firstChild.firstChild.firstChild.firstChild as HTMLTableRowElement;
            this._frozenTBody = this._frozenArea.lastChild.firstChild.firstChild as HTMLTableSectionElement;

            this._scrollableArea = viewArea.lastChild as HTMLDivElement;
            this._scrollableHeaderArea = this._scrollableArea.firstChild as HTMLDivElement;
            this._scrollableHeadRow = this._scrollableHeaderArea.firstChild.firstChild as HTMLTableRowElement;
            this._scrollableBodyArea = this._scrollableArea.lastChild as HTMLDivElement;
            this._scrollableTBody = this._scrollableBodyArea.firstChild.firstChild as HTMLTableSectionElement;
            let me:Grid = this;
            this._scrollableBodyArea.onscroll = ()=>{
                (this._frozenArea.lastChild as HTMLElement).scrollTop =
                (this._scrollableArea.firstChild as HTMLElement).scrollTop = this._scrollableBodyArea.scrollTop;
                (this._scrollableArea.firstChild as HTMLElement).scrollLeft =
                (this._scrollableArea.lastChild as HTMLElement).scrollLeft = this._scrollableBodyArea.scrollLeft;
            };
            let cols = this._columns;
            let frozenCount : number = 0;
            let needMeasureWidthCols:Array<Column> = [];
            for(var n in cols){
                let col:Column = cols[n];
                if(col.frozen()) {this._frozenHeadRow.appendChild(col.th); frozenCount++;}
                else this._scrollableHeadRow.appendChild(col.th);
                if(col.width()===undefined){
                    needMeasureWidthCols.push(col);
                }
            }
            if(frozenCount==0){
                this._frozenArea.style.display="none";
            }
            if(needMeasureWidthCols.length>0 || this.frozenWidth===-1){
                this._measureColumnsWidth(needMeasureWidthCols);
            }
            this.width(this._width);
            let rowDatas :Array<object> = this._rowDatas;
            for(let i=0,j=rowDatas.length;i<j;i++){
                let rowData:Object = rowDatas[i];
                let frozenTr :HTMLTableRowElement;
                let scrollableTr : HTMLTableRowElement ;
                let tr :HTMLTableRowElement;
                for(var n in cols){
                    let col:Column = cols[n];
                    if(col.frozen()) {
                        if(!frozenTr)frozenTr = document.createElement("tr");
                        tr = frozenTr;
                    }
                    else {
                        if(!scrollableTr)scrollableTr = document.createElement("tr");
                        tr = scrollableTr;
                    }
                    tr.appendChild(col.createCell(rowData));
                }
                if(frozenTr) this._frozenTBody.appendChild(frozenTr);
                if(scrollableTr) this._scrollableTBody.appendChild(scrollableTr);
            }
            this.element.innerHTML = "";
            this.element.appendChild(this._viewArea);
            
        }
        private _useMeasureArea(state:(area:HTMLDivElement)=>void,elem?:HTMLElement){
            let area:HTMLDivElement = this._measureArea;
            if(!area){
                area = this._measureArea = document.createElement("div");
                area.style.cssText="position:absolute;z-index:-99999999;border:0;padding:0;margin:0;";
            }else area.innerHTML="";
            if(elem) area.appendChild(elem);
            document.body.appendChild(area);
            state(area);
            document.body.removeChild(area);
        }
        private _measureColumnsWidth(cols:Array<Column>){
            this._useMeasureArea((measureArea:HTMLDivElement):void=>{                
                for(let i =0,j=cols.length;i<j;i++){
                    let col:any = cols[i];
                    col._width = col.th.firstChild.clientWidth;
                    col.th.firstChild.style.width = col._width + "px";
                }
                this.frozenWidth = this._frozenArea.clientWidth;
            },this._viewArea);
            
            
        }
        hasFrozen():boolean{return this.frozenWidth>0;}

        width(value?:number|string):any{
            if(value===undefined){
                if(this._width===undefined || this._width==="auto") return this.element.clientWidth;
                return this._width;
            }
            let w:number;
            if(value==="auto"){
                this._width = "auto";
                w = this.element.clientWidth;
            }else this._width = w = parseInt(value.toString());
            let sw :number = this.frozenWidth?this.frozenWidth-1:0;
            sw = this.width() - sw;
            (this._scrollableBodyArea as HTMLElement).style.width = (this._scrollableArea.firstChild as HTMLElement).style.width = sw + "px";
            return this;
        }
        
    }

}