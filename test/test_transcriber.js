var assert = require("assert");
var transcriber = require("../transcription/transcriber.js");
var fs = require('fs');
var player = require('play-sound')({player: "play"});
var child = require('child_process');

describe("transcriber", function () {
	var options = {dir: "test/testRecordings"};
	var callback = function () { };
	var dataDir = process.env.projectDir + "/" + options.dir || "/test";
	var transcriberObj = transcriber.createTranscriber(options, callback);
	var rm = child.spawnSync('rm', ['-R', 'test/testRecordings']);
	fs.mkdirSync(dataDir);

	describe("#getLatestFileNum", function () {
		it("should return 1 for the first file", function () {
			var latest = transcriberObj.getLatestFileNum();
			assert.equal(latest, 1);
		});
		it("should return 11 if a 10 file is already there", function () {
			var filename = dataDir + "/recording10.flac";
			var file = fs.openSync(filename, "w");
			var latest = transcriberObj.getLatestFileNum();
			assert.equal(latest, 11);
			fs.closeSync(file);
			fs.unlinkSync(filename);
		});
	});
	describe("#makeFilename", function () {
		it("should make a filename", function () {
			var filename = transcriberObj.makeFilename();
			assert.equal(filename, dataDir + "/recording1.flac");
		});
	});
	describe("#startRecording", function () {
		it("should start recording to a file", function (done) {
			var watcher = fs.watch(dataDir);
			console.log(transcriberObj, "transcriberObj in startrecording");
			watcher.on('change', function (event, file) {
				console.log(file, "FILENAME IN STARTRECORDING");
				watcher.close();
				done();
			});
			transcriberObj.startRecording();
			transcriberObj.stopRecording();
		});
	});
	describe("#startTranscription", function () {
		it("should start transcription", function (done) {
			// transcriberObj = null;
			var t = transcriber.createTranscriber(options, function (err, data) {
				if (err) {
					throw new Error(err.toString());
				}
				var alternatives = data.results[0].alternatives[0];
				console.log(data.results[0].alternatives[0]);
				assert.equal(alternatives.transcript, 'what do you wish your parents had done differently when you were growing up ');
				t.stopTranscription();
				done();
			})
			t.startTranscription();
			setTimeout(function () {
				player.play(__dirname + '/testAudio.flac', function (err) {
					if (err) throw new Error(err);
					t.stopRecording();
				});
			}, 1000);
			this.timeout(30000);
		});
	});
	describe("#stopTranscription", function () {
		it("should stop transcription", function () {
			transcriberObj.startTranscription();
			assert.notEqual(transcriberObj.watsonObj, null);
			assert.notEqual(transcriberObj.recordingObj, null);
			transcriberObj.stopTranscription();
		});
	});
});