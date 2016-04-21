var csv = require('ya-csv');
var EE = require('events');




module.exports.questionUtils = function (filename, categories, nonSemanticCats) {
	if (typeof filename === 'undefined')
		filename = '/Users/tpf2/Desktop/pedro/confessional-database/public/questions.csv';
	var questions = [], that = this, utils;
	var reader = csv.createCsvFileReader(filename);
	reader.on('data', function(data) {
		questions.push(data);
	});
	reader.on('error', function (data) {
		console.log('error', data);
	});
	reader.on('end', function() {
		console.log("questions read in");
		// callback(questions);
	});

	
	utils = {
		populateQuestions: function (filename) {
			var reader = csv.createCsvFileReader(filename);
			reader.on('data', function(data) {
				questions.push(data);
			});
			reader.on('error', function (err) {
				module.exports.emit('readError', err);
			});
			reader.on('end', function() {
				console.log("questions read in", questions.length);
				module.exports.emit('ready', questions);
			});
		},
		filterByCategory: function (cat, qs) {
			if (typeof qs === 'undefined')
				qs = questions;
			return qs.filter(function (elem) {
				return elem[5] === cat;
			});
		},
		filterOutNonSemantics: function (qs) {
			qs = qs || questions;
			return qs.filter(function (q) {
				var notPresent = true;
				q.slice(5, 8).map(function (tag) {
					if (nonSemanticCats.indexOf(tag) !== -1)
						notPresent = false;
				});
				return notPresent;
			});
		},
		findQuestionsByFileRegEx: function (regex, qs) {
			qs = qs || questions;
			return qs.filter(function (q) {
				if (q[1].match(regex) !== null)
					return true;
			});
		},
		pickQuestionFromArray: function (qs) {
			qs = qs || questions;
			return qs[parseInt(Math.random()*qs.length, 10)];
		},
		findQuestionByFilename: function (filename, qs) {
			qs = qs || questions;
			for (var i = 0; i < qs.length; i++) {
				if (qs[i][1] === filename)
					return qs[i];
			}
			return null;
		},
		filterOutAsked: function (asked, qs) {
			qs = qs || questions;
			return qs.filter(function (elem) {
				return asked.indexOf(elem[1]) === -1;
			});
		}

	};
	categories.map(function (cat) {
		utils['filterOut' + cat] = function (qs) {
			if (typeof qs === 'undefined')
				qs = questions;

			return qs.filter(function (q) {
				var notPresent = true;
				q.slice(5,8).map(function (tag) {
					if (tag === cat)
						notPresent = false;
				});
				return notPresent;
			});
		};

		utils['filterBy' + cat] = function (qs) {
			if (typeof qs === 'undefined')
				qs = questions;

			return qs.filter(function (q) {
				var present = false;
				q.slice(5, 8).map(function (tag) {
					if (tag === cat)
						present = true;
				});
				return present;
			});
		};
	});

	return utils;
}