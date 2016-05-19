module.exports.sortDictByVal = function (dict, sortFun) {
	sortFun = sortFun || module.exports.compForArrofArrs(1);
	var result = module.exports.items(dict);
	result.sort(sortFun);
	return result;
};

module.exports.sum = function (arr) {
	return arr.reduce(function (prev, curr, arr, i) {
		curr = Number(curr);
		return isNaN(curr) ? prev : curr + prev;
	}, 0);
};

module.exports.average = function (arr) {
	arr = arr.filter(function (elem) {
		return !isNaN(elem);
	});
	return arr.length > 0 ? module.exports.sum(arr) / arr.length : null;
};


module.exports.compForArrofArrs = function (sortKey) {
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

module.exports.keys = function (dict) {
	var keys = [];
	for (var key in dict) {
		if (dict.hasOwnProperty(key))
			keys.push(key);
	}
	return keys;
};

module.exports.vals = function (dict) {
	var vals = [];
	for (var key in dict) {
		if (dict.hasOwnProperty(key))
			vals.push(dict[key]);
	}
	return vals;
};

module.exports.items = function (dict) {
	var items = [];
	for (var key in dict) {
		if (dict.hasOwnProperty(key))
			items.push([key, dict[key]]);
	}
	return items;
}

module.exports.count = function (arr) {
	var counts = {};
	arr.forEach(function (elem) {
		if (typeof counts[elem] === 'undefined')
			counts[elem] = 0;
		counts[elem]++;
	});
	return counts;
};

module.exports.consolidateArrs = function (orig, newArr) {
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

module.exports.countInstances = function (arr, instance) {
	return arr.filter(function (elem) {
		return elem === instance;
	}).length;
};