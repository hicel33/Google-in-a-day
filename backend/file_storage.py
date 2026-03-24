from __future__ import annotations

import csv
import os
from pathlib import Path

from .index import IndexEntry

ENV_STORAGE = "GOOGLE_IN_A_DAY_STORAGE"

CSV_FIELDS = [
    "url",
    "origin_url",
    "depth",
    "title",
    "body_text",
    "crawled_at",
]


def _clean_body_text(s: str) -> str:
    """
    Keep CSV rows single-line and readable by replacing newlines with spaces.
    """
    return " ".join(s.replace("\r\n", "\n").replace("\r", "\n").split())


def get_storage_csv_path() -> Path:
    """Path to the crawl index CSV (default ./data/storage.csv relative to cwd)."""
    raw = os.environ.get(ENV_STORAGE, "data/storage.csv").strip()
    return Path(raw).expanduser().resolve()


def reset_storage(csv_path: Path | None = None) -> Path:
    """
    Truncate storage and write a fresh CSV header.
    Called on server startup and when a new crawl session starts.
    """
    path = csv_path or get_storage_csv_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(CSV_FIELDS)
    return path


def append_index_entry(csv_path: Path, entry: IndexEntry) -> None:
    """Append one indexed page as one CSV row (event-loop thread; sync I/O)."""
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                entry.url,
                entry.origin_url,
                entry.depth,
                entry.title,
                _clean_body_text(entry.body_text),
                entry.crawled_at,
            ]
        )
