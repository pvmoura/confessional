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
var audioDir = process.env.audioDir;
var csv = require('ya-csv');
var qp = require('./question_picking.js');
var classifier = exec('./category_classifier.py');
var player = require('play-sound')(opts={});
var speaking;
var question_order = fs.createWriteStream('question_order.txt');
var qus = require('./question_utilities.js');
var state = {
	transcripts: [],
	silences: [],
	tones: [],
	startTime: Date.now(),
	questionCats: ['staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst'],
	semanticCats: ['belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'],
	categories: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst', 'belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'],
	hasIntroed: false,
	hasWarmedUp: 0,
	catsAsked: [],
	questionTimeStamps: [],
	proceduralCat: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'semantic'],
	nonSemanticCats: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst', 'segue', 'verbalnod', 'encouragement'],
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
	currentCat: null,
	checkSilence: false,
	inTransition: false,
	manualHold: false,
	ending: false,
	classifierCounter: {},
	strongCat: null,
	currentCatCounts: {}
};


// var questionsLoc = "/Users/pedrovmoura/Documents/Code/third-party/confessional-old/files/questions.csv";
var questionsLoc = "/Users/tpf2/Desktop/pedro/first_pass/questions.csv";
var utils = qus.questionUtils(state.categories, state.nonSemanticCats);
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', function (cmd, key) {
  cmd = cmd.toLowerCase();
  if (cmd === 'h') {
  	if (!state.manualHold) {
  		state.manualHold = true;
  		console.log("manual hold ON");
  	} else {
  		state.manualHold = false;
  		console.log("manual hold OFF");
  	}
  } else if (cmd === 'e') {
	console.log("GOING TO END");
	state.ending = true;
	pickQuestion();
  } else if (cmd === 'x') {
  	console.log("extending interview by 5 minutes");
  	state.interviewLength += 300000;
  } else if (cmd === 's') {
  	console.log("Skipping this question");
  	state.checkSilence = true;
  	if (speaking) {
  		speaking.kill();
  	}
  	pickQuestion();
  }
});

console.log(process.pid);

var actions = {
	end: getEnd,
	followUp: getFollowUp,
	nonSemantic: getNonSemantic,
	booth: getPersonality,
	semantic: getSemantic
}

function getEnd (options) {
	var possQuestions = utils.findQuestionsByFileRegEx(/^[eE][nN][dD]/);
	console.log(possQuestions);
	return utils['pickQuestionFromArray'](possQuestions);
}


// currentQuestion, as per database is something like:
// [text, filename, typefollow, followfile(default/short/yes), followfile(no/long), tag1, tag2, tag3, keywords]
function getFollowUp (options) {
	// console.log(state.followUp, state.currentQuestion);
	var fupType = state.followUp || state.futypes.indexOf(state.currentQuestion[2]);
	var followFile = 3;
	switch (fupType) {
		case -1:
			return;
		case 0:
			//yesno logic
			followFile = isShort() ? 3 : 4;
			break;
		case 1:
			followFile = isShort() ? 3 : 4;
			break;
		case 'yesno':
			followFile = isShort() ? 3 : 4;
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
	if (timeDiff <= 60000) {
		if (state.hasWarmedUp > 2 || state.strongCat)
			return false;
		else
			return true;
	}
	// return (timeDiff <= 60000 || state.hasWarmedUp <= 2);
}

function isShort() {
	return timeSinceLastQuestion() < 60000;
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
		if (timeSinceLastQuestion() > 60000 || state.questionsAsked.length > 3)
			category = Date.now() % 2 === 0 ? 'gettingwarmer' : 'aboutyou';
		else
			category = 'warmup';
	}
	filtered = utils.filterByCategory(category);
	filtered = utils.filterOutnotfirst(filtered);
	console.log(filtered, 'heree', category);
	filtered = utils.filterOutfollowup(filtered);
	filtered = utils.filterOutAsked(state.questionsAsked, filtered);
	// come up with a better way of distinguishing between warmup and getting warmer, etc.
	return utils.pickQuestionFromArray(filtered);
}

function getPersonality (data) {
	var booths = ['booth1'], booth, filtered;
	if (data.timeDiff >= 300000)
		booths.push('booth2');
	if (data.timeDiff >= 600000) {
		booths.push('booth3');
		booths.shift();
	}
	booth = utils.pickQuestionFromArray(booths);
	filtered = utils['filterBy' + booth]();
	filtered = utils.filterOutAsked(state.questionsAsked, filtered);
	return utils.pickQuestionFromArray(filtered);
}

function getNewQuestion (category, memory) {
	var filtered = utils.filterByCategory(category);
	if (memory && category === 'childhood' || category === 'love') {
		filtered = utils.filterBysegue(filtered);
	} else {
		if (state.questionsInCat === 0) {
			filtered = utils.filterOutnotfirst(filtered);
		} else if (state.questionsInCat >= 2) {
			filtered = utils.filterByescapehatch(filtered);
		}
		if (state.questionsInCat < 2) {
			filtered = utils.filterOutescapehatch(filtered);
		}
		filtered = utils.filterOutfollowup(filtered);
		filtered = utils.filterOutAsked(state.questionsAsked, filtered);
	}
	return utils.pickQuestionFromArray(filtered);
}

function pickRandomCat() {
	// change this to new utils functionality
	var filtered = state.semanticCats.filter(function (elem) {
		return state.usedCats.indexOf(elem) === -1;
	});
	console.log(filtered, 'filtered');
	return utils.pickQuestionFromArray(filtered);
}

function sortDictByVal(dict) {
	var result = [];
	for (var key in dict) {
		if (dict.hasOwnProperty(key))
			result.push([key, dict[key]]);
	}
	result.sort(compForArrofArrs(1));
	return result;
}

function compForArrofArrs(sortKey) {
	if (typeof sortKey === 'undefined')
		sortKey = 1;
	return function (a, b) {
		if (a[sortKey] > b[sortKey])
			return -1;
		else if (a[sortKey] < b[sortKey])
			return 1;
		else
			return 0;
	};
}

function getSemantic () {
	var counts = {}, category, topCount = null, topCat = null, sorted;
	state.nextCategory.map(function (elem, arr) {
		if (typeof counts[elem] === 'undefined')
			counts[elem] = 0;
		counts[elem]++;
	});
	
	// for (var key in counts) {
	// 	if (counts.hasOwnProperty(key)) {
	// 		if (counts[key] > topCount && key !== 'zzzzzz') {
	// 			topCat = key;
	// 			topCount = counts[key];
	// 		} else if (topCat !== state.currentCat && state.questionsinCat >= 2) {
	// 			topCat = key;
	// 			topCount = counts[key];
	// 		}
	// 	}
	// }
	sorted = sortDictByVal(counts);
	category = sorted.length > 0 ? sorted[0] : undefined;
	console.log(category, "CATEGORY");
	
	// console.log(state.nextCategory, category, "HELLO");
	if (state.strongCat) {
		category = state.strongCat;
	} else if (category === 'zzzzzz') {
		console.log(category, "HELLO THIS IS THE CATEGORY");
		category = state.currentCat ? state.currentCat : pickRandomCat();
		if (state.currentCat) {
			category = state.currentCat;
		} else if (state.strongCat) {
			category = state.strongCat;
			state.shortPause = true;
			return getNewQuestion(category, true);
		} else {
			pickRandomCat();
		}
	} else {
		// don't filter the available categories, possibly?
		// availCats = state.semanticCats.filter(function (elem, i) {
		// 	return state.usedCats.indexOf(elem) === -1;
		// });
		// category = availCats[parseInt(Math.random() * availCats.length, 10)];
		console.log('hello');
		category = state.currentCat && state.currentCat != "followup" ? state.currentCat : pickRandomCat();
	}
	console.log('cat is', category, state.currentCat);
	return getNewQuestion(category);
}

function updateClassifierInfo () {
	var counts = hist(state.nextCategory);
	for (var key in counts) {
		if (typeof state.classifierCounter[key] === 'undefined')
			state.classifierCounter[key] = 0;
		state.classifierCounter[key] += counts[key];
	}
}
function hist (arr) {
	var counts = {};
	arr.map(function (elem, arr) {
		if (typeof counts[elem] === 'undefined')
			counts[elem] = 0;
		counts[elem]++;
	});
	return counts;
}

function consolidateArrs(orig, newArr) {
	newArr.map(function (elem) {
		orig = orig.map(function (origElem) {
			if (origElem[0] === elem[0])
				origElem[1] += elem[1];
			return origElem;
		});	
	});
	return orig;
}

function updateState (question) {
	var oldCat = state.currentCat, sorted;
	state.inTransition = false;
	state.currentQuestion = question;

	if (question && question[2])
		state.followUp = question[2];
	else
		state.followUp = null;
	if (question)
		state.questionsAsked.push(question[1]);
	sorted = sortDictByVal(hist(state.nextCategory));
	consolidateArrs(state.oldCategories, sorted);
	state.oldCategories.sort(compForArrofArrs(1));

	state.nextCategory = [];
	state.currTrans = [];
	if (question && question[5]) {
		state.currentCat = question[5];
		state.usedCats.push(question[5]);
	} else
		state.currentCat = null;
	// console.log(oldCat, question[5]);
	if (oldCat && oldCat === question[5])
		state.questionsInCat++;
	if (state.questionsInCat > 2) {
		state.currentCat = null;
		state.inTransition = true;
	}
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

	console.log("playing...");
	// var dir = "/Users/tpf2/Dropbox/Current Booth Questions/programQuestions/";
	console.log(audioDir + filename);
	player.play(audioDir + "/" + filename + ".wav", function (err){
		if (err) {
			console.log("ERROR WHILE PLAYING");
		} else {
			state.questionTimeStamps.push(Date.now());
			detectSpeaking();
		}
		if (end)
			thisProcess.kill(thisProcess.pid);
	})
}

function getDiff (start) {
	start = start || state.startTime;
	return Date.now() - start;
}

function boothQuestion () {
	return state.inTransition && Date.now() % 2 === 0;
}


function pickQuestion () {
	state.checkSilence = false;
	if (state.manualHold !== true) {
		var diff = getDiff();
		//var relevantData = gatherRelevantData(diff);
		var action, end = false;
		console.log(state.followUp, 'followUp was');
		if (state.followUp !== null) {
			console.log('followup');
			action = actions['followUp'];
			if (state.ending)
				end = true;
		} else if (diff >= state.interviewLength - 30000 || state.ending) {
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
		// action = actions['semantic'];
		console.log(action);
		question = action( { timeDiff: diff } );
		if (!question) {
			console.log('no question', question, state.currentCat);
			question = actions['semantic'](pickRandomCat());
			//return;
		}

		console.log(question, 'question');
		if (question) {
			updateState(question);
			if (!question[2] && state.ending)
				end = true;
			playQuestion(question[1], end);
		} else {
			//play a staller and pick a random question
		}
	} else {
		console.log('hold');
	}
}

function detectSpeaking(threshold, duration) {

	if (typeof threshold === 'undefined')
		// threshold = state.silenceThreshold || 40;
		threshold = 30;
	if (typeof duration === 'undefined')
		duration = 1;
	if (state.questionsAsked.length < 4 || state.categories.indexOf(state.currentCat) === -1)
		duration = 0.5;
	else
		duration = 3;
	console.log("IN DETECT SPEAKING, threshold:", threshold);
	speaking = exec('./threshold_detector/threshold_detector.py', [threshold, duration, 'gt']);
	speaking.stdout.on('data', function (data) {
		strData = data.toString();
		if (strData.indexOf('Threshold detected') !== -1) {
			console.log("THERE WAS SPEAKING", state.silenceThreshold);
			// launchSilences(state.silenceThreshold);
			state.checkSilence = true;
			speaking.kill();
		}

	});

}

function launchSilences(threshold, duration) {
	state.checkSilence = true;
	var options = [];
	if (threshold) {
		if (typeof duration === 'undefined')
			options = [threshold];
		else
			options = [threshold, duration];
	}
	silences = exec('./threshold_detector/threshold_detector.py', options);
	silences.stdout.on('data', function (data) {
		// console.log(data);
		var strData = data.toString();
		if (strData.indexOf('volume threshold set at:') !== -1) {
			console.log(data.toString(), 'here is the right thing', typeof strData, strData);
			launchRec();
			if (!state.silenceThreshold) {
				strData = strData.replace(/[a-zA-Z :]/g, '');
				state.silenceThreshold = Number(strData.split('\n')[0]);
				console.log('starting recorder.....', state.silenceThreshold);
			}
			pickQuestion();
			setTimeout(function () {
				console.log(filename);
				fr.readFile(filename, watson_transcriber.stream);
				console.log('recording started');
				console.log('sending to Watson');
			}, 1500);
		} else if (strData.indexOf('Threshold detected') !== -1) {
			console.log("THERE WAS A SILENCE");
			if (state.checkSilence) {
				pickQuestion();
			} else {
				console.log('waiting for the person to speak');
			}

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
	if (!rec || rec.connected) {
		console.log('launching recorder');
		rec = exec('./s.sh');
		rec.stdout.on('data', function (data) {
			// process.stdout.write(data);
		});
	}
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

classifier.stderr.on('data', function (err) {
	console.log("CLASSIFIER ERROR", err);
});

watson_transcriber.on('finalData', function (data) {
	var alternatives = data.results[0].alternatives[0];
	state.currTrans.push(alternatives.transcript);
	state.transcripts.push(alternatives.transcript);
	classifier.stdin.write(state.currTrans.join(' ') + "\n");
	transcription.write(alternatives.transcript);
});

watson_transcriber.on('watsonError', function (data) {
	console.log("An error occurred!");
	console.log(data);
	console.log(data.message);
	// watson_transcriber = watson_transcriber.restartStream();
});
