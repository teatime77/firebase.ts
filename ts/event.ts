namespace firebase_ts {
//

export function setEvent(){
    $("file-div").addEventListener("contextmenu", (ev:MouseEvent)=>{
        ev.preventDefault();

        $dlg("add-dbitem").showModal();
    });

    $("add-folder").addEventListener("click", (ev : MouseEvent)=>{
        const name = window.prompt("enter a folder name.");
        if(name == null || name.trim() == ""){
            return;
        }

        // addFolder(name.trim());
    });

    $("firebase-sign-up").addEventListener("click", SignUp);
    $("firebase-sign-in").addEventListener("click", SignIn);
    $("firebase-sign-out").addEventListener("click", SignOut);

    $("sign-up-ok").addEventListener("click", SignUpOk);
    $("sign-up-cancel").addEventListener("click", (ev : MouseEvent)=>{
        $dlg('sign-up').close();
    });

    $("sign-in-ok").addEventListener("click", SignInOk);
    $("sign-in-reset").addEventListener("click", resetPassword);
    $("sign-in-cancel").addEventListener("click", (ev : MouseEvent)=>{
        $dlg('sign-in').close();
    });
}

export function showFileDlg(){
}

}