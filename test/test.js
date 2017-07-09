var assert = require('assert');
var qu = require('../question_utilities.js');

describe("Question Utilities", function () {
	var categories = ['intro', 'notfirst', 'booth1', 'childhood', 'sex'],
		nonSemanticCats = ['intro', 'notfirst', 'booth1'],
		utils = qu.questionUtils(categories, nonSemanticCats),
		testList = utils.allQuestions().slice(50),
		qutils = qu.questionUtils();

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
	describe("#findStartOfChain", function () {
		it("finds the start of a chain", function () {
			var followup = "ASKFORHELP1b_T02_BEST";
			var start = qutils.findStartOfChain(qutils.findQuestionByFilename(followup));
			assert.equal(start[1], "ASKFORHELP1a_T01_BEST");
		});
		it("finds the start of a chain a few levels deep", function () {
			var followup = "HELLO1c_T03_BEST";
			var start = qutils.findStartOfChain(qutils.findQuestionByFilename(followup));
			// console.log(start, "START IS HERE");
			assert.equal(start[1], "HELLO1a_T04_BEST");
		})
		it("returns null if there is no start", function () {
			var start = qutils.findStartOfChain(qutils.findQuestionByFilename("DANCEMOVES1a_T03_BEST"));
			assert.equal(start[1], "DANCEMOVES1a_T03_BEST");
		});
	});
	describe("#findSemanticCategory", function () {
		it("finds the right semantic category", function () {
			var question = qutils.findQuestionByFilename("HEARTBROKEN1a_T02_BEST");
			assert.equal(qutils.findSemanticCategory(question), "love");
		});
		it("returns null if no semantic category is present", function () {
			var question = qutils.findQuestionByFilename("HEARTBROKEN1b_T02_BEST");
			assert.equal(qutils.findSemanticCategory(question), null);
		});
	});
	describe("#hasCategory", function () {
		it("returns true if a question has the given category", function () {
			var question = qutils.findQuestionByFilename("HEALTHSCARE1b_T01_BEST");			
			assert.equal(qutils.hasCategory(question, "supersuperlong"), true);
			question = qutils.findQuestionByFilename("HURTSOMEONE1b_T01_BEST");
			assert.equal(qutils.hasCategory(question, "followup"), true);
		});
		it("returns false if a question does NOT have the given category", function () {
			var question = qutils.findQuestionByFilename("INSECURESEX1a_T02_BEST");
			assert.equal(qutils.hasCategory(question, "love"), false);
		});

	});
});
