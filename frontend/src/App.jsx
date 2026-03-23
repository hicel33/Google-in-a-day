import { MetricsDashboard } from "./components/MetricsDashboard.jsx";
import { SearchPanel } from "./components/SearchPanel.jsx";
import { useMetricsSocket } from "./hooks/useMetricsSocket.js";

export default function App() {
  const { metrics, connected } = useMetricsSocket();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px circle at 20% 0%, rgba(37, 99, 235, 0.25), transparent 45%), #020617",
        color: "#e5e7eb",
        padding: 22,
        display: "grid",
        placeItems: "start center",
      }}
    >
      <div style={{ width: "min(980px, 100%)", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Google in a Day</div>
          <div style={{ color: connected ? "#34d399" : "#9ca3af", fontWeight: 800 }}>
            WS: {connected ? "Connected" : "Disconnected"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 14 }}>
          <MetricsDashboard metrics={metrics} />
          <SearchPanel />
        </div>
      </div>
    </div>
  );
}

