var execFile = require('child_process').execFile;
var EE = require('events');
var duration = 3500, dormant = false, hold = false, silencePeriods = [],
	speakingPeriods = [], startTime, holdingPeriod = null, customWait = null, defaultDuration = null, globalIntervals = [];
module.exports = new EE();

function getDuration (holdingPeriod, customWait, defaultDuration) {
	var now = Date.now(), newDuration = defaultDuration;
	// console.log(speakingPeriods, silencePeriods);
	// console.log(now, startTime, now - startTime);
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
function globalClearIntervals () {
	globalIntervals.forEach(function (interval) {
		clearInterval(interval);
	});
	globalIntervals = [];
}

function createDetector (threshold, reset) {
	var detector, silencePeriod, speakingPeriod, intervals = [], options = ['change'], interval;
	if (typeof threshold !== 'undefined') {
		options.push(threshold);
	}
	function clearIntervals () {
		intervals.forEach(function (interval) {
			clearInterval(interval);
		});
		intervals = [];
	}

	detector = execFile('./threshold_detector/threshold_detector.py', options);
	if (!threshold)
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
				if (speakingPeriods.length > 0) {
					duration = getDuration(holdingPeriod, customWait, defaultDuration);
					console.log("WAITING FOR " + duration / 1000 + " SECONDS TO ASK QUESTION");
					// console.log(interval, 'interval is');

					if (!interval) {
						interval = setInterval(function () {
							console.log('setting new interval');
							var now = Date.now();
							if (now - silencePeriod < duration)
								console.log("ASKING A QUESTION IN " + (((duration / 2) - 500) / 1000) + " SECONDS!");
							else if (!hold) {
								console.log("ASKING QUESTION");
								module.exports.emit('silencePeriod', { silences: silencePeriods, speaking: speakingPeriods });
								clearIntervals();
								silencePeriods = [];
								speakingPeriods = [];
							} else {
								console.log("HOLDING");
							}
						}, duration / 2);
						intervals.push(interval);
						globalIntervals.push(interval);
						// console.log(intervals, "INTERVALS ARE");
					}
				} else {
					console.log("waiting for the person to speak", speakingPeriods);
				} 
				// intervals.push(interval);

			}
			else if (strData === '1') {
				clearIntervals();
				interval = null;
				if (silencePeriod)
					silencePeriods.push(Date.now() - silencePeriod);
				else
					silencePeriods.push(Date.now() - startTime);
				if (speakingPeriods.length <= 1) {
					console.log("started speaking");
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

	if (threshold && !reset) {
		module.exports.emit('ready', threshold);
		console.log("THRESHOLD");
	} else if (threshold && reset) {
		module.exports.emit('resetThreshold', threshold);
		console.log("RESET THRESHOLD TO", threshold);
	}



	return detector;
};


module.exports.utils = {
	detector: null,
	holdingPeriod: null,
	customWait: null,
	defaultDuration: null,
	threshold: null,
	start: function (threshold) {
		console.log("THE DETECTOR IS", this.detector ? this.detector.pid : null);
		if (!this.detector || this.detector.killed === true)
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
	dormantOn: function () {
		dormant = true;
		console.log("silences dormant");
		this.clearIntervals();
	},
	dormantOff: function () {
		dormant = false;
		console.log("silences not dormant");
	},
	toggleHold: function () {
		hold = !hold;
		console.log(hold ? "HOLD ON" : "HOLD OFF");
	},
	clearIntervals: function () {
		console.log("clearing intervals");
		intervals.forEach(function (interval) {
			clearInterval(interval);
		});
		intervals = [];
	},
	isDormant: function () {
		console.log("THE DORMANT SETTING", dormant);
		return dormant;
	},
	setThreshold: function (threshold) {
		console.log("given threshold is", threshold);
		if (this.detector)
			this.detector.kill();
		this.threshold = Number(threshold);
		this.detector = createDetector(threshold, true);
	},
	setOptions: function (options) {
		if (options) {
			holdingPeriod = options.holdingPeriod;
			customWait = options.customWait;
			defaultDuration = options.defaultDuration;
			this.holdingPeriod = options.holdingPeriod;
			this.customWait = options.customWait;
			this.defaultDuration = options.defaultDuration;
		}
	},
	forceSilence: function () {
		module.exports.emit('silencePeriod', { silences: silencePeriods, speaking: speakingPeriods });
		globalClearIntervals();
		silencePeriods = [];
		speakingPeriods = [];
	}
};

