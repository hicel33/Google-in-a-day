export function CrawlProgressBar({ crawled, queued, workersActive = 0, status }) {
  const pending = Math.max(0, Number(queued) + Number(workersActive));
  const total = Math.max(1, crawled + pending);
  const progress = Math.min(1, Math.max(0, crawled / total));

  const s = String(status || "IDLE").toUpperCase();
  const badge =
    s === "RUNNING"
      ? { color: "#34d399", bg: "rgba(52, 211, 153, 0.12)", label: "RUNNING" }
      : s === "STOPPED"
        ? { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", label: "STOPPED" }
        : s === "IDLE"
          ? { color: "#93c5fd", bg: "rgba(147, 197, 253, 0.10)", label: "IDLE" }
          : { color: "#60a5fa", bg: "rgba(96, 165, 250, 0.10)", label: s };

  const barStyle = {
    height: 10,
    borderRadius: 6,
    background: "#1f2937",
    overflow: "hidden",
    border: "1px solid #374151",
  };

  const fillStyle = {
    height: "100%",
    width: `${Math.round(progress * 100)}%`,
    background: status === "RUNNING" ? "#22c55e" : "#60a5fa",
    transition: "width 200ms ease",
  };

  return (
    <div style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div style={{ fontWeight: 600 }}>Crawl Progress</div>
        <div style={{ color: "#9ca3af" }}>
          {crawled} crawled · {queued} waiting · {workersActive} active
        </div>
      </div>
      <div style={barStyle}>
        <div style={fillStyle} />
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ color: "#d1d5db", fontSize: 13 }}>Status</div>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: badge.bg,
            color: badge.color,
            fontWeight: 900,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {badge.label}
        </div>
      </div>
    </div>
  );
}

