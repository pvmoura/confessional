var qp = require('../questionPicking.js');
var assert = require('assert');

describe("Question Picking", function () {
	var questions = [["I want to hear about a dream that you had that feels important to you.","DREAM1a_T01_BEST","length","","DREAM1b_T01_BEST","belief","superlong","shortnod","freud","freudian","analysis","analyze","psychiatrist","shrink","psychologist","counseling","therapy","therapist","afraid","fears","fear","phobia","anxiety","worry","worried","anxious","",""],
					 ["I want to hear about a dream that you had that feels important to you.","DREAM1a_T01_BEST","length","","DREAM1b_T01_BEST","belief","","shortnod","freud","freudian","analysis","analyze","psychiatrist","shrink","psychologist","counseling","therapy","therapist","afraid","fears","fear","phobia","anxiety","worry","worried","anxious","",""]]
	var testData = {
		currentQuestion: questions[0],
		responseData: { DREAM1a_T01_BEST: { categories: {}, speakingLength: null, silenceLength: null, firstSilence: null, averageSilence: null, longestSilence: null, longestThreeSilences: null, silenceStandardDeviation: null, silences: [], speaking: [], sortedCats: [], transcript: null, confidence: null, partials: [], askedCat: "intro", order: 0, id: "HELLO1a_T01" }, 
						HELLO1b_T01: { categories: {}, speakingLength: null, silenceLength: null, firstSilence: null, averageSilence: null, longestSilence: null, longestThreeSilences: null, silenceStandardDeviation: null, silences: [], speaking: [], sortedCats: [], transcript: null, confidence: null, partials: [], askedCat: "intro", order: 0, id: "HELLO1a_T01" }}
	};
	describe("#getFollowUp", function () {
		it("should return null if the responseData is empty", function () {
			assert.equal(null, qp.getFollowUp(testData));
		});
		it("should return null if speaking length is not too short but not superlong", function () {
			testData.responseData["DREAM1a_T01_BEST"].speakingLength = 10000;

			assert.equal(null, qp.getFollowUp(testData));
		});
		it("should return null if the speaking length is too short", function () {
			testData.responseData["DREAM1a_T01_BEST"].speakingLength = 100;
			assert.equal(null, qp.getFollowUp(testData));
		});
		it("should return the followup if the superlong conditions are met", function () {
			testData.responseData["DREAM1a_T01_BEST"].speakingLength = 70000;
			assert.equal("DREAM1b_T01_BEST", qp.getFollowUp(testData));
		});
		it("should return the followup if speaking length is not too short", function () {
			testData.responseData["DREAM1a_T01_BEST"].speakingLength = 5000;
			testData.currentQuestion = questions[1];
			console.log(testData);
			assert.equal("DREAM1b_T01_BEST", qp.getFollowUp(testData));
		});
		it("should return null if speaking length is too short", function () {
			testData.currentQuestion = questions[1];
			testData.responseData["DREAM1a_T01_BEST"].speakingLength = 2999;
			assert.equal(null, qp.getFollowUp(testData));
		});
	});
	describe("#getEnd", function () {
		it("should get an end question", function () {
			assert.equal("END1_1a_T06_BEST", qp.getEnd()[1]);
		});
	});
	describe("")
});