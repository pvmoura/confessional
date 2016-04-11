#! /usr/bin/python

import nltk
import csv
import os
import sys

def category_features(words, training=False):
	cat_words = set(words)
	features = {}
	if not training:
		bigrams = nltk.collocations.BigramCollocationFinder.from_words(words.split(" "))
		for bigram in bigrams.ngram_fd:
			features['has({})'.format(" ".join(bigram))] = True
		words = words.split(" ")
	for word in words:
		key = 'has({})'.format(word)
		#features[key] = features.get(key, 0) + 1
		features[key] = True
	return features

def load_associations():
	associations = {}
	words = []
	for root, dirList, fileList in os.walk('./files'):
		for f in fileList:
			if 'txt' not in f:
				continue
			concept = f.split(".txt")[0]
			with open(root + "/" + f, "rU") as cf:
				for word in cf.readlines():
					if not associations.get(concept):
						associations[concept] = []
					associations[concept].append(word.strip())
	return associations

def make_test(string):
	return category_features(string)

if __name__ == "__main__":
	associations = load_associations()
	featureset = [ (category_features([ key ] + val, True), key) for key, val in associations.items() ]
	c = nltk.NaiveBayesClassifier.train(featureset)
	sys.stdout.flush()
	sys.stdout.write('ready\n')
	while True:
		sys.stdout.flush()
		word = raw_input().strip()
		cat = c.classify(category_features(word))
		sys.stdout.write(cat + '\n')