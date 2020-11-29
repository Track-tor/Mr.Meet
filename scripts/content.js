// Select the node that will be observed for mutations

const config = { childList: true, subtree: true };
var isStudent = true;
var myId
var checkingForAnswers = false
var defaultCourse = ""
var answers //current answers
var question  //current question

// Callback function to execute when mutations are observed in chat panel
const callback = function(mutationsList, observer) {
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            if (mutation && mutation.addedNodes && mutation.addedNodes[0] && mutation.addedNodes[0].innerText) {
                var message = mutation.addedNodes[0].innerText
                console.log("chat mutation");
                if (isStudent) {
                    processMessageToStudent(message)
                }
                else {
                    processMessageToAdmin(message)
                }
                replaceChatMessages()
                break
            }
        }
    }
};

// Callback function to execute when mutations are observed in popup chat messages
const callback2 = function(mutationsList, observer) {
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            if (mutation && mutation.addedNodes && mutation.addedNodes[0] && mutation.addedNodes[0].innerText) {
                console.log(mutation.addedNodes[0])
                console.log(typeof mutation.addedNodes[0])
                if (mutation.addedNodes[0].querySelector('.mVuLZ.xtO4Tc')) {
                    //only notify the mutation if the rightPanel is closed
                    if(!document.querySelector('[class=pw1uU]')){
                        var message = mutation.addedNodes[0].querySelector('.mVuLZ.xtO4Tc').innerText
                        console.log("popup mutation");
                        if (isStudent) {
                            processMessageToStudent(message);
                        }
                        else {
                            processMessageToAdmin(message);
                        }
                    }
                    replacePopupChatMessages();
                    break
                }
            }
        }
    }
};
  
// Create observer instances linked to the callback functions
const observer = new MutationObserver(callback);
const observer2 = new MutationObserver(callback2);

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
        else if (request.msg == "questionsObtained"){
            let questions = request.content.map(function(x){
                return x[0];
            })
            Swal.fire({
                title: 'Select a Question from your sheet',
                input: 'select',
                html:   '<label for="timepicker">Time to answer: </label><input id="timepicker" type="time" max="01:59:59" step="1"> <br/>'+
                        '2 additional seconds will be given to register answers!',
                inputOptions: questions,
                inputPlaceholder: 'Select a question',
                showCancelButton: true,
                confirmButtonText: 'Send',
                cancelButtonText: 'Cancel',
                inputValidator: (value) => {
                    return new Promise((resolve) => {
                      if (value) {
                          if(document.querySelector("#timepicker").valueAsNumber%3600000){
                            resolve()
                          }
                          else{
                            resolve('You need to set a valid time')
                          }
                      } else {
                        resolve('You need to select a question')
                      }
                    })
                }
            }).then((result) => {
                if(result.dismiss == Swal.DismissReason.backdrop || result.dismiss == Swal.DismissReason.cancel){
                    console.log("Modal has been forcefully closed!")
                }
                else{
                    let timeAsNumber = document.querySelector("#timepicker").valueAsNumber%3600000;
                    checkingForAnswers = true;

                    question = request.content[(result.value)][0] //set the current question to the selected one
                    answers = request.content[(result.value)].slice(1).map(function(x){
                        return [x];
                    }) //map the current question to an array of arrays, with each array having the alternative in the corresponding index
                    answers.push(["Not answered"]); //add a last option for unanswered question

                    sendChatMessage("question/"+request.content[(result.value)].join(",")+"/"+timeAsNumber.toString());

                    let timerInterval
                    const Toast = Swal.mixin({
                        toast: true,
                        position: 'top-start',
                        showConfirmButton: false,
                        timer: timeAsNumber+2000,
                        timerProgressBar: true
                    })

                    Toast.fire({
                        icon: 'info',
                        html: 'Time left for students to answer: <b></b> seconds.',
                        onOpen: () => {
                            timerInterval = setInterval(() => {
                                const content = Swal.getContent()
                                if (content) {
                                    const b = content.querySelector('b')
                                    if (b) {
                                        b.textContent = Math.ceil(Swal.getTimerLeft()/1000)
                                    }
                                }
                            }, 100)
                        },
                        onClose: () => {
                            clearInterval(timerInterval)
                        }
                    }).then(function(){
                        checkingForAnswers = false;
                        logAnswers(request.courseFolderId);
                        Swal.fire({
                            title: 'Logging answers...',
                            allowEscapeKey: false,
                            allowOutsideClick: false,
                            onOpen: () => {
                                Swal.showLoading();
                            }
                        })
                    })
                }
            })
        }
        else if(request.msg == "answersLogged"){

            let dataset = answers.map(function(x){
                return x.length -1
            })

            let labels = answers.map(function(x){
                return x[0]
            })

            let [backgroundColor,borderColor] = [[],[]]
            for (let i = 0; i < answers.length; i++){
                let colors = generateColor()
                backgroundColor.push(colors[0]);
                borderColor.push(colors[1]);
            }
            Swal.fire({
                html:`Here's a quick summary:</br><canvas id="myChart" width="400" height="400"></canvas></br>Do you wish to see them?`,
                title: "Your students' answers have been Logged Successfully!",
                icon: "success",
                showCancelButton: true,
                cancelButtonText: 'close',
                confirmButtonText: 'See Sheet',
                onOpen: () =>{
                    var ctx = document.getElementById('myChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: "Your students' answers",
                                data: dataset,
                                backgroundColor: backgroundColor,
                                borderColor: borderColor,
                                borderWidth: 1
                            }]
                        },
                        options: {}
                    });
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open("https://docs.google.com/spreadsheets/d/" + request.spreadSheetIdAnswers, "_blank",);
                }
            })
        }
    }
);

//renders the layout of the extension
function addLayout(){
    let buttonBoard = document.querySelector('div[jsname="Kzha2e"]') //tablero de botones
    let panel = document.querySelector('[class=pw1uU]');// obtener el panel

    //observe popups
    const chatPopup = document.querySelector('.NSvDmb.cM3h5d')
    if (chatPopup) {
        observer2.observe(chatPopup, config);
    }
    
    if(panel){ // si el panel esta abierto
        //reemplazamos los mensajes del chat con comandos
        replaceChatMessages()

        // observe chat panel if panel is open
        const chatPanel = document.querySelector('[jsname=xySENc]');
        if (chatPanel){
            observer.observe(chatPanel, config);
        }
    
        myId = document.querySelector('[class=GvcuGe]').firstChild.getAttribute('data-participant-id').split('/').pop()

        //si es admin
        if (buttonBoard) {
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

            questionButton.addEventListener("click",() => {
                console.log(checkingForAnswers);
                if(!checkingForAnswers){
                    getCourses('questions');
                }
            });//le agregamos la funcion de tomar asistencia
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

            buttonBoard.insertAdjacentElement('afterend',extraBoard); //insertamos el tablero extra abajo del tablero inicial.
            }
        }
    }
}

// FUNCIONALIDAD DE ASISTENCIA
function getCourses(type){
    if (document.querySelectorAll('[role=listitem]').length > 1) { 
        chrome.runtime.sendMessage({
            msg: 'getCourses',
            type: type
        });
    }
    else{
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
        inputValue: defaultCourse,
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
            defaultCourse = result.value
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
                    var randomNumber = Math.floor(Math.random() * participantIds.length)
                    var selectedParticipant = participantIds[randomNumber];

                    sendChatMessage("selectStudent/" + selectedParticipant)

                    Swal.fire(
                        participantNames[randomNumber] + ' has been selected',
                        'His microphone has been activated',
                        'question'
                    )

                }, 300);
            }
            //if the scroll come from the attendance
            else {
                setTimeout(function () {
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
        inputValue: defaultCourse,
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
            defaultCourse = result.value
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
        var randomNumber = Math.floor(Math.random() * participantIds.length)
        var selectedParticipant = participantIds[randomNumber];

        sendChatMessage("selectStudent/" + selectedParticipant)

        Swal.fire(
            participantNames[randomNumber] + ' has been selected',
            'His microphone has been activated',
            'success'
        )

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
    if(document.querySelectorAll('[jsname=YPqjbf]').length == 1){
        document.querySelectorAll('[jsname=YPqjbf]')[0].value = message
    }
    else{
        document.querySelectorAll('[jsname=YPqjbf]')[1].value = message
    }
    document.querySelector('[jsname=SoqoBf]').removeAttribute("aria-disabled")
    document.querySelector('[jsname=SoqoBf]').click()
}

function processMessageToStudent(message) {
    if (message.includes("selectStudent/")){
        selectedId = message.split('/').pop()
        
        if (selectedId == myId) {
            var isMuted = document.querySelector('[jsname=BOHaEe]').getAttribute('data-is-muted')
            if (isMuted) {
                document.querySelector('[jsname=BOHaEe]').click()
            }
            Swal.fire(
                'You have been selected',
                'Your microphone has been activated',
                'question'
            )
        }
    }

    else if (message.includes("question/")) {
        let incomingMessage = message.split("/");
        let alternatives = incomingMessage[1].split(",");
        let time = parseInt(incomingMessage[incomingMessage.length-1], 10);

        let question = alternatives.shift();

        let inputOptions = {}
        for(const [i,alternative] of alternatives.entries()){
            inputOptions[i] = alternative
        }

        openRightPanel()

        let timerInterval
        Swal.fire({
            title: question,
            html:"Time left to answer: <b></b> seconds.",
            input: 'radio',
            allowOutsideClick: false,
            allowEscapeKey: false,
            inputOptions: inputOptions,
            timer: time,
            timerProgressBar: true,
            inputValidator: (value) => {
              if (!value) {
                return 'You need to choose something!'
              }
            },
            onOpen: () => {
                timerInterval = setInterval(() => {
                    const content = Swal.getContent()
                    if (content) {
                        const b = content.querySelector('b')
                        if (b) {
                            b.textContent = Math.ceil(Swal.getTimerLeft()/1000)
                        }
                    }
                }, 100)
            },
            onClose: () => {
                clearInterval(timerInterval)
            }
        }).then(function(result){
            //if the modal closed because of the timer 
            if (result.dismiss === Swal.DismissReason.timer) {
                sendChatMessage("answer/"+alternatives.length+","+getMyName())
            }
            else{
                sendChatMessage("answer/"+result.value+","+getMyName())
            }
        })
    }
}

function processMessageToAdmin(message) {
    if (message.includes("answer/") && checkingForAnswers) {
        let [answerIndex, name] = message.split("/")[1].split(",");
        answers[answerIndex].push(name);
    }
}

function replaceChatMessages() {
    var chatMessages = document.querySelectorAll('.oIy2qc');
    for (let message of chatMessages) {
      if (isStudent) {
        if (message.innerText.includes("selectStudent/"))
          message.innerText = "The teacher has selected a random student";
        else if (message.innerText.includes("question/"))
          message.innerText = "The teacher has sent the question: " + message.innerText.split("/")[1].split(',')[0];
        else if (message.innerText.includes("answer/"))
          message.innerText = message.innerText.split(',').pop() + " has answered the question";
      }
  
      else {
        if (message.innerText.includes("selectStudent/"))
          message.innerText = "A random student has been unmuted";
        else if (message.innerText.includes("question/"))
          message.innerText = "You have sent the question: " + message.innerText.split("/")[1].split(',')[0];
        else if (message.innerText.includes("answer/")){
            message.innerText = message.innerText.split(',').pop() + " has answered: " + answers[parseInt(message.innerText.split("/")[1].split(',')[0])][0];
        }
      }
    }
  }

function replacePopupChatMessages() {
    var chatMessages = document.querySelectorAll('.mVuLZ.xtO4Tc')
    for (let message of chatMessages) {
        if (isStudent) {
            if (message.innerText.includes("selectStudent/"))
                message.innerText = "The teacher has selected a random student";
            else if (message.innerText.includes("question/"))
                message.innerText = "The teacher has sent a question";
            else if (message.innerText.includes("answer/"))
                message.innerText = message.innerText.split(',').pop() + " has answered the question";
            }

        else {
            if (message.innerText.includes("selectStudent/")) 
                message.innerText = "A random student has been unmuted";
            else if (message.innerText.includes("question/"))
                message.innerText = "You have sent a question";
            else if (message.innerText.includes("answer/"))
                message.innerText = message.innerText.split(',').pop() + " has answered: " + answers[parseInt(message.innerText.split("/")[1].split(',')[0])][0];
        }
    }
}


function getMyName(){
    let scripts = document.getElementsByTagName("script");
    let script
    let code = /key: 'ds:8'/gi;
    for(i = 0;i < scripts.length; i++){
        if(code.test(scripts[i].innerHTML)){
            script = scripts[i];
            break;
        }
    }

    if(script){
        script = script.innerHTML.replace(/AF_initDataCallback\(|\)/gi,"");
        eval('var scr='+script);
        return scr.data[6];
    }
}

function openRightPanel(){
    let panel = document.querySelector('[class=pw1uU]');// obtener el panel
    if(!panel){
        document.querySelector(".uArJ5e.UQuaGc.kCyAyd.QU4Gid.foXzLb.IeuGXd").click();
    }
}

function logAnswers(courseFolderId){
    chrome.runtime.sendMessage({
        msg: 'logAnswers',
        question: question,
        answers: answers,
        courseFolderId: courseFolderId
    });
}

function generateColor(){
    const max = 255, o = Math.round, r = Math.random
    let R = o(r()*max), G = o(r()*max), B = o(r()*max)
    return [`rgba(${R}, ${G}, ${B}, 0.2)`,`rgba(${R}, ${G}, ${B}, 1)`]
}