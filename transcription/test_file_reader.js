var fr = require('file_reader.js');
var fs = require('fs');

exports['testError'] = function (test) {
	fr.on('error', function (error) {
		test.equal(error.message, 'need filename');
		test.done()
	});
	fr.readFile();
};

exports['readFile'] = function (test) {
	fr.on('data', function (data) {
		var file = fs.readFileSync('testAudio.flac');
		test.equal(file.toString(), data.toString());
		test.done();
	});
	fr.readFile('testAudio.flac');
};