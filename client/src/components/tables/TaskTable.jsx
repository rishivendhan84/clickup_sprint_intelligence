import Card from "../Card.jsx";
import StatusBadge from "../StatusBadge.jsx";

const mono = { fontFamily: "var(--font-mono)" };
const headerStyle = {
  ...mono,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "1px",
  fontSize: "10px",
  padding: "10px 8px",
  borderBottom: "1px solid var(--border)",
};

export default function TaskTable({ tasks = [] }) {
  if (!tasks.length) return null;

  return (
    <Card>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", ...mono }}>
          <thead>
            <tr>
              <th style={{ ...headerStyle, textAlign: "left" }}>Task</th>
              <th style={{ ...headerStyle, textAlign: "left" }}>WBS</th>
              <th style={{ ...headerStyle, textAlign: "left" }}>Assignee</th>
              <th style={{ ...headerStyle, textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                style={{ borderBottom: "1px solid rgba(30,41,59,0.3)" }}
              >
                <td
                  style={{
                    padding: "10px 8px",
                    maxWidth: "240px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {task.name}
                </td>
                <td style={{ padding: "10px 8px", color: "var(--text-muted)" }}>{task.project}</td>
                <td style={{ padding: "10px 8px" }}>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {(task.assignees || []).map((a, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          background: `${a.color || "var(--accent)"}22`,
                          color: a.color || "var(--accent)",
                        }}
                      >
                        {a.initials}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center" }}>
                  <StatusBadge label={task.statusLabel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
