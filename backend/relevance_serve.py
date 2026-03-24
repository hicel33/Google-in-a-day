from __future__ import annotations

import argparse

import uvicorn

from .relevance_api import create_relevance_app


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Relevance search API over p.data (assignment-style)")
    p.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Bind host (0.0.0.0 so http://localhost:3600 works with IPv4/IPv6 stacks)",
    )
    p.add_argument("--port", type=int, default=3600, help="Assignment default port")
    return p.parse_args(argv)


def main() -> None:
    args = parse_args()
    app = create_relevance_app()
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
