from __future__ import annotations

import csv
import os
import shutil
from pathlib import Path

from .index import IndexEntry

ENV_STORAGE = "GOOGLE_IN_A_DAY_STORAGE"
INDEX_CSV = "index.csv"

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


def get_storage_root() -> Path:
    """Directory for on-disk crawl data (default: ./storage relative to cwd)."""
    raw = os.environ.get(ENV_STORAGE, "storage").strip()
    return Path(raw).expanduser().resolve()


def reset_storage(root: Path | None = None) -> Path:
    """
    Clear all files under the storage directory, then ensure it exists empty.
    Called on server startup and when a new crawl session starts.
    """
    root = root or get_storage_root()
    if root.exists():
        shutil.rmtree(root)
    root.mkdir(parents=True, exist_ok=True)

    # Always create the file with a header so it's readable immediately.
    csv_path = root / INDEX_CSV
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(CSV_FIELDS)
    return root


def append_index_entry(root: Path, entry: IndexEntry) -> None:
    """Append one indexed page as one CSV row (event-loop thread; sync I/O)."""
    root.mkdir(parents=True, exist_ok=True)
    path = root / INDEX_CSV
    with path.open("a", encoding="utf-8", newline="") as f:
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
