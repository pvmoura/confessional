var watson = require('watson-developer-cloud');
var spawn = require('child_process').spawn;
var fs = require('fs');
var speech = watson.speech_to_text({
  username: '25cfed28-d78a-43ba-8d29-210722248039',
  password: 'RJMxTuG5P1aQ',
  version: 'v1'
});
var filename = 'recording.flac';

var recognizeStream = speech.createRecognizeStream({
  'content-type': 'audio/flac; rate 44100',
  word_confidence: true,
  interim_results: true,
  continuous: true
});
var transcript = fs.createWriteStream('transcription.txt');
// subprocesses
// var rec = spawn('rec', ['-r', 44100, '-b', 16, filename]);
var start = false;
var silences = spawn('./first_pass_silences.py');
var processing = spawn('./first_pass_nltk.py');
processing.stdin.write("start 1\n");

transcribe(filename);
// rec.stdout.on('data', function () {
//   if (!start) {
//     console.log("STARTING RECORDING");
//     transcribe(filename);
//     start = true;
//   }
// });

processing.stdout.on('data', function (data) {
  var splitData = data.toString().split(' ');
  console.log(splitData, 'a response');
  console.log(informationState);
  informationState.wordsToProcess--;
  if (informationState.queue.length != 0) {
    processing.stdin.write(informationState.queue.shift() + '\n');
  } else {
    informationState.readyForNextQuestion = true;
    askNewQuestion();
  }
  if (splitData.length === 3)
    informationState.currentProcessedData.push(splitData.splice(0, 2));
});

var informationState = {
  transcripts: [],
  currentTranscript: '',
  currentState: 'asking',
  pastSilences: [],
  currentNextCategory: '',
  interviewStartTime: Date.now(),
  readyForNextQuestion: false,
  currentProcessedData: [],
  queue: [],
  wordsToProcess: 1
};

function processWords (arr) {
  var hist = {}, words, correlation;
  for (var i = 0, len = arr.length; i < len; i++) {
    words = arr[i][0].split('+');
    correlation = Number(arr[i][1]);
    words.map(function (elem, i) {
      if (typeof(hist[elem]) === 'undefined')
        hist[elem] = 0;
      hist[elem] += correlation;
    })
  }
  console.log(hist);
  return hist;
}

function askNewQuestion (arr) {
  var elapsedTime, likelyCategories, largest = [], largestVal = 0;
  elapsedTime = Date.now() - informationState.interviewStartTime;
  informationState.currentState = 'asking';
  likelyCategories = processWords(informationState.currentProcessedData);
  // likelyCategories = processWords(arr);
  // for (var key in likelyCategories) {
  //   if (likelyCategories.hasOwnProperty(key)) {
  //     if (largestVal < likelyCategories[key]) {
  //       console.log('hello', largestVal, key);
  //       if (largestVal != 0) {
  //         largest.push(key);
  //       }
  //       largestVal = likelyCategories[key];
  //     }
  //   }
  // }
  console.log('what I think I should ask about next: ', likelyCategories);
  // pickNextQuestion(largest);

}

function pickNextQuestion (cats) {
  // rec.kill();
  silences.kill();
  processing.kill();
  console.log("THIS IS THE END");
}

// silences logic
var lastSilence, diff;
silences.on('error', function (err) {
  console.log('failed to start child process');
});

silences.stdout.on('data', function (data) {
  var strData = data.toString();
  if (strData.indexOf("Silence time: ") !== -1) {
    console.log(data.toString());
    informationState.pastSilences.push(Number(strData.slice(14)));
  } else if (strData.indexOf("Threshold detected!") !== -1) {
    // launch new question;
    console.log("my silence meter is off the charts");
    console.log(informationState);
    // askNewQuestion();
  }

});

silences.on('close', function (code) {
  console.log('closing code:', code);
});

recognizeStream.on('results', function (data) {
  informationState.readyForNextQuestion = false;
  var results = data ? data.results : null;
  var alternatives;
  // console.log('results were:', results);
  if (results && results.length > 0) {
    if (results[0].final === true) {
      // try {
        alternatives = results[0].alternatives[0];
        informationState.transcripts.push([alternatives.transcript, alternatives.confidence]);
        informationState.transcripts.push(alternatives.transcript);
        transcript.write(alternatives.transcript);
        console.log(alternatives);
        // if (alternatives.confidence > 0.5) {
        if (alternatives.word_confidence) {
          informationState.wordsToProcess += alternatives.word_confidence.length - 1;
          console.log(informationState);
          alternatives.word_confidence.map(function (elem, i) {
              // console.log(elem, i);
              // console.log(elem[0] + ' ' + i + '\n');
              informationState.queue.push(elem);
              informationState.wordsToProcess = informationState.queue.length;
              // processing.stdin.write(elem[0] + ' ' + i + '\n');
          });
          
          console.log(alternatives.transcript, alternatives.confidence);
        }
        // } else {
          // console.log(alternatives.word_confidence);
        // }

      // } catch (e) {
        // console.log("Some error happened!");
      // }
    }
  } else {
    console.log(results);
  }
});

recognizeStream.on('error', function (data, err) {
  console.log("ERROR");
});

recognizeStream.on('end', function () {
  console.log('bye bye');
  transcript.close();
});

function transcribe (filename) {
  fs.open(filename, 'r', function (err, fd) {
    var currStats, currentPos = 0, length, intervalObj;
    
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
        var buffer;
        // console.log('transcribing');
        if (currentPos < currStats.size) {
          blocks = calculateBlocksToRead(currStats.blksize, currentPos, currStats.size);
          length = blocks > 0 ? blocks * currStats.blksize : calculateBytesToRead(currentPos, currStats.size);
          buffer = new Buffer(length);
          fs.read(fd, buffer, 0, length, currentPos, function (err, bytesRead, buffer) {
            if (err) console.log('error on read: ' + err);
            else {
              // console.log(buffer);
              recognizeStream.write(buffer);
              updateEssentials(currentPos + length);
            }
          });
        } else {
          clearInterval(intervalObj);
          // recognizeStream.emit('finish');
        }
      }, 250);
    }

  });
}