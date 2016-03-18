#! /usr/bin/python

import pyaudio
import audioop

CHUNK = 512
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
RECORD_SECONDS = 0.5
threshold = 350
SILENCE = False
time_threshold = 4.0
last_silence = 0
p = pyaudio.PyAudio()
for i in xrange(0, p.get_device_count()):
    if p.get_device_info_by_index(i)['maxInputChannels'] > 0:
        index = i
        break
# for CHUNK1 in [512,2048,4096,8192,16384]:
#     for CHUNK2 in [512,2048,4096,8192,16384]:
#         stream = p.open(format=FORMAT,
#                         channels=CHANNELS,
#                         rate=RATE,
#                         input=True,
#                         frames_per_buffer=CHUNK1,
#                         input_device_index=0)


#         try:
#             print CHUNK1,CHUNK2
#             for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
#                 data = stream.read(CHUNK2)
#                 if audioop.rms(data, 2) < threshold:
#                     print "SILENCE"
#         except:
#             print "Boohoo"

#         stream.stop_stream()
#         stream.close() 

import sys
import time

stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=1024,
                input_device_index=index)
while True:
    sys.stdout.flush()
    stream.start_stream()
    if last_silence and time.time() - last_silence > time_threshold:
        sys.stdout.write("Threshold detected!")
    try:
        count = 0
        volume = []
        for i in xrange(0, int(RATE / CHUNK * RECORD_SECONDS)):
            data = stream.read(CHUNK)
            volume.append(audioop.rms(data, 2))
            count += 1
            # print volume, count, len(volume)
        average = sum(volume) / len(volume)
        print average
        if average < threshold and not SILENCE:
            SILENCE = True
            # print "New Silence!"
            last_silence = time.time()
            sys.stdout.write('New Silence!\n')
        elif average >= threshold and SILENCE:
            SILENCE = False
            # print "Silence stopped!"
            sys.stdout.write('Silence time: {}\n'.format(time.time() - last_silence))
        # break
    except IOError as e:
        print e.message
