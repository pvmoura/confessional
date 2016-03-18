#! /usr/local/bin/python

import nltk
from nltk.corpus import wordnet as wn
import sys

tags = ['belief', 'childhood', 'hurt', 'love', 'secret', 'sex', 'worry', 'wrong']

tag_synsets = map(lambda word: wn.synsets(word), tags)

while True:
	sys.stdout.flush()
	test_word = raw_input().strip()
	test_word, index = test_word.split(' ')
	index = 0
	synsets = wn.synsets(test_word)
	results = {}
	# try:
	for i, tag in enumerate(tags):
		results[tag] = []
		for s in synsets:
			temp = []
			for syn in tag_synsets[i]:
				temp.append(s.path_similarity(syn))
			temp = max(temp)
			results[tag].append(temp)
		results[tag] = max(results[tag]) if results[tag] else None
	results = sorted(results.items(), key=lambda t: t[1], reverse=True)
	results = filter(lambda t: t[1] == results[0][1] and results[0][1] is not None, results)
	value = ""
	if results:
		result = '+'.join(map(lambda t: t[0], results))
		value = str(results[0][1])
	else:
		result = ""

	sys.stdout.write(str(result) + ' ' + value + ' ' + str(index) + '\n')
	# except:
	# sys.stdout.write(str(0) + '\n')
