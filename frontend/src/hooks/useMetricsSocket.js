import { useEffect, useRef, useState } from "react";

const DEFAULT_METRICS = {
  crawled: 0,
  queued: 0,
  dropped: 0,
  workers_active: 0,
  workers_max: 0,
  queue_max: 1000,
  back_pressure: false,
  status: "IDLE",
  elapsed_seconds: 0,
};

const POLL_MS = 250;

/**
 * Live metrics: HTTP poll to GET /stats (same proxy path as /search and /logs — reliable).
 * WebSocket /ws/metrics is optional enhancement when the dev proxy upgrades cleanly.
 */
export function useMetricsSocket() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [wsConnected, setWsConnected] = useState(false);
  const [pollOk, setPollOk] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    let alive = true;

    async function pollStats() {
      try {
        const res = await fetch("/stats", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const payload = await res.json();
        if (!alive) return;
        setMetrics((prev) => ({ ...prev, ...payload }));
        setPollOk(true);
      } catch {
        // network / parse — keep last good snapshot
      }
    }

    pollStats();
    const pollId = setInterval(pollStats, POLL_MS);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/metrics`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (alive) setWsConnected(true);
    };
    ws.onclose = () => {
      if (alive) setWsConnected(false);
    };
    ws.onerror = () => {
      if (alive) setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (alive) setMetrics((prev) => ({ ...prev, ...payload }));
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      alive = false;
      clearInterval(pollId);
      try {
        ws.close();
      } catch {
        // no-op
      }
    };
  }, []);

  const connected = wsConnected || pollOk;

  return { metrics, connected, wsConnected, pollOk };
}
