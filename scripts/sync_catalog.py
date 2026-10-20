"""Export public release metadata. GitHub credentials stay inside the gh CLI."""
from pathlib import Path
import argparse
import json
import re
import subprocess
import urllib.request
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
CDN = "https://acecodedownload.b-cdn.net"
REPO = "tmoonlight/acecode"


def classify(name):
    lower = name.lower()
    arch = next((a for a in ["arm64", "armv7", "x64", "x86"] if a in lower), "any")
    if "bridge" in lower or "extension" in lower:
        return "extension", "any", "extension"
    platform = next((p for p in ["windows", "macos", "linux"] if p in lower), "other")
    if lower.endswith(".pkg"):
        kind = "pkg"
    elif lower.endswith(".dmg"):
        kind = "dmg"
    elif lower.endswith(".exe") or lower.endswith(".msi"):
        kind = "setup"
    elif "-update.zip" in lower:
        kind = "appzip" if platform == "macos" else "update"
    elif lower.endswith(".tar.gz"):
        kind = "mactar" if platform == "macos" else "oldtar" if "old" in lower or "deepin" in lower else "tar"
    else:
        kind = "portable" if "portable" in lower else "zip"
    return platform, arch, kind


def validate_release(releases, tag):
    release = next((r for r in releases if r["tag"] == tag), None)
    if release is None:
        raise RuntimeError(f"Release {tag} is not published with installation assets")
    version = release["version"]
    required = {"acecode-windows-x64.zip", "acecode-windows-arm64.zip"}
    for arch in ["x64", "arm64"]:
        required.update({
            f"ACECode-{version}-macos-{arch}-update.zip",
            f"ACECode-{version}-macos-{arch}.pkg",
            f"acecode-{version}-linux-{arch}-update.zip",
        })
    missing = required - {p["file"] for p in release["packages"]}
    if missing or not release.get("sums"):
        raise RuntimeError(f"Release {tag} is incomplete: missing {sorted(missing)} or SHA256SUMS.txt")
    if any(not re.fullmatch(r"[0-9a-f]{64}", p.get("sha256") or "") for p in release["packages"]):
        raise RuntimeError(f"Release {tag} has installation assets without valid SHA-256")
    return release


def main(require_tag=None, releases_only=False):
    result = subprocess.run(
        ["gh", "api", "--paginate", "--slurp", f"repos/{REPO}/releases?per_page=100"],
        check=True, capture_output=True, encoding="utf-8",
    )
    source = [release for page in json.loads(result.stdout) for release in page]
    notes_path = ROOT / "public/data/release-notes.json"
    notes = json.loads(notes_path.read_text(encoding="utf-8")) if notes_path.exists() else {}
    releases = []
    for release in source:
        tag = release["tag_name"]
        version = tag.removeprefix("v")
        if release.get("draft") or not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][\w.-]+)?", version):
            continue
        packages, sums = [], None
        for asset in release.get("assets", []):
            name = asset["name"]
            url = f"{CDN}/{quote(tag, safe='')}/{quote(name, safe='')}"
            if name == "SHA256SUMS.txt":
                sums = {"name": name, "url": url}
                continue
            if name.startswith("dev_only.") or not re.search(r"\.(?:zip|tar\.gz|dmg|pkg|exe|msi)$", name, re.I):
                continue
            platform, arch, kind = classify(name)
            digest = asset.get("digest") or ""
            packages.append({
                "file": name, "url": url, "size": asset["size"],
                "sha256": digest.removeprefix("sha256:") if digest.startswith("sha256:") else None,
                "platform": platform, "arch": arch, "kind": kind,
            })
        # Older assets may predate GitHub's digest field. Read the release's
        # public checksum attachment only for those releases.
        if sums and any(not item["sha256"] for item in packages):
            checksum_asset = next(a for a in release["assets"] if a["name"] == "SHA256SUMS.txt")
            request = urllib.request.Request(checksum_asset["browser_download_url"],
                                             headers={"User-Agent": "ACECode-public-site"})
            with urllib.request.urlopen(request, timeout=45) as response:
                values = {}
                for line in response.read().decode("utf-8-sig").splitlines():
                    match = re.match(r"^([0-9a-fA-F]{64})\s+\*?(.+)$", line)
                    if match:
                        values[match[2]] = match[1].lower()
            for item in packages:
                item["sha256"] = item["sha256"] or values.get(item["file"])
        if not packages:
            continue
        releases.append({
            "version": version, "tag": tag, "published_at": release["published_at"],
            "prerelease": release["prerelease"],
            "notes": notes.get(version) or release.get("body") or "",
            "packages": packages, "sums": sums,
        })
    if not releases:
        raise RuntimeError("GitHub returned no published installation assets")
    requested = validate_release(releases, require_tag) if require_tag else None
    latest = next(item["version"] for item in releases if not item["prerelease"])
    target = ROOT / "public/aceupdate.json"
    target.write_text(json.dumps({
        "schema_version": 1, "latest": latest, "releases": releases,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if requested:
        (ROOT / "public/data/release-source.json").write_text(json.dumps({
            "tag": requested["tag"],
            "release_url": f"https://github.com/{REPO}/releases/tag/{quote(require_tag, safe='')}",
            "published_at": requested["published_at"],
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = {
        "latest": latest, "releases": len(releases),
        "packages": sum(len(item["packages"]) for item in releases),
        "missing_digests": sum(not asset["sha256"] for item in releases for asset in item["packages"]),
    }
    if releases_only:
        print(json.dumps(summary))
        return

    request = urllib.request.Request("https://acecode.cc/api/key-usage/pricing",
                                     headers={"User-Agent": "ACECode-public-site"})
    with urllib.request.urlopen(request, timeout=30) as response:
        pricing = json.load(response)
    if not isinstance(pricing.get("models"), list) or not pricing["models"]:
        raise RuntimeError("The public pricing endpoint returned no models")
    (ROOT / "public/data/pricing.json").write_text(
        json.dumps(pricing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    print(json.dumps({**summary, "pricing_models": len(pricing["models"])}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-tag", help="Reject missing or incomplete published releases")
    parser.add_argument("--releases-only", action="store_true", help="Leave the pricing snapshot unchanged")
    args = parser.parse_args()
    main(args.require_tag, args.releases_only)
