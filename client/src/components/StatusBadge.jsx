import { getStatusColor } from "../utils/statusMapper.js";

export default function StatusBadge({ label }) {
  const color = getStatusColor(label);

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "6px",
        fontSize: "10px",
        fontWeight: 600,
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        fontFamily: "var(--font-mono)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
