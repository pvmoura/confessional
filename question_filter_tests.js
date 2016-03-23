var csv = require('ya-csv');
var questions = [];
var state = {
	transcripts: [],
	silences: [],
	tones: [],
	startTime: Date.now(),
	questionCats: ['', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst'],
	semanticCats: ['belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'],
	hasIntroed: false,
	hasWarmedUp: 0,
	catsAsked: [],
	questionTimeStamps: [],
	proceduralCat: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'semantic'],
	nonSemanticCats: ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'semantic', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst'],
	followUp: null,
	questionsAsked: []
};
function readQuestions (filename) {
	if (typeof filename === 'undefined')
		filename = '/Users/tpf2/Desktop/pedro/confessional-database/public/questions.csv';
	var reader = csv.createCsvFileReader(filename);
	reader.on('data', function(data) {
		questions.push(data);
	});
	reader.on('end', function() {
		console.log("questions read in");
		console.log(pickFromQuestionArray('intro'));
		console.log(state);
	});
}
readQuestions();
function filterNonSemantic(cat) {
	return questions.filter(function (elem) {
		for (var i = 6; i < 8; i++) {
			if (state.nonSemanticCats.indexOf(elem[i]) !== -1) {
				return false;
			}
		}
		return elem[5] === cat && state.questionsAsked.indexOf(elem[1]) === -1;
	});
}
function filterSemantic (cat) {
	return questions.filter(function (elem) {
		for (var i = 5; i < 8; i++) {
			
			if (state.nonSemanticCats.indexOf(elem[i]) !== -1) {
				return false;
			}
		}
		return elem[5] === cat && state.questionsAsked.indexOf(elem[1]) === -1;
	});
}

function pickFromQuestionArray(cat, followUp, semantic) {
	if (typeof followUp !== 'undefined')
		followUp = 'followup';
	var filter = semantic ? filterSemantic : filterNonSemantic;
	var filteredArray = filter(cat);
	var arrLen = filteredArray.length;
	console.log(arrLen);
	var question = filteredArray[parseInt(Math.random()*arrLen, 10)];
	if (question[2] === 'hardfollow') {
		for (var i = 0; i < questions.length; i++) {
			if (question[3] === questions[i][1]) {
				state.followUp = questions[i];
				break;
			}
		}
	}
	return filteredArray[parseInt(Math.random()*arrLen, 10)];
}
