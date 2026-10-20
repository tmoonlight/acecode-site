import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import sync_catalog
import wait_for_catalog


def release(version="1.2.3"):
    names = ["acecode-windows-x64.zip", "acecode-windows-arm64.zip"]
    for arch in ["x64", "arm64"]:
        names += [f"ACECode-{version}-macos-{arch}-update.zip",
                  f"ACECode-{version}-macos-{arch}.pkg",
                  f"acecode-{version}-linux-{arch}-update.zip"]
    return {"tag": "v" + version, "version": version,
            "packages": [{"file": n, "sha256": "a" * 64} for n in names],
            "sums": {"name": "SHA256SUMS.txt"}}


class CatalogTest(unittest.TestCase):
    def test_complete_release_and_old_release_retry(self):
        old, new = release(), release("1.2.4")
        values = [new, old]
        before = copy.deepcopy(values)
        self.assertIs(sync_catalog.validate_release(values, "v1.2.3"), old)
        self.assertEqual(values, before)

    def test_missing_release(self):
        with self.assertRaisesRegex(RuntimeError, "not published"):
            sync_catalog.validate_release([], "v1.2.3")

    def test_missing_package_or_sums(self):
        for field in ["packages", "sums"]:
            value = release()
            if field == "packages":
                value[field].pop()
            else:
                value[field] = None
            with self.subTest(field=field), self.assertRaisesRegex(RuntimeError, "incomplete"):
                sync_catalog.validate_release([value], "v1.2.3")

    def test_missing_or_invalid_hash(self):
        for digest in [None, "", "a" * 63, "z" * 64]:
            value = release()
            value["packages"][0]["sha256"] = digest
            with self.subTest(digest=digest), self.assertRaisesRegex(RuntimeError, "SHA-256"):
                sync_catalog.validate_release([value], "v1.2.3")

    def test_cdn_waits_for_actual_bytes_and_fails_when_stale(self):
        body = json.dumps({"latest": "1.2.3"}).encode()
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "catalog.json"
            path.write_bytes(body)
            with patch("wait_for_catalog.urllib.request.urlopen") as fetch:
                fetch.return_value.__enter__.return_value.read.return_value = b"stale"
                with self.assertRaisesRegex(RuntimeError, "did not reach"):
                    wait_for_catalog.wait_for_catalog(path, timeout=0)
                fetch.return_value.__enter__.return_value.read.return_value = body
                wait_for_catalog.wait_for_catalog(path, timeout=0)


if __name__ == "__main__":
    unittest.main()
