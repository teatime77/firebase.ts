namespace firebase_ts {
//

export let rootFolder : DbFolder | null;
let homeURL : string;

abstract class DbItem {
    parent : DbFolder | null = null;
    id : number;
    name : string;

    constructor(parent : DbFolder | null, id : number, name : string){
        this.parent = parent;
        this.id   = id;
        this.name = name;
    }

    makeIndex() : any {
        return {
            parent : (this.parent == null ? -1 : this.parent.id),
            id : this.id,
            name : this.name
        };
    }

    getAll(items : DbItem[]){
        items.push(this);
    }
}

export class DbDoc extends DbItem {
    text : string;
    nameChanged : boolean = false;

    constructor(parent : DbFolder | null, id : number, name : string, text : string){
        super(parent, id, name);
        this.text = text;
    }

    makeObj() : any {
        let obj = Object.assign(super.makeIndex(), {
            text : this.text
        });

        return obj;
    }

    setName(name : string){
        if(this.name != name){
            this.name = name;
            this.nameChanged = true;
        }
    }

    async update(){
        if(this.nameChanged){

            await batchWrite(this);
            this.nameChanged = false;
        }
        else{

            await writeDB(`${this.id}`, this.makeObj());
        }
    }
}

export class DbFolder extends DbItem {
    children : DbItem[] = [];
    expanded : boolean = false;

    constructor(parent : DbFolder | null, id : number, name : string){
        super(parent, id, name);
    }

    makeIndex() : any {
        let obj = Object.assign(super.makeIndex(), {
            children : this.children.map(x => x.makeIndex())
        });

        return obj;
    }

    addItem(item : DbItem){
        this.children.push(item);
        item.parent = this;
    }

    getAll(items : DbItem[]){
        super.getAll(items);
        this.children.forEach(x => x.getAll(items));
    }

    findDoc(id : number){
        const items : DbItem[] = [];
        this.getAll(items);
        const doc = items.find(x => x.id == id);
        if(doc instanceof DbDoc){
            return doc;
        }
        else{
            undefined;
        }

    }
}



export function getNewId() : number {
    if(rootFolder == null){
        throw new MyError();
    }

    const items : DbItem[] = [];
    rootFolder.getAll(items);
    const ids = items.map(x => x.id);
    if(ids.length == 0){
        return 1;
    }
    return Math.max(...ids) + 1;
}


export function makeDoc(parent : DbFolder, name : string, text : string) : DbDoc {
    const id = getNewId();
    const doc = new DbDoc(parent, id, name, text);
    parent.children.push(doc);

    return doc;
}

export function addFolder(parent : DbFolder, name : string){
    const id = getNewId();
    const folder = new DbFolder(parent, id, name);
    parent.children.push(folder);
}

export function makeContents(parent : DbFolder | null, obj : any) : DbItem {
    if(obj.children != undefined){
        const folder = new DbFolder(parent, obj.id, obj.name);
        for(const child_obj of obj.children){
            const child = makeContents(folder, child_obj);
            folder.children.push(child);
        }

        return folder;
    }
    else{
        const doc = new DbDoc(parent, obj.id, obj.name, obj.text);
        return doc;
    }
}

export function readIndex(obj : any){

}

function makeFolderHtml(item : DbItem, ul : HTMLUListElement, fnc:(id:number)=>void){
    const li = document.createElement("li");

    let img_name : string;
    if(item instanceof DbDoc){
        
        li.style.cursor = "pointer";
        li.addEventListener("click", (ev : MouseEvent)=>{
            $dlg("file-dlg").close();
            fnc(item.id);
        });

        img_name = "doc";
    }
    else{

        li.style.cursor = "default";
        img_name = "folder";
    }

    li.innerText = item.name;
    li.style.listStyleImage = `url(${homeURL}/lib/firebase/img/${img_name}.png)`

    ul.append(li);

    if(item instanceof DbFolder){

        const children_ul = document.createElement("ul");
        item.children.forEach(x => makeFolderHtml(x, children_ul, fnc));
        ul.append(children_ul);
    }

}

export async function showContents(fnc:(id:number)=>void){
    if(rootFolder == null){
        rootFolder = await makeRootFolder();
    }

    const dlg = $dlg("file-dlg");

    dlg.innerHTML = "";

    const ul = document.createElement("ul");

    const k = document.location.href.lastIndexOf("/");
    homeURL = document.location.href.substring(0, k);
    msg(`home:${homeURL}`);

    makeFolderHtml(rootFolder, ul, fnc);
    dlg.append(ul);

    dlg.showModal();

}

export function getRootFolder() : DbFolder | null {
    return rootFolder;
}

}