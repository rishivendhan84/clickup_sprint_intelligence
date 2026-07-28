import MetricCard from "../components/MetricCard.jsx";
import StatusPieChart from "../components/charts/StatusPieChart.jsx";
import Card from "../components/Card.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import { getCompletionColor } from "../utils/statusMapper.js";

export default function OverviewPage({ analytics }) {
  if (!analytics) return null;
  const { summary, members, statusDist } = analytics;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── Top metrics ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <MetricCard
          label="Sprint Progress"
          value={summary.completionRate}
          unit="%"
          color={getCompletionColor(summary.completionRate)}
        >
          <div style={{ marginTop: "8px" }}>
            <ProgressBar percentage={summary.completionRate} />
          </div>
        </MetricCard>

        <MetricCard
          label="Tasks"
          value={`${summary.completedTasks}/${summary.totalTasks}`}
        />

        <MetricCard label="Projects" value={summary.totalProjects} />

        <MetricCard label="Team" value={summary.totalMembers} />
      </div>

      {/* ── Status breakdown ─────────────────────────── */}
      <StatusPieChart data={statusDist} />

      {/* ── Per-member snapshot ──────────────────────── */}
      <Card>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: "16px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
          }}
        >
          Team Snapshot
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
          {members.map((member) => (
            <div
              key={member.name}
              style={{
                background: "rgba(30,41,59,0.5)",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <ProgressRing
                percentage={member.completionRate}
                size={56}
                color={getCompletionColor(member.completionRate)}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {member.completionRate}%
                </span>
              </ProgressRing>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {member.name}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {member.completed}/{member.total} tasks done
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
