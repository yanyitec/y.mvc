export class Timer{
    interval:number;
    private _timer : number;
    private _handlers:Array<()=>boolean>;

    constructor(interval:number){
        this.interval = interval;
    }
    ring(handler:()=>boolean):Timer{
        
        if(!this._handlers){
            this._handlers = [handler];
            this._timer = setInterval(()=>{
                let handlers:Array<Function> = this._handlers;
                for(let i =0,j=handlers.length;i<j;i++){
                    let handler = handlers.shift();
                    if(handler()!==false) handlers.push(handler);
                }
                if(handlers.length==0){
                    this._handlers=undefined;
                    clearInterval(this._timer);
                    this._timer = 0;
                }
            },this.interval);
        }else {
            this._handlers.push(handler);
        }
        return this;
    }
}