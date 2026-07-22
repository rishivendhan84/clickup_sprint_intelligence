import MetricCard from "../components/MetricCard.jsx";
import StatusPieChart from "../components/charts/StatusPieChart.jsx";
import TeamBarChart from "../components/charts/TeamBarChart.jsx";
import Card from "../components/Card.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import EfficiencyBadge from "../components/EfficiencyBadge.jsx";

function getEfficiencyColor(score) {
  if (score >= 80) return "var(--green)";
  if (score >= 60) return "var(--amber)";
  return "var(--red)";
}

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
          color={summary.completionRate >= 50 ? "var(--green)" : "var(--amber)"}
        >
          <div style={{ marginTop: "8px" }}>
            <ProgressBar percentage={summary.completionRate} />
          </div>
        </MetricCard>

        <MetricCard
          label="Tasks"
          value={`${summary.completedTasks}/${summary.totalTasks}`}
        />

        <MetricCard
          label="Time Efficiency"
          value={summary.overallEfficiency}
          unit="%"
          color={
            summary.overallEfficiency >= 80
              ? "var(--green)"
              : summary.overallEfficiency >= 60
              ? "var(--amber)"
              : "var(--red)"
          }
        />

        <MetricCard
          label="Hrs Est / Actual"
          value={summary.totalEstimateHrs}
          unit={`/ ${summary.totalSpentHrs}h`}
          color={summary.totalSpentHrs <= summary.totalEstimateHrs ? "var(--green)" : "var(--red)"}
        />
      </div>

      {/* ── Charts row ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "16px" }}>
        <StatusPieChart data={statusDist} />
        <TeamBarChart members={members} />
      </div>

      {/* ── Individual performance snapshots ──────────── */}
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
          Individual Performance Snapshot
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
                percentage={member.efficiency || 0}
                size={56}
                color={getEfficiencyColor(member.efficiency || 0)}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {member.efficiency ?? "—"}
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
                  {member.completed}/{member.total} tasks • {member.totalSpentHrs}h logged
                </div>
                <div style={{ marginTop: "6px" }}>
                  <EfficiencyBadge score={member.efficiency} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
