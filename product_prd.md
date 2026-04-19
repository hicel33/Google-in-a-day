# Product Requirements Document (HW2)

## Project
Multi-Agent Web Crawler and Live Search System

## Objective
Build the same core crawler/search capability as HW1, but execute delivery through a multi-agent AI workflow with clear role boundaries, prompts, handoffs, and human final decision ownership.

## Core Functional Requirements

### 1) Index
- Input: `origin` URL and depth limit `k`.
- Crawl pages up to `k` hops from `origin`.
- Never crawl the same canonical URL twice.
- Track discovered page metadata: `url`, `origin_url`, `depth`, `title`, `body_text`, `crawled_at`.
- Include back pressure controls:
  - bounded queue
  - max worker concurrency
  - dropped/enqueued telemetry.

### 2) Search
- Input: free-text `query`.
- Output: list of triples `(relevant_url, origin_url, depth)` (score included as implementation detail).
- Search must run while indexing is active and reflect newly indexed pages.
- Relevance for this project: keyword frequency with title weighting.

### 3) Operator Interface
- Provide simple UI or CLI to:
  - start/stop indexing,
  - run search,
  - inspect state: queue depth, worker activity, dropped URLs/back pressure, total crawled.

## Technical Constraints
- Single-machine design, but large crawl scale assumptions.
- Prefer language-native features (no heavy crawler/parser libraries doing core work).
- Python standard library for core crawl/parsing:
  - HTTP: `urllib.request`
  - parsing: `html.parser`.

## Architecture
- `asyncio.Queue(maxsize=N)` for frontier and back pressure.
- `asyncio.Semaphore(W)` for controlled concurrency.
- `visited: set[str]` for dedupe.
- `index: dict[str, IndexEntry]` as in-memory searchable state.
- FastAPI for API + WebSocket metrics streaming.
- React dashboard for live operations.

## Live Search While Indexing (Design Notes)
- Current implementation: event-loop-owned mutable state + snapshot reads in search.
- Recommended evolution:
  - append-only segment indexing,
  - immutable published snapshots by epoch,
  - query reads one epoch per request for consistent results.

## Non-Functional Goals
- Reliability: failed fetch/parse should not crash crawler.
- Safety: avoid state mutation from executor threads.
- Observability: metrics/log stream for operators.
- Performance: low-latency search under active crawl.

## Deliverables
- Working codebase.
- `README.md`.
- `product_prd.md`.
- `recommendation.md`.
- `multi_agent_workflow.md`.
- Optional `agents/` folder with agent profiles (included in this project).
