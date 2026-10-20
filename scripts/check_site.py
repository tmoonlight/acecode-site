"""Check deployment paths and asset references without contacting private APIs."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
CDN_HOST = "acecodedownload.b-cdn.net"
errors = []
checked = 0


def target_exists(path):
    return path.is_file() or (path.is_dir() and (path / "index.html").is_file())


class References(HTMLParser):
    def __init__(self, page):
        super().__init__()
        self.page = page

    def handle_starttag(self, tag, attrs):
        global checked
        attrs = dict(attrs)
        for key in ["href", "src", "poster"]:
            value = attrs.get(key)
            if not value or value.startswith(("#", "data:", "mailto:", "tel:", "javascript:")):
                continue
            url = urlparse(value)
            if url.netloc and url.netloc != CDN_HOST:
                if url.netloc == "2017studio.imwork.net:82" and "/aupdate/download" in url.path:
                    errors.append(f"{self.page}: local download page still linked")
                continue
            path = unquote(url.path)
            if path.startswith("/v") and re.match(r"/v\d", path):
                continue
            resolved = DIST / path.lstrip("/") if path.startswith("/") else self.page.parent / path
            if not path:
                continue
            if tag == "a" and not path.endswith((".html", "/")):
                continue
            checked += 1
            if not target_exists(resolved):
                errors.append(f"{self.page.relative_to(DIST)}: missing {value}")


pages = list(DIST.rglob("*.html"))
for page in pages:
    References(page).feed(page.read_text(encoding="utf-8"))
for path in DIST.rglob("*"):
    if path.is_file() and path.stat().st_size >= 100 * 1024 * 1024:
        errors.append(f"File exceeds GitHub regular file limit: {path}")
    if path.name.startswith(".env") or path.suffix in {".sqlite", ".pem", ".key"}:
        errors.append(f"Unexpected private/configuration file: {path}")
manifest = json.loads((DIST / "aceupdate.json").read_text(encoding="utf-8"))
for release in manifest["releases"]:
    for asset in release["packages"]:
        url = urlparse(asset["url"])
        if url.netloc != CDN_HOST or url.scheme != "https" or not url.path.startswith("/v"):
            errors.append(f"Invalid package route: {asset['file']}")
if errors:
    print("\n".join(errors[:60]))
    raise SystemExit(f"{len(errors)} site verification errors")
print(json.dumps({"html_pages": len(pages), "references_checked": checked,
                  "releases": len(manifest["releases"]), "errors": 0}))
