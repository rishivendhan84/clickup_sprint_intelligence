import { useState } from "react";
import useSprintData from "./hooks/useSprintData.js";
import DashboardHeader from "./components/layout/DashboardHeader.jsx";
import TabNav from "./components/layout/TabNav.jsx";
import LoadingSkeleton from "./components/LoadingSkeleton.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import WBSDashboard from "./pages/WBSDashboard.jsx";
import TasksPage from "./pages/TasksPage.jsx";

export default function App() {
  const {
    sprints,
    selectedSprintId,
    selectSprint,
    analytics,
    loading,
    error,
    refresh,
  } = useSprintData();

  const [activeTab, setActiveTab] = useState("overview");

  const renderPage = () => {
    switch (activeTab) {
      case "overview": return <OverviewPage analytics={analytics} />;
      case "team":     return <TeamPage analytics={analytics} />;
      case "wbs":      return <WBSDashboard analytics={analytics} />;
      case "tasks":    return <TasksPage analytics={analytics} />;
      default:         return <OverviewPage analytics={analytics} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Ambient glow effects */}
      <div
        style={{
          position: "fixed",
          top: "-20%",
          right: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-20%",
          left: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(167,139,250,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div style={{ padding: "20px 28px 0", position: "relative", zIndex: 1 }}>
        <DashboardHeader
          sprints={sprints}
          selectedSprintId={selectedSprintId}
          onSelectSprint={selectSprint}
          onRefresh={refresh}
          loading={loading}
        />
        <TabNav activeTab={activeTab} onChangeTab={setActiveTab} />
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            margin: "12px 28px 0",
            padding: "10px 16px",
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--amber)",
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠ {error}</span>
          <button
            onClick={refresh}
            style={{
              background: "none",
              border: "1px solid rgba(245,158,11,0.4)",
              color: "var(--amber)",
              padding: "4px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Content area */}
      <div style={{ padding: "20px 28px 40px", position: "relative", zIndex: 1 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <LoadingSkeleton count={4} height={110} />
            <LoadingSkeleton count={2} height={200} />
          </div>
        ) : analytics ? (
          renderPage()
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 0",
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "48px", opacity: 0.3 }}>📊</div>
      <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
        No sprint data loaded. Select a sprint and click Refresh.
      </p>
    </div>
  );
}
