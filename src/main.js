// Modules to control application life and create native browser window
var config = {
    dev: true
};
if(config.dev){
    process.env['DEBUG'] = 'EvalMe*,-not_this';
}

const {app, BrowserWindow, ipcMain, Menu, dialog, shell, screen } = require('electron')
    , path = require('path')
    , SerialPort = require("serialport")
    , isDefined = require('./isDefined')
    , md5 = require('md5')
    , notDefined = require('./not-defined')
    , debug = require('debug')('EvalMe:main')
    , Datastore = require('nedb')
    , uuidv4 = require('uuid/v4')
    , settings = require('electron-settings')
    , json2xls = require('json2xls')
    , fs = require('fs')
    , prompt = require('electron-prompt');


class Database {
    constructor(settings){
        this._settings = settings || {};
        this.db = {};
        this.dbPath = path.join(app.getPath('userData'), "data");
        console.log('dbPath', this.dbPath);
        this.db.questionnaires = new Datastore({
            filename: path.join(this.dbPath, "questionnaires.db"),
            timestampData: true,
            autoload: true,
        });

        this.db.responses = new Datastore({
            filename: path.join(this.dbPath, "responses.db"),
            timestampData: true,
            autoload: true,
        });

        this.db.sets = new Datastore({
            filename: path.join(this.dbPath, "sets.db"),
            timestampData: true,
            autoload: true,
        });
    }

    getDbPath(){
        return this.dbPath;
    }

    filterDuplicateResponses(docs){
        const seenResponses = [];//array of "questionnaireId#questionSet#questionId#userId"
        const filteredDocs = docs
            .sort((a, b) => {
                //sort in reverse order, so we only keep the latest response (it should already come in reverse order, but just to be sure
                return b.createdAt - a.createdAt;
            })
            .filter((response, index, arr) => {
                if(response.userId !== undefined){
                    //this response contains a user ID. Make sure we have not seen this use for this question within this set before
                    const key = `${response.questionnaireId}#${response.questionSet}#${response.questionId}#${response.userId}`;
                    if(seenResponses.includes(key)){
                        //The user has voted before. Since the data is sorted in revers order, we'll only keep the latest vote.
                        return false;
                    }
                    seenResponses.push(key);
                }
                return true;
            });

        filteredDocs.sort((a, b) => a.createdAt - b.createdAt);
        return filteredDocs;
    }

    getQuestionnaires() {
        return new Promise((resolve, reject) => {
            this.db.questionnaires.find({}).sort({createdAt: 1}).exec((err, docs) => {
                if(err)
                    reject(err);
                resolve(docs);
            });
        });
    }

    getQuestionnaire(questionnaireId) {
        return new Promise((resolve, reject) => {
            this.db.questionnaires.find({_id: questionnaireId}, (err, docs) => {
                if(err)
                    reject(err);
                resolve(docs);
            });
        });
    }

    deleteQuestionnaire(questionnaireId){
        return new Promise((resolve, reject) => {
            if(!questionnaireId)
                return reject('no questionnaireId given');
            this.db.questionnaires.remove({_id: questionnaireId}, {}, (err, numRemoved) => {
                if(err)
                    return reject(err);
                this.db.responses.remove({questionnaireId: questionnaireId}, {multi: true}, (err2, numRemoved2) => {
                    if(err2)
                        return reject(err);
                    resolve(`removed ${numRemoved} questionnaires with ID ${questionnaireId} and ${numRemoved2} responses from the database`);
                })
            });
        });
    }

    getResponses(questionnaireId) {
        return new Promise((resolve, reject) => {
            this.db.responses.find({questionnaireId}).sort({createdAt: -1}).exec((err, docs) => {
                if(err)
                    reject(err);

                const filteredDocs = this.filterDuplicateResponses(docs);
                resolve(filteredDocs);
            });
        });
    }

    countResponsesInSet(questionnaireId, questionSet){
        //count number of DB entries where currentQuestionnaireSet and currentQuestionnaireId
        //cannot use the count function, as we want to filter out duplicate responses
        return new Promise((resolve, reject) => {
            this.db.responses.find({questionnaireId, questionSet}).sort({createdAt: -1}).exec((err, docs) => {
                if(err)
                    reject(err);

                const filteredDocs = this.filterDuplicateResponses(docs);
                console.log("filteredDocs", filteredDocs.length);
                resolve({
                    questionnaireId,
                    questionSet,
                    count: filteredDocs.length
                });
            });
        });
        // return new Promise((resolve, reject) => {
        //     this.db.responses.count({questionnaireId, questionSet}, function (err, count) {
        //         if(err)
        //             return reject(err);
        //         resolve({questionnaireId, questionSet, count});
        //     });
        // });
    }

    insertNewQuestion(title, questions){
        return new Promise((resolve, reject) => {
            if(!Array.isArray(questions) || questions.length !== 3){
                return reject("Provide exactly three questions.");
            }

            const questionnaire = {
                //questionnaireId: 1, //corresponds to the questionnaire
                title,
                questions
            };
            this.db.questionnaires.insert(questionnaire, function (err, questionnaireNewDoc) {
                return resolve(questionnaireNewDoc);
            });
        });
    }

    insertOrUpdateResponse(questionnaireId, questionId, value, questionSet, userId = undefined){
        return new Promise((resolve, reject) => {
            const response = {
                questionnaireId, //corresponds to the questionnaire
                questionId, //corresponds to the knobs 1,2, or 3 on the device
                userId,
                value,
                questionSet,
            };

            if(userId !== undefined){
                this.db.responses.find({questionnaireId, questionId, questionSet, userId}).exec((err, responses) => {
                    if(err)
                        return reject(err);
                    if(responses.length > 0){
                        response._id = responses[0]._id;
                        console.log("updating", response._id);
                        this.db.responses.update(response._id, function (err, responseNewDoc) {
                            resolve(responseNewDoc)
                        });
                    }
                    else{
                        this.db.responses.insert(response, function (err, responseNewDoc) {
                            resolve(responseNewDoc)
                        });
                    }
                })
            }
            else {
                // console.log("inserting response", response);
                this.db.responses.insert(response, function (err, responseNewDoc) {
                    resolve(responseNewDoc)
                });
            }
        });
    }

    insertResponse(questionnaireId, questionId, value, questionSet, userId = undefined){
        return new Promise((resolve, reject) => {
            const response = {
                questionnaireId, //corresponds to the questionnaire
                questionId, //corresponds to the knobs 1,2, or 3 on the device
                userId,
                value,
                questionSet,
            };
            // console.log("inserting response", response);
            this.db.responses.insert(response, function (err, responseNewDoc) {
                resolve(responseNewDoc)
            });
        });
    }

    newSet(title){
        return new Promise((resolve, reject) => {
            const set = {
                title,
            };
            this.db.sets.insert(set, function (err, setNewDoc) {
                return resolve(setNewDoc);
            });
        });
    }

    getSet(setId){
        return new Promise((resolve, reject) => {
            this.db.sets.find({_id: setId}, (err, sets) => {
                if(err)
                    reject(err);
                resolve(sets);
            });
        });
    }

    getSets(){
        return new Promise((resolve, reject) => {
            this.db.sets.find({}).sort({createdAt: 1}).exec((err, sets) => {
                if(err)
                    reject(err);
                resolve(sets);
            });
        });
    }
}

const db = new Database();

// db.insertNewQuestion("Test questionanire", [
//     {questionId: 1, title: "How much did you enjoy it?"},
//     {questionId: 2, title: "How far would you go?"},
//     {questionId: 3, title: "What does the fox say?"}
// ]).then(result => {
//     db.insertResponse(result.questionnaireId, 1, 12, 'ac-04-a4-fa');
//     db.insertResponse(result.questionnaireId, 2, 4, 'ac-04-a4-fa');
//     db.insertResponse(result.questionnaireId, 3, 8, 'ac-04-a4-fa');
// });

// ipcMain.once('show', () => {
//     db.getQuestionnaires().then(questionnaires => {
//         mainWindow.webContents.send('questionnaires', questionnaires);
//     })
// });

let addQuestionnaireWindow;
ipcMain.on('add-questionnaire-window', () => {
    if(!addQuestionnaireWindow){
        let x, y, width, height;
        [x, y] = mainWindow.getPosition();
        [width, height] = mainWindow.getSize(0);
        console.log(`[${x}, ${y}]`, width, height,);
        x = x + Math.round(width/2) - 200;
        y = y + Math.round( height/2) - 300;
        addQuestionnaireWindow = new BrowserWindow({
            width: 400,
            height: 600,
            parent: mainWindow,
            center: true,
            modal: true,
            x, y,
            // title: app.getName(),
            webPreferences: {
                // preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true
            },
        });
        const filepath = path.join('src', 'sections', 'question', 'addQuestionnaire.html');
        console.log("loading", filepath);
        addQuestionnaireWindow.loadFile(filepath);
        addQuestionnaireWindow.on('closed', () => {
            addQuestionnaireWindow = null;
        })
    }
});

ipcMain.on('add-questionnaire', (event, questionnaire) => {
    db.insertNewQuestion(questionnaire.title, questionnaire.questions)
        .then(insertedDoc => {
            console.log("new questionnaire added", insertedDoc);
            settings.set('currentquestionnaireId', insertedDoc._id);
            loadAndSendQuestionnaires();
        })
});

ipcMain.on('get-questionnaires', (event, args) => {
    loadAndSendQuestionnaires();
});

const insertResponse = (questionId, value, questionSet = undefined, questionnaireId = undefined, userId = undefined) => {
    return new Promise(((resolve, reject) => {
        if(!questionnaireId)
            questionnaireId = settings.get('currentquestionnaireId');
        if(!questionnaireId){
            mainWindow.send('error', 'no questionnaire selected');
            return reject('no questionnaire selected');
        }
        // console.log(questionId, value, questionnaireId, userId);
        if(notDefined(questionSet))
            questionSet = settings.get('currentQuestionnaireSet');

        db.insertResponse(questionnaireId, questionId, value, questionSet, userId)
            .then(insertedDoc => {
                console.log("new response added", insertedDoc._id);
                loadAndSendQuestionnaires();
                return resolve ('response added ' + insertedDoc._id);
            });
    }))
};

ipcMain.on('login-require', (event, args) => {
    if(_serialConnection === null){
        return displayError({title: "Not connected", content: "Not connected to a receiver"});
    }
    if(args.require){
        _serialConnection.write("REQUIRE_AUTH\n");
    }
    else{
        _serialConnection.write("REQUIRE_NO_AUTH\n");
    }
});

ipcMain.on('voter-set-range', (event, args) => {
    if(_serialConnection === null){
        return displayError({title: "Not connected", content: "Not connected to a receiver"});
    }
    if(![3, 4, 5, 7, 10, 12].includes(args.maxValue)){
        return displayError({title: "Wrong max range", content: `${args.maxValue} is not a valid max range value`});
    }
    let serialStr = "SET_COUNTER_MAX:";
    if(args.maxValue < 10){
        serialStr += "0";
    }
    serialStr += args.maxValue;
    console.log(`serialStr: ${serialStr}`);
    _serialConnection.write(serialStr+"\n");
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const getAndSendPortsToMainWindow = () =>{
    getSerialPorts().then(ports => {
        // debug("ports", ports);
        mainWindow.webContents.send('ports-available', ports);
        if(_serialConnection === null){
            let evalMePort = null;
            ports.forEach(port => {
                if(port.evalMe)
                    evalMePort = port
            });
            if(evalMePort){
                selectPortAndConnect(evalMePort);
            }
        }
    })
};

function loadAndSendQuestionnaires() {
    db.getQuestionnaires().then(questionnaires => {
        mainWindow.send('questionnaires', questionnaires);
        loadAndSendSelectedQuestionnaire();
    });
}

ipcMain.on('question-set-get', (event, arg) => {
    db.getSet(settings.get('currentQuestionnaireSet'))
        .then(sets => {
            const set = sets[0];
            db.getSets()
                .then(allSets => {
                    mainWindow.send('question-set-status', {title: set.title, id: set._id, allSets});
                });
        })
    // event.reply('question-set-status', settings.get('currentQuestionnaireSet'));
});

function loadAndSendSelectedQuestionnaire() {
    const currentquestionnaireId = settings.get('currentquestionnaireId');
    // console.log("loaded currentquestionnaireId", currentquestionnaireId);
    if(currentquestionnaireId){
        mainWindow.send('selected-questionnaire', currentquestionnaireId);
        db.getSet(settings.get('currentQuestionnaireSet'))
            .then(sets => {
                const set = sets[0];
                // console.log("loadAndSendSelectedQuestionnaire set", set);
                db.getSets()
                    .then(allSets => {
                        mainWindow.send('question-set-status', {title: set.title, id: set._id, allSets});
                        countAndSendResponsesSinceLastSet();
                    })
            })
    }
}

function countAndSendResponsesSinceLastSet(questionnaireId = undefined, questionnaireSet = undefined){
    //count number of DB entries where currentQuestionnaireSet and currentQuestionnaireId

    if(notDefined(questionnaireId)){
        questionnaireId = settings.get('currentquestionnaireId');
    }
    if(notDefined(questionnaireSet)){
        questionnaireSet = settings.get('currentQuestionnaireSet');
    }
    // console.log("loaded currentquestionnaireId", questionnaireId);
    // console.log("loaded questionnaireSet", questionnaireSet);
    if(questionnaireId && questionnaireSet){
        db.getSet(questionnaireSet)
            .then(set => {
                db.countResponsesInSet(questionnaireId, questionnaireSet).then(result => {
                    //result = {questionnaireId, questionSet, count}
                    mainWindow.send('question-set-responsesCount', {
                        questionnaireId: result.questionnaireId,
                        questionSet: result.questionSet,
                        questionSetTitle: set.title,
                        questionSetTime: set.createdAt,
                        count: result.count / 3
                    });
                });
            })

    }
}


ipcMain.on('question-set-new', (event, arg) => {
    prompt({
        title: 'Create new Set',
        label: 'Set title:',
        value: new Date(),
        inputAttrs: {
            type: 'text',
            required: true
        },
        type: 'input'
    }, mainWindow)
        .then((r) => {
            if(r === null) {
                // console.log('user cancelled');
            } else {
                // console.log('result', r);
                db.newSet(r)
                    .then(setDoc => {
                        // console.log("new setDoc", setDoc);
                        settings.set('currentQuestionnaireSet', setDoc._id);
                        loadAndSendSelectedQuestionnaire();
                    })
            }
        })
        .catch(console.error);


});



ipcMain.on('question-set-end', (event, arg) => {
    //not implemented / needed
});



function loadResponsesForQuestionnaire(questionnaireId){
    if(notDefined(questionnaireId))
        mainWindow.send('error', "No questionnaire selected");
    else {
        db.getQuestionnaire(questionnaireId)
            .then(questionnaire => {
                db.getResponses(questionnaireId)
                    .then(responses => {
                        db.getSets()
                            .then(sets => {
                                // console.log("sets", sets);
                                mainWindow.send('responses', {
                                    questionnaire: questionnaire[0],
                                    responses,
                                    sets
                                });
                            })
                    })
            })
    }
}

ipcMain.on('get-responses', (event, args) => {
    loadAndSendQuestionnaires();
    let questionnaireId = settings.get('currentquestionnaireId');
    if(isDefined(args) && isDefined(args.questionnaireId)){
        questionnaireId = args.questionnaireId;
    }

    // console.log("getting responses for questionnaire", questionnaireId);
    loadResponsesForQuestionnaire(questionnaireId);
});

ipcMain.on('select-questionnaire', (event, questionId) => {
    // console.log("setting currentquestionnaireId", questionId);
    settings.set('currentquestionnaireId', questionId);
    loadAndSendSelectedQuestionnaire();
});

ipcMain.on('delete-questionnaire', (event, questionnaireId) => {
    // console.log("setting currentquestionnaireId", questionnaireId);
    db.deleteQuestionnaire(questionnaireId)
        .then(result => {
            // console.log("delete result", result);
            if(settings.get('currentquestionnaireId') === questionnaireId){
                settings.set('currentquestionnaireId', undefined);
            }
            loadAndSendQuestionnaires();
            loadAndSendSelectedQuestionnaire();
        })
        .catch(e => {
            // console.log("error deleting", e);
            mainWindow.send('error', e);
        })
});

const ensureQuestionnaireSet = () => {
    let set = settings.get('currentQuestionnaireSet');
    if(notDefined(set)) {
        settings.set('currentQuestionnaireSet', 0);
    }
};

function createWindow() {
    makeSingleInstance();
    ensureQuestionnaireSet();

    let externalDisplay = screen.getAllDisplays().find((display) => {
        return display.bounds.x !== 0 || display.bounds.y !== 0
    });

    let x, y, width, height;

    if (externalDisplay) {
        x = externalDisplay.bounds.x + 50;
        y = externalDisplay.bounds.y + 50;
        width = externalDisplay.bounds.width;
        height = externalDisplay.bounds.height;
    }

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1080,
        minWidth: 680,
        height: 750,
        x,
        y,
        // title: app.getName(),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true
        },
        // icon: __dirname + `icon.png`,
        icon: 'icon.png'
    });

    mainWindow.maximize();

    // and load the index.html of the app.
    mainWindow.loadFile('src/index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools({mode: "detach"});

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    });

    mainWindow.webContents.on('did-finish-load', () => {
        getAndSendPortsToMainWindow();
        loadAndSendQuestionnaires();
        mainWindow.setIcon(__dirname+'/assets/images/icon.png');
        // setTimeout(() => {
        //     mainWindow.once('focus', () => mainWindow.flashFrame(false))
        //     mainWindow.flashFrame(true)
        // }, 1000);
    });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null){
        createWindow()
    }
});

ipcMain.on('refresh-devices', (event, arg) => {
    getAndSendPortsToMainWindow();
});

ipcMain.on('get-db-path', (event, arg) => {
    event.returnValue = db.getDbPath();
});

ipcMain.on('asynchronous-message', (event, arg) => {
    console.log(arg);
    event.reply('asynchronous-reply', 'pong')
});

ipcMain.on('synchronous-message', (event, arg) => {
    console.log(arg);
    event.returnValue = 'pong'
});

ipcMain.on('port-selected', (event, arg) => {
    selectPortAndConnect(serial.ports.filter(p => p.path === arg)[0]);
});

const selectPortAndConnect = (port => {
    if(_serialConnection !== null){
        return mainWindow.send('error', `connection already open`);
    }
    serial.port = port;
    startSerialConnection()
        .then(val => {
            console.log("opening");
            // mainWindow.setOverlayIcon('src/assets/images/connected.png', 'Connected');
            mainWindow.webContents.send('port-opened', {
                msg: val
            });
        })
        .catch(e => {
            console.log("error opening", e);
            mainWindow.webContents.send('error', {
                msg: e
            });
        })
});

ipcMain.on('check-port', (event, arg) => {
    if(_serialConnection == null){
        // mainWindow.setOverlayIcon('src/assets/images/disconnected.png', 'Disconnected');
        event.returnValue = false;
    }
    else{
        // mainWindow.setOverlayIcon('src/assets/images/connected.png', 'Connected');
        event.returnValue = _serialConnection.path;
    }
});


const displayError = (args) => {
    if (notDefined(args)) {
        args = {};
    }
    if (notDefined(args.title)) {
        args.title = 'Error';
    }
    if (notDefined(args.content)) {
        args.content = 'An unknown error occured.';
    }
    return dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: args.title,
        message: args.content,
        buttons: ['OK']
    })
        .then((response, checkboxCheched) => {
            // console.log("selected", response);
        });
};


ipcMain.on('open-error-dialog', (event, args) => {
    displayError(args);
});

ipcMain.on('export-data', (event, args) => {
    dialog.showSaveDialog(mainWindow, {defaultPath: "export.xlsx"})
        .then(({canceled, filePath, bookmark}) => {
            if(!canceled){
                console.log(filePath);
                let questionnaireId = settings.get('currentquestionnaireId');
                if(isDefined(args) && isDefined(args.questionnaireId)){
                    questionnaireId = args.questionnaireId;
                }
                db.getSets()
                    .then(allSets => {
                        db.getQuestionnaire(questionnaireId)
                            .then(questionnaires => {
                                console.log("questionnaire", questionnaires);
                                const questionnaire = questionnaires[0];

                                db.getResponses(questionnaireId)
                                    .then(responses => {
                                        // mainWindow.send('responses', {questionnaire: questionnaire[0], responses});
                                        responses.forEach(response => {
                                            const question = questionnaire.questions.find(q => q.questionId === response.questionId);
                                            const set = allSets.find(s => s._id === response.questionSet);
                                            response.questionnaireTitle = questionnaire.title;
                                            response.questionTitle = question.title;
                                            response.questionSetTitle = set.title;
                                        });
                                        const xls = json2xls(responses, {
                                            fields: {
                                                createdAt: "string",
                                                questionnaireId: 'string',
                                                questionnaireTitle: "string",
                                                questionId: "number",
                                                questionTitle: "string",
                                                questionSet: "string",
                                                questionSetTitle: "string",
                                                userId: "string",
                                                value: "number"
                                            }
                                        });
                                        fs.writeFileSync(filePath, xls, 'binary');
                                    })
                            });
                    });
            }
        })
});




// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


const serial = {
    port: null,
    ports: null,
    readerIDs: [
        "201d9faaf9f3f3e455cfeac3ba11181e",
    ]
};

const getSerialPorts = () => new Promise((resolve, reject) => {
    SerialPort.list().then((ports, err) => {
        if (err)
            return reject(err);

        serial.ports = [];
        console.log(serial.ports);

        if (isDefined(ports) && ports.length >= 1) {
            ports.forEach(function (port) {
                if (isDefined(port.pnpId)) {
                    port.id = md5(port.pnpId);
                    console.log(port.id, port.manufacturer)
                } else {
                    port.id = md5(Math.random());
                }
                port.evalMe = false;
                const ind = serial.readerIDs.indexOf(port.id);
                if(port.manufacturer && port.manufacturer.indexOf("Arduino") > -1){
                    port.evalMe = true;
                }
                if (ind > -1) {
                    port.manufacturer = 'EvalMe receiver ' + ind;
                    port.evalMe = true;
                    //auto select last available port that is known
                    serial.port = port;
                    // serial.ports.push(port);
                }
                // serial.port = port;
                serial.ports.push(port);
            });
        } else {
            serial.port = null;
        }

        resolve(serial.ports);
    })
});


let _serialConnection = null;
const Readline = require('@serialport/parser-readline');
const parser = new Readline();
const startSerialConnection = () => new Promise((resolve, reject) => {

    if (_serialConnection != null) {
        // emitAdmin('port opened', {
        //   msg: 'port opened'
        // });
        return reject('port already connected');
    }
    if (notDefined(serial.port)) {
        return reject('not connecting, serial port not defined');
    }
    _serialConnection = new SerialPort(serial.port.path, {
        baudRate: 9600,
        autoOpen: false,
        // parser: parser
    });

    _serialConnection.pipe(parser);


    const parseSerialData = function(entry){
        // #TYPE:INFO;DATA:LORA_SERVER_started
        // #TYPE:INCOMING;FROM:0x5;DATA:0-0-0
        // #TYPE:INCOMING;FROM:0x5;DATA:0-0-0;CARDID:05-fa-32-a6-21
        //  #TYPE:OK;DATA:REQUIRE_NO_AUTH sent
        if(entry.indexOf('#') < 0){
            console.log('missing hash', entry);
            console.log("Wrong formatted line. Check serial data integrity.");
        }
        const line = entry.substring(entry.indexOf('#')+1);
        const parts = line.split(';');
        if(parts.length < 2){
            console.log('wrong parts', entry);
            console.log("Wrong formatted serial data.");
        }
        const data = {
            date: new Date(),
            type: 'unknown',
            from: undefined,
            responses: [],
            userId: undefined,
        };
        parts.forEach(part => {
            const p = part.split(':');
            if(p.length < 2) {
                console.log('wrong entry format', entry);
                console.log("Wrong formatted serial data.");
                return;
            }

            const key = p[0].toLowerCase().trim();
            const val = p[1].toLowerCase().trim();
            switch(key){
                case 'type':
                    data.type = val;
                    break;
                case 'from':
                    data.from = val;
                    break;
                case 'data':
                    if(data.type === 'incoming') {
                        const responses = val.split('-');
                        // if(responses.length < 3){
                        //     console.log("not the right number of parameters", val);
                        //     throw new Error("not the right number of parameters");
                        // }
                        data.responses = [
                            {
                                questionId: 0,
                                value: responses[2],
                            },
                            {
                                questionId: 1,
                                value: responses[1],
                            },
                            {
                                questionId: 2,
                                value: responses[0],
                            },
                        ];
                    }
                    else{
                        data.data = val;
                    }
                    break;
                case 'cardid':
                    const cardIdParts = [];
                    val.split('-').forEach(function (item) {
                        if (item.length < 2) {
                            item = '0' + item;
                        }
                        cardIdParts.push(item);
                    });
                    data.userId = cardIdParts.join('-').toUpperCase().trim();
                    break;
                default:
                    break;
            }
        });

        // data.type = data.type.toLowerCase();
        return data;
    };

    parser.on('data', line => {
        debug(`Serial line: ${line}`);
        const data = parseSerialData(line);
        switch(data.type){
            case 'info':
                console.log(`INFO received at ${data.date}: ${data.data}`);
                break;
            case 'incoming':
                // data.data = parseInt(data.data);
                data.from = parseInt(data.from, 16);
                data.responses.forEach(response => {
                    // console.log("response raw", response, settings.get('currentquestionnaireId'), data.userId);
                    insertResponse(response.questionId, response.value, settings.get('currentQuestionnaireSet'),
                        settings.get('currentquestionnaireId'), data.userId)
                });
                break;
            case 'ok':
                console.log(`ACC received at ${data.date}: ${data.data}`);
                mainWindow.send('info', `Received confirmation: ${data.data}`);
                break;
            case 'unknown':
            default:
                console.error(`unknown data received ${data.type}`);
                // mainWindow.send('error', `unknown data received ${data.type}`);
                break;
        }

        //insertResponse()

        mainWindow.webContents.send('serial-data', {
            msg: data
        });
    });

    // _serialConnection.on('data', function (data) {
    //     debug('Data: ' + data);
    //     mainWindow.webContents.send('serial-data', {
    //         msg: data
    //     });
    // });

    _serialConnection.on('open', function () {
        debug('com port opened');
        mainWindow.setOverlayIcon('src/assets/images/connected.png', 'Connected');
        mainWindow.webContents.send('port-opened', {
            msg: serial.port
        });
        // _serialConnection.write('HELLO LOGGER', function (err) {
        //     if (err) {
        //         mainWindow.webContents.send('error', {
        //             msg: err.message
        //         });
        //         return debug('Error on write: ', err.message);
        //     }
        //     mainWindow.webContents.send('port-opened', {
        //         msg: serial
        //     });
        // });
    });

    _serialConnection.on('error', function (err) {
        debug('Error: ', err.message);
        mainWindow.webContents.send('error', {
            msg: 'Error opening port: ' + err.message
        });
    });

    _serialConnection.on('close', function () {
        debug('Port closed');
        _serialConnection = null;
        mainWindow.setOverlayIcon('src/assets/images/disconnected.png', 'Disconnected');
        mainWindow.webContents.send('port-closed', {
            msg: 'port closed'
        });
    });


    try {
        _serialConnection.open(function (err) {
            if (err) {
                _serialConnection = null;
                mainWindow.webContents.send('error', {
                    msg: 'Error opening port: ' + err.message
                });
                return reject('Error I opening port: ' + err.message);
            }
            return resolve("serial connection started");
        });
    } catch (e) {
        mainWindow.webContents.send('error', {
            msg: 'Error opening port: ' + e.message
        });
        mainWindow.setOverlayIcon('src/assets/images/disconnected.png', 'Disconnected');
        mainWindow.webContents.send('port-closed', {
            msg: 'port closed'
        });
        _serialConnection = null;

        return reject('Error II opening port: ', e.message);
    }
});

// const sendToMain = (channel, args) => {
//     mainWindow.webContents.send(channel, args);
// };


// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function makeSingleInstance () {
    if (process.mas) return

    app.requestSingleInstanceLock()

    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })
}
