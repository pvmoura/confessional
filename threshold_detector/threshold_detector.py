#! /usr/bin/python

import pyaudio
import audioop
import sys
import time

class ThresholdDetector():
    p = pyaudio.PyAudio()

    def __init__(self, chunk=512, audio_format='paInt16', channels=1, volume_threshold=None,
                 time_threshold=3.5, frames=1024, recording_sample=0.25):
        """ initialize the detector
        """
        self.chunk                  = chunk
        self.format                 = getattr(pyaudio, audio_format)
        self.volume_threshold       = volume_threshold
        self.time_threshold         = time_threshold
        self.sample_rate            = 44100
        self.frames                 = frames
        self.recording_sample       = recording_sample
        self.stream                 = None
        self.alerted_threshold      = False
        self.was_at_threshold       = False
        self.threshold_timestamp    = None
        self.set_device_info()
        self.create_stream()
        if volume_threshold is None:
            self.set_volume_threshold()

    def set_volume_threshold(self, test_time=5, multiplier=3):
        """ listens to sound for 5 seconds and then sets volume threshold
            to slightly more than the 3rd highest recorded volume
        """
        sys.stdout.flush()
        sys.stdout.write('3\n')
        sys.stdout.write('2\n')
        sys.stdout.write('1\n')
        sys.stdout.write('Starting threshold detection.\n')
        start_time = time.time()
        volumes = []
        while time.time() - start_time < test_time:
            volume = self.get_volume()
            volumes.append(volume)
            sys.stdout.write('current volume is {}\n'.format(volume))
            sys.stdout.flush()

        volumes.sort()
        threshold = sum(volumes) / len(volumes) * multiplier
        sys.stdout.write('volume threshold set at: {}\n'.format(threshold))
        self.volume_threshold = threshold

    def set_device_info(self, index=None):
        """
            sets the input device
            index - int: set

            p.get_default_input_device returns a dictionary like this:
            { 'defaultSampleRate': 44100.0,
              'defaultLowOutputLatency': 0.01,
              'defaultLowInputLatency': 0.00199546485260771,
              'maxInputChannels': 2L,
              'structVersion': 2L,
              'hostApi': 0L,
              'index': 0L,
              'defaultHighOutputLatency': 0.1,
              'maxOutputChannels': 0L,
              'name': u'Built-in Microph',
              'defaultHighInputLatency': 0.012154195011337868 }
        """
        try:
            if index is None or not isinstance(index, int):
                self.device = self.p.get_default_input_device_info()
            else:
                self.device = self.p.get_device_info_by_index(index)
        except IOError:
            raise "No input device found -- can't proceed"

    def create_stream(self, ):
        """ Create pyaudio stream object
        """
        self.stream = self.p.open(format=self.format,
                                  channels=int(self.device['maxInputChannels']),
                                  rate=int(self.device['defaultSampleRate']),
                                  input=True,
                                  frames_per_buffer=self.frames,
                                  input_device_index=int(self.device['index']))

    def test_and_restart_stream(self, ):
        """ restart the stream if it isn't on
        """
        try:
            self.stream.is_active()
        except:
            self.create_stream()

    def get_volume(self, ):
        """ reads sample data and calculates volume
        """
        self.test_and_restart_stream()
        volumes = []
        iterations = int(self.device['defaultSampleRate'] / self.chunk * self.recording_sample)
        
        for _ in xrange(0, iterations):
            data = self.stream.read(self.chunk)
            volumes.append(audioop.rms(data, 2))
        return sum(volumes) / len(volumes)

    def detect_volume_threshold(self, average):
        """ check if the volume is greater than the threshold
        """
        return average < self.volume_threshold

    def volume_threshold_detection(self, end_time=None):
        """ Prints an alert when above the volume threshold
        """
        if end_time is None:
            end_time = time.time() + 3600
        while end_time > time.time():
            sys.stdout.flush()
            average = self.get_volume()
            is_below_threshold = self.detect_volume_threshold(average)
            if is_below_threshold:
                self.stdout('Threshold detected!')



    def detect_time_threshold(self, ):
        """ detects if above the time threshold
        """
        if self.threshold_timestamp:
            return time.time() - self.threshold_timestamp > self.time_threshold
        return False

    def stdout(self, string):
        """ prints in a way node will detect
        """
        sys.stdout.flush()
        sys.stdout.write(string)

    def timed_volume_threshold_detection(self, end_time=None):
        """ alerts once time and volume thresholds are exceeded
        """
        if end_time is None:
            end_time = time.time() + 3600
        # while end_time > time.time():
        while True:
            average = self.get_volume()
            is_below_threshold = self.detect_volume_threshold(average)
            above_time_threshold = self.detect_time_threshold()
            self.stdout(str(average) + '\n')
            if is_below_threshold and above_time_threshold and not self.alerted_threshold:
                self.stdout('Threshold detected!\n')
                self.alerted_threshold = True
            elif is_below_threshold and not self.was_at_threshold:
                self.stdout('New threshold period\n')
                self.was_at_threshold = True
                self.threshold_timestamp = time.time()
            elif not is_below_threshold and self.was_at_threshold and self.alerted_threshold:
                self.stdout('Threshold time: {}\n'.format(time.time() - self.threshold_timestamp))
                self.alerted_threshold = False
                self.was_at_threshold = False
                self.threshold_timestamp = None
            elif not is_below_threshold:
                self.was_at_threshold = False
                self.threshold_timestamp = None

if __name__ == "__main__":
    sys.stdout.flush()
    argv_len = len(sys.argv)
    if argv_len > 3:
        sys.stdout.write('Usage: ./silence_detector.py [volume_threshold] [time_threshold]')
        sys.exit(1)

    options = {}
    if argv_len > 1:
        try:
            options['volume_threshold'] = float(sys.argv[1])
        except ValueError:
            sys.stdout.write('Please provide a number for the volume threshold')
            sys.exit(1)

    if argv_len > 2:
        try:
            options['time_threshold'] = float(sys.argv[2])
        except ValueError:
            sys.stdout.write('Please provide a number for the time threshold')
            sys.exit(1)
    sd = ThresholdDetector(**options)
    sd.timed_volume_threshold_detection()
