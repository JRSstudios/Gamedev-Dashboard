"""Runs without Blender: python -m unittest discover plugins/blender/tests"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "gamedev_dashboard"))

import checks  # noqa: E402


class ChecksTest(unittest.TestCase):
    def test_clean_cube(self):
        triangles, issues = checks.check_object("Cube", (1, 1, 1), (0, 0, 0), True, [4] * 6)
        self.assertEqual(triangles, 12)
        self.assertEqual(issues, [])

    def test_unapplied_transforms_and_missing_uv(self):
        _, issues = checks.check_object("Rock", (2, 2, 2), (0.5, 0, 0), False, [3, 3])
        self.assertEqual([i["code"] for i in issues], ["scale", "rotation", "no_uv"])

    def test_negative_scale_wins_over_scale(self):
        _, issues = checks.check_object("Mirror", (-1, 1, 1), (0, 0, 0), True, [4])
        self.assertEqual([i["code"] for i in issues], ["negative_scale"])

    def test_ngons_and_high_poly(self):
        _, issues = checks.check_object("Big", (1, 1, 1), (0, 0, 0), True, [6] * 30000)
        codes = {i["code"]: i for i in issues}
        self.assertEqual(codes["ngons"]["count"], 30000)
        self.assertEqual(codes["high_poly"]["count"], 120000)
        self.assertIn("120000", checks.describe(codes["high_poly"]))


if __name__ == "__main__":
    unittest.main()
