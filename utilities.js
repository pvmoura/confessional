var sortDictByVal = function (dict, sortFun) {
	var result, sortFun = sortFun || compForArrofArrs(1);
	result = items(dict);
	result.sort(sortFun);
	return result;
};

var sum = function (arr) {
	return arr.reduce(function (prev, curr, arr, i) {
		curr = Number(curr);
		return isNaN(curr) ? prev : curr + prev;
	}, 0);
};

var average = function (arr) {
	arr = arr.filter(function (elem) {
		return typeof elem !== 'object' && !isNaN(elem);
	});
	return arr.length > 0 ? sum(arr) / arr.length : null;
};


var compForArrofArrs = function (sortKey) {
	if (typeof sortKey === 'undefined')
		sortKey = 1;
	return function (a, b) {
		if (a[sortKey] > b[sortKey])
			return -1;
		else if (a[sortKey] < b[sortKey])
			return 1;
		else
			return 0;
	};
};

var keys = function (dict) {
	var keys = [];
	for (var key in dict) {
		if (dict.hasOwnProperty(key))
			keys.push(key);
	}
	return keys;
};

var vals = function (dict) {
	var vals = [];
	for (var key in dict) {
		if (dict.hasOwnProperty(key))
			vals.push(dict[key]);
	}
	return vals;
};

var items = function (dict) {
	var items = [];
	for (var key in dict) {
		if (dict.hasOwnProperty(key))
			items.push([key, dict[key]]);
	}
	return items;
}

var count = function (arr) {
	var counts = {};
	arr.forEach(function (elem) {
		if (typeof counts[elem] === 'undefined')
			counts[elem] = 0;
		counts[elem]++;
	});
	return counts;
};

var consolidateArrs = function (orig, newArr) {
	newArr.forEach(function (elem) {
		present = false;
		orig = orig.map(function (origElem) {
			if (origElem[0] === elem[0]) {
				origElem[1] += elem[1];
				present = true;
			}
			return origElem;
		});
		if (!present)
			orig.push(elem);
	});
	return orig;
};

var countInstances = function (arr, instance) {
	return arr.filter(function (elem) {
		return elem === instance;
	}).length;
};

var standardDeviation = function (arr) {
	if (typeof arr === 'undefined' || typeof arr.filter !== 'function')
		throw new Error('Need an array');
	arr = arr.filter(function (elem) {
		var num = Number(elem);
		return typeof elem !== 'object' && !isNaN(num);
	});
	
	if (!arr.length || arr.length === 1)
		throw new Error('Need an array with more than one number');
	var arrAverage = average(arr);

	var sumSquaredVariances = sum(arr.map(function (elem) {
		var diff = elem - arrAverage;
		return Math.pow(diff, 2);
	}));
	
	return Math.sqrt(sumSquaredVariances / (arr.length - 1));

}

module.exports = {
	sortDictByVal: sortDictByVal,
	sum: sum,
	average: average,
	compForArrofArrs: compForArrofArrs,
	keys: keys,
	vals: vals,
	items: items,
	count: count,
	consolidateArrs: consolidateArrs,
	countInstances: countInstances,
	standardDeviation: standardDeviation
}