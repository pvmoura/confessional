var exec = require('child_process').execFile;
var spawn = require('child_process').spawn;
var classifier = spawn('./category_classifier.py',[], {stdio: [0,'pipe',2] });

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
process.stdin.write("sex sex sex sex\n");
