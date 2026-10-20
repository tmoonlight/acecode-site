from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
app = DIST / "_app/index.html"
if not app.exists():
    raise SystemExit("Build frontend before assembling the static site")
shutil.copytree(ROOT / "public", DIST, dirs_exist_ok=True)
template = app.read_text(encoding="utf-8")
for route, title in [
    ("key-usage/pricing", "模型价格 · ACECode"),
    ("key-usage/guide", "ACEModel 大模型接入指南"),
]:
    path = DIST / route / "index.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    html = template.replace("./assets/", "../../_app/assets/")
    html = html.replace("<title>ACECode</title>", f"<title>{title}</title>")
    path.write_text(html, encoding="utf-8", newline="\n")
(DIST / "index.html").write_text("""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=acemodel/"><title>ACECode</title></head><body><a href="acemodel/">进入 ACECode 官网</a></body></html>
""", encoding="utf-8")
(DIST / "404.html").write_text("""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面不存在 · ACECode</title></head><body><h1>页面不存在</h1><a href="https://acecodedownload.b-cdn.net/">返回 ACECode 官网</a></body></html>
""", encoding="utf-8")
(DIST / ".nojekyll").write_text("", encoding="utf-8")
print(json.dumps({
    "files": sum(p.is_file() for p in DIST.rglob("*")),
    "bytes": sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file()),
}))
