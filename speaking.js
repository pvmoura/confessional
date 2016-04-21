var silences, speaking;
var exec = require('child_process').execFile;
var spawn = require('child_process').spawn;
var utils = require('./question_utilities.js');
// var player = require('play-sound')(opts={player: 'afplay'});
function detectSpeaking(threshold, duration) {
	console.log("HELLOO");
	if (typeof threshold === 'undefined')
		threshold = 40;
	if (typeof duration === 'undefined')
		duration = 1;
	speaking = exec('./threshold_detector/threshold_detector.py', [threshold, duration, 'gt']);
	speaking.stdout.on('data', function (data) {
		strData = data.toString();
		if (strData.indexOf('Threshold detected') !== -1) {
			console.log("THERE WAS SPEAKING");
			launchSilences(state.silenceThreshold);
			speaking.kill();
		}

	});


}
function playQuestion(filename, end) {
	var dir = "/Users/tpf2/Dropbox/Current Booth Questions/programQuestions/";
	player.play(dir + filename + ".wav", function (err){
		if (err) console.log("ERROR WHILE PLAYING");
		else {
			state.questionTimeStamps.push(Date.now());
			if (end)
				thisProcess.kill(thisProcess.pid);
			// silences.kill();
			detectSpeaking();
		}
	})
	// silences.kill();
}

qus = utils.questionUtils("/Users/tpf2/Desktop/pedro/first_pass/questions.csv", 
	['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst', 'belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'],
	['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst'])
playQuestion("YOUFASCIN_T01")
qus.allQuestions().map(function (q) {
	console.log('hello');
	console.log(q[1]);
	playQuestion(q[1]);
})


function launchSilences(threshold, duration) {
	var options = [];
	if (threshold) {
		if (typeof duration === 'undefined')
			duration = "";
		options = [threshold, duration];
	}
	silences = exec('./threshold_detector/threshold_detector.py', options);
	silences.stdout.on('data', function (data) {
		// console.log(data);
		var strData = data.toString();
		if (strData.indexOf('volume threshold set at:') !== -1) {
			launchRec();
			console.log('silence set at', strData);
			state.silenceThreshold = Number(strData.substr(24));
			console.log('starting recorder.....');

			setTimeout(function () {
				fr.readFile(filename, watson_transcriber.stream);
				pickQuestion();
				console.log('recording started');
				console.log('sending to Watson');
			}, 1000);
		} else if (strData.indexOf('Threshold detected') !== -1) {
			console.log("THERE WAS A SILENCE");
			// kill recorder
			//rec.kill();
			silences.kill();
			// pickQuestion();

			// tone_analyzer.tone({ text: state.transcripts.join('') },
			//  function(err, tone) {
			//     if (err)
			//       console.log(err);
			//     else {

			//       		// console.log(JSON.stringify(tone, null, 2));
			//       		state.tones.push(tone)
			//   		}
			// });

			// rec.kill();

		} else if (strData.indexOf('Threshold time: ') !== -1) {
			state.silences.push(Number(strData.slice(16)));
		}
	});

	silences.stderr.on('data', function (err) {
		console.log('error', err);

	});
	silences.on('close', function (code) {
		console.log('silences closed', code);
	})
}