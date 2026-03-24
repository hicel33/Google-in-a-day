import { BackPressureIndicator } from "./BackPressureIndicator.jsx";
import { CrawlProgressBar } from "./CrawlProgressBar.jsx";
import { QueueDepthGauge } from "./QueueDepthGauge.jsx";

export function MetricsDashboard({ metrics }) {
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

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0, width: "100%", boxSizing: "border-box" }}>
      <CrawlProgressBar crawled={crawled} queued={queued} workersActive={workers_active} status={status} />
      <QueueDepthGauge queued={queued} workersActive={workers_active} queueMax={queue_max} />

      <div
        style={{
          width: "100%",
          border: "1px solid #374151",
          borderRadius: 8,
          padding: "10px 12px",
          background: "rgba(2, 6, 23, 0.35)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 700 }}>Worker Utilization</div>
          <div style={{ color: "#93c5fd", fontWeight: 700 }}>
            {workers_active} / {workers_max}
          </div>
        </div>
        <div style={{ marginTop: 6, color: "#cbd5e1", fontSize: 13 }}>
          Elapsed: {elapsed_seconds}s
        </div>
      </div>

      <BackPressureIndicator back_pressure={back_pressure} dropped={dropped} />
    </div>
  );
}

