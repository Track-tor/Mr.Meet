  // Select the node that will be observed for mutations
  
  const config = { childList: true, subtree: true };
  var flag = true
  var isStudent = true;
  
  // Callback function to execute when mutations are observed
  const callback = function(mutationsList, observer) {
      if (flag) {
          flag = false
        // Use traditional 'for loops' for IE 11
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                //console.log(mutation.addedNodes)
                if (mutation && mutation.addedNodes && mutation.addedNodes[0] && mutation.addedNodes[0].innerText) {
                    var message = mutation.addedNodes[0].innerText
                    if (isStudent) {
                        console.log("soy estudiante! "+ message)
                    }
                    else {
                        console.log("soy admin! "+ message)
                    }
                    break
                }
            }
        }
    }
    else {
        flag = true
    }
  };
  
// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

//listeners for communication
 var interval;

 chrome.storage.sync.get(['key'], function (result) {
    if (result.key) {
        chrome.runtime.sendMessage({msg: 'initializeApi'});//intitializes api token and sets the Mr meet folder in drive
        interval = setInterval(addLayout, 500);
    }
 });

chrome.extension.onMessage.addListener(
    async function(request, sender, sendResponse) {
        if (request.msg == "start"){
            chrome.runtime.sendMessage({msg: 'initializeApi'});//intitializes api token and sets the Mr meet folder in drive
            interval = setInterval(addLayout, 500);
        }
        else if(request.msg == "stop"){
            clearInterval(interval);
            if (document.querySelector('#extraBoard')) {
                document.querySelector('#extraBoard').remove()
            }
        }
        //si nos llegan los cursos para asistencia
        else if (request.msg == "sendCourses"){
            showAttendanceModal(request.courses);
        }
        //si nos llegan los cursos para asistencia
        else if (request.msg == "sendCoursesForQuestions"){
            selectCourseQuestionsModal(request.courses);
        }
        else if (request.msg == "error") {
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Something went wrong',
                text: request.text,
                showConfirmButton: false,
                timer: 1500
            })
        }
        else if (request.msg == "attendanceSuccessful") {
            Swal.fire({
            title: 'Attendance taken successfully',
            text: "Do you want to open it?",
            icon: "success",
            showCancelButton: true,
            confirmButtonText: 'Open'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open("https://docs.google.com/spreadsheets/d/" + request.spreadSheetIdAttendance, "_blank",);
                }
            })
        }
        else if (request.msg == "questionSheetCreationSuccesful"){
            Swal.fire({
                title: 'Your Question Sheet has been Created Successfully',
                text: "Do you want to open it?",
                icon: "success",
                showCancelButton: true,
                confirmButtonText: 'Open'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.open("https://docs.google.com/spreadsheets/d/" + request.spreadSheetIdQuestions, "_blank",);
                    }
                })
        }
        else if (request.msg == "questionObtained"){
            let questions = request.content.map(function(x){
                return x[0];
            })
            console.log(questions);
            Swal.fire({
                title: 'Select a Question from your sheet',
                input: 'select',
                html:'<input type="time" id="timepicker" class="form-control" autofocus>',
                inputOptions: questions,
                inputPlaceholder: 'Select a question',
                showCancelButton: true,
                confirmButtonText: 'Send',
                cancelButtonText: 'Cancel',
                inputValidator: (value) => {
                    return new Promise((resolve) => {
                      if (value) {
                        resolve()
                      } else {
                        resolve('You need to select a question')
                      }
                    })
                },
                onOpen: function() {
                    $('#timepicker').timepicker({
                        format: 'hh:mm'
                    });
                }
            })
            //TODO: send quesiton through chat
        }
    }
);

//renders the layout of the extension
function addLayout(){
    let sidePanel = document.querySelector('div[jsname="Kzha2e"]') //tablero de botones
    let panel = document.querySelector('[class=pw1uU]');// obtener el panel
    
    if(panel){ // si el panel esta abierto
        // Start observing the target node for configured mutations
        const targetNode = document.querySelector('[jsname=xySENc]');
        observer.observe(targetNode, config);

        if (sidePanel) {
            isStudent = false
            if (!document.querySelector('#extraBoard')) {
            //Creamos un tablero de botones extra, para las funcionalidades no locales
            let extraBoard = document.createElement("div");
            extraBoard.setAttribute("id","extraBoard");
            extraBoard.setAttribute("class", "Lf3gob");

            //ATTENDANCE BUTTON
            let attendanceButton = document.createElement("div");//creamos una division dentro del tablero
        
            attendanceButton.innerHTML = `<div jsshadow="" role="button" class="uArJ5e UQuaGc kCyAyd kW31ib Bs3rEf I9c2Ed M9Bg4d" jscontroller="VXdfxd" jsaction="click:cOuCgd; mousedown:UX7yZ; mouseup:lbsD7e; mouseenter:tfO1Yc; mouseleave:JywGue;touchstart:p6p2H; touchmove:FwuNnf; touchend:yfqBxc(preventMouseEvents=true|preventDefault=true); touchcancel:JMtRjd;focus:AHmuwe; blur:O22p3e; contextmenu:mg9Pef" jsname="BVty0" aria-label="Agregar personas" aria-disabled="false" tabindex="0">
                <div class="Fvio9d MbhUzd" jsname="ksKsZd"></div><div class="e19J0b CeoRYc"></div>
                <span jsslot="" class="l4V7wb Fxmcue">
                    <span class="NPEfkd RveJvd snByac">
                        <div class="is878e">
                            <img src="${chrome.runtime.getURL('res/attendance.svg')}" width="20">
                        </div>
                        <div class="GdrRqd">Attendance</div>
                    </span>
                </span>
            </div>`;//le asignamos un formato en HTML

            attendanceButton.addEventListener("click",() => {getCourses('attendance');});//le agregamos la funcion de tomar asistencia
            extraBoard.insertBefore(attendanceButton,null);//insertar el boton en el tablero extra

            //QUESTIONS BUTTON
            let questionButton = document.createElement("div");//creamos una division dentro del tablero
        
            questionButton.innerHTML = `<div jsshadow="" role="button" class="uArJ5e UQuaGc kCyAyd kW31ib Bs3rEf I9c2Ed M9Bg4d" jscontroller="VXdfxd" jsaction="click:cOuCgd; mousedown:UX7yZ; mouseup:lbsD7e; mouseenter:tfO1Yc; mouseleave:JywGue;touchstart:p6p2H; touchmove:FwuNnf; touchend:yfqBxc(preventMouseEvents=true|preventDefault=true); touchcancel:JMtRjd;focus:AHmuwe; blur:O22p3e; contextmenu:mg9Pef" jsname="BVty0" aria-label="Agregar personas" aria-disabled="false" tabindex="0">
                <div class="Fvio9d MbhUzd" jsname="ksKsZd"></div><div class="e19J0b CeoRYc"></div>
                <span jsslot="" class="l4V7wb Fxmcue">
                    <span class="NPEfkd RveJvd snByac">
                        <div class="is878e">
                            <img src="${chrome.runtime.getURL('res/question.svg')}" width="20">
                        </div>
                        <div class="GdrRqd">Questions</div>
                    </span>
                </span>
            </div>`;//le asignamos un formato en HTML

            questionButton.addEventListener("click",() => {getCourses('questions');});//le agregamos la funcion de tomar asistencia
            extraBoard.insertBefore(questionButton,null);//insertar el boton en el tablero extra

            //RANDOM SELECT BUTTON
            let randomSelectButton = document.createElement("div");//creamos una division dentro del tablero

            randomSelectButton.innerHTML = `<div jsshadow="" role="button" class="uArJ5e UQuaGc kCyAyd kW31ib Bs3rEf I9c2Ed M9Bg4d" jscontroller="VXdfxd" jsaction="click:cOuCgd; mousedown:UX7yZ; mouseup:lbsD7e; mouseenter:tfO1Yc; mouseleave:JywGue;touchstart:p6p2H; touchmove:FwuNnf; touchend:yfqBxc(preventMouseEvents=true|preventDefault=true); touchcancel:JMtRjd;focus:AHmuwe; blur:O22p3e; contextmenu:mg9Pef" jsname="BVty0" aria-label="Agregar personas" aria-disabled="false" tabindex="0">
                <div class="Fvio9d MbhUzd" jsname="ksKsZd"></div><div class="e19J0b CeoRYc"></div>
                <span jsslot="" class="l4V7wb Fxmcue">
                    <span class="NPEfkd RveJvd snByac">
                        <div class="is878e">
                        <svg width="24" height="24" viewBox="0 0 24 24" focusable="false" class="Hdh4hc cIGbvc NMm5M"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17l-.59.59-.58.58V4h16v12z"></path><path d="M11 12h2v2h-2zm0-6h2v4h-2z"></path></svg>
                        </div>
                        <div class="GdrRqd">Random Select</div>
                    </span>
                </span>
            </div>`;//le asignamos un formato en HTML

            randomSelectButton.addEventListener("click",() => {showRandomSelectModal();});//le agregamos la funcion de tomar asistencia
            extraBoard.insertBefore(randomSelectButton,null);//insertar el boton en el tablero extra

            sidePanel.insertAdjacentElement('afterend',extraBoard); //insertamos el tablero extra abajo del tablero inicial.
            }
        }
    }
}

// FUNCIONALIDAD DE ASISTENCIA
function getCourses(type){
    chrome.runtime.sendMessage({
        msg: 'getCourses',
        type: type
    });
}


function getQuestions(){
    chrome.runtime.sendMessage({msg: 'getCourses'});
}

function showRandomSelectModal() {
    Swal.fire({
        title: 'Are you sure?',
        text: "A student will be selected at random and their microphone will be activated",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Select random'
      }).then((result) => {
        if (result.isConfirmed) {
          randomSelect()
        }
      })
}


function showAttendanceModal(courses){
    Swal.fire({
        title: 'Select a Course',
        input: 'select',
        inputOptions: courses,
        inputPlaceholder: 'Select a course',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Take Attendance',
        cancelButtonText: 'Cancel',
        denyButtonText: 'New Course',
        denyButtonColor: 'LightSeaGreen',
        inputValidator: (value) => {
            return new Promise((resolve) => {
              if (value) {
                resolve()
              } else {
                resolve('You need to select a course')
              }
            })
        }
    }).then((result) => {
        //Take attendance
        if (result.isConfirmed && result.value) {
            Swal.fire({
                title: 'Taking attendance...',
                allowEscapeKey: false,
                allowOutsideClick: false,
                onOpen: () => {
                    Swal.showLoading();
                }
            })
            attendance(courses[result.value], result.value);
        }
        //Modal to create new course
        else if (result.isDenied) {
            Swal.fire({
                title: 'Create a new course list',
                input: 'text',
                inputPlaceholder: 'Type your course name here...',
                inputAttributes: {
                    'aria-label': 'Type your course name here'
                },
                showCancelButton: true,
                inputValidator: (value) => {
                    return new Promise((resolve) => {
                      if (Object.values(courses).includes(value)) {
                        resolve('This course already exists')
                      } else {
                        resolve()
                      }
                    })
                }
                }).then((result2) => {
                //Take attendance
                if (result2.isConfirmed) {
                    Swal.fire({
                        title: 'Creating necessary files...',
                        allowEscapeKey: false,
                        allowOutsideClick: false,
                        onOpen: () => {
                            Swal.showLoading();
                        }
                    })
                    attendance(result2.value);
                }
            })
        }
    })
}

function attendance(courseName, courseFolderId = null){
    //TODO: MEJORAR
    var participantIds = [];
    var participantNames = [];
    var element = document.querySelector('[role="tabpanel"]')
    element.scrollTop = element.scrollHeight;

    //the panel is scrolleable
    if (element.scrollTop != 0) {
        var participantNames = scrollList(element, participantIds, participantNames, courseName, courseFolderId);
    }
    //the panel is not scrolleable
    else {
        let values = collectParticipants(participantIds, participantNames);
        //check if there are participants
        if (values != undefined) {
            participantIds = values[0];
            participantNames = values[1];
            //console.log(participantNames);
            var data = {
                msg: "attendance",
                names: participantNames,
                ids: participantIds,
                courseName: courseName,
                courseFolderId: courseFolderId,
                meet_id: window.location.href.split('/').pop()
            }
            //send message to background
            chrome.runtime.sendMessage(data);
        }
        //there are not participants in the meet
        else {
            Swal.fire({
                icon: 'info',
                title: 'Something went wrong',
                text: "There are not participants in the meet",
                showConfirmButton: true,
                onOpen: () => {
                    Swal.hideLoading();
                }
            })
        }
    }
}

function scrollList(element, participantIds, participantNames, courseName = null, courseFolderId = null) {
    var num = element.scrollTop
    function scroll(n) {
        element.scrollTop = n
        num = n - 100
        if (element.scrollTop > 0) {
        var sl = setTimeout(function () {
            scroll(num)
            let values = collectParticipants(participantIds, participantNames);
            participantIds = values[0]
            participantNames = values[1]
        }, 200);
        }
        else {
            //if the scroll come from the random select
            if (courseName == null && courseFolderId == null) {
                setTimeout(function () {
                    var selectedParticipant = participantIds[Math.floor(Math.random() * participantIds.length)];
                    sendChatMessage(selectedParticipant)
                }, 300);
            }
            //if the scroll come from the attendance
            else {
                setTimeout(function () {
                    console.log("Value is set to " + participantNames);
                    var data = {
                        msg: "attendance",
                        names: participantNames,
                        ids: participantIds,
                        courseName: courseName,
                        courseFolderId: courseFolderId,
                        meet_id: window.location.href.split('/').pop()
                    }
                    chrome.runtime.sendMessage(data);
                }, 300);
            }
        }
    }
    if (element.scrollTop > 0) {
        var sl = setTimeout(function () {
        scroll(num)
        }, 200);
    }
}


function collectParticipants(participantIds, participantNames) {
    if (document.querySelectorAll('[role=listitem]').length > 1) {
        var participantDivs = Array.from(document.querySelectorAll('[role=listitem]'));
        participantDivs.forEach((div) => {
        var pid = div.getAttribute("data-participant-id")
        if (pid != null) pid = pid.split('/')[3]
        if (!participantIds.includes(pid) && pid != null) {
            var name = div.querySelector('[class=ZjFb7c]')
            if (name) {
                if (!(div.querySelector('[class=QMC9Zd]') || (div.querySelector('[class=jcGw9c]')))) {
                    participantNames.push(name.innerHTML);
                    participantIds.push(pid);
                }
            }
        }
        })
        return [participantIds, participantNames]
    }
}



//FUNCIONALIDAD DE PREGUNTAS

function selectCourseQuestionsModal(courses){
    Swal.fire({
        title: 'Select a Course',
        input: 'select',
        inputOptions: courses,
        inputPlaceholder: 'Select a course',
        showCancelButton: true,
        confirmButtonText: 'Get Questions',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
            return new Promise((resolve) => {
              if (value) {
                resolve()
              } else {
                resolve('You need to select a course')
              }
            })
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            Swal.fire({
                title: 'Preparing Questions',
                allowEscapeKey: false,
                allowOutsideClick: false,
                onOpen: () => {
                    Swal.showLoading();
                }
            })
            getQuestions(courses[result.value], result.value);
        }
    })
}

function getQuestions(courseName, courseFolderId){
    chrome.runtime.sendMessage({
        msg: 'getQuestions',
        courseName: courseName,
        courseFolderId: courseFolderId
    });
}

async function randomSelect() {
    var participantIds = [];
    var participantNames = [];
    var element = document.querySelector('[role="tabpanel"]')
    element.scrollTop = element.scrollHeight;
  
    if (element.scrollTop != 0) {
      var participantNames = scrollList(element, participantIds, participantNames);
    }
    else {
      let values = collectParticipants(participantIds, participantNames);
      //check if there are participants
      if (values != undefined) {
        participantIds = values[0]
        participantNames = values[1]
        var selectedParticipant = participantIds[Math.floor(Math.random() * participantIds.length)];

        sendChatMessage(selectedParticipant)
      }
      else {
        Swal.fire({
            icon: 'info',
            title: 'Something went wrong',
            text: "There are not participants in the meet",
            showConfirmButton: true,
            onOpen: () => {
                Swal.hideLoading();
            }
        })
    }
    }
  }

  function sendChatMessage(message) {
    //Allow chat messages to true
    if (!document.querySelectorAll('[jsname=YPqjbf]')[0].checked) {
        document.querySelectorAll('[jsname=YPqjbf]')[0].click()
    }
    //Send message
    document.querySelectorAll('[jsname=YPqjbf]')[1].value = message
    document.querySelector('[jsname=SoqoBf]').removeAttribute("aria-disabled")
    document.querySelector('[jsname=SoqoBf]').click()
  }