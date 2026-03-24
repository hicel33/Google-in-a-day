from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class IndexEntry:
    url: str
    origin_url: str
    depth: int
    title: str
    body_text: str
    crawled_at: float  # Unix timestamp

