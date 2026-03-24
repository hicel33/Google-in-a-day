import { useMemo, useState } from "react";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("IDLE");
  const [error, setError] = useState("");

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!trimmedQuery) return;

    setError("");
    setStatus("SEARCHING");

    try {
      const res = await fetch(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(Array.isArray(data.results) ? data.results : []);
      setStatus("DONE");
    } catch (err) {
      setError(err?.message || "Search failed");
      setStatus("ERROR");
    }
  }

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        border: "1px solid #374151",
        borderRadius: 8,
        padding: 14,
        background: "rgba(2, 6, 23, 0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ fontWeight: 800 }}>Search</div>
        <div style={{ color: "#9ca3af", fontSize: 13 }}>{status}</div>
      </div>

      <form
        onSubmit={onSubmit}
        style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "stretch" }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: python concurrency"
          style={{
            flex: "1 1 220px",
            minWidth: 0,
            background: "#0b1220",
            border: "1px solid #22314d",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#e5e7eb",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>

      {error ? (
        <div style={{ marginTop: 10, color: "#f87171", fontWeight: 700 }}>{error}</div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {results.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 13 }}>No results yet.</div>
        ) : (
          results.map((r, idx) => (
            <div
              key={`${r.url || "url"}-${idx}`}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.25)",
                background: "rgba(15, 23, 42, 0.6)",
                borderRadius: 8,
                padding: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#93c5fd", textDecoration: "none", fontWeight: 700 }}
                >
                  {r.url}
                </a>
                <div style={{ color: "#cbd5e1", fontWeight: 800 }}>score: {r.score ?? 0}</div>
              </div>
              <div style={{ marginTop: 6, color: "#9ca3af", fontSize: 13 }}>
                origin: {r.origin_url} | depth: {r.depth}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

