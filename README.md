# Google-in-a-Day

A web crawler with a live search API and React dashboard (see `product_prd.md`).

## Prerequisites

- **Python** 3.11+ (3.13 OK)
- **Node.js** 18+ and **npm**

## Run on Linux (localhost)

From the repository root:

```bash
chmod +x scripts/run-local.sh
./scripts/run-local.sh
```

This creates a `.venv`, installs Python deps from `requirements.txt`, starts the API on **http://127.0.0.1:8000**, then the UI on **http://127.0.0.1:5173**. Open the UI, go to **Crawler**, set your seed URL, and click **Start crawl**.

### Two terminals (alternative)

```bash
make install          # once
make backend          # terminal 1 — API :8000
make frontend         # terminal 2 — Vite :5173
```

### Relevance search over `p.data` (assignment-style)

After crawling, run a second API (same `GOOGLE_IN_A_DAY_STORAGE` / default `data/storage/p.data`):

```bash
make relevance        # or: python -m backend.relevance_serve --port 3600
```

Example: `GET http://localhost:3600/search?query=python&sortBy=relevance`  
Ranks lines with `score = frequency*10 + 1000 - depth*5`.

### Crawl-only CLI (no UI)

```bash
. .venv/bin/activate   # after make install
python -m backend.main --seed-url "https://example.com" --k 1 --scope all
```

## On-disk crawl index

Each indexed page appends **`data/storage/p.data`** lines (tab-separated):

`word`, `url`, `origin_url`, `depth`, `frequency` (word counts from title + body).

That folder/file is **wiped when the API process starts** and again at each **Start crawl**. Override the path to `p.data` with **`GOOGLE_IN_A_DAY_STORAGE`** if needed.

## Project layout

- `backend/` — Python: crawler, search, FastAPI (`python -m backend.serve`)
- `frontend/` — Vite + React
- `requirements.txt` — Python dependencies (FastAPI, Uvicorn)
