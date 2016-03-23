import unittest
from threshold_detector import ThresholdDetector
import time

class SimpleTestCase(unittest.TestCase):
	def setUp(self, ):
		options = { 'volume_threshold': 100000 }
		self.sd = ThresholdDetector(**options)

class SetVolumeTestCase(SimpleTestCase):
	def runTest(self, ):
		self.sd.set_volume_threshold()
		threshold = self.sd.volume_threshold
		self.assertTrue(isinstance(threshold, float))
		self.assertTrue(threshold != 10000)

class GetVolumeTestCase(SimpleTestCase):
	def runTest(self, ):
		average = self.sd.get_volume()
		self.assertTrue(isinstance(average, int))
		self.assertTrue(average > -1)

class DetectVolumeThresholdTestCase(SimpleTestCase):
	def runTest(self, ):
		average = self.sd.get_volume()
		self.assertTrue(self.sd.detect_volume_threshold(average))

class DetectTimeThresholdTestCase(SimpleTestCase):
	def setUp(self, ):
		options = {
			'volume_threshold': 10000,
			'time_threshold': 0.5
		}
		self.sd = ThresholdDetector(**options)
		self.sd.threshold_timestamp = 1

	def runTest(self,):
		self.assertTrue(self.sd.detect_time_threshold())

class VolumeThresholdTestCase(SimpleTestCase):
	def runTest(self, ):
		self.sd.volume_threshold_detection(end_time=time.time() + 10)

class TimedVolumeThresholdTestCase(SimpleTestCase):
	def runTest(self, ):
		start = time.time()
		self.sd.volume_threshold = 100
		self.sd.time_threshold = 0.5
		self.sd.timed_volume_threshold_detection(end_time=time.time() + 10)

if __name__ == "__main__":
	unittest.main()