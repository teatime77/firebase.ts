namespace firebase_ts {
//
export class MyError extends Error {
    constructor(text : string = ""){
        super(text);
    }
}

export function assert(b : boolean, msg : string = ""){
    if(!b){
        throw new MyError(msg);
    }
}    

export function msg(txt : string){
    console.log(txt);
}

const $dic = new Map<string, HTMLElement>();


export function $(id : string) : HTMLElement {
    let ele = $dic.get(id);
    if(ele == undefined){
        ele = document.getElementById(id)!;
        $dic.set(id, ele);
    }

    return ele;
}

export function $inp(id : string) : HTMLInputElement {
    return $(id) as HTMLInputElement;
}

export function $dlg(id : string) : HTMLDialogElement {
    return $(id) as HTMLDialogElement;
}

export function remove<T>(v : Array<T>, x : T){
    const idx = v.indexOf(x);
    assert(idx != undefined);
    v.splice(idx, 1);
}


export async function sleep(milliseconds : number) : Promise<void> {
    return new Promise((resolve) => {
        setTimeout(()=>{
            resolve();
        }, milliseconds);
    });
}

}