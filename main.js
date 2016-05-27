var fs = require('fs');
var transcription, computerData, question_order, identifier;
var bk = require('./bookkeeping.js');
var execFile = require('child_process').execFile;
var audioDir = process.env.audioDir;
var classifier = execFile('./category_classifier.py');
var player = require('play-sound')(opts={});
var timeout;
var sd = require('./silences.js');
var transcriberUtils = require('./transcription/transcriber.js');
var transcriber;
var rp = require('./responseProcessing.js');
sd.on('silencePeriod', function (data) {
	// do something with silences/speaking data.
	// sd.utils.toggleDormant();
	console.log("THis is the silence data", data);
	sd.utils.dormantOn();
	state.currSpeaking = data.speaking.reduce(function (c, p, a, i) {
		return isNaN(c) ? p : p + c;  
	}, 0);
	state.currSilence = data.silences.reduce(function (c, p, a, i) {
		return isNaN(c) ? p : p + c;
	}, 0);
	console.log(state.currSpeaking, state.currSilence);
	pickQuestion();
});
sd.utils.setOptions({
	holdingPeriod: 10000,
	customWait: 2500,
	defaultDuration: 3500
});
sd.utils.start();

var state = {
	transcripts: [],
	startTime: Date.now(),
	semanticCats: ['belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'],
	hasIntroed: false,
	hasWarmedUp: 0,
	questionTimeStamps: [],
	followUp: null,
	questionsAsked: [],
	nextCategory: [],
	usedCats: [],
	currTrans: [],
	silenceThreshold: null,
	interviewLength: 1000 * 60 * 30,
	futypes: ['yesno', 'length', 'hardfollow'],
	currentQuestion: null,
	questionsInCat: 0,
	currentCat: null,
	inTransition: false,
	manualHold: false,
	ending: false,
	strongCat: null,
	boothQuestions: 1,
	verbalNodsAsked: [],
	lastUnused: -1,
	currSilence: null,
	currSpeaking: null,
	answerData: []
};
sd.on('ready', function (silenceThreshold) {
	state.silenceThreshold = silenceThreshold;
	sd.utils.dormantOn();
	console.log("READY TO GO");
	pickQuestion();
});
sd.on('resetThreshold', function (silenceThreshold) {
	state.silenceThreshold = silenceThreshold;
});

(function () {
	var askedQuestions = [], startTime = Date.now(), logs;
	if (process.argv[2] === 'restart') {
		askedQuestions = bk.restart();
	}
	logs = bk.bookkeeping(startTime, askedQuestions);

})();

function playVerbalNod () {
	var filtered = utils.filterByCategory('verbalnod'), question;
	if (state.lastVerbalNod !== null)
		filtered = utils.filterOutByFileRegex(new RegExp(state.lastVerbalNod.slice(0,4)));
	if (filtered.length === state.verbalNodsAsked.length)
		state.verbalNodsAsked = [];
	filtered = utils.filterOutAsked(state.verbalNodsAsked, filtered);

	question = utils.pickQuestionFromArray(filtered);

	if (question && question[1]) {
		state.verbalNodsAsked.push(question[1]);
		state.lastVerbalNod = question[1];
		player.play(audioDir + "/" + question[1] + ".wav", function (err) {
			if (err) console.log("ERROR WHILE PLAYING");
		});
	}
}

function playTellMeMore () {
	var filtered = utils.filterByCategory('tellmemore'), question;
	if (filtered.length === state.tellmemore.length)
		state.tellmemore = [];
	filtered = utils.filterOutAsked(state.tellmemore, filtered);
	question = utils.pickQuestionFromArray(filtered);

	if (question && question[1]) {
		state.tellmemore.push(question[1]);
		player.play(audioDir + "/" + question[1] + ".wav", function (err) {
			if (err) console.log("ERROR WHILE PLAYING");
		});
	}
}

var actions = {
	end: getEnd,
	followUp: getFollowUp,
	nonSemantic: getNonSemantic,
	booth: getPersonality,
	semantic: getSemanticNew
};

// currentQuestion, as per database is something like:
// [text, filename, typefollow, followfile(default/short/yes), followfile(no/long), tag1, tag2, tag3, keywords]












function hardResetCategories () {
	state.usedCats = [];
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

	state.nextCategory = [];
	state.currTrans = [];
	if (question && question[5]) {
		state.currentCat = question[5];
		state.usedCats.push(question[5]);
	} else
		state.currentCat = null;
	// console.log(oldCat, question[5]);
	console.log(state.questionsInCat, "CAT QUESTIONS");
	if (oldCat && oldCat === question[5])
		state.questionsInCat++;
	if (state.questionsInCat >= 2) {
		state.questionsInCat = 0;
		state.currentCat = null;
		state.inTransition = true;
	}
}

var thisProcess = process;

function makeWatsonCallback(currQ) {
	var questionIdent = currQ;
	
	return function (err, data) {
		if (err) {
			// if (transcriber.active && transcriber.restart) {
				// transcriber.startTranscription();
			// } else {
				console.log("Watson is done");
			// }
		} else {
			var alternatives = data.results[0].alternatives[0];
			console.log(alternatives);
			if (alternatives) {
				state.currTrans.push(alternatives.transcript);
				state.transcripts.push(alternatives.transcript);
				classifier.stdin.write(state.currTrans.join(' ') + "\n");
				transcription.write(alternatives.transcript);
				strObj = JSON.stringify(data);
				computerData.write(strObj + "\n\n");	
			} else {
				console.log("Something went wrong");
			}
		}
	}
}
function playQuestion(question, end) {

	console.log("playing...", question);
	computerData.write("Playing Question...\n\n")
	var filename = question[1];
	console.log(audioDir + filename);
	logs.questionOrder.write(filename + ":" + (Date.now() - state.startTime).toString() + "\n");
	transcription.write("COMPUTER SPEAKING\n\n");
	if (transcriber)
		transcriber.stopTranscription();
	player.play(audioDir + "/" + filename + ".wav", function (err){
		if (err) {
			console.log("ERROR WHILE PLAYING");
		} // else {
		state.questionTimeStamps.push(Date.now());
		transcription.write("PERSON SPEAKING\n\n");
		if (state.currentQuestion.indexOf('shortpause') !== -1) {
			console.log("IN SHORT PAUSE");
			timeout = setTimeout(function () {
				pickQuestion();
			},2000);
		} else {

			transcriber = transcriberUtils.createTranscriber({restart: true}, makeWatsonCallback(question[1]));
			transcriber.startTranscription();
			sd.utils.dormantOff();
			sd.utils.setOptions({
				holdingPeriod: 10000,
				customWait: 2500,
				defaultDuration: 3500
			});
			// sd.utils.detector.stdout.emit('data', '0');
			// detectSpeaking();
			
		}
		//}
		if (end) {
			thisProcess.kill(thisProcess.pid);
		}
	})
}

function getDiff (start) {
	start = start || state.startTime;
	return Date.now() - start;
}

test = true;
function pickQuestion () {
	var answerData;
	// sd.utils.toggleDormant();
	// sd.utils.dormantOn();
	sd.utils.isDormant();
	answerData = aggregateAnswerData(state.currentCat, state.questionsAsked.length, state.currentQuestion);
	if (answerData)
		// state.answerData.[state.currentQuestion[1]] = answerData;
		state.answerData.push(answerData);
	state.nextCategory = [];
	if (state.manualHold !== true) {
		var diff = getDiff();
		//var relevantData = gatherRelevantData(diff);
		var action, end = false;
		console.log(state.followUp, 'followUp was');
		if (state.followUp !== null) {
			// if (!state.ending) {
				console.log('followup');
				action = actions['followUp'];
				if (state.ending)
					end = true;
			// }
		} else if ((diff >= state.interviewLength - 30000 || state.ending)) {
			console.log('end');
			state.ending = true;
			action = actions['end'];
		} else if (inIntro(diff)) {
			console.log('intro');
			action = actions['nonSemantic'];
		} else if (boothQuestion()) {
			console.log('booth');
			state.boothQuestions++;
			action = actions['booth'];
		} else {
			console.log('semantic');
			action = actions['semantic'];
		}
		// action = actions['semantic'];
		console.log(action);
		question = action( { timeDiff: diff } );
		if (question == 'noFollowUp') {
			if (inIntro(diff))
				action = actions['nonSemantic'];
			else if (boothQuestion())
				action = actions['booth'];
			else
				action = actions['semantic'];
			question = action({ timeDiff: diff });
		}
		if (!question) {
			console.log('no question', question, state.currentCat);
			category = pickRandomCat();
			question = getNewQuestion(category);
			//return;
		}
		// if (test) {
		// question = ["What's your dancing style? Can you show me some of your favorite moves?","DANCEMOVES1a_T03_BEST","hardfollow","DANCEMOVES1b_T01","","","aboutyou","shortpause","","","","","","","","","","","","","","","","","","","",""];
		// test = false;
		// }
		// console.log(question, 'question');
		// if (test) {
		// 	question = ["Tell me about a time when you were cruel to someone else.","CRUELTOSOMEONE1a_T01_BEST","length","CRUELTOSOMEONE1b_T01_BEST","","wrong","","notfirst","","","","","","","","","","","","","","","","","","","",""];
		// 	test = false;
		// }
		// if (test) {
		// 	question = ["So if there is anything that you’d like to tell me right away go ahead. I’m listening.","HELLO5a_T04_BEST","length","","HELLO5b_T01_BEST","intro","","","","","","","","","","","","","","","","","","","","","",""];
		// 	test = false;
		// }
		// if (test) {
		// 	question = ["I want to hear about a dream that you had that feels important to you.","DREAM1a_T01_BEST","length","","DREAM1b_T01_BEST","belief","superlong","","freud","freudian","analysis","analyze","psychiatrist","shrink","psychologist","counseling","therapy","therapist","afraid","fears","fear","phobia","anxiety","worry","worried","anxious","",""];
		// 	test = false;
		// }
		if (question) {
			updateState(question);
			if (!question[2] && state.ending)
				end = true;
			playQuestion(question, end);
		} else {
			//play a staller and pick a random question
		}
	} else {
		console.log('hold');
	}
}

classifier.stdout.on('data', function (data) {
	data = data.trim();
	if (data === 'ready') {
		console.log("CLASSIFIER READY");
	} else if (data === 'default') {
		console.log("NOT ENOUGH INFO TO CLASSIFY");
	} else {
		console.log("I THINK THE NEXT CATEOGRY SHOULD BE: ", data);
		computerData.write("We're talking about: " + data.toString() + '\n\n');
		state.nextCategory.push(data);
	}
});

classifier.stderr.on('data', function (err) {
	console.log("CLASSIFIER ERROR", err);
});
classifier.on('error', function (Err) {
	console.log("CLASSIFIER ERROR", Err);
});
