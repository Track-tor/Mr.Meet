//listeners for communication
chrome.extension.onMessage.addListener(
    async function(request, sender, sendResponse) {
        if (request.msg == "start"){
            console.log("Start!");
            sendMessage("getToken");
        }
        else if(request.msg == "stop"){
            console.log("stop!");
        }
    }
);

//renders the layout of the extension
function addLayout(){

}


//send a simple message between the components of the extension
function sendMessage(message){
    chrome.runtime.sendMessage({
        msg: message
    });
}