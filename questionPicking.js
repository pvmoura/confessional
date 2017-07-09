/*********************************************
 *                                           *
 *                                           *
 *      Options object should have	         *
 *                                           * 
 *                                           *
 *                                           *
 *                                           *
 *                                           *
 *                                           *
 ********************************************/

 // options object should have
 // responsedata
 // asked questions
 // current question
 // time difference
 // state

var qus = require('./question_utilities.js');
var questionUtils = qus.questionUtils();

var filterHelper = function (list, by, out) {
	by = by || [];
	out = out || [];
	by.forEach(function (filter) {
		list = questionUtils['filterBy' + filter];
	});
	out.forEach(function (filter) {
		list = questionUtils['filterOut' + filter];
	});
	return list;
};

var getBoothCategory = function (data) {

};

// currentQuestion, as per database is something like:
// [text, filename, typefollow, followfile(default/short/yes), followfile(no/long), tag1, tag2, tag3, keywords]
var getFollowUp = function (data) {
	
	var fupType = data.currentQuestion[2] ? data.currentQuestion[2].toLowerCase() : null,
		followFile = 3,
		currRD = data.responseData[data.currentQuestion[1]],
		isSuperlong = currRD && currRD.speakingLength > 60000,
		isShort = currRD && currRD.speakingLength < 3000;

	switch (fupType) {
		case 'yesno':
			followFile = isShort ? 3 : 4;
			break;
		case 'length':
			followFile = isShort ? 3 : !questionUtils.hasCategory(data.currentQuestion, "superlong") ? 4 : isSuperlong ? 4 : 3;
			break;
		default:
			followFile = 3;
	}
	
	if (data.currentQuestion && data.currentQuestion[followFile]) {
		return data.currentQuestion[followFile];
	} else {
		return null;
	}
};

var getEnd = function () {
	var possQuestions = questionUtils.findQuestionsByFileRegEx(/^[eE][nN][dD]/);
	possQuestions = questionUtils.filterOutfollowup(possQuestions);
	return questionUtils['pickQuestionFromArray'](possQuestions);
};

var getPersonalityStatement = function (data, booths) {
	var shouldSayStatement = rightTimeForPersonality(data), boothStatements;
	booths = booths || ['booth1', 'booth2', 'booth3'];
	if (shouldSayStatement) {
		booths.forEach(function (elem) {
			boothStatements.push.apply(null, questionUtils['filterBy' + elem]);
		});
		return questionUtils.pickQuestionFromArray(boothStatements);
	} else {
		return null;
	}
};

function rightTimeForPersonality (data) {
	// if (Date.now() - state.startTime <= 1000*60*10)
	// 	state.inTransition = false;
	if (Date.now() - data.startTime <= 1000 * 60 * 15)
		return false;
	if (data.inTransition && data.boothQuestions < 1 && data.noBooths)
		return Date.now() % 2 === 0;
	return data.inTransition && data.boothQuestions < 2 && Date.now() % data.boothQuestions === 0;
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

function getSuperSuperLong () {
	var filtered = utils.filterBysupersuperlong();
	filtered = utils.filterOutAsked(state.supersuperlongs, filtered);
	return utils.pickQuestionFromArray(filtered);
}

function getChildhoodInteractive () {
	return utils.findQuestionByFilename("AFFECTEDYOUNG_T03_BEST");
}

function getCoCoName () {
	return utils.findQuestionByFilename("COCO_T03_BEST");
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

module.exports = {
	getFollowUp: getFollowUp,
	getEnd: getEnd
}
