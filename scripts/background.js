const API_KEY = 'AIzaSyCqS8Ur850llY5mXGy9QA7OsCwpx0wweBw';
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest", "https://sheets.googleapis.com/$discovery/rest?version=v4"];


function onGAPILoad() {
  gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOCS,
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
    }
    else if (request.msg == 'question'){
      //questions
    }
    else if (request.msg == 'answer'){
      //answer
    }
  }
);
