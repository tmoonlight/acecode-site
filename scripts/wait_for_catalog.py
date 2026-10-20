"""Wait for the actual public CDN catalog, including its normal cache lifetime."""
from pathlib import Path
import argparse
import hashlib
import json
import time
import urllib.error
import urllib.request

URL = "https://acecodedownload.b-cdn.net/aceupdate.json"


def wait_for_catalog(expected_path, timeout=900):
    expected = hashlib.sha256(Path(expected_path).read_bytes()).hexdigest()
    deadline = time.monotonic() + timeout
    previous = None
    while True:
        try:
            request = urllib.request.Request(URL, headers={"User-Agent": "ACECode-release-catalog"})
            with urllib.request.urlopen(request, timeout=20) as response:
                body = response.read()
            actual = hashlib.sha256(body).hexdigest()
            if actual == expected:
                value = json.loads(body)
                print(json.dumps({"verified_url": URL, "sha256": actual, "latest": value["latest"]}), flush=True)
                return
            state = f"Waiting for Pages/CDN: catalog SHA-256 {actual}"
        except (OSError, urllib.error.URLError) as error:
            state = f"Waiting for Pages/CDN: {type(error).__name__}"
        if state != previous:
            print(state, flush=True)
            previous = state
        if time.monotonic() >= deadline:
            raise RuntimeError(f"CDN catalog did not reach expected SHA-256 {expected} in {timeout} seconds")
        time.sleep(min(15, max(0, deadline - time.monotonic())))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("expected")
    parser.add_argument("--timeout", type=int, default=900)
    args = parser.parse_args()
    wait_for_catalog(args.expected, args.timeout)
