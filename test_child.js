const assert = require('assert');
var exec = require('child_process').execFile;
var spawn = require('child_process').spawn;

var ls = spawn('./first_pass_silences.py', [], { stdio: ['pipe', 'pipe', 'pipe'] });
// var ls = spawn('./test.py');
// var ls = spawn('ls');

// assert(ls.stdout);
// assert.equal(ls.stdio[1], ls.stdout);
var silences = [];
var lastSilence, diff, strData;
ls.on('error', function (err) {
	console.log('failed to start child process');
});
var count = 0;
ls.stdout.on('data', function (data) {
	count += 1;
	strData = data.toString()
	if (strData.indexOf("Silence stopped!") !== -1) {
		diff = new Date() - lastSilence;
		console.log(data.toString());
	} else if (strData.indexOf("Threshold detected") !== -1) {
		exec('./first_pass_ask.py');
	}

});

ls.on('close', function (code) {
	console.log('closing code:', code);
});