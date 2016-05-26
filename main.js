
var fs = require('fs');
var transcription, computerData, question_order, identifier;
var execFile = require('child_process').execFile;
var audioDir = process.env.audioDir;
var classifier = execFile('./category_classifier.py');
var player = require('play-sound')(opts={});
var timeout;
var qus = require('./question_utilities.js');
var sd = require('./silences.js');
var transcriberUtils = require('./transcription/transcriber.js');
var transcriber;
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
	state.playedVerbalNod = false;
	console.log(state.currSpeaking, state.currSilence);
	pickQuestion();
});
sd.utils.setOptions({
	holdingPeriod: 10000,
	customWait: 2500,
	defaultDuration: 3500
})
sd.on('halfSilence', function () {
	console.log("IN HALF SILENCE");
	if (state.currentQuestion && state.currentQuestion.indexOf('shortnod') !== -1 && !state.playedVerbalNod) {
		state.playedVerbalNod = true;
		playVerbalNod();
	}
});

sd.utils.start();
const readline = require('readline');
var state = {
	transcripts: [],
	startTime: Date.now(),
	semanticCats: ['belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'],
	nonSemanticCats: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'staller', 'followup', 'booth1', 'booth2', 'booth3', 'segue', 'verbalnod', 'encouragement', 'empathy', 'tellmemore', 'supersuperlong'],
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
	answerData: [],
	lastVerbalnod: null,
	notTellMeMore: null,
	tellmemoreAsked: [],
	overrideCat: null,
	startedEnd: false,
	supersuperlongs: [],
	playedChildhoodInteractive: false,
	playedVerbalNod: false,
	usedAggregateCats: [],
	holdCat: false,
	skipToNextCat: false,
	noBooths: true
};
sd.on('ready', function (silenceThreshold) {
	state.silenceThreshold = silenceThreshold;
	sd.utils.dormantOn();
	console.log("READY TO GO");
	setInterval(function () {
		console.log("CURRENT THRESHOLD:", state.silenceThreshold);
		console.log("ELAPSED TIME:", (Date.now() - state.startTime) / 60000, "minutes");
		console.log("TIME REMAINING:", ((state.startTime + state.interviewLength) - Date.now()) / 60000, "minutes");
	}, 10000);
	pickQuestion();
});
sd.on('resetThreshold', function (silenceThreshold) {
	state.silenceThreshold = silenceThreshold;
});

function restartRecent () {
	var lastInterview = fs.readFileSync('last_interview.txt', { encoding: 'utf-8' }).trim();
	var questions = fs.readFileSync(lastInterview + "/question_order.txt", { encoding: 'utf-8' }).split('\n');
	fs.readFile(lastInterview + "/answer_data.txt", { encoding: 'utf-8' }, function (err, data) {
		if (err) { console.log("ERROR READING ANSWER DATA"); }
		else {
			var d = JSON.parse(data);
			state.answerData = d.length && d.length > 0 ? d : [];
			state.usedCats = state.answerData.map(function (elem) {
				return elem.categoryAsked;
			});

			console.log(state.usedCats, "Used cats");
		}
	});
	// console.log(answerData, 'answerData');
	// state.answerData = answerData.length && answerData.length > 0 ? answerData : [];

	var elapsedTime;
	questions = questions.map(function (elem) {
		var info = elem.split(':');
		return elem !== '' ? { identifier: info[0], time: info[1] } : null;
	});
	questions = questions.filter(function (elem) {
		return elem;
	});
	state.questionsAsked = questions.map(function (elem) {
		return elem.identifier;
	});
	
	elapsedTime = Math.max.apply(null, questions.map(function (elem) {
		var time = Number(elem.time);
		return isNaN(time) ? 0 : time;
	}));
	if (elapsedTime < 0)
		elapsedTime = 0;
	state.startTime = Date.now() - elapsedTime;
	if (state.questionsAsked.length > 6 && elapsedTime === 0)
		state.startTime = Date.now() - 900000;
	console.log('restarting', state.questionsAsked, 'elapsedTime:', elapsedTime);
	if (state.questionsAsked.length > 0)
		state.hasIntroed = true;


	console.log(questions);
	// process.kill(process.pid);
}
if (process.argv[2] === 'restart') {
	restartRecent();
}

var utils = qus.questionUtils();
var intidentifier;
function bookkeeping () {
	intIdentifier = process.env.transcriptDir + 'interview-', now = Date.now();
	identifier = createIdentifier(state.startTime);
	console.log(intIdentifier, identifier, state.startTime);
	// state.startTime = now;
	intIdentifier += identifier;
	fs.mkdirSync(intIdentifier);
	transcription = fs.createWriteStream(intIdentifier + '/transcription_' + identifier + '.txt');
	transcription.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
	computerData = fs.createWriteStream(intIdentifier + '/computer_data_' + identifier + '.txt');
	computerData.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
	question_order = fs.createWriteStream(intIdentifier + '/question_order.txt');
	if (state.questionsAsked.length > 0) {
		state.questionsAsked.forEach(function (q) {
			question_order.write(q + ":\n")
		});
	}
	fs.writeFile(intIdentifier + '/answer_data.txt', JSON.stringify(state.answerData));

	fs.writeFileSync('last_interview.txt', intIdentifier);
	question_order.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
	return intIdentifier;
}

// launchSilences();
bookkeeping();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', function (cmd, key) {
  cmd = cmd.toLowerCase();
  if (cmd === 'h') {
  	sd.utils.toggleHold();
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
	// pickQuestion();
  } else if (cmd === 'x') {
  	console.log("extending interview by 5 minutes");
  	state.interviewLength += 300000;
  } else if (cmd === 's') {
  	console.log("Skipping this question");
  	// pickQuestion();
  	sd.utils.forceSilence();
  } else if (cmd === 'v') {
  	console.log("Saying a verbal nod");
  	playVerbalNod();
  } else if (cmd === 'l') {
  	console.log("repeating last question");
  	if (typeof(timeout) !== 'undefined') {
  		clearTimeout(timeout);
  		timeout = undefined;
  	}
  	playQuestion(state.currentQuestion);
  } else if (cmd === 'r') {
  	console.log("RESETING SHIT");
  	hardResetCategories();
  } else if (cmd === 'rw') {
  	// console.log('restarting watson');
  	// launchWatson();
  } else if (cmd === 't') {
  	console.log('playing a tell me more');
  	playTellMeMore();
  } else if (cmd === 'xxx') {
  	console.log("SEXXXY TIME");
  	state.overrideCat = 'sex';
  } else if (cmd === 'ran') {
  	state.overrideCat = pickRandomCat();
  } else if (cmd === 'hc') {
  	if (!state.holdCat) {
  		console.log("holding category");
  		state.holdCat = true;
  	} else {
  		console.log("holding cat OFF");
  		state.holdCat = false;
  	}
  } else if (cmd === 'co') {
  	console.log("PLAYING COCO");
  	playQuestion(getCoCoName());
  } else if (cmd === 'nc') {
  	console.log("skipping to next category");
  	state.skipToNextCat = true;
  } else if (!isNaN(Number(cmd))) {
  	sd.utils.setThreshold(Number(cmd));
  } 
});
rl.on('error', function (err) {
	console.log(err);
})

function playVerbalNod () {
	var filtered = utils.filterByCategory('verbalnod'), question;
	console.log("PLAYING A VERBAL NOD");
	if (filtered.length === state.verbalNodsAsked.length)
		state.verbalNodsAsked = [];
	if (state.lastVerbalnod !== null)
		filtered = utils.filterOutByRegEx(new RegExp(state.lastVerbalnod.slice(0,4)), filtered);
	filtered = utils.filterOutAsked(state.verbalNodsAsked, filtered);

	question = utils.pickQuestionFromArray(filtered);
	

	if (question && question[1]) {
		state.verbalNodsAsked.push(question[1]);
		state.lastVerbalnod = question[1];
		player.play(audioDir + "/" + question[1] + ".wav", function (err) {
			if (err) console.log("ERROR WHILE PLAYING");
		});
	}

}

function playTellMeMore () {
	var filtered = utils.filterByCategory('tellmemore'), question;
	console.log(filtered.length);
	if (filtered.length === state.tellmemoreAsked.length)
		state.tellmemoreAsked = [];
	if (state.notTellMeMore === true) {
		state.notTellMeMore = false;
		filtered = utils.filterOutByRegEx(new RegExp("TELLMEMORE"), filtered);
	}
	else
		state.notTellMeMore = true;
	
	// console.log(filtered);
	filtered = utils.filterOutAsked(state.tellmemoreAsked, filtered);

	question = utils.pickQuestionFromArray(filtered);

	if (question && question[1]) {
		state.tellmemoreAsked.push(question[1]);
		console.log(state.tellmemoreAsked);
		
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
}

function getEnd (options) {
	var possQuestions = utils.findQuestionsByFileRegEx(/^[eE][nN][dD]/);
	possQuestions = utils.filterOutfollowup(possQuestions);
	console.log(possQuestions);
	return utils['pickQuestionFromArray'](possQuestions);
}

function getTellMeMore () {
	var filtered = utils.filterByCategory('tellmemore'), question;
	console.log(filtered.length);
	if (filtered.length === state.tellmemoreAsked.length)
		state.tellmemoreAsked = [];
	// if (state.lastTellmemore !== null)
	// 	filtered = utils.filterOutByRegEx(new RegExp(state.lastTellmemore.slice(0,4)), filtered);
	
	console.log(filtered);
	filtered = utils.filterOutAsked(state.tellmemoreAsked, filtered);

	question = utils.pickQuestionFromArray(filtered);
	if (question && question[1]) {
		state.tellmemoreAsked.push(question[1]);
		return question;
	}
	return "noFollowUp";

}

// currentQuestion, as per database is something like:
// [text, filename, typefollow, followfile(default/short/yes), followfile(no/long), tag1, tag2, tag3, keywords]
function getFollowUp (options) {
	var fupType = state.followUp || state.futypes.indexOf(state.currentQuestion[2]);
	var followFile = 3;
	var superlong = state.currentQuestion.indexOf('superlong') !== -1;
	// console.log(isShort(), state.followUp, fupType, "HELLO FOLLOWUP");
	switch (fupType) {
		case -1:
			break;
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
			followFile = isShort() ? 3 : superlong && state.currSpeaking > 60000 ? 4 : 3;
			break;
		default:
			followFile = 3;
	}
	// console.log(state.currentQuestion, followFile, "FOLLOW FILE");
	if (state.currentQuestion && state.currentQuestion[followFile]) {
		console.log(state.currentQuestion[followFile], "Next file");
		if (state.currentQuestion[followFile] === 'canyoutellmemore') {
			return getTellMeMore();
		} else
			return utils.findQuestionByFilename(state.currentQuestion[followFile]);
		// console.log(utils.findQuestionByFilename(state.currentQuestion[followFile]), "HJELLDAI");
		
	} else {
		console.log("no followUp", state.currentQuestion);
		return 'noFollowUp';
	}
}

function inIntro (timeDiff) {
	// if (timeDiff <= state.interviewLength / 5) {
		// if (state.hasWarmedUp > 2 || state.strongCat)
		// 	return false;
		// else
		// 	return true;
	if (state.hasWarmedUp <= 2) {
		return true;
	}
	return false;
	// return (timeDiff <= 60000 || state.hasWarmedUp <= 2);
}

function isShort() {
	return state.currSpeaking < 7500;
}

function getNonSemantic (options) {
	var possQuestions, category, filtered, question;
	console.log(state.hasWarmedUp, "WARMED UP STATE");
	if (!state.hasIntroed) {
		state.hasIntroed = true;
		category = 'intro';
	} else if (state.hasWarmedUp === 0) {
		state.hasWarmedUp++;
		category = 'warmup';
	} else if (state.hasWarmedUp === 1) {
		state.hasWarmedUp++;
		category = 'gettingwarmer';
	} else {
		state.hasWarmedUp++;
		category = 'aboutyou';
	}
	// 	state.hasWarmedUp++;
	// 	// if (timeSinceLastQuestion() > 25000 || state.questionsAsked.length > 3)

	// 	category = Date.now() % 2 === 0 ? 'gettingwarmer' : 'aboutyou';
	// 	cateogry = Date.now() % 3 === 0 ? 'warmup' : category;
	// 	// 	category = Date.now() % 2 === 0 ? 'gettingwarmer' : 'aboutyou';
	// 	// else
	// 	// 	category = 'warmup';
	// 	// category = 'aboutyou';
	// }
	filtered = utils.filterByCategory(category);
	// filtered = utils.filterOutnotfirst(filtered);
	// console.log(filtered, 'heree', category);
	filtered = utils.filterOutfollowup(filtered);
	filtered = utils.filterOutAsked(state.questionsAsked, filtered);
	// come up with a better way of distinguishing between warmup and getting warmer, etc.
	return utils.pickQuestionFromArray(filtered);
}

function getPersonality (data) {
	// var booths = ['booth1'], booth, filtered;
	// if (data.timeDiff >= 600000)
	// 	booths.push('booth2');
	// if (data.timeDiff >= 900000) {
	// 	booths.push('booth3');
	// 	booths.shift();
	// }
	// booth = utils.pickQuestionFromArray(booths);
	var filtered = utils['filterBybooth3']();
	state.noBooths = false;
	filtered = utils.filterOutAsked(state.questionsAsked, filtered);
	return utils.pickQuestionFromArray(filtered);
}

function removeDups (arr) {
	var newArr = [];
	arr.forEach(function (elem) {
		if (newArr.indexOf(elem) === -1)
			newArr.push(elem);
	});
	return newArr;
}

function getNewQuestion (category, memory) {
	var filtered = utils.filterByCategory(category);
	filtered = utils.filterOutAsked(state.questionsAsked, filtered);
	if (memory && (category === 'childhood' || category === 'love')) {
		filtered = utils.filterBysegue(filtered);
	} else {
		console.log("QUESTIONS IN CAT", state.questionsInCat);
		console.log(state.usedCats, category, "CATEGORY AND USED CATS");
		console.log(countInstances(state.usedCats, category), state.usedCats, "COUNT INSTANCES");
		if (countInstances(state.usedCats, category) === 0) {
			filtered = utils.filterByescapehatch(filtered);
		} else {
			filtered = utils.filterOutescapehatch(filtered);
		}
		filtered = utils.filterOutfollowup(filtered);
		filtered = utils.filterOutNonSemantics(filtered);
		// console.log(filtered);

		// console.log(filtered, "FILTERED AFTER GET NEW QUESTION");
		// if (filtered.length === 0)
			// state.usedCats = removeDups(state.usedCats);
	}
	// console.log('new question', filtered, state.questionsInCat);
	return utils.pickQuestionFromArray(filtered);
}

function pickRandomCat() {
	// change this to new utils functionality
	var filtered = state.semanticCats.filter(function (elem) {
		return state.usedCats.indexOf(elem) === -1;
	});
	console.log(filtered, 'random categories');
	if (filtered.length === 0) {
		usedCatshist = hist(state.usedCats);
		console.log(usedCatshist);
		for (var key in usedCatshist) {
			if (usedCatshist.hasOwnProperty(key)) {
				if (usedCatshist[key] < 8) {
					filtered.push(key);
				}
			}
		}
	}

	// console.log(filtered, 'filtered');
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

function getKeys (dict) {
	var keys = [];
	for (var key in dict) {
		if (dict.hasOwnProperty(key))
			keys.push(key);
	}
	return keys;
}


function aggregateAnswerData (categoryAsked, questionOrder, question, arr) {
	if (questionOrder === 0 || categoryAsked == null)
		return null;
	arr = arr || state.nextCategory;
	var answerData = {}, counts = hist(arr), sorted = sortDictByVal(counts);
	sorted = sorted.filter(function (elem) {
		return elem[0] !== 'zzzzzz';
	});
	answerData.question = question[1];
	answerData.speakingLength = state.currSpeaking;
	answerData.silenceLength = state.currSilence;
	answerData.categoryAsked = categoryAsked;
	answerData.questionOrder = questionOrder;
	answerData.categories = sorted;
	if (sorted[0])
		answerData.topCat = sorted[0];
	else
		answerData.topCat = null;
	return answerData;
}

function averageResponseLength (answerData) {
	answerData = answerData || state.answerData;
	var sum = answerData.reduce(function (p, c, i, a) {
		return p + c.speakingLength;
	}, 0);
	return sum / answerData.length;
}

function longestResponse (answerData) {
	answerData = answerData || state.answerData;
	return answerData.reduce(function (p, c, i, a) {
		var pComp = p.speakingLength;
		var cComp = c.speakingLength;
		return pComp > cComp ? p : c;
	}, {});
}

function highestCatCount (answerData) {
	answerData = answerData || state.answerData;
	return answerData.reduce(function (p, c, i, a) {
		var pComp = p.topCat ? p.topCat[1] : -1;
		var cComp = c.topCat ? c.topCat[1] : -1;
		return pComp >= cComp ? p : c;
	}, {});
}

function sortByTopCatCount (answerData) {
	answerData = answerData || state.answerData;
	var newArr = answerData.map(function (elem) {
		return elem;
	});
	newArr.sort(function (a, b) {
		var aCmp = a.topCat ? a.topCat[1] : -1;
		var bCmp = b.topCat ? b.topCat[1] : -1;
		if (aCmp > bCmp)
			return -1;
		else if (aCmp < bCmp)
			return 1;
		else
			return 0;
	});
	return newArr;
}

function sortByAnswerLength (answerData) {
	answerData = answerData || state.answerData;
	answerData.sort(function (a, b) {
		var aCmp = a.talkingLength ? a.talkingLength : a.answerLength;
		var bCmp = b.talkingLength ? b.talkingLength : b.answerLength;
		if (aCmp > bCmp)
			return -1;
		else if (aCmp < bCmp)
			return 1;
		else
			return 0;
	});
	return answerData;
}

function allCategoriesSorted (answerData) {
	answerData = answerData || state.answerData;
	var categories = [];
	answerData.forEach(function (elem) {
		categories = consolidateArrs(categories, elem.categories);
		console.log(categories, "CATEGORIES");
	});
	categories.sort(compForArrofArrs);
	return categories;
}

function getNewUnusedCategory () {
	var usedCatsHist = hist(state.usedCats);
	var allCategories = allCategoriesSorted();
	// for (var i=0; i < allCategories.length; i++) {
	// 	// if (usedCatsHist[allCategories[i]] < 3) {
	// 		return allCategories[i];
	// 	// }
	// }
	state.lastUnused++;
	if (state.lastUnused >= allCategories.length)
		state.lastUnused = 0;
	console.log(allCategories[state.lastUnused], "HELLLLLLLLLO");
	console.log(allCategories);
	return allCategories[state.lastUnused] ? allCategories[state.lastUnused] : null;
	// return null;
}

function getNewCatBasedOnTopLengthAndCat (exclude, answerData) {
	answerData = answerData || state.answerData;
	var questionsByLength = sortByAnswerLength(answerData);
	var questionsByTopCat = sortByTopCatCount(answerData);
	console.log("IN NEW CAT BASED ON TOP LENGTH AND CAT");
	var ranks = {}, sortedRanks;
	exclude = exclude || state.usedCats;
	questionsByLength.map(function (elem, i) {
		if (elem.topCat) { //&& countInstances(exclude, elem.topCat[0]) <= 5) {

			ranks[elem.question] = i;
			for (var j = 0; j < questionsByTopCat.length; j++) {
				if (elem.question === questionsByTopCat[j].question)
					ranks[elem.question] += j;
			}
		}
	});
	console.log(ranks);
	sortedRanks = sortDictByVal(ranks);
	console.log(answerData, 'answerdata in getNewCat');
	category = answerData.filter(function (elem) {
		return sortedRanks[0] ? elem.question === sortedRanks[0][0] : null;
	});
	return category[0] && category[0].topCat ? category[0].topCat[0] : null;
}

// defaults to long (minute+) responses
function filterByLength (answerData, lengthThreshold) {
	lengthThreshold = lengthThreshold || 60000;
	answerData = answerData || state.answerData;
	return answerData.filter(function (elem) {
		var answerLength = elem.talkingLength ? elem.talkingLength : elem.answerLength;
		return answerLength > lengthThreshold;
	});
}

function filterByCatMismatch (answerData) {
	answerData = answerData || state.answerData;
	return answerData.filter(function (elem) {
		return elem.topCat && elem.categoryAsked !== elem.topCat[0];
	});
}

function countInstances (arr, instance) {
	return arr.filter(function (elem) {
		return elem === instance;
	}).length;
}

function isOutlier (arr, thresh) {
	if (typeof thresh === 'undefined')
		thresh = 1.5;
	var average = averageResponseLength(state.answerData);
	// if (arr.filter) {
	var filtered = arr.filter(function (elem) {
		elem.speakingLength > average * thresh;
	});

	return filtered.length > 0 ? arr[0] : null;
}

function isAboveAverage (arr) {
	var average = averageResponseLength(state.answerData);
	var filtered = arr.filter(function (elem) {
		elem.speakingLength > average;
	});
	return filtered.length > 0 ? arr[0] : null;
}

function isPresent (ident, arr) {
	return arr.filter(function (elem) {
		return elem[1] === ident;
	}).length > 0;
}

function getSuperSuperLong () {
	var filtered = utils.filterBysupersuperlong();
	console.log(filtered);
	filtered = utils.filterOutAsked(state.supersuperlongs, filtered);
	return utils.pickQuestionFromArray(filtered);
}

function getChildhoodInteractive () {
	return utils.findQuestionByFilename("AFFECTEDYOUNG_T03_BEST");
}

function getCoCoName () {
	return utils.findQuestionByFilename("COCO_T03_BEST");
}

function getTopCats (answerData) {
	answerData = answerData || state.answerData;
	var newAnswers = answerData.map(function (elem) {
		return elem.topCat ? elem.topCat : null;
	});
	newAnswers = newAnswers.filter(function (elem) {
		return elem && countInstances(state.usedCats, elem[0]) < 3;
	});
	newAnswers.sort(compForArrofArrs);
	return newAnswers;
}

function aggregateCats (answerData) {
	answerData = answerData || state.answerData;
	var cats = {};
	answerData.forEach(function (elem) {
		elem.categories.forEach(function (cat) {
			if (typeof cats[cat[0]] === 'undefined')
				cats[cat[0]] = 0;
			cats[cat[0]] += 1;
		});
	});
	return cats;
}

function getSemanticNew () {
	// check if current answer data is stronger (i.e. a longer response, strong category, etc., eventually strong confidence level)
	var category = state.semanticCats.indexOf(state.currentCat) !== -1 ? state.currentCat : null;
	if (state.holdCat && category)
		return getNewQuestion(category);
	else if (state.holdCat && !category) {
		state.holdCat = false;
		console.log("NO CATEGORY SO TURNING OFF CATEGORY HOLD");
	}
	if (state.inTransition)
		cateogry = null;
	var sliceVal = state.answerData.length < 4 ? 0 : -4;
	var lastThree = state.answerData.slice(sliceVal);
	var lastThreeCats = lastThree.filter(function (elem) { return elem.categoryAsked === category; });
	var lastThreeNonCat = lastThree.filter(function (elem) { return elem.topCat ? elem.topCat[0] !== category : false; });
	var maxNonCat = Math.max.apply(null, lastThreeNonCat.map(function (elem) {
		return elem.topCat ? elem.topCat[1] : -1;
	}));
	var maxCat = Math.max.apply(null, lastThreeCats.map(function (elem) {
		return elem.topCat ? elem.topCat[1] : -1;
	}));
	var lastThreeOnlyCats = lastThree.map(function (elem) { return elem.categoryAsked; });
	// console.log(category, state.answerData);
	console.log(lastThreeCats, lastThreeOnlyCats, lastThree, category);
	console.log("MAX CAT", maxCat, maxNonCat);
	var temp;
	var last = state.answerData[state.answerData.length - 1];
	var sortedByLength = sortByAnswerLength();
	longest = longestResponse();
	if (Date.now() - state.startTime >= state.interviewLength / 3 && state.supersuperlongs.length === 0) {
		// console.log(last.question, isPresent(last.question, sortedByLength.slice(0,8)));
		if (last && isOutlier([last], 1.25)) {
			supersuperlong = getSuperSuperLong();
			if (supersuperlong) {
				state.supersuperlongs.push(supersuperlong[1]);
				return supersuperlong;
			}
		}
	} else if (Date.now() - state.startTime >= 3 * (state.interviewLength / 4)) {
		if (last && isPresent(last.question, sortedByLength.slice(0,4))) {
			supersuperlong = getSuperSuperLong();
			if (supersuperlong) {
				state.supersuperlongs.push(supersuperlong[1]);
				return supersuperlong;
			}
		}
	}
	if (last && last.speakingLength >= 90000 && last.topCat && last.topCat[0] === 'childhood') {
		console.log("TRIGGER CHILDHOOD INTERACTIVE QUESTION");
		if (!state.playedChildhoodInteractive) {
			state.playedChildhoodInteractive = true;
			return getChildhoodInteractive();
		} else {
			console.log("Already played childhood interactive question");
		}
	}
	console.log(last, "LAST");
	// if (last && isOutlier([last])) {
	// 	category = last.topCat ? last.topCat[0] : null;
	// }

	// if ((isOutlier(lastThreeNonCat))) { // || maxNonCat > maxCat)) {
	// 	var highest = highestCatCount(lastThreeNonCat);
	// 	console.log(highest, "IN HIGHEST");
	// 	if (highest && highest.topCat && highest.topCat[0])
	// 		return getNewQuestion(highest.topCat);
	// }

	if (!category || state.questionsInCat >= 3 || state.skipToNextCat /*countInstances(lastThreeOnlyCats, category) > 5*/) {
		categories = getTopCats();
		if (state.questionsInCat >= 3) {
			state.questionsInCat = 0;
		}
		console.log(categories, "GET TOP CATS");
		category = categories.length ? categories[0][0] : null;
	}

	if (!category) {
		console.log("COUNTING ALL TRIGGERED CATEGORIES");
		categories = aggregateCats();
		categories = sortDictByVal(categories);
		categories.forEach(function (elem) {
			if (state.usedAggregateCats.indexOf(elem[0]) === -1 && !category) {
				category = elem[0];
				state.usedAggregateCats.push(category);
			}
		});
	}
	// console.log(category, "CATEGORY AFTER COUNT INSTANCES");
	// 	// how do we pick new category
	// 	// we look at the last 3 questions. if they've all been the same category
	// 	// then we want to pick a new one
	// 	// Also, if they've been very short responses, we probably want to pick a new one (shorter than average)
	// 	// If they've been 
	// 	var lastAnswer = state.answerData[state.answerData.length - 1];
	// 	var lastTopCat = lastAnswer && lastAnswer.topCat ? lastAnswer.topCat[0] : null;
	// 	if (state.answerData.length > 0 && lastTopCat && lastTopCat !== category) {
	// 		console.log("IN CATEGORY PICKING");
	// 		category = state.answerData[state.answerData.length - 1].topCat ? state.answerData[state.answerData.length - 1].topCat[0] : null;
	// 	// } else if (averageResponseLength(lastThree) > averageResponseLength()) 
	// 		// category = getNewCatBasedOnTopLengthAndCat(state.usedCats, lastThree);
	// 	} else
	// 		category = getNewCatBasedOnTopLengthAndCat(state.usedCats);
	// }
	// console.log(category, 'cat after top length and cat');
	// if (!category) {
	// 	temp = getNewUnusedCategory();
	// 	category = temp ? temp[0] : null;
	// } 
	// // else if (countInstances(lastThreeOnlyCats, category) > 3) {
	// // 	// pick a new category
	// // 	console.log('in countInstances');
	// // 	temp = getNewUnusedCategory();
	// // 	category = temp ? temp[0] : null;
	// // } else if (lastThreeCats.length > 1 && (averageResponseLength(lastThreeCats) < averageResponseLength())) {
	// // 	console.log('in averageResponseLength');
	// // 	temp = getNewUnusedCategory();
	// // 	category = temp ? temp[0] : null;
	// // }
	// console.log(category, 'cat after if statement');
	// if (!category) {
	// 	category = pickRandomCat();
	// }
	console.log('in new semantic, cat is', category, state.currentCat);
	return getNewQuestion(category);

}

function hardResetCategories () {
	state.usedCats = [];
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
		present = false;
		orig = orig.map(function (origElem) {
			if (origElem[0] === elem[0]) {
				origElem[1] += elem[1];
				present = true;
			}
			return origElem;
		});
		if (!present)
			orig.push(elem);
	});
	return orig;
}

function findSemantic (question) {
	console.log(question);
	if (typeof question.slice !== 'function')
		return null;
	question = question.slice(5,8);
	if (typeof question.filter === 'function') {
		question = question.filter(function (elem) {
			return state.semanticCats.indexOf(elem) !== -1;
		});
		return question.length > 0 ? question[0] : null;
	}
	return null;
}

function isFollowUp (question) {
	if (typeof question.slice !== 'function')
		return null;
	question = question.slice(5,8);
	if (typeof question.filter === 'function') {
		question = question.filter(function (elem) {
			return elem.indexOf('followup') !== -1;
		});
		return question.length > 0 ? question[0] : null;
	}
	return null;
	// question = question.slice(5, 8).filter(function (elem) {
	// 	return elem.indexOf('followup') !== -1;
	// });
	// return question.length > 0;
}

function updateState (question) {
	var oldCat = state.currentCat, sorted, semanticCat;
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
	console.log(oldCat, "OLD CAT IS");
	// semanticCat = findSemantic(question);
	if (state.holdCat && state.currentCat) {
		console.log("Holding cat", state.currentCat);
		state.usedCats.push(state.currentCat);
	} else if (question && isFollowUp(question)) {
		state.currentCat = oldCat;
		state.usedCats.push(oldCat);
	} else if (question && state.semanticCats.indexOf(question[5]) !== -1) {
		state.currentCat = question[5];
		state.usedCats.push(question[5]);
	} else if (question && findSemantic(question)) {
		state.currentCat = findSemantic(question);
		state.usedCats.push(findSemantic(question));
	} else if (question && state.nonSemanticCats.indexOf(question[5]) !== -1) {
		state.currentCat = question[5];
		state.usedCats.push(question[5]);
	} else
		state.currentCat = null;
	console.log(state.currentCat, oldCat, state.usedCats, state.questionsInCat, "OLD CAT AND CURRENT CAT");
	// console.log(oldCat, question[5]);
	console.log(state.questionsInCat, "CAT QUESTIONS");
	if (state.currentCat === oldCat && !isFollowUp(question))
		state.questionsInCat++;
	// else {
	// 	state.inTransition = true;
	// }
	// if (countInstances(state.usedCats.slice(-3), state.currentCat) === 3) {
	// 	console.log(state.inTransition, "CHECKING IN TRANSITION");
	// 	state.inTransition = true;
	// }
	if (state.questionsInCat >= 3 && !state.holdCat) {
		// state.questionsInCat = 0;
		console.log(state.inTransition, "CHECKING IN TRANSITION");
		state.inTransition = true;
		// state.currentCat = null;
		// state.inTransition = true;
	}
}

var thisProcess = process;

function createIdentifier (date) {
	function prettify(num) {
		return num < 10 ? '0' + num : num.toString();
	}
	date = new Date(date) || new Date(state.startTime);
	var identifier = prettify(date.getHours()) +
				     prettify(date.getMinutes()) +
				 	 prettify(date.getSeconds()) + "_" +
				 	 date.getFullYear() % 2000 +
				 	 prettify(date.getMonth() + 1) +
				 	 prettify(date.getDate());
	return identifier;
}

function makeWatsonCallback(currQ) {
	var questionIdent = currQ;
	
	return function (err, data) {
		if (err) {
			// if (transcriber.active && transcriber.restart) {
				// transcriber.startTranscription();
			// } else {
				console.log("Watson finished");
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
	question_order.write(filename + ":" + (Date.now() - state.startTime).toString() + "\n");
	fs.writeFile(intIdentifier + '/answer_data.txt', JSON.stringify(state.answerData));
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
				defaultDuration: 4500
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

function boothQuestion () {
	// if (Date.now() - state.startTime <= 1000*60*10)
	// 	state.inTransition = false;
	if (Date.now() - state.startTime <= 1000 * 60 * 15)
		return false;
	if (state.inTransition && state.boothQuestions < 1 && state.noBooths)
		return Date.now() % 2 === 0;
	return state.inTransition && state.boothQuestions < 2 && Date.now() % state.boothQuestions === 0;
}

function updateMood () {
	var averageResponse = averageResponseLength();
	if (averageResponse < 15000 && state.hasWarmedUp >= 2) {
		console.log("AVERAGE RESPONSE LENGTH LESS THAN 15 SECONDS, DOCKING 5 MINUTES");
		state.interviewLength -= 5 * 1000 * 60;
	} else if (averageResponse > 60000) {
		console.log("AVERAGE RESPONSE LENGTH MORE THAN 1 MINUTE, ADDING 5 MINUTES");
		state.interviewLength += 5 * 1000 * 60;
	}
}
test = false;
function pickQuestion () {
	// return;

	var answerData;
	state.checkSilence = false;
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
		if (state.overrideCat === null) {
			if (state.followUp !== null) {
				// if (!state.ending) {
					console.log('followup');
					action = actions['followUp'];
					// if (state.ending === 'finish')
						// end = true;
				// }
			} else if ((diff >= state.interviewLength - 30000 || state.ending)) {
				console.log('end');
				// state.ending = 'finish';
				state.startedEnd = true;
				action = actions['end'];
			} else if (inIntro(diff)) {
				console.log('intro');
				action = actions['nonSemantic'];
			} else if (boothQuestion()) {
				console.log('booth');
				state.boothQuestions++;
				action = actions['booth'];
			} else {
				// updateMood();
				if (answerData) {
					if (answerData.categories && answerData.categories.length === 0) {
						console.log("NO CATEGORIES TRIGGERED SO DOCKING 1.5 MINUTES");
						state.interviewLength -= 90000;
					}
				}
				console.log('semantic');
				action = actions['semantic'];
			}

			// action = actions['semantic'];
			console.log(action);
			question = action( { timeDiff: diff } );
			// question = actions['semantic']( { timeDiff: diff } );
			if (question == 'noFollowUp') {
				if (inIntro(diff))
					action = actions['nonSemantic'];
				else if (boothQuestion())
					action = actions['booth'];
				else
					action = actions['semantic'];
				question = action({ timeDiff: diff });
			}
		} else {
			question = getNewQuestion(state.overrideCat);
			state.overrideCat = null;
			console.log(question);
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
		// 	question = ["So if there is anything that you’d like to tell me right away go ahead. I’m listening.","HELLO5a_T04_BEST","hardfollow","HELLO5b_T01_BEST","","intro","","","","","","","","","","","","","","","","","","","","","",""];
		// 	test = false;
		// }
		// if (test) {
		// 	question = ["I want to hear about a dream that you had that feels important to you.","DREAM1a_T01_BEST","length","","DREAM1b_T01_BEST","belief","superlong","shortnod","freud","freudian","analysis","analyze","psychiatrist","shrink","psychologist","counseling","therapy","therapist","afraid","fears","fear","phobia","anxiety","worry","worried","anxious","",""];
		// 	test = false;
		// }
		if (question) {
			updateState(question);
			if (!question[2] && state.startedEnd)
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
