/**
 * Glassmorphism card with a subtle top-edge highlight.
 */

export default function Card({ children, className = "", style = {}, onClick }) {
  return (
    <div
      className={`fade-in ${className}`}
      onClick={onClick}
      style={{
        background: "linear-gradient(135deg, rgba(17,24,39,0.95), rgba(15,23,42,0.85))",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        backdropFilter: "blur(12px)",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s",
        ...style,
      }}
    >
      {/* Top-edge accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)",
        }}
      />
      {children}
    </div>
  );
}
