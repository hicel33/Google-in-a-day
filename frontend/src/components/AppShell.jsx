import { NavLink, Outlet } from "react-router-dom";
import { useMetrics } from "../context/MetricsContext.jsx";

const linkBase = {
  padding: "8px 14px",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14,
  textDecoration: "none",
  color: "#94a3b8",
  border: "1px solid transparent",
  whiteSpace: "nowrap",
};

function navLinkActive({ isActive }) {
  return {
    ...linkBase,
    color: isActive ? "#f8fafc" : "#94a3b8",
    background: isActive ? "rgba(37, 99, 235, 0.22)" : "transparent",
    borderColor: isActive ? "rgba(37, 99, 235, 0.45)" : "transparent",
  };
}

export function AppShell() {
  const { connected } = useMetrics();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        background: "radial-gradient(1200px circle at 20% 0%, rgba(37, 99, 235, 0.22), transparent 45%), #020617",
        color: "#e5e7eb",
      }}
    >
      <header
        style={{
          flexShrink: 0,
          borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
          background: "rgba(2, 6, 23, 0.65)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em" }}>Google in a Day</div>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <NavLink to="/" end style={navLinkActive}>
              Crawler
            </NavLink>
            <NavLink to="/search" style={navLinkActive}>
              Search
            </NavLink>
            <NavLink to="/logs" style={navLinkActive}>
              Logs
            </NavLink>
            <span
              style={{
                marginLeft: 8,
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                color: connected ? "#34d399" : "#94a3b8",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                background: "rgba(15, 23, 42, 0.5)",
              }}
            >
              WS {connected ? "●" : "○"}
            </span>
          </nav>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "20px",
            boxSizing: "border-box",
            width: "100%",
            minWidth: 0,
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
