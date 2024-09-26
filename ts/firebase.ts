namespace firebase_ts {
//
//
// https://github.com/firebase/firebase-js-sdk をクローン
// firebase-js-sdk/packages/firebase/index.d.ts を firebase.d.tsにリネームする。
let db: firebase.firestore.Firestore;

let app  : firebase.app.App;
let user : firebase.User | null = null;

async function setUser(user_arg : firebase.User | null){
    if(user_arg == null){
        throw new MyError();
    }

    user = user_arg;
    db = firebase.firestore();

    const obj = await fetchDB("index");
    if(obj != null){
        dbIndex = new Index(obj);
        msg(`fetch index:${JSON.stringify(dbIndex.toObj(), null, "\t")}`)
    }

    msg(`sign in: ${user.email} ${user.uid}`);
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
    $dlg("sign-up").show();
}

export function SignIn(){
    $dlg("sign-in").show();
}

export async function SignOut(){
    const auth = firebase.auth();
    msg(`auth:${auth}`);
    await firebase.auth().signOut();
    msg("sign out done");
}

export function OnDOMContentLoadedfunction() {
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

export async function fetchDB(id: string) : Promise<any> {
    if(user == null){
        throw new MyError();
    }

    try{
        let doc_data = await db.collection('users').doc(user.uid).collection('docs').doc(id).get();
        if(doc_data.exists){
            const data = doc_data.data();
            msg(`read DB OK:${data}`);
            return data;
        }
        else{

            msg(`no data:${id}`);
        }
    }
    catch(e){
        msg(`read DB error: ${user.email} ${user.uid} ${e}`);
    }
    return null;
}



export async function writeTest(){
    const data = dbIndex.toObj();

    msg(`index:${JSON.stringify(data, null, "\t")}`);

    writeDB("index", data);
}

}
