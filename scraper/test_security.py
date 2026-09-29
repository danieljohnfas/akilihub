"""Run with: python3 -m unittest scraper/test_security.py  (no dependencies needed)."""
import unittest

from security import ensure_public_url, _is_public_ip


class EnsurePublicUrl(unittest.TestCase):
    def blocked(self, url):
        with self.assertRaises(ValueError):
            ensure_public_url(url)

    def test_blocks_internal_targets(self):
        for url in [
            "http://127.0.0.1/", "http://localhost/", "http://10.0.0.5/", "http://192.168.1.1/",
            "http://169.254.169.254/latest/meta-data/", "http://100.64.0.1/", "http://[::1]/",
            "http://[::ffff:127.0.0.1]/", "http://0.0.0.0/", "ftp://example.com/", "file:///etc/passwd",
            "http://user:pw@example.com/", "http://foo.internal/",
        ]:
            with self.subTest(url=url):
                self.blocked(url)

    def test_public_ip_classification(self):
        self.assertTrue(_is_public_ip("8.8.8.8"))
        self.assertFalse(_is_public_ip("::ffff:10.0.0.1"))
        self.assertFalse(_is_public_ip("fd00::1"))
        self.assertFalse(_is_public_ip("not-an-ip"))


if __name__ == "__main__":
    unittest.main()
