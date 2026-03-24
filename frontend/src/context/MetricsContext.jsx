import { createContext, useContext } from "react";
import { useMetricsSocket } from "../hooks/useMetricsSocket.js";

const MetricsContext = createContext(null);

export function MetricsProvider({ children }) {
  const { metrics, connected } = useMetricsSocket();
  return (
    <MetricsContext.Provider value={{ metrics, connected }}>{children}</MetricsContext.Provider>
  );
}

export function useMetrics() {
  const ctx = useContext(MetricsContext);
  if (!ctx) {
    throw new Error("useMetrics must be used within MetricsProvider");
  }
  return ctx;
}
