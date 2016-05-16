var watson = require('./watson_transcriber.js'),
	fr = require('./file_reader.js'),
	exec =  require('child_process').exec,
	fs = require('fs');

function launchRecording (filename) {
	// var recording = execFile(process.env.projectDir + '/transcription/record.sh', [filename]);
	var recording = exec('rec -r 44100 -b 16 ' + filename);
	return recording;
}

function launchWatson (callback, that) {
	watson_stream = watson.createStream();

	watson_stream.on('finalData', function (data) {
		callback(null, data);
	});

	watson_stream.on('watsonError', function (err) {
		callback(err);
	});
	return watson_stream;
}

function startTranscriber (filename, watson_stream) {
	fr.readFile(filename, watson_stream);
}
// takes an options objects with keys:
// restart : Boolean
// dir : string
module.exports.createTranscriber = function (options, callback) {
	var dir, restart;
	if (!callback || typeof callback !== 'function')
		throw new Error('transcriber(options, callback) expects a function callback');
	
	options.dir = options.dir || 'data';
	restart = options.restart === false ? false : true;
	dir = process.env.projectDir + "/" + options.dir;

	return {
		filename: null,
		recordingObj: null,
		watsonObj: null,
		active: false,
		restart: restart,
		makeFilename: function () {
			var newNum = this.getLatestFileNum();
			return dir + '/recording' + newNum + '.flac';
		},
		getLatestFileNum: function () {
			var fileNumbers = fs.readdirSync(dir).filter(
				function (elem) {
					return elem.indexOf('.flac') !== -1;
				}).map(function (elem) {
					return Number(elem.replace(/[a-zA-Z.]/g, ''));
			});
			var lastNum = Math.max.apply(null, fileNumbers);
			return isNaN(lastNum) || fileNumbers.length === 0 ? 1 : lastNum + 1;
		},
		startRecording: function () {
			if (!this.filename)
				this.filename = this.makeFilename();

			this.recordingObj = launchRecording(this.filename);
		},
		stopRecording: function () {
			if (this.recordingObj)
				this.recordingObj.kill();
		},
		startTranscription: function (test) {
			var watcher = fs.watch(dir);
			if (!this.filaname)
				this.filename = this.makeFilename();
			var that = this;
			watcher.on('change', function (event, file) {
				console.log(file, "THIS IS THE FILENAME", that.filename, dir + "/" + file);
				if (dir + "/" + file === that.filename) {
					console.log("starting transcription");
					startTranscriber(that.filename, that.watsonObj);
					that.active = true;
					watcher.close();
				}
			});
			fr.on('stagnantFile', function (stream) {
				console.log("Passed the stream back");
			});
			this.recordingObj = launchRecording(this.filename);
			this.watsonObj = launchWatson(callback, this);
		},
		stopTranscription: function () {
			fr.killReader(this.recordingObj.pid);
			this.recordingObj.kill();
			this.active = false;
		}
	}
}