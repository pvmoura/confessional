// var watson = require('./transcription/watson_transcriber.js');
// var watson_stream;
var fr = require('./transcription/file_reader.js');
var fs = require('fs');
// var threshold = require('./threshold_detector/launch_threshold.js');
var spawn = require('child_process').spawn;
var transcription, computerData, question_order, identifier;
var exec = require('child_process').execFile;
var filename = 'recording.flac';
var rec;
var silences;
var audioDir = process.env.audioDir;
var csv = require('ya-csv');
var classifier = exec('./category_classifier.py');
var player = require('play-sound')(opts={});
var speaking;
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
	console.log(state.currSpeaking, state.currSilence);
	pickQuestion();
});
sd.utils.setOptions({
	holdingPeriod: 10000,
	customWait: 2500,
	defaultDuration: 3500
})
sd.utils.start();
const readline = require('readline');
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
	nonSemanticCats: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'staller', 'followup', 'booth1', 'booth2', 'booth3', 'segue', 'verbalnod', 'encouragement', 'empathy'],
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
	currentCatCounts: {},
	startedSpeaking: null,
	boothQuestions: 1,
	verbalNodsAsked: [],
	answersByQuestion: {},
	nextCat: null,
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

function restartRecent () {
	var lastInterview = fs.readFileSync('last_interview.txt', { encoding: 'utf-8' }).trim();
	var questions = fs.readFileSync(lastInterview + "/question_order.txt", { encoding: 'utf-8' }).split('\n');
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
	console.log('restarting', state.questionsAsked, 'elapsedTime:', elapsedTime);
	state.startTime = Date.now() - elapsedTime;
	state.hasIntroed = true;

	console.log(questions);
	// process.kill(process.pid);
}
if (process.argv[2] === 'restart') {
	restartRecent();
}

var utils = qus.questionUtils(state.categories, state.nonSemanticCats);

function bookkeeping () {
	var intIdentifier = process.env.transcriptDir + 'interview-', now = Date.now();
	identifier = createIdentifier(state.startTime);
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

	fs.writeFileSync('last_interview.txt', intIdentifier);
	question_order.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
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
  		// sd.utils.toggleHold();
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
  	state.checkSilence = true;
  	if (speaking) {
  		speaking.kill();
  	}
  	pickQuestion();
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
  } else if (cmd === 'ti') {
  	actions['semantic'] = actions['semantic'] == getSemanticNew ? getSemanticOld : getSemanticNew;

  	console.log('intelligence set to: ', actions['semantic']);
  } else if (cmd === 'r') {
  	console.log("RESETING SHIT");
  	hardResetCategories();
  } else if (cmd === 'rw') {
  	// console.log('restarting watson');
  	// launchWatson();
  } else if (!isNaN(Number(cmd))) {
  	sd.utils.setThreshold(Number(cmd));
  }
});
rl.on('error', function (err) {
	console.log(err);
})

function playVerbalNod () {
	var filtered = utils.filterByCategory('verbalnod'), question;
	if (filtered.length === state.verbalNodsAsked.length)
		state.verbalNodsAsked = [];
	filtered = utils.filterOutAsked(state.verbalNodsAsked, filtered);

	question = utils.pickQuestionFromArray(filtered);

	if (question && question[1]) {
		state.verbalNodsAsked.push(question[1]);
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
		console.log(utils.findQuestionByFilename(state.currentQuestion[followFile]), "HJELLDAI");
		return utils.findQuestionByFilename(state.currentQuestion[followFile]);
	} else {
		console.log("no followUp", state.currentQuestion);
		return 'noFollowUp';
	}
}

function inIntro (timeDiff) {
	if (timeDiff <= state.interviewLength / 5) {
		// if (state.hasWarmedUp > 2 || state.strongCat)
		// 	return false;
		// else
		// 	return true;
		if (state.hasWarmedUp <= 3)
			return true;
	}
	return false;
	// return (timeDiff <= 60000 || state.hasWarmedUp <= 2);
}

function isShort() {
	return state.currSpeaking < 7500;
	var now = Date.now();
	var lastQ = timeSinceLastQuestion(), testTime = lastQ;
	if (state.startedSpeaking && now - state.startedSpeaking <= lastQ)
		testTime = now - state.startedSpeaking;
	return testTime < 7500;
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
		category = 'gettingwarmer';
	} else {
		state.hasWarmedUp++;
		// if (timeSinceLastQuestion() > 25000 || state.questionsAsked.length > 3)
		category = Date.now() % 2 === 0 ? 'gettingwarmer' : 'aboutyou';
		// 	category = Date.now() % 2 === 0 ? 'gettingwarmer' : 'aboutyou';
		// else
		// 	category = 'warmup';
		category = 'aboutyou';
	}
	filtered = utils.filterByCategory(category);
	// filtered = utils.filterOutnotfirst(filtered);
	// console.log(filtered, 'heree', category);
	filtered = utils.filterOutfollowup(filtered);
	filtered = utils.filterOutAsked(state.questionsAsked, filtered);
	// come up with a better way of distinguishing between warmup and getting warmer, etc.
	return utils.pickQuestionFromArray(filtered);
}

function getPersonality (data) {
	var booths = ['booth1'], booth, filtered;
	if (data.timeDiff >= 600000)
		booths.push('booth2');
	if (data.timeDiff >= 900000) {
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
	if (memory && (category === 'childhood' || category === 'love')) {
		filtered = utils.filterBysegue(filtered);
	} else {
		console.log("QUESTIONS IN CAT", state.questionsInCat);
		console.log(state.usedCats, category, "CATEGORY AND USED CATS");
		if (countInstances(state.usedCats, category) === 1) {
			filtered = utils.filterByescapehatch(filtered);
		} else {
			filtered = utils.filterOutescapehatch(filtered);
		}
		filtered = utils.filterOutfollowup(filtered);
		filtered = utils.filterOutNonSemantics(filtered);
		filtered = utils.filterOutAsked(state.questionsAsked, filtered);
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
				if (usedCatshist[key] < 3) {
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

function pickPreviousCat() {
	var elem;
	for (var i=0; i < state.oldCategories.length; i++) {
		elem = state.oldCategories[i];
		if (state.usedCats.indexOfelem[0] === -1)
			return elem[0];
	}
	return null;
}

function getKeys (dict) {
	var keys = [];
	for (var key in dict) {
		if (dict.hasOwnProperty(key))
			keys.push(key);
	}
	return keys;
}

function updateOldCats () {
	var counts = {};
	state.nextCategory.map(function (elem, arr) {
		if (typeof counts[elem] === 'undefined')
			counts[elem] = 0;
		counts[elem]++;
	});
	sorted = sortDictByVal(counts);
	state.oldCategories = consolidateArrs(state.oldCategories, sorted);
	console.log(state.oldCategories, 'in update cats');
};

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
		p = typeof p === 'number' ? p : p.talkingLength ? p.talkingLength : p.answerLength;
		length = c && typeof c.answerLength === 'number' ? c.answerLength : 0;
		length = c && typeof c.talkingLength === 'number' ? c.talkingLength : length;
		return p + length;
	}, 0);
	return sum / answerData.length;
}

function longestResponse (answerData) {
	answerData = answerData || state.answerData;
	return answerData.reduce(function (p, c, i, a) {
		var pComp = p.talkingLength ? p.talkingLength : p.answerLength;
		var cComp = c.talkingLength ? c.talkingLength : c.answerLength;
		return pComp > cComp ? p : c;
	}, {});
}

function highestCatCount (answerData) {
	answerData = answerData || state.answerData;
	return answerData.reduce(function (p, c, i, a) {
		var pComp = p.topCat ? p.topCat[1] : -1;
		var cComp = c.topCat ? c.topCat[1] : -1;
		return p.topCat > c.topCat ? p : c;
	});
}

function sortByTopCatCount (answerData) {
	answerData = answerData || state.answerData;
	answerData.sort(function (a, b) {
		var aCmp = a.topCat ? a.topCat[1] : -1;
		var bCmp = b.topCat ? b.topCat[1] : -1;
		if (aCmp > bCmp)
			return -1;
		else if (aCmp < bCmp)
			return 1;
		else
			return 0;
	});
	return answerData;
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
	answerData.map(function (elem) {
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
		if (elem.topCat && countInstances(exclude, elem.topCat[0]) <= 5) {

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
	return category[0] ? category[0].topCat[0] : null;
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

function getSemanticNew () {
	// check if current answer data is stronger (i.e. a longer response, strong category, etc., eventually strong confidence level)
	var category = state.semanticCats.indexOf(state.currentCat) !== -1 ? state.currentCat : null;
	var lastThree = state.answerData.slice(state.answerData.length - 5);
	var lastThreeCats = lastThree.filter(function (elem) { return elem.categoryAsked === category; });
	var lastThreeOnlyCats = lastThree.map(function (elem) { return elem.cateogryAsked; });
	console.log(category, state.answerData);
	var temp;
	if (!category || countInstances(lastThreeOnlyCats, category) >= 3) {
		// how do we pick new category
		// we look at the last 3 questions. if they've all been the same category
		// then we want to pick a new one
		// Also, if they've been very short responses, we probably want to pick a new one (shorter than average)
		// If they've been 
		var lastTopCat = state.answerData[state.answerData.length - 1].topCat;
		if (state.answerData.length > 0 && lastTopCat && lastTopCat !== category) {
			console.log("IN CATEGORY PICKING");
			category = state.answerData[state.answerData.length - 1].topCat ? state.answerData[state.answerData.length - 1].topCat[0] : null;
		} else if (averageResponseLength(lastThree) > averageResponseLength()) 
			category = getNewCatBasedOnTopLengthAndCat(state.usedCats, lastThree);
		else
			category = getNewCatBasedOnTopLengthAndCat(state.usedCats);
	}
	console.log(category, 'cat after top length and cat');
	if (!category) {
		temp = getNewUnusedCategory();
		category = temp ? temp[0] : null;
	} else if (countInstances(lastThreeOnlyCats, category) > 3) {
		// pick a new category
		console.log('in countInstances');
		temp = getNewUnusedCategory();
		category = temp ? temp[0] : null;
	} else if (lastThreeCats.length > 1 && (averageResponseLength(lastThreeCats) < averageResponseLength())) {
		console.log('in averageResponseLength');
		temp = getNewUnusedCategory();
		category = temp ? temp[0] : null;
	}
	console.log(category, 'cat after if statement');
	if (!category) {
		category = pickRandomCat();
	}
	console.log('in new semantic, cat is', category, state.currentCat);
	return getNewQuestion(category);

}

function getSemanticOld () {
	var counts = {}, category, topCount = null, topCat = null, sorted;
	state.nextCategory.map(function (elem, arr) {
		if (typeof counts[elem] === 'undefined')
			counts[elem] = 0;
		counts[elem]++;
	});
	console.log(state.nextCategory, 'next cats are in getSemantic');

	sorted = sortDictByVal(counts);
	console.log(sorted);
	if (sorted.length > 1) {
		console.log("IN HERE");
		sorted = sorted.filter(function (elem) {
			return elem[0] !== 'zzzzzz';
		});
		category = sorted[0][0];
		// state.oldCategories = consolidateArrs(state.oldCategories, sorted);
		// console.log(state.oldCategories, 'old cats');
	} else if (sorted.length === 1) {
		// if (sorted[0][0] !== 'zzzzzz')
		// 	state.oldCategories = consolidateArrs(state.oldCategories, sorted);
		category = sorted[0][0];
		// console.log(state.oldCategories, 'old cats');
	} else {
		category = undefined;
	}
	console.log(category, "CATEGORY");
	
	// console.log(state.nextCategory, category, "HELLO");
	// category = 'zzzzzz';
	// category = undefined;
	usedCatshist = hist(state.usedCats);
	if (category === 'zzzzzz' || state.usedCats.indexOf(category) !== -1) {
		console.log(category, "HELLO THIS IS THE CATEGORY");
		// category = state.currentCat ? state.currentCat : pickRandomCat();
		if (state.semanticCats.indexOf(state.currentCat) !== -1 && usedCatshist[category] < 3) {
			category = state.currentCat;
		} else if (state.strongCat) {
			category = state.strongCat;
			state.shortPause = true;
			return getNewQuestion(category, true);
		} else {
			// fix this previous category business
			category = pickPopularCat();
			console.log("CATEGORY POPULAR", category);
			if (category === 'zzzzzz')
				category = pickPopularCat();
			if (!category && state.semanticCats.indexOf(state.currentCat) !== -1) {
				category = state.currentCat;
			} else
				category = pickRandomCat();
			
		}
	} else if (!category) {
		// fix this previous category business
		category = pickPopularCat();
		console.log(category);
		console.log("CATEGORY POPULAR", category);
		if (category === 'zzzzzz')
			category = pickPopularCat();
		console.log(state.currentCat, "CURRENT CATEGORY");
		if (!category && state.semanticCats.indexOf(state.currentCat) !== -1) {
			category = state.currentCat;

		} else
			category = pickRandomCat();
	}
	// } else if (!category) {
	// 	// don't filter the available categories, possibly?
	// 	// availCats = state.semanticCats.filter(function (elem, i) {
	// 	// 	return state.usedCats.indexOf(elem) === -1;
	// 	// });
	// 	// category = availCats[parseInt(Math.random() * availCats.length, 10)];
	// 	console.log('hello');
	// 	category = state.currentCat && state.currentCat != "followup" ? state.currentCat : pickRandomCat();
	// }
	console.log('cat is', category, state.currentCat);
	return getNewQuestion(category);
}

function hardResetCategories () {
	state.usedCats = [];
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
	state.answersByQuestion[question[1]] = {};
	// sorted = sortDictByVal(hist(state.nextCategory));
	// console.log(sorted, state.nextCategory, 'next cats are');
	// sorted = sorted.filter(function (elem) {
	// 	return elem[0] !== 'zzzzzz';
	// });
	// state.oldCategories = consolidateArrs(state.oldCategories, sorted);
	// state.oldCategories.sort(compForArrofArrs(1));
	console.log("old cats are", state.oldCategories);

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

function timeSinceLastQuestion () {
	var now = Date.now();
	if (state.questionTimeStamps.length === 0)
		return now - state.startTime;
	else {
		return now - state.questionTimeStamps[state.questionTimeStamps.length - 1];
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
	question_order.write(filename + ":" + (Date.now() - state.startTime).toString() + "\n");
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

function boothQuestion () {
	if (Date.now() - state.startTime <= 1000*60*10)
		state.inTransition = false;
	return state.inTransition && state.boothQuestions < 2 && Date.now() % state.boothQuestions === 0;
}

function pickPopularCat () {
	var cat;
	console.log('in popular, old cats are', state.oldCategories, state.usedCats);
	state.oldCategories.sort(compForArrofArrs);
	var usedCatshist = hist(state.usedCats);
	if (state.oldCategories.length > 0) {
		// cat = state.oldCategories.shift();
		cat = state.oldCategories[0];
		// if (cat && cat[0]) {
		while (cat && cat[0] && usedCatshist[cat[0]] > 3 && state.oldCategories.length > 0) {
			state.oldCategories.shift();
			cat = state.oldCategories[0];
		}
		if (cat && cat[0])
			return cat[0];
	}
	return undefined;
}
test = true;
function pickQuestion () {
	var answerData;
	state.checkSilence = false;
	// sd.utils.toggleDormant();
	// sd.utils.dormantOn();
	sd.utils.isDormant();
	updateOldCats();
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

var waitingPeriods = {
	'warmup': 5000,
	'shortpause': 2000,
	'intro': 5000,
	'wrong': 15000,
	'hurt': 15000
};

function launchRec() {
	console.log('launching recorder');
	rec = exec('./s.sh');
	rec.stdout.on('data', function (data) {
		// process.stdout.write(data);
	});
};

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
