"""Export only public app assets and lesson data for static hosting."""

import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app import available_lessons, load_cards


def build():
    output = ROOT / "dist"
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(ROOT / "static", output / "static")
    (output / "data").mkdir()
    lessons = available_lessons()
    (output / "data" / "lessons.json").write_text(json.dumps(lessons, ensure_ascii=False), encoding="utf-8")
    for lesson in lessons:
        (output / "data" / (lesson["file"] + ".json")).write_text(
            json.dumps(load_cards(lesson["file"]), ensure_ascii=False), encoding="utf-8"
        )
    (output / "static" / "config.js").write_text("window.KOTOBA_STATIC = true;\n", encoding="utf-8")
    html = (ROOT / "static" / "index.html").read_text(encoding="utf-8")
    html = html.replace('<script src="/static/sentence-practice.js', '<script src="/static/config.js"></script>\n    <script src="/static/sentence-practice.js')
    for path in [output / "index.html", output / "static" / "index.html"]:
        path.write_text(html, encoding="utf-8")
    print(f"Built {len(lessons)} lessons in {output}")


if __name__ == "__main__":
    build()
