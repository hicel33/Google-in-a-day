import { useEffect, useRef, useState } from "react";

const DEFAULT_METRICS = {
  crawled: 0,
  queued: 0,
  dropped: 0,
  workers_active: 0,
  workers_max: 0,
  back_pressure: false,
  status: "IDLE",
  elapsed_seconds: 0,
};

export function useMetricsSocket() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/metrics`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setMetrics(payload);
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      try {
        ws.close();
      } catch {
        // no-op
      }
    };
  }, []);

  return { metrics, connected };
}

