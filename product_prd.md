# Product Requirements Document
## Project: "Google in a Day" — Web Crawler & Real-Time Search Engine

**Version:** 2.0  
**Date:** 2026-03-23  
**Status:** Final — All Core Decisions Locked  

---

## 1. Executive Summary

This project delivers a functional, concurrent web crawler paired with a real-time search engine and a live React dashboard — built from scratch using only language-native HTTP and parsing primitives. The backend is Python with `asyncio`; the frontend is a React web UI that visualises crawl state in real time. The system must crawl accurately, handle concurrent search queries while indexing is active, manage its own load via back-pressure, and expose enough observability for an operator to understand exactly what it is doing at any moment.

The project is evaluated on three axes: **Functionality (40%)**, **Architectural Sensibility (40%)**, and **AI Stewardship (20%)**.

---

## 2. Problem Statement

Modern search engines are black boxes. Developers who rely on high-level scraping libraries (Scrapy, Beautiful Soup, Cheerio) rarely understand the concurrency challenges and data-structure decisions that underpin production crawlers. This project forces engineers to confront those decisions directly — with AI agents as co-architects, not as crutches — and to surface the internal state of the system through a real-time UI rather than hiding it behind log files.

---

## 3. Goals & Non-Goals

### Goals
- Build a recursive web crawler with configurable depth limit `k`
- Build a live search engine that queries the index while crawling is in progress
- Use only language-native HTTP and HTML-parsing primitives (no `requests`, no Beautiful Soup)
- Implement `asyncio`-native concurrency with explicit back-pressure
- Expose crawl state in real time via a React dashboard
- Support optional crawl persistence (resume after interruption) as a bonus feature
- Produce all required final deliverables: code, README, PRD, recommendation

### Non-Goals
- Production-grade distributed crawling
- JavaScript rendering (no Playwright, no Puppeteer)
- Authentication, sessions, or cookie handling
- Full-text search with inverted indexes — a simple scoring heuristic is sufficient
- Mobile-responsive dashboard design

---

## 4. Users & Stakeholders

| Role | Description |
|---|---|
| Developer / Architect | Builds and steers the system using AI agents (Claude, Cursor) |
| Instructor / Evaluator | Reviews functionality, architecture, and AI stewardship |
| Dashboard Operator | Monitors crawl progress, queue depth, and throttling status in the React UI |
| Target Web Server | Implicitly a stakeholder — the crawler must be polite and rate-limited |

---

## 5. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Python Backend                        │
│                                                             │
│  ┌──────────────┐    enqueue     ┌─────────────────────┐   │
│  │  CLI / Entry  │ ─────────────▶│   asyncio.Queue     │   │
│  │   Point       │               │   (bounded, N=1000) │   │
│  └──────────────┘                └────────┬────────────┘   │
│                                           │ workers consume │
│                                  ┌────────▼────────────┐   │
│                                  │   Crawler Engine     │   │
│                                  │  asyncio.Semaphore   │   │
│                                  │  (max concurrency)   │   │
│                                  └────────┬────────────┘   │
│                                           │                 │
│            urllib.request (thread pool)   │                 │
│                                           ▼                 │
│                              ┌────────────────────────┐    │
│   ┌──────────────────┐       │     Index Store        │    │
│   │   Visited Set    │       │  (dict, event-loop     │    │
│   │   (set, O(1))    │       │   thread only)         │    │
│   └──────────────────┘       └────────────┬───────────┘    │
│                                           │                 │
│                              ┌────────────▼───────────┐    │
│                              │    Search Engine        │    │
│                              │  (scoring + ranking)    │    │
│                              └────────────────────────┘    │
│                                                             │
│                    FastAPI + WebSocket Layer                 │
│              (serves /search, /stats, /ws/metrics)          │
└─────────────────────────┬───────────────────────────────────┘
                          │  HTTP / WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                     React Frontend (Vite)                    │
│                                                             │
│  ┌──────────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │  Crawl Progress  │  │  Queue Depth  │  │  Throttle   │  │
│  │  (done / queued) │  │  (live gauge) │  │  Indicator  │  │
│  └──────────────────┘  └───────────────┘  └─────────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Search Bar + Results Panel               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Tech | Responsibility |
|---|---|---|
| Crawler Engine | Python / asyncio | Fetches pages, extracts links, manages crawl lifecycle |
| URL Queue | `asyncio.Queue(maxsize=N)` | Bounded work queue with back-pressure |
| Visited Set | Python `set` | O(1) deduplication, event-loop-thread-only |
| Semaphore | `asyncio.Semaphore` | Caps concurrent in-flight fetches |
| Index Store | Python `dict` | Stores `IndexEntry` records, event-loop-thread-only |
| Link Parser | `html.parser.HTMLParser` subclass | Extracts `<a href>` and `<title>` from raw HTML |
| Search Engine | Python function | Scores and ranks index entries against a query |
| API Layer | FastAPI + WebSocket | Serves `/search`, `/stats`, `/ws/metrics` |
| Persistence Layer | JSON file | (Bonus) Saves and restores crawl state on demand |
| React Dashboard | React + Vite | Real-time metrics display and search interface |

---

## 6. Functional Requirements

### 6.1 Indexer (Crawler)

#### FR-1: Recursive Crawling
- The crawler SHALL accept a seed URL and a maximum depth `k` as startup parameters.
- The crawler SHALL recursively follow all valid `<a href>` links up to depth `k`.
- For each indexed page, the crawler SHALL store: `{url, origin_url, depth, title, body_text, crawled_at}`.

#### FR-2: Uniqueness — Visited Set
- The crawler SHALL maintain a `visited` Python `set` of all URLs that have been enqueued or fetched.
- Before enqueuing any URL, the crawler SHALL check `visited`. Duplicate URLs SHALL be discarded.
- The `visited` set is accessed only from the asyncio event loop thread — no additional locking is required.

#### FR-3: Back-Pressure
- The crawler SHALL use `asyncio.Semaphore(N)` to cap concurrent fetch coroutines (configurable, default: `10`).
- The URL queue SHALL be bounded: `asyncio.Queue(maxsize=N)` (configurable, default: `1000`).
- When the queue is full, `put_nowait()` SHALL catch `asyncio.QueueFull`, drop the URL, and increment a `dropped_count` metric.
- The React dashboard SHALL show a back-pressure indicator when URLs are being dropped.

#### FR-4: Native HTTP Only (Python Constraint)
- All HTTP requests SHALL use `urllib.request` from the Python standard library only.
- **Forbidden:** `requests`, `httpx`, `aiohttp`, `httplib2`, or any third-party HTTP library.
- Since `urllib` is synchronous, all HTTP calls SHALL be offloaded via `loop.run_in_executor(None, ...)`.
- Executor threads MUST NOT read or write any shared state. They return `(html: str, final_url: str, status: int)` to the event loop.
- The crawler SHALL set `User-Agent: PythonInADayCrawler/1.0` and a 10-second per-request timeout.

#### FR-5: Link Extraction — `html.parser` Only
- HTML parsing SHALL use a subclass of `html.parser.HTMLParser` to extract `<a href>` links and `<title>` text.
- **Forbidden:** Beautiful Soup, lxml, Scrapy, PyQuery, or any third-party HTML parser.
- The parser SHALL resolve relative URLs using `urllib.parse.urljoin`.
- Non-HTTP/HTTPS schemes (`mailto:`, `javascript:`, `ftp:`) SHALL be ignored.

#### FR-6: Domain Scope (Runtime Configurable)
The crawler SHALL accept a `--scope` flag:

| Value | Behaviour |
|---|---|
| `same-domain` | Only follow links whose hostname matches the seed URL's hostname |
| `same-origin` | Only follow links whose scheme + hostname + port match exactly |
| `all` | Follow any HTTP/HTTPS link regardless of domain |

---

### 6.2 Searcher (Query Engine)

#### FR-7: Live Search
- The search engine SHALL be queryable while the crawler is actively running.
- Search reads from the shared `index` dict on the event loop thread — no locking required.
- For large indexes (> 5,000 entries), the scorer SHALL yield via `await asyncio.sleep(0)` every 500 entries to avoid starving crawler coroutines.

#### FR-8: Result Format
- Every result SHALL be returned as a triple: `(relevant_url, origin_url, depth)`.
- Results SHALL be ordered from highest to lowest score. Zero-score pages SHALL be excluded.

#### FR-9: Relevancy Heuristic
- The scoring function SHALL be isolated in a single `score(entry: IndexEntry, keywords: list[str]) -> int` function for easy replacement.
- Default scoring:
  - **+10 points** per keyword occurrence in `<title>` (case-insensitive)
  - **+1 point** per keyword occurrence in `body_text` (case-insensitive)
- Multi-keyword queries: score = sum of per-keyword scores (OR semantics).

---

### 6.3 Real-Time Dashboard (React)

#### FR-10: Live Metrics Panel
The dashboard SHALL display the following, updated every 1 second via WebSocket:

| Metric | Description |
|---|---|
| URLs Crawled | Count of pages successfully fetched and indexed |
| URLs Queued | Current depth of the URL queue |
| URLs Dropped | Count of URLs dropped due to back-pressure |
| Worker Utilisation | Active workers / max workers (e.g., `8 / 10`) |
| Crawl Status | `RUNNING`, `IDLE`, `PAUSED`, or `STOPPED` |
| Back-Pressure Active | Visual indicator — active when queue is at capacity |
| Elapsed Time | Wall-clock time since crawl started |

#### FR-11: Search Interface
- The dashboard SHALL include a search input field.
- On submit, the UI SHALL call `GET /search?q=...` and render results as `(url, origin_url, depth)` triples.
- Search SHALL work while the crawl is still running.

#### FR-12: WebSocket Metrics Stream
- The backend SHALL expose `/ws/metrics`.
- The backend SHALL push a JSON metrics payload to all connected clients every **1 second**.

```json
{
  "crawled": 312,
  "queued": 88,
  "dropped": 5,
  "workers_active": 8,
  "workers_max": 10,
  "back_pressure": false,
  "status": "RUNNING",
  "elapsed_seconds": 102
}
```

---

### 6.4 Persistence — Bonus

#### FR-13: Crawl State Snapshot
- The system SHOULD save crawl state to disk on SIGINT or via `POST /pause`.
- Snapshot SHALL include: `visited` set, `index` store contents, pending queue items, and crawl config.
- Snapshot format: JSON at a configurable path (default: `./crawl_snapshot.json`).

#### FR-14: Resume from Snapshot
- If `--resume` flag is passed at startup and a snapshot file exists, the crawler SHALL restore state and continue without re-crawling visited URLs.
- The dashboard SHALL display a `RESUMED` badge when running from a restored snapshot.

---

## 7. Non-Functional Requirements

### 7.1 Concurrency Model

The architectural rule is absolute:

> **All shared state lives on the event loop. All I/O lives in thread-pool executors. Never cross the boundary.**

| Requirement | Detail |
|---|---|
| NFR-1: Event-loop-only state | `index`, `visited`, queue, and metrics MUST only be read/written from event loop coroutines |
| NFR-2: Executor isolation | Executor threads return plain data to the event loop. They MUST NOT touch shared state. |
| NFR-3: Semaphore cap | `asyncio.Semaphore(N)` governs max concurrent fetches |
| NFR-4: Queue back-pressure | `asyncio.Queue(maxsize=N)` + `put_nowait()` = non-blocking drop on overflow |
| NFR-5: Non-blocking search | Long search scans yield periodically to avoid starving crawler coroutines |

### 7.2 Performance Targets

| Metric | Target |
|---|---|
| Crawl throughput | ≥ 5 pages/sec with 10 workers on a standard network |
| Search latency | < 500ms for an index of ≤ 10,000 pages |
| Dashboard refresh rate | 1-second WebSocket push |

### 7.3 Reliability

| Requirement | Detail |
|---|---|
| NFR-6: Error isolation | A failed HTTP request MUST NOT crash or stall the crawler. Log and skip. |
| NFR-7: Graceful shutdown | SIGINT drains active workers, prints crawl summary, optionally saves snapshot |
| NFR-8: Debug mode clean | System runs without violations under `PYTHONASYNCIODEBUG=1` |

---

## 8. API Specification

| Endpoint | Method | Description |
|---|---|---|
| `/search` | GET | `?q=<query>` → ranked result triples |
| `/stats` | GET | Current metrics snapshot |
| `/ws/metrics` | WebSocket | 1-second metrics push |
| `/pause` | POST | Pause crawl + save snapshot (bonus) |
| `/resume` | POST | Resume paused crawl (bonus) |

### Search Response Shape
```json
{
  "query": "python concurrency",
  "results": [
    { "url": "https://docs.python.org/asyncio", "origin_url": "https://docs.python.org", "depth": 1, "score": 47 },
    { "url": "https://docs.python.org/threading", "origin_url": "https://docs.python.org", "depth": 2, "score": 23 }
  ],
  "total": 2,
  "index_size": 312
}
```

---

## 9. Data Structures

### IndexEntry
```python
@dataclass
class IndexEntry:
    url:         str
    origin_url:  str
    depth:       int
    title:       str
    body_text:   str
    crawled_at:  float  # Unix timestamp
```

### VisitedSet
- Type: `set[str]`
- Access: Event loop thread only — no lock
- Operation: O(1) membership check before every enqueue

### URL Queue
- Type: `asyncio.Queue[tuple[str, int, str]]` → `(url, depth, origin_url)`
- Bounded: `maxsize=N` (default 1000)
- Overflow: `put_nowait()` → catch `QueueFull` → drop + increment `dropped_count`

### Index Store
- Type: `dict[str, IndexEntry]`
- Access: Event loop thread only — no lock
- Key: canonical URL string

### CrawlMetrics
```python
@dataclass
class CrawlMetrics:
    crawled:        int  = 0
    dropped:        int  = 0
    workers_active: int  = 0
    workers_max:    int  = 10
    back_pressure:  bool = False
    status:         str  = "IDLE"
    started_at:     float = 0.0
```

---

## 10. Project Structure

```
google-in-a-day/
├── backend/
│   ├── main.py              # Entry point, CLI args, asyncio.run()
│   ├── crawler.py           # Crawler engine, worker coroutines
│   ├── parser.py            # HTMLParser subclass (links + title)
│   ├── index.py             # IndexEntry dataclass + index store
│   ├── search.py            # score() function + query runner
│   ├── metrics.py           # CrawlMetrics dataclass + update helpers
│   ├── api.py               # FastAPI app: /search, /stats, /ws/metrics
│   └── persistence.py       # Snapshot save/load (bonus)
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── MetricsDashboard.jsx
│   │   │   ├── CrawlProgressBar.jsx
│   │   │   ├── QueueDepthGauge.jsx
│   │   │   ├── BackPressureIndicator.jsx
│   │   │   └── SearchPanel.jsx
│   │   └── hooks/
│   │       └── useMetricsSocket.js
│   └── package.json
├── README.md
├── product_prd.md
└── recommendation.md
```

---

## 11. AI-Augmented Development Workflow

| Phase | Tool | Task |
|---|---|---|
| Phase 1 — PRD | Claude | Expand project brief into this formal PRD |
| Phase 2 — Design | Cursor / Composer | Map system architecture, define data flow and component boundaries before writing code |
| Phase 3 — Prompting | `.cursorrules` | Encode stdlib-only constraint, asyncio boundary rule, type-hint requirement |
| Phase 4 — Iterative Coding | Cursor (agent mode) | Build in order: crawler core → search engine → FastAPI/WebSocket layer → React dashboard |
| Phase 5 — Review | Claude | Code review for asyncio boundary violations, hallucinated stdlib APIs, back-pressure correctness |

### `.cursorrules` Constraints (Phase 3)
```
- Language: Python 3.11+, strict type hints on all public functions
- HTTP: urllib.request only. requests / httpx / aiohttp are forbidden.
- HTML parsing: html.parser.HTMLParser subclass only. beautifulsoup4 / lxml forbidden.
- Concurrency: asyncio only. No threading.Thread, no multiprocessing.
- Shared state: index, visited, metrics — event loop coroutines only. Never inside run_in_executor.
- Executor threads: return plain data (str, int, bytes). Never touch shared state.
- Back-pressure: asyncio.Queue with put_nowait(). Catch QueueFull. Never block on put().
- Frontend: React functional components + hooks only. No class components.
- API: FastAPI backend. WebSocket for metrics stream.
```

### Human-in-the-Loop Checkpoints
- [ ] **After Phase 2:** Review component boundaries and asyncio boundary rule before any code is generated
- [ ] **After crawler build:** Verify visited set prevents duplicates; verify `dropped_count` increments under load
- [ ] **After search build:** Run concurrent crawl + search; confirm results update in real time
- [ ] **After dashboard build:** Confirm WebSocket updates at 1s intervals; verify back-pressure indicator activates correctly
- [ ] **Final review:** Run with `PYTHONASYNCIODEBUG=1`; review all AI-generated code for hallucinated APIs or incorrect state access

---

## 12. Decisions Log

| # | Question | Decision |
|---|---|---|
| OQ-1 | Implementation language | ✅ Python 3.11+ |
| OQ-2 | Concurrency model | ✅ asyncio + run_in_executor for urllib |
| OQ-3 | Domain scope | ✅ Configurable via `--scope` flag |
| OQ-4 | HTML parsing strategy | ✅ `html.parser.HTMLParser` subclass |
| OQ-5 | Shutdown & persistence | ✅ SIGINT graceful shutdown + bonus JSON snapshot |
| OQ-6 | Relevancy heuristic | ✅ Keyword frequency (title ×10, body ×1), isolated for upgrade |
| OQ-7 | UI technology | ✅ React (Vite) + FastAPI WebSocket |
| OQ-8 | Persistence | ✅ Bonus — JSON snapshot on SIGINT / `POST /pause` |

---

## 13. Out of Scope

- Distributed crawling across multiple machines
- JavaScript rendering / SPA support
- robots.txt compliance (recommended but not enforced)
- Authentication, sessions, or cookie handling
- Mobile-responsive UI
- Inverted index or production-grade full-text search

---

## 14. Acceptance Criteria

| # | Criterion | Category |
|---|---|---|
| AC-1 | Crawler recursively crawls to depth `k` from a seed URL without crashing | Functionality |
| AC-2 | No URL is crawled more than once | Functionality |
| AC-3 | Search returns `(url, origin_url, depth)` triples ranked by heuristic | Functionality |
| AC-4 | Search query mid-crawl returns results from already-indexed pages | Functionality |
| AC-5 | React dashboard shows live: crawled, queued, dropped, worker utilisation, back-pressure | Functionality |
| AC-6 | `asyncio.Semaphore` enforces worker cap; `asyncio.Queue` drops URLs when full | Architecture |
| AC-7 | No shared state accessed from executor threads | Architecture |
| AC-8 | System runs cleanly under `PYTHONASYNCIODEBUG=1` | Architecture |
| AC-9 | SIGINT produces graceful shutdown with crawl summary printed | Architecture |
| AC-10 | Developer can explain every AI-generated design decision | AI Stewardship |
| AC-11 | `README.md`, `product_prd.md`, `recommendation.md` present in repo | Deliverables |
| AC-12 | (Bonus) Crawl resumes from snapshot without re-crawling visited URLs | Persistence |

---

## 15. Final Deliverables

| File | Description |
|---|---|
| GitHub public repo | Full source: Python backend + React frontend |
| `README.md` | Setup instructions, architecture overview, design decision justifications |
| `product_prd.md` | This document |
| `recommendation.md` | 2-paragraph production roadmap for high-scale deployment |

---

## 16. Grading Weights

| Category | Weight | What Is Evaluated |
|---|---|---|
| Functionality | 40% | Accurate crawl, concurrent search, live dashboard metrics |
| Architectural Sensibility | 40% | Back-pressure implementation, asyncio boundary discipline, concurrency safety |
| AI Stewardship | 20% | Ability to explain and justify every AI-generated design choice |

---

*This document is the source of truth for all implementation decisions. Phase 2 (Design in Cursor) begins only after this PRD has been reviewed.*