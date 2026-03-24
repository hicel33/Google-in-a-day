from __future__ import annotations

import asyncio
import re
from typing import Any

from .index import IndexEntry


def score(entry: IndexEntry, keywords: list[str]) -> int:
    """Keyword scoring heuristic (title x10, body x1)."""
    if not keywords:
        return 0

    title_lower = (entry.title or "").lower()
    body_lower = (entry.body_text or "").lower()

    total = 0
    for kw in keywords:
        if not kw:
            continue
        total += 10 * title_lower.count(kw)
        total += 1 * body_lower.count(kw)
    return total


async def search_index(
    index: dict[str, IndexEntry],
    query: str,
    *,
    yield_every: int = 500,
    yield_if_len_gt: int = 5000,
) -> list[dict[str, Any]]:
    """
    Live search over the in-memory index (event-loop thread).
    Reads a snapshot of index values to avoid 'dict changed size' errors.
    """
    normalized = query.strip().lower()
    keywords = [k for k in re.split(r"\s+", normalized) if k]

    if not keywords:
        return []

    entries = list(index.values())
    should_yield = len(entries) > yield_if_len_gt

    results: list[dict[str, Any]] = []
    for i, entry in enumerate(entries):
        s = score(entry, keywords)
        if s > 0:
            results.append(
                {
                    "url": entry.url,
                    "origin_url": entry.origin_url,
                    "depth": entry.depth,
                    "score": s,
                }
            )

        if should_yield and i % yield_every == 0:
            await asyncio.sleep(0)

    results.sort(key=lambda r: r["score"], reverse=True)
    return results

