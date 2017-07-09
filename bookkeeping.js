var fs = require('fs');

function createIdentifier (date) {
	function prettify(num) {
		return num < 10 ? '0' + num : num.toString();
	}
	date = new Date(date) || new Date(state.startTime);
	var identifier = prettify(date.getHours()) +
				     prettify(date.getMinutes()) +
				 	 prettify(date.getSeconds()) + "_" +
				 	 date.getFullYear() % 2000 +
				 	 prettify(date.getMonth() + 1) +
				 	 prettify(date.getDate());
	return identifier;
}

module.exports.restart = function () {
	var lastInterview = fs.readFileSync(process.env.transcriptDir + 'last_interview.txt', { encoding: 'utf-8' }).trim();
	var questions = fs.readFileSync(lastInterview + "/questionOrder.txt", { encoding: 'utf-8' }).split('\n');
	var elapsedTime;
	questions = questions.map(function (elem) {
		var info = elem.split(':');
		return elem !== '' ? { identifier: info[0], time: info[1] } : null;
	}).filter(function (elem) { return elem; });
	questions = questions.map(function (elem) {
		return elem.identifier;
	});
	elapsedTime = Math.max.apply(null, questions.map(function (elem) {
		var time = Number(elem.time);
		return isNaN(time) ? 0 : time;
	}));
	console.log('restarting', questions, 'elapsedTime:', elapsedTime);
	return {
		questions: questions,
		elapsedTime: elapsedTime
	};
};

module.exports.bookkeeping = function (startTime, askedQuestions) {

	var identifier = createIdentifier(startTime),
		intIdentifier = process.env.transcriptDir + 'interview-' + identifier,
		logs = {};
	
	fs.mkdirSync(intIdentifier);

	logs.transcription = fs.createWriteStream(intIdentifier + '/transcription_' + identifier + '.txt');
	logs.transcription.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
	logs.computerData = fs.createWriteStream(intIdentifier + '/computer_data_' + identifier + '.txt');
	logs.computerData.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
	logs.questionOrder = fs.createWriteStream(intIdentifier + '/questionOrder.txt');
	logs.questionOrder.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
	if (typeof askedQuestions !== 'undefined') {
		askedQuestions.forEach(function (q) {
			logs.questionOrder.write(q + ":\n")
		});
	}
	fs.writeFileSync(process.env.transcriptDir + 'last_interview.txt', intIdentifier);
	return logs;
}

function restartRecent () {
	var lastInterview = fs.readFileSync('last_interview.txt', { encoding: 'utf-8' }).trim();
	var questions = fs.readFileSync(lastInterview + "/question_order.txt", { encoding: 'utf-8' }).split('\n');
	fs.readFile(lastInterview + "/answer_data.txt", { encoding: 'utf-8' }, function (err, data) {
		if (err) { console.log("ERROR READING ANSWER DATA"); }
		else {
			var d = JSON.parse(data);
			state.answerData = d.length && d.length > 0 ? d : [];
			state.usedCats = state.answerData.map(function (elem) {
				return elem.categoryAsked;
			});

			console.log(state.usedCats, "Used cats");
		}
	});
	// console.log(answerData, 'answerData');
	// state.answerData = answerData.length && answerData.length > 0 ? answerData : [];

	var elapsedTime;
	questions = questions.map(function (elem) {
		var info = elem.split(':');
		return elem !== '' ? { identifier: info[0], time: info[1] } : null;
	});
	questions = questions.filter(function (elem) {
		return elem;
	});
	state.questionsAsked = questions.map(function (elem) {
		return elem.identifier;
	});
	
	elapsedTime = Math.max.apply(null, questions.map(function (elem) {
		var time = Number(elem.time);
		return isNaN(time) ? 0 : time;
	}));
	if (elapsedTime < 0)
		elapsedTime = 0;
	state.startTime = Date.now() - elapsedTime;
	if (state.questionsAsked.length > 6 && elapsedTime === 0)
		state.startTime = Date.now() - 900000;
	console.log('restarting', state.questionsAsked, 'elapsedTime:', elapsedTime);
	if (state.questionsAsked.length > 0)
		state.hasIntroed = true;


	console.log(questions);
	// process.kill(process.pid);
}
if (process.argv[2] === 'restart') {
	restartRecent();
}

function bookkeeping () {
	intIdentifier = process.env.transcriptDir + 'interview-', now = Date.now();
	identifier = createIdentifier(state.startTime);
	console.log(intIdentifier, identifier, state.startTime);
	// state.startTime = now;
	intIdentifier += identifier;
	fs.mkdirSync(intIdentifier);
	transcription = fs.createWriteStream(intIdentifier + '/transcription_' + identifier + '.txt');
	transcription.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
	computerData = fs.createWriteStream(intIdentifier + '/computer_data_' + identifier + '.txt');
	computerData.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
	question_order = fs.createWriteStream(intIdentifier + '/question_order.txt');
	if (state.questionsAsked.length > 0) {
		state.questionsAsked.forEach(function (q) {
			question_order.write(q + ":\n")
		});
	}
	fs.writeFile(intIdentifier + '/answer_data.txt', JSON.stringify(state.answerData));

	fs.writeFileSync('last_interview.txt', intIdentifier);
	question_order.on('error', function (err) {
		if (err) { console.log("transcription error", err); }
	});
	return intIdentifier;
}