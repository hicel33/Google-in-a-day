import { useMemo } from "react";

function statusStyles(status) {
  const s = String(status || "IDLE").toUpperCase();
  if (s === "RUNNING") {
    return { color: "#34d399", border: "rgba(52, 211, 153, 0.35)", bg: "rgba(52, 211, 153, 0.08)" };
  }
  if (s === "STOPPED") {
    return { color: "#fbbf24", border: "rgba(251, 191, 36, 0.35)", bg: "rgba(251, 191, 36, 0.08)" };
  }
  return { color: "#93c5fd", border: "rgba(147, 197, 253, 0.25)", bg: "rgba(147, 197, 253, 0.06)" };
}

function StatTile({ label, value, sub }) {
  return (
    <div
      style={{
        minWidth: 0,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: 8,
        padding: "10px 12px",
        background: "rgba(15, 23, 42, 0.45)",
      }}
    >
      <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#f8fafc", lineHeight: 1.2 }}>{value}</div>
      {sub ? <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>{sub}</div> : null}
    </div>
  );
}

export function CrawlStatusPanel({ metrics, wsConnected }) {
  const {
    crawled = 0,
    queued = 0,
    dropped = 0,
    workers_active = 0,
    workers_max = 0,
    queue_max = 1000,
    back_pressure = false,
    status = "IDLE",
    elapsed_seconds = 0,
  } = metrics || {};

  const badge = useMemo(() => statusStyles(status), [status]);
  const workerPct = workers_max > 0 ? Math.min(100, Math.round((workers_active / workers_max) * 100)) : 0;

  return (
    <section
      style={{
        width: "100%",
        boxSizing: "border-box",
        border: `1px solid ${badge.border}`,
        borderRadius: 12,
        padding: 16,
        background: badge.bg,
      }}
      aria-label="Crawler status"
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>Live crawl status</div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${badge.border}`,
                background: "rgba(2, 6, 23, 0.35)",
                color: badge.color,
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              {String(status).toUpperCase()}
            </span>
            <span style={{ fontSize: 13, color: wsConnected ? "#34d399" : "#94a3b8", fontWeight: 700 }}>
              Metrics stream: {wsConnected ? "live" : "offline"}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
          Elapsed <span style={{ color: "#e2e8f0" }}>{elapsed_seconds}s</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        <StatTile
          label="Indexed (URLs)"
          value={crawled}
          sub={`${queued} waiting · ${workers_active} active (cap ${queue_max})`}
        />
        <StatTile label="Dropped" value={dropped} sub={back_pressure ? "Back-pressure on" : "Queue OK"} />
        <StatTile label="Workers" value={`${workers_active} / ${workers_max}`} sub={`~${workerPct}% cap`} />
        <StatTile label="Back-pressure" value={back_pressure ? "YES" : "NO"} sub="Bounded queue policy" />
      </div>
    </section>
  );
}
