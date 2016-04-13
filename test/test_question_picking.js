var qp = require('../question_picking.js');
var assert = require('assert');
describe('questionPicking', function () {
	var filename = '/Users/pedrovmoura/Documents/Code/third-party/confessional-old/files/questions.csv';
	var questionsArray = [];
	var nonSemanticCats = ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'semantic', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst'];
	var askedQuestions = ['lovelife', 'friendlovejealous'];
	var category = 'love';
	describe('#readQuestions', function () {
		var filename = __dirname + '/test.csv';

		it ('returns an error if not given a questionsArray', function () {
			var result = qp.readQuestions();
			assert.equal(typeof result.error, 'string');
		});
		it ('fills the question array', function (done) {
			var questionsArray = [];
			qp.readQuestions(questionsArray, function () {
				assert.equal(questionsArray.length, 4);
				assert.equal(questionsArray[0][0], 'cat');
				done();
			}, filename);
		});
	});

	describe('#filter', function () {
		it ('filters correctly nonSemanticCats', function (done) {
			var callback = function (questions) {
				var filteredArray = qp.filter(category, questions, askedQuestions, nonSemanticCats, 5);
				assert.equal(filteredArray.length, 9);
				done();
			};
			qp.readQuestions(questionsArray, callback, filename);
		});
		it ('filters semantic categories', function (done) {
			var callback = function (questions) {
				var filteredArray = qp.filter(category, questions, ['firstlove'], nonSemanticCats, 6);
				assert.equal(filteredArray.length, 20);
				done();
			};
			qp.readQuestions(questionsArray, callback, filename);
		});
	});

	describe('#pickFromQuestionArray', function () {
		it ('picks a question', function (done) {
			var callback = function (questions) {
				var filteredArray = qp.filter(category, questions, askedQuestions, nonSemanticCats, 6);
				var question = qp.pickFromQuestionArray(filteredArray);
				assert.notEqual(typeof question, 'undefined');
				assert.equal(typeof question[1], 'string');
				done();
			};
			qp.readQuestions(questionsArray, callback, filename);
		});
	});

	describe('#findHardFollow', function () {
		it ('fails if the question isn\'t given', function () {
			var fakeQuestion = [ 'How would you describe your soulmate?', 'soulmate', '', '', '', 'love' ];
			var result = qp.findHardFollow();
			assert.equal(typeof result, 'undefined');
		});
		it ('returns a followup question id', function () {
			var callback = function (questions) {
				var filteredArray = qp.filter(category, questions, askedQuestions, nonSemanticCats, 6);
				var question = qp.pickFromQuestionArray(filteredArray);
				assert.notEqual(typeof question, 'undefined');
				assert.equal(typeof question[1], 'string');
				done();
			};
			qp.readQuestions(questionsArray, callback, filename);
		});
	});
});