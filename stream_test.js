var watson = require('watson-developer-cloud');
var speech = watson.speech_to_text({
  username: '25cfed28-d78a-43ba-8d29-210722248039',
  password: 'RJMxTuG5P1aQ',
  version: 'v1'
});
var fs = require('fs');
// var filename = './transcription/testAudio.flac';
var filename = 'recording.flac';
//var stream = fs.createReadStream(filename);
var recognizeStream = speech.createRecognizeStream({
  'content-type': 'audio/flac; rate 44100',
  word_confidence: true,
  interim_results: true,
  continuous: true
});


var transcript = fs.createWriteStream('transcription.txt');
recognizeStream.on('data', function (data) {
  // process.stdout.write(data);
  // transcript.write(data);
});
var child = require('child_process');
//var rec = child.spawn('rec', ['-r', 44100, '-b', 16, filename]);

recognizeStream.on('results', function (data) {
  var results = data ? data.results : null;
  var alternatives;
  if (results[0].final === true) {
    try {
      alternatives = results[0].alternatives[0];
      if (alternatives.confidence > 0.75) {
        console.log(alternatives.transcript, alternatives.confidence);
      } else {
        console.log(alternatives.word_confidence);
      }

    } catch (e) {
      console.log("Some error happened!");
    }
  }
});

recognizeStream.on('error', function (data, err) {
  console.log("ERROR");
  console.log(data);
});
recognizeStream.on('end', function () {
  console.log('bye bye');
  transcript.close();
});
fs.open(filename, 'r', function (err, fd) {
  var currStats;
  var currentPos = 0;
  var length;
  var intervalObj;
  function setCurrentRecordingStats (filename) {
    var stats = fs.statSync(filename);

    currStats = {
      size: stats.size,
      blocks: stats.blocks,
      blksize: stats.blksize
    };
  }
  function setCurrentPos (newPos) {
    currentPos = newPos;
  }

  function calculateBlocksToRead (blksize, currentPos, size) {
    return (size - currentPos) / blksize;
  }

  function calculateBytesToRead (currentPos, size) {
    return size - currentPos;
  }

  function updateEssentials (newPos) {
    if (typeof newPos === 'undefined') newPos = 0;
    setCurrentRecordingStats(filename);
    setCurrentPos(newPos);
  }


  if (err) console.log('error: ' + err);
  else {
    updateEssentials(0);
    intervalObj = setInterval(function () {
      console.log(currentPos);
      if (currentPos < currStats.size) {
        blocks = calculateBlocksToRead(currStats.blksize, currentPos, currStats.size);
        length = blocks > 0 ? blocks * currStats.blksize : calculateBytesToRead(currentPos, currStats.size);
        console.log(blocks, currStats, length);
        //console.log(currentPos, currStats, length);
        var buffer = new Buffer(length);
        fs.read(fd, buffer, 0, length, currentPos, function (err, bytesRead, buffer) {
          if (err) console.log('error on read: ' + err);
          else {
            //console.log(buffer);
            recognizeStream.write(buffer);
            //console.log('before', currStats);
            updateEssentials(currentPos + length);
            //console.log('after', currStats);
          }
        });
      } else {
        clearInterval(intervalObj);
        // recognizeStream.stop();
      }
    }, 250);
  }

});

/*
stream.on('end', function () {
  console.log('ended');
});
stream.pipe(speech.createRecognizeStream({
    'content-type': 'audio/flac; rate 44100'
  })).pipe(fs.createWriteStream('transcription.txt')); */
