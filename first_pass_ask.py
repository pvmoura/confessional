#! /usr/local/bin/python

import pyaudio
import wave
import sys
import random
import os
DIR = "/Users/tpf2/Desktop/pop-up-confessional/script/files/audio files"
files = os.listdir(DIR)
filename = "/Users/tpf2/Desktop/pop-up-confessional/script/files/audio files/" + files[random.randint(0, len(files) - 1)]

f = wave.open(filename,"rb") 

#open pyaudio instance
pa = pyaudio.PyAudio()

stream = pa.open(format = pa.get_format_from_width(f.getsampwidth()),  
				channels = f.getnchannels(),  
				rate = f.getframerate(),  
				output = True)

#read data  
data = f.readframes(1024)

#play stream  
while data != '':  
	stream.write(data)  
	data = f.readframes(1024)

#stop stream  
stream.stop_stream()  
stream.close()  

#close pyaudio instance
pa.terminate()

