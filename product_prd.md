# Product Requirements Document
## Project: "Google in a Day" — Web Crawler & Real-Time Search Engine

**Version:** 1.0  
**Date:** 2026-03-23  
**Status:** Draft — Pending Team Review  

---

## 1. Executive Summary

This project delivers a functional, concurrent web crawler paired with a real-time search engine — built from scratch using only language-native HTTP and parsing primitives. The system is designed to demonstrate architectural sensibility, concurrency discipline, and AI-augmented development workflows. It is not a toy: it must handle real-world web pages, manage its own load, and serve search queries while actively crawling.

---

## 2. Problem Statement

Modern search engines are black boxes. Developers who rely on high-level scraping libraries (Scrapy, Beautiful Soup, Cheerio) rarely understand the concurrency challenges and data-structure decisions that underpin production crawlers. This project forces engineers to confront those decisions directly — with AI agents as co-architects, not as crutches.

---

## 3. Goals & Non-Goals

### Goals
- Build a recursive web crawler with configurable depth limit `k`
- Build a live search engine that queries the index while crawling is in progress
- Use only language-native HTTP and HTML-parsing primitives
- Implement thread-safe data structures to prevent data corruption under concurrency
- Implement back-pressure to prevent the crawler from overwhelming itself or target servers
- Rank search results by a simple, explainable heuristic (keyword frequency + title matching)

### Non-Goals
- This is not a production-grade distributed crawler
- No JavaScript rendering (no headless browser, no Playwright/Puppeteer)
- No authentication or cookie management
- No persistent storage beyond the in-process index (no database, no disk write required)
- No GUI — CLI interface only

---

## 4. Users & Stakeholders

| Role | Description |
|---|---|
| Developer / Architect | Builds and steers the system using AI agents |
| Instructor / Evaluator | Reviews architectural decisions, concurrency safety, and AI workflow |
| Target Web Server | Implicitly a stakeholder — the crawler must be polite and rate-limited |

---

## 5. System Architecture Overview

The system consists of two cooperating subsystems that share a single in-memory index:

```
[ CLI Entry Point ]
       |
       v
[ Crawler Engine ] ──── writes ──── [ Thread-Safe Index ]
       |                                      |
  [ URL Queue ]                        [ Search Engine ]
  [ Visited Set ]                             |
  [ Rate Limiter ]                     [ CLI Query Interface ]
```

### Key Components

| Component | Responsibility |
|---|---|
| Crawler Engine | Fetches pages, extracts links, manages crawl lifecycle |
| URL Queue | Holds pending URLs with associated depth metadata |
| Visited Set | Prevents re-crawling of already-visited URLs |
| Rate Limiter / Back-Pressure | Caps concurrent workers and/or queue depth |
| Index Store | Stores parsed page data in a thread-safe structure |
| Search Engine | Accepts queries and returns ranked results from the index |
| CLI | Entry point for starting crawl and submitting queries |

---

## 6. Functional Requirements

### 6.1 Indexer (Crawler)

#### FR-1: Recursive Crawling
- The crawler SHALL accept a seed (origin) URL and a maximum depth `k` as input parameters.
- The crawler SHALL recursively follow all valid hyperlinks found on each crawled page, up to depth `k`.
- The crawler SHALL record, for each indexed page: `{url, origin_url, depth, title, body_text}`.

#### FR-2: Uniqueness — Visited Set
- The crawler SHALL maintain a "Visited" set of all URLs that have been fetched or enqueued.
- Before enqueuing any URL, the crawler SHALL check the Visited set. If the URL is already present, it SHALL be discarded.
- The Visited set SHALL be protected by a mutex or equivalent synchronization primitive.

#### FR-3: Back-Pressure
- The crawler SHALL enforce a maximum number of concurrent worker goroutines/threads (configurable, default: 10).
- The crawler SHALL enforce a maximum URL queue depth (configurable, default: 1000). If the queue is full, new URLs SHALL be dropped rather than causing unbounded memory growth.
- Optionally, the crawler MAY enforce a per-domain request rate limit (e.g., max 5 req/sec per domain).

#### FR-4: Native HTTP Only
- All HTTP requests SHALL use only the standard library's HTTP client (e.g., `net/http` in Go, `urllib` in Python, `http`/`https` in Node.js).
- HTML link extraction SHALL use only the standard library or a minimal hand-written parser — NOT Beautiful Soup, Cheerio, Scrapy, or equivalent high-level libraries.
- The crawler SHALL follow HTTP redirects natively.
- The crawler SHALL set a reasonable request timeout (default: 10 seconds).
- The crawler SHALL set a descriptive `User-Agent` header (e.g., `GoInADayCrawler/1.0`).

#### FR-5: Link Extraction Rules
- The crawler SHALL extract only `<a href="...">` links from HTML pages.
- The crawler SHALL resolve relative URLs against the current page's base URL.
- The crawler SHALL ignore non-HTTP/HTTPS links (e.g., `mailto:`, `javascript:`, `ftp:`).
- The crawler MAY optionally be scoped to a single domain (configurable flag: `--same-domain`).

---

### 6.2 Searcher (Query Engine)

#### FR-6: Live Search
- The search engine SHALL be queryable while the crawler is still actively running.
- The search engine SHALL read from the shared index without blocking crawler writes for longer than a single lock acquisition.

#### FR-7: Result Format
- Every search result SHALL be returned as a triple: `(relevant_url, origin_url, depth)`.
- Results SHALL be returned as an ordered list, ranked from most to least relevant.

#### FR-8: Relevancy Heuristic
- The system SHALL implement a scoring function. The default heuristic:
  - **+10 points** per occurrence of the query keyword in the page `<title>`
  - **+1 point** per occurrence of the query keyword in the page body text
  - Case-insensitive matching
  - Pages with score `0` SHALL be excluded from results
- The heuristic SHALL be clearly isolated in a single scoring function so it can be swapped or extended.

#### FR-9: Multi-keyword Support
- The search engine SHALL support multi-word queries.
- For multi-word queries, scoring SHALL be the sum of individual keyword scores (OR semantics by default).

---

## 7. Non-Functional Requirements

### 7.1 Concurrency & Thread Safety

| Requirement | Detail |
|---|---|
| NFR-1: No data races | All shared data structures (index, visited set, queue) MUST be protected by synchronization primitives. |
| NFR-2: Deadlock-free | Lock acquisition order MUST be consistent. Locks MUST NOT be held while performing I/O. |
| NFR-3: Search non-blocking | Search reads MUST use read locks (e.g., `sync.RWMutex`) so multiple queries can run concurrently. |

### 7.2 Performance

| Requirement | Detail |
|---|---|
| NFR-4: Crawl throughput | With 10 concurrent workers and a 10s timeout, the crawler SHOULD process ≥ 5 pages/sec on a standard network. |
| NFR-5: Search latency | A search query against an index of ≤ 10,000 pages SHOULD return results in < 500ms. |

### 7.3 Reliability

| Requirement | Detail |
|---|---|
| NFR-6: Error isolation | A failed HTTP request on one URL MUST NOT crash or stall the entire crawler. Errors SHALL be logged and the URL skipped. |
| NFR-7: Graceful shutdown | The system SHALL support a graceful shutdown signal (e.g., CTRL+C / SIGINT) that drains active workers and prints a crawl summary. |

---

## 8. CLI Interface Specification

```
# Start crawler
./crawler --url https://example.com --depth 3 --workers 10 --queue-size 1000 [--same-domain]

# Query (runs interactively while crawler runs, or post-crawl)
> search golang concurrency
Results (3 found):
  1. https://go.dev/doc/effective_go  (origin: https://go.dev, depth: 1, score: 47)
  2. https://go.dev/blog/pipelines     (origin: https://go.dev, depth: 2, score: 23)
  3. https://pkg.go.dev/sync           (origin: https://go.dev, depth: 3, score: 11)

> stats
Crawled: 312 pages | Queued: 88 | Workers: 10/10 active | Elapsed: 00:01:42
```

---

## 9. Data Structures

### IndexEntry
```
{
  url:         string   // canonical URL of the crawled page
  origin_url:  string   // seed URL that led to this page
  depth:       int      // crawl depth from seed
  title:       string   // contents of <title> tag
  body_text:   string   // stripped visible text of the page
  score:       int      // populated at query time, not stored
}
```

### VisitedSet
- Underlying type: Hash set (e.g., `map[string]bool` in Go, `set` in Python)
- Synchronization: Mutex (write lock on add, read lock on check)

### URL Queue
- Underlying type: Bounded channel or bounded queue
- Each entry: `{url: string, depth: int, origin_url: string}`
- Back-pressure mechanism: Drop new entries when queue is at capacity

### Index Store
- Underlying type: Hash map keyed on URL
- Synchronization: Read-write mutex (concurrent reads, exclusive writes)

---

## 10. AI-Augmented Development Workflow

This project is built using an AI-Augmented workflow. The following phases are defined:

| Phase | Tool | Task |
|---|---|---|
| Phase 1 — PRD | Claude / ChatGPT / Gemini | Expand brief into this PRD |
| Phase 2 — Architecture | Claude / Cursor | Generate system diagram, define data structures, select sync primitives |
| Phase 3 — Scaffold | Cursor / VS Code | Generate boilerplate: project structure, module files, CLI harness |
| Phase 4 — Core Build | Cursor (agent mode) | Implement crawler engine, URL queue, visited set |
| Phase 5 — Searcher | Cursor (agent mode) | Implement index store, scoring function, query loop |
| Phase 6 — Integration | Human-in-the-Loop | Wire components together, verify thread safety, stress test |
| Phase 7 — Review | Claude | Code review for concurrency bugs, deadlocks, and architectural smells |

### Human-in-the-Loop Verification Checkpoints
- [ ] After Phase 2: Architect reviews data structure choices and sync strategy before code is written
- [ ] After Phase 4: Developer verifies no data races using the language's built-in race detector
- [ ] After Phase 5: Developer runs concurrent crawl + search and verifies result correctness
- [ ] After Phase 7: Final review of AI-generated code for hallucinated APIs or incorrect lock usage

---

## 11. Open Questions (To Be Decided)

| # | Question | Options | Owner |
|---|---|---|---|
| OQ-1 | Implementation language | Python, Go, Node.js, Java | Team |
| OQ-2 | Concurrency model | Threads+Mutex, Goroutines+Channels, Async/Await | Team |
| OQ-3 | Domain scope | Single-domain only, Multi-domain, Configurable flag | Team |
| OQ-4 | HTML parsing strategy | Hand-written state machine, stdlib `html.parser`, `encoding/xml` | Team |
| OQ-5 | Shutdown trigger | SIGINT only, time limit, max-pages limit, all three | Team |
| OQ-6 | Relevancy heuristic extension | TF-IDF, anchor text weighting, heading weighting | Team |

---

## 12. Out of Scope

- Persistent storage / database backend
- Distributed crawling across multiple machines
- JavaScript rendering (SPA support)
- robots.txt compliance (recommended but not required for this exercise)
- Authentication, sessions, or cookie handling
- A web-based UI

---

## 13. Acceptance Criteria

The project is considered complete when:

1. The crawler can start from a seed URL and recursively crawl to depth `k` without crashing.
2. No URL is crawled more than once across any run.
3. The system does not crash or deadlock under concurrent crawl + search load.
4. Search returns `(url, origin_url, depth)` triples ranked by the defined heuristic.
5. A search query submitted mid-crawl returns results from the already-indexed pages.
6. The race detector (or equivalent tool) reports zero data races.
7. The system gracefully shuts down on SIGINT without hanging indefinitely.

---

*This document is a living artifact. All Open Questions in Section 11 must be resolved before Phase 3 begins.*