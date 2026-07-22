import { getEfficiencyConfig } from "../utils/statusMapper.js";

export default function EfficiencyBadge({ score }) {
  const cfg = getEfficiencyConfig(score);

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "10px",
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        letterSpacing: "0.5px",
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}
