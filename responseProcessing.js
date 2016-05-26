var utils = require('./utilities.js');

var generalErrorChecker = function (func, responseData) {
	if (typeof responseData === 'undefined' || typeof responseData !== 'object')
		throw new Error('Expecting responseData to be an object');
	return func();
};

var addResponse = function (responseData, qid, category, order) {
	return generalErrorChecker(function () {
		if (typeof qid === 'undefined')
			throw new Error("addResponse(responseData, qid, category, order) expects a qid string");

		responseData[qid] = {
			categories: {},
			speakingLength: null,
			silenceLength: null,
			firstSilence: null,
			averageSilence: null,
			longestSilence: null,
			longestThreeSilences: null,
			silenceStandardDeviation: null,
			silences: [],
			speaking: [],
			sortedCats: [],
			transcript: null,
			partials: [],
			askedCat: category,
			order: order,
			id: qid
		};
		return responseData;
	}, responseData);
};

var updateResponseCategory = function (responseData, qid, category) {
	return generalErrorChecker(function () {
		if (typeof responseData[qid] === 'undefined')
			throw new Error("Please add this response before updating category");
		var q = responseData[qid];
		if (typeof q.categories[category] === 'undefined')
			q.categories[category] = 0;
		q.categories[category]++;
		q.sortedCats = utils.consolidateArrs(responseData[qid].sortedCats, [[category, 1]]);
		q.sortedCats.sort(utils.compForArrofArrs(1));
		return responseData;
	}, responseData);
};

var updateSounds = function (responseData, qid, sounds) {
	return generalErrorChecker(function () {

		var q = responseData[qid], silences = sounds.silences;
		if (typeof q === 'undefined')
			throw new Error("Please add this response before updating sounds");
		if (typeof silences === 'undefined' || typeof sounds.speaking === 'undefined')
			throw new Error("Expects sounds to be an object with 'silences' and 'speaking' keys");

		q.firstSilence = silences[0] ? silences[0] : null;
		q.silenceLength = utils.sum(silences);
		q.speakingLength = utils.sum(sounds.speaking);
		silences.sort(function (a, b) {
			var aCmp = Number(a);
			var bCmp = Number(b);
			if (aCmp < bCmp) {
				return 1;
			} else if (aCmp > bCmp || isNaN(aCmp) || isNaN(bCmp)) {
				return -1;
			} else
				return 0;

		});
		q.longestThreeSilences = silences.slice(0,3);
		q.longestSilence = silences[0] ? silences[0] : null;
		q.averageSilence = utils.average(silences);
		try { q.silenceStandardDeviation = utils.standardDeviation(silences); }
		catch (e) { }
		q.silences = silences;
		q.speaking = sounds.speaking;
		return responseData;

	}, responseData);
};

// defaults to long (minute+) responses
var filterByLength = function (responseData, lengthThreshold) {
	return generalErrorChecker(function () {
		if (typeof responseData !== 'undefined')
		lengthThreshold = lengthThreshold || 60000;
		var answerData = utils.vals(responseData);
		return answerData.filter(function (elem) {
			return elem.speakingLength > lengthThreshold;
		});
	}, responseData);
}

var filterByCatMismatch = function (responseData) {
	return generalErrorChecker(function () {
		var answerData = utils.vals(responseData);
		return answerData.filter(function (elem) {
			var topCat = elem.sortedCats[0];
			return topCat && !(topCat[0] === elem.askedCat);
		});
	}, responseData);
};

var averageResponseLength = function (responseData) {
	return generalErrorChecker(function () { 
		var answerData = utils.vals(responseData);
		return utils.average(answerData.map(function (elem) { return elem.speakingLength; }));
	}, responseData);
};

var largestValue = function (responseData, values) {
	return generalErrorChecker(function () {
		if (typeof values === 'string')
			values = [ values ];
		answerData = sortByVal(responseData, values);
		return answerData.length > 0 ? answerData[0] : null;
	}, responseData);
};

var smallestValue = function (responseData, values) {
	return generalErrorChecker(function () {
		if (typeof values === 'string')
			values = [ values ];
		answerData = sortByVal(responseData, values, true);
		return answerData.length > 0 ? answerData[0] : null;
	}, responseData);
};

var sortByVal = function (responseData, values, asc) {
	function getVal(obj) {		
		return typeof obj === 'number' ? obj :
			   obj === null  || obj.length === 0 ? null :
			   typeof obj[0] === 'object' ? obj[0][1] : obj[0];
	}
	return generalErrorChecker(function () {
		var answerData = utils.vals(responseData);
		answerData.sort(function (a, b) {
			var value = values[0],
				aCmp = getVal(a[value]),
				bCmp = getVal(b[value]),
				aSec, bSec, result;
			if (aCmp > bCmp)
				result = -1;
			else if (aCmp < bCmp)
				result = 1;
			else if (values.length > 1) {
				aSec = getVal(a[values[1]]), bSec = getVal(b[values[1]]);
				console.log(aSec, bSec, "SECOND VALUE");
				if (aSec > bSec)
					result = -1;
				else if (aSec < bSec)
					result = 1;
				else
					result = 0;
			} else
				result = 0;
			
			return asc === true ? -1 * result : result;
		});
		return answerData;
	}, responseData);
};

var consolidateCats = function (responseData) {
	return generalErrorChecker(function () {
		var answerData = utils.vals(responseData), consolidatedCats = [];
		answerData = answerData.map(function (elem) {
			return elem.sortedCats;
		});
		answerData.forEach(function (elem) {
			consolidatedCats = utils.consolidateArrs(consolidatedCats, elem);
		});
		consolidatedCats.sort(utils.compForArrofArrs(1));
		return consolidatedCats;
	}, responseData);
};

module.exports = {
	addResponse: addResponse,
	updateSounds: updateSounds,
	updateResponseCategory: updateResponseCategory,
	filterByLength: filterByLength,
	filterByCatMismatch: filterByCatMismatch,
	averageResponseLength: averageResponseLength,
	sortByVal: sortByVal,
	largestValue: largestValue,
	smallestValue: smallestValue,
	consolidateCats: consolidateCats
}