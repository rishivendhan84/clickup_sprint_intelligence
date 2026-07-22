import Card from "./Card.jsx";

export default function MetricCard({ label, value, unit = "", color = "var(--text)", children }) {
  return (
    <Card>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            marginBottom: "6px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color,
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
          }}
        >
          {value}
          {unit && (
            <span style={{ fontSize: "14px", color: "var(--text-muted)", marginLeft: "2px" }}>
              {unit}
            </span>
          )}
        </div>
      </div>
      {children}
    </Card>
  );
}
