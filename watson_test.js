var watson = require('watson-developer-cloud');
var child = require('child_process');
var fs = require('fs');
var speech_to_text = watson.speech_to_text({
  username: '3a223acf-c31e-403d-bca0-da88c124a99a',
  password: 'aEzxZ8KGNDVw',
  version: 'v1'
});
var session;

speech_to_text.createSession({}, function(err, res) {
  if (err) console.log(err);
  session = res;
});

var watcher = fs.watch('.');
var files = {};
watcher.on('change', function (event, filename) {
  if (typeof files[filename] === 'undefined') {
    files[filename] = false;
  } else if (files[filename] === false) {
    // run watson on the file
    //fs.createReadStream(filename).pipe(speech_to_text.createRecognizeStream({ content_type: 'audio/flac; rate=44100' })).pipe(fs.createWriteStream('./transcripts/' + filename + '_transcription.txt'));
    //fs.createReadStream(filename).pipe(speech_to_text.createRecognizeStream({ content_type: 'audio/flac; rate=44100' })).pipe(process.stdout).pipe(fs.createWriteStream('./transcripts/' + filename + '_transcriptions.txt'));;
    setObservation(filename);
    runWatson(filename);
    files[filename] = true;
  }
});
function setObservation (filename) {
  speech_to_text.observeResult({
    session_id: session.session_id,
    cookie_session: session.cookie_session
  }, function (err, interim) {
    if (err) console.log('error: ', err);
    else console.log(JSON.stringify(interim, null, 2));
  });
}

function runWatson (filename) {

  var params = {
      // From file
      audio: fs.createReadStream(filename),
      content_type: 'audio/flac; rate=44100',
      session_id: session.session_id,
      continuous: true,
      word_confidence: true
  };

  speech_to_text.recognize(params, function(err, res) {
    if (err)
      console.log(err);
    else
      console.log(JSON.stringify(res, null, 2));
  });

}
