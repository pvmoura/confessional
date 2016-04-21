var exec = require('child_process').execFile;
var spawn = require('child_process').spawn;
console.log(__dirname.replace('/oldCode', '') + '/category_classifier.py');
var classifier = exec(__dirname.replace('/oldCode', '') + '/category_classifier.py',[], {stdio: ['pipe','pipe','pipe'] });

classifier.stdout.on('data', function (data) {
  console.log(data, 'hello');
  if (data === 'ready') {
  console.log("CLASSIFIER READY");
      } else if (data === 'default') {
          console.log("NOT ENOUGH INFO TO CLASSIFY");
            } else {
                console.log("I THINK THE NEXT CATEOGRY SHOULD BE: ", data);
                    state.nextCategory = data;
                      }
                      });

classifier.stderr.on('data', function (err) {
  console.log("CLASSIFIER ERROR", err);
});

classifier.on('error', function (err) {
  console.log('error', err);
});

classifier.stdin.write(" hello\n");
