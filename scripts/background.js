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
      switch(response.status){
        case 200:
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
          break;
        default:
          console.log('Error checking couse folder, '+response);
          break;
      }

    });
  });
}

function passAttendance(courseName, names, courseFolderId){
  gapi.client.drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and parents in '"+courseFolderId+"'"
  }).then(async function(response) {
    switch(response.status){
      case 200:
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
          //console.log("sheet id:",sheetId)
          addColumnToSheet(names, sheetId);
        }
        break;
      default:
        console.log('Error taking attendance, '+response);
        break;
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
    //console.log("RESPONSE",response);
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
  var content = gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'A1:Z1000'
  }).then(async(response) => {
    switch(response.status){
      case 200:
        return response.result.values
      default:
        console.log('Error reading the spreadsheet, '+response);
        break;
    }
  });
  return content
}

function manageAttendanceSheetContent(content, names) {
  //if doesnt have content add first column
  if (content == undefined) {
    var content = [["Name"]]
    for (name of names) {
      content.push([name])
    }
  }
  //proceed to add attendance row
  //add date to first row
  var now = new Date()
  var date = now.getMonth() + 1 + '/' + now.getDate() + '/' + now.getFullYear() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds()
  content[0].push(date)
  for (i = 1; i < content.length; i++) {
    if (names.includes(content[i][0])) {
      //if the name is already in the spreadsheet
      //remove the name from names list
      names.splice(names.indexOf(content[i][0]))

      //add a 1 to the end of this row
      content[i].push("1")
    }
    else{
      //add a 0 to the end of this row
      content[i].push("0")
    }
  }
  //add the new names to the content
  for (name of names) {
    var newRow = Array(content[0].length-1).fill("0")
    //add name in he beginning
    newRow.unshift(name);
    //add a 1 to the end
    newRow.push("1")
    //add the new row to the end of the content
    content.push(newRow)
  }
  return content
}

async function addColumnToSheet(names, sheetId){
  var content = await readSheet(sheetId);
  var newContent = manageAttendanceSheetContent(content, names)

  gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    valueInputOption: 'USER_ENTERED',
    values: newContent,
    range: 'A1',
    }).then(function(response) {
      switch(response.status){
        case 200:
          console.log("list added to spreadsheet successfully")
          //send message to content script to show success modal
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "attendanceSuccessful", spreadSheetIdAttendance: sheetId});
          });
          break;
        default:
          console.log('Error updating data in spreadsheet, '+response);
          //send error to content script
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "error"});
          });
          break;
      }
        // console.log('update last: ' + window.LAST);
    });
}

//listeners for communication
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.msg == "initializeApi"){
      chrome.storage.sync.get(['token'], function (token) {
        //set token in api
        gapi.auth.setToken({
          'access_token': token.token
        })
        //create Mr Meet root folder
        gapi.client.drive.files.list({
          q: "name='Mr Meet'"
        }).then( function(response) {
          if (response.result.files.length == 0) {
            console.log('carpeta Mr Meet no existe');
            createFolder("Mr Meet");
          }
          else{
            console.log('carpeta Mr Meet ya existe');
            //set the id of the folder in storage
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
          //save id and name of courses folders in a dictionary and send it to content script
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
