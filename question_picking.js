var csv = require('ya-csv');

module.exports.readQuestions = function (questionsArray, callback, filename) {
	// default to file on Mac Mini
	if (typeof filename === 'undefined')
		filename = '/Users/tpf2/Desktop/pedro/confessional-database/public/questions.csv';
	if (typeof questionsArray === 'undefined')
		return { 'error': 'Please provide a questions array' };

	var reader = csv.createCsvFileReader(filename);
	reader.on('data', function(data) {
		questionsArray.push(data);
	});
	reader.on('error', function (data) {
		console.log('error', data);
	});
	reader.on('end', function() {
		console.log("questions read in");
		callback(questionsArray);
	});
}


// start = 5 for semantic, 6 for nonSemantic
module.exports.filter = function (cat, questionsArray, questionsAsked, nonSemanticCats, start) {
	return questionsArray.filter(function (elem) {
		for (var i = start; i < 8; i++) {
			if (nonSemanticCats.indexOf(elem[i]) !== -1) {
				return false;
			}
		}
		return elem[5] === cat && questionsAsked.indexOf(elem[1]) === -1;
	});
}

module.exports.pickFromQuestionArray = function (filteredArray) {
	var arrLen = filteredArray.length;
	var question = filteredArray[parseInt(Math.random()*arrLen, 10)];
	return question;
}

// find the hardfollow question -- you should do this separately
module.exports.findHardFollow = function (questionsArray, question) {
	if (typeof question === 'undefined' || question[2] !== 'hardfollow')
		return;

	var followUpArray = questionsArray.filter(function (elem) {
		return question[3] === elem[i][1];
	});
	return followUpArray.length === 1 ? followUpArray[0] : followUpArray;
}


module.exports.decideProceduralCat = function (timeDiff, hasIntroed, hasWarmedUp) {
	var category;
	if (hasIntroed) {
		category = 'intro';
	} else if (timeDiff < 10000 || hasWarmedUp < 2) {
		if (hasWarmedUp % 2 === 0)
			category = 'warmup';
		else
			category = parseInt(Date.now(), 10) % 2 === 0 ? 'warmup' : 'gettingwarmer';
	} else {
		category = 'semantic';
	}
	return category;
}


module.exports.pickQuestion = function (startTime, followUp) {
	var now = Date.now();
	var diff = now - startTime;
	var availCats = [];

	if (followUp === null) {
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