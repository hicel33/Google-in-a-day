import { useEffect, useState } from "react";

const DEFAULT_LOGS = {
  events: [],
  total: 0,
};

export function useLogsSocket() {
  const [logs, setLogs] = useState(DEFAULT_LOGS);

  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const res = await fetch("/logs");
        if (!res.ok) return;
        const payload = await res.json();
        if (!alive) return;
        setLogs({
          events: Array.isArray(payload.events) ? payload.events : [],
          total: payload.total ?? 0,
        });
      } catch {
        // ignore network/parse errors
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return { logs, connected: true };
}

