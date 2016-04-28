var assert = require('assert');
var qu = require('../question_utilities.js');

describe("Question Utilities", function () {
	var categories = ['intro', 'notfirst', 'booth1', 'childhood', 'sex'],
		nonSemanticCats = ['intro', 'notfirst', 'booth1'],
		utils = qu.questionUtils(categories, nonSemanticCats),
		testList = utils.allQuestions().slice(50);

	function generalTest(filterFun, feature, checkFun, given) {
		var list = given ? testList : undefined;
		var transformed = utils[filterFun](list), correct = true;
		transformed.map(function (elem, i) {
			if (!featureToCheck(elem)) correct = false;
		});
		assert.equal(correct, true);
	}

	describe("#populateQuestions", function () {
		it('reads in csv to an array', function () {
			assert.equal(utils.allQuestions().length, 482);
		});
	});
	describe("#filterByAudioFiles", function () {
		it('filters question array by available audio files', function () {
			var qs = utils.filterByAudioFiles();
			assert.equal(qs.length, 0);
		});
	});
	describe("#filterByCategory", function () {
		it('filters full list by category', function () {
			generalTest('filterByCategory', 'notfirst', function (e) { e[5] === 'notfirst' });
		});
		it('filters given list by category', function () {
			generalTest('filterByCategory', 'notfirst', function (e) { e[5] === 'notfirst' }, true);
		});
	});
	describe("#filterOutNonSemantics", function () {
		it('doesn\'t change given empty nonSemantic list', function () {
			generalTest('filterByCategory', 'notfirst', function (e) { e[5] === 'notfirst' });
		});
		it('filters nonSemantics from full list', function () {
			generalTest('filterByCategory', 'notfirst', function (e) { e[5] === 'notfirst' });
		});
		it('filters nonSemantics from given list', function () {
			generalTest('filterByCategory', 'notfirst', function (e) { e[5] === 'notfirst' }, true);
		});
	});
	describe("#findQuestionsByFileRegEx", function () {
		it('filters full list by given file regex', function () {

		});
		it('filters given list by given file regex', function () {

		});
	});
	describe("#pickQuestionFromArray", function () {
		it('picks a random question from full list', function () {

		});
		it('picks a random question from given list', function () {

		});
	});
	describe("#findQuestionByFilename", function () {
		it('finds a needle in the haystack', function () {

		});
		it('returns null if it doesn\'t find the needle', function () {

		});
	});
	describe("#filterOutGivenArray", function () {
		it('filters out given array from full list', function () {

		});
		it('filters out given array from given list', function () {

		});
	});
	describe("#allQuestions", function () {
		it('returns the questions array', function () {

		});
	});
	describe("#filterOut categories", function () {
		it('has filterOut methods for given categories', function () {

		});
		it('filters out each category from full list', function () {

		});
		it('filters out each category from given list', function () {

		});
	});
	describe("#filterBy categories", function () {
		it('has filterBy methods for given categories', function () {

		});
		it('filters full list by each category', function () {

		});
		it('filters given list by each category', function () {

		});
	});
});
