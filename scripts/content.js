//listeners for communication
 var interval;

chrome.extension.onMessage.addListener(
    async function(request, sender, sendResponse) {
        if (request.msg == "start"){
            console.log("Start!");
            sendMessage("setTokenInApi");
            sendMessage("setDriveFolder"); //creates the /mrMeet drive folder
            interval = setInterval(addLayout, 1000);
        }
        else if(request.msg == "stop"){
            console.log("stop!");
            clearInterval(interval);
        }
    }
);

//renders the layout of the extension
function addLayout(){
    let sidePanel = document.querySelector('div[jsname="Kzha2e"]');// obtener el tablero con botones del panel derecho
    
    if(sidePanel){
        clearInterval(interval);

        let muteAllButton = document.createElement("span");//creamos una division dentro del tablero
        muteAllButton.setAttribute("jscontroller","eqDgk");

        muteAllButton.innerHTML = `<div jsshadow="" role="button" class="uArJ5e UQuaGc kCyAyd kW31ib Bs3rEf I9c2Ed M9Bg4d" jscontroller="VXdfxd" jsaction="click:cOuCgd; mousedown:UX7yZ; mouseup:lbsD7e; mouseenter:tfO1Yc; mouseleave:JywGue;touchstart:p6p2H; touchmove:FwuNnf; touchend:yfqBxc(preventMouseEvents=true|preventDefault=true); touchcancel:JMtRjd;focus:AHmuwe; blur:O22p3e; contextmenu:mg9Pef" jsname="BVty0" aria-label="Agregar personas" aria-disabled="false" tabindex="0">
        <div class="Fvio9d MbhUzd" jsname="ksKsZd"></div><div class="e19J0b CeoRYc"></div>
            <span jsslot="" class="l4V7wb Fxmcue">
                <span class="NPEfkd RveJvd snByac">
                    <div class="is878e">
                        <img src="${chrome.runtime.getURL('res/mute.svg')}" width="20">
                    </div>
                    <div class="GdrRqd">mute all</div>
                </span>
            </span>
        </div>`;//le asignamos un formato en HTML
        muteAllButton.addEventListener("click",() => {muteAllMembers();});//le agregamos la funcionalidad de mutear a todos los usuarios
        sidePanel.insertBefore(muteAllButton,null);//insertar el boton en el tablero


        //Creamos un tablero de botones extra, para las funcionalidades no locales
        let extraBoard = document.createElement("div");
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

        attendanceButton.addEventListener("click",() => {showAttendanceModal();});//le agregamos la funcion de tomar asistencia
        extraBoard.insertBefore(attendanceButton,null);//insertar el boton en el tablero extra

        sidePanel.insertAdjacentElement('afterend',extraBoard); //insertamos el tablero extra abajo del tablero inicial.
    }
}

//send a simple message between the components of the extension
function sendMessage(message){
    chrome.runtime.sendMessage({
        msg: message
    });
}


function showAttendanceModal(){
    Swal.fire({
        title: 'Select a Course',
        input: 'select',
        inputOptions: {
            apples: 'Apples',
            bananas: 'Bananas',
            grapes: 'Grapes',
            oranges: 'Oranges'
        },
        inputPlaceholder: 'Select a course',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Take Attendance',
        cancelButtonText: 'Cancel',
        denyButtonText: 'New Course',
        denyButtonColor: 'LightSeaGreen'
    }).then((result) => {
        //Take attendance
        if (result.isConfirmed) {
            console.log(result.value)
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
            showCancelButton: true
            }).then((result2) => {
            //Take attendance
            if (result2.isConfirmed) {
                console.log(result2.value)
            }
            })
        }
    })
}

function attendance(){
    //TODO: MEJORAR
    var participantIds = [];
    var participantNames = [];
    var element = document.querySelector('[role="tabpanel"]')
    element.scrollTop = element.scrollHeight;

    if (element.scrollTop != 0) {
        var participantNames = scrollList(element, participantIds, participantNames, "attendance");
    }
    else {
        let values = collectParticipants(participantIds, participantNames);
        participantIds = values[0];
        participantNames = values[1];
        console.log(participantNames);
    }
}

function scrollList(element, participantIds, participantNames, type) {
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
                    msg: 'attendance',
                    names: participantNames,
                    ids: participantIds,
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
            if (!(
                name.innerHTML == "Tú" ||
                name.innerHTML == "You"
            )) {
                participantNames.push(name.innerHTML)
                participantIds.push(pid)
            }

            }
        }
        })
        return [participantIds, participantNames]
    }
}