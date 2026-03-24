from __future__ import annotations

import asyncio
import socket
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable
from html import unescape
from typing import Literal
from urllib.parse import urlparse
from urllib.parse import urljoin as urljoin_fn
from urllib.parse import urlunparse

from .index import IndexEntry
from .metrics import CrawlMetrics
from .parser import LinkTitleTextParser

Scope = Literal["same-domain", "same-origin", "all"]


def canonicalize_url(url: str) -> str:
    """
    Best-effort canonicalization:
    - remove fragments
    - lowercase scheme + hostname
    - strip trailing slash (except root)
    - omit default ports
    """
    parsed = urlparse(url)
    scheme = (parsed.scheme or "").lower()
    hostname = (parsed.hostname or "").lower()
    if not scheme or not hostname:
        return url

    # Drop fragment
    fragment = ""

    path = parsed.path or "/"
    if path != "/":
        path = path.rstrip("/")

    # Omit default ports
    port = parsed.port
    default_port = 80 if scheme == "http" else 443 if scheme == "https" else None
    if port is None or port == default_port:
        netloc = hostname
    else:
        netloc = f"{hostname}:{port}"

    # Keep query exactly (simple heuristic)
    query = parsed.query
    return urlunparse((scheme, netloc, path, parsed.params, query, fragment))


def _effective_port_for_scope(parsed) -> int | None:
    scheme = (parsed.scheme or "").lower()
    if parsed.port is not None:
        return parsed.port
    if scheme == "http":
        return 80
    if scheme == "https":
        return 443
    return None


def scope_allows(scope: Scope, seed_url: str, candidate_url: str) -> bool:
    if scope == "all":
        return True

    seed_parsed = urlparse(seed_url)
    cand_parsed = urlparse(candidate_url)

    seed_host = (seed_parsed.hostname or "").lower()
    cand_host = (cand_parsed.hostname or "").lower()
    if not seed_host or not cand_host:
        return False

    if scope == "same-domain":
        return seed_host == cand_host

    if scope == "same-origin":
        if (seed_parsed.scheme or "").lower() != (cand_parsed.scheme or "").lower():
            return False
        if seed_host != cand_host:
            return False
        return _effective_port_for_scope(seed_parsed) == _effective_port_for_scope(cand_parsed)

    return False


def fetch_url_sync(url: str, user_agent: str, timeout_s: int) -> tuple[str, str, int]:
    """
    Executor-only function. MUST NOT touch shared state.
    Returns: (html: str, final_url: str, status: int)
    """
    headers = {"User-Agent": user_agent}
    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            status = int(getattr(resp, "status", 200))
            final_url = resp.geturl()
            raw = resp.read()

            # Decode using response charset when available
            try:
                charset = resp.headers.get_content_charset()  # type: ignore[attr-defined]
            except Exception:
                charset = None
            if not charset:
                charset = "utf-8"

            html = raw.decode(charset, errors="ignore")
            return html, final_url, status
    except (urllib.error.URLError, socket.timeout, TimeoutError, ValueError):
        return "", url, 0
    except Exception:
        # Don't crash the crawler on unexpected executor errors.
        return "", url, 0


@dataclass(frozen=True)
class CrawlerConfig:
    seed_url: str
    max_depth_k: int
    scope: Scope = "same-domain"
    max_workers: int = 10
    queue_maxsize: int = 1000
    timeout_s: int = 10
    user_agent: str = "PythonInADayCrawler/1.0"


class Crawler:
    def __init__(self, config: CrawlerConfig) -> None:
        self.config = config

    async def run(
        self,
        *,
        index: dict[str, IndexEntry] | None = None,
        visited: set[str] | None = None,
        metrics: CrawlMetrics | None = None,
        log_event: Callable[[dict[str, Any]], None] | None = None,
    ) -> tuple[dict[str, IndexEntry], CrawlMetrics]:
        loop = asyncio.get_running_loop()

        def emit(level: str, message: str, **data: Any) -> None:
            if log_event is None:
                return
            payload: dict[str, Any] = {
                "ts": time.time(),
                "level": level,
                "message": message,
            }
            payload.update(data)
            log_event(payload)

        seed_canon = canonicalize_url(self.config.seed_url)
        if not scope_allows(self.config.scope, seed_canon, seed_canon):
            raise ValueError(f"Seed URL is not allowed by scope: {self.config.scope}")

        queue: asyncio.Queue[tuple[str, int, str]] = asyncio.Queue(
            maxsize=self.config.queue_maxsize
        )
        if visited is None:
            visited = set()
        if index is None:
            index = {}
        if metrics is None:
            metrics = CrawlMetrics(workers_max=self.config.max_workers)

        metrics.mark_running()
        emit(
            "INFO",
            "CRAWL_START",
            seed_url=self.config.seed_url,
            seed_canon=seed_canon,
            k=self.config.max_depth_k,
            scope=self.config.scope,
            workers_max=self.config.max_workers,
            queue_size=self.config.queue_maxsize,
        )

        # Event-loop-only helper: enqueue with back-pressure + visited rules.
        async def try_enqueue(url: str, depth: int, origin_url: str) -> None:
            if depth > self.config.max_depth_k:
                return

            canon = canonicalize_url(url)
            if not scope_allows(self.config.scope, seed_canon, canon):
                return
            if canon in visited:
                return

            item = (canon, depth, origin_url)
            try:
                queue.put_nowait(item)
            except asyncio.QueueFull:
                metrics.dropped += 1
                metrics.back_pressure = True
                metrics.queued = queue.qsize()
                emit("WARN", "QUEUE_DROP", url=canon, depth=depth)
                return

            visited.add(canon)
            metrics.back_pressure = queue.full()
            metrics.queued = queue.qsize()

        origin_url = seed_canon
        # Seed enqueue: treat as enqueued successfully.
        visited.add(seed_canon)
        queue.put_nowait((seed_canon, 0, origin_url))
        metrics.queued = queue.qsize()

        semaphore = asyncio.Semaphore(self.config.max_workers)

        async def worker(worker_idx: int) -> None:
            # Keep looping until canceled (or until queue drains and we cancel tasks).
            while True:
                url, depth, origin = await queue.get()
                try:
                    metrics.queued = queue.qsize()
                    emit("DEBUG", "FETCH_START", url=url, depth=depth, origin_url=origin)
                    # Fetch concurrency cap
                    async with semaphore:
                        metrics.workers_active += 1
                        try:
                            html, final_url, status = await loop.run_in_executor(
                                None,
                                fetch_url_sync,
                                url,
                                self.config.user_agent,
                                self.config.timeout_s,
                            )
                        finally:
                            metrics.workers_active -= 1

                    if status != 200 or not html:
                        continue

                    final_canon = canonicalize_url(final_url)
                    parser = LinkTitleTextParser(base_url=final_url)
                    try:
                        parser.feed(unescape(html))
                    except Exception:
                        # Parsing errors shouldn't halt crawl.
                        emit("ERROR", "PARSE_FAILED", url=final_canon, depth=depth, status=status)
                        continue

                    title = parser.title.strip()
                    body_text = parser.get_body_text().strip()

                    index[final_canon] = IndexEntry(
                        url=final_canon,
                        origin_url=origin,
                        depth=depth,
                        title=title,
                        body_text=body_text,
                        crawled_at=time.time(),
                    )
                    metrics.crawled += 1
                    emit(
                        "INFO",
                        "INDEXED",
                        url=final_canon,
                        depth=depth,
                        title=title[:120],
                        body_chars=len(body_text),
                    )

                    next_depth = depth + 1
                    if next_depth > self.config.max_depth_k:
                        continue

                    for link in parser.links:
                        # Parser already filters non-http(s); still apply scope + canon.
                        await try_enqueue(link, next_depth, origin)

                finally:
                    queue.task_done()

        worker_tasks = [asyncio.create_task(worker(i)) for i in range(self.config.max_workers)]

        try:
            await queue.join()
            emit(
                "INFO",
                "CRAWL_COMPLETE",
                index_size=len(index),
                crawled=metrics.crawled,
                dropped=metrics.dropped,
            )
        except asyncio.CancelledError:
            emit(
                "WARN",
                "CRAWL_CANCELLED",
                index_size=len(index),
                crawled=metrics.crawled,
                dropped=metrics.dropped,
            )
            raise
        finally:
            metrics.status = "STOPPED"
            for t in worker_tasks:
                t.cancel()
            await asyncio.gather(*worker_tasks, return_exceptions=True)

        return index, metrics

