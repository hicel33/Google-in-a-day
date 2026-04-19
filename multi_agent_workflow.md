# Multi-Agent Workflow

## Summary
This HW2 solution was delivered with a multi-agent development workflow. The final code/runtime decisions were made by the lead agent (this session), while specialized agents produced targeted analyses and design proposals.

## Agent Roster

1. **Backend Auditor Agent**
   - Responsibility: detect runtime blockers and correctness risks.
   - Focus: import errors, missing modules, crawl/search contract bugs.
2. **Workflow Designer Agent**
   - Responsibility: propose assignment-ready agent structure and artifacts.
   - Focus: role definitions, prompt templates, handoff contracts.
3. **Concurrency Architect Agent**
   - Responsibility: design safe “search while indexing” strategy.
   - Focus: consistency model, snapshot/epoch publication, performance trade-offs.
4. **Lead Integrator Agent (final authority)**
   - Responsibility: implement changes, reconcile conflicts, run checks, finalize docs.

## Example Prompts Used

- Backend Auditor Agent:
  - "Audit this codebase for blockers that prevent live crawl/search and required deliverables."
- Workflow Designer Agent:
  - "Provide a practical multi-agent plan and file structure for this assignment."
- Concurrency Architect Agent:
  - "Design a robust single-machine architecture that supports querying during active indexing."

## Interaction Protocol

- Lead agent dispatches independent tasks in parallel.
- Each subagent returns concise, actionable outputs.
- Lead agent validates feasibility against current codebase.
- Decisions log:
  - Accepted: create missing `backend/file_storage.py`.
  - Accepted: add missing `backend/relevance_api.py`.
  - Accepted: fix origin propagation bug in crawler.
  - Accepted: add required documentation + `/agents` files.
  - Deferred: full epoch/segment runtime implementation (documented as production recommendation).

## Outputs Produced by Multi-Agent Process

- Runtime fixes:
  - Added storage/persistence writer module.
  - Added relevance API module used by `backend.relevance_serve`.
  - Corrected `origin_url` propagation for discovered links.
- Documentation deliverables:
  - Rewrote `product_prd.md`.
  - Rewrote `recommendation.md`.
  - Rewrote `README.md`.
  - Added agent descriptions under `agents/`.

## Quality and Evaluation Approach

- Functional validation:
  - imports resolve for backend modules,
  - crawl and search endpoints remain available,
  - relevance API bootstraps from `p.data`.
- Architectural validation:
  - dedupe via visited set,
  - bounded queue + worker cap back pressure,
  - live search reads from in-memory index snapshot while crawl updates continue.

## How search can run during indexing (current vs future)

- **Current implementation:** event-loop-owned index writes + search snapshot reads (`list(index.values())`) for safe concurrent access.
- **Production-oriented path:** immutable per-epoch index snapshots published atomically from indexing segments, with queries pinned to one epoch for full request consistency.
