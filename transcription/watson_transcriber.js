var watson = require('watson-developer-cloud');
var fs = require('fs');
var fr = require('./file_reader.js');
var EE = require('events');
module.exports=  new EE();
var speech = watson.speech_to_text({
  username: '25cfed28-d78a-43ba-8d29-210722248039',
  password: 'RJMxTuG5P1aQ',
  version: 'v1'
});
var recognizeStream = speech.createRecognizeStream({
  'content-type': 'audio/flac; rate 44100',
  word_confidence: true,
  interim_results: true,
  continuous: true
});
var errorLogs = fs.createWriteStream('errors.log');
module.exports.stream = recognizeStream;
// fr.readFile('./transcription/testAudio.flac');
// fr.on('data', function (data) {
// 	recognizeStream.write(data);
// });
recognizeStream.on('error', function(error) {
	var now = new Date();
	errorLogs.write(now.toString() + ": " + error.toString());
	module.exports.emit('watsonError', error);
});

recognizeStream.on('results', function (data) {
  var results = data ? data.results : null;
  var alternatives;
  if (results && results.length > 0) {
    if (results[0].final === true) {
        alternatives = results[0].alternatives[0];
        module.exports.emit('transcriptData', data);
    }
  } else {
    module.exports.emit('noData', results);
  }
});

recognizeStream.on('end', function () {
	var now = new Date();
	process.stdout.write('Closed Watson connection at', now.toString());
})