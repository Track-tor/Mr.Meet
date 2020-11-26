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
        else if (request.msg == "sendCourses"){
            //console.log(request.courses);
            showAttendanceModal(request.courses);
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

    }
);

//renders the layout of the extension
function addLayout(){
    let sidePanel = document.querySelector('div[jsname="Kzha2e"]');// obtener el tablero con botones del panel derecho
    
    if(sidePanel){

        if (!document.querySelector('#extraBoard')) {
            //Creamos un tablero de botones extra, para las funcionalidades no locales
            let extraBoard = document.createElement("div");
            extraBoard.setAttribute("id","extraBoard");
            extraBoard.setAttribute("class","uFGEzd");

            //ATTENDANCE BUTTON
            let attendanceButton = document.createElement("span");//creamos una division dentro del tablero
            attendanceButton.setAttribute("jscontroller","eqDgk");
        
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

            attendanceButton.addEventListener("click",() => {getCourses();});//le agregamos la funcion de tomar asistencia
            extraBoard.insertBefore(attendanceButton,null);//insertar el boton en el tablero extra

            sidePanel.insertAdjacentElement('afterend',extraBoard); //insertamos el tablero extra abajo del tablero inicial.
        }

    }
}


function getCourses(){
      chrome.runtime.sendMessage({msg: 'getCourses'});
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

function scrollList(element, participantIds, participantNames, courseName, courseFolderId) {
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
    if (element.scrollTop > 0) {
        var sl = setTimeout(function () {
        scroll(num)
        }, 200);
    }
}


function collectParticipants(participantIds, participantNames) {
    if (document.querySelectorAll('[role=presentation]').length > 1) {

        var participantDivs = Array.from(document.querySelectorAll('[data-participant-id],[data-requested-participant-id]'));

        participantDivs.forEach((div) => {
        var pid = div.getAttribute("data-participant-id")
        if (pid != null) pid = pid.split('/')[3]
        if (!participantIds.includes(pid) && pid != null) {
            var name = div.querySelector('[data-self-name]')
            if (name) {
                if (!(name.innerHTML == "Tú" || name.innerHTML == "You" || name.innerHTML.includes("Presentación") || name.innerHTML.includes("Presentation"))) {
                    participantNames.push(name.innerHTML)
                    participantIds.push(pid)
                }
            }
        }
        })
        return [participantIds, participantNames]
    }
}