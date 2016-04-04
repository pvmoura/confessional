var spawn = require('child_process').spawn;
var silences = spawn('./threshold_detector/threshold_detector.py');
var EventEmitter = require('events');
module.exports = new EventEmitter();

silences.stdout.on('data', function (data) {
	var strData = data.toString();
	if (strData.indexOf('volume threshold set') !== -1) {
		module.exports.emit('ready');
	} else if (strData.indexOf('Threshold detected') !== -1) {
		module.exports.emit('threshold');
	} else if (strData.indexOf('Threshold time: ') !== -1) {
		module.exports.emit('thresholdTime', Number(strData.slice(16)));
	}
});

silences.on('error', function (err) {
	module.exports.emit('error', err);
});