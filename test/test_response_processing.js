var rp = require('../responseProcessing.js');
var assert = require('assert');

function simpleDeepCopy (obj) {
	return JSON.parse(JSON.stringify(obj));
}

describe("responseProcessing", function () {
	var testData = rp.addResponse({}, "HELLO1a_T01", "intro", 0);
		testData = rp.addResponse(testData, "HELLO1b_T01", "intro", 1);
		testData = rp.addResponse(testData, "HELLO1c_T01", "intro", 2);

	describe("#addResponse", function () {
		it("should create a new response object in the data object", function () {
			var responseData = rp.addResponse({}, "HELLO1a_T01", "intro", 0);
			assert.deepEqual(responseData, { HELLO1a_T01: { categories: {}, speakingLength: null, silenceLength: null, firstSilence: null, averageSilence: null, longestSilence: null, longestThreeSilences: null, silenceStandardDeviation: null, silences: [], speaking: [], sortedCats: [], transcript: null, confidence: null, partials: [], askedCat: "intro", order: 0, id: "HELLO1a_T01" }});
		});
		it("should throw an error if not given a qid", function () {
			try {
				var data = rp.addResponse({});
			} catch (e) {
				assert.equal(e.message, "addResponse(responseData, qid, category, order) expects a qid string");
			}
		});
		it("should keep track of old additions", function () {
			var responseData = rp.addResponse({}, "HELLO1a_T01", "intro", 0);
			assert.deepEqual(responseData,  { HELLO1a_T01: { categories: {}, speakingLength: null, silenceLength: null, firstSilence: null, averageSilence: null, longestSilence: null, longestThreeSilences: null, silenceStandardDeviation: null, silences: [], speaking: [], sortedCats: [], transcript: null, confidence: null, partials: [], askedCat: "intro", order: 0, id: "HELLO1a_T01" }});
			responseData = rp.addResponse(responseData, "HELLO1b_T01", "followup", 1);
			assert.deepEqual(responseData, { HELLO1a_T01: { categories: {}, speakingLength: null, silenceLength: null, firstSilence: null, averageSilence: null, longestSilence: null, longestThreeSilences: null, silenceStandardDeviation: null, silences: [], speaking: [], sortedCats: [], transcript: null, confidence: null, partials: [], askedCat: "intro", order: 0, id: "HELLO1a_T01" }, HELLO1b_T01: { categories: {}, speakingLength: null, silenceLength: null, firstSilence: null, averageSilence: null, longestSilence: null, longestThreeSilences: null, silences: [], speaking: [], sortedCats: [], transcript: null, confidence: null, partials: [], silenceStandardDeviation: null, askedCat: "followup", order: 1, id: "HELLO1b_T01" }});
		});
	});
	describe("#updateResponseCategory", function () {
		
		it("should update the given category if it's already in the object", function () {
			var responseData = rp.addResponse({}, "HELLO1a_T01", "intro", 0);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			assert.deepEqual(responseData["HELLO1a_T01"].categories, { love: 1 });
			assert.deepEqual(responseData["HELLO1a_T01"].sortedCats, [["love", 1]]);
		});
		it("should readjust the top category if the reigning top category is displaced", function () {
			var responseData = rp.addResponse({}, "HELLO1a_T01", "intro", 0);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			assert.deepEqual(responseData["HELLO1a_T01"].categories, { love: 1 });
			assert.deepEqual(responseData["HELLO1a_T01"].sortedCats, [["love", 1]]);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "sex");
			assert.deepEqual(responseData["HELLO1a_T01"].categories, { love: 1, sex: 1 });
			assert.deepEqual(responseData["HELLO1a_T01"].sortedCats, [["love", 1], ["sex", 1]]);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "sex");
			assert.deepEqual(responseData["HELLO1a_T01"].categories, { love: 1, sex: 2 });
			assert.deepEqual(responseData["HELLO1a_T01"].sortedCats, [["sex", 2], ["love", 1]]);
		});
		it("should throw an error if the response isn't in the object", function () {
			try {
				var data = rp.updateResponseCategory({}, "NOTPRESENT", "intro");
			} catch (e) {
				assert.equal(e.message, "Please add this response before updating category");
			}
		});
		// rp.clearData();
	});
	describe("#updateSounds", function () {
		it("should update sound data for a given response", function () {
			var sounds = { speaking: [10, 8, 10, 8, 8, 4], silences: [10, 8, 10, 8, 8, 4] };
			var responseData = rp.addResponse({}, "HELLO1a_T01", "intro", 0);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", sounds);
			var q = responseData["HELLO1a_T01"];
			assert.equal(q.firstSilence, 10);
			assert.equal(q.silenceLength, 48);
			assert.equal(q.speakingLength, 48);
			assert.deepEqual(q.longestThreeSilences, [10, 10, 8]);
			assert.equal(q.longestSilence, 10);
			assert.equal(q.averageSilence, 8);
			assert.equal(q.silenceStandardDeviation, 2.1908902300206643);
			assert.deepEqual(q.silences, sounds.silences);
			assert.deepEqual(q.speaking, sounds.speaking);
		});
		it("should not blow up if given empty data", function () {
			var sounds = { speaking: [], silences: [] };
			var responseData = rp.addResponse({}, "HELLO1a_T01", "intro", 0);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", sounds);
			assert.deepEqual(responseData["HELLO1a_T01"], { categories: {}, speakingLength: 0, silenceLength: 0, firstSilence: null, averageSilence: null, longestSilence: null, longestThreeSilences: [], silenceStandardDeviation: null, silences: [], speaking: [], sortedCats: [], transcript: null, confidence: null, partials: [], askedCat: "intro", order: 0, id: "HELLO1a_T01" });
		});
		it("should throw an error if the response isn't in the object", function () {
			try {
				var data = rp.updateSounds({}, "NOTPRESENT", "intro");
			} catch (e) {
				assert.equal(e.message, "Please add this response before updating sounds");
			}
		});
		it("should throw an error if not give a sounds object with the right keys", function () {
			try {
				var data = rp.updateSounds(testData, "HELLO1a_T01", {});
			} catch (e) {
				assert.equal(e.message, "Expects sounds to be an object with 'silences' and 'speaking' keys");
			}
		});
	});
	describe("#filterByLength", function () {
		var responseData = JSON.parse(JSON.stringify(testData));
		responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [10, 4, 5], speaking: [100000, 3, 90] });
		responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [10, 4, 5], speaking: [40000, 3, 90] });
		responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [10, 4, 5], speaking: [100000, 100, 90] });
		it("should filter response data by length and return an array of response objects", function () {
			var filtered = rp.filterByLength(responseData);
			assert.equal(filtered.length, 2);
			assert.deepEqual(filtered.map(function (elem) { return elem.id; }), ["HELLO1a_T01", "HELLO1c_T01"]);
		});
		it("should return an empty array if none meet the threshold", function () {
			var filtered = rp.filterByLength(responseData, 10000000);
			assert.equal(filtered.length, 0);
			assert.deepEqual(filtered, []);
		});
		it("should return an empty array given an empty object", function () {
			var filtered = rp.filterByLength({});
			assert.equal(filtered.length, 0);
			assert.deepEqual(filtered, []);
		});
	});
	describe("#filterByCatMismatch", function () {
		it("should filter response data by category mismatch return an array of response objects", function () {
			var responseData = JSON.parse(JSON.stringify(testData));
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1b_T01", "love");
			var filtered = rp.filterByCatMismatch(responseData);
			assert.equal(filtered.length, 2);
			assert.deepEqual(filtered.map(function (elem) { return elem.id; }), ["HELLO1a_T01", "HELLO1b_T01"]);
		});
		it("should return an empty array if none meets the filter", function () {
			var filtered = rp.filterByCatMismatch(testData);
			assert.equal(filtered.length, 0);
			assert.deepEqual(filtered, []);
		});
		it("should return an empty array given an empty object", function () {
			var filtered = rp.filterByCatMismatch({});
			assert.equal(filtered.length, 0);
			assert.deepEqual(filtered, []);
		});
	});
	describe("#averageResponseLength", function () {
		it("should return null if given an empty object", function () {
			assert.equal(rp.averageResponseLength({}), null);
		});
		it("should return the correct average", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [100, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [100, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [100, 200, 300], silences: [] });
			assert.equal(rp.averageResponseLength(responseData), 600);
		});
		it("should return the correct average given some empty arrays", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [100, 200, 300], silences: [] });
			assert.deepEqual(rp.averageResponseLength(responseData), 200);
		});
	});
	describe("#sortByVal", function () {
		it("sorts by longest response descending", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [100, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [], silences: [] });
			var sorted = rp.sortByVal(responseData, ["speakingLength"]);
			assert.deepEqual(sorted.map(function (elem) { return elem.id; }), [ "HELLO1a_T01", "HELLO1b_T01", "HELLO1c_T01" ]);
		});
		it("sorts by longest response ascending", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [100, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [], silences: [] });
			var sorted = rp.sortByVal(responseData, ["speakingLength"], true);
			assert.deepEqual(sorted.map(function (elem) { return elem.id; }), [ "HELLO1b_T01", "HELLO1c_T01", "HELLO1a_T01" ]);
		});
		it("sorts the data by the first element in an array descending", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [100, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [50], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [], silences: [] });
			var sorted = rp.sortByVal(responseData, ["speaking"]);
			assert.deepEqual(sorted.map(function (elem) { return elem.id; }), [ "HELLO1a_T01", "HELLO1b_T01", "HELLO1c_T01" ]);
		});
		it("sorts the data by the first element in an array descending", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [100, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [50], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [], silences: [] });
			var sorted = rp.sortByVal(responseData, ["speaking"], true);
			assert.deepEqual(sorted.map(function (elem) { return elem.id; }), [ "HELLO1c_T01", "HELLO1b_T01", "HELLO1a_T01" ]);
		});
		it("sorts by categories descending", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1c_T01", "sex");
			var sorted = rp.sortByVal(responseData, ["sortedCats"]);
			assert.deepEqual(sorted.map(function (elem) { return elem.id; }), [ "HELLO1a_T01", "HELLO1c_T01", "HELLO1b_T01" ]);

		});
		it("sorts by categories ascending", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			var sorted = rp.sortByVal(responseData, ["sortedCats"], true);
			assert.deepEqual(sorted.map(function (elem) { return elem.id; }), [ "HELLO1b_T01", "HELLO1c_T01", "HELLO1a_T01" ]);

		});
		it("sorts by two different numerical values in descending order", function () {
			var responseData = simpleDeepCopy(testData);
			// responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			// responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [100, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			var sorted = rp.sortByVal(responseData, ["speakingLength", "order"], false);
			assert.deepEqual(sorted.map(function (elem) { return elem.id }), ["HELLO1c_T01", "HELLO1b_T01", "HELLO1a_T01"] );
		});
		it("sorts by two different non-numerical values", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1b_T01", "sex");
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [500, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			var sorted = rp.sortByVal(responseData, ["sortedCats", "silenceLength"]);
			assert.deepEqual(sorted.map(function (elem) { return elem.id; }), ["HELLO1b_T01", "HELLO1a_T01", "HELLO1c_T01"])
			sorted = rp.sortByVal(responseData, ["speaking", "silences"] );
			assert.deepEqual(sorted.map(function (elem) { return elem.id; }), ["HELLO1c_T01", "HELLO1b_T01", "HELLO1a_T01"])
		});
	});
	describe("#largestValue", function () {
		it("should return the longest response", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [100, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [], silences: [] });
			assert.deepEqual(rp.largestValue(responseData, 'speakingLength'), responseData["HELLO1a_T01"]);
		});
		it("should return longest silence length", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [100, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [], speaking: [] });
			assert.deepEqual(rp.largestValue(responseData, 'silenceLength'), responseData["HELLO1a_T01"]);
		});
		it("should return largest silence standard deviation", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [100, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			assert.deepEqual(rp.largestValue(responseData, 'silenceStandardDeviation'), responseData["HELLO1a_T01"]);
		});
		it("should return largest first silence", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [100, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			assert.deepEqual(rp.largestValue(responseData, 'firstSilence'), responseData["HELLO1c_T01"]);
		});
		it("should return largest category", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1c_T01", "sex");
			var largestCat = rp.largestValue(responseData, ["sortedCats"]);
			assert.deepEqual(largestCat, responseData["HELLO1a_T01"]);
		});
		it("should return largest silence value", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [100, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			assert.equal(rp.largestValue(responseData, 'silences'), responseData["HELLO1c_T01"]);
		});
		it("should return largest average silence", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [100, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			assert.deepEqual(rp.largestValue(responseData, 'averageSilence'), responseData["HELLO1c_T01"]);
		});
		it("should return largest speakingLength and category", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [0, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [100, 101, 10000], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [700, 800, 850], silences: [] });
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1b_T01", "sex");
			responseData = rp.updateResponseCategory(responseData, "HELLO1c_T01", "belief");
			responseData = rp.updateResponseCategory(responseData, "HELLO1c_T01", "belief");
			assert.deepEqual(rp.largestValue(responseData, [ "sortedCats", "speakingLength" ]), responseData["HELLO1c_T01"]);
			responseData = rp.updateResponseCategory(responseData, "HELLO1b_T01", "sex");
			assert.deepEqual(rp.largestValue(responseData, [ "sortedCats", "speakingLength" ]), responseData["HELLO1b_T01"]);
			
		});
	});
	describe("#smallestValue", function () {
		it("should return the shortest response", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [100, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [], silences: [] });
			assert.deepEqual(rp.smallestValue(responseData, 'speakingLength'), responseData["HELLO1b_T01"]);
		});
		it("should return shortest silence length", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [100, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [], speaking: [] });
			assert.deepEqual(rp.smallestValue(responseData, 'silenceLength'), responseData["HELLO1b_T01"]);
		});
		it("should return shortest silence standard deviation", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [100, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			assert.deepEqual(rp.smallestValue(responseData, 'silenceStandardDeviation'), responseData["HELLO1b_T01"]);
		});
		it("should return shortest first silence", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [100, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			assert.deepEqual(rp.smallestValue(responseData, 'firstSilence'), responseData["HELLO1a_T01"]);
		});
		it("should return smallest category", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1c_T01", "sex");
			var smallestCat = rp.smallestValue(responseData, "sortedCats");
			assert.deepEqual(smallestCat, responseData["HELLO1b_T01"]);
		});
		it("should return smallest value given an array", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [100, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			assert.equal(rp.smallestValue(responseData, 'silences'), responseData["HELLO1b_T01"]);
		});
		it("should return shortest average silence", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { silences: [0, 200, 300], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { silences: [100, 101, 102], speaking: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { silences: [700, 800, 850], speaking: [] });
			assert.deepEqual(rp.smallestValue(responseData, 'averageSilence'), responseData["HELLO1b_T01"]);
		});
	});
	describe("#consolidateCats", function () {
		it("should consolidate all categories", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1c_T01", "sex");
			var cats = rp.consolidateCats(responseData);
			assert.deepEqual(cats, [ ["love", 2], ["sex", 1] ]);
		});
		it("should return an empty array with no categories", function () {
			assert.deepEqual(rp.consolidateCats(testData), []);
		});
	});
	describe("#rank", function () {
		it("should return the right ranking", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1c_T01", "sex");
			assert.equal(rp.rank(responseData, "HELLO1a_T01", ["sortedCats"]), 0);
			assert.equal(rp.rank(responseData, "HELLO1c_T01", ["sortedCats"]), 1);
			assert.equal(rp.rank(responseData, "HELLO1b_T01", ["sortedCats"]), 2);
		});
		it("should return null if not given a responseId in the object", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			assert.equal(rp.rank(responseData, "NOTPRESENT", ["sortedCats"]), null);
		});
		it("should return the rank in a multi-value sort", function () {
			var responseData = simpleDeepCopy(testData);
			responseData = rp.updateSounds(responseData, "HELLO1a_T01", { speaking: [0, 200, 300], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1b_T01", { speaking: [100, 101, 10000], silences: [] });
			responseData = rp.updateSounds(responseData, "HELLO1c_T01", { speaking: [700, 800, 850], silences: [] });
			responseData = rp.updateResponseCategory(responseData, "HELLO1a_T01", "love");
			responseData = rp.updateResponseCategory(responseData, "HELLO1b_T01", "sex");
			responseData = rp.updateResponseCategory(responseData, "HELLO1c_T01", "belief");
			responseData = rp.updateResponseCategory(responseData, "HELLO1c_T01", "belief");
			assert.equal(rp.rank(responseData, "HELLO1a_T01", ["sortedCats", "speakingLength"]), 2);
			assert.equal(rp.rank(responseData, "HELLO1b_T01", ["sortedCats", "speakingLength"]), 1);
			assert.equal(rp.rank(responseData, "HELLO1c_T01", ["sortedCats", "speakingLength"]), 0);
		});
	});
});