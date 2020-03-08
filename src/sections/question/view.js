/**
 * Author: Frederik Brudy <fb@fbrudy.net>
 */
const {ipcRenderer} = require('electron')
    , settings = require('electron-settings');


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

const arrAvg = arr => arr.reduce((sum, value) => sum + value, 0) / arr.length;

const roundTwoDecimals = num => Math.round((num + Number.EPSILON) * 100) / 100; //round to two decimal places. Add EPSILON for cas when stdDev is e.g. 1.005

function standardDeviation(values){
    const avg = arrAvg(values);

    const squareDiffs = values.map(function(value){
        const diff = value - avg;
        const sqrDiff = diff * diff;
        return sqrDiff;
    });

    const avgSquareDiff = arrAvg(squareDiffs);

    const stdDev = Math.sqrt(avgSquareDiff);
    return stdDev;
}

const rgbToHex = (rgb) => {
    let hex = Number(rgb).toString(16);
    if (hex.length < 2) {
        hex = "0" + hex;
    }
    return hex;
};

const fullColorHex = (r,g,b) => {
    const red = rgbToHex(r);
    const green = rgbToHex(g);
    const blue = rgbToHex(b);
    return red+green+blue;
};

const LightenDarkenColor = (col, amt, forcePound = false) => {

    col = col.replace("rgba(", "rgb(");

    if(col.startsWith("rgb(")){
        const parts = col.replace("rgb(", "").replace(")", "").split(",");
        col = fullColorHex(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
        forcePound = true;
    }

    var usePound = false;

    if (col[0] === "#") {
        col = col.slice(1);
        usePound = true;
    }

    const num = parseInt(col,16);

    let r = (num >> 16) + amt;

    if (r > 255) r = 255;
    else if  (r < 0) r = 0;

    let b = ((num >> 8) & 0x00FF) + amt;

    if (b > 255) b = 255;
    else if  (b < 0) b = 0;

    let g = (num & 0x0000FF) + amt;

    if (g > 255) g = 255;
    else if (g < 0) g = 0;

    const result = ((usePound||forcePound)?"#":"") + (g | (b << 8) | (r << 16)).toString(16);
    // console.log(result);
    return result;
};


const horizontalLinePlugin = {
    beforeDraw: function(chartInstance) {
        const yScale = chartInstance.scales["y-axis-0"];
        const xScale = chartInstance.scales["x-axis-0"];
        const canvas = chartInstance.chart;
        const ctx = canvas.ctx;
        let index;
        let line;
        let style;

        if (chartInstance.options.horizontalLine) {
            for (index = 0; index < chartInstance.options.horizontalLine.length; index++) {
                line = chartInstance.options.horizontalLine[index];

                if (!line.style) {
                    style = "rgba(169,169,169, .6)";
                }
                else {
                    style = line.style;
                }

                let yValue = line.y ? yScale.getPixelForValue(line.y) : 0;

                let startPos = xScale.getPixelForValue(0);
                // if (line.y) {
                //     yValue = yScale.getPixelForValue(line.y);
                // }

                ctx.lineWidth = line.width ? line.width : 1;

                if (yValue) {
                    ctx.beginPath();
                    ctx.moveTo(startPos, yValue);
                    ctx.lineTo(canvas.width, yValue);
                    ctx.strokeStyle = style;
                    ctx.stroke();
                }

                const textStyle = LightenDarkenColor(style, -50);
                if (line.text) {
                    ctx.fillStyle = textStyle;
                    ctx.fillText(line.text, startPos+3, yValue);
                }
            }
        }
    }
};
Chart.pluginService.register(horizontalLinePlugin);

// LightenDarkenColor(window.chartColors.red, 10, true);

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

document.getElementById('refresh-view-questionnaire').addEventListener('click', (e) => {
    // console.log('click');
    ipcRenderer.send('get-responses'); //add questionnaire ID
});

if(settings.get("visualisationType") === undefined){
    settings.set("visualisationType", "stacked-bar");
}

function updateVisTypeButtons() {
    document.querySelectorAll(".visType-selection").forEach(el => {
        el.classList.remove("selected");
        if(el.dataset.type === settings.get("visualisationType")){
            el.classList.add("selected");
        }
    })
}

updateVisTypeButtons();
document.querySelectorAll(".visType-selection").forEach(el => {
    el.addEventListener("click", e => {
        const btn = e.target;
        e.preventDefault();
        console.log("setting vis type to", btn.dataset.type);
        settings.set("visualisationType", btn.dataset.type);
        updateVisTypeButtons();
        document.getElementById("refresh-view-questionnaire").click();
    })
});
// const visualisationType = "stacked-bar";//"bar|line|line-grouped";
ipcRenderer.on('responses', (event, data) => {
    //delete all responses
    console.log("responses received", data);
    // console.log("questionnaire", data.questionnaire.title);
    const q = data.questionnaire.questions;
    const r = data.responses;
    const allSets = data.sets;
    const setsInCurrentQuestionnaire = [];
    // console.log("q", q);
    // console.log("r", r);
    // console.log("allSets", allSets);

    r.forEach(response => {
        if(!setsInCurrentQuestionnaire.includes(response.questionSet)){
            setsInCurrentQuestionnaire.push(response.questionSet);
        }
    });

    console.log("setsInCurrentQuestionnaire", setsInCurrentQuestionnaire);

    const hiddenSets = settings.get("hidden-sets");
    const setsToHide = document.getElementById("sets-to-hide");
    // console.log("hiddenSets", hiddenSets);

    for (let i = 0; i < setsToHide.children.length; i++) {
        const el = setsToHide.children[i];
        if(hiddenSets.includes(el.dataset.setId)){
            el.classList.add("hidden-set");
        }
        if(setsInCurrentQuestionnaire.includes(el.dataset.setId)){
            el.classList.remove("hidden");
        }
        else{
            el.classList.add("hidden");
        }
    }

    // const backgroundColors = ["rgba(255, 99, 132, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"];
    const backgroundColors = [window.chartColors.yellow, window.chartColors.blue, window.chartColors.green, window.chartColors.red, window.chartColors.red];
    const borderColor = ["rgb(255, 99, 132)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"];

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
    if(settings.get("visualisationType") === "line"){
        //group responses 0-4; 5-8; 9-12
        let resultStr = "";
        q.forEach((question, index) => {

            let responses = r.filter(response => {
                return response.questionId === question.questionId;
            });
            responses = responses.filter(response => {
                return !hiddenSets.includes(response.questionSet);
            });
            const sets = {};

            responses.forEach(response => {
                if (!sets[response.questionSet]) {
                    sets[response.questionSet] = [];//JSON.parse(JSON.stringify(groups))//
                }
                response.value = parseInt(response.value);
                if (!sets[response.questionSet]) {
                    sets[response.questionSet] = [];
                }
                sets[response.questionSet].push(response.value);
            });
            console.log("line sets", sets, question);

            const setsNew = {};

            const lineChartDataForThisQustion = [];
            const setLabels = [];
            let errorBars = {};
            let suggestedMax = 0;

            resultStr += `<h2>${question.title}</h2><ul>`;

            Object.keys(sets).forEach(setKey => {
                setsNew[setKey] = {
                    mean: roundTwoDecimals(arrAvg(sets[setKey])),
                    standardDeviation: standardDeviation(sets[setKey]),
                    rawData: sets[setKey]
                };

                lineChartDataForThisQustion.push(setsNew[setKey].mean);
                const set = allSets.find(set => set._id === setKey);
                const setTitle = set!==undefined ? set.title : setKey;
                setLabels.push(setTitle);

                const stdevOffset = setsNew[setKey].standardDeviation/2;
                errorBars[setTitle] = {
                    plus: stdevOffset,
                    minus: stdevOffset,
                };

                const localMax = setsNew[setKey].mean + stdevOffset;
                if(localMax > suggestedMax){
                    suggestedMax = localMax;
                }

                // resultStr += `<div class="set-${setKey}"><h3 >Set ${setTitle}</h3><ul>`;
                resultStr += `<li class="set-${setKey}">Set: ${setTitle}. Mean=${setsNew[setKey].mean}, SD=${roundTwoDecimals(setsNew[setKey].standardDeviation)}</li>`;
                // Object.keys(setData).forEach(aggregatorKey => {
                //     resultStr += `<li class="set-${setKey}">${aggregatorKey} by ${setData[aggregatorKey]} people</li>`;
                // });
                // resultStr += `</ul></div>`;

            });
            resultStr += `</ul>`;


            const questionGroup = document.getElementById(`question-group${index}`);
            questionGroup.innerHTML = "";
            const titleEl = document.createElement("h1");
            titleEl.innerHTML = question.title;
            questionGroup.appendChild(titleEl);

            console.log("setsNew", setsNew);
            // console.log("sets", allSets);
            console.log("lineChartDataForThisQustion", lineChartDataForThisQustion);
            console.log("errorBars", errorBars);

            if(settings.get("showStdev") === false){
                errorBars = undefined;
            }

            const canvas = document.createElement('canvas');
            canvas.classList.add(`set-${question.questionId}`);
            canvas.setAttribute('width', '400');
            canvas.setAttribute('height', '400');

            questionGroup.appendChild(canvas);


            const chart = new Chart(canvas, {
                type: 'line',

                data: {
                    labels: setLabels,
                    datasets: [
                        {
                            label: question.title,
                            backgroundColor: window.chartColors.red,
                            borderColor: window.chartColors.red,
                            data: lineChartDataForThisQustion,
                            fill: false,
                            errorBars,
                        },

                    ]
                },
                options: {
                    responsive: false,
                    title: {
                        display: true,
                        text: question.title,//data.questionnaire.title + " Set " + setKey
                    },
                    scales: {
                        xAxes: [
                            {
                                // type: 'category',
                                // labels: Object.keys(setData),//['January', 'February', 'March', 'April', 'May', 'June']
                                scaleLabel: {
                                    display: true,
                                    labelString: 'Answer set'
                                }
                            }
                        ],
                        yAxes: [
                            {
                                ticks: {
                                    beginAtZero: true,
                                    // suggestedMin: 50,
                                    suggestedMax//responses.length
                                },
                                scaleLabel: {
                                    display: true,
                                    labelString: 'Response (average)'
                                }
                            }
                        ],
                        // xAxes: [{
                        //     stacked: true,
                        // }],
                    },
                    plugins: {
                        chartJsPluginErrorBars: {
                            /**
                             * stroke color, or array of colors
                             * @default: derived from borderColor
                             */
                            color: '#666666aa',
                        }
                    }
                }
            });

            canvas.style.display = "";

        });
        document.getElementById("resultContainer").innerHTML = resultStr;
    }
    else if(settings.get("visualisationType") === 'line2') {
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
    else if(settings.get("visualisationType") === 'line-grouped'){
        q.forEach(question => {
            const dataset = {
                label: question.title,
                ...colors[colorSelection],
                fill: false,
                data: [],
            };
            colorSelection++;
            let responses = r.filter(response => response.questionId === question.questionId);
            responses = responses.filter(response => {
                // console.log("hiddenset includes", hiddenSets.includes(response.questionSet));
                return !hiddenSets.includes(response.questionSet);
            });
            let aggregator = 0;
            let responseCount = 0;
            let currentSet = responses[0].questionSet;
            // console.log('currentSet', responses[0]);
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
    else if(settings.get("visualisationType") === "grouped-bar") {
        //group responses 0-4; 5-8; 9-12
        let resultStr = "";
        q.forEach((question, index) => {

            let responses = r.filter(response => {
                return response.questionId === question.questionId;
            });
            responses = responses.filter(response => {
                // console.log("hiddenset includes", hiddenSets.includes(response.questionSet));
                return !hiddenSets.includes(response.questionSet);
            });
            const sets = {};

            let groups = {"0": 0, "1-4": 0, "5-8": 0, "9-12": 0};
            allSets.forEach(allSet => {
                if(!hiddenSets.includes(allSet._id)) {
                    sets[allSet._id] = JSON.parse(JSON.stringify(groups));
                }
            });

            responses.forEach(response => {
                if (!sets[response.questionSet]) {
                    sets[response.questionSet] = JSON.parse(JSON.stringify(groups))//
                }
                response.value = parseInt(response.value);
                let responseValueKey = "-1";
                if (response.value <= 0) {
                    responseValueKey = "0";
                }
                else if (response.value <= 4) {
                    responseValueKey = "1-4";
                }
                else if (response.value <= 8) {
                    responseValueKey = "5-8";
                }
                else if (response.value <= 12) {
                    responseValueKey = "9-12";
                }
                if (!sets[response.questionSet][responseValueKey]) {
                    sets[response.questionSet][responseValueKey] = 0;
                }
                sets[response.questionSet][responseValueKey]++;
            });

            let maxResponsesPerSetInQuestion = 0;
            Object.values(sets).forEach((set) => {
                Object.values(set).forEach(count => {
                    if (count > maxResponsesPerSetInQuestion) {
                        maxResponsesPerSetInQuestion = count;
                    }
                });
            });

            resultStr += `<h2>${question.title}</h2>`;

            const questionGroup = document.getElementById(`question-group${index}`);
            questionGroup.innerHTML = "";
            const title = document.createElement("h1");
            title.innerHTML = question.title;
            questionGroup.appendChild(title);

            Object.keys(sets).forEach((setKey) => {
                const setData = sets[setKey];
                const set = allSets.find(set => set._id === setKey);
                // console.log("set-raw", set, setKey);
                const title = set!==undefined ? set.title : setKey;
                // console.log("title", title);
                const orderedSetData = {};
                Object.keys(setData).sort().forEach(aggregatorKey => {
                    // console.log("aggregatorKey", aggregatorKey);
                    orderedSetData[aggregatorKey] = setData[aggregatorKey];
                });
                sets[setKey] = orderedSetData;

                resultStr += `<div class="set-${setKey}"><h3 >Set ${title}</h3><ul>`;
                Object.keys(setData).forEach(aggregatorKey => {
                    resultStr += `<li class="set-${setKey}">${aggregatorKey} by ${setData[aggregatorKey]} people</li>`;
                });
                resultStr += `</ul></div>`;

                const canvas = document.createElement('canvas');
                canvas.classList.add(`set-${setKey}`);
                canvas.setAttribute('width', '300');
                canvas.setAttribute('height', '300');

                questionGroup.appendChild(canvas);

                const myBarChart = new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(setData),
                        datasets: [
                            {
                                label: question.title + " (Set " + title + ")",
                                fill: false,
                                backgroundColor: backgroundColors[index],//"rgba(255, 99, 132, 0.2)",
                                borderColor: backgroundColors[index],//"rgb(255, 99, 132)",
                                borderWidth: 1,
                                data: Object.values(setData)
                            },
                        ]
                    },
                    options: {
                        responsive: false,
                        title: {
                            display: true,
                            text: " Set " + title,//data.questionnaire.title + " Set " + setKey
                        },
                        scales: {
                            xAxes: [
                                {
                                    // type: 'category',
                                    // labels: Object.keys(setData),//['January', 'February', 'March', 'April', 'May', 'June']
                                    scaleLabel: {
                                        display: true,
                                        labelString: 'Response (grouped by value)'
                                    }
                                }
                            ],
                            yAxes: [
                                {
                                    ticks: {
                                        beginAtZero: true,
                                        // suggestedMin: 50,
                                        suggestedMax: maxResponsesPerSetInQuestion//responses.length
                                    },
                                    scaleLabel: {
                                        display: true,
                                        labelString: 'Count of responses'
                                    }
                                }
                            ],
                            // xAxes: [{
                            //     stacked: true,
                            // }],
                        },
                    }
                });

                canvas.style.display = "";
                // setTimeout(() => {
                //     canvas.style.display = "";
                // }, 500)
            });

        });
        document.getElementById("resultContainer").innerHTML = resultStr;
    }
    else if(settings.get("visualisationType") === "stacked-bar") {
        //group responses 0-4; 5-8; 9-12
        let resultStr = "";
        q.forEach((question, index) => {
            datasets = [];
            let responses = r.filter(response => {
                return response.questionId === question.questionId;
            });
            responses = responses.filter(response => {
                // console.log("hiddenset includes", hiddenSets.includes(response.questionSet));
                return !hiddenSets.includes(response.questionSet);
            });

            const sets = {};
            let groups = {"0": 0, "1-4": 0, "5-8": 0, "9-12": 0};

            allSets.forEach(allSet => {
                if(!hiddenSets.includes(allSet._id)){
                    sets[allSet._id] = JSON.parse(JSON.stringify(groups));
                }
            });
            // console.log("sets1", sets);

            responses.forEach(response => {
                if (!sets[response.questionSet]) {
                    sets[response.questionSet] = JSON.parse(JSON.stringify(groups));
                }
                response.value = parseInt(response.value);
                let responseValueKey = "-1";
                if (response.value === 0) {
                    responseValueKey = "0";
                }
                else if (response.value <= 4) {
                    responseValueKey = "1-4";
                }
                else if (response.value <= 8) {
                    responseValueKey = "5-8";
                }
                else if (response.value <= 12) {
                    responseValueKey = "9-12";
                }
                if (!sets[response.questionSet][responseValueKey]) {
                    sets[response.questionSet][responseValueKey] = 0;
                }
                sets[response.questionSet][responseValueKey]++;
            });

            let maxResponsesPerSetInQuestion = 0;
            Object.values(sets).forEach((set) => {
                Object.values(set).forEach(count => {
                    if (count > maxResponsesPerSetInQuestion) {
                        maxResponsesPerSetInQuestion = count;
                    }
                });
            });
            // console.log("sets", sets);

            resultStr += `<h2>${question.title}</h2>`;

            const questionGroup = document.getElementById(`question-group${index}`);
            questionGroup.innerHTML = "";
            const title = document.createElement("h1");
            title.innerHTML = question.title;
            questionGroup.appendChild(title);

            Object.keys(sets).forEach((setKey) => {
                const setData = sets[setKey];
                const set = allSets.find(set => set._id === setKey);
                const title = set!==undefined ? set.title : setKey;
                const orderedSetData = {};
                Object.keys(setData).sort().forEach(aggregatorKey => {
                    // console.log("aggregatorKey", aggregatorKey);
                    orderedSetData[aggregatorKey] = setData[aggregatorKey];
                });
                sets[setKey] = orderedSetData;

                resultStr += `<div class="set-${setKey}"><h3 >Set ${title}</h3><ul>`;
                Object.keys(setData).forEach(aggregatorKey => {
                    resultStr += `<li class="set-${setKey}">${aggregatorKey} by ${setData[aggregatorKey]} people</li>`;
                });
                resultStr += `</ul></div>`;
                const dataset = {
                    label: `Set ${title}`,
                    fill: false,
                    backgroundColor: backgroundColors[index],//"rgba(255, 99, 132, 0.2)",
                    borderColor: backgroundColors[index],//"rgb(255, 99, 132)",
                    borderWidth: 1,
                    data: Object.values(setData),
                    stack: `Set`,
                };

                datasets.push(dataset);

            });

            // console.log("datasets in Q"+question.questionId, datasets);
            // console.log("groups in Q"+question.questionId, groups);
            // console.log("sets in Q"+question.questionId, sets);

            const canvas = document.createElement('canvas');
            // canvas.classList.add(`set-${setKey}`);
            canvas.setAttribute('width', '300');
            canvas.setAttribute('height', '300');

            questionGroup.appendChild(canvas);

            //each set is a label/month
            //each response group is a dataset, i.e. 1-4 is a dataset
            //the position in the data attribute of the dataset describes which label it is
            const labels = Object.keys(sets).reduce((prevValue, currentValue, currentIndex, arr) => {
                const currentSet = allSets.find(set => set._id === currentValue);
                let title = currentValue;
                if(currentSet !== undefined){
                    title = currentSet.title !== undefined ? currentSet.title : currentSet._id;
                }
                prevValue.push(`Set ${title}`);
                return prevValue;
            }, []);
            const data14 = [];
            Object.values(sets).forEach(set => data14.push(set["1-4"]));
            const data0 = [];
            Object.values(sets).forEach(set => data0.push(set["0"]));
            const data58 = [];
            Object.values(sets).forEach(set => data58.push(set["5-8"]));
            const data912 = [];
            Object.values(sets).forEach(set => data912.push(set["9-12"]));
            const data = {
                labels,
                datasets: [
                    {
                        label: '0',
                        backgroundColor: window.chartColors.red,
                        stack: 'Stack 0',
                        data: data0
                    },
                    {
                        label: '1-4',
                        backgroundColor: window.chartColors.yellow,
                        stack: 'Stack 0',
                        data: data14
                    },
                    {
                        label: '5-8',
                        backgroundColor: window.chartColors.blue,
                        stack: 'Stack 0',
                        data: data58
                    },
                    {
                        label: '9-12',
                        backgroundColor: window.chartColors.green,
                        stack: 'Stack 0',
                        data: data912
                    }
                ]
            };
            const myBarChart = new Chart(canvas, {
                type: 'bar',
                data,
                // data: {
                //     // labels: Object.keys(setData),
                //     datasets
                // },
                options: {
                    responsive: false,
                    title: {
                        display: true,
                        text: " Set " + question.title,//data.questionnaire.title + " Set " + setKey
                    },
                    scales: {
                        xAxes: [
                            {
                                //     type: 'category',
                                //     labels: Object.keys(setData),//['January', 'February', 'March', 'April', 'May', 'June']
                                stacked: true,
                                scaleLabel: {
                                    display: true,
                                    labelString: 'Answer set'
                                }
                            }
                        ],
                        yAxes: [
                            {
                                // ticks: {
                                //     // beginAtZero: true,
                                //     suggestedMax: maxResponsesPerSetInQuestion//responses.length
                                // },
                                stacked: true,
                                scaleLabel: {
                                    display: true,
                                    labelString: 'Count of responses'
                                }
                            }
                        ],
                    },
                }
            });

            canvas.style.display = "";

        });
        document.getElementById("resultContainer").innerHTML = resultStr;
    }
    else if(settings.get("visualisationType") === "bubble-chart") {
        //group responses 0-4; 5-8; 9-12
        let resultStr = "";
        q.forEach((question, index) => {
            datasets = [];
            let responses = r.filter(response => {
                return response.questionId === question.questionId;
            });
            responses = responses.filter(response => {
                // console.log("hiddenset includes", hiddenSets.includes(response.questionSet));
                return !hiddenSets.includes(response.questionSet);
            });

            const sets = {};
            let groups = {"0": 0, "1-4": 0, "5-8": 0, "9-12": 0};

            allSets.forEach(allSet => {
                if(!hiddenSets.includes(allSet._id)){
                    sets[allSet._id] = JSON.parse(JSON.stringify(groups));
                }
            });
            // console.log("sets1", sets);

            responses.forEach(response => {
                if (!sets[response.questionSet]) {
                    sets[response.questionSet] = JSON.parse(JSON.stringify(groups));
                }
                response.value = parseInt(response.value);
                let responseValueKey = "-1";
                if (response.value === 0) {
                    responseValueKey = "0";
                }
                else if (response.value <= 4) {
                    responseValueKey = "1-4";
                }
                else if (response.value <= 8) {
                    responseValueKey = "5-8";
                }
                else if (response.value <= 12) {
                    responseValueKey = "9-12";
                }
                if (!sets[response.questionSet][responseValueKey]) {
                    sets[response.questionSet][responseValueKey] = 0;
                }
                sets[response.questionSet][responseValueKey]++;
            });

            let maxResponsesPerSetInQuestion = 0;
            Object.values(sets).forEach((set) => {
                Object.values(set).forEach(count => {
                    if (count > maxResponsesPerSetInQuestion) {
                        maxResponsesPerSetInQuestion = count;
                    }
                });
            });

            resultStr += `<h2>${question.title}</h2>`;

            const questionGroup = document.getElementById(`question-group${index}`);
            questionGroup.innerHTML = "";
            const title = document.createElement("h1");
            title.innerHTML = question.title;
            questionGroup.appendChild(title);
            let suggestedYMax = 0, suggestedXMax = 0, suggestedLineWidth = {};
            const radiusMultiplier = 4;
            Object.keys(sets).forEach((setKey, setIndex) => {
                const setData = sets[setKey];
                const set = allSets.find(set => set._id === setKey);
                const title = set!==undefined ? set.title : setKey;
                const orderedSetData = {};
                Object.keys(setData).sort().forEach(aggregatorKey => {
                    // console.log("aggregatorKey", aggregatorKey);
                    orderedSetData[aggregatorKey] = setData[aggregatorKey];
                });
                sets[setKey] = orderedSetData;

                resultStr += `<div class="set-${setKey}"><h3 >Set ${title}</h3><ul>`;
                Object.keys(setData).forEach(aggregatorKey => {
                    resultStr += `<li class="set-${setKey}">${aggregatorKey} by ${setData[aggregatorKey]} people</li>`;
                });
                resultStr += `</ul></div>`;

                //data: [{x: setX, y: 1-4/4-5/..., r: radius}]
                const data = [];


                Object.keys(setData).forEach((key, index, arr) => {
                    let y = 0;
                    // console.log("key", key, typeof key);
                    // key = parseInt(key);
                    if(key === "0")
                        y = 0;
                    else if(key === "1-4")
                        y = 10;
                    else if(key === "5-8")
                        y = 20;
                    else if(key === "9-12")
                        y = 30;

                    const d = {
                        x: 5 + (setIndex * 5),
                        y: y + 5,
                        // y,
                        r: setData[key] * radiusMultiplier,
                    };
                    if(d.y > suggestedYMax){
                        suggestedYMax = d.y;
                    }
                    if(d.x > suggestedXMax){
                        suggestedXMax = d.r;
                    }

                    if(!suggestedLineWidth.hasOwnProperty(key) || suggestedLineWidth[key] < d.r){
                        suggestedLineWidth[key] = d.r;
                    }

                    data.push(d);
                });

                const dataset = {
                    label: `Set ${title}`,
                    // fill: true,
                    backgroundColor: backgroundColors[setIndex],
                    borderColor: LightenDarkenColor(backgroundColors[setIndex], -50, true),
                    borderWidth: 1.5,
                    data: data,
                    stack: `Set`,
                };
                // console.log("setData for set", title, setData);
                datasets.push(dataset);

            });

            console.log("datasets in Q"+question.questionId, datasets);
            // console.log("groups in Q"+question.questionId, groups);
            // console.log("sets in Q"+question.questionId, sets);

            const canvas = document.createElement('canvas');
            // canvas.classList.add(`set-${setKey}`);
            canvas.setAttribute('width', '400');
            canvas.setAttribute('height', '400');

            questionGroup.appendChild(canvas);

            //each set is a label/month
            //each response group is a dataset, i.e. 1-4 is a dataset
            //the position in the data attribute of the dataset describes which label it is
            const labels = Object.keys(sets).reduce((prevValue, currentValue, currentIndex, arr) => {
                const currentSet = allSets.find(set => set._id === currentValue);
                let title = currentValue;
                if(currentSet !== undefined){
                    title = currentSet.title !== undefined ? currentSet.title : currentSet._id;
                }
                prevValue.push(`Set ${title}`);
                return prevValue;
            }, []);
            // const data14 = [];
            // Object.values(sets).forEach(set => data14.push(set["1-4"]));
            // const data0 = [];
            // Object.values(sets).forEach(set => data0.push(set["0"]));
            // const data58 = [];
            // Object.values(sets).forEach(set => data58.push(set["5-8"]));
            // const data912 = [];
            // Object.values(sets).forEach(set => data912.push(set["9-12"]));
            // const data = {
            //     labels,
            //     datasets: [
            //         {
            //             label: '0',
            //             backgroundColor: window.chartColors.red,
            //             stack: 'Stack 0',
            //             data: data0
            //         },
            //         {
            //             label: '1-4',
            //             backgroundColor: window.chartColors.yellow,
            //             stack: 'Stack 0',
            //             data: data14
            //         },
            //         {
            //             label: '5-8',
            //             backgroundColor: window.chartColors.blue,
            //             stack: 'Stack 0',
            //             data: data58
            //         },
            //         {
            //             label: '9-12',
            //             backgroundColor: window.chartColors.green,
            //             stack: 'Stack 0',
            //             data: data912
            //         }
            //     ]
            // };

            const myBarChart = new Chart(canvas, {
                type: 'bubble',
                data: {
                    datasets
                },
                // data: {
                //     // labels: Object.keys(setData),
                //     datasets
                // },
                options: {
                    horizontalLine: [
                        {
                            y: 5,
                            // style: "rgba(255, 0, 0, .4)",
                            text: "0",
                            width: suggestedLineWidth["0"] * 2 + 2,
                        },
                        {
                            y: 15,
                            // style: "#00ffff",
                            text: "1-4",
                            width: suggestedLineWidth["1-4"] * 2 + 2
                        },
                        {
                            y: 25,
                            text: "5-8",
                            // style: "rgba(255, 0, 0, .4)",
                            width: suggestedLineWidth["5-8"] * 2 + 2
                        },
                        {
                            y: 35,
                            text: "9-12",
                            // style: "rgba(255, 0, 0, .4)",
                            width: suggestedLineWidth["9-12"] * 2 + 2
                        }
                    ],
                    tooltips: {
                        callbacks: {
                            label: function(tooltipItem, data) {
                                console.log("tooltipItem", tooltipItem, data.datasets[tooltipItem.datasetIndex]);
                                let label = data.datasets[tooltipItem.datasetIndex].label || '';
                                const itemData = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                                console.log(itemData.r);
                                const responseCount = itemData.r / radiusMultiplier;
                                // if (label) {
                                //     label += ': ';
                                // }
                                label = '';
                                label += responseCount;
                                return label;
                            }
                        }
                    },
                    responsive: false,
                    title: {
                        display: true,
                        text: " Set " + question.title + " (grouped answers)",//data.questionnaire.title + " Set " + setKey
                    },
                    scales: {
                        xAxes: [
                            {
                                ticks: {
                                    display: false,
                                    beginAtZero: true,
                                    suggestedMax: suggestedXMax
                                },
                                // ticks: false,
                                //     type: 'category',
                                // labels: ['January', 'February', 'March', 'April', 'May', 'June'],
                                // stacked: true,
                                scaleLabel: {
                                    display: true,
                                    labelString: 'Answer set'
                                }
                            }
                        ],
                        yAxes: [
                            {
                                // display: false,
                                ticks: {
                                    display: false,
                                    beginAtZero: true,
                                    suggestedMax: suggestedYMax + 5//responses.length
                                },
                                scaleLabel: {
                                    display: true,
                                    labelString: 'Response (grouped by value)'
                                }
                            }
                        ],
                    },
                }
            });

            canvas.style.display = "";

        });
        document.getElementById("resultContainer").innerHTML = resultStr;
    }
    else if(settings.get("visualisationType") === "bar"){
        colorSelection = 0;
        let resultStr = "";
        q.forEach((question, index) => {

            let responses = r.filter(response => {
                return response.questionId === question.questionId;
            });
            responses = responses.filter(response => {
                // console.log("hiddenset includes", hiddenSets.includes(response.questionSet));
                return !hiddenSets.includes(response.questionSet);
            });
            const sets = {};

            let groups = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0};
            responses.forEach(response => {
                if(!sets[response.questionSet]){
                    sets[response.questionSet] = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0};
                }
                if(!sets[response.questionSet][response.value]){
                    sets[response.questionSet][response.value] = 0;
                }
                sets[response.questionSet][response.value]++;
            });

            let maxResponsesPerSetInQuestion = 0;
            Object.values(sets).forEach((set) => {
                Object.values(set).forEach(count => {
                    if(count > maxResponsesPerSetInQuestion ){
                        maxResponsesPerSetInQuestion = count;
                    }
                });
            });


            resultStr += `<h2>${question.title}</h2>`;

            const questionGroup = document.getElementById(`question-group${index}`);
            questionGroup.innerHTML = "";
            const title = document.createElement("h1");
            title.innerHTML = question.title;
            questionGroup.appendChild(title);

            Object.keys(sets).forEach((setKey) => {
                const setData = sets[setKey];
                const set = allSets.find(set => set._id === setKey);
                // console.log("set-raw", set, setKey);
                const title = set!==undefined ? set.title : setKey;
                // console.log("title", title);
                const orderedSetData = {};
                Object.keys(setData).sort().forEach(aggregatorKey => {
                    // console.log("aggregatorKey", aggregatorKey);
                    orderedSetData[aggregatorKey] = setData[aggregatorKey];
                });
                sets[setKey] = orderedSetData;

                resultStr += `<div class="set-${setKey}"><h3 >Set ${title}</h3><ul>`;
                Object.keys(setData).forEach(aggregatorKey => {
                    resultStr += `<li class="set-${setKey}">${aggregatorKey} by ${setData[aggregatorKey]} people</li>`;
                });
                resultStr += `</ul></div>`;

                const canvas = document.createElement('canvas');
                canvas.classList.add(`set-${setKey}`);
                canvas.setAttribute('width', '300');
                canvas.setAttribute('height', '300');

                questionGroup.appendChild(canvas);

                const myBarChart = new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(setData),
                        datasets: [
                            {
                                label: question.title + " (Set " + title + ")",
                                fill: false,
                                backgroundColor: backgroundColors[index],//"rgba(255, 99, 132, 0.2)",
                                borderColor: backgroundColors[index],//"rgb(255, 99, 132)",
                                borderWidth: 1,
                                data: Object.values(setData)
                            },
                        ]
                    },
                    options: {
                        responsive: false,
                        title: {
                            display: true,
                            text: " Set " + title,//data.questionnaire.title + " Set " + setKey
                        },
                        scales: {
                            // xAxes: [{
                            //     type: 'category',
                            //     labels: Object.keys(setData),//['January', 'February', 'March', 'April', 'May', 'June']
                            // }],
                            yAxes: [
                                {
                                    ticks: {
                                        beginAtZero: true,
                                        // suggestedMin: 50,
                                        suggestedMax: maxResponsesPerSetInQuestion//responses.length
                                    },
                                }
                            ]
                        },
                    }
                });

                canvas.style.display = "";
                // setTimeout(() => {
                //     canvas.style.display = "";
                // }, 500)
            });

            // const myBarChart = new Chart(ctx, {
            //     type: 'bar',
            //     data: {
            //         labels: ["Set1", "Set2", "Set3"],//Object.keys(groups),//Set1, Set2, Set3, etc
            //         datasets: [
            //             {
            //                 label: question.title + " Set2",
            //                 // ...colors[colorSelection],
            //                 fill: false,
            //                 backgroundColor: ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"],
            //                 borderColor: ["rgb(255, 99, 132)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"],
            //                 borderWidth: 1,
            //                 // data: [{x:new Date(), y:20}, {x:new Date(), y:10}]
            //                 // data: [{x:'2016-12-25', y:20}, {x:'2019-12-28', y:10}, {x:'2017-12-28', y:10}]
            //                 data: [9, 15, 20]
            //             },
            //             {
            //                 label: question.title + " Set3",
            //                 // ...colors[colorSelection],
            //                 fill: false,
            //                 backgroundColor: ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"],
            //                 borderColor: ["rgb(255, 99, 132)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"],
            //                 borderWidth: 1,
            //                 // data: [{x:new Date(), y:20}, {x:new Date(), y:10}]
            //                 // data: [{x:'2016-11-25', y:20}, {x:'2019-11-28', y:10}, {x:'2017-11-28', y:10}]
            //                 data: [9, 15, 20]
            //             }
            //         ]
            //     },
            //     options: {
            //         responsive: false,
            //         title: {
            //             display: true,
            //             text: data.questionnaire.title
            //         },
            //         "scales": {
            //             "yAxes": [ {"ticks": { "beginAtZero": true }, } ]
            //         },
            //     }
            // });
        });
        document.getElementById("resultContainer").innerHTML = resultStr;

    }


    // console.log("datasets", datasets);
    if(false && settings.get("visualisationType") === "line" || settings.get("visualisationType")  === "line-grouped") {
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
});
