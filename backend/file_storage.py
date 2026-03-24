from __future__ import annotations

import os
import re
from collections import Counter
from pathlib import Path

from .index import IndexEntry

ENV_STORAGE = "GOOGLE_IN_A_DAY_STORAGE"
_DEFAULT_P_DATA = "data/storage/p.data"


def _word_counts(entry: IndexEntry) -> Counter[str]:
    """Lowercase tokens (letters/digits, min length 2) from title + body."""
    text = f"{entry.title}\n{entry.body_text}".lower()
    tokens = re.findall(r"[a-z0-9]{2,}", text, flags=re.ASCII)
    return Counter(tokens)


def get_storage_p_data_path() -> Path:
    """Path to p.data (default ./data/storage/p.data relative to cwd)."""
    raw = os.environ.get(ENV_STORAGE, _DEFAULT_P_DATA).strip()
    return Path(raw).expanduser().resolve()


def reset_storage(p_data_path: Path | None = None) -> Path:
    """
    Remove existing p.data and create an empty file.
    Called on server startup and when a new crawl session starts.
    """
    path = p_data_path or get_storage_p_data_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    path.touch()
    return path


def append_index_entry(p_data_path: Path, entry: IndexEntry) -> None:
    """
    Append one line per distinct word on this page:
    word, url, origin, depth, frequency (tab-separated).
    """
    p_data_path.parent.mkdir(parents=True, exist_ok=True)
    counts = _word_counts(entry)
    if not counts:
        return
    lines = [
        f"{w}\t{entry.url}\t{entry.origin_url}\t{entry.depth}\t{counts[w]}\n"
        for w in sorted(counts)
    ]
    with p_data_path.open("a", encoding="utf-8") as f:
        f.writelines(lines)
