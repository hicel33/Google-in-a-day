import { useMemo, useState } from "react";

export function CrawlControls({ wsStatus }) {
  const [seedUrl, setSeedUrl] = useState("https://example.com");
  const [k, setK] = useState(1);
  const [scope, setScope] = useState("same-domain");
  const [workers, setWorkers] = useState(6);
  const [queueSize, setQueueSize] = useState(200);
  const [timeoutS, setTimeoutS] = useState(10);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastStartAt, setLastStartAt] = useState(0);

  const canStart = useMemo(() => seedUrl.trim().length > 0 && !busy, [seedUrl, busy]);

  async function startCrawl() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/crawl/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed_url: seedUrl,
          k: Number(k),
          scope,
          workers: Number(workers),
          queue_size: Number(queueSize),
          timeout_s: Number(timeoutS),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Metrics will update via websocket.
      setLastStartAt(Date.now());
    } catch (e) {
      setError(e?.message || "Failed to start crawl");
    } finally {
      setBusy(false);
    }
  }

  async function stopCrawl() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/crawl/stop", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLastStartAt(Date.now());
    } catch (e) {
      setError(e?.message || "Failed to stop crawl");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        border: "1px solid #374151",
        borderRadius: 8,
        padding: 14,
        background: "rgba(2, 6, 23, 0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={{ fontWeight: 900 }}>Crawler Controls</div>
        <div style={{ color: wsStatus === "RUNNING" ? "#34d399" : "#9ca3af", fontWeight: 800 }}>
          {wsStatus}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Seed URL</div>
          <input
            value={seedUrl}
            onChange={(e) => setSeedUrl(e.target.value)}
            style={{
              background: "#0b1220",
              border: "1px solid #22314d",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#e5e7eb",
              outline: "none",
            }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Depth k</div>
            <input
              type="number"
              value={k}
              min={0}
              onChange={(e) => setK(e.target.valueAsNumber)}
              style={{
                background: "#0b1220",
                border: "1px solid #22314d",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#e5e7eb",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Scope</div>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              style={{
                background: "#0b1220",
                border: "1px solid #22314d",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#e5e7eb",
                outline: "none",
              }}
            >
              <option value="same-domain">same-domain</option>
              <option value="same-origin">same-origin</option>
              <option value="all">all</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Workers</div>
            <input
              type="number"
              value={workers}
              min={1}
              onChange={(e) => setWorkers(e.target.valueAsNumber)}
              style={{
                background: "#0b1220",
                border: "1px solid #22314d",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#e5e7eb",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>Queue size</div>
            <input
              type="number"
              value={queueSize}
              min={1}
              onChange={(e) => setQueueSize(e.target.valueAsNumber)}
              style={{
                background: "#0b1220",
                border: "1px solid #22314d",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#e5e7eb",
                outline: "none",
              }}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Timeout (seconds)</div>
          <input
            type="number"
            value={timeoutS}
            min={1}
            onChange={(e) => setTimeoutS(e.target.valueAsNumber)}
            style={{
              background: "#0b1220",
              border: "1px solid #22314d",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#e5e7eb",
              outline: "none",
            }}
          />
        </label>

        {error ? <div style={{ color: "#f87171", fontWeight: 800 }}>{error}</div> : null}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={startCrawl}
            disabled={!canStart}
            style={{
              flex: 1,
              background: busy ? "#1d4ed8" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: canStart ? "pointer" : "not-allowed",
            }}
          >
            {busy ? "Working..." : "Start Crawl"}
          </button>
          <button
            type="button"
            onClick={stopCrawl}
            disabled={busy}
            style={{
              background: "#111827",
              color: "#e5e7eb",
              border: "1px solid #374151",
              borderRadius: 8,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Stop
          </button>
        </div>

        {lastStartAt ? (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            Last action: {new Date(lastStartAt).toLocaleTimeString()}
          </div>
        ) : null}
      </div>
    </div>
  );
}

