# Multi-Agent Crawler and Search (HW2)

This project implements a single-machine web crawler + live search system using Python `asyncio` and standard-library crawling/parsing primitives (`urllib.request`, `html.parser`), with a React UI for operations.

## What this supports

- `index(origin, k)` style crawling with depth limit and deduplication (`visited` set).
- Back pressure via:
  - bounded `asyncio.Queue(maxsize=...)`
  - concurrency cap `asyncio.Semaphore(...)`
  - dropped-url counter when queue is full.
- `search(query)` while indexing is active (live over in-memory index).
- Result shape includes `(relevant_url, origin_url, depth)` plus score.
- UI pages for crawl controls, search, logs, queue depth, worker activity, and back pressure.
- Persistence of assignment-style index lines to `data/storage/p.data`.

## Run (Windows PowerShell)

From repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
cd frontend
npm install
cd ..
```

Terminal 1:

```powershell
.\.venv\Scripts\python -m backend.serve --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1
```

Open:
- UI: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8000`

## Optional relevance API over `p.data`

```powershell
.\.venv\Scripts\python -m backend.relevance_serve --host 127.0.0.1 --port 3600
```

Example:
- `http://127.0.0.1:3600/search?query=python`

## Main API endpoints

- `POST /crawl/start` with `seed_url`, `k`, `scope`, `workers`, `queue_size`, `timeout_s`
- `POST /crawl/stop`
- `GET /search?q=...`
- `GET /stats`
- `GET /logs`
- `WS /ws/metrics`
- `WS /ws/logs`

## Design for live search during active indexing

Current model is event-loop-owned shared state:
- crawler workers update `index` on the event loop only;
- search reads a snapshot `list(index.values())` to avoid mutation errors;
- large searches periodically `await asyncio.sleep(0)` to avoid starving crawler tasks.

Production direction is documented in `recommendation.md` and `multi_agent_workflow.md` (epoch-based immutable snapshot publishing).

## Required deliverables in this repo

- `product_prd.md`
- `recommendation.md`
- `multi_agent_workflow.md`
- `agents/` (agent definitions/prompts)
