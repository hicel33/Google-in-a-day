export function QueueDepthGauge({ queued, workersActive = 0, queueMax = 0 }) {
  const waiting = Number(queued) || 0;
  const active = Number(workersActive) || 0;
  const cap = Math.max(1, Number(queueMax) || 1000);
  const pct = Math.min(100, Math.round(((waiting + active) / cap) * 100));

  return (
    <div style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 600 }}>Queue</div>
        <div style={{ color: "#9ca3af" }}>
          {waiting} waiting · {active} active
        </div>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 6,
          background: "#0f172a",
          border: "1px solid #111827",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "#f59e0b",
            transition: "width 250ms ease",
          }}
        />
      </div>
    </div>
  );
}

