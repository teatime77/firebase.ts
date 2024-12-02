namespace firebase_ts {
//

export function initStorage(){
    const storage = firebase.storage();
    msg(`storage:${storage}`);
}

function preventDefaults(ev:DragEvent) {
    ev.preventDefault(); 
    ev.stopPropagation();
}


export async function showImageDlg(ev:MouseEvent){
    const content = $flex({
        width  : "400px",
        height : "300px",
        backgroundColor : "cornsilk",
        children: [

        ]
    });

    const div = content.html();

    div.addEventListener("dragenter", (ev : DragEvent)=>{
        preventDefaults(ev);
        msg("drag enter");
    });

    div.addEventListener("dragover", (ev : DragEvent)=>{
        preventDefaults(ev);
        div.classList.add('dragover')

        msg("drag over");
    });

    div.addEventListener("dragleave", (ev : DragEvent)=>{
        preventDefaults(ev);
        div.classList.remove('dragover');
        msg("drag leave");
    });

    div.addEventListener("drop", async (ev : DragEvent)=>{
        preventDefaults(ev);
        div.classList.remove('dragover');

        msg("drop");
        const dt = ev.dataTransfer;
        if(dt == null){
            return;
        }

        const files = dt.files;

        msg(`${files}`);

        for (const file of files) {
            if(file.type == "image/png" || file.type == "image/jpeg"){
                await uploadImgFile(file);
            }
            else{

                msg(`File name: ${file.name}, File size: ${file.size}, File type: ${file.type}`);
            }
        }
    })

    const dlg = layout_ts.$dialog({
        content : content
    });

    dlg.showModal(ev);
}

async function uploadImgFile(file : File){
    const k = file.type.indexOf("/");
    const ext = file.type.substring(k + 1);
    msg(`upload File name: ${file.name}, File size: ${file.size}, File type: ${file.type} ext:${ext}`);

    try{
        // Create a root reference
        var storageRef = firebase.storage().ref();

        const id = generateRandomString(10);
        const file_name = `${id}.${ext}`;

        // Create a reference to 'images/mountains.jpg'
        const path = `users/${refId}/images/${file_name}`;
        var img_ref = storageRef.child(path);

        const snap = await img_ref.put(file);
        msg(`upload OK: ${file.name}:${file_name} path:${path}`);
    }
    catch(e){
        msg(`upload img err:${e}`);
    }
}

}
