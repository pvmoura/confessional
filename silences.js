var execFile = require('child_process').execFile;
var state = {
	checkSilence: true,
	silenceThreshold: null,
	startedSpeaking: null,
	categories: [],
	silences: []
};
var EE = require('events');
var duration = 3500, dormant = false, hold = false, silencePeriods = [], speakingPeriods = [], startTime;
module.exports = new EE();

function getDuration (holdingPeriod, customWait, defaultDuration) {
	var now = Date.now(), newDuration = defaultDuration;
	console.log(speakingPeriods, silencePeriods);
	console.log(now, startTime, now - startTime);
	if (now - startTime <= holdingPeriod) {
		if (speakingPeriods.length === 0)	
			newDuration = holdingPeriod;
		else if (speakingPeriods.length === 1) {
			if (speakingPeriods[0] < 500)
				newDuration = customWait;
		}
	}
	return newDuration;
}

function createDetector (holdingPeriod, customWait, defaultDuration, threshold) {
	var detector, silencePeriod, speakingPeriod, intervals = [], options = ['change'], interval;
	if (threshold) {
		options.push(threshold);
	}

	detector = execFile('./threshold_detector/threshold_detector.py', options);
	console.log('Sampling silence threshold, please be quiet');
	detector.stdout.on('data', function (data) {
		var strData = data.toString().trim(), start;
		if (strData.toLowerCase().indexOf('threshold set at:') !== -1) {
			startTime = Date.now();
			console.log(strData);
			strData = strData.replace(/[a-zA-Z :]/g, '');
			strData = Number(strData.split('\n')[0]);
			module.exports.emit('ready', strData);
		}
		if (!dormant) {
			if (strData === '0') {
				silencePeriod = Date.now();
				if (speakingPeriod)
					speakingPeriods.push(Date.now() - speakingPeriod);
				duration = getDuration(holdingPeriod, customWait, defaultDuration);
				console.log("WAITING FOR " + duration / 1000 + " SECONDS TO ASK QUESTION");
				console.log(interval, 'interval');
				if (!interval) {
					interval = setInterval(function () {
						var now = Date.now();
						if (now - silencePeriod < duration)
							console.log("ASKING A QUESTION IN " + (((duration / 2) - 500) / 1000) + " SECONDS!");
						else if (!hold) {
							console.log("ASKING QUESTION");
							module.exports.emit('silencePeriod', { silences: silencePeriods, speaking: speakingPeriods });
							silencePeriods = [];
							speakingPeriods = [];
						} else {
							console.log("HOLDING");
						}
					}, duration / 2);
				}
				// intervals.push(interval);

			}
			else if (strData === '1') {
				// intervals.map(function (interval) {
				// 	clearInterval(interval);
				// });
				// intervals = [];
				clearInterval(interval);
				interval = null;


				// if (silencePeriod)
				silencePeriods.push(Date.now() - silencePeriod);
				if (speakingPeriods.length <= 1){
					console.log("HELO");
					getDuration(holdingPeriod, customWait, defaultDuration);
				}
				speakingPeriod = Date.now();
			}
		}
		
});
	detector.stderr.on('data', function (err) {
		// log the error

	});
	detector.on('close', function (code) {
		intervals.map(function (interval) {
			clearInterval(interval);
		});
		intervals = [];
		console.log('silences closed', code);
	});

	if (threshold) {
		module.exports.emit('ready', threshold);
		console.log("THRESHOLD");
	}

	return detector;
};


module.exports.utils = {
	detector: null,
	start: function (holdingPeriod, customWait, defaultDuration, threshold) {
		if (!this.detector)
			this.detector = createDetector.apply(this, arguments);
		startTime = Date.now();
		dormant = false;
		console.log("starting silences");
	},
	setDuration: function (newDuration) { 
		if (isNaN(Number(newDuration))) {
			return null;
		}
		duration = Number(newDuration);
		console.log('new duration:', duration);
		return duration;
	},
	stop: function () {
		if (this.detector)
			this.detector.kill();
	},
	getDuration: function () {
		return duration;
	},
	toggleDormant: function () {
		dormant = !dormant;
		console.log("silences dormant");
		this.clearIntervals();
	},
	toggleHold: function () {
		hold = !hold;
		console.log(hold ? "HOLD ON" : "HOLD OFF");
	},
	clearIntervals: function () {
		intervals.map(function (interval) {
			clearInterval(interval);
		});
		intervals = [];
	}
};

