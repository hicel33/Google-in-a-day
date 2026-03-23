export function CrawlProgressBar({ crawled, queued, status }) {
  const total = Math.max(1, crawled + queued);
  const progress = Math.min(1, Math.max(0, crawled / total));

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
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontWeight: 600 }}>Crawl Progress</div>
        <div style={{ color: "#9ca3af" }}>
          {crawled} crawled / {queued} queued
        </div>
      </div>
      <div style={barStyle}>
        <div style={fillStyle} />
      </div>
      <div style={{ marginTop: 6, color: "#d1d5db" }}>Status: {status}</div>
    </div>
  );
}

