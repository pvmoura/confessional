var q = require('./question_utilities.js');
var utils = q.questionUtils(['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst', 'belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong'], ['intro', 'warmup', 'gettingwarmer', 'aboutyou', 'staller', 'followup', 'escapehatch', 'booth1', 'booth2', 'booth3', 'notfirst', 'segue', 'verbalnod', 'encouragement']);
var state = { questionsInCat: 1, questionsAsked: [] };
function getNewQuestion (category, memory) {
	var filtered = utils.filterByCategory(category);
	// console.log(filtered);
	if (memory && category === 'childhood' || category === 'love') {
		filtered = utils.filterBysegue(filtered);
	} else {
		if (state.questionsInCat === 0) {
			filtered = utils.filterOutnotfirst(filtered);
		} else if (state.questionsInCat >= 2) {
			filtered = utils.filterByescapehatch(filtered);
		}
		if (state.questionsInCat < 2) {
			filtered = utils.filterOutescapehatch(filtered);
		}
		// console.log(filtered);
		filtered = utils.filterOutfollowup(filtered);
		// console.log(filtered);
		filtered = utils.filterOutAsked(state.questionsAsked, filtered);
	}
	return utils.pickQuestionFromArray(filtered);
}

q.on('ready', function () {
	console.log(getNewQuestion("secret"));
});