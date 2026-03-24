from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, Query

from .file_storage import get_storage_p_data_path
from .p_data_store import PDataCache, relevance_score


def create_relevance_app(*, p_data_path: Path | None = None) -> FastAPI:
    """
    Read-only search over ``p.data`` with assignment-style ranking.

    GET /search?query=<word>&sortBy=relevance
    """
    path = p_data_path or get_storage_p_data_path()
    cache = PDataCache(path)

    app = FastAPI(title="Google-in-a-Day relevance search (p.data)")

    @app.get("/search")
    async def search(
        query: str = Query(..., min_length=1, alias="query"),
        sortBy: str = Query("relevance"),
    ) -> dict[str, Any]:
        q = query.strip().lower()
        rows = cache.rows()
        matched: list[dict[str, Any]] = []
        for r in rows:
            if r.word.lower() != q:
                continue
            score = relevance_score(r)
            matched.append(
                {
                    "word": r.word,
                    "url": r.url,
                    "origin": r.origin,
                    "depth": r.depth,
                    "frequency": r.frequency,
                    "relevance_score": score,
                }
            )
        if sortBy.lower() == "relevance":
            matched.sort(key=lambda x: x["relevance_score"], reverse=True)
        return {
            "query": query,
            "sortBy": sortBy,
            "total": len(matched),
            "results": matched,
            "p_data": str(cache.path.resolve()),
        }

    return app
