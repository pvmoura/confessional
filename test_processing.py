import nltk
from nltk.corpus import wordnet as wn

tags = ['belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong']

tag_synsets = map(lambda word: wn.synsets(word), tags)

while True:
	test_word = raw_input().strip()
	synsets = wn.synsets(test_word)
	print synsets
	results = {}
	for i, tag in enumerate(tags):
		results[tag] = []
		print tag
		# results[tag].append(synsets[0].path_similarity(tag_synsets[i][0]))
		for s in synsets:
			temp = []
			for syn in tag_synsets[i]:
				temp.append(s.path_similarity(syn))
				print temp
			temp = max(temp)
			results[tag].append(temp)
			
		# sim_synsets = map(lambda t: max([ t.path_similarity(syn) for syn in tag_synsets[i] ]), synsets)
		# results[tag].append(sim_synsets)
		results[tag] = max(results[tag])
	print results