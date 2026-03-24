from __future__ import annotations

import asyncio
import time
from typing import Any, Literal

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from .crawler import Crawler, CrawlerConfig
from .file_storage import append_index_entry, get_storage_p_data_path, reset_storage
from .index import IndexEntry
from .metrics import CrawlMetrics
from .search import search_index


def _metrics_payload(metrics: CrawlMetrics) -> dict[str, Any]:
    return {
        "crawled": metrics.crawled,
        "queued": metrics.queued,
        "dropped": metrics.dropped,
        "workers_active": metrics.workers_active,
        "workers_max": metrics.workers_max,
        "queue_max": metrics.queue_max,
        "back_pressure": metrics.back_pressure,
        "status": metrics.status,
        "elapsed_seconds": metrics.elapsed_seconds(),
    }


class CrawlStartRequest(BaseModel):
    seed_url: str = Field(..., min_length=1)
    k: int = Field(..., ge=0, description="Max recursive depth")
    scope: Literal["same-domain", "same-origin", "all"] = "same-domain"
    workers: int = Field(10, ge=1, le=200)
    queue_size: int = Field(1000, ge=1, le=200000)
    timeout_s: int = Field(10, ge=1, le=120)


def create_app() -> FastAPI:
    app = FastAPI(title="Google-in-a-Day (FastAPI)")

    @app.on_event("startup")
    async def _startup_reset_disk() -> None:
        # Fresh on-disk store every backend process start (PRD-style local dev).
        storage_path = reset_storage(get_storage_p_data_path())
        app.state.storage_path = storage_path

    # Shared in-memory state (event-loop only).
    app.state.visited = set[str]()
    app.state.index = dict[str, IndexEntry]()
    app.state.metrics = CrawlMetrics(workers_max=10)
    app.state.logs = []
    app.state.log_seq = 0
    app.state.crawl_task: asyncio.Task[tuple[dict[str, IndexEntry], CrawlMetrics]] | None = None
    app.state.crawl_lock = asyncio.Lock()
    app.state.storage_path = get_storage_p_data_path()

    def log_event(payload: dict[str, Any]) -> None:
        # Must be called only from the event loop thread.
        app.state.log_seq += 1
        if "ts" not in payload:
            payload["ts"] = time.time()
        app.state.logs.append({"seq": app.state.log_seq, **payload})
        # Hard limit to avoid unbounded memory growth.
        if len(app.state.logs) > 500:
            app.state.logs = app.state.logs[-500:]

    async def _stop_crawl_if_running() -> None:
        task = app.state.crawl_task
        if task is None:
            return
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        app.state.crawl_task = None

    @app.get("/search")
    async def search_endpoint(q: str = Query(..., min_length=1)) -> dict[str, Any]:
        results = await search_index(app.state.index, q)
        return {
            "query": q,
            "results": results,
            "total": len(results),
            "index_size": len(app.state.index),
        }

    @app.post("/crawl/start")
    async def crawl_start(req: CrawlStartRequest) -> dict[str, Any]:
        async with app.state.crawl_lock:
            await _stop_crawl_if_running()

            # Reset shared state for a clean restart.
            app.state.visited = set[str]()
            app.state.index = dict[str, IndexEntry]()
            app.state.metrics = CrawlMetrics(workers_max=req.workers)
            app.state.logs = []
            app.state.log_seq = 0
            log_event({"level": "INFO", "message": "RESET_CRAWL"})

            storage_path = reset_storage(get_storage_p_data_path())
            app.state.storage_path = storage_path

            def persist_indexed(entry: IndexEntry) -> None:
                append_index_entry(storage_path, entry)

            config = CrawlerConfig(
                seed_url=req.seed_url,
                max_depth_k=req.k,
                scope=req.scope,
                max_workers=req.workers,
                queue_maxsize=req.queue_size,
                timeout_s=req.timeout_s,
            )
            crawler = Crawler(config)
            app.state.crawl_task = asyncio.create_task(
                crawler.run(
                    index=app.state.index,
                    visited=app.state.visited,
                    metrics=app.state.metrics,
                    log_event=log_event,
                    on_indexed=persist_indexed,
                )
            )

            # Immediately return current metrics snapshot (will update via WS).
            return {
                "ok": True,
                "metrics": _metrics_payload(app.state.metrics),
            }

    @app.post("/crawl/stop")
    async def crawl_stop() -> dict[str, Any]:
        async with app.state.crawl_lock:
            await _stop_crawl_if_running()
            return {
                "ok": True,
                "metrics": _metrics_payload(app.state.metrics),
            }

    @app.websocket("/ws/metrics")
    async def ws_metrics(ws: WebSocket) -> None:
        await ws.accept()
        try:
            while True:
                # Read current metrics each tick in case we restarted the crawl.
                metrics = app.state.metrics
                await ws.send_json(_metrics_payload(metrics))
                # Faster ticks while crawling so workers/queue/back-pressure stay visible between fetches.
                delay = 0.25 if str(metrics.status).upper() == "RUNNING" else 1.0
                await asyncio.sleep(delay)
        except WebSocketDisconnect:
            return

    @app.get("/stats")
    async def stats_endpoint() -> dict[str, Any]:
        return _metrics_payload(app.state.metrics)

    @app.get("/logs")
    async def logs_endpoint() -> dict[str, Any]:
        return {"events": app.state.logs, "total": len(app.state.logs)}

    @app.websocket("/ws/logs")
    async def ws_logs(ws: WebSocket) -> None:
        await ws.accept()
        try:
            while True:
                await ws.send_json({"events": app.state.logs, "total": len(app.state.logs)})
                await asyncio.sleep(1)
        except WebSocketDisconnect:
            return

    return app

