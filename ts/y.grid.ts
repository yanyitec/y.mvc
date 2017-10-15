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
        lng:{[index:string]:string}|Function;
    }
    export class GridColumn{
        private _width:number;
        
        private _text:string;
        private _frozen:boolean;
        private _resizeable:boolean;
        private _cell:(data:Object)=>string|HTMLElement;
        
        private _lit:HTMLDivElement;
        private _resizer:HTMLDivElement;
        name:string;
        grid:Grid;
        th:HTMLTableHeaderCellElement;
        element:HTMLTableHeaderCellElement;
        cells: Array<GridCell>;
        constructor(name:string,opts:ColumnOpts,grid:Grid){
            this.grid= grid;
            this._width = opts.width;
            this._resizeable = opts.resizeable;
            this._cell = opts.cell;
            this.name = opts.name || name;
            this._text = opts.text || grid.label(this.name);
            this._frozen = opts.frozen;
            let th:HTMLTableHeaderCellElement = this.element = this.th = document.createElement("th");
            th.innerHTML = "<div class='grid-view-cell' style='position:relative;overflow:hidden;"+(this._width?"width:" + this._width + "px":"")+"'><div class='caption'>"+(this._text)+"</div><div class='grid-column-resizer'></div></div>";
            this._lit = th.firstChild as HTMLDivElement;this._resizer = th.lastChild as HTMLDivElement;
            this.cells = [];
        }
        frozen(value?:boolean){
            if(value===undefined)return this._frozen;
            if(this._frozen!=value){
                this._frozen = value;
                this.grid.refreshView();
            }
            return this;
        }
        width(value?:number){
            if(value===undefined)return this._width;
            if(this._width!=value){
                this._width = value;
                this.grid.refreshView();
            }
            return this;
        }
        createCellElement(row:GridRow):HTMLTableCellElement{
            let elem : HTMLTableCellElement = document.createElement("td");
            var val = row.data[this.name];
            elem.innerHTML = "<div style='"+(this._width?"width:"+this._width + "px":"")+";overflow:hidden;' class='grid-view-cell'>"+(val===undefined||val===null?"":val.toString())+"</div>";
            return elem;
        }
    }
    export class GridCell{
        column:GridColumn;
        row:GridRow;
        element:HTMLTableCellElement;
        td:HTMLTableCellElement;
        constructor(col:GridColumn,row:GridRow){
            this.column = col;
            this.row = row;
            this.element = this.td = col.createCellElement(row);
        }
    }
    export class GridRow{
        grid:Grid;
        index:number;
        data:object;
        cells:{[index:string]:GridCell};
        constructor(grid:Grid,index:number,data:object){
            this.grid = grid;
            this.index = index;
            this.data = data;
            let cols :{[index:string]:GridColumn}= grid.columns;
            let frozenTr :HTMLTableRowElement;
            let scrollableTr : HTMLTableRowElement ;
            let cells :{[index:string]:GridCell} = this.cells={};
            for(var n in cols){
                let col:GridColumn = cols[n];
                let cell = new GridCell(col,this);
                col.cells[index] = cells[col.name] = cell;
                
                if(col.frozen()){
                    if(!frozenTr) frozenTr = document.createElement("tr");
                    frozenTr.appendChild(cell.element);
                }else {
                    if(!scrollableTr) scrollableTr = document.createElement("tr");
                    scrollableTr.appendChild(cell.element);
                }
            }
            if(frozenTr) (this.grid as any)._frozenTBody.appendChild(frozenTr);
            if(scrollableTr) (this.grid as any)._scrollableTBody.appendChild(scrollableTr);

        }
        
        

    }
    export class Grid{
        element:HTMLElement;
        frozenWidth:number;
        _viewArea:HTMLDivElement;
        _width:number|string;
        opts:GridOpts;
        columns:{[index:string]:GridColumn};
        rows:Array<GridRow>;
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
        
        public label:(key:string)=>string;
        static lng:{[index:string]:string}={};
        constructor(element:HTMLElement,opts:GridOpts){
            this.element = element;
            this.opts = opts;
            let lng = opts.lng;
            if(opts.lng){
                if(typeof(opts.lng)==='function') this.label = opts.lng as (key:string)=>string;
                else this.label = (key:string):string=>lng[key]|| Grid.lng[key]|| key;
            }else{
                this.label =(key:string):string=>Grid.lng[key]||key; 
            }
            this.columns = {};
            let colOpts = opts.columns;
            let i:number = 0;
            for(var n in colOpts){
                let colOpt = colOpts[n];
                let col = new GridColumn(n,colOpt,this);
                this.columns[col.name] = col;
                if(col.frozen()) this.frozenWidth = -1;
               
            }
            this._rowDatas = opts.data;
            this._width = opts.width || "auto";
            this.refreshView();
        }

        refreshView(){
            this.rows = [];
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
            viewHTML += "<div class='grid-view-pagination'>";
            viewHTML += "";
            viewHTML += "</div>";
            this._viewArea.innerHTML = viewHTML;
            this._frozenArea = viewArea.firstChild as HTMLDivElement;
            this._frozenHeadRow = this._frozenArea.firstChild.firstChild.firstChild.firstChild as HTMLTableRowElement;
            this._frozenTBody = this._frozenArea.lastChild.firstChild.firstChild as HTMLTableSectionElement;

            this._scrollableArea = viewArea.childNodes[1] as HTMLDivElement;
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
            let cols = this.columns;
            let frozenCount : number = 0;
            let needMeasureWidthCols:Array<GridColumn> = [];
            for(var n in cols){
                let col:GridColumn = cols[n];
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
                let row :GridRow = new GridRow(this,i,rowData);
                this.rows[i] = row;
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
        private _measureColumnsWidth(cols:Array<GridColumn>){
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