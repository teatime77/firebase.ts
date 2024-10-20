namespace firebase_ts {
//
//
// https://github.com/firebase/firebase-js-sdk をクローン
// firebase-js-sdk/packages/firebase/index.d.ts を firebase.d.tsにリネームする。
let db: firebase.firestore.Firestore;

let app  : firebase.app.App;
let user : firebase.User | null = null;

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

    msg(`fetch index: ver.${obj.version}  ${JSON.stringify(root_folder.makeIndex(), null, "\t")}`);

    return root_folder;
}

async function setUser(user_arg : firebase.User | null){
    if(user_arg == null){
        throw new MyError();
    }

    user = user_arg;

    msg(`sign in: ${user.email} [${user.uid}]`);
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
    setEvent();

    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
        apiKey: "AIzaSyA8nwVjTKGsSoIrgbcFYfYHqTpaQO_rxX0",
        authDomain: "uroadb.firebaseapp.com",
        projectId: "uroadb",
        storageBucket: "uroadb.appspot.com",
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

    firebase.auth().onAuthStateChanged((user_arg : firebase.User | null) => {
        if(user_arg != null){
            setUser(user_arg);
        }
        else{
            msg("not log in");
        }
    });
}


export async function writeDB(id: string, data: any){
    if(user == null){
        throw new MyError();
    }

    try{
        await db.collection('users').doc(user.uid).collection('docs').doc(id).set(data);
        msg(`write DB OK:${id}`);
    }
    catch(e){
        msg(`write DB error: ${user.email} ${user.uid} ${e}`);
    }
}

export async function fetchDB(id: string, initial_data : any | undefined = undefined) {
    const user_id = (user != null ? user.uid : default_user_id);

    try{
        let doc_data = await db.collection('users').doc(user_id).collection('docs').doc(id).get();
        if(doc_data.exists){
            const data = doc_data.data();
            msg(`read DB OK:${data}`);
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
        msg(`id:${json.id} name:${json.name} text:${json.text}`);
        if(rootFolder == null){
            return undefined;
        }
        const doc = rootFolder.findDoc(id);
        if(doc == undefined){
            return undefined;
        }

        doc.text = json.text;
        return doc;
    }
}

export function batchWrite(doc : DbDoc) : Promise<DbDoc> {
    return new Promise((resolve) => {
        if(user == null){
            throw new MyError("not log in");
        }
        else if(rootFolder == null){
            throw new MyError("no root folder");
        }
        else{

            try{
                    let batch = db.batch();

                    let doc_obj = doc.makeObj();

                    // FirebaseError: Function WriteBatch.set() called with invalid data. Data must be an object, but it was: a custom object
                    //  https://stackoverflow.com/questions/48156234/function-documentreference-set-called-with-invalid-data-unsupported-field-val
                    let docRef = db.collection('users').doc(user.uid).collection('docs').doc(`${doc.id}`);
                    batch.set(docRef, doc_obj);


                    const index_obj = {
                        version : 1.0,
                        root : rootFolder.makeIndex()
                    };
                    let idxRef = db.collection('users').doc(user.uid).collection('docs').doc("index");
                    batch.set(idxRef, index_obj);

                    batch.commit().then(function () {
                        msg("write doc OK");
                        resolve(doc);
                    });
            }
            catch(e){
                throw new MyError(`${e}`);
            }        }            

    });
}

export async function putDoc(parent : DbFolder, name : string, text : string) : Promise<DbDoc> {
    const doc = makeDoc(parent, name, text);

    await batchWrite(doc);
    return doc;
}


}
