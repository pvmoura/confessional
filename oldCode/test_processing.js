var spawn = require('child_process').spawn;
var nltk = spawn('./first_pass_nltk.py', { stdio: ['pipe', 'pipe', 'pipe'] });
// var nltk = spawn('./first_pass_nltk.py', { stdio: ['pipe', 1, 2] });
var curr = 0;
var queue = ['hey', 'mother', 'father', 'the'];
nltk.stdin.write(queue.shift() + '\n');

// test_words.map(function (elem, i) {
// 	console.log(elem);
// 	nltk.stdin.write(elem);
// });
// nltk.stdout.on('data', function (data) {
// 	console.log('there\'s data!');
// 	console.log(data.toString());
// 	curr++;
// 	if (curr < test_words.length)
// 		nltk.stdin.write(test_words[curr] + '\n');
// 	else
// 		nltk.kill();
// });


nltk.stdout.on('data', function (data) {
  var splitData = data.toString().split(' ');
  console.log(splitData, 'a response');
  if (queue.length != 0) {
    processing.stdin.write(queue.shift());
  } else {
    // informationState.readyForNextQuestion = true;
    // askNewQuestion();
    console.log("HELLO");
  }
  if (splitData.length === 3)
	console.log("LEHHHE");

// informationState.currentProcessedData.push(splitData.splice(0, 2));
});
nltk.on('close', function (code) {
	console.log("done", code);
});
