from __future__ import annotations

from html.parser import HTMLParser
from typing import Iterable
from urllib.parse import urljoin, urlparse


class LinkTitleTextParser(HTMLParser):
    """
    Extracts:
      - <title> text
      - http(s) links from <a href="">
      - visible-ish body text from handle_data (best-effort, stdlib-only)
    """

    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self._base_url = base_url

        self.title: str = ""
        self.links: list[str] = []

        self._in_title = False
        self._skip_depth = 0  # used to ignore script/style contents
        self._text_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        if tag_lower == "title":
            self._in_title = True
            return

        if tag_lower in {"script", "style"}:
            self._skip_depth += 1
            return

        if tag_lower != "a":
            return

        href = None
        for k, v in attrs:
            if k.lower() == "href":
                href = v
                break
        if not href:
            return

        resolved = urljoin(self._base_url, href)
        parsed = urlparse(resolved)
        if parsed.scheme not in {"http", "https"}:
            return

        self.links.append(resolved)

    def handle_endtag(self, tag: str) -> None:
        tag_lower = tag.lower()
        if tag_lower == "title":
            self._in_title = False
        elif tag_lower in {"script", "style"} and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return

        cleaned = " ".join(data.split())
        if not cleaned:
            return

        if self._in_title:
            # Preserve spacing inside <title> a bit better.
            if self.title:
                self.title += " "
            self.title += cleaned
        else:
            self._text_chunks.append(cleaned)

    def get_body_text(self) -> str:
        return " ".join(self._text_chunks)

