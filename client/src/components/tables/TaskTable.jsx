import Card from "../Card.jsx";
import StatusBadge from "../StatusBadge.jsx";
import { getVarianceColor } from "../../utils/statusMapper.js";

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
              <th style={{ ...headerStyle, textAlign: "right" }}>Estimated</th>
              <th style={{ ...headerStyle, textAlign: "right" }}>Actual</th>
              <th style={{ ...headerStyle, textAlign: "right" }}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                style={{
                  borderBottom: "1px solid rgba(30,41,59,0.3)",
                  background: task.overBudget ? "rgba(239,68,68,0.04)" : "transparent",
                }}
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
                  {task.overBudget && (
                    <span style={{ marginLeft: "6px", color: "var(--red)", fontSize: "10px" }}>
                      ⚠
                    </span>
                  )}
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
                <td style={{ padding: "10px 8px", textAlign: "right" }}>{task.estimateHrs}h</td>
                <td
                  style={{
                    padding: "10px 8px",
                    textAlign: "right",
                    color: task.overBudget ? "var(--red)" : "var(--text)",
                    fontWeight: task.overBudget ? 600 : 400,
                  }}
                >
                  {task.actualHrs}h
                </td>
                <td
                  style={{
                    padding: "10px 8px",
                    textAlign: "right",
                    color: getVarianceColor(task.variance),
                    fontWeight: 600,
                  }}
                >
                  {task.variance > 0 ? "+" : ""}
                  {task.variance}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
