import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Card from "../Card.jsx";

export default function TeamBarChart({ members = [] }) {
  const chartData = members.map((m) => ({
    name: m.name.split(" ")[0],
    Estimated: m.totalEstimateHrs,
    Actual: m.totalSpentHrs,
  }));

  if (!chartData.length) return null;

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
        Team: Estimated vs Actual Hours
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barCategoryGap="20%">
          <XAxis
            dataKey="name"
            tick={{ fill: "#64748b", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
            axisLine={false}
            tickLine={false}
            unit="h"
          />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              fontSize: "12px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <Bar dataKey="Estimated" fill="#22d3ee" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Actual" fill="#a78bfa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
