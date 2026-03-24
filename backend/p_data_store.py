from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PDataRow:
    word: str
    url: str
    origin: str
    depth: int
    frequency: int


def relevance_score(row: PDataRow) -> int:
    """Assignment formula: (frequency * 10) + 1000 - (depth * 5)."""
    return row.frequency * 10 + 1000 - row.depth * 5


def parse_p_data_file(path: Path) -> list[PDataRow]:
    if not path.is_file():
        return []
    text = path.read_text(encoding="utf-8")
    rows: list[PDataRow] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) != 5:
            continue
        word, url, origin, depth_s, freq_s = parts
        try:
            rows.append(
                PDataRow(
                    word=word.strip(),
                    url=url.strip(),
                    origin=origin.strip(),
                    depth=int(depth_s),
                    frequency=int(freq_s),
                )
            )
        except ValueError:
            continue
    return rows


class PDataCache:
    """Reload p.data when the file changes (mtime)."""

    def __init__(self, path: Path) -> None:
        self._path = path
        self._mtime: float | None = None
        self._rows: list[PDataRow] = []

    @property
    def path(self) -> Path:
        return self._path

    def rows(self) -> list[PDataRow]:
        if not self._path.is_file():
            self._mtime = None
            self._rows = []
            return self._rows
        mtime = self._path.stat().st_mtime
        if self._mtime != mtime:
            self._rows = parse_p_data_file(self._path)
            self._mtime = mtime
        return self._rows
