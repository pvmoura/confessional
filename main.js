var watson_transcriber  = require('./transcription/watson_transcriber.js');
var fr = require('./transcription/file_reader.js');
var fs = require('fs');
var transcription = fs.createWriteStream('transcription.txt');
// var threshold = require('./threshold_detector/launch_threshold.js');
var spawn = require('child_process').spawn;
var exec = require('child_process').execFile;
var filename = 'recording.flac';
var rec;
var silences = exec('./threshold_detector/threshold_detector.py');
var watson = require('watson-developer-cloud');

var tone_analyzer = watson.tone_analyzer({
  password: 'wPk4cIsEd3JV',
  username: '5f1cfb19-70be-4a78-ac9e-bc1e3f616687',
  version: 'v3-beta',
  version_date: '2016-02-11'
});


console.log('testing silence threshold, please be quiet');
function launchRec() {
	rec = exec('./s.sh');
};

silences.stdout.on('data', function (data) {
	var strData = data.toString();
	if (strData.indexOf('volume threshold set') !== -1) {
		launchRec();
		console.log('silence set at', strData);
		console.log('starting recorder.....');
		setTimeout(function () {
			fr.readFile(filename, watson_transcriber.stream);
			console.log('recording started');
			console.log('sending to Watson');
		}, 1000);
	} else if (strData.indexOf('Threshold detected') !== -1) {
		console.log('done', state);
		tone_analyzer.tone({ text: state.transcripts.join('') },
  function(err, tone) {
    if (err)
      console.log(err);
    else {

      		console.log(JSON.stringify(tone, null, 2));
      		state.tones.push(tone)
  		}
});
		rec.kill();
		silences.kill();
	} else if (strData.indexOf('Threshold time: ') !== -1) {
		state.silences.push(Number(strData.slice(16)));
	}
});

silences.on('error', function (err) {
	console.log('error');
});

silences.on('end', function () {
	var questionThreshold = exec('./threshold_detector/threshold_detector.py', [250]);
	questionThreshold.stdout.on('data', function(data) {
		if (strData.indexOf('Threshold detected') !== -1) {
			// stop question
		}
	});
});

var state = {
	transcripts: [],
	silences: [],
	tones: [],
	startTime: Date.now(),
};

// fr.on('data', function (data) {
// 	watson.stream.write(data);
// });

// fr.on('end', function ()  {
// 	process.stdout.write('file reading ended');	
// });

// watson.stream.on('results', function (data) {
//   var results = data ? data.results : null;
//   var alternatives;
//   if (results && results.length > 0) {
//     if (results[0].final === true) {
//         alternatives = results[0].alternatives[0];
//         state.transcripts.push(alternatives.transcript);
//         process.stdout.write(aternatives.transcript);
//         transcription.write(alternatives.transcript);
//         // module.exports.emit('transcriptData', data);
//     }
//   } else {
//     // module.exports.emit('noData', results);
//   }
// });

watson_transcriber.on('transcriptData', function (data) {
	var alternatives = data.results[0].alternatives[0];
	state.transcripts.push(alternatives.transcript);
	process.stdout.write(alternatives.transcript);
	transcription.write(alternatives.transcript);
});