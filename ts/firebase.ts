namespace firebase_ts {
//
//
// https://github.com/firebase/firebase-js-sdk をクローン
// firebase-js-sdk/packages/firebase/index.d.ts を firebase.d.tsにリネームする。
let db: firebase.firestore.Firestore;

let app  : firebase.app.App;
export let user : firebase.User | null = null;
export const defaultRefId = "aNv8XFLZddFpYNoB";
export let refId : string | undefined = defaultRefId;

let default_user_id = "1";

export async function makeRootFolder() : Promise<DbFolder> {
    const initial_data = {
        version : 1.0,
        root : {
            id   : 0,
            name : "root",
            children : []
        }
    };

    let obj = await fetchDB("index", initial_data);
    if(obj == undefined){
        throw new MyError("no index in DB");
    }

    const root_folder = makeContents(null, obj.root) as DbFolder;
    if(!(root_folder instanceof DbFolder)){
        throw new MyError();
    }

    // msg(`fetch index: ver.${obj.version}  ${JSON.stringify(root_folder.makeIndex(), null, "\t")}`);

    return root_folder;
}

async function setUser(user_arg : firebase.User | null){
    if(user_arg == null){
        throw new MyError();
    }

    user = user_arg;

    msg(`sign in: ${user.email} uid:[${user.uid}]`);
}

export function SignUpOk(){
    const email = $inp("sign-up-e-mail").value.trim();
    const password = $inp("sign-up-password").value.trim();

    msg(`email:${email} password:${password}`)

    firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        // Signed in 
        setUser(userCredential.user);
        $dlg('sign-up').close();
    })
    .catch((error) => {
        msg(`sign up err:${error.code} ${error.message}`);
        $dlg('sign-up').close();
    });
}

export function SignInOk(){
    const email    = $inp("sign-in-e-mail").value.trim();
    const password = $inp("sign-in-password").value.trim();

    msg(`email:${email} password:${password}`)

    firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        // Signed in
        setUser(userCredential.user);
        $dlg('sign-in').close();
    })
    .catch((error) => {
        msg(`sign in err:${error.code} ${error.message}`);
        $dlg('sign-in').close();
    });    
}


export function resetPassword() {
    const email   = $inp("sign-in-e-mail").value.trim();
    firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
        msg("Password reset email sent!")
    })
    .catch((error) => {
        msg(`reset password err:${error.code} ${error.message}`);
        $dlg('sign-in').close();
    });
}

export function SignUp(){
    $dlg("sign-up").showModal();
}

export function SignIn(){
    $dlg("sign-in").showModal();
}

export async function SignOut(){
    const auth = firebase.auth();
    msg(`auth:${auth}`);
    await firebase.auth().signOut();
    msg("sign out done");
}

export async function initFirebase() {
    [ urlOrigin, , ] = i18n_ts.parseURL();

    setEvent();

    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
        apiKey: "AIzaSyA8nwVjTKGsSoIrgbcFYfYHqTpaQO_rxX0",
        authDomain: "uroadb.firebaseapp.com",
        projectId: "uroadb",
        storageBucket: "uroadb.firebasestorage.app",
        messagingSenderId: "930380386712",
        appId: "1:930380386712:web:a8b3b5e6a9236c80095bed",
        measurementId: "G-0ZXZKCWJ2Z"
    };

    // Initialize Firebase
    // Firebase App named '[DEFAULT]' already exists - Stack Overflow
    //      https://stackoverflow.com/questions/43331011/firebase-app-named-default-already-exists-app-duplicate-app
    if (firebase.apps.length === 0){
        app = firebase.initializeApp(firebaseConfig);
    }
    else{
        app = firebase.app();
    }

    db = firebase.firestore();

    console.log(app);

    let db_is_ready = false;
    firebase.auth().onAuthStateChanged((user_arg : firebase.User | null) => {
        if(user_arg != null){
            setUser(user_arg);
        }
        else{
            msg("not log in");
        }

        db_is_ready = true;
    });

    while(! db_is_ready){
        await sleep(10);
    }

    if(user != null){

        let data = await getUserData();
        if(data == undefined){
            if(window.confirm("No user data.\nDo you want to initialize user data?")){

                const user_data = {
                    refId : generateRandomString(16)
                };

                await setUserData(user_data);

                data = await getUserData();
                if(data == undefined){
                    throw new MyError("can not initialize user data");
                }
            }
            else{
                return;
            }

        }

        if(typeof data.refId == "string"){
            refId = data.refId;
            msg(`ref Id:[${refId}]`);
        }
        else{

            throw new MyError("no ref Id");
        }
    }

    initStorage();
}

export function getDocRef(id : string, ref_id = refId){
    if(ref_id == undefined){
        throw new MyError();
    }

    return db.collection('public').doc(ref_id).collection('docs').doc(id);
}


export async function writeDB(id: string, doc_obj: any){
    if(user == null || refId == undefined){
        throw new MyError();
    }

    try{
        msg(`text:${doc_obj.text}`);
        await getDocRef(id).set(doc_obj);
        msg(`write DB :id:${doc_obj.id} name:${doc_obj.name}`);
    }
    catch(e){
        msg(`write DB error: ${user.email} ref:${refId} ${e}`);
    }
}


export async function setUserData(user_data: any){
    if(user == null){
        throw new MyError();
    }

    try{
        await db.collection('users').doc(user.uid).set(user_data);
        msg(`set user data : ${JSON.stringify(user_data, null, 4)}`);
    }
    catch(e){
        msg(`set user data error: ${user.email} [${user.uid}] [${user_data}] ${e}`);
    }
}


export async function getUserData() {
    if(user == null){

        throw new MyError();        
    }

    try{
        let user_data = await db.collection('users').doc(user.uid).get();
        if(user_data.exists){

            const data = user_data.data();
            msg(`get user data OK:${JSON.stringify(data, null, 4)}`);
            return data;
        }
        else{

            msg(`no user data: ${user.email} [${user.uid}]`);

            return undefined;
        }
    }
    catch(e){
        msg(`get user data error: ${user.email} [${user.uid}] ${e}`);

        throw new MyError();        
    }
}


export async function fetchDB(id: string, initial_data : any | undefined = undefined) {
    try{
        let doc_data = await getDocRef(id).get();
        if(doc_data.exists){
            const data = doc_data.data();
            // msg(`read DB OK:${data}`);
            return data;
        }
        else{

            msg(`no data:${id}`);
            if(initial_data != undefined){
                if(window.confirm("No index data.\nDo you want to initialize index data?")){

                    await writeDB(id, initial_data);
                    return initial_data;
                }
            }

            return undefined;
        }
    }
    catch(e){
        if(user != null){
            msg(`read DB error: ${user.email} [${user.uid}] ${e}`);
        }
        else{
            msg(`read DB error: ${e}`);
        }

        throw new MyError();        
    }
}

export async function getDoc(id : number){
    const json = await fetchDB(`${id}`);
    if(json == undefined){
        msg(`no doc:${id}`);
        return undefined;
    }
    else{
        msg(`id:${json.id} name:${json.name}`); //  text:${json.text}
        if(rootFolder == null){
            return undefined;
        }
        const doc = rootFolder.findDoc(id);
        if(doc == undefined){
            return new DbDoc(null, json.id, json.name, json.text);
        }

        doc.text = json.text;
        return doc;
    }
}

export function batchWrite(doc : DbDoc, doc_obj: any) : Promise<DbDoc> {
    return new Promise((resolve) => {
        if(user == null || refId == undefined){
            throw new MyError("not log in");
        }
        else if(rootFolder == null){
            throw new MyError("no root folder");
        }
        else{

            try{
                    let batch = db.batch();


                    // FirebaseError: Function WriteBatch.set() called with invalid data. Data must be an object, but it was: a custom object
                    //  https://stackoverflow.com/questions/48156234/function-documentreference-set-called-with-invalid-data-unsupported-field-val
                    let docRef = getDocRef(`${doc.id}`);
                    batch.set(docRef, doc_obj);


                    const index_obj = {
                        version : 1.0,
                        root : rootFolder.makeIndex()
                    };
                    let idxRef = getDocRef("index");
                    batch.set(idxRef, index_obj);

                    batch.commit().then(function () {
                        msg(`text:${doc_obj.text}`);
                        msg(`write DB :id:${doc_obj.id} name:${doc_obj.name}`);
                        resolve(doc);
                    });
            }
            catch(e){
                throw new MyError(`${e}`);
            }        
        }            

    });
}

export async function updateIndex() {
    if(user == null || rootFolder == null || refId == undefined){
        throw new MyError();
    }

    const index_obj = {
        version : 1.0,
        root : rootFolder.makeIndex()
    };

    try{
        await getDocRef("index").set(index_obj);
        msg(`update index [${JSON.stringify(index_obj, null, 4)}]`);
    }
    catch(e){
        msg(`update index error: ${user.email} ref:${refId} ${e}`);
    }
    
}

export async function putDoc(parent : DbFolder, text : string) : Promise<DbDoc | undefined> {
    const name = inputDocName("");
    if(name == ""){
        return undefined;
    }

    const doc = makeDoc(parent, name, text);
    let doc_obj = doc.makeObj();

    await batchWrite(doc, doc_obj);
    return doc;
}

export function getDB() : firebase.firestore.Firestore {
    return db;
}

export function getUser() : firebase.User | null {
    return user;
}

}
