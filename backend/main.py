from __future__ import annotations

import argparse
import asyncio
from typing import Sequence

from .crawler import Crawler, CrawlerConfig, Scope
from .file_storage import append_index_entry, get_storage_root, reset_storage


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Google-in-a-Day - core crawler runner")
    p.add_argument("--seed-url", required=True, help="Seed URL to start crawling from")
    p.add_argument("--k", type=int, default=1, help="Max recursive depth (depth limit)")
    p.add_argument(
        "--scope",
        type=str,
        choices=["same-domain", "same-origin", "all"],
        default="same-domain",
        help="Link scope filter",
    )
    p.add_argument("--workers", type=int, default=10, help="Max concurrent in-flight fetches")
    p.add_argument("--queue-size", type=int, default=1000, help="Bounded URL queue size")
    p.add_argument("--timeout-s", type=int, default=10, help="HTTP timeout seconds")
    return p.parse_args(argv)


async def main_async(args: argparse.Namespace) -> None:
    scope = args.scope  # already validated by argparse choices
    config = CrawlerConfig(
        seed_url=args.seed_url,
        max_depth_k=args.k,
        scope=scope,  # type: ignore[arg-type]
        max_workers=args.workers,
        queue_maxsize=args.queue_size,
        timeout_s=args.timeout_s,
    )
    root = reset_storage(get_storage_root())
    crawler = Crawler(config)
    index, metrics = await crawler.run(on_indexed=lambda e: append_index_entry(root, e))

    print("=== Crawl Summary ===")
    print(f"status: {metrics.status}")
    print(f"crawled: {metrics.crawled}")
    print(f"dropped: {metrics.dropped}")
    print(f"index_size: {len(index)}")
    print(f"elapsed_seconds: {metrics.elapsed_seconds()}")

    # Print a small sample so you can see it worked.
    sample = list(index.values())[:5]
    for i, entry in enumerate(sample, start=1):
        print(f"[{i}] {entry.url} (depth={entry.depth}) title={entry.title[:80]}")


def main() -> None:
    args = parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()

