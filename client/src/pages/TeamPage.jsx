import { useState } from "react";
import Card from "../components/Card.jsx";
import EfficiencyBadge from "../components/EfficiencyBadge.jsx";
import MemberTaskTable from "../components/tables/MemberTaskTable.jsx";

export default function TeamPage({ analytics }) {
  const [expandedMember, setExpandedMember] = useState(null);

  if (!analytics) return null;
  const { members, tasks } = analytics;

  // Resolve task IDs to full task objects for the expanded table
  function getTasksForMember(member) {
    const taskIds = new Set(member.tasks);
    return tasks.filter((t) => taskIds.has(t.id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {members.map((member) => {
        const isExpanded = expandedMember === member.name;
        return (
          <Card key={member.name}>
            <div
              onClick={() => setExpandedMember(isExpanded ? null : member.name)}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "20px" }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: `linear-gradient(135deg, ${member.color || "var(--accent)"}, var(--card))`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {member.initials}
              </div>

              {/* Name + task count */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "15px", fontWeight: 600 }}>{member.name}</div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginTop: "2px",
                  }}
                >
                  {member.total} tasks assigned • {member.completed} completed
                </div>
              </div>

              {/* Metrics strip */}
              <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <MetricBlock
                  label="Efficiency"
                  value={`${member.efficiency ?? "—"}%`}
                  color={
                    member.efficiency >= 80
                      ? "var(--green)"
                      : member.efficiency >= 60
                      ? "var(--amber)"
                      : "var(--red)"
                  }
                  large
                />
                <MetricBlock
                  label="Est/Actual"
                  value={`${member.totalEstimateHrs}h / ${member.totalSpentHrs}h`}
                />
                <MetricBlock label="Completion" value={`${member.completionRate}%`} />
                <EfficiencyBadge score={member.efficiency} />
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "18px",
                    transition: "transform 0.2s",
                    transform: isExpanded ? "rotate(180deg)" : "none",
                  }}
                >
                  ▾
                </span>
              </div>
            </div>

            {/* Expanded task table */}
            {isExpanded && <MemberTaskTable tasks={getTasksForMember(member)} />}
          </Card>
        );
      })}
    </div>
  );
}

/** Tiny inline metric used in the member row */
function MetricBlock({ label, value, color = "var(--text)", large = false }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "10px",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          fontFamily: "var(--font-mono)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: large ? "24px" : "14px",
          fontWeight: large ? 700 : 600,
          fontFamily: "var(--font-mono)",
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
