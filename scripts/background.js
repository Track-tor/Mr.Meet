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
        //send error to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error creating the folder"});
        });
        break;
    }
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
          addAttendanceDetailToSheet(names, sheet.id);
        }
        else{
          console.log("creating attendance sheet...");
          var spreadSheetId = await createSpreadSheet(courseName+" Attendance", courseFolderId);
          var sheetDetails = await addSheet(spreadSheetId, "Details");
          var sheetSummary = await addSheet(spreadSheetId, "Summary");
          await addAttendanceSummaryToSheet(spreadSheetId)
          //console.log("sheet id:",spreadSheetId)
          addAttendanceDetailToSheet(names, spreadSheetId);
        }
        break;
      default:
        console.log('Error taking attendance, '+response);
        //send error to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error getting course attendance spreadsheet"});
        });
        break;
    }
  });
}

async function createSpreadSheet(sheetName, courseFolderId){
  var body = {
    'parents': [courseFolderId], 
    'name': sheetName,
    'mimeType': "application/vnd.google-apps.spreadsheet"
  };
  var spreadSheetId = await gapi.client.drive.files.create({
    'resource': body
  }).then((response) => {
    //console.log("RESPONSE",response);
    switch(response.status){
      case 200:
        console.log(response.result)
        return response.result.id
      default:
        console.log('Error creating the spreadsheet, '+response);
        //send error to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error creating course spreadsheet"});
        });
        break;
    }
  });
  return spreadSheetId
}

async function addSheet(spreadSheetId, title) {
  var body = {
    addSheet: {
      properties: {
        title: title,
        index: 0
      }
    }
  };
  var reply = gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadSheetId,
    requests: body
    }).then((response) => {
      switch(response.status){
        case 200:
          console.log(response.result)
          return response.replies
        default:
          console.log('Error adding the sheet, '+response);
          //send error to content script
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error adding the sheet"});
          });
          break;
        }
    })
    return reply
}


function readSheet(spreadSheetId, sheetName){
  var content = gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: spreadSheetId,
    range: sheetName+'!A1:Z1000'
  }).then(async(response) => {
    switch(response.status){
      case 200:
        return response.result.values
      default:
        console.log('Error reading the spreadsheet, '+response);
        //send error to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error reading data in course spreadsheet"});
        });
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
      names.splice(names.indexOf(content[i][0]), 1)

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
    var newRow = Array(content[0].length-2).fill("0")
    //add name in he beginning
    newRow.unshift(name);
    //add a 1 to the end
    newRow.push("1")
    //add the new row to the end of the content
    content.push(newRow)
  }
  return content
}

async function addAttendanceDetailToSheet(names, spreadSheetId){
  var content = await readSheet(spreadSheetId, "Details");
  var newContent = manageAttendanceSheetContent(content, names)

  gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: spreadSheetId,
    valueInputOption: 'USER_ENTERED',
    values: newContent,
    range: 'Details!A1',
    }).then(function(response) {
      switch(response.status){
        case 200:
          console.log("list added to spreadsheet successfully")
          //send message to content script to show success modal
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "attendanceSuccessful", spreadSheetIdAttendance: spreadSheetId});
          });
          break;
        default:
          console.log('Error updating data in spreadsheet, '+response);
          //send error to content script
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error updating data in spreadsheet"});
          });
          break;
      }
    });
}

async function addAttendanceSummaryToSheet(spreadSheetId){
  var formulas = [
    ["={'Details'!A:A}", "Total Attendance", "Attendance Percentage"]
  ]
  for (i = 2; i < 200; i++) {
    formulas.push(["", `=IF(SUM({Details!B${i}:${i}}) = 0; ""; SUM({Details!B${i}:${i}}))`, `=IF(COUNT({Details!B${i}:${i}}) = 0; ""; CONCATENATE(B${i}/COUNT({Details!B${i}:${i}})*100; "%"))`])
  }

  gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: spreadSheetId,
    valueInputOption: 'USER_ENTERED',
    values: formulas,
    range: 'Summary!A1',
    }).then(function(response) {
      switch(response.status){
        case 200:
          console.log("summary formulas added to spreadsheet successfully")
          break;
        default:
          console.log('Error updating summary formulas in spreadsheet, '+response);
          //send error to content script
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error updating summary formulas in spreadsheet"});
          });
          break;
      }
    });
}

// QUESTION FUNCTIONS
function checkQuestionSheet(courseName, courseFolderId){
  gapi.client.drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and parents in '"+courseFolderId+"'"
  }).then(async function(response) {
    switch(response.status){
      case 200:
        var exists = false;
        var sheet;
        for (let element of response.result.files){
          if(element.name == courseName+" Questions"){
            exists = true;
            sheet = element
            break;
          }
        }
        if(exists){
          console.log("questions sheet exists...");
          let content = await readSheet(sheet.id, "Questions");
          console.log(content);
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "questionObtained",content: content});
          });
        }
        else{
          console.log("creating questions sheet...");
          let spreadSheetId = await createSpreadSheet(courseName+" Questions", courseFolderId);
          var sheetQuestions = await addSheet(spreadSheetId, "Questions");
          await addQuestionFormatToSheet(spreadSheetId);
        }
        break;
      default:
        console.log('Error getting Questions, '+response);
        //send error to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error getting course questions spreadsheet"});
        });
        break;
    }
  });
}

function addQuestionFormatToSheet(spreadSheetId){
  let exampleQuestion = [["Pregunta de ejemplo","respuesta 1","respuesta 2","respuesta 3","respuesta 4"]]
  gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: spreadSheetId,
    valueInputOption: 'USER_ENTERED',
    values: exampleQuestion,
    range: 'Questions!A1',
    }).then(function(response) {
      switch(response.status){
        case 200:
          console.log("example question added to sheet successfully")
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "questionSheetCreationSuccesful", spreadSheetIdQuestions: spreadSheetId});
          });
          break;
        default:
          console.log('Error adding example question to sheet, '+response);
          //send error to content script
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: 'Error adding example question to sheet'});
          });
          break;
      }
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
          switch(response.status){
            case 200:
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
              break;
            default:
              console.log('Error initializing gapi, '+response);
              //send error to content script
              chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error initializing gapi"});
              });
              break;
          }


        });
      })
    }
    else if (request.msg == "attendance"){
      //if is a new course
      if (request.courseFolderId == null) {
        chrome.storage.sync.get(['mrmeetid'], function (mrmeetid) {
          createFolder(request.courseName, true, mrmeetid.mrmeetid, request.names);
        })
      }
      else {
        passAttendance(request.courseName, request.names, request.courseFolderId);
      }
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
          switch(response.status){
            case 200:
              var courseNames = {};
              //save id and name of courses folders in a dictionary and send it to content script
              for (let element of response.result.files){
                courseNames[element.id] = element.name;
              }
              chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (request.type == 'attendance'){
                  chrome.tabs.sendMessage(tabs[0].id, {msg: "sendCourses", courses: courseNames});
                }
                else if(request.type == 'questions'){
                  chrome.tabs.sendMessage(tabs[0].id, {msg: "sendCoursesForQuestions", courses: courseNames});
                }
                
              });
              break;
            default:
              console.log('Error getting courses, ');
              console.log(response)
              //send error to content script
              chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {msg: "error", text: "Error getting courses"});
              });
              break;
          }
        });
      });
    }
    else if (request.msg == "getQuestions"){
      checkQuestionSheet(request.courseName ,request.courseFolderId);
    }
  }
);
