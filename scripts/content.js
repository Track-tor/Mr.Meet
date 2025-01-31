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
        //si nos llegan los cursos para preguntas
        else if (request.msg == "sendCoursesForQuestions"){
            if(Object.keys(request.courses).length){
                selectCourseQuestionsModal(request.courses);
            }
            else{
                Swal.fire({
                    position: 'center',
                    icon: 'info',
                    title: chrome.i18n.getMessage("no_courses_available"),
                    text: chrome.i18n.getMessage("no_courses_modal_text"),
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        }
        else if (request.msg == "error") {
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: chrome.i18n.getMessage("something_went_wrong"),
                text: request.text,
                showConfirmButton: false,
                timer: 1500
            })
        }
        else if (request.msg == "attendanceSuccessful") {
            Swal.fire({
            title: chrome.i18n.getMessage("attendance_taken"),
            text: chrome.i18n.getMessage("open_message"),
            icon: "success",
            showCancelButton: true,
            confirmButtonText: chrome.i18n.getMessage("open")
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open("https://docs.google.com/spreadsheets/d/" + request.spreadSheetIdAttendance, "_blank",);
                }
            })
        }
        else if (request.msg == "questionSheetCreationSuccesful"){
            Swal.fire({
                title: chrome.i18n.getMessage("question_modal_sheet_created"),
                text: chrome.i18n.getMessage("open_message"),
                icon: "success",
                showCancelButton: true,
                confirmButtonText: chrome.i18n.getMessage("open"),
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
                title: chrome.i18n.getMessage("question_modal_select_title"),
                input: 'select',
                html:   chrome.i18n.getMessage("html_question_modal_time"),
                inputOptions: questions,
                inputPlaceholder: chrome.i18n.getMessage("select_a_question"),
                showCancelButton: true,
                confirmButtonText: chrome.i18n.getMessage("send"),
                cancelButtonText: chrome.i18n.getMessage("modal_cancel_button"),
                inputValidator: (value) => {
                    return new Promise((resolve) => {
                      if (value) {
                          if(document.querySelector("#timepicker").valueAsNumber%3600000){
                            resolve()
                          }
                          else{
                            resolve(chrome.i18n.getMessage("select_valid_time"))
                          }
                      } else {
                        resolve(chrome.i18n.getMessage("select_question"))
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
                        html: chrome.i18n.getMessage("html_modal_time"),
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
                            title: chrome.i18n.getMessage("logging_answers"),
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
                html: chrome.i18n.getMessage("html_modal_answers"),
                title: chrome.i18n.getMessage("html_moanswer_modal_success_titledal_answers"),
                icon: "success",
                showCancelButton: true,
                cancelButtonText: chrome.i18n.getMessage("modal_cancel_button"),
                confirmButtonText: chrome.i18n.getMessage("see_answers_button"),
                onOpen: () =>{
                    var ctx = document.getElementById('myChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: chrome.i18n.getMessage("chart_text"),
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

//For new UI
function isPanelOpen() {
    let panel = document.querySelector('.R3Gmyc.qwU8Me.qdulke');// obtener el panel cerrado

    let panelOldUi = document.querySelector('.pw1uU');

    if (panel == null) return true;
    if (panelOldUi != null) return true;
    return false; 
}

//renders the layout of the extension
function addLayout(){
    let buttonBoard = document.querySelector('.fIHLXc') //tablero de botones

    //old ui
    if (buttonBoard == null){
        buttonBoard = document.querySelector('div[jsname="Kzha2e"]')
    }

    //observe popups
    const chatPopup = document.querySelector('.NSvDmb.cM3h5d')
    if (chatPopup) {
        observer2.observe(chatPopup, config);
    }
    
    if(isPanelOpen()){ // si el panel esta abierto
        //reemplazamos los mensajes del chat con comandos
        replaceChatMessages()

        // observe chat panel if panel is open
        const chatPanel = document.querySelector('[jsname=xySENc]');
        if (chatPanel){
            observer.observe(chatPanel, config);
        }
    
        if (document.querySelector('[class=GvcuGe]')) {
            myId = document.querySelector('[class=GvcuGe]').firstChild.getAttribute('data-participant-id').split('/').pop()
        }
        //si es admin
        if (buttonBoard) {
            isStudent = false
            if (!document.querySelector('#extraBoard')) {
            //Creamos un tablero de botones extra, para las funcionalidades
            let extraBoard = document.createElement("div");
            extraBoard.setAttribute("id","extraBoard");
            if (document.querySelector(".fIHLXc") != null) {
                extraBoard.setAttribute("class", "fIHLXc");
            }
            else {
                extraBoard.setAttribute("class", "Lf3gob");
            }

            //ATTENDANCE BUTTON
            let attendanceButton = document.createElement("span");//creamos una division dentro del tablero
        
            attendanceButton.innerHTML = `<div jsshadow="" role="button" class="uArJ5e UQuaGc kCyAyd QU4Gid Bs3rEf I9c2Ed XQICaf YY1gRd M9Bg4d" jscontroller="VXdfxd" jsaction="click:cOuCgd; mousedown:UX7yZ; mouseup:lbsD7e; mouseenter:tfO1Yc; mouseleave:JywGue;touchstart:p6p2H; touchmove:FwuNnf; touchend:yfqBxc(preventMouseEvents=true|preventDefault=true); touchcancel:JMtRjd;focus:AHmuwe; blur:O22p3e; contextmenu:mg9Pef" jsname="YCC4Fc" aria-label="All muted" tabindex="0" data-response-delay-ms="2000">
                <div class="Fvio9d MbhUzd" jsname="ksKsZd" style="top: 49px; left: 43.2969px; width: 98px; height: 98px;"></div>
                <div class="e19J0b CeoRYc"></div>
                <span jsslot="" class="l4V7wb Fxmcue">
                <span class="NPEfkd RveJvd snByac">
                    <div class=""><i class="google-material-icons RpOp4b PdvwN" aria-hidden="true">how_to_reg</i></div>
                    <div class="GdrRqd WhQQ6d">${chrome.i18n.getMessage("attendance_button")}</div>
                </span>
                </span>
            </div>`;


            attendanceButton.addEventListener("click",() => {getCourses('attendance');});//le agregamos la funcion de tomar asistencia
            extraBoard.insertBefore(attendanceButton,null);//insertar el boton en el tablero extra

            //QUESTIONS BUTTON
            let questionButton = document.createElement("span");//creamos una division dentro del tablero
        
            questionButton.innerHTML = `<div jsshadow="" role="button" class="uArJ5e UQuaGc kCyAyd QU4Gid Bs3rEf I9c2Ed XQICaf YY1gRd M9Bg4d" jscontroller="VXdfxd" jsaction="click:cOuCgd; mousedown:UX7yZ; mouseup:lbsD7e; mouseenter:tfO1Yc; mouseleave:JywGue;touchstart:p6p2H; touchmove:FwuNnf; touchend:yfqBxc(preventMouseEvents=true|preventDefault=true); touchcancel:JMtRjd;focus:AHmuwe; blur:O22p3e; contextmenu:mg9Pef" jsname="YCC4Fc" aria-label="All muted" tabindex="0" data-response-delay-ms="2000">
                <div class="Fvio9d MbhUzd" jsname="ksKsZd" style="top: 49px; left: 43.2969px; width: 98px; height: 98px;"></div>
                <div class="e19J0b CeoRYc"></div>
                <span jsslot="" class="l4V7wb Fxmcue">
                <span class="NPEfkd RveJvd snByac">
                    <div class=""><i class="google-material-icons RpOp4b PdvwN" aria-hidden="true">question_answer</i></div>
                    <div class="GdrRqd WhQQ6d">${chrome.i18n.getMessage("question_button")}</div>
                </span>
                </span>
            </div>`;

            questionButton.addEventListener("click",() => {
                console.log(checkingForAnswers);
                if(!checkingForAnswers){
                    getCourses('questions');
                }
            });//le agregamos la funcion de tomar asistencia
            extraBoard.insertBefore(questionButton,null);//insertar el boton en el tablero extra

            //RANDOM SELECT BUTTON
            let randomSelectButton = document.createElement("span");//creamos una division dentro del tablero

            randomSelectButton.innerHTML = `<div jsshadow="" role="button" class="uArJ5e UQuaGc kCyAyd QU4Gid Bs3rEf I9c2Ed XQICaf YY1gRd M9Bg4d" jscontroller="VXdfxd" jsaction="click:cOuCgd; mousedown:UX7yZ; mouseup:lbsD7e; mouseenter:tfO1Yc; mouseleave:JywGue;touchstart:p6p2H; touchmove:FwuNnf; touchend:yfqBxc(preventMouseEvents=true|preventDefault=true); touchcancel:JMtRjd;focus:AHmuwe; blur:O22p3e; contextmenu:mg9Pef" jsname="YCC4Fc" aria-label="All muted" tabindex="0" data-response-delay-ms="2000">
                <div class="Fvio9d MbhUzd" jsname="ksKsZd" style="top: 49px; left: 43.2969px; width: 98px; height: 98px;"></div>
                <div class="e19J0b CeoRYc"></div>
                <span jsslot="" class="l4V7wb Fxmcue">
                <span class="NPEfkd RveJvd snByac">
                    <div class=""><i class="google-material-icons RpOp4b PdvwN" aria-hidden="true">feedback</i></div>
                    <div class="GdrRqd WhQQ6d">${chrome.i18n.getMessage("random_select_button")}</div>
                </span>
                </span>
            </div>`;

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
            title: chrome.i18n.getMessage("something_went_wrong"),
            text: chrome.i18n.getMessage("no_participants"),
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
        title: chrome.i18n.getMessage("random_select_modal_title"),
        text: chrome.i18n.getMessage("random_select_modal_text"),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: chrome.i18n.getMessage("random_select_modal_confirm_button")
      }).then((result) => {
        if (result.isConfirmed) {
          randomSelect()
        }
    })
}



function showAttendanceModal(courses){
    Swal.fire({
        title: chrome.i18n.getMessage("select_a_course"),
        input: 'select',
        inputOptions: courses,
        inputPlaceholder: chrome.i18n.getMessage("attendance_modal_place_holder"),
        inputValue: defaultCourse,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: chrome.i18n.getMessage("attendance_modal_confirm_button"),
        cancelButtonText: chrome.i18n.getMessage("modal_cancel_button"),
        denyButtonText: chrome.i18n.getMessage("attendance_modal_new_course_button"),
        denyButtonColor: 'LightSeaGreen',
        inputValidator: (value) => {
            return new Promise((resolve) => {
              if (value) {
                resolve()
              } else {
                resolve(chrome.i18n.getMessage("no_course_selected"))
              }
            })
        }
    }).then((result) => {
        //Take attendance
        if (result.isConfirmed && result.value) {
            Swal.fire({
                title: chrome.i18n.getMessage("taking_attendance_modal_title"),
                allowEscapeKey: false,
                allowOutsideClick: false,
                timer: 25000,
                onOpen: () => {
                    Swal.showLoading();
                },
                onClose: () => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Timeout',
                        text: chrome.i18n.getMessage("something_went_wrong")
                      })
                }
            })
            defaultCourse = result.value
            attendance(courses[result.value], result.value);
        }
        //Modal to create new course
        else if (result.isDenied) {
            Swal.fire({
                title: chrome.i18n.getMessage("new_course_modal_title"),
                input: 'text',
                inputPlaceholder: chrome.i18n.getMessage("new_course_modal_place_holder"),
                inputAttributes: {
                    'aria-label': 'Type your course name here'
                },
                showCancelButton: true,
                inputValidator: (value) => {
                    return new Promise((resolve) => {
                      if (Object.values(courses).includes(value)) {
                        resolve(chrome.i18n.getMessage("new_course_modal_already_exists"))
                      } else {
                        resolve()
                      }
                    })
                }
                }).then((result2) => {
                //Take attendance
                if (result2.isConfirmed) {
                    Swal.fire({
                        title: chrome.i18n.getMessage("creating_files"),
                        allowEscapeKey: false,
                        allowOutsideClick: false,
                        timer: 25000,
                        onOpen: () => {
                            Swal.showLoading();
                        },
                        onClose: () => {
                            Swal.fire({
                                icon: 'error',
                                title: 'Timeout',
                                text: chrome.i18n.getMessage("something_went_wrong")
                              })
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
    
    var tabPanel = document.querySelector('[role="tabpanel"]')
    //For the new UI
    if (tabPanel == null){
        tabPanel = document.querySelector('.ggUFBf.Ze1Fpc');
    }
    
    tabPanel.scrollTop = tabPanel.scrollHeight;

    //the panel is scrolleable
    if (tabPanel.scrollTop != 0) {
        var participantNames = scrollList(tabPanel, participantIds, participantNames, courseName, courseFolderId);
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
                title: chrome.i18n.getMessage("something_went_wrong"),
                text: chrome.i18n.getMessage("no_participants"),
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
                        participantNames[randomNumber] + chrome.i18n.getMessage("has_been_selected"),
                        chrome.i18n.getMessage("participant_selected_modal_text"),
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
        title: chrome.i18n.getMessage("select_a_course"),
        input: 'select',
        inputOptions: courses,
        inputPlaceholder: chrome.i18n.getMessage("select_a_course"),
        inputValue: defaultCourse,
        showCancelButton: true,
        confirmButtonText: chrome.i18n.getMessage("question_modal_confirm_button"),
        cancelButtonText: chrome.i18n.getMessage("modal_cancel_button"),
        inputValidator: (value) => {
            return new Promise((resolve) => {
              if (value) {
                resolve()
              } else {
                resolve(chrome.i18n.getMessage("no_course_selected"))
              }
            })
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            Swal.fire({
                title: chrome.i18n.getMessage("preparing_questions"),
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

    var tabPanel = document.querySelector('[role="tabpanel"]')
    //For the new UI
    if (tabPanel == null){
        tabPanel = document.querySelector('.ggUFBf.Ze1Fpc');
    }
    
    tabPanel.scrollTop = tabPanel.scrollHeight;
  
    if (tabPanel.scrollTop != 0) {
      var participantNames = scrollList(tabPanel, participantIds, participantNames);
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
            participantNames[randomNumber] + chrome.i18n.getMessage("has_been_selected"),
            chrome.i18n.getMessage("participant_selected_modal_text"),
            'success'
        )

      }
      else {
        Swal.fire({
            icon: 'info',
            title: chrome.i18n.getMessage("something_went_wrong"),
            text: chrome.i18n.getMessage("no_participants"),
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
                chrome.i18n.getMessage("you_have_been_selected"),
                chrome.i18n.getMessage("mic_activated"),
                'info'
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
            html:chrome.i18n.getMessage("html_answer_modal"),
            input: 'radio',
            allowOutsideClick: false,
            allowEscapeKey: false,
            inputOptions: inputOptions,
            timer: time,
            timerProgressBar: true,
            inputValidator: (value) => {
              if (!value) {
                return chrome.i18n.getMessage("choose_something")
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