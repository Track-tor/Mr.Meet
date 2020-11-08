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
        var folder = response.result;
        if ((!isCourseFolder) && (courseFolderId == null)){
          chrome.storage.sync.set({mrmeetid: folder.id}, function() {
            console.log('Created Folder Id: ', folder.id);
          });
        }
        else{
          passAttendance(folderName, names, folder.id);
        }
        break;
      default:
        console.log('Error creating the folder, '+response);
        break;
    }
  });
}

function checkAttendanceFolder(courseName, names, courseFolderId){
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
        //TODO: hacer un dialog en content para mostrar que ya existe el curso
        passAttendance(courseName, names, courseFolderId);
      }
      else{
        console.log("creating folder...");
        createFolder(courseName, true, mrmeetid.mrmeetid, names);
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
  }).then(async function(response) {
    var exists = false;
    var sheet;
    for (let element of response.result.files){
      if(element.name == courseName+" Attendance"){
        exists = true;
        sheet = element
        break;
      }
    }
    if(exists){
      console.log("attendance sheet exists...");
      addColumnToSheet(names, sheet.id);
    }
    else{
      console.log("creating attendance sheet...");
      var sheetId = await createSheet(courseName, courseFolderId);
      console.log("sheet id:",sheetId)
      addColumnToSheet(names, sheetId);
    }
  });
}

async function createSheet(courseName, courseFolderId){
  var body = {
    'parents': [courseFolderId], 
    'name': courseName+" Attendance",
    'mimeType': "application/vnd.google-apps.spreadsheet"
  };
  var sheetId = await gapi.client.drive.files.create({
    'resource': body
  }).then((response) => {
    console.log("RESPONSE",response);
    switch(response.status){
      case 200:
        return response.result.id
      default:
        console.log('Error creating the spreadsheet, '+response);
        break;
    }
  });
  return sheetId
}


function readSheet(sheetId){
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'A1:Z1000'
  }).then((response) => {
    console.log(response.result);
  });
}


function addColumnToSheet(names, sheetId){
  readSheet(sheetId);
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
            chrome.storage.sync.set({mrmeetid: response.result.files[0].id}, function() {
              console.log('Setted Folder Id: ', response.result.files[0].id);
            });
          }
        });
      })
    }
    else if (request.msg == "checkAttendance"){
      checkAttendanceFolder(request.courseName, request.names, request.courseFolderId);
    }
    else if (request.msg == "attendance"){
      passAttendance(request.courseName, request.names, request.courseFolderId);
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
