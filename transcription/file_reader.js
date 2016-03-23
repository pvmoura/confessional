var fs = require('fs');

module.exports.readFile = function (filename, stream, intervalTime) {
  intervalTime = intervalTime || 250;
  if (typeof filename !== 'string') {
    console.log('error', { message: 'need filename' });
    return;
  }
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


    if (err) console.log('error', err);
    else {
      updateEssentials(0);
      intervalObj = setInterval(function () {
        var buffer;
        if (currentPos < currStats.size) {
          blocks = calculateBlocksToRead(currStats.blksize, currentPos, currStats.size);
          length = blocks > 0 ? blocks * currStats.blksize : calculateBytesToRead(currentPos, currStats.size);
          buffer = new Buffer(length);
          fs.read(fd, buffer, 0, length, currentPos, function (err, bytesRead, buffer) {
            if (err) console.log('error', err);
            else {
              stream.write(buffer);
              updateEssentials(currentPos + length);
            }
          });
        } else {
          clearInterval(intervalObj);
          //module.exports.emit('end');
        }
      }, intervalTime);
    }

  });
};
