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
    'name': folderName,
    'mimeType': "application/vnd.google-apps.folder"
  };
  gapi.client.drive.files.create({
    'resource': body
  }).then(function(response) {
    switch(response.status){
      case 200:
        var file = response.result;
        console.log('Created Folder Id: ', file.id);
        break;
      default:
        console.log('Error creating the folder, '+response);
        break;
    }
  });
}


//listeners for communication
chrome.extension.onMessage.addListener(
  async function(request, sender, sendResponse) {
    if (request.msg == "initializeApi"){
      chrome.storage.sync.get(['token'], function (token) {
        gapi.auth.setToken({
          'access_token': token.token
        })
        gapi.client.drive.files.list({
          q: "name='Mr Meet'"
        }).then( function(response) {
          if (response.result.files.length == 0) {
            console.log('archivo no existe');
            createFolder("Mr Meet");
          }
          else{
            console.log('archivo ya existe');
          }
        });
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
  }
);
