namespace firebase_ts {
//

export function initStorage(){
    const storage = firebase.storage();
    msg(`storage:${storage}`);
}

function getThumbnailPath(doc_id : number) : string {
    return `users/${refId}/images/${doc_id}/thumbnail.png`;
}

export async function uploadCanvasImg(doc_id : number, canvas : HTMLCanvasElement) {
    // Get canvas data as a Blob
    const dataURL = canvas.toDataURL('image/png'); 
    const res  = await fetch(dataURL);
    const blob = await res.blob();

    try{
        // Create a root reference
        var storageRef = firebase.storage().ref();

        // Create a reference to 'images/mountains.jpg'
        const path = getThumbnailPath(doc_id);
        var img_ref = storageRef.child(path);

        const snap = await img_ref.put(blob);
        msg(`upload canvas img OK: path:${path}`);

        return path;
    }
    catch(e){
        throw new MyError(`upload canvas img err:${e}`);
    }
}

export async function uploadImgFile(file : File) {
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

        return path;
    }
    catch(e){
        throw new MyError(`upload img err:${e}`);
    }
}

export async function getStorageDownloadURL(path : string){   
    let url : string;
    try{
        const file_ref = firebase.storage().ref().child(path);
        url = await file_ref.getDownloadURL();
        if(typeof url == "string"){
            msg(`storage url:[${url}]`);
            return url;
        }
    }
    catch(e){
        throw new MyError(`get storage download URL error:${e}`);
    }


    throw new MyError();
}

export async function getThumbnailDownloadURL(doc_id : number) : Promise<string> {
    const path = getThumbnailPath(doc_id);
    const url = await getStorageDownloadURL(path);
    return url;
}

}
