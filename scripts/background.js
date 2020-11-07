const API_KEY = 'AIzaSyCqS8Ur850llY5mXGy9QA7OsCwpx0wweBw';
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest", "https://sheets.googleapis.com/$discovery/rest?version=v4"];


function onGAPILoad() {
  gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOCS,
  });
}

function createFolder(folderName, isCourseFolder = false, mrmeetid = null, names = null, courseFolderId = null) {
  var body = {
    'parents': isCourseFolder ? [mrmeetid] : [] , 
    'name': folderName,
    'mimeType': "application/vnd.google-apps.folder"
  };
  gapi.client.drive.files.create({
    'resource': body
  }).then(function(response) {
    switch(response.status){
      case 200:
        var file = response.result;
        if (!isCourseFolder){
          chrome.storage.sync.set({mrmeetid: file.id}, function() {
            console.log('Created Folder Id: ', file.id);
          });
        }
        else{
          passAttendance(names, courseFolderId);
        }
        break;
      default:
        console.log('Error creating the folder, '+response);
        break;
    }
  });
}

function checkAttendanceFile(courseName, names, courseFolderId){
  chrome.storage.sync.get(['mrmeetid'], function (mrmeetid) {
    gapi.client.drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and parents in '"+mrmeetid.mrmeetid+"'"
    }).then( function(response) {
      var exists = false
      for (let element of response.result.files){
        if(element.name == courseName){
          exists = true;
          break;
        }
      }
      if(exists){
        console.log("course folder exists...");
        passAttendance(courseName, names, courseFolderId);
      }
      else{
        console.log("creating folder...");
        createFolder(courseName, true, mrmeetid.mrmeetid, names, courseFolderId);
      }

    });
  });
}

function passAttendance(courseName, names, courseFolderId){
  console.log(courseName);
  console.log(names);
  console.log(courseFolderId);

  gapi.client.drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and parents in '"+courseFolderId+"'"
  }).then(function(response) {
    var exists = false
    for (let element of response.result.files){
      if(element.name == courseName+" Attendance"){
        exists = true;
        break;
      }
    }
    if(exists){
      console.log("attendance sheet exists...");
      addColumnToSheet();
      
    }
    else{
      console.log("creating attendance sheet...");
      createSheet(courseName, courseFolderId);
      addColumnToSheet();
    }
  });
}

function createSheet(courseName, courseFolderId){
  var body = {
    'parents': [courseFolderId], 
    'name': courseName+" Attendance",
    'mimeType': "application/vnd.google-apps.spreadsheet"
  };
  gapi.client.drive.files.create({
    'resource': body
  }).then((response) => {
    if(response.ok){
      console.log(response.result.id);
    }
    else{
      //TODO: implementar manejo de errores
    }
  });
}


function addColumnToSheet(){

}

//listeners for communication
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
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
      checkAttendanceFile(request.courseName, request.names, request.courseFolderId);
    }
    else if (request.msg == 'question'){
      //questions
    }
    else if (request.msg == 'answer'){
      //answer
    }
    else if (request.msg == 'getCourses'){
      chrome.storage.sync.get(['mrmeetid'], function (mrmeetid) {
        gapi.client.drive.files.list({
          q: "mimeType='application/vnd.google-apps.folder' and parents in '"+mrmeetid.mrmeetid+"'"
        }).then( function(response) {
          var courseNames = {};
          for (let element of response.result.files){
            courseNames[element.id] = element.name;
          }
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "sendCourses", courses: courseNames});
          });
        });
      });
    }
  }
);
