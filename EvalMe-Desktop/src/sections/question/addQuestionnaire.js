/**
 * Author: Frederik Brudy <fb@fbrudy.net>
 */
const {ipcRenderer} = require('electron');
document.getElementById('questionnaireForm').addEventListener('submit',(e) => {
    e.preventDefault();
    // const input = e.target[0];
    const title = document.getElementById('create-q-title');
    let error = false;
    let errorHtml = '';
    if(title.value.length <= 0){
        error = true;
        errorHtml += `<li>Please provide a title</li>`;
    }
    const data = {
        title: title.value,
        questions: []
    };
    const questionCount = 3;
    for(let i = 0; i < questionCount; i++){
        const question = document.getElementById(`create-q-question${i}`);
        if(question.value.length <= 0){
            error = true;
            errorHtml += `<li>Please enter a question ${i+1}</li>`;
        }
        else {
            data.questions.push({
                questionId: i,
                title: question.value
            })
        }
    }
    if(error){
        document.getElementById('error-list').innerHTML = errorHtml;
    }
    else{
        console.log("questionnaire data", data);
        ipcRenderer.send('add-questionnaire', data);
        // input.value = '';
        document.getElementById('error-list').innerHTML = '';
        window.close();
    }
});