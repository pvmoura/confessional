var watson = require('../transcription/watson_transcriber.js');
var assert = require('assert');
var fs = require('fs');

describe("watson_transcriber", function () {
	describe("#createStream", function () {
		var filename = 'testAudio.flac';
		var readStream = fs.createReadStream(__dirname + '/testAudio.flac');
		var stream = watson.createStream();
		it('should create a stream object', function () {
			assert.notEqual(typeof stream, 'undefined');
		});
		it('should emit a finalData event', function (done) {
			stream.on('finalData', function (data) {
				
				assert.equal(data.results[0].final, true);
				assert.notEqual(typeof data.results[0].alternatives, 'undefined');
				done();
			});
			stream.emit('results', { results: [ { final: true, alternatives: ['asdf'] } ] });
		});
		it('should emit a noAlternatives event', function (done) {
			stream.on('noAlternatives', function (data) {
				assert.equal(typeof data.results[0].alternatives, 'undefined');
				done();
			});
			stream.emit('results', { results: [ { final: true } ] });
		});
		it('should emit an interimData event', function (done) {
			stream.on('interimData', function (data) {
				assert.equal(data.results[0].final, false);
				done();
			});
			stream.emit('results', { results: [ { final: false } ]});
		});
		it('should emit a watsonError event', function (done) {
			stream.on('watsonError', function (data) {
				assert.equal(data.message, "error");
				done();
			});
			stream.emit('error', { message: "error" });
		});
		it('should emit a close event', function (done) {
			stream.on('watsonClose', function (data) {
				assert.equal(data.code, 123);
				assert.equal(data.reason, 'test');
				done();
			});
			stream.emit('close', 123, 'test');
		});
		it('should emit a noData event', function (done) {
			stream.on('noData', function (data) {
				assert.equal(null, data);
				done();
			});
			stream.emit('results', {});
		});
		it('should get the correct transcription', function (done) {
			var watsonStream = watson.createStream();
			watsonStream.on('finalData', function (data) {
				var alternatives = data.results[0].alternatives[0];
				assert.equal(alternatives.transcript, 'what do you wish your parents had done differently when you were growing up ');
				done();
			});	
			readStream.pipe(watsonStream);
			this.timeout(10000);
		});
	});
});