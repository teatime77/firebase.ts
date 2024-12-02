namespace firebase_ts {
//
type Block = layout_ts.Block;

export const $flex = layout_ts.$flex;
const $grid = layout_ts.$grid;
const $block = layout_ts.$block;
const $button = layout_ts.$button;
const $popup = layout_ts.$popup;
const $textarea = layout_ts.$textarea;
const $label = layout_ts.$label;
const $input_number = layout_ts.$input_number;

const TT = i18n_ts.TT;

export let rootFolder : DbFolder | null;
let urlOrigin : string;

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

    async updateDocDB(){
        let doc_obj = this.makeObj();

        if(this.nameChanged){

            await batchWrite(this, doc_obj);
            this.nameChanged = false;
        }
        else{

            await writeDB(`${this.id}`, doc_obj);
        }
    }
}

export class DbFolder extends DbItem {
    children : DbItem[] = [];
    expanded : boolean = false;

    constructor(parent : DbFolder | null, id : number, name : string){
        super(parent, id, name);
    }

    copy(parent : DbFolder | null) : DbFolder {
        const folder_copy = new DbFolder(parent, this.id, this.name);

        for(const [idx, item] of this.children.entries()){
            let item_copy;

            if(item instanceof DbFolder){
                item_copy = item.copy(folder_copy);
            }
            else if(item instanceof DbDoc){
                item_copy = new DbDoc(folder_copy, item.id, item.name, item.text);
            }
            else{
                throw new MyError();
            }

            folder_copy.addItem(item_copy);
        }

        return folder_copy;
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
    li.style.fontSize = "xxx-large";

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

    li.innerText = TT(item.name);
    li.style.listStyleImage = `url(${urlOrigin}/lib/firebase/img/${img_name}.png)`

    li.addEventListener("contextmenu", (ev:MouseEvent)=>{
        ev.preventDefault();

        const menu_items = [

        ];
        
        const menu = $popup({
            children : [
                $button({
                    text : TT("add doc"),
                    click : async (ev : MouseEvent)=>{                                
                        msg("add doc");
                    }
                })
                ,
                $button({
                    text : TT("add folder"),
                    click : async (ev : MouseEvent)=>{                                
                        msg("add folder");

                        const name = window.prompt("enter a folder name.");
                        if(name == null || name.trim() == ""){
                            return;
                        }
                
                        // addFolder(name.trim());                    
                    }
                })
                ,
                $button({
                    text : TT("delete"),
                    click : async (ev : MouseEvent)=>{                                
                        msg("delete");
                        if(item instanceof DbDoc){
                            await deleteDocDB(item);
                        }
                        else{

                        }
                    }
                })
            ]
        });

        menu.show(ev);
    });

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

    [ urlOrigin, , ] = i18n_ts.parseURL();

    makeFolderHtml(rootFolder, ul, fnc);
    dlg.append(ul);

    dlg.showModal();

}

export async function getRootFolder() : Promise<DbFolder> {
    if(rootFolder == null){
        rootFolder = await makeRootFolder();
    }

    return rootFolder;
}

export async function getAllDbItems(){
    await getRootFolder();

    const items : DbItem[] = [];
    rootFolder!.getAll(items);

    return items;
}

export async function BackUp(){
    if(refId == undefined){
        throw new MyError();
    }

    const items = await getAllDbItems();

    const docs : DbDoc[] = items.filter(x => x instanceof DbDoc) as DbDoc[];

    for(const doc of docs){
        const json = await fetchDB(`${doc.id}`);
        if(json == undefined){
            msg(`no doc:${doc}`);
            return undefined;
        }

        doc.text = json.text;
        let obj = doc.makeObj();

        msg(`doc:${obj.id} ${obj.name} ${obj.parent} [${obj.text}]`);
    }

    const db = getDB();

    try{
        let batch = db.batch();

        for(const doc of docs){

            let doc_obj = doc.makeObj();

            let docRef = db.collection('public').doc(refId).collection('docs').doc(`${doc.id}`);
            batch.set(docRef, doc_obj);
        }

        const index_obj = {
            version : 1.0,
            root : rootFolder!.makeIndex()
        };
        msg(`index:${JSON.stringify(index_obj.root, null, 4)}`);

        let idxRef = db.collection('public').doc(refId).collection('docs').doc("index");
        batch.set(idxRef, index_obj);

        await batch.commit();
        
        msg("write doc OK");
    }
    catch(e){
        throw new MyError(`${e}`);
    }        
}

export async function deleteDocDB(doc : DbDoc){
    if(! window.confirm(`Are you sure you want to delete ${doc.name}?`)){
        return;
    }

    if(refId == undefined){
        throw new MyError();
    }

    if(rootFolder == null){
        rootFolder = await makeRootFolder();
    }

    const root_folder_copy = rootFolder.copy(null);
    const doc_copy = root_folder_copy.findDoc(doc.id);
    if(doc_copy == undefined){
        throw new MyError(`invalid doc id:${doc.id}`);
    }
    if(doc_copy.parent == null){
        throw new MyError(`orphaned doc id:${doc.id} name:${doc_copy.name}`);
    }

    remove(doc_copy.parent.children, doc_copy);
    
    const db = getDB();

    try{
        let batch = db.batch();

        const doc_ref = db.collection('public').doc(refId).collection('docs').doc(`${doc_copy.id}`);
        batch.delete(doc_ref);

        const index_obj = {
            version : 1.0,
            root : root_folder_copy.makeIndex()
        };
        msg(`index:${JSON.stringify(index_obj.root, null, 4)}`);

        let idxRef = db.collection('public').doc(refId).collection('docs').doc("index");
        batch.set(idxRef, index_obj);

        await batch.commit();
        
        rootFolder = root_folder_copy;

        msg("write doc OK");
    }
    catch(e){
        throw new MyError(`${e}`);
    }        

}

}