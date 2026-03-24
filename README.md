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

### Crawl-only CLI (no UI)

```bash
. .venv/bin/activate   # after make install
python -m backend.main --seed-url "https://example.com" --k 1 --scope all
```

## On-disk crawl index

Indexed pages are appended to **`storage/index.csv`** (CSV with a header row). That folder is **wiped when the API process starts** and again at each **Start crawl**, so nothing carries over between backend restarts. Override the directory with the **`GOOGLE_IN_A_DAY_STORAGE`** environment variable if needed.

## Project layout

- `backend/` — Python: crawler, search, FastAPI (`python -m backend.serve`)
- `frontend/` — Vite + React
- `requirements.txt` — Python dependencies (FastAPI, Uvicorn)
