namespace firebase_ts {
//

export function initStorage(){
    const storage = firebase.storage();
    msg(`storage:${storage}`);
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

}
