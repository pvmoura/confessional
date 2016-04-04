var fr = require('../transcription/file_reader.js');
var assert = require('assert');
var fs = require('fs');
var filename = process.cwd() + '/test/testAudio.flac';

describe('file_reader', function () {
	describe('#readFile', function () {
		it('should return an error message without a filename', function (done) {
			fr.on('error', function (error) {
				assert.equal(typeof error.message, 'string');
				assert.equal(error.message, 'need filename');
				done();
			});
			fr.readFile();
		});
		it('should read the file and emit a data event', function (done) {
			fr.on('data', function (data) {
				var file = fs.readFileSync(filename).toString();
				assert.equal(file.toString(), data.toString());
				done();
			});
			fr.readFile(filename);
		});
	});
});