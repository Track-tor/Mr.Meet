const API_KEY = 'AIzaSyCqS8Ur850llY5mXGy9QA7OsCwpx0wweBw';
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest", "https://sheets.googleapis.com/$discovery/rest?version=v4"];


function onGAPILoad() {
  gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOCS,
  });
}

function createFolder(folderName) {
  var body = {
    'title': folderName,
    'mimeType': "application/vnd.google-apps.folder"
  };

  var request = gapi.client.drive.files.insert({
    'resource': body
  });

  request.execute(function(resp) {
    console.log('Folder ID: ' + resp.id);
  });
}

function test(){
  gapi.client.drive.files.list({
    q: "name='a'"
  }).then( function(response) {
    console.log(response);
  });
}

//listeners for communication
chrome.extension.onMessage.addListener(
  async function(request, sender, sendResponse) {
    if (request.msg == "setTokenInApi"){
      chrome.storage.sync.get(['token'], function (token) {
        gapi.auth.setToken({
          'access_token': token,
        });
        //Save the token somewhere(return it to sender, cookies, etc)
      })
    }
    else if (request.msg == "attendance"){
      //take attendance

      console.log(request.names);


    }
    else if (request.msg == 'question'){
      //questions
    }
    else if (request.msg == 'answer'){
      //answer
    }
    else if (request.msg == 'setDriveFolder'){
      //check if the folder exists, if not create it
      test();
    }
  }
);
