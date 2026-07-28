import StatusBadge from "../StatusBadge.jsx";

const mono = { fontFamily: "var(--font-mono)" };

export default function MemberTaskTable({ tasks = [] }) {
  if (!tasks.length) return null;

  return (
    <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", ...mono }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", fontSize: "10px" }}>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Task</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Project</th>
            <th style={{ textAlign: "center", padding: "6px 8px" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} style={{ borderBottom: "1px solid rgba(30,41,59,0.15)" }}>
              <td style={{ padding: "8px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.name}
              </td>
              <td style={{ padding: "8px", color: "var(--text-muted)" }}>{task.project}</td>
              <td style={{ padding: "8px", textAlign: "center" }}>
                <StatusBadge label={task.statusLabel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
