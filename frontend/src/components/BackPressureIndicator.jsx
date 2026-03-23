export function BackPressureIndicator({ back_pressure, dropped }) {
  const active = Boolean(back_pressure);

  return (
    <div
      style={{
        width: "100%",
        border: "1px solid #374151",
        borderRadius: 8,
        padding: "10px 12px",
        background: active ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.10)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 700 }}>Back-Pressure</div>
        <div
          style={{
            color: active ? "#ef4444" : "#34d399",
            fontWeight: 700,
          }}
        >
          {active ? "ACTIVE" : "INACTIVE"}
        </div>
      </div>
      <div style={{ marginTop: 6, color: "#cbd5e1", fontSize: 13 }}>
        Dropped: {dropped}
      </div>
    </div>
  );
}

