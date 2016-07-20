var assert = require('assert');
var utils = require('../utilities.js');

describe("utilities", function () {
	describe("#sortDictByVal", function () {
		it("should sort a key-value object by values, using the default sort function defined in utilities", function () {
			var obj = { a: 1, b: 2, c: 3 };
			var sortedArr = utils.sortDictByVal(obj);
			assert.deepEqual(sortedArr[0], ["c", 3]);
		});
		it("should return an empty list given empty input", function () {
			var obj = {};
			var sortedArr = utils.sortDictByVal(obj);
			assert.deepEqual(sortedArr, []);
		});
		it("should accept a custom sort function", function () {
			var obj = { a: 1, b: 2, cc: 3 };
			var sortedArr = utils.sortDictByVal(obj, function (a, b) {
				if (a[0] > b[0])
					return 1;
				else if (a[0] < b[0])
					return -1;
				else
					return 0;
			});
			assert.deepEqual(sortedArr[0], ["a", 1]);
		});
	});
	describe("#sum", function () {
		it("should sum an array of numbers", function () {
			var a = [1,2,3];
			assert.equal(utils.sum(a), 6);
		});
		it("should sum the numbers in a multi-typed array", function () {
			a = [1, 'a', 2, 'x', '3'];
			assert.equal(utils.sum(a), 6);
		});
		it("should return 0 given a numberless array", function () {
			a = ['a', 'b', 'c'];
			assert.equal(utils.sum(a), 0);
		});
		it("should return 0 given an empty array", function () {
			a = [];
			assert.equal(utils.sum(a), 0);
		});
	});
	describe("#average", function () {
		it("should average an array of numbers", function () {
			var a = [1,2,3];
			assert.equal(utils.average(a), 2);
		});
		it("should average the numbers in a multi-typed array", function () {
			a = [1, 'a', 2, 'x', '3'];
			assert.equal(utils.average(a), 2);
		});
		it("should return null given a numberless array", function () {
			a = ['a', 'b', 'c'];
			assert.equal(utils.average(a), null);
		});
		it("should return null given an empty array", function () {
			a = [];
			assert.equal(utils.average(a), null);
		});
	});
	describe("#compForArrofArrs", function () {
		it("should sort an array of arrays in ascending order by the default sort key", function () {
			a = [[1,2], [-2,-3], [5,100], [3,-10]];
			a.sort(utils.compForArrofArrs());
			assert.deepEqual(a[0], [5,100]);
			assert.deepEqual(a[1], [1,2]);
		});
		it("should sort an array of arrays in ascending order by a custom sort key", function () {
			a = [[1,2], [-2,-3], [5,100], [3,-10]];
			a.sort(utils.compForArrofArrs(0));
			assert.deepEqual(a[0], [5,100]);
			assert.deepEqual(a[1], [3,-10]);
		});
	});
	describe("#keys", function () {
		it("should return an array of a key-value object's keys", function () {
			var obj = { a: 1, b: 2, c: 3 };
			assert.deepEqual(utils.keys(obj), ["a", "b", "c"]);
		});
		it("should return an empty array given an empty object", function () {
			var obj = {};
			assert.deepEqual(utils.keys(obj), []);
		});
	});
	describe("#vals", function () {
		it("should return an array of a key-value object's values", function () {
			var obj = { a: 1, b: 2, c: 3 };
			assert.deepEqual(utils.vals(obj), [1, 2, 3]);
		});
		it("should return an empty array given an empty object", function () {
			var obj = {};
			assert.deepEqual(utils.vals(obj), []);
		});
	});
	describe("#items", function () {
		it("should return an array of key-value pairs for a key-value object", function () {
			var obj = { a: 1, b: 2, c: 3 };
			assert.deepEqual(utils.items(obj), [["a", 1], ["b", 2], ["c", 3]]);
		});
		it("should return an empty array given an empty object", function () {
			var obj = {};
			assert.deepEqual(utils.items(obj), []);
		});
	});
	describe("#count", function () {
		it("should return a key-value object with the counts ", function () {
			var a = ['a', 'a', 'b', 'b', 'c', 'c', 'd'];
			assert.deepEqual(utils.count(a), { a: 2, b: 2, c: 2, d: 1 });
		});
		it("should return an empty object given an empty array", function () {
			var a = [];
			assert.deepEqual(utils.count(a), {});
		});
	});
	describe("#consolidateArrs", function () {
		it("should consolidate the second array into the first", function () {
			var a = [["a", 1], ["b", 2], ["c", 3]];
			var b = [["a", 3], ["b", 0], ["d", 1]];
			var combined = utils.consolidateArrs(a, b);
			assert.deepEqual(combined, [["a", 4], ["b", 2], ["c", 3], ["d", 1]]);
		});
		it("should add new values into an empty array", function () {
			var a = [["a", 1], ["b", 2], ["c", 3]];
			var b = [];
			var combined = utils.consolidateArrs(b, a);
			assert.deepEqual(combined, a);
		});
	});
	describe("#countInstances", function () {
		it("should count the number of occurrences in an array", function () {
			var a = ['a', 'a', 'b', 'b', 'c', 'c', 'd'];
			assert.equal(utils.countInstances(a, 'a'), 2);
			assert.equal(utils.countInstances(a, 'd'), 1);
		});
		it("should return zero if no occurrences are present", function () {
			var a = ['a', 'a', 'b', 'b', 'c', 'c', 'd'];
			assert.equal(utils.countInstances(a, 'e'), 0);
		});
	});
	describe("#standardDeviation", function () {
		it("should correctly calculate the standard deviation of an array of numbers", function () {
			var a = [10, 8, 10, 8, 8, 4];
			assert.equal(utils.standardDeviation(a), 2.1908902300206643);
		});
		it("should work with multi-typed arrays", function () {
			var a = [10, 8, 10, 8, 8, 4, 'not', 'a', 'num', [], {}];
			assert.equal(utils.standardDeviation(a), 2.1908902300206643);
		});
		it("should throw an error if given a multi-typed array with no numbers", function () {
			try {
				utils.standardDeviation(['a', 'b', 'c', []]);
			} catch (e) {
				assert.equal(e.message, 'Need an array with more than one number');
			}
		});
		it("should throw an error when given an array with one or fewer elements", function () {
			try {
				utils.standardDeviation([]);
			} catch (e) {
				assert.equal(e.message, 'Need an array with more than one number');
			}
			try {
				utils.standardDeviation([1]);
			} catch (e) {
				assert.equal(e.message, 'Need an array with more than one number');
			}
		});
		it("should throw an error when not given an array", function () {
			try {
				utils.standardDeviation();
			} catch (e) {
				assert.equal(e.message, 'Need an array');
			}
			try {
				utils.standardDeviation({});
			} catch (e) {
				assert.equal(e.message, 'Need an array');
			}
		});
	});
	describe("#median", function () {
		it("should correctly get the median from a list of numbers", function () {
			var a = [10, 8, 10, 8, 8, 4];
			assert.equal(utils.median(a), 8);
			a = [51, 3, 2, 1, 5];
			assert.equal(utils.median(a), 3);
		});
		it("should return null if given an empty list", function () {
			assert.equal(utils.median([]), null);
		});
		it("should filter out non numbers", function () {
			var a = [{}, [], "asdf", 1, 2, 4];
			assert.equal(utils.median(a), 2);
		});
		it("should return null in a nonempty list that contains no numbers", function () {
			var a = ["asdf", [], [1,2,3]];
			assert.equal(utils.median(a), null);
		});
	});
});