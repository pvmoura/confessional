var watson = require('watson-developer-cloud');
var fs = require('fs');
var tone_analyzer = watson.tone_analyzer({
  password: 'wPk4cIsEd3JV',
  username: '5f1cfb19-70be-4a78-ac9e-bc1e3f616687',
  version: 'v3-beta',
  version_date: '2016-02-11'
});

tone_analyzer.tone({ text: 'Can you tell me about your first love?' },
 function(err, tone) {
    if (err)
      console.log(err);
    else {
    		var file = fs.createWriteStream("tones.txt");
    		var tones = JSON.stringify(tone, null, 2);
    		file.write(tones);
      		console.log(tones);
      		// state.tones.push(tone)
  		}
});