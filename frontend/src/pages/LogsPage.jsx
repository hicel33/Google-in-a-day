import { LogsPanel } from "../components/LogsPanel.jsx";

export function LogsPage() {
  return (
    <div
      style={{
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: "min(70vh, calc(100vh - 140px))",
      }}
    >
      <LogsPanel variant="page" />
    </div>
  );
}
