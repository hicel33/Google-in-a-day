import { useEffect, useMemo, useRef } from "react";
import { useLogsSocket } from "../hooks/useLogsSocket.js";

function levelColor(level) {
  const l = String(level || "").toUpperCase();
  if (l === "ERROR") return "#f87171";
  if (l === "WARN") return "#f59e0b";
  if (l === "INFO") return "#34d399";
  return "#93c5fd";
}

export function LogsPanel({ variant = "default" }) {
  const { logs } = useLogsSocket();
  const events = logs?.events || [];
  const scrollerRef = useRef(null);
  const isPage = variant === "page";

  const formatted = useMemo(() => {
    return events
      .slice(-300)
      .map((e) => {
        const ts = typeof e?.ts === "number" ? new Date(e.ts * 1000) : null;
        const timeStr = ts ? ts.toLocaleTimeString() : "";
        const level = e?.level || "INFO";
        const message = e?.message || "";
        const { seq, ts: _ts, level: _lvl, message: _msg, ...rest } = e || {};
        const context = Object.keys(rest || {}).length ? ` ${JSON.stringify(rest)}` : "";
        return { timeStr, level, message: `${message}${context}` };
      })
      .reverse();
  }, [events]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = 0; // we're rendering reversed order
  }, [events]);

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        border: "1px solid #374151",
        borderRadius: 8,
        padding: 14,
        background: "rgba(2, 6, 23, 0.35)",
        display: "flex",
        flexDirection: "column",
        flex: isPage ? 1 : undefined,
        minHeight: isPage ? 0 : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={{ fontWeight: 900 }}>Crawl Logs</div>
        <div style={{ color: "#9ca3af", fontSize: 13 }}>{events.length} events</div>
      </div>

      <div
        ref={scrollerRef}
        style={{
          marginTop: 10,
          height: isPage ? undefined : 320,
          flex: isPage ? 1 : undefined,
          minHeight: isPage ? 240 : undefined,
          maxHeight: isPage ? "calc(100vh - 220px)" : undefined,
          overflow: "auto",
          paddingRight: 8,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: 8,
          background: "rgba(15, 23, 42, 0.55)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
          fontSize: 12,
        }}
      >
        {formatted.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No crawl logs yet. Start a crawl to see events.</div>
        ) : (
          formatted.map((e, idx) => (
            <div
              key={`${e.level}-${e.message}-${idx}`}
              style={{
                padding: "6px 8px",
                borderBottom: "1px solid rgba(148,163,184,0.08)",
              }}
            >
              <div style={{ color: levelColor(e.level), fontWeight: 800 }}>
                {e.level} {e.timeStr ? <span style={{ color: "#94a3b8", fontWeight: 700 }}>({e.timeStr})</span> : null}
              </div>
              <div style={{ color: "#e5e7eb", marginTop: 2, wordBreak: "break-word" }}>{e.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

