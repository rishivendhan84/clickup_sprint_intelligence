const TABS = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team" },
  { id: "wbs", label: "WBS" },
  { id: "tasks", label: "Tasks" },
];

export default function TabNav({ activeTab, onChangeTab }) {
  return (
    <div style={{ display: "flex", gap: "2px", marginTop: "16px", borderBottom: "1px solid var(--border)" }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChangeTab(tab.id)}
          style={{
            background: activeTab === tab.id ? "rgba(34,211,238,0.1)" : "transparent",
            border: "none",
            borderBottom: activeTab === tab.id
              ? "2px solid var(--accent)"
              : "2px solid transparent",
            color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.5px",
            transition: "all 0.2s",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export { TABS };
