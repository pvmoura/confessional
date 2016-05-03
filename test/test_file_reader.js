var fr = require('../transcription/file_reader.js');
var assert = require('assert');
var fs = require('fs');
var filename = __dirname + '/testAudio.flac';
var watson = require('../transcription/watson_transcriber.js');
var child = require('child_process');

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
		// it('should read the file and emit a data event', function (done) {
		// 	fr.on('data', function (data) {
		// 		var file = fs.readFileSync(filename).toString();
		// 		assert.equal(file.toString(), data.toString());
		// 		done();
		// 	});
		// 	fr.readFile(filename);
		// });
		it('should restart the stream on timeout', function (done) {
			function createStream () {
				stream = watson.createStream();
				stream.on('watsonError', function (data) {
					assert.notEqual(typeof data, 'undefined');
					rec.kill();
					console.log(data);
					stream = createStream();
					fs.createReadStream(filename).pipe(stream);
				});	
				stream.on('finalData', function (data) {
					var alternatives = data.results[0].alternatives[0];
					console.log(alternatives);
					assert.equal(alternatives.transcript, 'what do you wish your parents had done differently when you were growing up ');
					done();
				});
				// console.log(stream);
				return stream;
			}
			this.timeout(1200000);
			var stream = createStream();
			var rec = child.spawn('rec', ['-r', 44100, '-b', 16, 'recording.flac']);
			
			setTimeout(function () {
				fr.readFile('./recording.flac', stream);
			}, 100);

		});
	});
});