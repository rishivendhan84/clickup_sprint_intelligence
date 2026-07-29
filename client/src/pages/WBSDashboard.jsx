import Card from "../components/Card.jsx";
import ProgressBar from "../components/ProgressBar.jsx";

export default function WBSDashboard({ analytics }) {
  if (!analytics) return null;
  const { projects } = analytics;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
      {projects.map((proj) => (
        <Card key={proj.name}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "14px" }}>
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>{proj.name}</h3>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  margin: "4px 0 0",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {proj.total} tasks • {proj.completed} done
              </p>
            </div>
            <CompletionChip rate={proj.completionRate} />
          </div>

          {/* Progress bar */}
          <ProgressBar percentage={proj.completionRate} height={6} />
        </Card>
      ))}
    </div>
  );
}

function CompletionChip({ rate }) {
  const color =
    rate >= 75 ? "var(--green)" : rate >= 40 ? "var(--amber)" : "var(--red)";
  const bg =
    rate >= 75
      ? "rgba(16,185,129,0.15)"
      : rate >= 40
      ? "rgba(245,158,11,0.15)"
      : "rgba(239,68,68,0.1)";

  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: "8px",
        background: bg,
        color,
        fontSize: "14px",
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
      }}
    >
      {rate}%
    </div>
  );
}
