var watson_transcriber  = require('./transcription/watson_transcriber.js');
var fr = require('./transcription/file_reader.js');
var fs = require('fs');
var transcription = fs.createWriteStream('transcription.txt');
// var threshold = require('./threshold_detector/launch_threshold.js');
var spawn = require('child_process').spawn;
var exec = require('child_process').execFile;
var filename = 'recording.flac';
var rec;
var silences = exec('./threshold_detector/threshold_detector.py');
var watson = require('watson-developer-cloud');
var csv = require('ya-csv');
var tone_analyzer = watson.tone_analyzer({
  password: 'wPk4cIsEd3JV',
  username: '5f1cfb19-70be-4a78-ac9e-bc1e3f616687',
  version: 'v3-beta',
  version_date: '2016-02-11'
});
var question_order = fs.createWriteStream('question_order.txt');
var questions = [];

var state = {
	transcripts: [],
	silences: [],
	tones: [],
	startTime: Date.now(),
	questionCats: ['', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst'],
	semanticCats: ['belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'],
	hasIntroed: false,
	hasWarmedUp: 0,
	catsAsked: [],
	questionTimeStamps: [],
	proceduralCat: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'semantic'],
	nonSemanticCats: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'semantic', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst'],
	followUp: null,
	questionsAsked: []
};
function readQuestions (filename) {
	if (typeof filename === 'undefined')
		filename = '/Users/tpf2/Desktop/pedro/confessional-database/public/questions.csv';
	var reader = csv.createCsvFileReader(filename);
	reader.on('data', function(data) {
		questions.push(data);
	});
	reader.on('end', function() {
		console.log("questions read in");
	});
}

function playQuestion(filename) {
	var play = exec('./first_pass_ask.py', [filename]);
	play.on('end', function () {
		state.questionTimeStamps.push(Date.now());
	});
}

function filterNonSemantic(cat) {
	return questions.filter(function (elem) {
		for (var i = 6; i < 8; i++) {
			if (state.nonSemanticCats.indexOf(elem[i]) !== -1) {
				return false;
			}
		}
		return elem[5] === cat && state.questionsAsked.indexOf(elem[1]) === -1;
	});
}

function pickFromQuestionArray(cat, semantic, followUp) {
	if (typeof followUp !== 'undefined')
		followUp = 'followup';
	var filter = semantic ? filterSemantic : filterNonSemantic;
	var filteredArray = filter(cat);
	var arrLen = filteredArray.length;
	var question = filteredArray[parseInt(Math.random()*arrLen, 10)];
	if (question[2] === 'hardfollow') {
		for (var i = 0; i < questions.length; i++) {
			if (question[3] === questions[i][1]) {
				state.followUp = questions[i];
				break;
			}
		}
	}
	return question;
}

// in general, for picking questions, a first question[5-7] can't be in questionCats & proceduralCats
function filterSemantic (cat) {
	return questions.filter(function (elem) {
		for (var i = 5; i < 8; i++) {
			
			if (state.nonSemanticCats.indexOf(elem[i]) !== -1) {
				return false;
			}
		}
		return elem[5] === cat && state.questionsAsked.indexOf(elem[1]) === -1;
	});
}


function decideProceduralCat () {
	var now = Date.now();
	var diff = now - state.startTime;
	if (!state.hasIntroed) {
		state.hasIntroed = true;
		return 'intro';
	} else if (diff < 10000 || state.hasWarmedUp < 2) {
		state.hasWarmedUp += 1;
		return parseInt(Date.now(), 10) % 2 === 0 ? 'warmup' : 'gettingwarmer';
	} else if (diff < 20000) {
		return 'aboutyou';
	} else {
		return 'semantic';
	}
}



function pickQuestion () {
	var now = Date.now();
	var diff = now - state.startTime;
	// console.log(state.transcripts.join(''));
	console.log(state.followUp);
	if (state.followUp === null) {
		category = decideProceduralCat();
		// console.log(category);
		if (category !== 'semantic') {
			// pick a semantic category, for now just randomly
			question = pickFromQuestionArray(category, false);
		} else {
			category = state.semanticCats[parseInt(Math.random() * 8, 10)]
			question = pickFromQuestionArray(category, true);
		}
		state.catsAsked.push(category);
		// state.questionTimeStamps.push(now);
		// console.log(question);
	} else {
		question = state.followUp;
		state.catsAsked.push(question[5]);
		state.followUp = null;
	}

	console.log(question[1], question[5], question);
	question_order.write(question[1] + ' ' + question[5] + '\n');
	state.questionsAsked.push(question[1]);
	playQuestion(question[1]);
}

readQuestions()
console.log('testing silence threshold, please be quiet');
function launchRec() {
	rec = exec('./s.sh');
};

silences.stdout.on('data', function (data) {
	// console.log(data);
	var strData = data.toString();
	if (strData.indexOf('volume threshold set') !== -1) {
		launchRec();
		console.log('silence set at', strData);
		console.log('starting recorder.....');

		setTimeout(function () {
			fr.readFile(filename, watson_transcriber.stream);
			pickQuestion();
			console.log('recording started');
			console.log('sending to Watson');
		}, 1000);
	} else if (strData.indexOf('Threshold detected') !== -1) {
		console.log("THERE WAS A SILENCE");
		// kill recorder
		rec.kill();
		pickQuestion();

		tone_analyzer.tone({ text: state.transcripts.join('') },
		 function(err, tone) {
		    if (err)
		      console.log(err);
		    else {

		      		// console.log(JSON.stringify(tone, null, 2));
		      		state.tones.push(tone)
		  		}
		});

		// rec.kill();

		// silences.kill();
	} else if (strData.indexOf('Threshold time: ') !== -1) {
		state.silences.push(Number(strData.slice(16)));
	}
});

silences.on('error', function (err) {
	console.log('error');
});

silences.on('end', function () {
	var questionThreshold = exec('./threshold_detector/threshold_detector.py', [250]);
	questionThreshold.stdout.on('data', function(data) {
		if (strData.indexOf('Threshold detected') !== -1) {
			// stop question
		}
	});
});


// fr.on('data', function (data) {
// 	watson.stream.write(data);
// });

// fr.on('end', function ()  {
// 	process.stdout.write('file reading ended');	
// });

// watson.stream.on('results', function (data) {
//   var results = data ? data.results : null;
//   var alternatives;
//   if (results && results.length > 0) {
//     if (results[0].final === true) {
//         alternatives = results[0].alternatives[0];
//         state.transcripts.push(alternatives.transcript);
//         process.stdout.write(aternatives.transcript);
//         transcription.write(alternatives.transcript);
//         // module.exports.emit('transcriptData', data);
//     }
//   } else {
//     // module.exports.emit('noData', results);
//   }
// });

watson_transcriber.on('transcriptData', function (data) {
	var alternatives = data.results[0].alternatives[0];
	state.transcripts.push(alternatives.transcript);
	// process.stdout.write(alternatives.transcript);
	transcription.write(alternatives.transcript);
});