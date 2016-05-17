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
    var currStats, currentPos = 0, length, intervalObj, emitted = false, atEnd = 0;
    
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
        blocks = calculateBlocksToRead(currStats.blksize, currentPos, currStats.size);
        length = calculateBytesToRead(currentPos, currStats.size);
        if (length <= 0) {
          length = currStats.size >= 20000 ? currStats.size - 20000 : currStats.size;
          currentPos = currStats.size >= 20000 ? currStats.size - 20000 : currStats.size;
        }
        buffer = new Buffer(length);

        if (buffer.length > 0 && buffer.length >= length) {
          fs.read(fd, buffer, 0, length, currentPos, function (err, bytesRead, buffer) {
            if (err) console.log('error', err);
            else {
              stream.write(buffer);
              updateEssentials(currentPos + length);
              if (currentPos >= currStats.size) {
                atEnd++;
                console.log("CURRENT POS IS EQUAL TO SIZE", currentPos, currStats);
                if (atEnd === 8) {
                  module.exports.emit("stagnantFile", stream);
                } else if (atEnd === 10) {
                  clearInterval(intervalObj);
                  console.log("clearing interval");
                }
                updateEssentials(currentPos - length - 20000);
              } else {
                atEnd = 0;

              }
            }
          });
        } else {
          console.log("BUFFER SIZE TOO SMALL", buffer.length, length, currentPos, currStats.size);
        }
      }, intervalTime);
      intervals.push(intervalObj);
    }

  });
};
