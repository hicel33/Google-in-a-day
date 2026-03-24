from __future__ import annotations

import argparse

import uvicorn

from .api import create_app


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Google-in-a-Day - FastAPI server")
    p.add_argument("--host", type=str, default="127.0.0.1", help="Bind host")
    p.add_argument("--port", type=int, default=8000, help="Bind port")
    return p.parse_args(argv)


def main() -> None:
    args = parse_args()
    app = create_app()
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()

