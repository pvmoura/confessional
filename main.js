var watson_transcriber = require('./transcription/watson_transcriber.js');
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
var qp = require('./question_picking.js');
var classifier = exec('./category_classifier.py');
var tone_analyzer = watson.tone_analyzer({
  password: 'wPk4cIsEd3JV',
  username: '5f1cfb19-70be-4a78-ac9e-bc1e3f616687',
  version: 'v3-beta',
  version_date: '2016-02-11'
});
var question_order = fs.createWriteStream('question_order.txt');
var qus = require('./question_utilities.js');
var state = {
	transcripts: [],
	silences: [],
	tones: [],
	startTime: Date.now(),
	questionCats: ['staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst'],
	semanticCats: ['belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'],
	categories: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst', 'belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'],
	hasIntroed: false,
	hasWarmedUp: 0,
	catsAsked: [],
	questionTimeStamps: [],
	proceduralCat: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'semantic'],
	nonSemanticCats: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst'],
	followUp: null,
	questionsAsked: [],
	nextCategory: [],
	usedCats: [],
	currTrans: [],
	silenceThreshold: null,
	interviewLength: 1000 * 60 * 30,
	currentQuestion: null,
	futypes: ['yesno', 'length', 'hardfollow'],
	currentQuestion: null,
	oldCategories: [],
	questionsInCat: 0,
	currentCat: null
};

var utils = qus.questionUtils("/Users/pedrovmoura/Documents/Code/third-party/confessional-old/files/questions.csv",
							  state.categories, state.nonSemanticCats);

var actions = {
	end: getEnd,
	followUp: getFollowUp,
	nonSemantic: getNonSemantic,
	booth: getPersonality,
	semantic: getSemantic
}

function getEnd (options) {
	var possQuestions = utils.findQuestionsByFileRegEx(/^end/);
	return utils['pickQuestionFromArray'](possQuestions);
}


// currentQuestion, as per database is something like:
// [text, filename, typefollow, followfile(default/short/yes), followfile(no/long), tag1, tag2, tag3, keywords]
function getFollowUp (options) {
	console.log(state.followUp, state.currentQuestion);
	var fupType = state.followUp || state.futypes.indexOf(state.currentQuestion[2]);
	var followFile = 3;
	switch (fupType) {
		case -1:
			return;
		case 0:
			//yesno logic
			followFile = isYes(options.utterance) ? 3 : 4;
			break;
		case 1:
			followFile = isShort() ? 3 : 4;
			break;
		case 'yesno':
			followFile = isYes(state.currTrans) ? 3 : 4;
			break;
		case 'length':
			followFile = isShort() ? 3 : 4;
		default:
			followFile = 3;
	}
	
	if (state.currentQuestion && state.currentQuestion[followFile]) {
		return utils.findQuestionByFilename(state.currentQuestion[followFile]);
	} else {
		console.log("ERROR at followup");
	}
}

function inIntro (timeDiff) {
	return timeDiff <= 10000 || state.hasWarmedUp < 2;
}

function isShort() {
	return true;
}

function isYes() {
	return true;
}
function getNonSemantic (options) {
	var possQuestions, category, filtered, question;
	if (!state.hasIntroed) {
		state.hasIntroed = true;
		category = 'intro';
	} else if (state.hasWarmedUp === 0) {
		state.hasWarmedUp++;
		category = 'warmup';
	} else {
		state.hasWarmedUp++;
		if (timeSinceLastQuestion() > 60000)
			category = 'gettingwarmer';
		else
			category = 'warmup';
	}
	filtered = utils.filterByCategory(category);
	filtered = utils.filterOutnotfirst(filtered);
	filtered = utils.filterOutfollowup(filtered);
	filtered = utils.filterOutAsked(state.questionsAsked, filtered);
	// come up with a better way of distinguishing between warmup and getting warmer, etc.
	return utils.pickQuestionFromArray(filtered);
}

function getPersonality (options) {
	var booths = ['booth1', 'booth2', 'booth3'];
	var third = options.interviewLength / 3;
	if (options.timeDiff <= third)
		questions = utils['filterBybooth1'];
	else if (options.timeDiff <= third * 2)
		questions = utils['filterBybooth2'];
	else
		questions = utils['filterBybooth3'];
}

function getNewQuestion () {

}

function getSemantic (options) {
	var counts = {}, category, topCount = null, topCat = null;
	state.nextCategory.map(function (elem, arr) {
		if (typeof counts[elem] === 'undefined')
			counts[elem] = 0;
		counts[elem]++;
	});
	
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
	if (category === 'zzzzzz') {

	} else if (!category) {
		// don't filter the available categories, possibly?
		availCats = state.semanticCats.filter(function (elem, i) {
			return state.usedCats.indexOf(elem) === -1;
		});
		category = availCats[parseInt(Math.random() * availCats.length, 10)];
	}
	
	question = pickFromQuestionArray(category, true);
}

function updateState (question) {
	var oldCat = state.currentCat;
	state.currentQuestion = question;

	if (question && question[2])
		state.followUp = question[2];
	else
		state.followUp = null;
	if (question)
		state.questionsAsked.push(question[1]);
	state.oldCategories.push(state.nextCategory);
	state.nextCategory = [];
	state.currTrans = [];
	if (question && question[5]) {
		state.currentCat = question[5];
		state.usedCats.push(question[5]);
	} else
		state.currentCat = null;
	if (oldCat && oldCat === question[5])
		state.questionsInCat++;
}

function timeSinceLastQuestion () {
	var now = Date.now();
	if (state.questionTimeStamps.length === 0)
		return now - state.startTime;
	else {
		return now - state.questionTimeStamps[state.questionTimeStamps.length - 1];
	}
}

var thisProcess = process;
function playQuestion(filename, end) {
	var play = exec('./ask.py', [filename]);
	play.on('end', function () {
		state.questionTimeStamps.push(Date.now());
		if (end)
			thisProcess.kill(thisProcess.pid);
		//launchSilences(state.silenceThreshold);
		//launchRec();
	});
	play.on('error', function(err) {
		console.log('playing error', err);
		// launchSilences(state.silenceThreshold);
		// launchRec();
	})
}

function findEnd() {
	var filtered = questions.filter(function (elem) {
		return elem[1] === 'end2';
	});
	console.log(filtered);
	return filtered[0];
}

function getDiff (start) {
	start = start || state.startTime;
	return Date.now() - start;
}

function pickQuestion () {
	var diff = getDiff();
	//var relevantData = gatherRelevantData(diff);
	var action;
	// console.log(state);
	if (state.followUp !== null) {
		console.log('followup');
		action = actions['followUp'];
	} else if (diff >= state.interviewLength - 30000) {
		console.log('end');
		action = actions['end'];
	} else if (inIntro(diff)) {
		console.log('intro');
		action = actions['nonSemantic'];
	} else if (boothQuestion()) {
		console.log('booth');
		action = actions['booth'];
	} else {
		console.log('semantic');
		action = actions['semantic'];
	}
	question = action();
	console.log(question);
	updateState(question);
	// playQuestion(question[1]);
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

			// tone_analyzer.tone({ text: state.transcripts.join('') },
			//  function(err, tone) {
			//     if (err)
			//       console.log(err);
			//     else {

			//       		// console.log(JSON.stringify(tone, null, 2));
			//       		state.tones.push(tone)
			//   		}
			// });

			// rec.kill();

		} else if (strData.indexOf('Threshold time: ') !== -1) {
			state.silences.push(Number(strData.slice(16)));
		}
	});

	silences.stderr.on('data', function (err) {
		console.log('error', err);

	});
	silences.on('close', function (code) {
		console.log('silences closed', code);
	})
}

//readQuestions("/Users/pedrovmoura/Documents/Code/third-party/confessional-old/files/questions.csv");
//readQuestions();
launchSilences();
console.log('testing silence threshold, please be quiet');
function launchRec() {
	rec = exec('./s.sh');
};

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

classifier.on('error', function (err) {
	console.log("CLASSIFIER ERROR", err);
});

watson_transcriber.on('finalData', function (data) {
	var alternatives = data.results[0].alternatives[0];
	state.currTrans.push(alternatives.transcript);
	state.transcripts.push(alternatives.transcript);
	classifier.stdin.write(state.currTrans.join(' ') + "\n");
	// process.stdout.write(alternatives.transcript);
	transcription.write(alternatives.transcript);
});

watson_transcriber.on('watsonError', function (data) {
	console.log("An error occurred!");
});
