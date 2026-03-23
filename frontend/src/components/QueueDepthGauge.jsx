export function QueueDepthGauge({ queued }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontWeight: 600 }}>Queue Depth</div>
        <div style={{ color: "#9ca3af" }}>{queued} queued</div>
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
            width: `${Math.min(100, queued)}%`,
            background: "#f59e0b",
            transition: "width 250ms ease",
          }}
        />
      </div>
    </div>
  );
}

