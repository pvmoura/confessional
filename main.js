var watson_transcriber  = require('./transcription/watson_transcriber.js');
var fr = require('./transcription/file_reader.js');
var fs = require('fs');
var transcription = fs.createWriteStream('transcription.txt');
// var threshold = require('./threshold_detector/launch_threshold.js');
var spawn = require('child_process').spawn;
var exec = require('child_process').execFile;
var filename = 'recording.flac';
var rec;
var silences;
var watson = require('watson-developer-cloud');
var csv = require('ya-csv');
var classifier = exec('./category_classifier.py');
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
	questionsAsked: [],
	nextCategory: [],
	usedCats: [],
	currTrans: [],
	silenceThreshold: null
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
		//launchSilences(state.silenceThreshold);
		//launchRec();
	});
	play.on('error', function(err) {
		console.log('playing error', err);
		// launchSilences(state.silenceThreshold);
		// launchRec();
	})
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
	// if (typeof question === 'undefined')
	console.log(question ? question[0] : "No question", cat, semantic, followUp);
	if (typeof question === 'undefined')
		pickQuestion();
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
	} //else if (diff < 2000) {
	//	return 'aboutyou';
//	}
	 else {
		return 'semantic';
	}
}



function pickQuestion () {
	var now = Date.now();
	var diff = now - state.startTime;
	var availCats = [];
	// console.log(state.transcripts.join(''));
	console.log(state.followUp);
	if (state.followUp === null) {
		category = decideProceduralCat();
		// console.log(category);
		if (category !== 'semantic') {
			question = pickFromQuestionArray(category, false);
		} else {
			// pick a semantic category, for now just randomly
			counts = {};
			state.nextCategory.map(function (elem, arr) {
				if (typeof counts[elem] === 'undefined')
					counts[elem] = 0;
				counts[elem]++;
			});
			topCount = null, topCat = null;
			for (var key in counts) {
				if (counts.hasOwnProperty(key)) {
					if (counts[key] > topCount) {
						topCat = key;
						topCount = counts[key];
					}
				}
			}
			category = topCat;
			console.log(state.nextCategory, category, "HELLO");
			if (!category) {
				availCats = state.semanticCats.filter(function (elem, i) {
					return state.usedCats.indexOf(elem) === -1;
				});
				category = availCats[parseInt(Math.random() * 8, 10)];
			}
			state.usedCats.push(category);
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
	state.nextCategory = [];
	state.currTrans = [];
}

function launchSilences(threshold, duration) {
	var options = [];
	if (threshold) {
		if (typeof duration === 'undefined')
			duration = "";
		options = [threshold, duration];
	}
	silences = exec('./threshold_detector/threshold_detector.py', options);
	silences.stdout.on('data', function (data) {
		// console.log(data);
		var strData = data.toString();
		if (strData.indexOf('volume threshold set at:') !== -1) {
			launchRec();
			console.log('silence set at', strData);
			state.silenceThreshold = Number(strData.substr(24));
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
			//rec.kill();
			//silences.kill();
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

		} else if (strData.indexOf('Threshold time: ') !== -1) {
			state.silences.push(Number(strData.slice(16)));
		}
	});

	silences.stderr.on('data', function (err) {
		console.log('error', err);

	});
}

//readQuestions("/Users/pedrovmoura/Documents/Code/third-party/confessional-old/files/questions.csv");
readQuestions();
launchSilences();
console.log('testing silence threshold, please be quiet');
function launchRec() {
	rec = exec('./s.sh');
};


// silences.on('end', function () {
// 	var questionThreshold = exec('./threshold_detector/threshold_detector.py', [250]);
// 	questionThreshold.stdout.on('data', function(data) {
// 		if (strData.indexOf('Threshold detected') !== -1) {
// 			// stop question
// 		}
// 	});
// });

classifier.stdout.on('data', function (data) {
	data = data.trim();
	if (data === 'ready') {
		console.log("CLASSIFIER READY");
	} else if (data === 'default') {
		console.log("NOT ENOUGH INFO TO CLASSIFY");
	} else {
		console.log("I THINK THE NEXT CATEOGRY SHOULD BE: ", data);
		state.nextCategory.push(data);
	}
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
	process.stdout.write(alternatives.transcript);
	state.currTrans.push(alternatives.transcript);
	state.transcripts.push(alternatives.transcript);
	classifier.stdin.write(state.currTrans.join(' ') + "\n");
	// process.stdout.write(alternatives.transcript);
	transcription.write(alternatives.transcript);
});
watson_transcriber.on('watsonError', function (data) {
	console.log("An error occurred!");
});
