namespace firebase_ts {
//

export let dbIndex : Index;

abstract class DbItem {
    id : number;
    name : string;
    parent : Folder | null = null;

    constructor(id : number, name : string){
        this.id   = id;
        this.name = name;
    }

    toObj() : any {
        return {
            id : this.id,
            name : this.name,
            parent : (this.parent == null ? -1 : this.parent.id)
        };
    }
}

export class Doc extends DbItem {
    constructor(id : number, name : string){
        super(id, name);
    }
}

export class Folder extends DbItem {
    items : DbItem[] = [];
    expanded : boolean = false;

    constructor(id : number, name : string){
        super(id, name);
    }

    addItem(item : DbItem){
        this.items.push(item);
        item.parent = this;
    }
}

export class Index {
    folders : Folder[] = [];
    docs    : Doc[] = [];

    constructor(obj : { folders: any[], docs : any[] }){
        this.folders = obj.folders.map(obj => new Folder(obj.id, obj.name));
        this.docs    = obj.docs.map(obj => new Doc(obj.id, obj.name));
    }

    getNewId() : number {
        const ids = (this.folders as DbItem[]).concat(this.docs).map(x => x.id);
        if(ids.length == 0){
            return 1;
        }
        return Math.max(...ids) + 1;
    }

    toObj() : any {
        return {
            folders : this.folders.map(x => x.toObj()),
            docs    : this.docs.map(x => x.toObj())
        }
    }
}

function addFolder(parent : Folder | null, name : string){
    const id = dbIndex.getNewId();
    const folder = new Folder(id, name);
}

}