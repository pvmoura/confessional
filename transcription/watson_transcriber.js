/*********************************************
 *                                           *
 *                                           *
 *                                           *
 *                                           * 
 *                                           *
 *                                           *
 *                                           *
 *                                           *
 *                                           *
 ********************************************/

// load necessary libraries
var watson = require('watson-developer-cloud');
var fs = require('fs');
var fr = require('./file_reader.js');
var EE = require('events');

// make speech-to-text object using nodejs watson library
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

// make this an event emitting module with the stream object
module.exports = new EE();
module.exports.stream = recognizeStream;

recognizeStream.on('error', function(error) {
	var now = new Date();
	errorLogs.write(now.toString() + ": " +  error.toString());
	module.exports.emit('watsonError', error);
});

// Watson streams emit a "results" event when they have any result
// from Watson, interim or final. Interim results have a final attribute
// set to false and they provide a draft of Watson's transcription.
// This function waits for a final result
recognizeStream.on('results', function (data) {
  var results = data ? data.results : null, alternatives;

  if (results && results.length > 0) {
    if (results[0].final === true) {
      alternatives = results[0].alternatives[0];
      module.exports.emit('finalData', data);
    } else {
      module.exports.emit('interimData', data);
    }
  } else {
    module.exports.emit('noData', results);
  }
});

recognizeStream.on('end', function () {
	var now = new Date();
	process.stdout.write('Closed Watson connection at', now.toString());
  module.exports.emit('watsonClose');
})