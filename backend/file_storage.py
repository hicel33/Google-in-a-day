from __future__ import annotations

import os
import re
from collections import Counter
from pathlib import Path

from .index import IndexEntry


def get_storage_p_data_path() -> Path:
    configured = os.getenv("GOOGLE_IN_A_DAY_STORAGE", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return Path("data/storage/p.data").resolve()


def reset_storage(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("", encoding="utf-8")
    return path


def append_index_entry(path: Path, entry: IndexEntry) -> None:
    """
    Persist assignment-style tab-separated rows:
    word, url, origin_url, depth, frequency
    """
    text = f"{entry.title}\n{entry.body_text}"
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    if not tokens:
        return

    counts = Counter(tokens)
    with path.open("a", encoding="utf-8", newline="\n") as f:
        for word, freq in counts.items():
            f.write(f"{word}\t{entry.url}\t{entry.origin_url}\t{entry.depth}\t{freq}\n")
