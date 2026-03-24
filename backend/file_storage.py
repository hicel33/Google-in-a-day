from __future__ import annotations

import json
import os
import shutil
from dataclasses import asdict
from pathlib import Path

from .index import IndexEntry

ENV_STORAGE = "GOOGLE_IN_A_DAY_STORAGE"
INDEX_JSONL = "index.jsonl"


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
    return root


def append_index_entry(root: Path, entry: IndexEntry) -> None:
    """Append one indexed page as a single JSON line (event-loop thread; sync I/O)."""
    root.mkdir(parents=True, exist_ok=True)
    path = root / INDEX_JSONL
    line = json.dumps(asdict(entry), ensure_ascii=False) + "\n"
    with path.open("a", encoding="utf-8") as f:
        f.write(line)
