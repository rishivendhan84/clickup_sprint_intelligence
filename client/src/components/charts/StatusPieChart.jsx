import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import Card from "../Card.jsx";

export default function StatusPieChart({ data = [] }) {
  if (!data.length) return null;

  return (
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
        Status Breakdown
      </h3>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={62}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {data.map((s, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {s.name}
              </span>
              <span
                style={{
                  color: "var(--text)",
                  fontWeight: 600,
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
