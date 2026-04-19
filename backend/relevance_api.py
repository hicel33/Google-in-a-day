from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Query

from .file_storage import get_storage_p_data_path


def _load_rows(path: Path) -> list[tuple[str, str, str, int, int]]:
    if not path.exists():
        return []
    rows: list[tuple[str, str, str, int, int]] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        parts = raw.split("\t")
        if len(parts) != 5:
            continue
        word, url, origin_url, depth_s, freq_s = parts
        try:
            depth = int(depth_s)
            frequency = int(freq_s)
        except ValueError:
            continue
        rows.append((word, url, origin_url, depth, frequency))
    return rows


def create_relevance_app() -> FastAPI:
    app = FastAPI(title="Google-in-a-Day Relevance API")

    @app.get("/search")
    async def search_endpoint(
        query: str = Query(..., min_length=1),
        sortBy: str = Query("relevance"),
    ) -> dict[str, Any]:
        _ = sortBy  # kept for assignment-compatible API shape
        keywords = [w.strip().lower() for w in query.split() if w.strip()]
        if not keywords:
            return {"query": query, "results": [], "total": 0}

        grouped: dict[tuple[str, str, int], int] = defaultdict(int)
        for word, url, origin_url, depth, frequency in _load_rows(get_storage_p_data_path()):
            if word in keywords:
                score = frequency * 10 + 1000 - depth * 5
                grouped[(url, origin_url, depth)] += score

        results = [
            {"url": url, "origin_url": origin, "depth": depth, "score": score}
            for (url, origin, depth), score in grouped.items()
        ]
        results.sort(key=lambda r: r["score"], reverse=True)
        return {"query": query, "results": results, "total": len(results)}

    return app
