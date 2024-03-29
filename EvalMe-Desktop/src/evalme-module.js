// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const {ipcRenderer, shell} = require('electron')
    , settings = require('electron-settings');
const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
};

if(settings.get("hidden-sets") === undefined){
    settings.set("hidden-sets", []);
}

//ipcRenderer.sendSync('synchronous-message', 'ping') //return value is pong
//ipcRenderer.send('asynchronous-message', 'ping')
//ipcRenderer.on('asynchronous-reply', (event, arg) => {
//   console.log(arg) // prints "pong"
// })

ipcRenderer.on('ports-available', (event, args) => {
    const list = document.getElementById('available-devices');

    const html = args.reduce((html, port) => {
        if(port.evalMe) {
            html += `
<li class="">
    <a class="connect-to-port" data-portname="${port.path}">${port.manufacturer}</a>
</li>`;
        }
        return html;
    }, '');

    list.innerHTML = html;
    list.querySelectorAll('.connect-to-port').forEach(item => {
        item.addEventListener('click', (e) => {
            const portStatus = ipcRenderer.sendSync('check-port');
            if (portStatus === false) {
                ipcRenderer.send('port-selected', e.target.dataset.portname);
            }
            else {
                ipcRenderer.send('open-error-dialog', {title: "Already connected", content: "Already connected to a receiver device."});
            }
        })
    });

    const portStatus = ipcRenderer.sendSync('check-port');
    if (portStatus !== false) {
        updateConnectionStatus(`CONNECTED`, `connected`)
    }
    // while (list.firstChild) {
    //     list.removeChild(list.firstChild);
    // }
    // args.forEach(port => {
    //     if(port.evalMe) {
    //         const item = document.createElement("a");
    //         item.className = 'collection-item';
    //         item.appendChild(document.createTextNode(port.manufacturer));
    //         item.onclick = () => {
    //             //connect to this one
    //             ipcRenderer.send('port-selected', port);
    //         };
    //         list.appendChild(item);
    //     }
    // });
    console.log(args);
});

ipcRenderer.on('serial-data', (event, args) => {
    console.log("incoming serial data", args);
    const msg = args.msg;
    if(msg.type === 'incoming') {
        console.log("TODO: new data has arrived. Start flashing the REFRESH button");
        // const el = document.getElementById('last-selection');
        // el.innerHTML = `COUNTER: ${msg.data}`;
    }
    else if(msg.type === 'info'){
        document.querySelectorAll('.connection-info').forEach(el => {
            el.innerHTML = msg.data;
        });
        console.log("written");
    }
});

ipcRenderer.on('port-opening', (event, args) => {
    console.log('port opening', args);
    updateConnectionStatus(`CONNECTING`, `connecting`)
});

ipcRenderer.on('port-closed', (event, args) => {
    console.log('port closed', args);
    updateConnectionStatus(`CLOSED`, `closed`)
});

ipcRenderer.on('port-opened', (event, args) => {
    console.log('port opened', args);
    updateConnectionStatus(`CONNECTED`, `connected`)
});

const updateConnectionStatus = (innerHTML, classes) => {
    document.querySelectorAll('.connection-status').forEach(el => {
        el.innerHTML = innerHTML;
        el.className = `connection-status ${classes}`;
    });
};

ipcRenderer.on('error', (event, args) => {
    console.log('error from main', args);
    alert(args);
});

ipcRenderer.on('info', (event, args) => {
    console.log('info from main', args);
    alert(args);
});

document.addEventListener('DOMContentLoaded', function() {
    // var elems = document.querySelectorAll('.fixed-action-btn');
    // var instances = M.FloatingActionButton.init(elems, {direction: 'top'});

    document.querySelectorAll('.refresh-devices').forEach(item => {
        console.log(item);
        item.addEventListener('click', (e) => {
            console.log("click");
            ipcRenderer.send('refresh-devices');
            e.preventDefault();
        });
    });

    document.getElementById('createQuestionnaire').addEventListener('click', (e) => {
        ipcRenderer.send('add-questionnaire-window')
    });


    document.getElementById('login-require').addEventListener('click', (e) => {
        ipcRenderer.send('login-require', {require: true});
    });

    document.getElementById('login-not-require').addEventListener('click', (e) => {
        ipcRenderer.send('login-require', {require: false});
    });

    document.querySelectorAll('.voter-set-range').forEach(item => {
        item.addEventListener('click', (e) => {
            const maxValue = item.getAttribute('data-maxValue');
            console.log("maxValue", maxValue);
            ipcRenderer.send('voter-set-range', {maxValue: parseInt(maxValue)});
        });
    });

    document.querySelectorAll('.question-set-new').forEach(item => {
        item.addEventListener('click', (e) => {
            console.log("question-set-new");
            ipcRenderer.send('question-set-new');
            e.preventDefault();
        });
    });

    document.querySelectorAll('.question-set-end').forEach(item => {
        item.addEventListener('click', (e) => {
            ipcRenderer.send('question-set-end');
            e.preventDefault();
        });
    });

    document.getElementById('export-data').addEventListener('click', e => {
        e.preventDefault();
        ipcRenderer.send('export-data');
    });

    document.getElementById('showStdev').addEventListener('click', e => {
        // e.preventDefault();
        console.log("checked", e.target.checked);
        settings.set("showStdev", e.target.checked);
        document.getElementById("refresh-view-questionnaire").click();
    });

    if(settings.get("showStdev")){
        document.getElementById('showStdev').checked = true;
    }




    setTimeout(() => {
        document.getElementById("refresh-view-questionnaire").click();
        const dbPathContainer = document.getElementById("db-path");
        const dpPath = ipcRenderer.sendSync('get-db-path');
        dbPathContainer.innerHTML = dpPath;
        dbPathContainer.addEventListener("click", e => {
            shell.showItemInFolder(dpPath);
        });
    }, 500);

});

ipcRenderer.on('question-set-status', (event, currentQuestionnaireSet) => {
    // console.log("question-set-status", currentQuestionnaireSet);
    document.querySelectorAll('.question-set-status').forEach(item => {
        item.innerHTML = currentQuestionnaireSet.title;
    });

    const setsToHide = document.getElementById("sets-to-hide");
    setsToHide.innerHTML = "";
    currentQuestionnaireSet.allSets.forEach(set => {
        const item = document.createElement("li");
        item.classList.add("set");
        item.dataset.setId = set._id;
        item.addEventListener("click", e => {
            item.classList.toggle("hidden-set");
            let hiddenSets = settings.get("hidden-sets");

            if(item.classList.contains("hidden-set")){
                console.log("hide all with id", set._id);
                //hide all sets with this key
                document.querySelectorAll(`.set-${set._id}`).forEach(el => {
                    el.classList.add("hidden");
                });
                hiddenSets.push(set._id);
            }
            else{
                //make all sets with this key visible
                document.querySelectorAll(`.set-${set._id}`).forEach(el => {
                    el.classList.remove("hidden");
                });

                // hiddenSets = [];
                // hiddenSets = hiddenSets.filter(s => s !== set._id);
                hiddenSets.splice(hiddenSets.indexOf(set._id), 1)
            }
            console.log("hidden sets", hiddenSets);
            settings.set("hidden-sets", hiddenSets);
            // document.dispatchEvent(new Event("set-visibility-changed"));
            document.getElementById("refresh-view-questionnaire").click();
        });
        item.innerText = set.title !== undefined ? set.title : set._id;
        // const label = document.createElement("label");
        setsToHide.appendChild(item);
    });
});

ipcRenderer.on('question-set-responsesCount', (event, result) => {
    // console.log("question-set-responsesCount", result);
    //result = {questionnaireId, questionSet, count}
    document.querySelectorAll('.question-set-responsesCount').forEach(item => {
        item.innerHTML = result.count;
    });
});

ipcRenderer.on('questionnaires', (event, questionnaires) => {
    // console.log("questionnaires list updated", questionnaires);
    const questionnaireList = document.getElementById('questionnaireList');
    const questionnaireItems = questionnaires.reduce((html, questionnaire) => {
        html += `<li class="questionnaire-item" id="question-${questionnaire._id}" data-questionid="${questionnaire._id}">
<a href="#" class="question">${questionnaire.title}</a>
<span class="delete">X</span>
</a>`;
        return html;
    }, '');
    // console.log("questionnaireList", questionnaireList);
    // console.log("new html", questionnaireItems);
    questionnaireList.innerHTML = questionnaireItems;
    // console.log("questionnaireList.innerHTML", questionnaireList.innerHTML);

    questionnaireList.querySelectorAll('.questionnaire-item .question').forEach(item => {
        item.addEventListener('click', (e) => {
            //set this question as current (collecting answers)
            e.preventDefault();
            e.stopPropagation();
            ipcRenderer.send('select-questionnaire', e.target.parentElement.dataset.questionid);
        });
    });
    questionnaireList.querySelectorAll('.questionnaire-item .delete').forEach(item => {
        item.addEventListener('click', (e) => {
            //set this question as current (collecting answers)
            e.preventDefault();
            e.stopPropagation();
            const response = confirm("Are you sure you want to delete this question with all its responses?\nWARNING: This action cannot be undone.");
            if (response === true) {
                ipcRenderer.send('delete-questionnaire', e.target.parentElement.dataset.questionid);
            }
        });
    });
});

ipcRenderer.on('selected-questionnaire', (event, questionnaireId) => {
    let q = document.getElementById("question-"+questionnaireId);
    let selectedQuestionnaire = document.getElementById('selected-questionnaire');
    // q = document.getElementById("question-2d0aLsdGGx4BmmYp");
    // console.log(questionnaireId, q);
    document.querySelectorAll('.questionnaire-item').forEach(question => {
        question.classList.remove('selected');
    });
    q.classList.add('selected');

    let question = "No questionnaire selected";
    for (let i = 0; i < q.childNodes.length; i++) {
        if (q.childNodes[i].className === "question") {
            question = q.childNodes[i].innerHTML;
            break;
        }
    }
    selectedQuestionnaire.innerHTML = question;
});


