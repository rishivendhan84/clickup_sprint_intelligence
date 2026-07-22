export default function DashboardHeader({
  sprints = [],
  selectedSprintId,
  onSelectSprint,
  onRefresh,
  loading,
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent)",
              boxShadow: "0 0 12px var(--accent)",
            }}
          />
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>
            Sprint Intelligence
          </h1>
        </div>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "12px",
            margin: "4px 0 0 20px",
            fontFamily: "var(--font-mono)",
          }}
        >
          Performance tracking — Live from ClickUp
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <select
          value={selectedSprintId || ""}
          onChange={(e) => onSelectSprint(e.target.value)}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            outline: "none",
          }}
        >
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.current ? " ●" : ""}
            </option>
          ))}
        </select>

        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-dim))",
            border: "none",
            color: "var(--bg)",
            padding: "8px 18px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.5px",
            opacity: loading ? 0.6 : 1,
            textTransform: "uppercase",
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "⟳ Syncing…" : "↻ Refresh"}
        </button>
      </div>
    </div>
  );
}
