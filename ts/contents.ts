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

export async function addFolder(parent : DbFolder, name : string){
    const id = getNewId();
    const folder = new DbFolder(parent, id, name);
    parent.children.push(folder);

    await updateIndex();
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


let DbItemId = 0;
let selectedFileItems : HTMLLIElement[] = [];
let IdtoItem : Map<string, DbItem>;
let rootUL : HTMLUListElement;

function clearFileItemBorder(){
    const insertion_points = document.getElementsByClassName("file-item");
    for(const ele of insertion_points){
        (ele as HTMLElement).style.borderStyle = "none";
    }
}

function setFileItemSelection(lis : HTMLLIElement[]){
    clearFileItemSelection();

    selectedFileItems = lis.slice();
    selectedFileItems.forEach(x => x.style.backgroundColor = "DeepSkyBlue");
}

function clearFileItemSelection(){
    selectedFileItems.forEach(x => x.style.backgroundColor = "");
    selectedFileItems = [];
}

function setDragDrop(li : HTMLLIElement){
    li.draggable = true;
    // li.style.cursor = "move";

    li.addEventListener('dragstart', (ev : DragEvent)=>{
        clearFileItemBorder();
        msg(`drag start`);

        if(ev.dataTransfer != null && ev.target instanceof HTMLElement){
            if(selectedFileItems.length == 0){

                setFileItemSelection([ li ]);
            }

            ev.dataTransfer.setData('text/plain', ev.target.id);
        }
    });

    li.addEventListener('dragover', (ev : DragEvent)=>{
        ev.preventDefault();
        clearFileItemBorder();

        msg(`drag over`);
        const rc = li.getBoundingClientRect();
        const center_y = rc.y + 0.5 * rc.height;

        if(center_y < ev.clientY){

            li.style.borderBottomStyle = "solid";
        }
        else{
            const prev = li.previousElementSibling;
            if(prev instanceof HTMLLIElement){

                prev.style.borderBottomStyle = "solid";
            }
            else{

                li.style.borderTopStyle = "solid";
            }
        }
    });

    li.addEventListener('dragleave', (ev : DragEvent)=>{
        clearFileItemBorder();
        msg(`drag leave`);
    });

    li.addEventListener("dragend", (ev : DragEvent)=>{
        msg(`drag end`);
        clearFileItemBorder();
        clearFileItemSelection();
    });

    li.addEventListener('drop', (ev : DragEvent)=>{
        ev.preventDefault();
        msg("drop")

        if(selectedFileItems.length != 0){

            const target = IdtoItem.get(li.id);
            if(target == undefined){
                throw new MyError();                
            }

            const items : DbItem[] = [];
            for(const li2 of selectedFileItems){
                const item = IdtoItem.get(li2.id);
                if(item == undefined){
                    throw new MyError();
                }
                items.push(item);
            }
            const items_parent = items[0].parent!;
            items.forEach(item => remove(items_parent.children, item));

            const target_idx = target.parent!.children.indexOf(target);
            if(target_idx == -1){
                throw new MyError();
            }

            target.parent!.children.splice(target_idx, 0, ...items);
            items.forEach(x => x.parent = target.parent);

            rootUL.innerHTML = "";
            makeFolderHtml(rootFolder!, rootUL, undefined);
        }

        clearFileItemBorder();
        clearFileItemSelection();
    });

    li.addEventListener("click", (ev : MouseEvent)=>{
        msg(`click`);
        if(ev.shiftKey){
            if(selectedFileItems.length == 1 && selectedFileItems[0].parentElement == li.parentElement){
                const children = Array.from(li.parentElement!.children) as HTMLLIElement[];
                let i1 = children.indexOf(li);
                let i2 = children.indexOf(selectedFileItems[0]);
                if(i2 < i1){
                    [i1, i2] = [i2, i1];
                }

                setFileItemSelection(children.slice(i1, i2 + 1))
            }
        }
        else{

            setFileItemSelection([ li ]);
        }
    });    

}

function makeFolderHtml(item : DbItem, ul : HTMLUListElement, fnc?:(id:number)=>void){
    const li = document.createElement("li");
    li.id = `db-item-${++DbItemId}`;
    IdtoItem.set(li.id, item);

    if(fnc != undefined){

        li.style.fontSize = "xxx-large";
    }
    else{

        li.style.borderWidth = "2px";
        li.className = "file-item";
        setDragDrop(li);
    }

    let img_name : string;
    if(item instanceof DbDoc){
        
        li.style.cursor = "pointer";

        if(fnc != undefined){

            li.addEventListener("click", (ev : MouseEvent)=>{
                $dlg("file-dlg").close();
                fnc(item.id);
            });    
        }

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
        
        const menu = $popup({
            children : [
                $button({
                    text : TT("add doc"),
                    fontSize : "large",
                    click : async (ev : MouseEvent)=>{                                
                        msg("add doc");
                    }
                })
                ,
                $button({
                    text : TT("add folder"),
                    fontSize : "large",
                    disabled : !(item instanceof DbFolder),
                    click : async (ev : MouseEvent)=>{                                
                        msg("add folder");

                        const name = window.prompt("enter a folder name.");
                        if(name == null || name.trim() == ""){
                            return;
                        }
                
                        if(item instanceof DbFolder){

                            await addFolder(item, name.trim());                    
                        }
                    }
                })
                ,
                $button({
                    text : TT("rename"),
                    fontSize : "large",
                    click : async (ev : MouseEvent)=>{                                
                        msg("add folder");

                        const name = window.prompt("enter a new name.", item.name);
                        if(name == null || name.trim() == ""){
                            return;
                        }
                
                        item.name = name.trim();
                        await updateIndex();
                    }
                })
                ,
                $button({
                    text : TT("delete"),
                    fontSize : "large",
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

export async function showContents(fnc?:(id:number)=>void){
    if(rootFolder == null){
        rootFolder = await makeRootFolder();
    }

    const dlg = $dlg("file-dlg");

    dlg.innerHTML = "";

    rootUL = document.createElement("ul");

    [ urlOrigin, , ] = i18n_ts.parseURL();

    IdtoItem = new Map<string, DbItem>();
    makeFolderHtml(rootFolder, rootUL, fnc);
    dlg.append(rootUL);

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
    if(refId == undefined || user == null){
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

    const date_str = dateString();

    const db = getDB();

    try{
        const backup_ref = db.collection('users').doc(user.uid).collection('backup').doc(date_str).collection('docs');

        let batch = db.batch();

        for(const doc of docs){

            let doc_obj = doc.makeObj();

            let docRef = backup_ref.doc(`${doc.id}`);
            batch.set(docRef, doc_obj);
        }

        const index_obj = {
            version : 1.0,
            root : rootFolder!.makeIndex()
        };
        msg(`index:${JSON.stringify(index_obj.root, null, 4)}`);

        let idxRef = backup_ref.doc("index");
        batch.set(idxRef, index_obj);

        await batch.commit();
        
        msg(`back up completes.[${date_str}]`);
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

        const doc_ref = getDocRef(`${doc_copy.id}`);
        batch.delete(doc_ref);

        const index_obj = {
            version : 1.0,
            root : root_folder_copy.makeIndex()
        };
        msg(`index:${JSON.stringify(index_obj.root, null, 4)}`);

        let idxRef = getDocRef("index");
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