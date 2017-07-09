var csv = require('ya-csv');
var EE = require('events');
var fs = require('fs');
var csvPath = process.env.csvPath;
var audioDir = process.env.audioDir;

module.exports = new EE();

module.exports.questionUtils = function (semanticCats, nonSemanticCats, excludeCats) {
	if (typeof csvPath === 'undefined' || csvPath === "") {
		module.exports.emit('error', { message: "Undefined CSV path" });
		return;
	}
	if (typeof audioDir === 'undefined' || audioDir === "") {
		module.exports.emit('error', { message: "Undefined audio directory" });
		return;
	}
	semanticCats = semanticCats || ['belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'];
	nonSemanticCats = nonSemanticCats || ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'escapehatch', 'notfirst', 'staller', 'followup', 'booth1', 'booth2', 'booth3', 'segue', 'verbalnod', 'encouragement', 'empathy', 'tellmemore', 'supersuperlong', 'shortnod'];
	excludeCats = excludeCats || [];

	var questions = [], that = this, utils;

	function generalFilter (filterFun, qs) {
		qs = qs || questions;
		return qs.filter(filterFun);
	}

	
	utils = {
		populateQuestions: function (filename) {
			var reader = csv.createCsvFileReader(filename);
			reader.on('data', function(data) {
				if (questions.filter(function (elem) { return data[1] === elem[1]; }).length === 0)
					questions.push(data);
				else
					console.log(data[1], "THIS IS A DUPLICATE");
			});
			reader.on('error', function (err) {
				module.exports.emit('error', err);
			});
			reader.on('end', function() {
				console.log("questions read in", questions.length);
				questions = utils.filterByAudioFiles();
				questions = utils.filterOutExcluded()
				module.exports.emit('ready', questions);
			});
		},
		filterByAudioFiles: function () {
			var audioFiles = fs.readdirSync(audioDir);
			audioFiles = audioFiles.map(function (elem) {
				return elem.toLowerCase();
			});
			return generalFilter(function (elem) {
				return audioFiles.indexOf(elem[1].toLowerCase() + '.wav') !== -1;
			});
		},
		filterOutExcluded: function () {
			return generalFilter(function (elem) {
				for (var i = 0, len = excludeCats.length; i < len; i++) {
					if (elem.indexOf(excludeCats[i]) !== -1)
						return false;
				}
				return true;
			});
		},
		filterByCategory: function (cat, qs) {
			return generalFilter(function (elem) {
				return elem.slice(5,8).indexOf(cat) !== -1;
			}, qs);
		},
		filterOutNonSemantics: function (qs) {
			return generalFilter(function (q) {
				var notPresent = true;
				q.slice(5, 8).map(function (tag) {
					if (nonSemanticCats.indexOf(tag) !== -1)
						notPresent = false;
				});
				return notPresent;
			}, qs);
		},
		findQuestionsByFileRegEx: function (regex, qs) {
			return generalFilter(function (q) {
				return q[1].match(regex) !== null;
			}, qs);
		},
		filterOutByRegEx: function (regex, qs) {
			return generalFilter(function (q) {
				return q[1].match(regex) === null;
			}, qs);
		},
		filterOutByFileRegEx: function (regex, qs) {
			return generalFilter(function (q) {
				if(q[1].match(regex) === null)
					return true;	
			}, qs);
		},
		pickQuestionFromArray: function (qs) {
			qs = qs || questions;
			return qs[parseInt(Math.random()*qs.length, 10)];
		},
		findQuestionByFilename: function (filename, qs) {
			var filtered = generalFilter(function (elem) {
				return elem[1] === filename;
			}, qs);
			return filtered.length > 0 ? filtered[0] : null;
		},
		filterOutAsked: function (asked, qs) {
			return generalFilter(function (elem) {
				return asked.indexOf(elem[1]) === -1;
			}, qs);
		},
		allQuestions: function () {
			return questions;
		},
		hasCategory: function (question, category) {
			if (!question || typeof question.indexOf === 'undefined')
				return false;
			return question.indexOf(category) !== -1;
		},
		findSemanticCategory: function (question) {
			if (!question || typeof question.slice === 'undefined')
				return null;
			for (var i = 0, len = semanticCats.length; i < len; i++) {
				if (question.slice(5,8).indexOf(semanticCats[i]) !== -1)
					return semanticCats[i];
			}
			return null;
		},
		findStartOfChain: function (question) {
			var qs;
			while (question && question.indexOf('followup') !== -1) {
				qs = questions.filter(function (elem) {
					return elem.slice(2,5).indexOf(question[1]) !== -1;
				});
				question = qs.length ? qs[0] : null;
			}
			return question;
		}
	};
	semanticCats.forEach(function (cat) {
		utils['filterOut' + cat] = function (qs) {
			return generalFilter(function (elem) {
				return elem.slice(5,8).indexOf(cat) === -1;
			}, qs);
		};

		utils['filterBy' + cat] = function (qs) {
			return generalFilter(function (elem) {
				return elem.slice(5, 8).indexOf(cat) !== -1;
			}, qs);
		};
	});
	nonSemanticCats.forEach(function (cat) {
		utils['filterOut' + cat] = function (qs) {
			return generalFilter(function (elem) {
				return elem.slice(5,8).indexOf(cat) === -1;
			}, qs);
		};

		utils['filterBy' + cat] = function (qs) {
			return generalFilter(function (elem) {
				return elem.slice(5, 8).indexOf(cat) !== -1;
			}, qs);
		};
	});
	utils.populateQuestions(csvPath);
	return utils;
}