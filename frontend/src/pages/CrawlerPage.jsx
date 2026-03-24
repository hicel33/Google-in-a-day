import { CrawlControls } from "../components/CrawlControls.jsx";
import { CrawlStatusPanel } from "../components/CrawlStatusPanel.jsx";
import { MetricsDashboard } from "../components/MetricsDashboard.jsx";
import { useMetrics } from "../context/MetricsContext.jsx";

export function CrawlerPage() {
  const { metrics, connected } = useMetrics();
  const crawlStatus = metrics?.status || "IDLE";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minWidth: 0,
        width: "100%",
      }}
    >
      <CrawlStatusPanel metrics={metrics} wsConnected={connected} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <MetricsDashboard metrics={metrics} />
        </div>
        <div style={{ minWidth: 0 }}>
          <CrawlControls wsStatus={crawlStatus} />
        </div>
      </div>
    </div>
  );
}
