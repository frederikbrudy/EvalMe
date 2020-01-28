/**
 * Author: Frederik Brudy <fb@fbrudy.net>
 */
const {ipcRenderer} = require('electron');

// let ctx = document.getElementById('chartQ1');
window.chartColors = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)'
};
var MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

var COLORS = [
    '#4dc9f6',
    '#f67019',
    '#f53794',
    '#537bc4',
    '#acc236',
    '#166a8f',
    '#00a950',
    '#58595b',
    '#8549ba'
];
let Samples = {};
Samples.utils = {
    // Color = global.Color;
    // Adapted from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
    srand: function(seed) {
        this._seed = seed;
    },

    rand: function(min, max) {
        var seed = this._seed;
        min = min === undefined ? 0 : min;
        max = max === undefined ? 1 : max;
        this._seed = (seed * 9301 + 49297) % 233280;
        return min + (this._seed / 233280) * (max - min);
    },

    numbers: function(config) {
        var cfg = config || {};
        var min = cfg.min || 0;
        var max = cfg.max || 1;
        var from = cfg.from || [];
        var count = cfg.count || 8;
        var decimals = cfg.decimals || 8;
        var continuity = cfg.continuity || 1;
        var dfactor = Math.pow(10, decimals) || 0;
        var data = [];
        var i, value;

        for (i = 0; i < count; ++i) {
            value = (from[i] || 0) + this.rand(min, max);
            if (this.rand() <= continuity) {
                data.push(Math.round(dfactor * value) / dfactor);
            } else {
                data.push(null);
            }
        }

        return data;
    },

    labels: function(config) {
        var cfg = config || {};
        var min = cfg.min || 0;
        var max = cfg.max || 100;
        var count = cfg.count || 8;
        var step = (max - min) / count;
        var decimals = cfg.decimals || 8;
        var dfactor = Math.pow(10, decimals) || 0;
        var prefix = cfg.prefix || '';
        var values = [];
        var i;

        for (i = min; i < max; i += step) {
            values.push(prefix + Math.round(dfactor * i) / dfactor);
        }

        return values;
    },

    months: function(config) {
        var cfg = config || {};
        var count = cfg.count || 12;
        var section = cfg.section;
        var values = [];
        var i, value;

        for (i = 0; i < count; ++i) {
            value = MONTHS[Math.ceil(i) % 12];
            values.push(value.substring(0, section));
        }

        return values;
    },

    color: function(index) {
        return COLORS[index % COLORS.length];
    },

    transparentize: function(color, opacity) {
        var alpha = opacity === undefined ? 0.5 : 1 - opacity;
        return Color(color).alpha(alpha).rgbString();
    }
};
// const myChart = new Chart(ctx, {
//     type: 'line',
//     data: {
//         datasets: [{
//             label: 'Dataset with string point data',
//             backgroundColor: Samples.utils.color(window.chartColors.red).alpha(0.5).rgbString(),
//             borderColor: window.chartColors.red,
//             fill: false,
//             data: [{
//                 x: newDateString(0),
//                 y: randomScalingFactor()
//             }, {
//                 x: newDateString(2),
//                 y: randomScalingFactor()
//             }, {
//                 x: newDateString(4),
//                 y: randomScalingFactor()
//             }, {
//                 x: newDateString(5),
//                 y: randomScalingFactor()
//             }],
//         }, {
//             label: 'Dataset with date object point data',
//             backgroundColor: color(window.chartColors.blue).alpha(0.5).rgbString(),
//             borderColor: window.chartColors.blue,
//             fill: false,
//             data: [{
//                 x: newDate(0),
//                 y: randomScalingFactor()
//             }, {
//                 x: newDate(2),
//                 y: randomScalingFactor()
//             }, {
//                 x: newDate(4),
//                 y: randomScalingFactor()
//             }, {
//                 x: newDate(5),
//                 y: randomScalingFactor()
//             }]
//         }]
//     },
//     options: {
//         responsive: true,
//         title: {
//             display: true,
//             text: 'Chart.js Time Point Data'
//         },
//         scales: {
//             xAxes: [{
//                 type: 'time',
//                 display: true,
//                 scaleLabel: {
//                     display: true,
//                     labelString: 'Date'
//                 },
//                 ticks: {
//                     major: {
//                         fontStyle: 'bold',
//                         fontColor: '#FF0000'
//                     }
//                 }
//             }],
//             yAxes: [{
//                 display: true,
//                 scaleLabel: {
//                     display: true,
//                     labelString: 'value'
//                 }
//             }]
//         }
//     }
// });

// ipcRenderer.on('question-list', (event, data) => {
//
// });

// document.getElementById('question-list').addEventListener('change', el => {
//     console.log(el);
//     //TODO add questionnaires and ID to #question-list
//     //TODO view data for the selected questionnaire
// });

document.getElementById('refresh-view-questionnaire').addEventListener('click', (e) => {
    console.log('click');
    ipcRenderer.send('get-responses'); //add questionnaire ID
});

const visualisationType = "bar";//"bar|line|line-grouped";
ipcRenderer.on('responses', (event, data) => {
    console.log("responses received", data);
    console.log("questionnaire", data.questionnaire.title);
    const q = data.questionnaire.questions;
    const r = data.responses;
    console.log("q", q);
    console.log("r", r);
    let datasets = [];
    const res = [];
    const colors = [
        {
            backgroundColor: window.chartColors.red,
            borderColor: window.chartColors.blue,
        },
        {
            backgroundColor: window.chartColors.red,
            borderColor: window.chartColors.yellow,
        },
        {
            backgroundColor: window.chartColors.red,
            borderColor: window.chartColors.green,
        }
    ];
    let colorSelection = 0;
    if(visualisationType === 'line') {
        q.forEach(question => {
            const dataset = {
                label: question.title,
                ...colors[colorSelection],
                fill: false,
                data: [],
            };
            colorSelection++;
            const responses = r.filter(response => {
                return response.questionId === question.questionId;
            });
            responses.forEach(response => {
                const dataResponse = {
                    x: new Date(response.createdAt),
                    y: response.value,
                };
                dataset.data.push(dataResponse)
            });
            datasets.push(dataset);
        });
    }
    else if(visualisationType === 'line-grouped'){
        q.forEach(question => {
            const dataset = {
                label: question.title,
                ...colors[colorSelection],
                fill: false,
                data: [],
            };
            colorSelection++;
            const responses = r.filter(response => response.questionId === question.questionId);
            let aggregator = 0;
            let responseCount = 0;
            let currentSet = responses[0].questionSet;
            console.log('currentSet', responses[0]);
            responses.forEach(response => {
                if (response.questionSet !== currentSet) {
                    //next set
                    const dataResponse = {
                        x: currentSet,
                        y: aggregator / responseCount,
                    };
                    dataset.data.push(dataResponse);
                    aggregator = 0;
                    responseCount = 0;
                    currentSet = response.questionSet;
                }
                // const dataResponse = {
                //     x: new Date(response.createdAt),
                //     y: response.value,
                // };
                aggregator += response.value;
                responseCount++;
            });

            const mean = aggregator / responses.length;
            // dataset.data = [mean];
            const dataResponse = {
                x: currentSet,
                y: aggregator / responseCount,
            };
            dataset.data.push(dataResponse);

            datasets.push(dataset);
        });
    }
    else if(visualisationType === "bar"){
        colorSelection = 0;
        let done = false;
        const graph = [];
        let resultStr = "";
        let questionCounter = 0;
        q.forEach(question => {
            const ctx = document.getElementById('chartQ'+questionCounter);
            questionCounter++;
            // if(done)
            //     return;
            // done = true;
            datasets = [];
            const dataset = {
                label: question.title,
                // ...colors[colorSelection],
                fill: false,
                backgroundColor: ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"],
                borderColor: ["rgb(255, 99, 132)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"],
                borderWidth: 1,
                data: [],
            };
            // colorSelection++;
            const responses = r.filter(response => {
                return response.questionId === question.questionId;
            });
            const sets = {};
            // let currentSet = null;
            let groups = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0};
            responses.forEach(response => {

                if(!sets[response.questionSet]){
                    sets[response.questionSet] = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0};
                }
                // if(currentSet === null){
                //     currentSet = response.questionSet;
                //     sets.push(currentSet);
                // }
                // if(response.questionSet !== currentSet){
                //     Object.keys(groups).forEach((key) => {
                //         console.log(question.title, key, groups[key], response.questionSet); // value
                //         dataset.data.push(groups[key]);
                //     });
                //     datasets.push(dataset);
                //     groups = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0};
                //     currentSet = response.questionSet;
                //     sets.push(currentSet);
                // }
                // const dataResponse = {
                //     x: new Date(response.createdAt),
                //     y: response.value,
                // };
                if(!sets[response.questionSet][response.value]){
                    sets[response.questionSet][response.value] = 0;
                }
                sets[response.questionSet][response.value]++;
                // dataset.data.push(response.value);
            });
            resultStr += `<h2>${question.title}</h2>`;
            Object.keys(sets).forEach((setKey) => {
                // const setData = sets[setKey];
                // console.log(key); // key
                // dataset.labels =
                const orderedSetData = {};
                Object.keys(sets[setKey]).sort().forEach(aggregatorKey => {
                    orderedSetData[aggregatorKey] = sets[setKey][aggregatorKey];
                });
                sets[setKey] = orderedSetData;

                resultStr += `<h3>Set ${setKey}</h3><ul>`;
                Object.keys(sets[setKey]).forEach(aggregatorKey => {
                    resultStr += `<li>${aggregatorKey} by ${sets[setKey][aggregatorKey]} people</li>`;
                    // dsClone.data.push(sets[setKey][aggregatorKey]);
                });
                resultStr += `</ul>`;

                console.log(question.title, setKey, sets[setKey]);

                const dsClone = JSON.parse(JSON.stringify(dataset));
                dsClone.label = dsClone.label + " Set: " + setKey;
                Object.keys(sets[setKey]).forEach(aggregatorKey => {
                    dsClone.data.push(sets[setKey][aggregatorKey]);
                });
                // datasets.yAxisID = ""+setKey;
                datasets.push(dsClone);
            });
            // Object.keys(orderedSetData).forEach(aggregatorKey => {
            //     // dataset.data.push(sets[setKey]);
            //     dataset.data.push(orderedSetData[aggregatorKey]);
            // })
            // console.log("sets", sets)

            console.log("datasets", datasets);

            const myBarChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(groups),
                    // labels: ["January", "February", "March", "April", "May", "June", "July"],
                    // datasets: datasets
                    datasets
                },
                options: {
                    responsive: true,
                    title: {
                        display: true,
                        text: data.questionnaire.title
                    },
                    "scales": {
                        // "xAxes":
                        // [
                        //     {
                        //         stacked: true
                        //     }
                        // ],
                        "yAxes":
                            [
                                {
                                    "ticks": {
                                        "beginAtZero": true
                                    },
                                    // stacked: true
                                }
                            ]
                    },
                }
            });

            //[
            //     {
            //         "label": "My First Dataset",
            //         "data": [65, 59, 80, 81, 56, 55, 40],
            //         "fill": false,
            //         "backgroundColor": ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"],
            //         "borderColor": ["rgb(255, 99, 132)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"],
            //         "borderWidth": 1
            //     },
            //     {
            //         "label": "My second Dataset",
            //         "data": [49, 25, 30, 65, 80, 23, 10],
            //         "fill": false,
            //         "backgroundColor": ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"],
            //         "borderColor": ["rgb(255, 99, 132)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"],
            //         "borderWidth": 1
            //     }
            // ]
            //each set is a dataset
            //each response is a
            // datasets = [{
            //     barPercentage: 0.5,
            //     barThickness: 6,
            //     maxBarThickness: 8,
            //     minBarLength: 2,
            //     data: [10, 20, 30, 40, 50, 60, 70]
            // }];
        });
        document.getElementById("resultContainer").innerHTML = resultStr;

    }


    console.log("datasets", datasets);
    if(visualisationType === "bar"){
        // const myBarChart = new Chart(ctx, {
        //     type: 'bar',
        //     data: {
        //         labels,
        //         // labels: ["January", "February", "March", "April", "May", "June", "July"],
        //         // datasets: datasets
        //         datasets
        //         // [
        //         //     {
        //         //         "label": "My First Dataset",
        //         //         "data": [65, 59, 80, 81, 56, 55, 40],
        //         //         "fill": false,
        //         //         "backgroundColor": ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"],
        //         //         "borderColor": ["rgb(255, 99, 132)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"],
        //         //         "borderWidth": 1
        //         //     },
        //         //     {
        //         //         "label": "My second Dataset",
        //         //         "data": [49, 25, 30, 65, 80, 23, 10],
        //         //         "fill": false,
        //         //         "backgroundColor": ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"],
        //         //         "borderColor": ["rgb(255, 99, 132)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"],
        //         //         "borderWidth": 1
        //         //     }
        //         // ]
        //     },
        //     options: {
        //         responsive: true,
        //         title: {
        //             display: true,
        //             text: data.questionnaire.title
        //         },
        //         "scales": {"yAxes": [{"ticks": {"beginAtZero": true}}]},
        //     }
        // });
    }
    else if(visualisationType === "line" || visualisationType === "line-grouped") {
        const myChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: datasets
                // {
                //     label: 'Dataset with date object point data',
                //     backgroundColor: color(window.chartColors.blue).alpha(0.5).rgbString(),
                //     borderColor: window.chartColors.blue,
                //     fill: false,
                //     data: [{
                //         x: newDate(0),
                //         y: randomScalingFactor()
                //     }, {
                //         x: newDate(2),
                //         y: randomScalingFactor()
                //     }, {
                //         x: newDate(4),
                //         y: randomScalingFactor()
                //     }, {
                //         x: newDate(5),
                //         y: randomScalingFactor()
                //     }]
                // }
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: data.questionnaire.title
                },
                scales: {
                    xAxes: [{
                        type: 'time',
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Date&Time'
                        },
                        ticks: {
                            major: {
                                fontStyle: 'bold',
                                fontColor: '#FF0000'
                            }
                        }
                    }],
                    yAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'value'
                        }
                    }]
                }
            }
        });
    }
//
//     const questionnaireList = document.getElementById('questionnaireList');
//     const questionnaireItems = questionnaires.reduce((html, questionnaire) => {
//         html += `<li class="questionnaire-item" id="question-${questionnaire._id}" data-questionid="${questionnaire._id}">
// <a href="#" class="question">${questionnaire.title}</a>
// <span class="delete">X</span>
// </a>`;
//         return html;
//     }, '');
//     console.log("questionnaireList", questionnaireList);
//     console.log("new html", questionnaireItems);
//     questionnaireList.innerHTML = questionnaireItems;
//     console.log("questionnaireList.innerHTML", questionnaireList.innerHTML);
//
//     questionnaireList.querySelectorAll('.questionnaire-item .question').forEach(item => {
//         item.addEventListener('click', (e) => {
//             //set this question as current (collecting answers)
//             e.preventDefault();
//             e.stopPropagation();
//             ipcRenderer.send('select-questionnaire', e.target.parentElement.dataset.questionid);
//         });
//     });
//     questionnaireList.querySelectorAll('.questionnaire-item .delete').forEach(item => {
//         item.addEventListener('click', (e) => {
//             //set this question as current (collecting answers)
//             e.preventDefault();
//             e.stopPropagation();
//             const response = confirm("Are you sure you want to delete this question with all its responses?\nWARNING: This action cannot be undone.");
//             if (response === true) {
//                 ipcRenderer.send('delete-questionnaire', e.target.parentElement.dataset.questionid);
//             }
//         });
//     });
});

// const myChart = new Chart(ctx, {
//     type: 'bar',
//     data: {
//         labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
//         datasets: [{
//             label: '# of Votes',
//             data: [12, 19, 3, 5, 2, 3],
//             backgroundColor: [
//                 'rgba(255, 99, 132, 0.2)',
//                 'rgba(54, 162, 235, 0.2)',
//                 'rgba(255, 206, 86, 0.2)',
//                 'rgba(75, 192, 192, 0.2)',
//                 'rgba(153, 102, 255, 0.2)',
//                 'rgba(255, 159, 64, 0.2)'
//             ],
//             borderColor: [
//                 'rgba(255, 99, 132, 1)',
//                 'rgba(54, 162, 235, 1)',
//                 'rgba(255, 206, 86, 1)',
//                 'rgba(75, 192, 192, 1)',
//                 'rgba(153, 102, 255, 1)',
//                 'rgba(255, 159, 64, 1)'
//             ],
//             borderWidth: 1
//         }]
//     },
//     options: {
//         scales: {
//             yAxes: [{
//                 ticks: {
//                     beginAtZero: true
//                 }
//             }]
//         }
//     }
// });