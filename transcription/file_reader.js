var fs = require('fs');
var EventEmitter = require('events');
module.exports = new EventEmitter();
intervals = [];

module.exports.killReader = function () {
  intervals.map(function (interval) {
    clearInterval(interval);
  });
}

module.exports.readFile = function (filename, stream, intervalTime) {
  intervalTime = intervalTime || 250;
  var error = { message: 'need filename' };
  if (typeof filename !== 'string') {
    console.log('error', error);
    module.exports.emit('error', error);
    return;
  }
  fs.open(filename, 'r', function (err, fd) {
    var currStats, currentPos = 0, length, intervalObj, emitted = false;
    
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


    if (err) module.exports.emit('error', err); //console.log('error', err);
    else {
      updateEssentials(0);
      intervalObj = setInterval(function () {
        var buffer;
        // console.log(currentPos, currStats.size);
        // if (currentPos < currStats.size) {
          blocks = calculateBlocksToRead(currStats.blksize, currentPos, currStats.size);
          length = calculateBytesToRead(currentPos, currStats.size); //blocks > 0 ? blocks * currStats.blksize : calculateBytesToRead(currentPos, currStats.size);
          if (length <= 0) {
            length = currStats.size >= 20000 ? currStats.size - 20000 : currStats.size;
            currentPos = currStats.size >= 20000 ? currStats.size - 20000 : currStats.size;
          }
          buffer = new Buffer(length);
          // console.log("LENGTH IS", length, "buffer size is", buffer.length);
          // console.log(buffer.length);
          if (buffer.length > 0 && buffer.length >= length) {
            fs.read(fd, buffer, 0, length, currentPos, function (err, bytesRead, buffer) {
              if (err) console.log('error', err);
              else {
                // console.log(buffer);
                module.exports.emit('data', buffer);
                stream.write(buffer);
                updateEssentials(currentPos + length);
                // console.log(currentPos, buffer.length, "CURRENT PSO");
                if (currentPos >= currStats.size) {
                  console.log("CURRENT POS IS EQUAL TO SIZE", currentPos, currStats);
                  // clearInterval(intervalObj);
                  // if (!emitted) {
                  //   module.exports.emit("readError");
                  //   emitted = true;
                  //   setTimeout(function () {
                  //     emitted = false;
                  //   }, 2000);
                  // }
                  updateEssentials(currentPos - length - 20000);
                }
              }
            });
          } else {
            console.log("BUFFER SIZE TOO SMALL", buffer.length, length, currentPos, currStats.size);
            // clearInterval(intervalObj);
            // module.exports.emit("readError");
          }
        // } else {
          // clearInterval(intervalObj);
          // updateEssentials()

          //module.exports.emit('end');
        // }
      }, intervalTime);
      intervals.push(intervalObj);
    }

  });
};
