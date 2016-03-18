#! /usr/bin/python

import pyaudio
import audioop
import sys
import time

CHUNK = 512
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
RECORD_SECONDS = 0.5
threshold = 350
SILENCE = False
time_threshold = 2.5
last_silence = 0
threshold_alerted = False
p = pyaudio.PyAudio()
for i in xrange(0, p.get_device_count()):
    if p.get_device_info_by_index(i)['maxInputChannels'] > 0:
        index = i
        break

stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=1024,
                input_device_index=index)
while True:
    sys.stdout.flush()
    stream.start_stream()
    if last_silence and time.time() - last_silence > time_threshold and not threshold_alerted:
        sys.stdout.write("Threshold detected!\n")
        threshold_alerted = True
        continue
    try:
        volume = []
        for i in xrange(0, int(RATE / CHUNK * RECORD_SECONDS)):
            data = stream.read(CHUNK)
            volume.append(audioop.rms(data, 2))
        average = sum(volume) / len(volume)
        if average < threshold and not SILENCE:
            SILENCE = True
            last_silence = time.time()
            sys.stdout.write('New Silence!\n')
        elif average >= threshold and SILENCE:
            SILENCE = False
            threshold_alerted = False
            sys.stdout.write('Silence time: {}\n'.format(time.time() - last_silence))
            last_silence = 0
    except IOError as e:
        print e.message
