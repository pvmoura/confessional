const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', function (cmd, key) {
  cmd = cmd.toLowerCase();
  if (cmd === 'h') {
  	sd.utils.toggleHold();
  	if (!state.manualHold) {
  		state.manualHold = true;
  		console.log("manual hold ON");
  	} else {
  		state.manualHold = false;
  		console.log("manual hold OFF");
  	}
  } else if (cmd === 'e') {
	console.log("GOING TO END");
	state.ending = true;
	// pickQuestion();
  } else if (cmd === 'x') {
  	console.log("extending interview by 5 minutes");
  	state.interviewLength += 300000;
  } else if (cmd === 's') {
  	console.log("Skipping this question");
  	// pickQuestion();
  	sd.utils.forceSilence();
  } else if (cmd === 'v') {
  	console.log("Saying a verbal nod");
  	playVerbalNod();
  } else if (cmd === 'l') {
  	console.log("repeating last question");
  	if (typeof(timeout) !== 'undefined') {
  		clearTimeout(timeout);
  		timeout = undefined;
  	}
  	playQuestion(state.currentQuestion);
  } else if (cmd === 'r') {
  	console.log("RESETING SHIT");
  	hardResetCategories();
  } else if (cmd === 'rw') {
  	// console.log('restarting watson');
  	// launchWatson();
  } else if (cmd === 't') {
  	console.log('playing a tell me more');
  	playTellMeMore();
  } else if (cmd === 'xxx') {
  	console.log("SEXXXY TIME");
  	state.overrideCat = 'sex';
  } else if (cmd === 'ran') {
  	state.overrideCat = pickRandomCat();
  } else if (cmd === 'hc') {
  	if (!state.holdCat) {
  		console.log("holding category");
  		state.holdCat = true;
  	} else {
  		console.log("holding cat OFF");
  		state.holdCat = false;
  	}
  } else if (cmd === 'co') {
  	console.log("PLAYING COCO");
  	playQuestion(getCoCoName());
  } else if (cmd === 'nc') {
  	console.log("skipping to next category");
  	state.skipToNextCat = true;
  } else if (!isNaN(Number(cmd))) {
  	sd.utils.setThreshold(Number(cmd));
  } 
});
rl.on('error', function (err) {
	console.log(err);
});



function getTellMeMore () {
	var filtered = utils.filterByCategory('tellmemore'), question;
	console.log(filtered.length);
	if (filtered.length === state.tellmemoreAsked.length)
		state.tellmemoreAsked = [];
	// if (state.lastTellmemore !== null)
	// 	filtered = utils.filterOutByRegEx(new RegExp(state.lastTellmemore.slice(0,4)), filtered);
	
	console.log(filtered);
	filtered = utils.filterOutAsked(state.tellmemoreAsked, filtered);

	question = utils.pickQuestionFromArray(filtered);
	if (question && question[1]) {
		state.tellmemoreAsked.push(question[1]);
		return question;
	}
	return "noFollowUp";

}