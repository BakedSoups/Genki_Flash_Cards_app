#!/usr/bin/env python3
"""Small, dependency-free Japanese flashcard web app."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import json
import re
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
LESSON_PATTERN = re.compile(r"lesson(\d+)(?:-(\d+))?\.csv", re.IGNORECASE)
HISTORY_FILE = ROOT / "history.json"
HISTORY_LOCK = threading.Lock()


def available_lessons() -> list[dict[str, object]]:
    """Return lesson CSV files in numerical order."""
    lessons: list[tuple[tuple[int, int], dict[str, object]]] = []
    for path in ROOT.iterdir():
        match = LESSON_PATTERN.fullmatch(path.name)
        if match and path.is_file():
            major = int(match.group(1))
            minor = int(match.group(2)) if match.group(2) is not None else None
            number = f"{major}-{minor}" if minor is not None else str(major)
            lessons.append(
                (
                    (major, minor if minor is not None else -1),
                    {"number": number, "name": f"Lesson {number}", "file": path.name},
                )
            )
    return [lesson for _, lesson in sorted(lessons, key=lambda item: item[0])]


def load_cards(filename: str) -> list[dict[str, str]]:
    """Load a validated lesson filename as romaji/meaning card pairs."""
    if not LESSON_PATTERN.fullmatch(filename):
        raise ValueError("Invalid lesson filename")

    path = ROOT / filename
    if not path.is_file():
        raise FileNotFoundError(filename)

    cards = []
    with path.open(encoding="utf-8-sig", newline="") as csv_file:
        for row_number, row in enumerate(csv.reader(csv_file), start=1):
            if not row or all(not cell.strip() for cell in row):
                continue
            if len(row) < 2:
                raise ValueError(f"{filename}, row {row_number}: expected two columns")
            romaji, meaning = row[0].strip(), row[1].strip()
            kana = row[2].strip() if len(row) >= 3 else ""
            if romaji and meaning:
                card = {"romaji": romaji, "meaning": meaning, "kana": kana}
                if len(row) >= 4 and row[3].strip().lower() == "kanji":
                    card["kind"] = "kanji"
                cards.append(card)
    return cards


def load_history() -> list[dict[str, object]]:
    if not HISTORY_FILE.exists():
        return []
    try:
        value = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        return value if isinstance(value, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_history_entry(value: object) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ValueError("History entry must be an object")
    lesson = value.get("lesson")
    if not isinstance(lesson, str) or not LESSON_PATTERN.fullmatch(lesson):
        raise ValueError("Invalid lesson")

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lesson": lesson,
        "mode": str(value.get("mode", ""))[:30],
        "direction": str(value.get("direction", ""))[:30],
        "word_set": str(value.get("word_set", "all"))[:30],
        "loops": max(1, min(20, int(value.get("loops", 1)))),
        "correct": max(0, int(value.get("correct", 0))),
        "attempts": max(0, int(value.get("attempts", 0))),
        "words": value.get("words", []),
    }
    if not isinstance(entry["words"], list):
        raise ValueError("Words must be a list")

    with HISTORY_LOCK:
        history = load_history()
        history.append(entry)
        HISTORY_FILE.write_text(
            json.dumps(history[-1000:], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return entry


class FlashcardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: object, **kwargs: object) -> None:
        # Serve the project files even when app.py is started from another folder.
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        path = unquote(urlparse(self.path).path)
        try:
            if path == "/api/lessons":
                self.send_json(available_lessons())
                return
            if path == "/api/history":
                self.send_json(load_history())
                return
            if path.startswith("/api/lessons/"):
                filename = path.removeprefix("/api/lessons/")
                self.send_json(load_cards(filename))
                return
        except FileNotFoundError:
            self.send_json({"error": "Lesson not found"}, status=404)
            return
        except ValueError as error:
            self.send_json({"error": str(error)}, status=400)
            return

        if path == "/":
            self.path = "/static/index.html"
        super().do_GET()

    def do_POST(self) -> None:
        path = unquote(urlparse(self.path).path)
        if path != "/api/history":
            self.send_json({"error": "Not found"}, status=404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 250_000:
                raise ValueError("Invalid request size")
            value = json.loads(self.rfile.read(length))
            self.send_json(save_history_entry(value), status=201)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, status=400)

    def send_json(self, value: object, status: int = 200) -> None:
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the flashcard website")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), FlashcardHandler)
    print(f"Flashcards available at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
