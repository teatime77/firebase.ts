namespace firebase_ts {
//
let parent : Folder | null;

export function setEvent(){
    $("file-div").addEventListener("contextmenu", (ev:MouseEvent)=>{
        ev.preventDefault();

        parent = null;
        $dlg("add-dbitem").showModal();
    });

    $("add-folder").addEventListener("click", (ev : MouseEvent)=>{
        const name = window.prompt("enter a folder name.");
        if(name == null || name.trim() == ""){
            return;
        }

        const id = dbIndex.getNewId();
        const folder = new Folder(id, name);
        if(parent == null){

            dbIndex.folders.push(folder);
        }
        else{

        }

    });
}

export function showFileDlg(){
    $dlg("file-dlg").showModal();
}

}