from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class CrawlMetrics:
    crawled: int = 0
    queued: int = 0
    dropped: int = 0
    workers_active: int = 0
    workers_max: int = 10
    queue_max: int = 1000
    back_pressure: bool = False
    status: str = "IDLE"
    started_at: float = 0.0

    def mark_running(self) -> None:
        self.status = "RUNNING"
        self.started_at = time.time()

    def mark_idle(self) -> None:
        self.status = "IDLE"

    def elapsed_seconds(self) -> int:
        if not self.started_at:
            return 0
        return int(time.time() - self.started_at)

